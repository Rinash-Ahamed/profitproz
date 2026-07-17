import nodemailer from 'nodemailer'
import 'server-only'

const smtpPort = Number(process.env.SMTP_PORT || 587)

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  requireTLS: smtpPort !== 465,
  connectionTimeout: 5_000,
  greetingTimeout: 5_000,
  socketTimeout: 10_000,
  tls: { rejectUnauthorized: true },
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

let deliveryQueue: Promise<unknown> = Promise.resolve()

export async function sendMail(input: { fromName: string; to: string; replyTo?: string; subject: string; text: string; html: string }) {
  return transporter.sendMail({
    from: `"${input.fromName}" <${process.env.SMTP_FROM || 'admin@profitproz.com'}>`,
    to: input.to,
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
  })
}

export function getExpenseNotificationHtml(input: { staffEmail: string; title: string; amount: number; notes: string }) {
  const staffEmail = escapeHtml(input.staffEmail)
  const title = escapeHtml(input.title)
  const amount = escapeHtml(input.amount)
  const notes = escapeHtml(input.notes || 'N/A')

  return `
    <div style="margin:0;padding:32px 16px;background:#09090B;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#111113;border:1px solid #27272A;border-radius:16px;padding:28px;">
        <p style="margin:0 0 12px;color:#66B159;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Expense submitted</p>
        <h1 style="margin:0 0 18px;color:#FAFAFA;font-size:24px;">New staff expense claim</h1>
        <p style="margin:0 0 20px;color:#A1A1AA;line-height:24px;">${staffEmail} submitted a new expense for approval.</p>
        <div style="border-top:1px solid #27272A;padding-top:16px;color:#FAFAFA;line-height:28px;">
          <div><strong>Title:</strong> ${title}</div>
          <div><strong>Amount:</strong> ${amount}</div>
          <div><strong>Notes:</strong> ${notes}</div>
        </div>
      </div>
    </div>
  `
}

export function queueMail(input: Parameters<typeof sendMail>[0]) {
  const deliver = async () => {
    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await sendMail(input)
      } catch (error) {
        lastError = error
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 350))
      }
    }
    throw lastError
  }
  const queued = deliveryQueue.then(deliver, deliver)
  deliveryQueue = queued.catch(() => undefined)
  return queued
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
