# CA Management System - Installation Guide

## Prerequisites

Before installing the CA Management System, ensure you have the following installed on your computer:

### Required Software
1. **Node.js 16.0.0 or higher**
   - Download from: https://nodejs.org/
   - Verify installation: Open Command Prompt and run `node --version`
   
2. **npm (Node Package Manager)**
   - Comes bundled with Node.js
   - Verify installation: `npm --version`

3. **Git (Optional but recommended)**
   - Download from: https://git-scm.com/
   - Used for version control

### System Requirements
- **OS**: Windows 10/11 (macOS 10.15+, Ubuntu 18.04+ also supported)
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 500MB free space
- **Display**: 1024x768 resolution minimum

## Installation Steps

### Step 1: Extract Project Files
1. Extract the `CA_Management_System` folder to your desired location
   - Example: `C:\Users\YourName\CA_Management_System`
   - Or: `D:\Projects\CA_Management_System`

### Step 2: Navigate to Project Directory
Open Command Prompt or PowerShell and navigate to the project folder:

```bash
cd C:\Users\YourName\CA_Management_System
```

### Step 3: Install Dependencies
This step downloads all required packages from npm (~500MB):

```bash
npm install
```

**Note**: This may take 3-5 minutes depending on your internet speed. Do not interrupt this process.

Expected output:
```
added XXX packages in X.XXs
```

### Step 4: Initialize Database
Create the SQLite database and seed initial data:

```bash
npm run init-db
```

This command will:
- Create the database file
- Set up all tables
- Insert default admin user (admin/admin123)
- Insert sample staff user (staff/staff123)
- Add sample client data

Expected output:
```
✓ Database initialized successfully!
Default credentials:
  Admin: admin / admin123
  Staff: staff / staff123

⚠️  Please change the default password after first login!
```

### Step 5: Start the Application

#### Development Mode (with Hot Reload)
```bash
npm run dev
```

This will:
1. Start the backend server on http://localhost:3001
2. Start the React development server on http://localhost:3000
3. Open Electron window with the application

Wait 2-3 minutes for all services to start. You'll see console messages confirming:
```
✓ Backend server running on http://localhost:3001
webpack compiled successfully
```

#### Production Mode (Standalone Executable)
To create a standalone executable for distribution:

```bash
npm run dist
```

This creates:
- `CA_Management_System.exe` in the `dist/` folder
- Ready to install and run without Node.js

## First Login

1. When the application opens, you'll see the login screen
2. Use default credentials:
   - **Username**: admin
   - **Password**: admin123

3. **IMPORTANT**: Change the admin password immediately:
   - Go to Settings → Change Password
   - Set a secure password

## Troubleshooting

### Issue: "npm: command not found"
**Solution**: Node.js is not installed correctly
- Reinstall Node.js from https://nodejs.org/
- Restart Command Prompt after installation
- Verify: `node --version`

### Issue: Database Error on Startup
**Solution**: Reinitialize the database
```bash
npm run init-db
```

### Issue: Port 3000 or 3001 Already in Use
**Solution**: Kill the process using the port
```bash
# For Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Or change ports in server.js and electron.js
```

### Issue: Application Won't Start
**Solution**: Clear cache and reinstall
```bash
rmdir /s /q node_modules
rmdir /s /q build
npm install
npm run init-db
npm run dev
```

### Issue: "Module not found" Error
**Solution**: Reinstall dependencies
```bash
npm install
npm install --save-dev electron electron-builder
npm run init-db
```

### Issue: Database File Corrupted
**Solution**: Reset database
1. Delete `public/database/ca_system.db`
2. Run: `npm run init-db`

## Project Structure

```
CA_Management_System/
├── public/
│   ├── server.js              # Express backend server
│   ├── electron.js            # Electron main process
│   ├── index.html             # HTML template
│   ├── database/
│   │   ├── schema.sql         # Database schema
│   │   └── ca_system.db       # SQLite database (created after init-db)
│   ├── scripts/
│   │   └── initDatabase.js    # Database initialization script
│   └── uploads/               # Document upload storage
├── src/
│   ├── App.js                 # Main React component
│   ├── index.js              # React entry point
│   ├── index.css             # Global styles
│   ├── pages/                # Page components
│   │   ├── LoginPage.js
│   │   ├── DashboardPage.js
│   │   ├── ClientsPage.js
│   │   ├── TasksPage.js
│   │   ├── InvoicesPage.js
│   │   ├── ReportsPage.js
│   │   └── SettingsPage.js
│   ├── components/           # Reusable components
│   │   └── Layout.js
│   └── store/               # Redux store
│       ├── authSlice.js
│       └── store.js
├── package.json             # Project dependencies
├── README.md               # Project documentation
├── ARCHITECTURE.md         # System architecture
└── INSTALLATION_GUIDE.md   # This file
```

## Default User Accounts

### Admin Account
- **Username**: admin
- **Password**: admin123
- **Role**: Full system access

### Staff Account
- **Username**: staff
- **Password**: staff123
- **Role**: Limited access (clients, tasks, invoices)

## Features Overview

### Client Management
- Add/Edit/Delete clients
- Store PAN, GSTIN, contact details
- Search and filter capabilities

### Task Management
- Create tasks for clients
- Track status (Pending, In Progress, Completed, Billed)
- Assign to staff members
- Set priorities and due dates

### Billing & Invoices
- Generate invoices from completed tasks
- GST calculation (configurable)
- Track payment status
- Support for partial payments

### Reports
- Client-wise billing report
- Outstanding receivables report
- Monthly revenue report
- Export to Excel/PDF

### Dashboard
- Key metrics overview
- Pending tasks list
- Overdue invoices alert
- Monthly revenue chart

## Data Backup

### Manual Backup
To backup your database:

```bash
npm run backup-db
```

This creates a backup file: `ca_system.backup.db`

### Automated Backup
Backups are automatically created in the Settings page.

### Restore from Backup
To restore from a backup:
1. Stop the application
2. Replace `public/database/ca_system.db` with your backup file
3. Restart the application

## Security Recommendations

1. **Change Default Passwords**: Always change admin and staff passwords immediately
2. **Regular Backups**: Backup database daily
3. **Access Control**: Create separate staff accounts for each user
4. **Update Application**: Check for updates regularly
5. **Data Encryption**: Store backups in a secure location
6. **Network Security**: Only run on secure networks

## API Documentation

The application uses a REST API backend. Key endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/clients` - Fetch clients
- `POST /api/clients` - Create client
- `GET /api/tasks` - Fetch tasks
- `POST /api/invoices/generate` - Generate invoice
- `POST /api/payments` - Record payment
- `GET /api/reports/*` - Fetch reports

All endpoints require JWT token authentication.

## Network Mode (Advanced)

To run on a network:

1. Start backend server: `npm run server`
2. Access from other computers: `http://YOUR_IP:3001`
3. Configure frontend to connect to backend IP

## Performance Optimization

For large datasets (1000+ clients):
- Use pagination (built-in)
- Add database indexes (included)
- Archive old records
- Clear old documents periodically

## Support & Updates

- Check README.md for features
- Review ARCHITECTURE.md for technical details
- Update Node.js packages: `npm update`
- Check for application updates in Settings → About

## Uninstallation

To uninstall the application:

1. Delete the `CA_Management_System` folder
2. (Optional) Delete database backup files
3. No other system changes or registry modifications

## Version History

### v1.0.0 (May 2026) - Initial Release
- Client management system
- Task tracking
- Billing and invoices
- Payment tracking
- Dashboard and reports
- Multi-user authentication
- Offline-first functionality

## License

This software is licensed for professional use. All rights reserved.

## Next Steps

1. ✅ Complete installation (you are here)
2. 📝 Change default admin password
3. 📊 Add your clients and configure service types
4. 👥 Create staff user accounts
5. 📋 Create tasks for clients
6. 💰 Generate invoices and record payments

---

**For detailed feature documentation, see README.md**

**For technical architecture, see ARCHITECTURE.md**

---

*Last Updated: May 2026*
