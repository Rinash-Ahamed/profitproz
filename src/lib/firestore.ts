import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue, FieldPath, AggregateField, DocumentSnapshot, Query } from 'firebase-admin/firestore'
import crypto from 'crypto'
import 'server-only'
import type { OnboardingDetailsInput, OnboardingRecord, OnboardingPlatformProgress, OtaPlatform } from './onboarding'
import type { PaginationRequest } from './pagination'
import { countDateOnlyDaysInclusive } from './date-only'
import { LEAVE_ALLOWANCES, type LeaveType } from './leave'
import type { FinanceInvoiceRecord, FinanceOverview, FinancePaymentRecord, FinanceService, PaymentMethod } from './finance'

export type StaffRecord = {
  id: string
  employeeId?: string
  name: string
  email: string
  personalEmail?: string
  passwordHash: string
  active: boolean
  mustChangePassword: boolean
  sessionVersion: number
  phone?: string
  address?: string
  details?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  department?: string
  role?: string
  clientAccess: {
    revenueManagement: boolean
    otaOnboarding: boolean
  }
  annualCtc?: number
  createdAt?: string
  updatedAt?: string
}

export type PublicStaffRecord = Omit<StaffRecord, 'passwordHash' | 'sessionVersion'>

export type AdminRecord = {
  id: string
  email: string
  passwordHash: string
  active: boolean
  sessionVersion: number
  createdAt?: string
  updatedAt?: string
}

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

function normalizePrivateKey(value?: string) {
  if (!value) return undefined

  let normalized = value.trim()
  const hasMatchingQuotes =
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))

  if (hasMatchingQuotes) normalized = normalized.slice(1, -1)

  return normalized
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
}

export type PropertyStatus = 'pending' | 'active' | 'inactive'
export type PropertyType = 'hotel' | 'resort' | 'homestay' | 'serviced-apartment' | 'hostel' | 'other'

export type PropertyRecord = {
  id: string
  contractNumber: string
  name: string
  propertyType: PropertyType
  contactName: string
  contactEmail: string
  contactPhone: string
  gstNumber: string
  city: string
  address: string
  roomCount: number
  commissionPercent: number
  contractStartDate: string
  signedContractUrl: string
  status: PropertyStatus
  notes: string
  createdAt?: string
  updatedAt?: string
}

export type PropertyInput = Omit<PropertyRecord, 'id' | 'contractNumber' | 'createdAt' | 'updatedAt'>

const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)

const isConfigured = !!(projectId && clientEmail && privateKey)

let initializationError: unknown = null
const FIREBASE_APP_NAME = 'profitpro-server'
let firebaseApp = getApps().find((app) => app.name === FIREBASE_APP_NAME)

if (isConfigured && !firebaseApp) {
  try {
    firebaseApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    }, FIREBASE_APP_NAME)
  } catch (error) {
    initializationError = error
    console.error('Firebase Admin initialization failed. Check the Firebase credentials configured for this environment.', error)
  }
}

const db = isConfigured && firebaseApp && !initializationError ? getFirestore(firebaseApp) : null

export function isFirestoreConfigured() {
  return !!db
}

function ensureDb() {
  if (!db) {
    const missingVars = [
      !process.env.FIREBASE_PROJECT_ID && 'FIREBASE_PROJECT_ID',
      !process.env.FIREBASE_CLIENT_EMAIL && 'FIREBASE_CLIENT_EMAIL',
      !process.env.FIREBASE_PRIVATE_KEY && 'FIREBASE_PRIVATE_KEY',
    ]
      .filter(Boolean)
      .join(', ')

    const message = missingVars ? `Missing environment variables: ${missingVars}` : 'Firebase credentials are present, but Firebase Admin initialization failed.'
    throw new Error(`Firestore not configured. ${message}`)
  }
  return db
}

const COLLECTIONS = {
  ADMINS: 'admins',
  STAFF: 'staff',
  PROPERTIES: 'properties',
    OTA_ONBOARDINGS: 'ota_onboardings',
  REVENUE_INVOICES: 'revenue_invoices',
  FINANCE_INVOICES: 'finance_invoices',
  FINANCE_PAYMENTS: 'finance_payments',
  EXPENSES: 'expenses',
  EXPENSE_RECEIPTS: 'expense_receipts',
  WORK_SESSIONS: 'work_sessions',
  LEGACY_TIMESHEETS: 'timesheets',
  LEAVE_REQUESTS: 'leave_requests',
  SALARIES: 'salaries',
  AUDIT_LOG: 'audit_log',
  SETTINGS: 'settings',
} as const

const AUDIT_LOG_RETENTION_DAYS = 120

function createDocumentId() {
  return crypto.randomUUID()
}

function toTitleCase(str: string): string {
  if (!str) return ''
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
}

function emailFromStaffName(name: string): string {
  const sanitizedName = name.trim().toLowerCase().replace(/\s+/g, '')
  if (!sanitizedName) throw new Error('Staff name cannot be empty.')
  return `${sanitizedName}@profitproz.com`
}

const mapTimestamp = (ts: unknown): string | undefined => {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString()
  }
  return undefined
}

function mapDocToStaff(doc: DocumentSnapshot): StaffRecord {
  const data = doc.data() || {}

  return {
    id: doc.id,
    employeeId: data.employeeId || '',
    name: data.name || '',
    email: data.email || '',
    personalEmail: data.personalEmail || '',
    passwordHash: data.passwordHash || '',
    active: typeof data.active === 'boolean' ? data.active : true,
    mustChangePassword: typeof data.mustChangePassword === 'boolean' ? data.mustChangePassword : true,
    sessionVersion: Number.isInteger(data.sessionVersion) ? data.sessionVersion : 0,
    phone: data.phone || '',
    address: data.address || '',
    details: data.details || '',
    emergencyContactName: data.emergencyContactName || '',
    emergencyContactPhone: data.emergencyContactPhone || '',
    department: data.department || '',
    role: data.role || '',
    clientAccess: {
      revenueManagement: data.clientAccess?.revenueManagement === true,
      otaOnboarding: data.clientAccess?.otaOnboarding === true,
    },
    annualCtc: typeof data.annualCtc === 'number' ? data.annualCtc : 0,
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
  }
}

function mapDocToAdmin(doc: DocumentSnapshot): AdminRecord {
  const data = doc.data() || {}

  return {
    id: doc.id,
    email: data.email || '',
    passwordHash: data.passwordHash || '',
    active: typeof data.active === 'boolean' ? data.active : true,
    sessionVersion: Number.isInteger(data.sessionVersion) ? data.sessionVersion : 0,
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
  }
}

export function toPublicStaff(staff: StaffRecord): PublicStaffRecord {
  const publicData: Partial<StaffRecord> = { ...staff }
  delete publicData.passwordHash
  delete publicData.sessionVersion
  return publicData as PublicStaffRecord
}

function mapDocToProperty(doc: DocumentSnapshot): PropertyRecord {
  const data = doc.data() || {}

  return {
    id: doc.id,
    contractNumber: typeof data.contractNumber === 'string' ? data.contractNumber : '',
    name: typeof data.name === 'string' ? data.name : '',
    propertyType: ['hotel', 'resort', 'homestay', 'serviced-apartment', 'hostel', 'other'].includes(data.propertyType) ? data.propertyType as PropertyType : 'hotel',
    contactName: typeof data.contactName === 'string' ? data.contactName : '',
    contactEmail: typeof data.contactEmail === 'string' ? data.contactEmail : '',
    contactPhone: typeof data.contactPhone === 'string' ? data.contactPhone : '',
    gstNumber: typeof data.gstNumber === 'string' ? data.gstNumber : '',
    city: typeof data.city === 'string' ? data.city : '',
    address: typeof data.address === 'string' ? data.address : '',
    roomCount: typeof data.roomCount === 'number' ? data.roomCount : 0,
    commissionPercent: typeof data.commissionPercent === 'number' ? data.commissionPercent : 0,
    contractStartDate: typeof data.contractStartDate === 'string' ? data.contractStartDate : '',
    status: data.status === 'active' && typeof data.signedContractUrl === 'string' && data.signedContractUrl ? 'active' : data.status === 'inactive' ? 'inactive' : 'pending',
    signedContractUrl: typeof data.signedContractUrl === 'string' ? data.signedContractUrl : '',
    notes: typeof data.notes === 'string' ? data.notes : '',
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
  }
}

function mapDocToOnboarding(doc: DocumentSnapshot): OnboardingRecord {
  const data = doc.data() || {}
  const platforms = Array.isArray(data.platforms)
    ? data.platforms.flatMap((item: unknown) => {
        if (!item || typeof item !== 'object') return []
        const progress = item as Record<string, unknown>
        if (typeof progress.platform !== 'string') return []
        return [{
          platform: progress.platform as OtaPlatform,
          status: progress.status === 'live' ? 'live' as const : 'pending' as const,
          notes: typeof progress.notes === 'string' ? progress.notes : '',
        }]
      })
    : []

  return {
    id: doc.id,
    propertyName: typeof data.propertyName === 'string' ? data.propertyName : '',
    clientName: typeof data.clientName === 'string' ? data.clientName : '',
    propertyAddress: typeof data.propertyAddress === 'string' ? data.propertyAddress : '',
    emailAddress: typeof data.emailAddress === 'string' ? data.emailAddress : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    ratePerPlatform: typeof data.ratePerPlatform === 'number' ? data.ratePerPlatform : 0,
    invoiceNotes: typeof data.invoiceNotes === 'string' ? data.invoiceNotes : '',
    invoiceSequence: Number.isInteger(data.invoiceSequence) && data.invoiceSequence > 0 ? data.invoiceSequence : undefined,
    paymentStatus: data.paymentStatus === 'complete'
      ? 'complete'
      : data.paymentStatus === 'pending' || (Number.isInteger(data.invoiceSequence) && data.invoiceSequence > 0)
        ? 'pending'
        : 'not_invoiced',
    invoiceGeneratedAt: mapTimestamp(data.invoiceGeneratedAt),
    paymentCompletedAt: mapTimestamp(data.paymentCompletedAt),
    financePaymentRecordedAt: mapTimestamp(data.financePaymentRecordedAt),
    platforms,
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
  }
}

export async function getStaffById(id: string): Promise<StaffRecord | null> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.STAFF).doc(id)
  const docSnap = await docRef.get()
  return docSnap.exists ? mapDocToStaff(docSnap) : null
}

export async function getStaffByEmail(email: string): Promise<StaffRecord | null> {
  const db = ensureDb()
  const staffCollection = db.collection(COLLECTIONS.STAFF)
  const q = staffCollection.where('email', '==', email.trim().toLowerCase()).limit(1)
  const snapshot = await q.get()

  return snapshot.empty ? null : mapDocToStaff(snapshot.docs[0])
}

export async function getAdminByEmail(email: string): Promise<AdminRecord | null> {
  const db = ensureDb()
  const adminCollection = db.collection(COLLECTIONS.ADMINS)
  const q = adminCollection.where('email', '==', email.trim().toLowerCase()).limit(1)
  const snapshot = await q.get()

  return snapshot.empty ? null : mapDocToAdmin(snapshot.docs[0])
}

export async function updateAdminPassword(id: string, passwordHash: string): Promise<AdminRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.ADMINS).doc(id)
  await docRef.update({
    passwordHash,
    sessionVersion: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updatedDoc = await docRef.get()
  if (!updatedDoc.exists) throw new Error('Admin account not found after update.')
  return mapDocToAdmin(updatedDoc)
}

export async function createStaffAccount(input: { name: string; email?: string; personalEmail: string; passwordHash: string; employeeId: string; department: string; role: string; annualCtc: number; clientAccess: StaffRecord['clientAccess'] }): Promise<StaffRecord> {
  const db = ensureDb()
  const generatedEmail = input.email?.trim().toLowerCase() || emailFromStaffName(input.name)
  const staffCollection = db.collection(COLLECTIONS.STAFF)

  const newDocRef = await db.runTransaction(async (transaction) => {
    const query = staffCollection.where('email', '==', generatedEmail).limit(1)
    const snapshot = await transaction.get(query)

    if (!snapshot.empty) {
      throw new Error('STAFF_EXISTS')
    }

    const employeeIdSnapshot = await transaction.get(staffCollection.where('employeeId', '==', input.employeeId).limit(1))
    if (!employeeIdSnapshot.empty) throw new Error('EMPLOYEE_ID_EXISTS')

    const docRef = staffCollection.doc() // Use auto-generated ID
    const newStaffData = {
      name: toTitleCase(input.name.trim()),
      email: generatedEmail,
      personalEmail: input.personalEmail.trim().toLowerCase(),
      employeeId: input.employeeId,
      passwordHash: input.passwordHash,
      active: false,
      mustChangePassword: true,
      sessionVersion: 0,
      phone: '',
      address: '',
      details: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      department: input.department,
      role: input.role,
      clientAccess: input.clientAccess,
      annualCtc: input.annualCtc,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    transaction.set(docRef, newStaffData)
    transaction.set(db.collection(COLLECTIONS.SALARIES).doc(docRef.id), {
      staffEmail: generatedEmail,
      baseSalary: input.annualCtc / 12,
      notes: 'Monthly salary calculated from annual CTC.',
      updatedAt: FieldValue.serverTimestamp(),
    })
    return docRef
  })

  const finalDoc = await newDocRef.get()
  if (!finalDoc.exists) {
    throw new Error('Failed to create and retrieve staff account.')
  }
  return mapDocToStaff(finalDoc)
}

export async function deleteStaffAccount(id: string, staffEmail: string) {
  const db = ensureDb()
  const normalizedEmail = staffEmail.trim().toLowerCase()
  const linkedCollections = [
    COLLECTIONS.WORK_SESSIONS,
    COLLECTIONS.LEGACY_TIMESHEETS,
    COLLECTIONS.LEAVE_REQUESTS,
    COLLECTIONS.SALARIES,
  ] as const

  const linkedSnapshots = await Promise.all(
    linkedCollections.map((collection) =>
      db.collection(collection).where('staffEmail', '==', normalizedEmail).get(),
    ),
  )

  // Use paths as keys so a receipt found by both its email and expense ID is
  // deleted only once.
  const linkedDocuments = new Map<string, FirebaseFirestore.DocumentReference>()
  linkedSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((document) => linkedDocuments.set(document.ref.path, document.ref))
  })

  const salaryRef = db.collection(COLLECTIONS.SALARIES).doc(id)
  linkedDocuments.set(salaryRef.path, salaryRef)

  // Firestore permits up to 500 writes per batch. Delete dependent records
  // first and the employee account last so a large cleanup never leaves an
  // orphaned account that can no longer be selected for retry.
  const references = [...linkedDocuments.values()]
  const maxBatchSize = 450
  for (let index = 0; index < references.length; index += maxBatchSize) {
    const batch = db.batch()
    references.slice(index, index + maxBatchSize).forEach((reference) => batch.delete(reference))
    await batch.commit()
  }

  await db.collection(COLLECTIONS.STAFF).doc(id).delete()
}

export async function updateStaffAccount(id: string, updates: Partial<Omit<StaffRecord, 'id' | 'passwordHash'>>): Promise<StaffRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.STAFF).doc(id)

  const dataToUpdate: Record<string, unknown> = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (dataToUpdate.name && typeof dataToUpdate.name === 'string') {
    dataToUpdate.name = toTitleCase(dataToUpdate.name)
  }
  if (dataToUpdate.email && typeof dataToUpdate.email === 'string') {
    dataToUpdate.email = dataToUpdate.email.toLowerCase()
  }
  if (dataToUpdate.personalEmail && typeof dataToUpdate.personalEmail === 'string') {
    dataToUpdate.personalEmail = dataToUpdate.personalEmail.toLowerCase()
  }
  if (typeof updates.active === 'boolean') {
    dataToUpdate.sessionVersion = FieldValue.increment(1)
  }

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(docRef)
    if (!existing.exists) throw new Error('STAFF_NOT_FOUND')
    const existingData = existing.data() || {}

    if (typeof dataToUpdate.email === 'string' && dataToUpdate.email !== existingData.email) {
      const duplicate = await transaction.get(db.collection(COLLECTIONS.STAFF).where('email', '==', dataToUpdate.email).limit(1))
      if (duplicate.docs.some((document) => document.id !== id)) throw new Error('STAFF_EXISTS')
    }
    if (typeof dataToUpdate.employeeId === 'string' && dataToUpdate.employeeId !== existingData.employeeId) {
      const duplicate = await transaction.get(db.collection(COLLECTIONS.STAFF).where('employeeId', '==', dataToUpdate.employeeId).limit(1))
      if (duplicate.docs.some((document) => document.id !== id)) throw new Error('EMPLOYEE_ID_EXISTS')
    }

    transaction.update(docRef, dataToUpdate)
    if (typeof dataToUpdate.annualCtc === 'number' || typeof dataToUpdate.email === 'string') {
      const staffEmail = typeof dataToUpdate.email === 'string' ? dataToUpdate.email : String(existingData.email || '')
      const annualCtc = typeof dataToUpdate.annualCtc === 'number' ? dataToUpdate.annualCtc : Number(existingData.annualCtc || 0)
      transaction.set(db.collection(COLLECTIONS.SALARIES).doc(id), {
        staffEmail,
        baseSalary: annualCtc / 12,
        notes: 'Monthly salary calculated from annual CTC.',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
    }
  })

  const updatedDoc = await docRef.get()
  if (!updatedDoc.exists) {
    throw new Error('Document not found after update.')
  }
  return mapDocToStaff(updatedDoc)
}

export async function updateStaffProfile(staffId: string, input: { phone: string; address: string; details: string; emergencyContactName: string; emergencyContactPhone: string }): Promise<StaffRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.STAFF).doc(staffId)

  await docRef.update({
    phone: input.phone.trim(),
    address: input.address.trim(),
    details: input.details.trim(),
    emergencyContactName: input.emergencyContactName.trim(),
    emergencyContactPhone: input.emergencyContactPhone.trim(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const updatedDoc = await docRef.get()
  if (!updatedDoc.exists) {
    throw new Error('Document not found after update.')
  }
  return mapDocToStaff(updatedDoc)
}

export async function updateStaffPassword(staffId: string, passwordHash: string): Promise<StaffRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.STAFF).doc(staffId)

  await docRef.update({
    passwordHash: passwordHash,
    mustChangePassword: false,
    sessionVersion: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const updatedDoc = await docRef.get()
  if (!updatedDoc.exists) {
    throw new Error('Document not found after update.')
  }
  return mapDocToStaff(updatedDoc)
}

export async function updateStaffPasswordAndFlag(staffId: string, passwordHash: string): Promise<StaffRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.STAFF).doc(staffId)
  await docRef.update({
    passwordHash: passwordHash,
    mustChangePassword: true,
    sessionVersion: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updatedDoc = await docRef.get()
  if (!updatedDoc.exists) {
    throw new Error('Document not found after update.')
  }
  return mapDocToStaff(updatedDoc)
}

export type ExpenseRecord = {
  id: string
  staffEmail: string
  staffName: string
  title: string
  city: string
  expenseType: 'travel' | 'food' | 'fuel' | 'other'
  customExpenseType: string
  description: string
  amount: number
  notes: string
  receiptName: string
  receiptUrl?: string
  receiptDataUrl?: string
  status: 'pending' | 'approved' | 'rejected'
  decisionNote?: string
  approvedAt?: string
  rejectedAt?: string
  createdAt?: string
  updatedAt?: string
  submittedByRole?: 'admin' | 'staff'
  expenseDate: string
  paymentStatus: 'unpaid' | 'paid'
  paidAt?: string
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

export type WorkSessionRecord = {
  id: string
  staffEmail: string
  workDate: string
  startedAt: string
  endedAt?: string
  durationMinutes: number
  notes: string
  status: 'active' | 'completed'
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
  const readStatus = (status?: string): 'pending' | 'approved' | 'rejected' => {
    return status === 'approved' || status === 'rejected' ? status : 'pending'
  }

  return {
    id: doc.id,
    staffEmail: data.staffEmail || '',
    staffName: data.staffName || data.staffEmail || '',
    title: data.title || '',
    city: data.city || '',
    expenseType: ['travel', 'food', 'fuel', 'other'].includes(data.expenseType) ? data.expenseType : 'other',
    customExpenseType: typeof data.customExpenseType === 'string' ? data.customExpenseType : '',
    description: data.description || data.notes || '',
    amount: data.amount || 0,
    notes: data.notes || '',
    receiptName: data.receiptName || '',
    receiptUrl: data.receiptUrl || '',
    receiptDataUrl: data.receiptDataUrl || '',
    status: readStatus(data.status),
    decisionNote: data.decisionNote || '',
    approvedAt: mapTimestamp(data.approvedAt),
    rejectedAt: mapTimestamp(data.rejectedAt),
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
    submittedByRole: data.submittedByRole === 'admin' ? 'admin' : 'staff',
    expenseDate: typeof data.expenseDate === 'string' ? data.expenseDate : mapTimestamp(data.createdAt)?.slice(0, 10) || '',
    paymentStatus: data.paymentStatus === 'paid' ? 'paid' : 'unpaid',
    paidAt: mapTimestamp(data.paidAt),
  }
}

function mapDocToWorkSession(doc: DocumentSnapshot): WorkSessionRecord {
  const data = doc.data() || {}
  return {
    id: doc.id,
    staffEmail: data.staffEmail || '',
    workDate: data.workDate || '',
    startedAt: mapTimestamp(data.startedAt) || '',
    endedAt: mapTimestamp(data.endedAt),
    durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : 0,
    notes: data.notes || '',
    status: data.status === 'completed' ? 'completed' : 'active',
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
  }
}

function mapDocToSalary(doc: DocumentSnapshot): SalaryRecord {
  const data = doc.data() || {}

  return {
    id: doc.id,
    staffEmail: data.staffEmail || '',
    baseSalary: data.baseSalary || 0,
    notes: data.notes || '',
    updatedAt: mapTimestamp(data.updatedAt),
  }
}

export async function listStaffAccounts() {
  if (!db) return []
  const snapshot = await db.collection(COLLECTIONS.STAFF).get()
  return snapshot.docs.map(mapDocToStaff)
}

function mapDocToFinanceInvoice(doc: DocumentSnapshot): FinanceInvoiceRecord {
  const data = doc.data() || {}
  const amount = typeof data.amount === 'number' ? data.amount : 0
  const paidAmount = typeof data.paidAmount === 'number' ? data.paidAmount : 0
  return {
    id: doc.id,
    service: data.service === 'ota_onboarding' ? 'ota_onboarding' : 'revenue_management',
    sourceId: typeof data.sourceId === 'string' ? data.sourceId : '',
    invoiceNumber: typeof data.invoiceNumber === 'string' ? data.invoiceNumber : '',
    clientName: typeof data.clientName === 'string' ? data.clientName : '',
    propertyName: typeof data.propertyName === 'string' ? data.propertyName : '',
    invoiceDate: typeof data.invoiceDate === 'string' ? data.invoiceDate : '',
    dueDate: typeof data.dueDate === 'string' ? data.dueDate : '',
    billingPeriod: typeof data.billingPeriod === 'string' ? data.billingPeriod : '',
    amount,
    paidAmount,
    balanceAmount: Math.max(0, amount - paidAmount),
    status: data.status === 'paid' || data.status === 'cancelled' ? data.status : 'pending',
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
    paidAt: mapTimestamp(data.paidAt),
  }
}

function mapDocToFinancePayment(doc: DocumentSnapshot): FinancePaymentRecord {
  const data = doc.data() || {}
  return {
    id: doc.id,
    invoiceId: typeof data.invoiceId === 'string' ? data.invoiceId : '',
    service: data.service === 'ota_onboarding' ? 'ota_onboarding' : 'revenue_management',
    invoiceNumber: typeof data.invoiceNumber === 'string' ? data.invoiceNumber : '',
    amount: typeof data.amount === 'number' ? data.amount : 0,
    paymentDate: typeof data.paymentDate === 'string' ? data.paymentDate : '',
    method: ['upi', 'neft', 'rtgs', 'bank_transfer', 'other'].includes(data.method) ? data.method as PaymentMethod : 'other',
    reference: typeof data.reference === 'string' ? data.reference : '',
    notes: typeof data.notes === 'string' ? data.notes : '',
    recordedBy: typeof data.recordedBy === 'string' ? data.recordedBy : '',
    createdAt: mapTimestamp(data.createdAt),
  }
}

export type PageResult<T> = { items: T[]; nextCursor: string | null }

async function paginateQuery<T>(query: Query, map: (document: DocumentSnapshot) => T, page: PaginationRequest): Promise<PageResult<T>> {
  let paged = query.orderBy(FieldPath.documentId())
  if (page.cursor) paged = paged.startAfter(page.cursor)
  const snapshot = await paged.limit(page.limit + 1).get()
  const hasMore = snapshot.docs.length > page.limit
  const documents = hasMore ? snapshot.docs.slice(0, page.limit) : snapshot.docs
  return { items: documents.map(map), nextCursor: hasMore ? documents.at(-1)?.id || null : null }
}

export function listStaffAccountsPage(page: PaginationRequest) {
  return paginateQuery(ensureDb().collection(COLLECTIONS.STAFF), mapDocToStaff, page)
}

export type DashboardSummary = {
  staffCount: number
  activeWorkSessions: number
  pendingExpenses: number
  approvedExpenseTotal: number
}

function isMissingIndexError(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  const code = (error as { code?: unknown }).code
  return code === 9 || code === 'failed-precondition' || code === 'FAILED_PRECONDITION'
}

async function getApprovedExpenseTotal(query: Query) {
  try {
    const aggregate = await query.aggregate({ total: AggregateField.sum('amount') }).get()
    return Number(aggregate.data().total || 0)
  } catch (error) {
    if (!isMissingIndexError(error)) throw error

    // A newly deployed aggregate index can take time to build. Keep the
    // dashboard available during that window, selecting only the required field.
    const snapshot = await query.select('amount').get()
    return snapshot.docs.reduce((total, document) => {
      const amount = document.data().amount
      return total + (typeof amount === 'number' && Number.isFinite(amount) ? amount : 0)
    }, 0)
  }
}

export async function getDashboardSummary(staffEmail?: string): Promise<DashboardSummary> {
  const db = ensureDb()
  const email = staffEmail?.trim().toLowerCase()
  const activeWorkQuery: Query = db.collection(COLLECTIONS.WORK_SESSIONS).where('status', '==', 'active')
  let expensePendingQuery: Query = db.collection(COLLECTIONS.EXPENSES).where('status', '==', 'pending')
  let expenseApprovedQuery: Query = db.collection(COLLECTIONS.EXPENSES).where('status', '==', 'approved')
  if (email) {
    expensePendingQuery = expensePendingQuery.where('staffEmail', '==', email)
    expenseApprovedQuery = expenseApprovedQuery.where('staffEmail', '==', email)
  }
  const [staffCount, activeWorkSnapshot, expenseCount, approvedTotal] = await Promise.all([
    email ? Promise.resolve({ data: () => ({ count: 0 }) }) : db.collection(COLLECTIONS.STAFF).count().get(),
    activeWorkQuery.get(),
    expensePendingQuery.count().get(),
    getApprovedExpenseTotal(expenseApprovedQuery),
  ])
  return {
    staffCount: staffCount.data().count,
    activeWorkSessions: email ? activeWorkSnapshot.docs.filter((document) => document.data().staffEmail === email).length : activeWorkSnapshot.size,
    pendingExpenses: expenseCount.data().count,
    approvedExpenseTotal: approvedTotal,
  }
}

export async function listProperties(): Promise<PropertyRecord[]> {
  const db = ensureDb()
  const snapshot = await db.collection(COLLECTIONS.PROPERTIES).get()
  return snapshot.docs.map(mapDocToProperty)
}

export function listPropertiesPage(page: PaginationRequest) {
  return paginateQuery(ensureDb().collection(COLLECTIONS.PROPERTIES), mapDocToProperty, page)
}

export async function listOnboardings(): Promise<OnboardingRecord[]> {
  const db = ensureDb()
  const snapshot = await db.collection(COLLECTIONS.OTA_ONBOARDINGS).get()
  return snapshot.docs.map(mapDocToOnboarding)
}

export function listOnboardingsPage(page: PaginationRequest) {
  return paginateQuery(ensureDb().collection(COLLECTIONS.OTA_ONBOARDINGS), mapDocToOnboarding, page)
}

export async function createOnboarding(input: OnboardingDetailsInput): Promise<OnboardingRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.OTA_ONBOARDINGS).doc(createDocumentId())
  const platforms: OnboardingPlatformProgress[] = input.platforms.map((platform) => ({ platform, status: 'pending', notes: '' }))
  await docRef.set({ ...input, platforms, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
  return mapDocToOnboarding(await docRef.get())
}

export async function updateOnboardingDetails(id: string, input: OnboardingDetailsInput): Promise<OnboardingRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.OTA_ONBOARDINGS).doc(id)

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('ONBOARDING_NOT_FOUND')
    const existing = mapDocToOnboarding(snapshot)
    const existingPlatforms = new Map(existing.platforms.map((progress) => [progress.platform, progress]))
    const platforms = input.platforms.map((platform) => existingPlatforms.get(platform) || { platform, status: 'pending' as const, notes: '' })
    transaction.update(docRef, { ...input, platforms, updatedAt: FieldValue.serverTimestamp() })
  })

  return mapDocToOnboarding(await docRef.get())
}

export async function updateOnboardingPlatform(id: string, input: OnboardingPlatformProgress): Promise<OnboardingRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.OTA_ONBOARDINGS).doc(id)

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('ONBOARDING_NOT_FOUND')
    const record = mapDocToOnboarding(snapshot)
    const index = record.platforms.findIndex((item) => item.platform === input.platform)
    if (index === -1) throw new Error('ONBOARDING_PLATFORM_NOT_FOUND')
    const platforms = [...record.platforms]
    platforms[index] = input
    transaction.update(docRef, { platforms, updatedAt: FieldValue.serverTimestamp() })
  })

  return mapDocToOnboarding(await docRef.get())
}

export async function deleteOnboarding(id: string): Promise<void> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.OTA_ONBOARDINGS).doc(id)
  const snapshot = await docRef.get()
  if (!snapshot.exists) throw new Error('ONBOARDING_NOT_FOUND')
  await docRef.delete()
}

type InvoiceSnapshotInput = { invoiceDate: string; dueDate: string; amount: number; billingPeriod?: string }

function serviceInvoiceNumber(service: FinanceService, sequence: number, invoiceDate: string) {
  const [year, month] = invoiceDate.split('-')
  return `PP-${service === 'ota_onboarding' ? 'OTA' : 'RMS'}-${month}-${year.slice(-2)}-${String(sequence).padStart(3, '0')}`
}

export async function getOrCreateOnboardingInvoiceSequence(id: string, input: InvoiceSnapshotInput): Promise<{ sequence: number; onboarding: OnboardingRecord; invoice: FinanceInvoiceRecord }> {
  const db = ensureDb()
  const onboardingRef = db.collection(COLLECTIONS.OTA_ONBOARDINGS).doc(id)
  const counterRef = db.collection(COLLECTIONS.SETTINGS).doc('ota-invoice-sequence')
  const financeRef = db.collection(COLLECTIONS.FINANCE_INVOICES).doc(`ota_${id}`)

  const sequence = await db.runTransaction(async (transaction) => {
    const onboardingSnapshot = await transaction.get(onboardingRef)
    if (!onboardingSnapshot.exists) throw new Error('ONBOARDING_NOT_FOUND')
    const financeSnapshot = await transaction.get(financeRef)

    const existingSequence = onboardingSnapshot.data()?.invoiceSequence
    if (Number.isInteger(existingSequence) && existingSequence > 0) {
      if (onboardingSnapshot.data()?.paymentStatus !== 'complete') {
        transaction.update(onboardingRef, {
          paymentStatus: 'pending',
          invoiceGeneratedAt: onboardingSnapshot.data()?.invoiceGeneratedAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
      if (!financeSnapshot.exists) {
        transaction.set(financeRef, {
          service: 'ota_onboarding', sourceId: id, invoiceNumber: serviceInvoiceNumber('ota_onboarding', existingSequence as number, input.invoiceDate),
          clientName: onboardingSnapshot.data()?.clientName || '', propertyName: onboardingSnapshot.data()?.propertyName || '',
          invoiceDate: input.invoiceDate, dueDate: input.dueDate, billingPeriod: input.billingPeriod || '', amount: input.amount,
          paidAmount: 0,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        })
      }
      return existingSequence as number
    }

    const counterSnapshot = await transaction.get(counterRef)
    const lastSequence = counterSnapshot.exists && Number.isInteger(counterSnapshot.data()?.lastSequence)
      ? counterSnapshot.data()!.lastSequence as number
      : 0
    const nextSequence = lastSequence + 1

    transaction.set(counterRef, { lastSequence: nextSequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    transaction.update(onboardingRef, {
      invoiceSequence: nextSequence,
      paymentStatus: 'pending',
      invoiceGeneratedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    transaction.set(financeRef, {
      service: 'ota_onboarding', sourceId: id, invoiceNumber: serviceInvoiceNumber('ota_onboarding', nextSequence, input.invoiceDate),
      clientName: onboardingSnapshot.data()?.clientName || '', propertyName: onboardingSnapshot.data()?.propertyName || '',
      invoiceDate: input.invoiceDate, dueDate: input.dueDate, billingPeriod: input.billingPeriod || '', amount: input.amount,
      paidAmount: 0, status: 'pending', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    })
    return nextSequence
  })

  return { sequence, onboarding: mapDocToOnboarding(await onboardingRef.get()), invoice: mapDocToFinanceInvoice(await financeRef.get()) }
}

export async function createRevenueInvoiceSequence(propertyId: string, input: InvoiceSnapshotInput): Promise<{ sequence: number; invoice: FinanceInvoiceRecord }> {
  const db = ensureDb()
  const propertyRef = db.collection(COLLECTIONS.PROPERTIES).doc(propertyId)
  const counterRef = db.collection(COLLECTIONS.SETTINGS).doc('revenue-invoice-sequence')
  const invoiceRef = db.collection(COLLECTIONS.REVENUE_INVOICES).doc(createDocumentId())

  const sequence = await db.runTransaction(async (transaction) => {
    const property = await transaction.get(propertyRef)
    if (!property.exists) throw new Error('PROPERTY_NOT_FOUND')
    if (property.data()?.status !== 'active') throw new Error('PROPERTY_NOT_ACTIVE')
    const counter = await transaction.get(counterRef)
    const lastSequence = Number.isInteger(counter.data()?.lastSequence) ? Number(counter.data()?.lastSequence) : 0
    const sequence = lastSequence + 1
    transaction.set(counterRef, { lastSequence: sequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    const invoiceNumber = serviceInvoiceNumber('revenue_management', sequence, input.invoiceDate)
    transaction.set(invoiceRef, { propertyId, sequence, invoiceNumber, status: 'generated', createdAt: FieldValue.serverTimestamp() })
    transaction.set(db.collection(COLLECTIONS.FINANCE_INVOICES).doc(invoiceRef.id), {
      service: 'revenue_management', sourceId: propertyId, invoiceNumber,
      clientName: property.data()?.contactName || property.data()?.name || '', propertyName: property.data()?.name || '',
      invoiceDate: input.invoiceDate, dueDate: input.dueDate, billingPeriod: input.billingPeriod || '', amount: input.amount,
      paidAmount: 0, status: 'pending', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    })
    return sequence
  })
  return { sequence, invoice: mapDocToFinanceInvoice(await db.collection(COLLECTIONS.FINANCE_INVOICES).doc(invoiceRef.id).get()) }
}

export async function getFinanceOverview(): Promise<FinanceOverview> {
  const db = ensureDb()
  const [invoiceSnapshot, paymentSnapshot, expenses] = await Promise.all([
    db.collection(COLLECTIONS.FINANCE_INVOICES).get(),
    db.collection(COLLECTIONS.FINANCE_PAYMENTS).get(),
    listExpenses(),
  ])
  const invoices = invoiceSnapshot.docs.map(mapDocToFinanceInvoice).sort((a, b) => (b.invoiceDate || b.createdAt || '').localeCompare(a.invoiceDate || a.createdAt || ''))
  const payments = paymentSnapshot.docs.map(mapDocToFinancePayment).sort((a, b) => (b.paymentDate || b.createdAt || '').localeCompare(a.paymentDate || a.createdAt || ''))
  const totalInvoiced = invoices.filter((invoice) => invoice.status !== 'cancelled').reduce((total, invoice) => total + invoice.amount, 0)
  const incomeReceived = payments.reduce((total, payment) => total + payment.amount, 0)
  const paidExpenses = expenses.filter((expense) => expense.paymentStatus === 'paid').reduce((total, expense) => total + expense.amount, 0)
  const unpaidExpenses = expenses.filter((expense) => expense.status === 'approved' && expense.paymentStatus !== 'paid').reduce((total, expense) => total + expense.amount, 0)
  const revenueIncome = payments.filter((payment) => payment.service === 'revenue_management').reduce((total, payment) => total + payment.amount, 0)
  const onboardingIncome = payments.filter((payment) => payment.service === 'ota_onboarding').reduce((total, payment) => total + payment.amount, 0)
  return { invoices, payments, totalInvoiced, incomeReceived, paidExpenses, unpaidExpenses, netCashBalance: incomeReceived - paidExpenses, revenueIncome, onboardingIncome }
}

export async function getFinanceInvoiceById(id: string): Promise<FinanceInvoiceRecord | null> {
  const snapshot = await ensureDb().collection(COLLECTIONS.FINANCE_INVOICES).doc(id).get()
  return snapshot.exists ? mapDocToFinanceInvoice(snapshot) : null
}

export async function syncOnboardingFinancePaymentMarker(invoice: FinanceInvoiceRecord): Promise<void> {
  if (invoice.service !== 'ota_onboarding' || invoice.status !== 'paid' || !invoice.sourceId) return
  const docRef = ensureDb().collection(COLLECTIONS.OTA_ONBOARDINGS).doc(invoice.sourceId)
  const snapshot = await docRef.get()
  if (!snapshot.exists || snapshot.data()?.financePaymentRecordedAt) return
  await docRef.update({
    paymentStatus: 'complete',
    financePaymentRecordedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function recordFinancePayment(invoiceId: string, input: { amount: number; paymentDate: string; method: PaymentMethod; reference: string; notes: string; recordedBy: string }) {
  const db = ensureDb()
  const invoiceRef = db.collection(COLLECTIONS.FINANCE_INVOICES).doc(invoiceId)
  const paymentRef = db.collection(COLLECTIONS.FINANCE_PAYMENTS).doc(createDocumentId())

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(invoiceRef)
    if (!snapshot.exists) throw new Error('FINANCE_INVOICE_NOT_FOUND')
    const invoice = mapDocToFinanceInvoice(snapshot)
    if (invoice.status === 'cancelled' || invoice.status === 'paid' || invoice.balanceAmount <= 0) throw new Error('FINANCE_INVOICE_CLOSED')
    if (Math.round(input.amount * 100) !== Math.round(invoice.balanceAmount * 100)) throw new Error(`PAYMENT_MUST_MATCH_BALANCE:${invoice.balanceAmount}`)
    const paymentAmount = invoice.balanceAmount
    transaction.set(paymentRef, {
      invoiceId, service: invoice.service, invoiceNumber: invoice.invoiceNumber, amount: paymentAmount,
      paymentDate: input.paymentDate, method: input.method, reference: input.reference.trim(), notes: input.notes.trim(),
      recordedBy: input.recordedBy, createdAt: FieldValue.serverTimestamp(),
    })
    transaction.update(invoiceRef, {
      paidAmount: invoice.amount, status: 'paid', paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    if (invoice.service === 'ota_onboarding') {
      transaction.update(db.collection(COLLECTIONS.OTA_ONBOARDINGS).doc(invoice.sourceId), {
        paymentStatus: 'complete',
        paymentCompletedAt: FieldValue.serverTimestamp(),
        financePaymentRecordedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  })

  return { invoice: mapDocToFinanceInvoice(await invoiceRef.get()), payment: mapDocToFinancePayment(await paymentRef.get()) }
}

export async function getPropertyById(id: string): Promise<PropertyRecord | null> {
  const db = ensureDb()
  const snapshot = await db.collection(COLLECTIONS.PROPERTIES).doc(id).get()
  return snapshot.exists ? mapDocToProperty(snapshot) : null
}

const CONTRACT_SEQUENCE_START = 31

function formatContractNumber(sequence: number, dateValue?: string) {
  const date = dateValue ? new Date(dateValue.includes('T') ? dateValue : `${dateValue}T00:00:00Z`) : new Date()
  const validDate = Number.isNaN(date.valueOf()) ? new Date() : date
  const month = String(validDate.getUTCMonth() + 1).padStart(2, '0')
  const year = String(validDate.getUTCFullYear())
  return `PP-RMS-${month}-${year}-${String(sequence).padStart(4, '0')}`
}

export async function createProperty(input: PropertyInput): Promise<PropertyRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.PROPERTIES).doc(createDocumentId())
  const counterRef = db.collection(COLLECTIONS.SETTINGS).doc('contract-sequence')

  await db.runTransaction(async (transaction) => {
    const counter = await transaction.get(counterRef)
    const storedLastNumber = counter.data()?.lastNumber
    const lastNumber = Number.isInteger(storedLastNumber) ? Math.max(storedLastNumber, CONTRACT_SEQUENCE_START) : CONTRACT_SEQUENCE_START
    const nextNumber = lastNumber + 1

    transaction.set(counterRef, { lastNumber: nextNumber, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    transaction.set(docRef, {
      ...input,
      contractNumber: formatContractNumber(nextNumber, input.contractStartDate),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  const snapshot = await docRef.get()
  return mapDocToProperty(snapshot)
}

export async function ensurePropertyContractNumber(id: string): Promise<PropertyRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.PROPERTIES).doc(id)
  const counterRef = db.collection(COLLECTIONS.SETTINGS).doc('contract-sequence')

  await db.runTransaction(async (transaction) => {
    const property = await transaction.get(docRef)
    if (!property.exists) throw new Error('PROPERTY_NOT_FOUND')
    if (typeof property.data()?.contractNumber === 'string' && property.data()?.contractNumber) return

    const counter = await transaction.get(counterRef)
    const storedLastNumber = counter.data()?.lastNumber
    const lastNumber = Number.isInteger(storedLastNumber) ? Math.max(storedLastNumber, CONTRACT_SEQUENCE_START) : CONTRACT_SEQUENCE_START
    const nextNumber = lastNumber + 1

    transaction.set(counterRef, { lastNumber: nextNumber, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    transaction.update(docRef, {
      contractNumber: formatContractNumber(nextNumber, property.data()?.contractStartDate),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  const property = await docRef.get()
  if (!property.exists) throw new Error('PROPERTY_NOT_FOUND')
  return mapDocToProperty(property)
}

export async function updateProperty(id: string, updates: Partial<PropertyInput>): Promise<PropertyRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.PROPERTIES).doc(id)
  const existing = await docRef.get()
  if (!existing.exists) throw new Error('PROPERTY_NOT_FOUND')
  await docRef.update({ ...updates, updatedAt: FieldValue.serverTimestamp() })
  return mapDocToProperty(await docRef.get())
}

export async function deleteProperty(id: string): Promise<void> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.PROPERTIES).doc(id)
  const existing = await docRef.get()
  if (!existing.exists) throw new Error('PROPERTY_NOT_FOUND')
  await docRef.delete()
}

export async function listExpenses(staffEmail?: string) {
  if (!db) return []

  let query: Query = db.collection(COLLECTIONS.EXPENSES)
  if (staffEmail) {
    query = query.where('staffEmail', '==', staffEmail.trim().toLowerCase())
  }

  const snapshot = await query.get()
  return snapshot.docs.map(mapDocToExpense)
}

export function listExpensesPage(page: PaginationRequest, staffEmail?: string) {
  let query: Query = ensureDb().collection(COLLECTIONS.EXPENSES)
  if (staffEmail) query = query.where('staffEmail', '==', staffEmail.trim().toLowerCase())
  return paginateQuery(query, mapDocToExpense, page)
}

export async function createExpense(input: { staffEmail: string; staffName: string; title: string; city: string; expenseType: ExpenseRecord['expenseType']; customExpenseType?: string; description: string; amount: number; receiptName: string; receiptUrl?: string; submittedByRole?: 'admin' | 'staff'; status?: 'pending' | 'approved'; expenseDate: string }): Promise<ExpenseRecord> {
  const db = ensureDb()

  const docRef = db.collection(COLLECTIONS.EXPENSES).doc() // auto-generate ID

  const newExpenseData = {
    staffEmail: input.staffEmail.trim().toLowerCase(),
    staffName: input.staffName.trim(),
    title: input.title.trim(),
    city: input.city.trim(),
    expenseType: input.expenseType,
    customExpenseType: input.customExpenseType?.trim() || '',
    description: input.description.trim(),
    amount: input.amount,
    notes: input.description.trim(),
    receiptName: input.receiptName.trim(),
    receiptUrl: input.receiptUrl || '',
    status: input.status || 'pending',
    submittedByRole: input.submittedByRole || 'staff',
    expenseDate: input.expenseDate,
    paymentStatus: 'unpaid',
    ...(input.status === 'approved' ? { approvedAt: FieldValue.serverTimestamp() } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  const batch = db.batch()
  batch.set(docRef, newExpenseData)
  // Receipt evidence uses a link/reference, not binary data, to keep Firestore storage low.
  if (input.receiptUrl) batch.set(db.collection(COLLECTIONS.EXPENSE_RECEIPTS).doc(docRef.id), { expenseId: docRef.id, staffEmail: input.staffEmail.trim().toLowerCase(), receiptName: input.receiptName.trim(), receiptUrl: input.receiptUrl, createdAt: FieldValue.serverTimestamp() })
  await batch.commit()
  const newDoc = await docRef.get()
  if (!newDoc.exists) {
    throw new Error('Failed to retrieve expense after creation.')
  }
  return mapDocToExpense(newDoc)
}

export async function correctExpense(
  id: string,
  input: {
    actorEmail: string
    staffName?: string
    expenseDate: string
    expenseType: ExpenseRecord['expenseType']
    customExpenseType: string
    city: string
    description: string
    amount: number
    receiptUrl: string
  },
): Promise<ExpenseRecord> {
  const db = ensureDb()
  const expenseRef = db.collection(COLLECTIONS.EXPENSES).doc(id)
  const receiptRef = db.collection(COLLECTIONS.EXPENSE_RECEIPTS).doc(id)
  const auditRef = db.collection(COLLECTIONS.AUDIT_LOG).doc()

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(expenseRef)
    if (!snapshot.exists) throw new Error('EXPENSE_NOT_FOUND')
    const existing = mapDocToExpense(snapshot)
    if (existing.submittedByRole === 'admin' && !input.staffName?.trim()) throw new Error('ADMIN_NAME_REQUIRED')
    const staffName = existing.submittedByRole === 'admin' ? input.staffName?.trim() || existing.staffName : existing.staffName
    const expenseLabel = input.expenseType === 'other'
      ? input.customExpenseType
      : input.expenseType.charAt(0).toUpperCase() + input.expenseType.slice(1)
    const corrected = {
      staffName,
      expenseDate: input.expenseDate,
      expenseType: input.expenseType,
      customExpenseType: input.expenseType === 'other' ? input.customExpenseType.trim() : '',
      title: `${expenseLabel} expense`,
      city: input.city.trim(),
      description: input.description.trim(),
      notes: input.description.trim(),
      amount: input.amount,
      receiptName: input.receiptUrl ? 'External receipt link' : '',
      receiptUrl: input.receiptUrl,
    }
    const changes: AuditLogRecord['changes'] = {}
    const comparableExisting: Record<keyof typeof corrected, unknown> = {
      staffName: existing.staffName,
      expenseDate: existing.expenseDate,
      expenseType: existing.expenseType,
      customExpenseType: existing.customExpenseType,
      title: existing.title,
      city: existing.city,
      description: existing.description,
      notes: existing.notes,
      amount: existing.amount,
      receiptName: existing.receiptName,
      receiptUrl: existing.receiptUrl || '',
    }
    for (const key of Object.keys(corrected) as (keyof typeof corrected)[]) {
      if (comparableExisting[key] !== corrected[key]) {
        changes[key] = { from: comparableExisting[key], to: corrected[key] }
      }
    }
    if (!Object.keys(changes).length) throw new Error('EXPENSE_NO_CHANGES')

    transaction.update(expenseRef, { ...corrected, updatedAt: FieldValue.serverTimestamp() })
    if (input.receiptUrl) {
      transaction.set(receiptRef, {
        expenseId: id,
        staffEmail: existing.staffEmail,
        receiptName: 'External receipt link',
        receiptUrl: input.receiptUrl,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
    } else {
      transaction.delete(receiptRef)
    }
    transaction.set(auditRef, {
      timestamp: FieldValue.serverTimestamp(),
      actorEmail: input.actorEmail.trim().toLowerCase(),
      action: 'EXPENSE_CORRECTION',
      targetId: id,
      details: `Admin corrected a ${existing.submittedByRole === 'admin' ? 'Admin' : 'Staff'} expense for ${existing.staffName || existing.staffEmail}.`,
      changes,
    })
  })

  pruneOldAuditLogs().catch((error) => console.error('Failed to prune old audit logs:', error))
  return mapDocToExpense(await expenseRef.get())
}

export async function deletePendingExpense(id: string, staffEmail: string) {
  const db = ensureDb()
  const expenseRef = db.collection(COLLECTIONS.EXPENSES).doc(id)
  const receiptRef = db.collection(COLLECTIONS.EXPENSE_RECEIPTS).doc(id)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(expenseRef)
    if (!snapshot.exists) throw new Error('EXPENSE_NOT_FOUND')
    const data = snapshot.data() || {}
    if (String(data.staffEmail || '').trim().toLowerCase() !== staffEmail.trim().toLowerCase()) throw new Error('EXPENSE_NOT_FOUND')
    if (data.status === 'approved' || data.status === 'rejected') throw new Error('EXPENSE_NOT_PENDING')
    transaction.delete(expenseRef)
    transaction.delete(receiptRef)
  })
}

export async function deleteAdminExpense(id: string, adminEmail: string) {
  const db = ensureDb()
  const expenseRef = db.collection(COLLECTIONS.EXPENSES).doc(id)
  const receiptRef = db.collection(COLLECTIONS.EXPENSE_RECEIPTS).doc(id)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(expenseRef)
    if (!snapshot.exists) throw new Error('EXPENSE_NOT_FOUND')
    const data = snapshot.data() || {}
    const belongsToAdmin = data.submittedByRole === 'admin' && String(data.staffEmail || '').trim().toLowerCase() === adminEmail.trim().toLowerCase()
    if (!belongsToAdmin) throw new Error('EXPENSE_NOT_FOUND')
    transaction.delete(expenseRef)
    transaction.delete(receiptRef)
  })
}

export async function updateExpenseStatus(id: string, status: 'approved' | 'rejected', decisionNote = ''): Promise<ExpenseRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.EXPENSES).doc(id)
  await docRef.update({
    status: status,
    decisionNote: decisionNote.trim(),
    approvedAt: status === 'approved' ? FieldValue.serverTimestamp() : null,
    rejectedAt: status === 'rejected' ? FieldValue.serverTimestamp() : null,
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updatedDoc = await docRef.get()
  if (!updatedDoc.exists) {
    throw new Error('Document not found after update.')
  }
  return mapDocToExpense(updatedDoc)
}

export async function markExpensePaid(id: string): Promise<ExpenseRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.EXPENSES).doc(id)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('EXPENSE_NOT_FOUND')
    if (snapshot.data()?.status !== 'approved') throw new Error('EXPENSE_NOT_APPROVED')
    if (snapshot.data()?.paymentStatus === 'paid') return
    transaction.update(docRef, { paymentStatus: 'paid', paidAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
  })
  return mapDocToExpense(await docRef.get())
}

export async function listWorkSessions(staffEmail?: string): Promise<WorkSessionRecord[]> {
  if (!db) return []
  let query: Query = db.collection(COLLECTIONS.WORK_SESSIONS)
  if (staffEmail) query = query.where('staffEmail', '==', staffEmail.trim().toLowerCase())
  const snapshot = await query.get()
  return snapshot.docs
    .map(mapDocToWorkSession)
    .sort((a, b) => (b.startedAt || b.createdAt || '').localeCompare(a.startedAt || a.createdAt || ''))
}

export function listWorkSessionsPage(page: PaginationRequest, staffEmail?: string) {
  let query: Query = ensureDb().collection(COLLECTIONS.WORK_SESSIONS)
  if (staffEmail) query = query.where('staffEmail', '==', staffEmail.trim().toLowerCase())
  return paginateQuery(query, mapDocToWorkSession, page)
}

function workSessionDocumentId(staffEmail: string, workDate: string) {
  return `work_${crypto.createHash('sha256').update(`${staffEmail.trim().toLowerCase()}:${workDate}`).digest('hex').slice(0, 32)}`
}

export async function startWorkSession(staffEmail: string, workDate: string): Promise<WorkSessionRecord> {
  const db = ensureDb()
  const normalizedEmail = staffEmail.trim().toLowerCase()
  const docRef = db.collection(COLLECTIONS.WORK_SESSIONS).doc(workSessionDocumentId(normalizedEmail, workDate))
  const now = Timestamp.now()
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (snapshot.exists) {
      if (snapshot.data()?.status === 'active') throw new Error('WORK_SESSION_ALREADY_ACTIVE')
      throw new Error('WORK_SESSION_ALREADY_COMPLETED')
    }
    transaction.set(docRef, {
      staffEmail: normalizedEmail,
      workDate,
      startedAt: now,
      durationMinutes: 0,
      notes: '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
  })
  return mapDocToWorkSession(await docRef.get())
}

export async function endWorkSession(id: string, staffEmail: string, notes: string): Promise<WorkSessionRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.WORK_SESSIONS).doc(id)
  const normalizedEmail = staffEmail.trim().toLowerCase()
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists || snapshot.data()?.staffEmail !== normalizedEmail) throw new Error('WORK_SESSION_NOT_FOUND')
    if (snapshot.data()?.status !== 'active') throw new Error('WORK_SESSION_ALREADY_COMPLETED')
    const startedAt = snapshot.data()?.startedAt
    if (!(startedAt instanceof Timestamp)) throw new Error('WORK_SESSION_INVALID_START')
    const endedAt = Timestamp.now()
    const durationMinutes = Math.max(1, Math.round((endedAt.toMillis() - startedAt.toMillis()) / 60_000))
    transaction.update(docRef, {
      endedAt,
      durationMinutes,
      notes: notes.trim(),
      status: 'completed',
      updatedAt: endedAt,
    })
  })
  return mapDocToWorkSession(await docRef.get())
}

export async function correctWorkSessionTimes(
  id: string,
  input: { startedAt: Date; endedAt?: Date; actorEmail: string },
): Promise<{ previous: WorkSessionRecord; session: WorkSessionRecord }> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.WORK_SESSIONS).doc(id)
  const auditRef = db.collection(COLLECTIONS.AUDIT_LOG).doc()
  let previous: WorkSessionRecord | null = null

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('WORK_SESSION_NOT_FOUND')

    previous = mapDocToWorkSession(snapshot)
    const correctedStartedAt = input.startedAt.toISOString()
    const correctedEndedAt = input.endedAt?.toISOString()
    const changes: AuditLogRecord['changes'] = {}
    if (previous.startedAt !== correctedStartedAt) changes.startedAt = { from: previous.startedAt, to: correctedStartedAt }
    if ((previous.endedAt || null) !== (correctedEndedAt || null)) changes.endedAt = { from: previous.endedAt || null, to: correctedEndedAt || null }
    if (!Object.keys(changes).length) throw new Error('WORK_SESSION_NO_CHANGES')

    const startedAt = Timestamp.fromDate(input.startedAt)
    const endedAt = input.endedAt ? Timestamp.fromDate(input.endedAt) : null
    const durationMinutes = endedAt
      ? Math.max(1, Math.round((endedAt.toMillis() - startedAt.toMillis()) / 60_000))
      : 0

    transaction.update(docRef, {
      startedAt,
      endedAt,
      durationMinutes,
      status: endedAt ? 'completed' : 'active',
      updatedAt: FieldValue.serverTimestamp(),
    })
    transaction.set(auditRef, {
      timestamp: FieldValue.serverTimestamp(),
      actorEmail: input.actorEmail.trim().toLowerCase(),
      action: 'WORK_SESSION_TIME_CORRECTION',
      targetId: id,
      details: `Admin corrected work-session times for ${previous.staffEmail} on ${previous.workDate}.`,
      changes,
    })
  })

  if (!previous) throw new Error('WORK_SESSION_NOT_FOUND')
  pruneOldAuditLogs().catch((error) => console.error('Failed to prune old audit logs:', error))
  return { previous, session: mapDocToWorkSession(await docRef.get()) }
}

export type LeaveRequestRecord = {
  id: string
  staffEmail: string
  startDate: string
  endDate: string
  leaveType: LeaveType | 'legacy'
  durationDays: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  decisionNote?: string
  createdAt?: string
}

export async function completeStaffOnboarding(staffId: string, input: { passwordHash: string; phone: string; address: string; details: string; emergencyContactName: string; emergencyContactPhone: string }): Promise<StaffRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.STAFF).doc(staffId)
  await docRef.update({
    passwordHash: input.passwordHash,
    phone: input.phone.trim(),
    address: input.address.trim(),
    details: input.details.trim(),
    emergencyContactName: input.emergencyContactName.trim(),
    emergencyContactPhone: input.emergencyContactPhone.trim(),
    mustChangePassword: false,
    sessionVersion: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updatedDoc = await docRef.get()
  if (!updatedDoc.exists) throw new Error('Document not found after update.')
  return mapDocToStaff(updatedDoc)
}

export async function getExpenseFieldSettings(): Promise<ExpenseFieldSettings> {
  if (!db) return defaultExpenseFieldSettings
  const snapshot = await db.collection(COLLECTIONS.SETTINGS).doc('expense-fields').get()
  if (!snapshot.exists) return defaultExpenseFieldSettings
  const data = snapshot.data() || {}
  return {
    cityRequired: typeof data.cityRequired === 'boolean' ? data.cityRequired : defaultExpenseFieldSettings.cityRequired,
    descriptionRequired: typeof data.descriptionRequired === 'boolean' ? data.descriptionRequired : defaultExpenseFieldSettings.descriptionRequired,
    receiptRequired: typeof data.receiptRequired === 'boolean' ? data.receiptRequired : defaultExpenseFieldSettings.receiptRequired,
  }
}

export async function saveExpenseFieldSettings(input: ExpenseFieldSettings): Promise<ExpenseFieldSettings> {
  const db = ensureDb()
  await db.collection(COLLECTIONS.SETTINGS).doc('expense-fields').set({ ...input, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return getExpenseFieldSettings()
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  if (!db) return defaultSecuritySettings
  const snapshot = await db.collection(COLLECTIONS.SETTINGS).doc('security').get()
  if (!snapshot.exists) return defaultSecuritySettings
  const data = snapshot.data() || {}
  return {
    sessionHours: [1, 4, 8, 12, 24].includes(data.sessionHours) ? data.sessionHours as SecuritySettings['sessionHours'] : 24,
    minPasswordLength: typeof data.minPasswordLength === 'number' ? Math.min(64, Math.max(8, data.minPasswordLength)) : 8,
    requireUppercase: data.requireUppercase === true,
    requireNumber: data.requireNumber === true,
  }
}

export async function saveSecuritySettings(input: SecuritySettings): Promise<SecuritySettings> {
  const db = ensureDb()
  await db.collection(COLLECTIONS.SETTINGS).doc('security').set({ ...input, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return input
}

export async function listSalaries() {
  if (!db) return []
  const snapshot = await db.collection(COLLECTIONS.SALARIES).get()
  return snapshot.docs.map(mapDocToSalary)
}

export function listSalariesPage(page: PaginationRequest) {
  return paginateQuery(ensureDb().collection(COLLECTIONS.SALARIES), mapDocToSalary, page)
}

export async function saveSalary(staffId: string, input: { staffEmail: string; baseSalary: number; notes: string }): Promise<SalaryRecord> {
  const db = ensureDb()

  const docRef = db.collection(COLLECTIONS.SALARIES).doc(staffId)

  const salaryData = {
    staffEmail: input.staffEmail.trim().toLowerCase(),
    baseSalary: input.baseSalary,
    notes: input.notes.trim(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await docRef.set(salaryData, { merge: true })

  const updatedDoc = await docRef.get()
  if (!updatedDoc.exists) {
    throw new Error('Document not found after update.')
  }
  return mapDocToSalary(updatedDoc)
}

export type ExpenseFieldSettings = {
  cityRequired: boolean
  descriptionRequired: boolean
  receiptRequired: boolean
}

export type SecuritySettings = {
  sessionHours: 1 | 4 | 8 | 12 | 24
  minPasswordLength: number
  requireUppercase: boolean
  requireNumber: boolean
}

const defaultExpenseFieldSettings: ExpenseFieldSettings = { cityRequired: true, descriptionRequired: true, receiptRequired: true }
const defaultSecuritySettings: SecuritySettings = { sessionHours: 12, minPasswordLength: 8, requireUppercase: false, requireNumber: false }

async function deleteAuditLogSnapshot(snapshot: FirebaseFirestore.QuerySnapshot) {
  if (!db || snapshot.empty) return 0

  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  return snapshot.size
}

export async function pruneOldAuditLogs(retentionDays = AUDIT_LOG_RETENTION_DAYS) {
  if (!db) return 0

  const cutoff = Timestamp.fromDate(new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000))
  const snapshot = await db
    .collection(COLLECTIONS.AUDIT_LOG)
    .where('timestamp', '<', cutoff)
    .limit(400)
    .get()

  return deleteAuditLogSnapshot(snapshot)
}

export async function clearAuditLogs() {
  if (!db) return 0

  let deleted = 0
  let snapshot = await db.collection(COLLECTIONS.AUDIT_LOG).limit(400).get()

  while (!snapshot.empty) {
    deleted += await deleteAuditLogSnapshot(snapshot)
    snapshot = await db.collection(COLLECTIONS.AUDIT_LOG).limit(400).get()
  }

  return deleted
}

export async function logAdminAction(input: {
  actorEmail: string
  action: string
  targetId: string
  details: string
  changes?: AuditLogRecord['changes']
}) {
  if (!db) {
    console.warn('AUDIT LOG: Firestore not configured, skipping log.')
    return
  }

  const id = createDocumentId()
  const docRef = db.collection(COLLECTIONS.AUDIT_LOG).doc(id)

  const logData: Omit<AuditLogRecord, 'id' | 'timestamp'> & { timestamp: FieldValue } = {
    timestamp: FieldValue.serverTimestamp(),
    actorEmail: input.actorEmail,
    action: input.action,
    targetId: input.targetId,
    details: input.details,
  }

  if (input.changes && Object.keys(input.changes).length > 0) {
    logData.changes = input.changes
  }

  try {
    await docRef.set(logData)
    pruneOldAuditLogs().catch((error) => {
      console.error('Failed to prune old audit logs:', error)
    })
  } catch (error) {
    // Log an error but don't throw, as the primary action succeeded.
    console.error('Failed to write to audit log:', error)
  }
}

export async function listLeaveRequests(staffEmail?: string): Promise<LeaveRequestRecord[]> {
  if (!db) return []
  let query: Query = db.collection(COLLECTIONS.LEAVE_REQUESTS)
  if (staffEmail) query = query.where('staffEmail', '==', staffEmail.trim().toLowerCase())
  const snapshot = await query.get()
  return snapshot.docs.map(mapDocToLeaveRequest)
}

function mapDocToLeaveRequest(doc: DocumentSnapshot): LeaveRequestRecord {
  const data = doc.data() || {}
  const startDate = typeof data.startDate === 'string' ? data.startDate : ''
  const endDate = typeof data.endDate === 'string' ? data.endDate : ''
  return {
    id: doc.id,
    staffEmail: data.staffEmail || '',
    startDate,
    endDate,
    leaveType: data.leaveType === 'sick' || data.leaveType === 'flexi' ? data.leaveType : 'legacy',
    durationDays: Number.isInteger(data.durationDays) && data.durationDays > 0 ? data.durationDays : countDateOnlyDaysInclusive(startDate, endDate),
    reason: data.reason || '',
    status: data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending',
    decisionNote: data.decisionNote || '',
    createdAt: mapTimestamp(data.createdAt),
  }
}

export function listLeaveRequestsPage(page: PaginationRequest, staffEmail?: string) {
  let query: Query = ensureDb().collection(COLLECTIONS.LEAVE_REQUESTS)
  if (staffEmail) query = query.where('staffEmail', '==', staffEmail.trim().toLowerCase())
  return paginateQuery(query, mapDocToLeaveRequest, page)
}

export async function createLeaveRequest(input: { staffEmail: string; startDate: string; endDate: string; leaveType: LeaveType; reason: string }) {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.LEAVE_REQUESTS).doc()
  const staffEmail = input.staffEmail.trim().toLowerCase()
  const durationDays = countDateOnlyDaysInclusive(input.startDate, input.endDate)
  const leaveYear = input.startDate.slice(0, 4)

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(db.collection(COLLECTIONS.LEAVE_REQUESTS).where('staffEmail', '==', staffEmail))
    const usedDays = existing.docs.reduce((total, document) => {
      const data = document.data()
      if (data.status === 'rejected' || data.leaveType !== input.leaveType || typeof data.startDate !== 'string' || !data.startDate.startsWith(`${leaveYear}-`)) return total
      const days = Number.isInteger(data.durationDays) && data.durationDays > 0
        ? data.durationDays
        : countDateOnlyDaysInclusive(data.startDate, data.endDate || data.startDate)
      return total + days
    }, 0)
    const remainingDays = LEAVE_ALLOWANCES[input.leaveType] - usedDays
    if (durationDays < 1 || durationDays > remainingDays) throw new Error(`LEAVE_ALLOWANCE_EXCEEDED:${Math.max(0, remainingDays)}`)

    transaction.set(docRef, {
      ...input,
      staffEmail,
      reason: input.reason.trim(),
      durationDays,
      leaveYear,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })
  })

  return mapDocToLeaveRequest(await docRef.get())
}

export async function deletePendingLeaveRequest(id: string, staffEmail: string) {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.LEAVE_REQUESTS).doc(id)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef)
    if (!snapshot.exists) throw new Error('LEAVE_NOT_FOUND')
    const data = snapshot.data() || {}
    if (String(data.staffEmail || '').trim().toLowerCase() !== staffEmail.trim().toLowerCase()) throw new Error('LEAVE_NOT_FOUND')
    if (data.status === 'approved' || data.status === 'rejected') throw new Error('LEAVE_NOT_PENDING')
    transaction.delete(docRef)
  })
}

export async function updateLeaveRequestStatus(id: string, status: 'approved' | 'rejected', decisionNote = '') {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.LEAVE_REQUESTS).doc(id)
  await docRef.update({ status, decisionNote: decisionNote.trim(), updatedAt: FieldValue.serverTimestamp() })
  const doc = await docRef.get()
  return mapDocToLeaveRequest(doc)
}
