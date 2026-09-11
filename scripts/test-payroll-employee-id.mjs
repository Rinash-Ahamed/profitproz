import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync('src/lib/firestore.ts', 'utf8')
const ast = ts.createSourceFile('firestore.ts', source, ts.ScriptTarget.Latest, true)
const fn = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'listPayrollRecords')
const snapshots = ['draft', 'calculated', 'approved', 'paid'].map((status) => ({ id: status, month: '2026-08', staffId: 'original-person', employeeName: 'Employee', employeeId: 'E001', status, netSalary: 10000 }))
snapshots.push({ id: 'inactive', staffId: 'inactive', employeeName: 'Inactive', employeeId: 'E003', month: '2026-08' })
snapshots.push({ id: 'future', staffId: 'future', employeeName: 'Future', employeeId: 'E004', month: '2026-08' })
snapshots.push({ id: 'legacy', staffId: 'legacy', employeeName: 'Legacy', employeeId: 'E005', month: '2026-08' })
const staff = [
  { id: 'original-person', employeeId: 'E002', active: true },
  { id: 'different-person', employeeId: 'E001', active: true },
  { id: 'inactive', employeeId: 'E003', active: false },
  { id: 'future', employeeId: 'E004', active: true, activatedAt: '2026-09-01' },
  { id: 'legacy', employeeId: '', active: true },
]
let queries = 0
const before = JSON.stringify(snapshots)
const db = { collection: (name) => {
  let rows = name === 'payroll' ? snapshots : staff
  const query = {
    where: (field, op, value) => { assert.equal(op, '=='); rows = rows.filter((row) => row[field] === value); return query },
    select: () => query,
    get: async () => { queries++; return { docs: rows.map((row) => ({ id: row.id, data: () => row })) } },
  }
  return query
} }
const exports = {}
vm.runInNewContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports, db, COLLECTIONS: { PAYROLL: 'payroll', STAFF: 'staff' },
  payrollMonthEndDate: () => '2026-08-31', mapTimestamp: (value) => value,
  todayInTimeZone: (zone, date) => date.toISOString().slice(0, 10), mapDocToPayroll: (doc) => ({ ...doc.data() }),
})
const records = await exports.listPayrollRecords('2026-08')
assert.equal(records.length, 5)
for (const record of records.filter((row) => row.staffId === 'original-person')) {
  assert.equal(record.currentEmployeeId, 'E002')
  assert.equal(record.employeeId, 'E001')
  assert.equal(record.netSalary, 10000)
}
assert.equal(records.find((row) => row.id === 'legacy').currentEmployeeId, 'E005')
assert.equal(JSON.stringify(snapshots), before, 'Historical snapshots must remain untouched')
assert.equal(queries, 2, 'No additional Firestore queries for the current ID')
console.log('PASS Payroll employee ID: current ID in every status, stable staff identity despite reused IDs, snapshot preservation, inactive/future exclusion, legacy fallback, no added queries')
