# CA Firm Management System

A professional desktop application for managing clients, tasks, billing, and payments for Chartered Accountant firms. Built with Electron, React, Node.js, and SQLite.

## Features

### Core Features
- ✅ Client Management (up to 1000+ clients)
- ✅ Task Management with Status Tracking
- ✅ Billing & Invoice Generation
- ✅ Payment Tracking & Reminders
- ✅ Dashboard with Key Metrics
- ✅ Comprehensive Reporting
- ✅ Multi-user Authentication
- ✅ Role-based Access Control (Admin/Staff)
- ✅ Data Backup & Restore
- ✅ Export to Excel/PDF

### Advanced Features
- ✅ Document Upload/Storage
- ✅ Automated Email Reminders
- ✅ Audit Trail & Logs
- ✅ Advanced Search & Filters
- ✅ Dark Mode UI
- ✅ Offline-First Functionality
- ✅ Professional UI with Material Design

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Electron, React 18, Material-UI |
| **Backend** | Node.js, Express |
| **Database** | SQLite 3 |
| **State Management** | Redux Toolkit |
| **Styling** | Material-UI + Custom CSS |
| **Reporting** | ExcelJS, PDFKit |
| **Authentication** | bcryptjs, JWT |

## System Requirements

- **OS**: Windows 10/11 (or macOS/Linux)
- **RAM**: Minimum 4GB
- **Storage**: 500MB free space
- **Node.js**: 16.0.0 or higher (for development)

## Installation & Setup

### Prerequisites
1. Node.js 16+ installed
2. npm or yarn package manager
3. Git (optional)

### Quick Start

1. **Navigate to project directory**
   ```bash
   cd CA_Management_System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize database**
   ```bash
   npm run init-db
   ```

4. **Start application (Development)**
   ```bash
   npm run dev
   ```

5. **Build application (Production)**
   ```bash
   npm run build
   ```

## Default Login Credentials

- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the default password after first login!

## Project Structure

```
CA_Management_System/
├── public/                 # Static assets
├── src/
│   ├── main/              # Electron main process
│   ├── server/            # Express backend
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── store/            # Redux store
│   ├── utils/            # Utility functions
│   ├── styles/           # Global styles
│   └── App.js           # Main React app
├── db/
│   ├── schema.sql       # Database schema
│   └── seeders.js       # Default data
├── package.json
├── electron-builder.json
└── README.md
```

## Key Modules

### 1. Client Management
- Add/Edit/Delete clients
- Store detailed information (PAN, GSTIN, contact details)
- Search and filter clients
- Client profile with history

### 2. Task Management
- Create tasks for clients
- Track task status (Pending, In Progress, Completed, Billed)
- Assign to staff members
- Priority levels and due dates
- Task fee management

### 3. Billing System
- Auto-generate invoices from tasks
- GST calculation
- Multiple payment terms
- Recurring invoices support

### 4. Payment Tracking
- Record payments
- Track payment status
- Generate payment reminders
- Overdue tracking

### 5. Dashboard
- Key metrics overview
- Pending tasks
- Outstanding payments
- Revenue charts
- Recent activities

### 6. Reports
- Client-wise billing
- Staff performance
- Outstanding receivables
- Monthly/Yearly revenue
- Export to Excel/PDF

## Database Schema

The application uses SQLite with the following main tables:
- `users` - User accounts with roles
- `clients` - Client information
- `tasks` - Tasks assigned to clients
- `invoices` - Invoice records
- `payments` - Payment records
- `audit_logs` - System audit trail
- `documents` - Document storage links

## Usage Guide

### Creating a New Client
1. Go to Clients → Add New Client
2. Fill in client details
3. Set service type
4. Save

### Creating a Task
1. Select a client
2. Click "Add Task"
3. Set task description, dates, and fee
4. Assign to staff member
5. Save

### Generating an Invoice
1. Go to Tasks
2. Select completed task(s)
3. Click "Generate Invoice"
4. Review and confirm
5. Task auto-marks as "Billed"

### Recording Payment
1. Go to Invoices → Unpaid
2. Click on invoice
3. Click "Record Payment"
4. Enter amount and date
5. Save

## Features in Detail

### Multi-user System
- Admin: Full system access
- Staff: Client, task, and limited invoice access
- Secure login with encrypted passwords
- Session management

### Backup & Restore
- One-click database backup
- Scheduled automatic backups
- Full restore capability
- Export database as .db file

### Export Options
- Excel (.xlsx) - Client lists, invoices, reports
- PDF - Professional invoice/report generation
- CSV - Data exports

### Security
- Password encryption (bcryptjs)
- Role-based access control
- Audit logging for all actions
- Session tokens (JWT)
- Data validation

## Troubleshooting

### Application won't start
- Check Node.js installation: `node --version`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check if port 3000 is available

### Database errors
- Run: `npm run init-db` to reinitialize
- Check database file permissions

### UI issues
- Clear application cache: Delete ~/.cache/ca-system
- Restart application

## Support & Updates

- Check for updates in Settings → About
- Report issues or request features
- Keep backups of your data regularly

## License

Professional Use License - All Rights Reserved

## Version

v1.0.0 - Initial Release (May 2026)

---

**Last Updated**: May 2026
