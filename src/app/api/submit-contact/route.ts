import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'
import { getContactEnquiryHtml } from './contact-enquiry'

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
      from: `"${name}" <${process.env.SMTP_FROM || 'admin@profitproz.com'}>`,
      to: 'support@profitproz.com',
      replyTo: email,
      subject: `New enquiry from ${name}`,
      text: `New enquiry from ${name} (${hotel}). Phone: ${phone}. Email: ${email || 'N/A'}. Service: ${service}. Message: ${message || 'N/A'}`,
      html: getContactEnquiryHtml({ name, email, phone, hotel, rooms, service, message }),
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
