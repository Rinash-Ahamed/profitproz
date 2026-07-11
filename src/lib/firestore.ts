import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue, DocumentSnapshot, Query } from 'firebase-admin/firestore'
import crypto from 'crypto'

export type StaffRecord = {
  id: string
  employeeId?: string
  name: string
  email: string
  passwordHash: string
  active: boolean
  mustChangePassword: boolean
  phone?: string
  address?: string
  details?: string
  department?: string
  createdAt?: string
  updatedAt?: string
}

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

const isConfigured = !!(projectId && clientEmail && privateKey)

if (isConfigured && !getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

const db = getFirestore()

export function isFirestoreConfigured() {
  return isConfigured
}

function createDocumentId() {
  return crypto.randomUUID()
}

function toTitleCase(str: string): string {
  if (!str) return ''
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

function emailFromStaffName(name: string): string {
  const sanitizedName = name.trim().toLowerCase().replace(/\s+/g, '')
  if (!sanitizedName) throw new Error('Staff name cannot be empty.')
  return `${sanitizedName}@profitproz.com`
}

function mapDocToStaff(doc: DocumentSnapshot): StaffRecord {
  const data = doc.data() || {}
  const mapTimestamp = (ts?: Timestamp) => ts?.toDate().toISOString()

  return {
    id: doc.id,
    employeeId: data.employeeId || '',
    name: data.name || '',
    email: data.email || '',
    passwordHash: data.passwordHash || '',
    active: typeof data.active === 'boolean' ? data.active : true,
    mustChangePassword: typeof data.mustChangePassword === 'boolean' ? data.mustChangePassword : true,
    phone: data.phone || '',
    address: data.address || '',
    details: data.details || '',
    department: data.department || '',
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
  }
}

export async function getStaffById(id: string) {
  if (!isFirestoreConfigured()) return null
  const doc = await db.collection('staff').doc(id).get()
  return doc.exists ? mapDocToStaff(doc) : null
}

export async function getStaffByEmail(email: string) {
  if (!isFirestoreConfigured()) {
    return null
  }

  const snapshot = await db.collection('staff').where('email', '==', email.trim().toLowerCase()).limit(1).get()

  return snapshot.empty ? null : mapDocToStaff(snapshot.docs[0])
}

export async function createStaffAccount(input: { name: string; passwordHash: string; employeeId: string; department: string }): Promise<StaffRecord> {
  if (!isFirestoreConfigured()) throw new Error('Firestore not configured')
  const generatedEmail = emailFromStaffName(input.name)
  const staffCollection = db.collection('staff')

  const newDocRef = await db.runTransaction(async (transaction) => {
    const query = staffCollection.where('email', '==', generatedEmail).limit(1)
    const snapshot = await transaction.get(query)

    if (!snapshot.empty) {
      throw new Error('STAFF_EXISTS')
    }

    const docRef = staffCollection.doc() // Use auto-generated ID
    const newStaffData = {
      name: toTitleCase(input.name.trim()),
      email: generatedEmail,
      employeeId: input.employeeId,
      passwordHash: input.passwordHash,
      active: true,
      mustChangePassword: true,
      phone: '',
      address: '',
      details: '',
      department: input.department,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    transaction.set(docRef, newStaffData)
    return docRef
  })

  const newDoc = await newDocRef.get()
  return mapDocToStaff(newDoc)
}

export async function deleteStaffAccount(id: string) {
  if (isFirestoreConfigured()) await db.collection('staff').doc(id).delete()
}

export async function updateStaffAccount(id: string, updates: Partial<Omit<StaffRecord, 'id' | 'passwordHash'>>): Promise<StaffRecord> {
  if (!isFirestoreConfigured()) throw new Error('Firestore not configured')
  const docRef = db.collection('staff').doc(id)

  const dataToUpdate: Record<string, any> = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (dataToUpdate.name) dataToUpdate.name = toTitleCase(dataToUpdate.name)
  if (dataToUpdate.email) dataToUpdate.email = dataToUpdate.email.toLowerCase()

  await docRef.update(dataToUpdate)
  const updatedDoc = await docRef.get()
  return mapDocToStaff(updatedDoc)
}

export async function updateStaffProfile(staffId: string, input: { phone: string; address: string; details: string }): Promise<StaffRecord> {
  if (!isFirestoreConfigured()) throw new Error('Firestore not configured')
  const docRef = db.collection('staff').doc(staffId)

  await docRef.update({
    phone: input.phone.trim(),
    address: input.address.trim(),
    details: input.details.trim(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const updatedDoc = await docRef.get()
  return mapDocToStaff(updatedDoc)
}

export async function updateStaffPassword(staffId: string, passwordHash: string): Promise<StaffRecord> {
  if (!isFirestoreConfigured()) throw new Error('Firestore not configured')
  const docRef = db.collection('staff').doc(staffId)

  await docRef.update({
    passwordHash: passwordHash,
    mustChangePassword: false,
    updatedAt: FieldValue.serverTimestamp(),
  })

  const updatedDoc = await docRef.get()
  return mapDocToStaff(updatedDoc)
}

export async function updateStaffPasswordAndFlag(staffId: string, passwordHash: string): Promise<StaffRecord> {
  if (!isFirestoreConfigured()) throw new Error('Firestore not configured')
  const docRef = db.collection('staff').doc(staffId)
  await docRef.update({
    passwordHash: passwordHash,
    mustChangePassword: true,
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updatedDoc = await docRef.get()
  return mapDocToStaff(updatedDoc)
}

export type ExpenseRecord = {
  id: string
  staffEmail: string
  title: string
  amount: number
  notes: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt?: string
  updatedAt?: string
}

export type AuditLogRecord = {
  id: string
  timestamp: string
  actorEmail: string
  action: string // e.g., 'STAFF_CREATE', 'STAFF_DELETE', 'PASSWORD_RESET'
  targetId: string
  details: string
  changes?: Record<string, { from: any; to: any }>
}

export type TimesheetRecord = {
  id: string
  staffEmail: string
  workDate: string
  hours: number
  notes: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt?: string
  updatedAt?: string
}

export type SalaryRecord = {
  id: string
  staffEmail: string
  baseSalary: number
  notes: string
  updatedAt?: string
}

function mapDocToExpense(doc: DocumentSnapshot): ExpenseRecord {
  const data = doc.data() || {}
  const mapTimestamp = (ts?: Timestamp) => ts?.toDate().toISOString()
  const readStatus = (status?: string): 'pending' | 'approved' | 'rejected' => {
    return status === 'approved' || status === 'rejected' ? status : 'pending'
  }

  return {
    id: doc.id,
    staffEmail: data.staffEmail || '',
    title: data.title || '',
    amount: data.amount || 0,
    notes: data.notes || '',
    status: readStatus(data.status),
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
  }
}

function mapDocToTimesheet(doc: DocumentSnapshot): TimesheetRecord {
  const data = doc.data() || {}
  const mapTimestamp = (ts?: Timestamp) => ts?.toDate().toISOString()
  const readStatus = (status?: string): 'pending' | 'approved' | 'rejected' => {
    return status === 'approved' || status === 'rejected' ? status : 'pending'
  }

  return {
    id: doc.id,
    staffEmail: data.staffEmail || '',
    workDate: data.workDate || '',
    hours: data.hours || 0,
    notes: data.notes || '',
    status: readStatus(data.status),
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
  }
}

function mapDocToSalary(doc: DocumentSnapshot): SalaryRecord {
  const data = doc.data() || {}
  const mapTimestamp = (ts?: Timestamp) => ts?.toDate().toISOString()

  return {
    id: doc.id,
    staffEmail: data.staffEmail || '',
    baseSalary: data.baseSalary || 0,
    notes: data.notes || '',
    updatedAt: mapTimestamp(data.updatedAt),
  }
}

export async function listStaffAccounts() {
  if (!isFirestoreConfigured()) return []
  const snapshot = await db.collection('staff').get()
  return snapshot.docs.map(mapDocToStaff)
}

export async function listExpenses(staffEmail?: string) {
  if (!isFirestoreConfigured()) return []

  let query: Query = db.collection('expenses')
  if (staffEmail) {
    query = query.where('staffEmail', '==', staffEmail.trim().toLowerCase())
  }

  const snapshot = await query.get()
  return snapshot.docs.map(mapDocToExpense)
}

export async function createExpense(input: { staffEmail: string; title: string; amount: number; notes: string }): Promise<ExpenseRecord> {
  if (!isFirestoreConfigured()) throw new Error('Firestore not configured')

  const docRef = db.collection('expenses').doc() // auto-generate ID

  const newExpenseData = {
    staffEmail: input.staffEmail.trim().toLowerCase(),
    title: input.title.trim(),
    amount: input.amount,
    notes: input.notes.trim(),
    status: 'pending' as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await docRef.set(newExpenseData)
  const newDoc = await docRef.get()
  return mapDocToExpense(newDoc)
}

export async function updateExpenseStatus(id: string, status: 'approved' | 'rejected'): Promise<ExpenseRecord> {
  if (!isFirestoreConfigured()) throw new Error('Firestore not configured')
  const docRef = db.collection('expenses').doc(id)
  await docRef.update({
    status: status,
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updatedDoc = await docRef.get()
  return mapDocToExpense(updatedDoc)
}

export async function listTimesheets(staffEmail?: string) {
  if (!isFirestoreConfigured()) return []

  let query: Query = db.collection('timesheets')
  if (staffEmail) {
    query = query.where('staffEmail', '==', staffEmail.trim().toLowerCase())
  }

  const snapshot = await query.get()
  return snapshot.docs.map(mapDocToTimesheet)
}

export async function createTimesheet(input: { staffEmail: string; workDate: string; hours: number; notes: string }): Promise<TimesheetRecord> {
  if (!isFirestoreConfigured()) throw new Error('Firestore not configured')

  const docRef = db.collection('timesheets').doc() // auto-generate ID

  const newTimesheetData = {
    staffEmail: input.staffEmail.trim().toLowerCase(),
    workDate: input.workDate,
    hours: input.hours,
    notes: input.notes.trim(),
    status: 'pending' as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await docRef.set(newTimesheetData)
  const newDoc = await docRef.get()
  return mapDocToTimesheet(newDoc)
}

export async function updateTimesheetStatus(id: string, status: 'approved' | 'rejected'): Promise<TimesheetRecord> {
  if (!isFirestoreConfigured()) throw new Error('Firestore not configured')
  const docRef = db.collection('timesheets').doc(id)
  await docRef.update({
    status: status,
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updatedDoc = await docRef.get()
  return mapDocToTimesheet(updatedDoc)
}

export async function listSalaries() {
  if (!isFirestoreConfigured()) return []
  const snapshot = await db.collection('salaries').get()
  return snapshot.docs.map(mapDocToSalary)
}

export async function saveSalary(staffId: string, input: { staffEmail: string; baseSalary: number; notes: string }): Promise<SalaryRecord> {
  if (!isFirestoreConfigured()) throw new Error('Firestore not configured')

  const docRef = db.collection('salaries').doc(staffId)

  const salaryData = {
    staffEmail: input.staffEmail.trim().toLowerCase(),
    baseSalary: input.baseSalary,
    notes: input.notes.trim(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await docRef.set(salaryData, { merge: true })

  const updatedDoc = await docRef.get()
  return mapDocToSalary(updatedDoc)
}

export async function logAdminAction(input: {
  actorEmail: string
  action: string
  targetId: string
  details: string
  changes?: AuditLogRecord['changes']
}) {
  if (!isFirestoreConfigured()) {
    console.warn('AUDIT LOG: Firestore not configured, skipping log.')
    return
  }

  const id = createDocumentId()
  const docRef = db.collection('audit_log').doc(id)

  const logData: Omit<AuditLogRecord, 'id' | 'timestamp'> & { timestamp: Timestamp } = {
    timestamp: Timestamp.now(),
    actorEmail: input.actorEmail,
    action: input.action,
    targetId: input.targetId,
    details: input.details,
  }

  if (input.changes && Object.keys(input.changes).length > 0) {
    ;(logData as any).changes = JSON.stringify(input.changes)
  }

  try {
    await docRef.set(logData)
  } catch (error) {
    // Log an error but don't throw, as the primary action succeeded.
    console.error('Failed to write to audit log:', error)
  }
}
