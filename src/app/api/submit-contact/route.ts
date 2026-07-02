import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> | null = null

  try {
    body = await request.json()
    const { name, email, phone, hotel, rooms, service, message } = body as {
      name?: string
      email?: string
      phone?: string
      hotel?: string
      rooms?: string
      service?: string
      message?: string
    }

    if (!name || !phone || !hotel || !service) {
      return NextResponse.json(
        { success: false, message: 'Required fields are missing.' },
        { status: 400 }
      )
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1'

    if (!spreadsheetId || !serviceAccountEmail || !privateKey) {
      return NextResponse.json(
        {
          success: false,
          message: 'Google Sheets credentials are not configured.',
        },
        { status: 500 }
      )
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    const rowData = [
      new Date().toISOString(),
      name,
      email || '',
      phone,
      hotel,
      rooms || '',
      service,
      message || '',
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:H`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    })

    return NextResponse.json({ success: true, message: 'Form submitted successfully.' })
  } catch (error) {
    console.error('Google Sheets submission failed:', error)

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: 'support@profitproz.com',
        subject: 'Contact form submission failed to sync to Google Sheets',
        text: `A contact form submission could not be saved to Google Sheets.\n\n${JSON.stringify(body, null, 2)}`,
      })
    } catch (mailError) {
      console.error('Fallback email failed:', mailError)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Form submitted successfully.',
      },
      { status: 200 }
    )
  }
}
