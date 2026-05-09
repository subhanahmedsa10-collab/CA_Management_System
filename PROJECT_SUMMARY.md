# CA Management System — Project Status Summary

> **Use this file to brief Claude in a new chat.** Paste the contents at the start so it has full context.

---

## What is this project

A professional desktop application for a Chartered Accountant firm to manage:
- Clients (up to 1000+)
- Tasks (with status: Pending → In Progress → Completed → Billed)
- Invoices (auto-generate from completed tasks, with GST)
- Payments (full + partial tracking)
- Reports & Dashboards
- Multi-user (Admin / Staff roles)

**Tech stack**: Electron + React 18 + Material-UI + Redux Toolkit + Express.js + SQLite3 + bcryptjs + JWT

**Project location**: `C:\Users\subha\CA_Management_System`

**Default login**: admin / admin123  (Staff: staff / staff123)

**Run command**: `npm run dev` (or double-click `Start-CA-System.bat`)

---

## Files structure (key files only)

```
CA_Management_System/
├── public/
│   ├── electron.js          (Electron main, spawns backend in production)
│   ├── server.js            (Express backend, all API endpoints)
│   ├── database/
│   │   ├── schema.sql       (DB schema + indexes)
│   │   └── ca_system.db     (SQLite file - created by init-db)
│   └── scripts/
│       ├── initDatabase.js  (npm run init-db)
│       └── cleanupBrokenInvoices.js
├── src/
│   ├── App.js               (Routes)
│   ├── pages/
│   │   ├── LoginPage.js
│   │   ├── DashboardPage.js
│   │   ├── ClientsPage.js
│   │   ├── TasksPage.js
│   │   ├── InvoicesPage.js
│   │   ├── ReportsPage.js
│   │   ├── SettingsPage.js
│   │   └── FirmProfilePage.js
│   ├── components/Layout.js (Sidebar + AppBar)
│   ├── store/               (Redux: authSlice + store)
│   └── utils/download.js    (Auth-protected file download helper)
├── package.json
└── Start-CA-System.bat      (Double-click shortcut)
```

---

## What's been implemented and tested

### ✅ Working features

| Module | Status | Notes |
|---|---|---|
| Login / JWT auth | ✅ | Admin + Staff roles |
| Client CRUD + Search | ✅ | Pagination, soft delete |
| Excel Export (Clients) | ✅ | `/api/clients/export/excel` |
| Excel Import (Clients) | ✅ | Bulk import from .xlsx, with template download |
| Tasks CRUD | ✅ | Status, priority, assigned_to, fee |
| Tasks status quick actions | ✅ | Green ✅ "Mark Complete" + Blue ▶ "Start" buttons in row |
| Invoice generation | ✅ | Auto from completed tasks, custom invoice number editable |
| Invoice number editing (post-creation) | ✅ | Edit dialog (number, date, due date) |
| Invoice number suggestion | ✅ | `/api/invoices/next-number` uses firm prefix |
| Invoice PDF download | ✅ | PDFKit, includes firm header, client details, tasks, GST, totals, bank details, signature, footer |
| Excel Export — 3 reports | ✅ | Client billing, Receivables, Monthly Revenue |
| Excel Export — Staff Performance | ✅ | NEW: `/api/reports/staff-performance/excel` |
| Reports tab — Client billing | ✅ |  |
| Reports tab — Outstanding | ✅ |  |
| Reports tab — Monthly revenue | ✅ |  |
| Reports tab — Staff Performance | 🟡 PARTIAL | Backend done; **UI tab in ReportsPage not yet rendered** (only state + handler added) |
| Payment recording (full + partial) | ✅ | Quick "Mark Fully Paid" + custom partial dialog with history |
| Payment history view | ✅ | Eye icon on each invoice |
| WhatsApp Reminder | ✅ | Click-to-send via wa.me link, free, no API |
| Outstanding summary cards | ✅ | 4 cards on Invoices page top |
| Firm Profile | ✅ | Full page: name, address, GSTIN/PAN, bank, footer, prefix, default GST% |
| Dashboard metrics | ✅ | Pending tasks, clients, outstanding, monthly revenue, overdue invoices |
| Audit logs | ✅ | All actions logged in `audit_logs` table |
| Dark mode toggle | ✅ | In top-right of AppBar |

### ❌ Not yet implemented

| Feature | Priority | Notes |
|---|---|---|
| Document Checklist per client | HIGH (next) | Pre-defined CA docs (PAN, Aadhar, GST cert, ITR, Form 26AS, etc.) per client with checkboxes + upload |
| Logo upload in Firm Profile + use in invoice PDF | HIGH (next) | Multer upload, store path in firm_profile, render in PDF top-left |
| Staff Performance UI tab | HIGH (next) | Backend ready, just needs `<Tab>` + table render in ReportsPage.js (tab index 3) |
| Email reminders (SMTP) | MEDIUM | Needs `nodemailer` install + SMTP config in firm profile + send button |
| GST return due-date calendar | MEDIUM | GSTR-1 (11th), GSTR-3B (20th), etc. monthly auto-tasks |
| Income Tax return tracker | MEDIUM | ITR due dates by client type |
| ROC compliance tracker | MEDIUM | AOC-4, MGT-7, etc. annual reminders |
| Recurring tasks | MEDIUM | Monthly/Quarterly templates auto-create |
| Cloud sync | LOW | Out of scope for offline app; suggest OneDrive folder for DB file |
| Client portal | LOW | Needs separate web hosting; out of scope |

---

## Important bugs that were fixed (don't re-introduce)

1. **`util.promisify(db.run)` LOSES `this.lastID`** — replaced with custom promise wrappers in `server.js`. Use `db.run/get/all` from the wrapper object, not raw sqlite3 callbacks. This was causing `task_invoice_mapping.invoice_id` to be NULL → broken invoice PDFs.

2. **SQLite returns DECIMAL as STRING** — always wrap with `Number(...)` before math:
   - `Number(task.proposed_fee || 0).toFixed(2)`
   - `subtotal + Number(t.proposed_fee || 0)`
   - In comparisons too: `Number(totalPaid) >= Number(invoice.total_amount) - 0.01`

3. **MUI icons import** — must use rename pattern: `import { Assignment as AssignmentIcon } from '@mui/icons-material';` (NOT `AssignmentIcon` directly).

4. **Native select label overlap** — add `InputLabelProps={{ shrink: true }}` and `sx={{ minWidth: 200 }}` to TextField when using `select + SelectProps={{ native: true }}`.

5. **`electron-dev-utils` doesn't exist on npm** — use `electron-is-dev` instead.

6. **`electron-store@^8.5.0` doesn't exist** — was removed from deps (wasn't used anyway).

7. **`dev` script needed THREE concurrent processes**, not two — backend, React (`npm start`), and `wait-on + electron`. Without React process, port 3000 never opens.

8. **Status field defensive default** — frontend defaults `task.status || 'Pending'`; backend PUT validates against allowed values.

9. **Stale error state** — `setError('')` at the start of every dialog open / submit handler so old errors don't persist.

---

## Database schema (key tables)

- `users` — id, username, password (bcrypt), email, full_name, role (admin/staff), is_active
- `clients` — id, client_name, firm_name, gstin, pan (unique), contact_number, email, address, city, state, postal_code, service_type, notes, is_active
- `tasks` — id, client_id, description, assigned_to, status (CHECK), priority (CHECK), assigned_date, due_date, completion_date, proposed_fee, notes
- `invoices` — id, invoice_number (unique), client_id, invoice_date, due_date, subtotal, gst_percentage, gst_amount, total_amount, payment_status (CHECK), notes, created_by
- `payments` — id, invoice_id, payment_date, amount, payment_method (CHECK), reference_number, notes, recorded_by
- `task_invoice_mapping` — task_id ↔ invoice_id link table
- `audit_logs` — user_id, action, entity_type, entity_id, old/new value, created_at
- `documents` — file uploads linked to client/task/invoice
- `firm_profile` — single-row (id=1): firm_name, proprietor_name, membership_no, address, GSTIN, PAN, bank details, invoice_prefix, invoice_footer, default_gst_percentage. Auto-created on server start if not exists.

---

## How to share the software

**The user asked about sharing the software at end of last chat — this is still pending an answer.**

Three options:

### Option A: Portable .exe (single user, easiest)
```powershell
npm run dist
```
Creates two files in `dist/`:
- `CA Management System Setup 1.0.0.exe` — installer (creates Start Menu + Desktop icon)
- `CA Management System-1.0.0.exe` — portable, no install needed

Share via Google Drive / USB / WhatsApp. Other CA installs it, gets their own local DB. **No internet needed** to use.

### Option B: Network mode (multi-user same firm)
Backend on one PC (acts as server), other staff PCs connect via browser.
- Run only `npm run server` on the host PC
- Edit `src/pages/*.js` to change `API_URL` from `localhost:3001` to `<HOST_PC_IP>:3001`
- Build with `npm run build` and host the `build/` folder
- Other PCs open browser → `http://<HOST_PC_IP>:3000`

### Option C: Cloud (true multi-firm SaaS)
Out of scope for v1. Would require:
- Migrate SQLite → PostgreSQL
- Host backend on AWS/DO/Render (~₹500-2000/month)
- Add multi-tenancy (each firm sees only their data)
- Add billing/subscription
- Build separate web frontend

---

## Quick command reference

```powershell
cd C:\Users\subha\CA_Management_System

npm install            # First time only (or after package.json changes)
npm run init-db        # First time only (creates DB + sample data)
npm run dev            # Start everything (backend + frontend + Electron)
npm run dist           # Build distributable .exe
node public\scripts\cleanupBrokenInvoices.js   # Repair broken invoice mappings
```

To stop: **Ctrl+C** in terminal, then **Y**.

---

## Where to resume in next chat

**Tell Claude:**

> "Read PROJECT_SUMMARY.md in C:\Users\subha\CA_Management_System. I want to continue from where we left. Next priorities:
> 1. Finish Staff Performance UI tab in ReportsPage.js (backend done, just need the Tab + table)
> 2. Add Logo upload in Firm Profile + use it in invoice PDF
> 3. Add Document Checklist per client (pre-defined CA docs with checkboxes + upload)
> 4. Then explain how I can share the software with my colleagues."

That's it — Claude will read this file and have full context without you re-explaining anything.

---

**Last updated**: 2026-05-09 chat session
**Build status**: Running locally, all listed ✅ features tested by user
