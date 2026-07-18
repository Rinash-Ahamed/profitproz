import { NextRequest, NextResponse } from 'next/server'
import { SessionUser } from '@/lib/auth'
import { createExpense, getExpenseFieldSettings, getStaffByEmail, listExpenses, listExpensesPage, type ExpenseRecord } from '@/lib/firestore'
import { getExpenseNotificationHtml, queueMail } from '@/lib/mail'
import { readPagination } from '@/lib/pagination'
import { requireStaffSession } from '@/lib/api-auth'
import { parseDateOnly } from '@/lib/date-only'

// Helper to centralize authentication and role checking for staff routes
async function getAuthenticatedStaffUser(): Promise<SessionUser | NextResponse> {
  const user = await requireStaffSession()

  if (!user || user.role !== 'staff') {
    return NextResponse.json({ message: 'Forbidden: Staff access is required.' }, { status: 403 })
  }
  return user
}

function hideReceiptLink(expense: ExpenseRecord): ExpenseRecord {
  return { ...expense, receiptUrl: '', receiptDataUrl: '' }
}

export async function GET(request: Request) {
  const userOrResponse = await getAuthenticatedStaffUser()
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse
  }

  try {
    const pagination = readPagination(request)
    const [expenseResult, settings] = await Promise.all([pagination ? listExpensesPage(pagination, userOrResponse.email) : listExpenses(userOrResponse.email), getExpenseFieldSettings()])
    return Array.isArray(expenseResult)
      ? NextResponse.json({ expenses: expenseResult.map(hideReceiptLink), settings })
      : NextResponse.json({ expenses: expenseResult.items.map(hideReceiptLink), settings, nextCursor: expenseResult.nextCursor })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userOrResponse = await getAuthenticatedStaffUser()
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse
  }
  const user = userOrResponse

  let body: { city?: unknown; expenseType?: unknown; customExpenseType?: unknown; description?: unknown; amount?: unknown; receiptUrl?: unknown; expenseDate?: unknown }
  try {
    body = await request.json()
  } catch (error) {
    return NextResponse.json({ message: 'Invalid request body: Must be valid JSON.' }, { status: 400 })
  }

  const city = typeof body.city === 'string' ? body.city.trim() : ''
  const expenseType = body.expenseType === 'travel' || body.expenseType === 'food' || body.expenseType === 'fuel' || body.expenseType === 'other' ? body.expenseType : ''
  const customExpenseType = typeof body.customExpenseType === 'string' ? body.customExpenseType.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const amount = Number(body.amount)
  const receiptUrl = typeof body.receiptUrl === 'string' ? body.receiptUrl.trim() : ''
  const expenseDate = typeof body.expenseDate === 'string' ? body.expenseDate : ''
  const settings = await getExpenseFieldSettings()

  if (!expenseType || (expenseType === 'other' && (!customExpenseType || customExpenseType.length > 100)) || (expenseType !== 'other' && customExpenseType.length > 0) || !parseDateOnly(expenseDate) || !Number.isFinite(amount) || amount <= 0 || amount > 10_000_000 || city.length > 100 || description.length > 2000 || receiptUrl.length > 2048 || (settings.cityRequired && !city) || (settings.descriptionRequired && !description) || (settings.receiptRequired && !receiptUrl)) {
    return NextResponse.json({ message: 'Complete all required expense fields and enter a valid total.' }, { status: 400 })
  }
  if (receiptUrl) {
    try {
      const parsedReceiptUrl = new URL(receiptUrl)
      if (parsedReceiptUrl.protocol !== 'https:' || parsedReceiptUrl.username || parsedReceiptUrl.password) throw new Error('UNSAFE_URL')
    } catch {
      return NextResponse.json({ message: 'Enter a valid HTTPS receipt link.' }, { status: 400 })
    }
  }

  try {
    const staff = await getStaffByEmail(user.email)
    const expenseLabel = expenseType === 'other' ? customExpenseType : expenseType.charAt(0).toUpperCase() + expenseType.slice(1)
    const title = `${expenseLabel} expense`
    const expense = await createExpense({ staffEmail: user.email, staffName: staff?.name || user.email, title, city, expenseType, customExpenseType, description, amount, receiptName: receiptUrl ? 'External receipt link' : '', receiptUrl, submittedByRole: 'staff', expenseDate })

    try {
      await queueMail({
      fromName: 'ProfitPro Portal',
      to: `${process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@profitproz.com'}, support@profitproz.com`,
      replyTo: user.email,
      subject: `Expense submitted by ${user.email}`,
      text: `${staff?.name || user.email} submitted a ${expenseLabel} expense for ${amount}. City: ${city || 'N/A'}. Description: ${description || 'N/A'}`,
      html: getExpenseNotificationHtml({ staffEmail: user.email, title, amount, notes: description }),
      })
    } catch (mailError) {
      console.error(`Failed to send expense notification email for ${user.email}:`, mailError)
    }

    return NextResponse.json({ expense: hideReceiptLink(expense) }, { status: 201 }) // Use 201 for created resource
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ message: 'An internal server error occurred while creating the expense.' }, { status: 500 })
  }
}
