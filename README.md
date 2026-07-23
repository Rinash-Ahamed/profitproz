# ProfitPro

ProfitPro is a Next.js portal and public website for hotel revenue management, OTA onboarding, employee operations, contracts, invoices, expenses, daily task tracking, leave, and payroll reporting.

## Technology

- Next.js 16 with the App Router and TypeScript
- React 19 and Tailwind CSS
- Firebase Admin SDK / Firestore
- Nodemailer SMTP delivery
- DOCX contract templates with Docxtemplater
- Browser PDF generation with html2canvas, jsPDF, and html2pdf.js

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Configure Firebase, authentication, SMTP, and invoice payment values.
4. Run `npm run dev` and open `http://localhost:3000`.

Available checks:

```bash
npm run type-check
npm run lint
npm run build
```

## Authentication

Production authentication requires Firestore and `AUTH_SECRET`. Admin and staff accounts are stored in the `admins` and `staff` collections. The development-only fallback credentials use `ADMIN_EMAIL` / `ADMIN_PASSWORD` and optionally `STAFF_LOGIN_EMAIL` / `STAFF_LOGIN_PASSWORD` when Firestore is not configured.

`AUTH_SECRET` must contain at least 32 bytes in production. The idle session timeout and password rules are managed in the Admin security settings. Active portal sessions renew securely; users are logged out after the configured period without activity.

The repository does not automatically create the first production admin. Provision the initial `admins` document through an approved deployment/bootstrap process with a PBKDF2 password hash compatible with `src/lib/auth.ts`; never store a plaintext production password in Firestore.

## Templates

Templates live under `public/template`:

- Exactly one DOCX file is treated as the revenue-management contract template.
- `ProfitPro_Offer_Letter_Template.html` is used for employee offer letters.
- `ProfitPro_OTA_Onboarding_Invoice_Template.html` is used for OTA invoices.
- `ProfitPro_Revenue_Management_Invoice_Template.html` is used for revenue-management invoices.

Keep existing `{{placeholder}}` names when changing template styling. Payment values and the UPI QR image are supplied from deployment configuration and public assets.

## API behaviour

- Protected APIs require the signed, HTTP-only session cookie.
- Mutating API requests are same-origin protected and limited to 32 KB by the proxy.
- Collection endpoints support optional cursor pagination with `?limit=50&cursor=<document-id>`. Limits are capped at 100.
- The dashboard uses Firestore aggregate queries rather than downloading full collections.
- API responses use JSON with a `message` field on errors. Portal requests redirect to login when the session is rejected.

## Finance workflow

- Generating an OTA or Revenue Management invoice creates an immutable financial snapshot with its invoice number, service, client, dates, and amount.
- Admins record the full received payment against its invoice; partial payments are not enabled.
- Approved staff expenses affect cash only after an Admin marks the reimbursement as paid. Admin expenses are treated as paid when recorded.
- The Finance screen shows received income by service, unpaid approved expenses, paid expenses, and `received income - paid expenses`.
- `finance_invoices` stores invoice snapshots and `finance_payments` stores the payment ledger. Payment records should not be edited or deleted manually.

## Tasks and work-time workflow

- Staff start one work session when beginning work for the day.
- After work starts, the timer and End Work action are shown.
- Ending work requires a summary of completed tasks, calls, interested leads, conversions, follow-ups, or onboarding progress.
- Admins can view employee start time, end time, duration, status, and work summary. There is no approval or rejection step.
- Leave requests remain a separate workflow and are not shown in Tasks.
- New records are stored in `work_sessions`; legacy `timesheets` records are retained in Firestore but are not displayed.

## Firestore and deployment

Firestore browser access is denied by `firestore.rules`; the application uses the server-side Admin SDK. Deploy both rules and required aggregate-query indexes after a Firebase project is selected:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Vercel is configured for the Mumbai region (`bom1`). Add every value from `.env.example` to the Vercel project environment before deploying. Do not commit `.env.local`, service-account keys, passwords, banking data, or SMTP credentials.

SMTP messages use connection, greeting, and socket timeouts, are serialized per server instance, retried once, and awaited before the API request completes. For high-volume delivery, replace this local delivery queue with a durable external job queue.

## Operational notes

- Generated PDFs use adaptive 3x rendering on lower-memory/mobile devices and 4x on capable desktops.
- Employee and salary creation/update are committed atomically.
- Revenue invoices are available only for Active revenue-management clients.
- OTA invoices are available after every selected platform is Live.
- Monitor Firestore read counts and move high-volume list screens to cursor pagination in the UI as record volumes grow.
