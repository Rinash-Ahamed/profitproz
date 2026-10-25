import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
function compile(source, globals = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require, Date, ...globals })
  return exports
}
const source = readFileSync('src/lib/firestore.ts', 'utf8')
const ast = ts.createSourceFile('firestore.ts', source, ts.ScriptTarget.Latest, true)
const fn = (name) => ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast)
const timestampSource = ast.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(ast) === 'mapTimestamp')).getText(ast)
class Timestamp {
  constructor(value) { this.value = value }
  toDate() { return new Date(this.value) }
}
let now = '2026-10-25T19:00:00.000Z'
let stored
let writes = 0
const snapshot = () => ({ id: 'expense', exists: !!stored, data: () => stored })
const docRef = { get: async () => snapshot() }
const db = {
  collection: (name) => { assert.equal(name, 'expenses'); return { doc: () => docRef } },
  runTransaction: async (callback) => callback({
    get: async () => snapshot(),
    update: (ref, fields) => { assert.equal(ref, docRef); writes++; stored = { ...stored, ...fields } },
  }),
}
const backend = compile(timestampSource + '\n' + fn('mapDocToExpense') + '\n' + fn('markExpensePaid'), {
  Timestamp, ensureDb: () => db, COLLECTIONS: { EXPENSES: 'expenses' },
  FieldValue: { serverTimestamp: () => new Timestamp(now) },
  roundCurrency: (amount) => Math.round((amount + Number.EPSILON) * 100) / 100,
})
const { ExpensePaymentDate } = compile(readFileSync('src/components/finance/ExpensePaymentDate.tsx', 'utf8'))
const render = (expense) => renderToStaticMarkup(createElement(ExpensePaymentDate, { expense }))
for (const role of ['admin', 'staff']) {
  writes = 0
  stored = { amount: 8000, expenseDate: '2026-09-12', status: 'approved', paymentStatus: 'unpaid', submittedByRole: role }
  now = '2026-10-25T19:00:00.000Z'
  assert.equal(render(stored), '')
  const paid = await backend.markExpensePaid('expense')
  assert.equal(paid.paymentStatus, 'paid')
  assert.equal(paid.paidAt, now)
  assert.equal(paid.expenseDate, '2026-09-12')
  assert.equal(paid.amount, 8000)
  assert.equal(paid.status, 'approved')
  const html = render(paid)
  assert.ok(html.includes('Paid on:'))
  assert.ok(html.includes('26 Oct 2026'), 'Display India date even when UTC date differs')
  assert.ok(html.includes('IST'))
  assert.ok(html.includes(`dateTime="${paid.paidAt}"`))
  assert.ok(!html.includes('12 Sep'), 'Never substitute the original expense date')
  now = '2026-10-26T19:00:00.000Z'
  const repeated = await backend.markExpensePaid('expense')
  assert.equal(writes, 1, 'Repeated Paid requests must preserve the first payment timestamp')
  assert.equal(repeated.paidAt, paid.paidAt)
}
for (const status of ['pending', 'rejected']) {
  stored = { amount: 8000, expenseDate: '2026-09-12', status, paymentStatus: 'unpaid' }
  await assert.rejects(backend.markExpensePaid('expense'), /EXPENSE_NOT_APPROVED/)
  assert.equal(stored.paymentStatus, 'unpaid')
  assert.equal(stored.paidAt, undefined)
}
assert.ok(render({ paymentStatus: 'paid' }).includes('Payment date not recorded'))
assert.ok(render({ paymentStatus: 'paid', paidAt: 'invalid' }).includes('Payment date not recorded'))
console.log('PASS Admin/staff server payment timestamps, India date/time rendering, unchanged expense date/amount/status, idempotent Paid requests, approval checks, and legacy missing-date handling')
