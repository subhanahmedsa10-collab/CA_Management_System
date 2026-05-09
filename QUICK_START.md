# Quick Start Guide - 5 Minutes Setup

## ⚡ Fastest Way to Get Started

### Step 1: Extract and Navigate (30 seconds)
```bash
# Navigate to the CA_Management_System folder
cd C:\Users\YourName\CA_Management_System
```

### Step 2: Install Dependencies (2-3 minutes)
```bash
npm install
```
Just wait... this downloads all required packages.

### Step 3: Setup Database (30 seconds)
```bash
npm run init-db
```
Your database is ready with sample data.

### Step 4: Start Application (1-2 minutes)
```bash
npm run dev
```
The app will open automatically. Wait for the Electron window.

## 🔑 Login with These Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Staff | staff | staff123 |

⚠️ **Change admin password immediately!**

## 📋 What to Do First

1. **Change Admin Password**
   - Settings → Change Password
   - Set a strong password
   - Login again

2. **Add Clients**
   - Clients → Add Client
   - Fill in client details
   - Can add up to 1000 clients

3. **Create Tasks**
   - Tasks → Add Task
   - Select client
   - Set due date and fee
   - Assign to staff

4. **Generate Invoices**
   - Invoices → Generate Invoice
   - Select completed tasks
   - System calculates GST
   - Create invoice

5. **Record Payments**
   - Open invoice
   - Click "Record Payment"
   - Enter amount
   - Payment status updates automatically

6. **View Reports**
   - Reports tab
   - Client-wise billing
   - Outstanding amounts
   - Monthly revenue

## 🆘 Troubleshooting

### Issue: "npm: command not found"
→ Install Node.js: https://nodejs.org/

### Issue: Database error
→ Run: `npm run init-db`

### Issue: Port 3000 already in use
→ Close other Node.js apps and try again

### Issue: Application won't start
→ Run:
```bash
npm install
npm run init-db
npm run dev
```

## 📁 Where is My Data?

Your database file is at:
```
CA_Management_System\public\database\ca_system.db
```

**Backup this file regularly!**

## 💾 Creating a Backup

```bash
npm run backup-db
```

Creates: `ca_system.backup.db`

## 🚀 Next: Production Build

When ready to distribute:

```bash
npm run dist
```

Creates standalone .exe in `dist/` folder.

---

**For complete documentation: see README.md**

**For technical details: see INSTALLATION_GUIDE.md**

---

**That's it! Your CA management system is ready to use.** 🎉
