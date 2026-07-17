import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue, DocumentSnapshot, Query } from 'firebase-admin/firestore'
import crypto from 'crypto'
import 'server-only'
import type { OnboardingDetailsInput, OnboardingRecord, OnboardingPlatformProgress, OtaPlatform } from './onboarding'

export type StaffRecord = {
  id: string
  employeeId?: string
  name: string
  email: string
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
  EXPENSES: 'expenses',
  EXPENSE_RECEIPTS: 'expense_receipts',
  TIMESHEETS: 'timesheets',
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

export async function createAdminAccount(input: { email: string; passwordHash: string }): Promise<AdminRecord> {
  const db = ensureDb()
  const normalizedEmail = input.email.trim().toLowerCase()
  const adminCollection = db.collection(COLLECTIONS.ADMINS)

  const newDocRef = await db.runTransaction(async (transaction) => {
    const query = adminCollection.where('email', '==', normalizedEmail).limit(1)
    const snapshot = await transaction.get(query)

    if (!snapshot.empty) {
      throw new Error('ADMIN_EXISTS')
    }

    const docRef = adminCollection.doc()
    transaction.set(docRef, {
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      active: true,
      sessionVersion: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return docRef
  })

  const finalDoc = await newDocRef.get()
  if (!finalDoc.exists) {
    throw new Error('Failed to create and retrieve admin account.')
  }
  return mapDocToAdmin(finalDoc)
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

export async function createStaffAccount(input: { name: string; email?: string; passwordHash: string; employeeId: string; department: string; role: string; annualCtc: number }): Promise<StaffRecord> {
  const db = ensureDb()
  const generatedEmail = input.email?.trim().toLowerCase() || emailFromStaffName(input.name)
  const staffCollection = db.collection(COLLECTIONS.STAFF)

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
      sessionVersion: 0,
      phone: '',
      address: '',
      details: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      department: input.department,
      role: input.role,
      annualCtc: input.annualCtc,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    transaction.set(docRef, newStaffData)
    return docRef
  })

  const finalDoc = await newDocRef.get()
  if (!finalDoc.exists) {
    throw new Error('Failed to create and retrieve staff account.')
  }
  return mapDocToStaff(finalDoc)
}

export async function deleteStaffAccount(id: string) {
  const db = ensureDb()
  const batch = db.batch()
  batch.delete(db.collection(COLLECTIONS.STAFF).doc(id))
  // Salary documents use the employee document ID, so remove both atomically.
  batch.delete(db.collection(COLLECTIONS.SALARIES).doc(id))
  await batch.commit()
}

export async function updateStaffAccount(id: string, updates: Partial<Omit<StaffRecord, 'id' | 'passwordHash'>>): Promise<StaffRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.STAFF).doc(id)

  const dataToUpdate: Record<string, any> = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (dataToUpdate.name && typeof dataToUpdate.name === 'string') {
    dataToUpdate.name = toTitleCase(dataToUpdate.name)
  }
  if (dataToUpdate.email && typeof dataToUpdate.email === 'string') {
    dataToUpdate.email = dataToUpdate.email.toLowerCase()
  }
  if (typeof updates.active === 'boolean') {
    dataToUpdate.sessionVersion = FieldValue.increment(1)
  }

  await docRef.update(dataToUpdate)

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
  weekStart: string
  weekEnd: string
  workedDates: string[]
  workLocation: 'remote' | 'office'
  hours: number
  notes: string
  status: 'pending' | 'approved' | 'rejected'
  decisionNote?: string
  approvedAt?: string
  rejectedAt?: string
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
  }
}

function mapDocToTimesheet(doc: DocumentSnapshot): TimesheetRecord {
  const data = doc.data() || {}
  const readStatus = (status?: string): 'pending' | 'approved' | 'rejected' => {
    return status === 'approved' || status === 'rejected' ? status : 'pending'
  }

  return {
    id: doc.id,
    staffEmail: data.staffEmail || '',
    workDate: data.workDate || '',
    weekStart: data.weekStart || data.workDate || '',
    weekEnd: data.weekEnd || data.weekStart || data.workDate || '',
    workedDates: Array.isArray(data.workedDates) ? data.workedDates.filter((date): date is string => typeof date === 'string') : (data.workDate ? [data.workDate] : []),
    workLocation: data.workLocation === 'office' ? 'office' : 'remote',
    hours: data.hours || 0,
    notes: data.notes || '',
    status: readStatus(data.status),
    decisionNote: data.decisionNote || '',
    approvedAt: mapTimestamp(data.approvedAt),
    rejectedAt: mapTimestamp(data.rejectedAt),
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

export async function listProperties(): Promise<PropertyRecord[]> {
  const db = ensureDb()
  const snapshot = await db.collection(COLLECTIONS.PROPERTIES).get()
  return snapshot.docs.map(mapDocToProperty)
}

export async function listOnboardings(): Promise<OnboardingRecord[]> {
  const db = ensureDb()
  const snapshot = await db.collection(COLLECTIONS.OTA_ONBOARDINGS).get()
  return snapshot.docs.map(mapDocToOnboarding)
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

export async function getOrCreateOnboardingInvoiceSequence(id: string): Promise<number> {
  const db = ensureDb()
  const onboardingRef = db.collection(COLLECTIONS.OTA_ONBOARDINGS).doc(id)
  const counterRef = db.collection(COLLECTIONS.SETTINGS).doc('ota-invoice-sequence')

  return db.runTransaction(async (transaction) => {
    const onboardingSnapshot = await transaction.get(onboardingRef)
    if (!onboardingSnapshot.exists) throw new Error('ONBOARDING_NOT_FOUND')

    const existingSequence = onboardingSnapshot.data()?.invoiceSequence
    if (Number.isInteger(existingSequence) && existingSequence > 0) return existingSequence as number

    const counterSnapshot = await transaction.get(counterRef)
    const lastSequence = counterSnapshot.exists && Number.isInteger(counterSnapshot.data()?.lastSequence)
      ? counterSnapshot.data()!.lastSequence as number
      : 0
    const nextSequence = lastSequence + 1

    transaction.set(counterRef, { lastSequence: nextSequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    transaction.update(onboardingRef, { invoiceSequence: nextSequence, updatedAt: FieldValue.serverTimestamp() })
    return nextSequence
  })
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

export async function createExpense(input: { staffEmail: string; staffName: string; title: string; city: string; expenseType: ExpenseRecord['expenseType']; description: string; amount: number; receiptName: string; receiptUrl?: string }): Promise<ExpenseRecord> {
  const db = ensureDb()

  const docRef = db.collection(COLLECTIONS.EXPENSES).doc() // auto-generate ID

  const newExpenseData = {
    staffEmail: input.staffEmail.trim().toLowerCase(),
    staffName: input.staffName.trim(),
    title: input.title.trim(),
    city: input.city.trim(),
    expenseType: input.expenseType,
    description: input.description.trim(),
    amount: input.amount,
    notes: input.description.trim(),
    receiptName: input.receiptName.trim(),
    receiptUrl: input.receiptUrl || '',
    status: 'pending' as const,
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

export async function listTimesheets(staffEmail?: string) {
  if (!db) return []

  let query: Query = db.collection(COLLECTIONS.TIMESHEETS)
  if (staffEmail) {
    query = query.where('staffEmail', '==', staffEmail.trim().toLowerCase())
  }

  const snapshot = await query.get()
  return snapshot.docs.map(mapDocToTimesheet)
}

export async function createTimesheet(input: { staffEmail: string; weekStart: string; weekEnd: string; workedDates: string[]; workLocation: 'remote' | 'office'; notes?: string }): Promise<TimesheetRecord> {
  const db = ensureDb()

  const docRef = db.collection(COLLECTIONS.TIMESHEETS).doc() // auto-generate ID

  const newTimesheetData = {
    staffEmail: input.staffEmail.trim().toLowerCase(),
    workDate: input.weekStart,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    workedDates: input.workedDates,
    workLocation: input.workLocation,
    hours: 0,
    notes: input.notes?.trim() || '',
    status: 'pending' as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await docRef.set(newTimesheetData)
  const newDoc = await docRef.get()
  if (!newDoc.exists) {
    throw new Error('Failed to retrieve timesheet after creation.')
  }
  return mapDocToTimesheet(newDoc)
}

export async function updateTimesheetStatus(id: string, status: 'approved' | 'rejected', decisionNote = ''): Promise<TimesheetRecord> {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.TIMESHEETS).doc(id)
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
  return mapDocToTimesheet(updatedDoc)
}

export type LeaveRequestRecord = {
  id: string
  staffEmail: string
  startDate: string
  endDate: string
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
    minPasswordLength: typeof data.minPasswordLength === 'number' ? Math.min(64, Math.max(12, data.minPasswordLength)) : 12,
    requireUppercase: data.requireUppercase === true,
    requireNumber: data.requireNumber === true,
  }
}

export async function saveSecuritySettings(input: SecuritySettings): Promise<SecuritySettings> {
  const db = ensureDb()
  await db.collection(COLLECTIONS.SETTINGS).doc('security').set({ ...input, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return getSecuritySettings()
}

export async function listSalaries() {
  if (!db) return []
  const snapshot = await db.collection(COLLECTIONS.SALARIES).get()
  return snapshot.docs.map(mapDocToSalary)
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
const defaultSecuritySettings: SecuritySettings = { sessionHours: 12, minPasswordLength: 12, requireUppercase: false, requireNumber: false }

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
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return { id: doc.id, staffEmail: data.staffEmail || '', startDate: data.startDate || '', endDate: data.endDate || '', reason: data.reason || '', status: data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending', decisionNote: data.decisionNote || '', createdAt: mapTimestamp(data.createdAt) }
  })
}

export async function createLeaveRequest(input: Omit<LeaveRequestRecord, 'id' | 'status' | 'decisionNote' | 'createdAt'>) {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.LEAVE_REQUESTS).doc()
  await docRef.set({ ...input, staffEmail: input.staffEmail.trim().toLowerCase(), reason: input.reason.trim(), status: 'pending', createdAt: FieldValue.serverTimestamp() })
  return (await listLeaveRequests(input.staffEmail)).find((leave) => leave.id === docRef.id)!
}

export async function updateLeaveRequestStatus(id: string, status: 'approved' | 'rejected', decisionNote = '') {
  const db = ensureDb()
  const docRef = db.collection(COLLECTIONS.LEAVE_REQUESTS).doc(id)
  await docRef.update({ status, decisionNote: decisionNote.trim(), updatedAt: FieldValue.serverTimestamp() })
  const doc = await docRef.get()
  const data = doc.data() || {}
  return { id: doc.id, staffEmail: data.staffEmail || '', startDate: data.startDate || '', endDate: data.endDate || '', reason: data.reason || '', status: data.status, decisionNote: data.decisionNote || '', createdAt: mapTimestamp(data.createdAt) } as LeaveRequestRecord
}
