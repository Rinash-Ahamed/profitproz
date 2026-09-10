import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function compile(source, globals = {}) {
  const exports = {}
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(output, { exports, Buffer, Response, Request, URL, Date, ...globals })
  return exports
}

// Execute the real backend page function with a Firestore query double.
const source = readFileSync('src/lib/firestore.ts', 'utf8')
const ast = ts.createSourceFile('firestore.ts', source, ts.ScriptTarget.Latest, true)
const pageSource = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'listFinancePage').getText(ast)
let reads = 0
const rows = Array.from({ length: 125 }, (_, index) => ({
  id: String(index).padStart(4, '0'), invoiceDate: '2026-09-01', paymentDate: '2026-09-01',
  propertyName: index < 5 ? 'Old match' : 'Other property', clientName: 'Client', invoiceNumber: String(index),
  status: index % 8 === 0 ? 'cancelled' : 'pending', service: index % 2 ? 'revenue_management' : 'ota_onboarding',
  amount: 10.01,
}))
const doc = (row) => ({ id: row.id, data: () => row, get: (field) => row[field] })
class Query {
  constructor(data) { this.rows = data; this.size = Infinity }
  where(field, op, value) { return new Query(this.rows.filter((row) => op === '>=' ? row[field] >= value : op === '<=' ? row[field] <= value : row[field] === value)) }
  select() { return this }
  aggregate() { return { get: async () => { throw new Error('missing index') } } }
  orderBy() { return new Query([...this.rows].sort((a, b) => b.id.localeCompare(a.id))) }
  startAfter(value, id) { return new Query(this.rows.filter((row) => row.id < (id || value.id))) }
  limit(size) { const query = new Query(this.rows); query.size = size; return query }
  async get() { const docs = this.rows.slice(0, this.size).map(doc); reads += docs.length; return { docs, size: docs.length, empty: !docs.length } }
}
const { listFinancePage } = compile(pageSource, {
  ensureDb: () => ({ collection: () => new Query(rows) }),
  COLLECTIONS: { FINANCE_INVOICES: 'invoices', FINANCE_PAYMENTS: 'payments' },
  FieldPath: { documentId: () => '__name__' },
  parseDateOnly: (date) => /^\d{4}-\d{2}-\d{2}$/.test(date),
  mapDocToFinanceInvoice: (document) => document.data(),
  mapDocToFinancePayment: (document) => document.data(),
})
let cursor = ''
const all = []
do {
  const page = await listFinancePage({ kind: 'invoices', cursor })
  assert.ok(page.items.length <= 10)
  all.push(...page.items)
  cursor = page.nextCursor
} while (cursor)
assert.equal(all.length, rows.filter((row) => row.status !== 'cancelled').length)
assert.equal(new Set(all.map((row) => row.id)).size, all.length)
assert.ok(all.some((row) => row.id === '0001'), 'Older than the previous 100-record cap remains reachable')
const search = await listFinancePage({ kind: 'invoices', search: 'old MATCH', service: 'revenue_management' })
assert.deepEqual(Array.from(search.items, (row) => row.id), ['0003', '0001'])
assert.equal(search.nextCursor, null)
const empty = await listFinancePage({ kind: 'payments', from: '2026-10-01' })
assert.equal(empty.items.length, 0)
await assert.rejects(listFinancePage({ kind: 'invoices', cursor: 'bad' }), /INVALID_FINANCE_CURSOR/)
reads = 0
await listFinancePage({ kind: 'payments' })
assert.equal(reads, 11, 'Initial payment page reads 10 rows plus one lookahead')
const exportPage = await listFinancePage({ kind: 'payments', limit: 100 })
const exportRemainder = await listFinancePage({ kind: 'payments', limit: 100, cursor: exportPage.nextCursor })
assert.equal(exportPage.items.length + exportRemainder.items.length, 125)
console.log('PASS Finance: duplicate-free same-date cursors, cancellations, old-record search, filters, empty result, invalid cursor, full export, 11-read initial page')

const totalSource = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'financePaymentTotal').getText(ast)
const { financePaymentTotal } = compile(totalSource, {
  ensureDb: () => ({ collection: () => new Query(rows) }), COLLECTIONS: { FINANCE_PAYMENTS: 'payments' },
  AggregateField: { sum: () => null }, isMissingIndexError: () => true,
  sumCurrency: (values) => values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100,
})
assert.equal(await financePaymentTotal({}), 1251.25)
assert.equal(await financePaymentTotal({ service: 'revenue_management', from: '2026-09-01', to: '2026-09-30' }), 620.62)
assert.equal(await financePaymentTotal({ from: '2026-10-01' }), 0)
console.log('PASS Payment total: complete history, service/date filter, empty range, index fallback, cent precision')

let requests = 0
let resolveSlow
const client = compile(readFileSync('src/lib/client-api.ts', 'utf8'), {
  fetch: async (url) => {
    requests += 1
    if (url === '/api/admin/staff?slow=1') return new Promise((resolve) => { resolveSlow = resolve })
    return Response.json({ request: requests })
  },
})
await (await client.cachedTabFetch('/api/admin/staff')).json()
await (await client.cachedTabFetch('/api/admin/staff')).json()
assert.equal(requests, 1)
await client.authenticatedFetch('/api/admin/staff/id', { method: 'PATCH' })
await client.cachedTabFetch('/api/admin/staff')
assert.equal(requests, 3, 'Mutation invalidates cached profiles')
await client.cachedTabFetch('/api/admin/staff', { cache: 'no-store' })
assert.equal(requests, 4, 'Explicit refresh bypasses cache')
const controller = new AbortController()
controller.abort()
await assert.rejects(client.cachedTabFetch('/api/admin/staff', { signal: controller.signal }), { name: 'AbortError' })
const slow = client.cachedTabFetch('/api/admin/staff?slow=1')
const resolveOld = resolveSlow
await client.authenticatedFetch('/api/admin/staff/id', { method: 'PATCH' })
const concurrentBefore = requests
const fresh = client.cachedTabFetch('/api/admin/staff?slow=1')
assert.equal(requests, concurrentBefore + 1, 'New GET cannot reuse an in-flight pre-mutation request')
resolveSlow(Response.json({ outdated: false }))
await fresh
client.clearTabCache()
resolveOld(Response.json({ outdated: true }))
await slow
const before = requests
const retry = client.cachedTabFetch('/api/admin/staff?slow=1')
assert.equal(requests, before + 1, 'Pre-mutation response cannot repopulate the cache')
resolveSlow(Response.json({ outdated: false }))
await retry
await client.cachedTabFetch('/api/staff/tasks')
await client.cachedTabFetch('/api/staff/tasks')
assert.equal(requests, before + 3, 'Live task data is not cached')
console.log('PASS Cache: reuse, mutation invalidation, refresh bypass, abort, stale-response race, live-task exclusion')
