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

type FirestoreValue = {
  stringValue?: string
  booleanValue?: boolean
  timestampValue?: string
  integerValue?: string
  doubleValue?: number
}

type FirestoreDocument = {
  name: string
  fields?: Record<string, FirestoreValue>
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    return null
  }

  return { projectId, clientEmail, privateKey }
}

export function isFirestoreConfigured() {
  return Boolean(getFirebaseConfig())
}

function toBase64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

async function getAccessToken() {
  const config = getFirebaseConfig()

  if (!config) {
    throw new Error('Firestore is not configured.')
  }

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60000) {
    return cachedAccessToken.token
  }

  const now = Math.floor(Date.now() / 1000)
  const assertionPayload = `${toBase64Url({ alg: 'RS256', typ: 'JWT' })}.${toBase64Url({
    iss: config.clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`

  const signature = crypto.sign('RSA-SHA256', Buffer.from(assertionPayload), config.privateKey).toString('base64url')
  const assertion = `${assertionPayload}.${signature}`
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    throw new Error('Unable to authenticate with Firestore.')
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return cachedAccessToken.token
}

async function runQuery(query: object) {
  const config = getFirebaseConfig()
  if (!config) {
    throw new Error('Firestore is not configured.')
  }
  const accessToken = await getAccessToken()
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Firestore query failed: ${error}`)
  }

  return response.json()
}

async function firestoreRequest(path: string, init: RequestInit = {}) {
  const config = getFirebaseConfig()

  if (!config) {
    throw new Error('Firestore is not configured.')
  }

  const accessToken = await getAccessToken()
  return fetch(`https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

function staffIdFromEmail(email: string) {
  return email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_')
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

function readString(value?: FirestoreValue) {
  return value?.stringValue || ''
}

function readBoolean(value?: FirestoreValue, fallback = false) {
  return typeof value?.booleanValue === 'boolean' ? value.booleanValue : fallback
}

function readNumber(value?: FirestoreValue) {
  if (typeof value?.doubleValue === 'number') {
    return value.doubleValue
  }

  if (value?.integerValue) {
    return Number(value.integerValue)
  }

  return 0
}

function mapStaff(document: FirestoreDocument): StaffRecord {
  const fields = document.fields || {}

  return {
    id: document.name.split('/').pop() || '',
    employeeId: readString(fields.employeeId),
    name: readString(fields.name),
    email: readString(fields.email),
    passwordHash: readString(fields.passwordHash),
    active: readBoolean(fields.active, true),
    mustChangePassword: readBoolean(fields.mustChangePassword, true),
    phone: readString(fields.phone),
    address: readString(fields.address),
    details: readString(fields.details),
    department: readString(fields.department),
    createdAt: fields.createdAt?.timestampValue,
    updatedAt: fields.updatedAt?.timestampValue,
  }
}

function staffDocumentFields(staff: Omit<StaffRecord, 'id'>) {
  return {
    fields: {
      employeeId: { stringValue: staff.employeeId || '' },
      name: { stringValue: staff.name },
      email: { stringValue: staff.email },
      passwordHash: { stringValue: staff.passwordHash },
      active: { booleanValue: staff.active },
      mustChangePassword: { booleanValue: staff.mustChangePassword },
      phone: { stringValue: staff.phone || '' },
      address: { stringValue: staff.address || '' },
      details: { stringValue: staff.details || '' },
      department: { stringValue: staff.department || '' },
      createdAt: { timestampValue: staff.createdAt || new Date().toISOString() },
      updatedAt: { timestampValue: staff.updatedAt || new Date().toISOString() },
    },
  }
}

async function listCollection<T>(collection: string, mapper: (document: FirestoreDocument) => T) {
  if (!isFirestoreConfigured()) {
    return []
  }

  const response = await firestoreRequest(`/${collection}`)

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    throw new Error(`Unable to load ${collection}.`)
  }

  const data = (await response.json()) as { documents?: FirestoreDocument[] }
  return (data.documents || []).map(mapper)
}

async function patchDocument(collection: string, id: string, fields: Record<string, FirestoreValue>) {
  const fieldPaths = Object.keys(fields).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&')
  const response = await firestoreRequest(`/${collection}/${id}?${fieldPaths}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })

  if (!response.ok) {
    throw new Error(`Unable to update ${collection}.`)
  }

  return (await response.json()) as FirestoreDocument
}

export async function getStaffByEmail(email: string) {
  if (!isFirestoreConfigured()) {
    return null
  }

  const results = await runQuery({
    structuredQuery: {
      from: [{ collectionId: 'staff' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: email.trim().toLowerCase() },
        },
      },
      limit: 1,
    },
  })

  // The result of a query is an array of documents.
  // We check if the first result has a `document` property.
  if (Array.isArray(results) && results.length > 0 && results[0].document) {
    return mapStaff(results[0].document)
  }

  return null
}

export async function createStaffAccount(input: { name: string; passwordHash: string; employeeId: string; department: string }) {
  const generatedEmail = emailFromStaffName(input.name)

  const existingStaff = await getStaffByEmail(generatedEmail)

  if (existingStaff) {
    throw new Error('STAFF_EXISTS')
  }

  const capitalizedName = toTitleCase(input.name.trim())
  const now = new Date().toISOString()
  const response = await firestoreRequest(`/staff/${staffIdFromEmail(generatedEmail)}`, {
    method: 'PATCH',
    body: JSON.stringify(
      staffDocumentFields({
        name: capitalizedName,
        email: generatedEmail,
        employeeId: input.employeeId,
        passwordHash: input.passwordHash,
        active: true,
        mustChangePassword: true,
        phone: '',
        address: '',
        details: '',
        department: input.department,
        createdAt: now,
        updatedAt: now,
      })
    ),
  })

  if (!response.ok) {
    throw new Error('Unable to create staff account.')
  }

  return mapStaff((await response.json()) as FirestoreDocument)
}

export async function deleteStaffAccount(id: string) {
  const response = await firestoreRequest(`/staff/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 404) {
    // Allow 404 as it means already deleted.
    throw new Error('Unable to delete staff account.')
  }
}

export async function updateStaffAccount(id: string, updates: Partial<Omit<StaffRecord, 'id' | 'passwordHash'>>) {
  const fieldsToUpdate: Record<string, FirestoreValue> = {
    updatedAt: { timestampValue: new Date().toISOString() },
  }

  if (updates.name !== undefined) fieldsToUpdate.name = { stringValue: toTitleCase(updates.name) }
  if (updates.email !== undefined) fieldsToUpdate.email = { stringValue: updates.email.toLowerCase() }
  if (updates.employeeId !== undefined) fieldsToUpdate.employeeId = { stringValue: updates.employeeId }
  if (updates.department !== undefined) fieldsToUpdate.department = { stringValue: updates.department }
  if (updates.active !== undefined) fieldsToUpdate.active = { booleanValue: updates.active }

  return mapStaff(await patchDocument('staff', id, fieldsToUpdate))
}

export async function updateStaffProfile(email: string, input: { phone: string; address: string; details: string }) {
  const normalizedEmail = email.trim().toLowerCase()
  const document = await patchDocument('staff', staffIdFromEmail(normalizedEmail), {
    phone: { stringValue: input.phone.trim() },
    address: { stringValue: input.address.trim() },
    details: { stringValue: input.details.trim() },
    updatedAt: { timestampValue: new Date().toISOString() },
  })

  return mapStaff(document)
}

export async function updateStaffPassword(email: string, passwordHash: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const now = new Date().toISOString()
  const response = await firestoreRequest(
    `/staff/${staffIdFromEmail(normalizedEmail)}?updateMask.fieldPaths=passwordHash&updateMask.fieldPaths=mustChangePassword&updateMask.fieldPaths=updatedAt`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          passwordHash: { stringValue: passwordHash },
          mustChangePassword: { booleanValue: false },
          updatedAt: { timestampValue: now },
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error('Unable to update staff password.')
  }

  return mapStaff((await response.json()) as FirestoreDocument)
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

function readStatus(value?: FirestoreValue): 'pending' | 'approved' | 'rejected' {
  const status = readString(value)
  return status === 'approved' || status === 'rejected' ? status : 'pending'
}

function mapExpense(document: FirestoreDocument): ExpenseRecord {
  const fields = document.fields || {}
  return {
    id: document.name.split('/').pop() || '',
    staffEmail: readString(fields.staffEmail),
    title: readString(fields.title),
    amount: readNumber(fields.amount),
    notes: readString(fields.notes),
    status: readStatus(fields.status),
    createdAt: fields.createdAt?.timestampValue,
    updatedAt: fields.updatedAt?.timestampValue,
  }
}

function mapTimesheet(document: FirestoreDocument): TimesheetRecord {
  const fields = document.fields || {}
  return {
    id: document.name.split('/').pop() || '',
    staffEmail: readString(fields.staffEmail),
    workDate: readString(fields.workDate),
    hours: readNumber(fields.hours),
    notes: readString(fields.notes),
    status: readStatus(fields.status),
    createdAt: fields.createdAt?.timestampValue,
    updatedAt: fields.updatedAt?.timestampValue,
  }
}

function mapSalary(document: FirestoreDocument): SalaryRecord {
  const fields = document.fields || {}
  return {
    id: document.name.split('/').pop() || '',
    staffEmail: readString(fields.staffEmail),
    baseSalary: readNumber(fields.baseSalary),
    notes: readString(fields.notes),
    updatedAt: fields.updatedAt?.timestampValue,
  }
}

export async function listStaffAccounts() {
  return listCollection('staff', mapStaff)
}

export async function listExpenses(staffEmail?: string) {
  const expenses = await listCollection('expenses', mapExpense)
  return staffEmail ? expenses.filter((expense) => expense.staffEmail === staffEmail.trim().toLowerCase()) : expenses
}

export async function createExpense(input: { staffEmail: string; title: string; amount: number; notes: string }) {
  const now = new Date().toISOString()
  const id = createDocumentId()
  const response = await firestoreRequest(`/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        staffEmail: { stringValue: input.staffEmail.trim().toLowerCase() },
        title: { stringValue: input.title.trim() },
        amount: { doubleValue: input.amount },
        notes: { stringValue: input.notes.trim() },
        status: { stringValue: 'pending' },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      },
    }),
  })

  if (!response.ok) {
    throw new Error('Unable to create expense.')
  }

  // NOTE: Email Notification for Admin
  // The logic to send an email should be triggered here, likely in the API
  // route that calls this `createExpense` function. You would use a service
  // like Resend, SendGrid, or Nodemailer.
  /*
  Example of what the call would look like:
  await sendEmail({
    to: 'admin@profitproz.com',
    subject: `New Expense Submitted by ${input.staffEmail}`,
    body: `A new expense claim for ${input.amount} titled "${input.title}" has been submitted by ${input.staffEmail}. 
           Please log in to the admin portal to review and approve it.`
  });
  */

  return mapExpense((await response.json()) as FirestoreDocument)
}

export async function updateExpenseStatus(id: string, status: 'approved' | 'rejected') {
  return mapExpense(
    await patchDocument('expenses', id, {
      status: { stringValue: status },
      updatedAt: { timestampValue: new Date().toISOString() },
    })
  )
}

export async function listTimesheets(staffEmail?: string) {
  const timesheets = await listCollection('timesheets', mapTimesheet)
  return staffEmail ? timesheets.filter((timesheet) => timesheet.staffEmail === staffEmail.trim().toLowerCase()) : timesheets
}

export async function createTimesheet(input: { staffEmail: string; workDate: string; hours: number; notes: string }) {
  const now = new Date().toISOString()
  const id = createDocumentId()
  const response = await firestoreRequest(`/timesheets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        staffEmail: { stringValue: input.staffEmail.trim().toLowerCase() },
        workDate: { stringValue: input.workDate },
        hours: { doubleValue: input.hours },
        notes: { stringValue: input.notes.trim() },
        status: { stringValue: 'pending' },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      },
    }),
  })

  if (!response.ok) {
    throw new Error('Unable to create timesheet.')
  }

  return mapTimesheet((await response.json()) as FirestoreDocument)
}

export async function updateTimesheetStatus(id: string, status: 'approved' | 'rejected') {
  return mapTimesheet(
    await patchDocument('timesheets', id, {
      status: { stringValue: status },
      updatedAt: { timestampValue: new Date().toISOString() },
    })
  )
}

export async function listSalaries() {
  return listCollection('salaries', mapSalary)
}

export async function saveSalary(input: { staffEmail: string; baseSalary: number; notes: string }) {
  const id = staffIdFromEmail(input.staffEmail)
  const response = await firestoreRequest(`/salaries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        staffEmail: { stringValue: input.staffEmail.trim().toLowerCase() },
        baseSalary: { doubleValue: input.baseSalary },
        notes: { stringValue: input.notes.trim() },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  })

  if (!response.ok) {
    throw new Error('Unable to save salary.')
  }

  return mapSalary((await response.json()) as FirestoreDocument)
}
