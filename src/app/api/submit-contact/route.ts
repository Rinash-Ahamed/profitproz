import { NextRequest, NextResponse } from 'next/server'
import { getContactEnquiryHtml } from './contact-enquiry'
import { sendMail } from '@/lib/mail'

export const runtime = 'nodejs'

function optionalString(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length <= maxLength ? normalized : null
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> | null = null

  try {
    body = await request.json()
    const input = body as Record<string, unknown>
    const name = optionalString(input.name, 100)
    const email = optionalString(input.email, 254)
    const phone = optionalString(input.phone, 20)
    const hotel = optionalString(input.hotel, 150)
    const rooms = optionalString(input.rooms, 10)
    const service = optionalString(input.service, 100)
    const message = optionalString(input.message, 2000)

    if (
      !name || !phone || !hotel || !service ||
      rooms === null || message === null || email === null ||
      !/^\+?[0-9 ()-]{7,20}$/.test(phone) ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      return NextResponse.json(
        { success: false, message: 'Required fields are missing.' },
        { status: 400 }
      )
    }

    await sendMail({
      fromName: name,
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
      },
      { status: 500 }
    )
  }
}
