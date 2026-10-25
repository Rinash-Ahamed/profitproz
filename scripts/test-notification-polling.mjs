import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the component's real request callbacks and polling effect without a
// browser or network, so closed-bell reads and request races are measurable.
const source = readFileSync('src/components/ui/AdminNotifications.tsx', 'utf8')
const ast = ts.createSourceFile('AdminNotifications.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const component = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'AdminNotifications')
const statements = component.body.statements
const variable = (name) => statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(ast) === name)).getText(ast)
const fn = (name) => statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast)
const effect = statements.find((node) => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'useEffect').expression.arguments[0].getText(ast)
const requests = []
let data = { notifications: [{ id: 'leave_1' }], unreadCount: 1, nextCursor: null }
let page = { notifications: [], unreadCount: 0, nextCursor: null }
let hidden = false
let interval
let delay = false
let release
let errors = ''
let loading = false
const refs = {
  requestRef: { current: null }, generation: { current: 0 },
  inFlightRef: { current: false }, busyRef: { current: false }, openRef: { current: false },
}
const apiFetch = async (url, options) => {
  requests.push({ url, method: options?.method || 'GET' })
  if (delay && url.includes('view=unread')) {
    delay = false
    await new Promise((resolve) => { release = resolve })
    return { unreadCount: 999 }
  }
  if (options?.method === 'PATCH') { data = { ...data, unreadCount: 0 }; return { success: true } }
  return url.includes('view=unread') ? { unreadCount: data.unreadCount } : { ...data }
}
const exports = {}
const code = [variable('load'), variable('loadUnreadCount'), fn('close'), fn('update'), fn('toggle'), `export const startPolling = ${effect}`, 'export { load, loadUnreadCount, close, update, toggle }'].join('\n')
vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports, AbortController, encodeURIComponent, apiFetch, ...refs,
  useCallback: (callback) => callback,
  setPage: (updater) => { page = updater(page) },
  setLoading: (value) => { loading = value }, setBusy: () => {}, setOpen: () => {},
  setError: (value) => { errors = value },
  document: { get hidden() { return hidden }, addEventListener: () => {}, removeEventListener: () => {} },
  window: { setInterval: (callback) => { interval = callback; return 1 }, clearInterval: () => {}, addEventListener: () => {}, removeEventListener: () => {} },
})
const flush = () => new Promise((resolve) => setImmediate(resolve))
let cleanup = exports.startPolling()
await flush()
assert.equal(page.unreadCount, 1)
assert.equal(page.notifications.length, 0)
assert.ok(requests.every((request) => request.url.endsWith('?view=unread')))
interval()
await flush()
assert.equal(requests.length, 2)
hidden = true
interval()
await flush()
assert.equal(requests.length, 2, 'Hidden tabs must not poll')
hidden = false
await exports.toggle()
assert.equal(refs.openRef.current, true)
assert.equal(page.notifications.length, 1)
assert.equal(page.unreadCount, 0)
assert.equal(requests.filter((request) => request.method === 'PATCH').length, 1)
assert.equal(errors, '')
assert.equal(loading, false)
const before = requests.length
interval()
await flush()
assert.equal(requests[before].url, '/api/admin/notifications', 'Open bell may refresh the visible list')
exports.close()
const originalNotifications = page.notifications
data = { ...data, unreadCount: 2 }
interval()
await flush()
assert.equal(requests.at(-1).url, '/api/admin/notifications?view=unread')
assert.equal(page.unreadCount, 2)
assert.equal(page.notifications, originalNotifications, 'Count polling must not replace already loaded rows')
delay = true
interval()
const pendingRequestCount = requests.length
interval()
assert.equal(requests.length, pendingRequestCount, 'Do not overlap background requests')
await exports.toggle()
release()
await flush()
assert.notEqual(page.unreadCount, 999, 'Aborted count response must not overwrite the opened list')
exports.close()
cleanup()
const beforeRemount = requests.length
cleanup = exports.startPolling()
await flush()
assert.equal(requests.length, beforeRemount + 1, 'Cleanup must allow polling to restart')
cleanup()
console.log('PASS Count-only closed polling, full list on open, unread/read behavior, hidden-tab pause, preserved rows, overlapping-request prevention, stale-response rejection, and cleanup/remount')
