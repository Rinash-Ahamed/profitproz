import { access, readdir, readFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const API_DIRECTORY = path.join(ROOT, 'src', 'app', 'api')
const NEXT_ENTRY = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')
const SERVER_READY_TIMEOUT_MS = 30_000
const REQUEST_TIMEOUT_MS = 10_000
const PROBE_CONCURRENCY = 6
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

async function findRouteFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return findRouteFiles(entryPath)
    return entry.isFile() && entry.name === 'route.ts' ? [entryPath] : []
  }))
  return nested.flat()
}

function routeUrlFromFile(file) {
  const relative = path.relative(path.join(ROOT, 'src', 'app'), file)
  const segments = relative.split(path.sep).slice(0, -1).map((segment) => {
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) return 'health-check'
    if (/^\[\.\.\..+\]$/.test(segment)) return 'health-check'
    if (/^\[.+\]$/.test(segment)) return 'health-check'
    return segment
  })
  return `/${segments.join('/')}`
}

async function discoverRoutes() {
  const files = await findRouteFiles(API_DIRECTORY)
  return Promise.all(files.sort().map(async (file) => {
    const source = await readFile(file, 'utf8')
    const methods = [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((match) => match[1])
    if (!methods.length) throw new Error(`No exported HTTP methods found in ${path.relative(ROOT, file)}`)
    return {
      file: path.relative(ROOT, file),
      path: routeUrlFromFile(file),
      methods,
    }
  }))
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((error) => error ? reject(error) : resolve(port))
    })
  })
}

async function waitForServer(baseUrl, child, getLogs) {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next.js exited before becoming ready.\n${getLogs()}`)
    try {
      const response = await fetch(`${baseUrl}/login`, { signal: AbortSignal.timeout(2_000) })
      if (response.status < 500) return
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error(`Next.js did not become ready within ${SERVER_READY_TIMEOUT_MS / 1000} seconds.\n${getLogs()}`)
}

async function stopServer(child) {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}

async function probeRoute(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route.path}`, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { 'User-Agent': 'ProfitPro-AppHealthChecker/1.0' },
  })

  const supportsGet = route.methods.includes('GET')
  const cacheControl = response.headers.get('cache-control') || ''
  const failures = []

  if (response.status >= 500) failures.push(`returned ${response.status}`)
  if (response.status === 404) failures.push('returned 404')
  if (!supportsGet && response.status !== 405) failures.push(`safe GET probe expected 405 but returned ${response.status}`)
  if (!cacheControl.toLowerCase().includes('no-store')) failures.push('missing no-store cache protection')

  return {
    ...route,
    status: response.status,
    cacheControl,
    failures,
    passed: failures.length === 0,
  }
}

async function probeAllRoutes(baseUrl, routes) {
  const results = new Array(routes.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < routes.length) {
      const index = nextIndex
      nextIndex += 1
      try {
        results[index] = await probeRoute(baseUrl, routes[index])
      } catch (error) {
        results[index] = {
          ...routes[index],
          status: 0,
          cacheControl: '',
          failures: [error instanceof Error ? error.message : String(error)],
          passed: false,
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(PROBE_CONCURRENCY, routes.length) }, () => worker()))
  return results
}

function printResults(results) {
  const pathWidth = Math.max(...results.map((result) => result.path.length), 12)
  for (const result of results) {
    const marker = result.passed ? 'PASS' : 'FAIL'
    const methods = result.methods.join(',')
    const detail = result.passed ? `${result.status} (${methods})` : result.failures.join('; ')
    console.log(`${marker.padEnd(4)}  ${result.path.padEnd(pathWidth)}  ${detail}`)
  }

  const failed = results.filter((result) => !result.passed)
  console.log(`\nApp health check: ${results.length - failed.length}/${results.length} API routes passed.`)
  return failed
}

async function main() {
  await access(path.join(ROOT, '.next', 'BUILD_ID'))
  await access(NEXT_ENTRY)

  const routes = await discoverRoutes()
  if (!routes.length) throw new Error('No API routes were discovered.')
  if (!routes.some((route) => route.methods.some((method) => MUTATING_METHODS.has(method)))) {
    throw new Error('Route discovery did not find any mutating endpoints; discovery may be incomplete.')
  }

  const port = Number(process.env.APP_HEALTH_PORT) || await findAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  let logs = ''
  const server = spawn(process.execPath, [NEXT_ENTRY, 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  const collectLogs = (chunk) => { logs = `${logs}${chunk.toString()}`.slice(-12_000) }
  server.stdout.on('data', collectLogs)
  server.stderr.on('data', collectLogs)

  try {
    await waitForServer(baseUrl, server, () => logs)
    const results = await probeAllRoutes(baseUrl, routes)
    const failed = printResults(results)
    if (failed.length) process.exitCode = 1
  } finally {
    await stopServer(server)
  }
}

main().catch((error) => {
  console.error(`App health check failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
