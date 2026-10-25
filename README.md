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

`CLIENT_CREDENTIALS_ENCRYPTION_KEY` must be a separate secret containing at least 32 characters. It encrypts each client’s OTA platform usernames and passwords with AES-256-GCM before Firestore storage. Add the same value to local and Vercel environments and back it up securely; changing or losing it makes existing credentials unreadable.

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
- Approved staff and Admin expenses affect cash only after an Admin marks them Paid.
- The Finance screen shows received total income by service, unpaid approved expenses, paid expenses, and `received income - paid expenses`. Previous closing balance uses the same cash calculation through the previous month-end in India time.
- Payroll is calculation-only: there is no confirmation, approval, or payment-status workflow. Attendance, CL, LOP, salary history, and amount-payable calculations remain in Payroll, with a separate payroll CSV export.
- Finance does not read payroll or salary records. Record the total payroll paid manually as an Admin Expense (Other, with a description such as `Payroll - October 2026`) and mark the expense Paid when payment is made. It is then deducted once through the normal expense workflow. Existing payroll records, including legacy Paid records, do not reduce Finance balances; any historical payroll payments must also be represented by Admin Expenses.
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

- The Admin header bell shows notifications for new employee leave submissions. Alerts and leave requests are committed atomically. The closed bell polls only an unread-count aggregation every 30 seconds while visible and on window focus; notification documents are fetched only when the dropdown is open or explicitly refreshed. Hidden tabs do not poll, and overlapping requests are skipped. Opening the bell marks existing alerts read; Clear past hides alerts through the latest loaded notification for the current Admin only, preserving newer alerts and all leave requests. Older notifications are paginated. `admin_notifications` stores alerts and `admin_notification_state` stores per-Admin read/clear positions, accessed only through Admin-authenticated APIs.
- Run `node scripts/test-admin-notifications.mjs` to verify atomic creation, unread counts, pagination, concurrent clear behavior, and API authorization without accessing Firestore.
- Run `node scripts/test-notification-polling.mjs` to verify count-only polling, hidden-tab pause, lazy list loading, and request-race handling.

- Use `npm run version:patch` for a routine release, or `npm run version:minor` / `npm run version:major` for a requested release type. These commands update the package and lockfile versions together without creating a Git commit or tag. The project agent rule in `AGENTS.md` applies one patch bump per completed code-change task; checks and builds do not increment the version.

- Generated PDFs use adaptive 3x rendering on lower-memory/mobile devices and 4x on capable desktops.
- Employee and salary creation/update are committed atomically.
- Revenue invoices are available only for Active revenue-management clients.
- OTA invoices are available after every selected platform is Live.
- Monitor Firestore read counts and move high-volume list screens to cursor pagination in the UI as record volumes grow.
- Finance loads invoice and payment tables in separate 10-row cursor pages. Summary totals cover all history; explicit income export walks all matching payment pages. Substring search and service/status filtering scan ordered batches when needed, so filtered requests can read more than 11 documents. Payment totals use aggregation with a compatible fallback when an index is unavailable.
- Tab lists use a 30-second memory cache, cleared on mutations, session changes, and window focus. Live task/session/security requests bypass this cache. Finance Refresh forces fresh pages and totals.
- Run `node scripts/test-performance.mjs` for isolated pagination, export coverage, payment-total, and cache-invalidation regression checks (no Firestore access).
