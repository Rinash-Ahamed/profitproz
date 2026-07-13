import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

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
  return `
    <div style="margin:0;padding:32px 16px;background:#09090B;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#111113;border:1px solid #27272A;border-radius:16px;padding:28px;">
        <p style="margin:0 0 12px;color:#66B159;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Expense submitted</p>
        <h1 style="margin:0 0 18px;color:#FAFAFA;font-size:24px;">New staff expense claim</h1>
        <p style="margin:0 0 20px;color:#A1A1AA;line-height:24px;">${input.staffEmail} submitted a new expense for approval.</p>
        <div style="border-top:1px solid #27272A;padding-top:16px;color:#FAFAFA;line-height:28px;">
          <div><strong>Title:</strong> ${input.title}</div>
          <div><strong>Amount:</strong> ${input.amount}</div>
          <div><strong>Notes:</strong> ${input.notes || 'N/A'}</div>
        </div>
      </div>
    </div>
  `
}
