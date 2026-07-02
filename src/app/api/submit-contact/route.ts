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
      subject: `New enquiry from ${name}`,
      text: `New enquiry from ${name} via the website.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <div style="margin-bottom: 20px;">
            <img src="/mainlogo.png" alt="ProfitPro logo" width="180" style="display: block;" />
          </div>

          <h2 style="margin: 0 0 12px; color: #111827; font-size: 22px;">New contact form submission</h2>
          <p style="margin: 0 0 18px; color: #6b7280;">A new inquiry was submitted from the website.</p>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #111827; width: 120px;">Name</td>
              <td style="padding: 8px 0; color: #374151;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #111827;">Email</td>
              <td style="padding: 8px 0; color: #374151;">${email || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #111827;">Phone</td>
              <td style="padding: 8px 0; color: #374151;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #111827;">Hotel</td>
              <td style="padding: 8px 0; color: #374151;">${hotel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #111827;">Rooms</td>
              <td style="padding: 8px 0; color: #374151;">${rooms || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #111827;">Service</td>
              <td style="padding: 8px 0; color: #374151;">${service}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #111827; vertical-align: top;">Message</td>
              <td style="padding: 8px 0; color: #374151; white-space: pre-wrap;">${message || 'N/A'}</td>
            </tr>
          </table>
        </div>
      `,
    })

    return NextResponse.json({ success: true, message: 'Form submitted successfully.' })
  } catch (error) {
    console.error('Contact form email failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send the form submission.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

