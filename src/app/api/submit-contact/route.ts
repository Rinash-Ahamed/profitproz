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
      text: `New enquiry from ${name} (${hotel}). Phone: ${phone}. Email: ${email}. Service: ${service}. Message: ${message}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 20px 0 48px; background-color: #18181B; color: #A1A1AA;">
          <div style="text-align: center; padding: 20px 0;">
            <img src="https://profitproz.com/profitpro.png" alt="ProfitPro logo" width="150" style="margin: 0 auto;" />
          </div>

          <h2 style="font-size: 24px; font-weight: bold; color: #F4F4F5; margin: 30px 0; text-align: center;">New Revenue Audit Request</h2>
          <p style="font-size: 16px; line-height: 26px; text-align: center; margin: 0 20px 20px;">A new enquiry has been submitted via the website contact form.</p>

          <hr style="border: none; border-top: 1px solid #27272A; margin: 20px 0;" />

          <div style="padding: 12px 20px; background-color: #1f1f22; border-radius: 8px; margin: 0 20px;">
            <p style="font-size: 12px; color: #A1A1AA; margin: 0 0 4px 0; text-transform: uppercase;">Name:</p>
            <p style="font-size: 16px; color: #F4F4F5; margin: 0 0 16px 0; font-weight: 500;">${name}</p>

            <p style="font-size: 12px; color: #A1A1AA; margin: 0 0 4px 0; text-transform: uppercase;">Hotel:</p>
            <p style="font-size: 16px; color: #F4F4F5; margin: 0 0 16px 0; font-weight: 500;">${hotel}</p>

            <p style="font-size: 12px; color: #A1A1AA; margin: 0 0 4px 0; text-transform: uppercase;">Phone:</p>
            <p style="font-size: 16px; color: #F4F4F5; margin: 0 0 16px 0; font-weight: 500;">${phone}</p>

            <p style="font-size: 12px; color: #A1A1AA; margin: 0 0 4px 0; text-transform: uppercase;">Email:</p>
            <p style="font-size: 16px; color: #F4F4F5; margin: 0 0 16px 0; font-weight: 500;">${email || 'Not provided'}</p>

            <p style="font-size: 12px; color: #A1A1AA; margin: 0 0 4px 0; text-transform: uppercase;">Number of Rooms:</p>
            <p style="font-size: 16px; color: #F4F4F5; margin: 0 0 16px 0; font-weight: 500;">${rooms || 'Not provided'}</p>

            <p style="font-size: 12px; color: #A1A1AA; margin: 0 0 4px 0; text-transform: uppercase;">Service Required:</p>
            <p style="font-size: 16px; color: #F4F4F5; margin: 0 0 0 0; font-weight: 500;">${service}</p>
          </div>

          ${message ? `
          <hr style="border: none; border-top: 1px solid #27272A; margin: 20px 0;" />
          <div style="padding: 0 20px;">
            <h3 style="font-size: 18px; font-weight: bold; color: #F4F4F5; margin: 20px 0;">Message:</h3>
            <p style="font-size: 16px; line-height: 26px; white-space: pre-wrap; color: #A1A1AA;">${message}</p>
          </div>
          ` : ''}

          <hr style="border: none; border-top: 1px solid #27272A; margin: 20px 0;" />
          <p style="color: #52525B; font-size: 12px; text-align: center;">
            ProfitPro | Turn Potential Into Profit
          </p>
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
