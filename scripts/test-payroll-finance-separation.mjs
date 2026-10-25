import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import crypto from 'node:crypto'

function compile(source, globals = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Date, Request, Response, URL, console, ...globals })
  return exports
}
const dateOnly = compile(readFileSync('src/lib/date-only.ts', 'utf8'))
const finance = compile(readFileSync('src/lib/finance.ts', 'utf8'))
const payroll = compile(readFileSync('src/lib/payroll.ts', 'utf8'), { require: () => dateOnly })
const source = readFileSync('src/lib/firestore.ts', 'utf8')
const ast = ts.createSourceFile('firestore.ts', source, ts.ScriptTarget.Latest, true)
const fn = (name) => {
  const node = ast.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name)
  assert.ok(node, `Missing function: ${name}`)
  return node.getText(ast)
}
const collections = { FINANCE_INVOICES: 'invoices', FINANCE_PAYMENTS: 'payments', EXPENSES: 'expenses', PROPERTIES: 'properties', PAYROLL: 'payroll', SALARIES: 'salaries', AUDIT_LOG: 'audit' }
const timestamp = (date) => ({ toMillis: () => date.getTime(), valueOf: () => date.getTime() })
const rows = {
  properties: [],
  invoices: [{ amount: 15000, status: 'paid' }, { amount: 2000, status: 'pending' }, { amount: 500, status: 'cancelled' }],
  payments: [
    { amount: 10000, service: 'revenue_management', paymentDate: '2026-09-30' },
    { amount: 5000, service: 'ota_onboarding', paymentDate: '2026-10-02' },
  ],
  expenses: [
    { amount: 1000, status: 'approved', paymentStatus: 'paid', paidAt: timestamp(new Date('2026-09-30T18:29:59Z')) },
    { amount: 500, status: 'approved', paymentStatus: 'paid', paidAt: timestamp(new Date('2026-09-30T18:30:00Z')) },
    { amount: 250, status: 'approved', paymentStatus: 'unpaid' },
    { amount: 900, status: 'rejected', paymentStatus: 'unpaid' },
  ],
}
let fallback = false
class Query {
  constructor(items) { this.items = items }
  where(field, operator, value) {
    return new Query(this.items.filter((row) => {
      const actual = row[field]
      if (operator === 'in') return value.includes(actual)
      if (operator === '<') return actual !== undefined && actual < value
      return actual === value
    }))
  }
  select() { return this }
  async get() { return { docs: this.items.map((row) => ({ data: () => row })) } }
  aggregate({ total: field }) {
    return { get: async () => {
      if (fallback) throw { code: 9 }
      return { data: () => ({ total: finance.sumCurrency(this.items.map((row) => row[field] || 0)) }) }
    } }
  }
}
const accessed = []
const db = { collection: (name) => {
  accessed.push(name)
  assert.ok(name in rows, `Finance must not access ${name}`)
  return new Query(rows[name])
} }
const { getFinanceOverview, getFinancialExportData } = compile(fn('getFinanceOverview') + '\n' + fn('getFinancialExportData'), {
  ensureDb: () => db, COLLECTIONS: collections, todayInTimeZone: () => '2026-10-25',
  Timestamp: { fromDate: timestamp }, AggregateField: { sum: (field) => field },
  ...finance, isMissingIndexError: (error) => error.code === 9,
  mapTimestamp: (value) => value?.toMillis ? new Date(value.toMillis()).toISOString() : undefined,
  mapDocToFinanceInvoice: (doc) => doc.data(), mapDocToFinancePayment: (doc) => doc.data(),
  mapDocToExpense: (doc) => doc.data(), mapDocToProperty: (doc) => doc.data(),
})
for (const useFallback of [false, true]) {
  fallback = useFallback
  const result = await getFinanceOverview(false)
  assert.equal(result.totalInvoiced, 17000)
  assert.equal(result.incomeReceived, 15000)
  assert.equal(result.revenueIncome, 10000)
  assert.equal(result.onboardingIncome, 5000)
  assert.equal(result.paidExpenses, 1500)
  assert.equal(result.unpaidExpenses, 250)
  assert.equal(result.netCashBalance, 13500)
  assert.equal(result.previousMonthClosingBalance, 9000, 'India midnight cutoff must match in both paths')
  assert.equal('paidPayroll' in result, false)
}
// A manually recorded payroll expense deducts exactly once, after it is paid.
rows.expenses.push({ amount: 8000, status: 'approved', paymentStatus: 'unpaid', submittedByRole: 'admin', title: 'Payroll' })
assert.equal((await getFinanceOverview(false)).netCashBalance, 13500)
Object.assign(rows.expenses.at(-1), { paymentStatus: 'paid', paidAt: timestamp(new Date('2026-10-03T12:00:00Z')) })
assert.equal((await getFinanceOverview(false)).netCashBalance, 5500)
assert.equal((await getFinanceOverview(false)).previousMonthClosingBalance, 9000)
const exportData = await getFinancialExportData()
assert.deepEqual(Object.keys(exportData).sort(), ['expenses', 'invoices', 'payments', 'properties'])
assert.ok(!accessed.includes('payroll') && !accessed.includes('salaries'))
console.log('PASS Finance aggregation/fallback, service totals, cancellation, unpaid expenses, India cutoff, manual payroll expense, and no payroll/salary reads')

// Real calculation functions: CL then LOP, half days, pending attendance, and partial months.
const workingDates = payroll.payrollMonthDates('2026-09').filter((date) => dateOnly.parseDateOnly(date).getUTCDay() !== 0)
const input = { month: '2026-09', monthlySalary: 30000, completedWorkDates: workingDates, approvedLeaves: [] }
assert.equal(payroll.calculatePayroll(input).netSalary, 30000)
const calculation = payroll.calculatePayroll({ ...input, approvedLeaves: [
  { id: 'leave1', startDate: '2026-09-01', endDate: '2026-09-01' },
  { id: 'leave2', startDate: '2026-09-02', endDate: '2026-09-02' },
] })
assert.equal(calculation.casualLeaveUsed, 1)
assert.equal(calculation.lopDays, 1)
assert.equal(calculation.netSalary, 29000)
const halfDay = payroll.calculatePayroll({ ...input, approvedLeaves: [
  { id: 'half', startDate: '2026-09-01', endDate: '2026-09-01', durationType: 'half_day', payrollTreatment: 'lop' },
] })
assert.equal(halfDay.netSalary, 29500)
const pending = payroll.calculatePayroll({ ...input, completedWorkDates: workingDates.filter((date) => date !== '2026-09-01') })
const period = payroll.calculatePayrollPeriodAmounts({ ...pending, month: input.month, monthlySalary: input.monthlySalary, completedThroughDate: '2026-09-30' })
assert.equal(period.netSalary, 29000, 'Pending attendance must not inflate the amount payable')
const partial = payroll.calculatePayroll({ ...input, calculationThroughDate: '2026-09-15', missingAttendanceThroughDate: '2026-09-15' })
assert.equal(payroll.calculatePayrollPeriodAmounts({ ...partial, month: input.month, monthlySalary: input.monthlySalary, completedThroughDate: '2026-09-15' }).netSalary, 15000)
console.log('PASS Full-month payroll, CL/LOP, half-day LOP, pending attendance, and partial-month amount payable')

// Legacy statuses no longer freeze calculation or attendance review, and payroll
// writes are restricted to its calculation records and audit trail.
for (const status of ['draft', 'calculated', 'approved', 'paid']) {
  let stored = { ...pending, id: '2026-09_employee', staffId: 'employee', employeeName: 'Employee', month: '2026-09', monthlySalary: 30000, netSalary: 1, status, statusHistory: [{ to: status }] }
  const writes = []
  const snapshot = () => ({ exists: true, data: () => stored })
  const payrollDb = {
    collection: (name) => {
      assert.ok(['payroll', 'audit'].includes(name), `Payroll must not access ${name}`)
      return {
        where: (field, operator) => ({ get: async () => ({ docs: operator === '<' ? [] : [snapshot()] }) }),
        doc: () => ({ name, get: async () => snapshot() }),
      }
    },
    runTransaction: async (callback) => callback({
      get: async () => snapshot(),
      update: (ref, values) => { assert.equal(ref.name, 'payroll'); writes.push(ref.name); stored = { ...stored, ...values } },
      set: (ref) => { assert.equal(ref.name, 'audit'); writes.push(ref.name) },
      create: () => assert.fail('Existing payroll must be refreshed, not recreated'),
    }),
  }
  const backend = compile(['generatePayrollRecords', 'missingAttendancePayrollUpdates', 'decideMissingAttendance', 'revertMissingAttendanceDecision'].map(fn).join('\n'), {
    crypto, ensureDb: () => payrollDb, COLLECTIONS: collections,
    ...payroll, ...dateOnly, currentPayrollMonth: () => '2026-10',
    listStaffAccounts: async () => [{ id: 'employee', name: 'Employee', email: 'employee@example.test', active: true, activatedAt: '2026-09-01T00:00:00Z' }],
    listSalaries: async () => [{ id: 'employee', staffEmail: 'employee@example.test', baseSalary: 30000, history: [] }],
    listWorkSessions: async () => workingDates.filter((date) => date !== '2026-09-01').map((workDate) => ({ workDate, staffEmail: 'employee@example.test', status: 'completed' })),
    listApprovedLeaveRequests: async () => [], listPayrollRecords: async () => [stored],
    mapDocToPayroll: (doc) => ({ ...doc.data() }),
    FieldValue: { serverTimestamp: () => 'now' }, requestAuditLogPrune: () => {},
  })
  await backend.generatePayrollRecords('2026-09', 'admin@example.test')
  assert.equal(stored.netSalary, 30000)
  assert.equal(stored.status, status, 'Legacy status history must be preserved')
  assert.equal(writes.length, 2)
  await backend.generatePayrollRecords('2026-09', 'admin@example.test')
  assert.equal(writes.length, 2, 'Unchanged calculations must not produce duplicate writes')
  await backend.decideMissingAttendance(stored.id, '2026-09-01', 'lop', 'admin@example.test')
  assert.equal(stored.netSalary, 29000)
  await backend.revertMissingAttendanceDecision(stored.id, '2026-09-01', 'admin@example.test')
  assert.equal(stored.netSalary, 30000)
}
console.log('PASS Legacy payroll recalculation, attendance decisions/reverts, preserved history, idempotent refresh, and no financial writes')

// The actual route rejects obsolete status requests, including old clients.
const routeSource = readFileSync('src/app/api/admin/payroll/[id]/route.ts', 'utf8')
let calls = 0
let authorized = true
const { PATCH } = compile(routeSource.replace(/^import .*\r?\n/gm, ''), {
  NextResponse: { json: (body, init) => Response.json(body, init) },
  requireAdminSession: async () => authorized ? { email: 'admin@example.test' } : null,
  parseDateOnly: dateOnly.parseDateOnly,
  decideMissingAttendance: async () => { calls++; return { netSalary: 29000 } },
  revertMissingAttendanceDecision: async () => { calls++; return { netSalary: 30000 } },
})
const patch = (body) => PATCH(new Request('http://localhost/api/admin/payroll/example', { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id: 'example' }) })
for (const status of ['calculated', 'approved', 'paid']) assert.equal((await patch({ status })).status, 400)
assert.equal(calls, 0)
assert.equal((await patch({ status: 'paid', missingAttendanceDate: '2026-09-01', decision: 'lop' })).status, 400)
assert.equal((await patch({ missingAttendanceDate: '2026-02-30', decision: 'lop' })).status, 400)
assert.equal((await patch(null)).status, 400)
assert.equal((await patch({ missingAttendanceDate: '2026-09-01', decision: 'lop' })).status, 200)
assert.equal((await patch({ missingAttendanceDate: '2026-09-01', action: 'revert_missing_attendance' })).status, 200)
authorized = false
assert.equal((await patch({ missingAttendanceDate: '2026-09-01', decision: 'lop' })).status, 403)
assert.equal(calls, 2)
console.log('PASS Payroll API rejects status transitions; valid attendance review/revert and admin authorization remain intact')

// Financial CSV uses the same balance and contains no payroll/salary records.
const exportSource = readFileSync('src/app/api/admin/finance/export/route.ts', 'utf8')
const { GET } = compile(exportSource.replace(/^import .*\r?\n/gm, ''), {
  NextResponse: Object.assign(class extends Response {}, { json: (body, init) => Response.json(body, init) }),
  requireAdminSession: async () => ({ email: 'admin@example.test' }),
  getFinancialExportData: async () => exportData,
  logAdminAction: async () => {}, ...finance,
})
const csv = await (await GET()).text()
assert.ok(csv.includes('"Net cash balance"'))
assert.ok(csv.includes('"5500"'))
assert.ok(!csv.includes('"Paid payroll"') && !csv.includes('"Salary Setting"') && !csv.includes('"Net Payroll"'))
console.log('PASS Financial CSV balance matches Finance and excludes payroll/salary integration')
