import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import crypto from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

function compile(source, globals = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, Date, URL, Request, Response, console, ...globals })
  return exports
}
const source = readFileSync('src/lib/firestore.ts', 'utf8')
const ast = ts.createSourceFile('firestore.ts', source, ts.ScriptTarget.Latest, true)
const fn = (name) => ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast)
class Timestamp {
  constructor(seconds, nanoseconds = 0) { this.seconds = seconds; this.nanoseconds = nanoseconds }
  toDate() { return new Date(this.seconds * 1000 + this.nanoseconds / 1e6) }
}
const tables = new Map(['leaves', 'events', 'state'].map((name) => [name, new Map()]))
let clock = 100
let ids = 0
let failCommit = false
let notificationPageReads = 0
const collections = { LEAVE_REQUESTS: 'leaves', ADMIN_NOTIFICATIONS: 'events', ADMIN_NOTIFICATION_STATE: 'state' }
const cmp = (a, b) => a.createdAt.seconds - b.createdAt.seconds || a.createdAt.nanoseconds - b.createdAt.nanoseconds || (a.id > b.id ? 1 : a.id < b.id ? -1 : 0)
const snapshot = (table, id) => ({ id, exists: tables.get(table).has(id), data: () => tables.get(table).get(id) })
class Query {
  constructor(table, rows, limit = Infinity) { this.table = table; this.rows = rows; this.maximum = limit }
  orderBy() { return this }
  endBefore(createdAt, id) { return new Query(this.table, this.rows.filter((row) => cmp(row, { createdAt, id }) > 0)) }
  startAfter(createdAt, id) { return new Query(this.table, this.rows.filter((row) => cmp(row, { createdAt, id }) < 0)) }
  limit(limit) { return new Query(this.table, this.rows, limit) }
  async get() { if (this.table === 'events') notificationPageReads++; const docs = [...this.rows].sort((a, b) => -cmp(a, b)).slice(0, this.maximum).map((row) => snapshot(this.table, row.id)); return { docs, size: docs.length } }
  count() { return { get: async () => ({ data: () => ({ count: this.rows.length }) }) } }
}
const db = {
  collection: (table) => {
    assert.ok(tables.has(table), `Unexpected collection access: ${table}`)
    const query = new Query(table, [...tables.get(table)].map(([id, data]) => ({ id, ...data })))
    query.doc = (id = `leave_${++ids}`) => ({ table, id, get: async () => snapshot(table, id) })
    return query
  },
  batch: () => {
    const writes = []
    return {
      set: (ref, value) => writes.push([ref, value]),
      commit: async () => {
        if (failCommit) throw new Error('COMMIT_FAILED')
        for (const [ref, value] of writes) tables.get(ref.table).set(ref.id, value)
      },
    }
  },
  runTransaction: async (callback) => callback({
    get: (ref) => ref.get(),
    set: (ref, fields) => {
      assert.equal(ref.table, 'state', 'Read/clear must never change leave or notification records')
      tables.get(ref.table).set(ref.id, { ...tables.get(ref.table).get(ref.id), ...fields })
    },
  }),
}
const backend = compile([
  'createLeaveRequest', 'notificationPosition', 'compareNotificationPositions', 'newestNotificationPosition',
  'adminNotificationStateRef', 'adminNotificationQueries', 'getAdminNotificationUnreadCount', 'listAdminNotifications', 'updateAdminNotifications',
].map(fn).join('\n'), {
  crypto, Timestamp, ensureDb: () => db, COLLECTIONS: collections,
  FieldValue: { serverTimestamp: () => new Timestamp(clock) }, FieldPath: { documentId: () => '__name__' },
  countNonSundayDaysInclusive: () => 2, mapDocToLeaveRequest: (doc) => ({ id: doc.id, ...doc.data() }),
})
const submit = (extra = {}) => backend.createLeaveRequest({ staffEmail: 'Employee@Example.test', startDate: '2026-10-26', endDate: '2026-10-27', reason: 'Private medical reason', durationType: 'full_day', ...extra })
const first = await submit()
const event = tables.get('events').get(first.id)
assert.ok(event)
assert.equal(event.staffEmail, 'employee@example.test')
assert.equal(event.leaveId, first.id)
assert.equal('reason' in event, false, 'Notification should not duplicate private leave reasons')
assert.equal(tables.get('leaves').get(first.id).reason, 'Private medical reason')
failCommit = true
await assert.rejects(submit(), /COMMIT_FAILED/)
assert.equal(tables.get('leaves').size, 1)
assert.equal(tables.get('events').size, 1)
failCommit = false
const second = await submit({ durationType: 'half_day', endDate: '2026-10-26', halfDayPeriod: 'second_half' })
assert.equal(tables.get('events').get(second.id).durationDays, 0.5)
let page = await backend.listAdminNotifications('admin@example.test')
assert.equal(page.unreadCount, 2)
let previousPageReads = notificationPageReads
assert.equal(await backend.getAdminNotificationUnreadCount('admin@example.test'), 2)
assert.equal(notificationPageReads, previousPageReads, 'Unread polling must not fetch notification documents')
assert.equal(page.notifications[0].id, second.id)
await backend.updateAdminNotifications('admin@example.test', 'read', first.id)
assert.equal((await backend.listAdminNotifications('admin@example.test')).unreadCount, 1, 'Same-timestamp event with newer ID must remain unread')
await backend.updateAdminNotifications('admin@example.test', 'read', second.id)
await backend.updateAdminNotifications('admin@example.test', 'read', first.id)
assert.equal((await backend.listAdminNotifications('admin@example.test')).unreadCount, 0, 'Delayed requests cannot move read state backwards')
assert.equal((await backend.listAdminNotifications('other-admin@example.test')).unreadCount, 2)
clock++
const newest = await submit()
await backend.updateAdminNotifications('admin@example.test', 'clear', second.id)
page = await backend.listAdminNotifications('admin@example.test')
assert.equal(page.notifications.length, 1)
assert.equal(page.notifications[0].id, newest.id, 'Clear must preserve notifications arriving after the loaded list')
assert.equal(page.unreadCount, 1)
assert.equal(tables.get('leaves').size, 3)
assert.equal(tables.get('events').size, 3)
assert.equal((await backend.listAdminNotifications('other-admin@example.test')).notifications.length, 3)
previousPageReads = notificationPageReads
assert.equal(await backend.getAdminNotificationUnreadCount('admin@example.test'), 1)
assert.equal(await backend.getAdminNotificationUnreadCount('other-admin@example.test'), 3)
assert.equal(notificationPageReads, previousPageReads)
await assert.rejects(backend.updateAdminNotifications('admin@example.test', 'clear', 'missing'), /NOTIFICATION_NOT_FOUND/)
for (let index = 0; index < 25; index++) { clock++; await submit() }
page = await backend.listAdminNotifications('admin@example.test')
assert.equal(page.notifications.length, 20)
assert.ok(page.nextCursor)
const older = await backend.listAdminNotifications('admin@example.test', page.nextCursor)
assert.equal(older.notifications.length, 6)
assert.equal(older.nextCursor, null)
assert.equal(new Set([...page.notifications, ...older.notifications].map((item) => item.id)).size, 26)
await assert.rejects(backend.listAdminNotifications('admin@example.test', 'missing'), /INVALID_NOTIFICATION_CURSOR/)
console.log('PASS Atomic leave/alert creation, half days, private reasons excluded, unread tie-breaks, per-admin state, concurrent-safe clear, durable history, and duplicate-free pagination')

let admin = null
let reads = 0
let changes = 0
let countReads = 0
const route = compile(readFileSync('src/app/api/admin/notifications/route.ts', 'utf8').replace(/^import .*\r?\n/gm, ''), {
  NextResponse: { json: (body, init) => Response.json(body, init) },
  requireAdminSession: async () => admin,
  listAdminNotifications: async (email) => { reads++; assert.equal(email, admin.email); return page },
  getAdminNotificationUnreadCount: async (email) => { countReads++; assert.equal(email, admin.email); return 7 },
  updateAdminNotifications: async (email) => { changes++; assert.equal(email, admin.email) },
})
const patch = (body) => route.PATCH(new Request('http://localhost/api/admin/notifications', { method: 'PATCH', body: JSON.stringify(body) }))
assert.equal((await route.GET(new Request('http://localhost/api/admin/notifications'))).status, 403)
assert.equal((await route.GET(new Request('http://localhost/api/admin/notifications?view=unread'))).status, 403)
assert.equal((await patch({ action: 'clear', throughId: first.id })).status, 403)
assert.equal(reads + changes + countReads, 0)
admin = { email: 'admin@example.test' }
for (const body of [null, [], { action: 'delete', throughId: first.id }, { action: 'clear', throughId: '../leave' }]) assert.equal((await patch(body)).status, 400)
assert.equal((await route.GET(new Request('http://localhost/api/admin/notifications?cursor=a%2Fb'))).status, 400)
assert.equal((await patch({ action: 'clear', throughId: first.id, adminEmail: 'other-admin@example.test' })).status, 200)
const response = await route.GET(new Request('http://localhost/api/admin/notifications'))
assert.equal(response.status, 200)
assert.equal(response.headers.get('cache-control'), 'private, no-store')
const fullReadsBefore = reads
const summary = await route.GET(new Request('http://localhost/api/admin/notifications?view=unread'))
assert.equal(summary.status, 200)
assert.deepEqual(await summary.json(), { unreadCount: 7 })
assert.equal(summary.headers.get('cache-control'), 'private, no-store')
assert.equal(reads, fullReadsBefore, 'Count-only endpoint must not call the list endpoint')
assert.equal(countReads, 1)
for (const query of ['view=unknown', 'view=unread&cursor=leave_1']) {
  assert.equal((await route.GET(new Request(`http://localhost/api/admin/notifications?${query}`))).status, 400)
}
assert.equal(changes, 1)
console.log('PASS Admin-only APIs, authenticated account ownership, input validation, and private no-store responses')
