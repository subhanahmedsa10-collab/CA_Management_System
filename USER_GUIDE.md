# CA Management System - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Client Management](#client-management)
3. [Task Management](#task-management)
4. [Billing & Invoices](#billing--invoices)
5. [Payment Tracking](#payment-tracking)
6. [Reports](#reports)
7. [User Management](#user-management)
8. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### Login
1. Open the CA Management System
2. Enter your username and password
3. Click "Login"

**Default Credentials:**
- Admin: admin / admin123
- Staff: staff / staff123

### First Time Setup
1. **Change Password** (Recommended)
   - Settings → Change Password
   - Enter current and new password
   - Login with new password

2. **Add Your First Client**
   - Navigate to Clients
   - Click "Add Client"
   - Fill in required fields
   - Save

3. **Configure Service Types**
   - Common service types: Tax Compliance, Audit, Bookkeeping, Payroll
   - Select appropriate type when adding clients

---

## Client Management

### Adding a New Client

1. **Navigate to Clients Page**
   - Click "Clients" in the menu
   - Click "Add Client" button

2. **Fill in Client Details**
   - **Client Name** (Required): Full name of the business
   - **Firm Name**: Proprietorship/Partnership firm name
   - **PAN** (Required): 10-digit Permanent Account Number
   - **GSTIN**: 15-digit GST Identification Number
   - **Contact Number**: Primary contact phone
   - **Email**: Client email address
   - **Address**: Complete business address
   - **City**: City name
   - **State**: State code
   - **Postal Code**: PIN code
   - **Service Type**: Type of service (Tax, Audit, etc.)
   - **Notes**: Any additional remarks

3. **Save Client**
   - Click "Create" button
   - Client appears in the list

### Editing a Client
1. Find the client in the list
2. Click the "Edit" (pencil) icon
3. Modify the details
4. Click "Update"

### Deleting a Client
1. Find the client in the list
2. Click the "Delete" (trash) icon
3. Confirm deletion
4. Client is soft-deleted (data preserved)

### Searching Clients
- Use the search bar at the top
- Search by: Name, PAN, GSTIN, or Email
- Results update in real-time

---

## Task Management

### Creating a Task

1. **Navigate to Tasks**
   - Click "Tasks" in the menu
   - Click "Add Task" button

2. **Fill in Task Details**
   - **Client**: Select from dropdown (required)
   - **Task Description**: Detailed task description (required)
   - **Assigned To**: Select staff member (optional)
   - **Priority**: Low, Medium, or High
   - **Due Date**: Calendar picker
   - **Proposed Fee**: Amount in rupees
   - **Notes**: Additional comments

3. **Save Task**
   - Status defaults to "Pending"
   - Task appears in the list

### Task Statuses

| Status | Meaning |
|--------|---------|
| Pending | Not yet started |
| In Progress | Currently being worked on |
| Completed | Work finished, ready for invoicing |
| Billed | Invoice generated and sent |

### Updating Task Status

1. Find the task in the list
2. Click "Edit"
3. Change the status dropdown
4. Update other details if needed
5. Click "Update"

### Task Workflow Example

1. Create task: Status = "Pending"
2. Start working: Change to "In Progress"
3. Complete work: Change to "Completed"
4. Generate invoice: Status auto-changes to "Billed"

### Filtering Tasks
- Filter by Status: Pending, In Progress, Completed, Billed
- View all pending tasks on Dashboard

---

## Billing & Invoices

### Understanding Invoice Generation

**Only "Completed" tasks can be invoiced.**

Steps:
1. Complete task work (mark as "Completed")
2. Generate invoice from the task
3. System creates invoice automatically
4. Task status changes to "Billed"

### Generating an Invoice

1. **Navigate to Invoices**
   - Click "Invoices" in menu
   - Click "Generate Invoice" button

2. **Select Invoice Details**
   - **Client**: Select client (required)
   - **Tasks**: Select completed tasks from the list
   - **Invoice Date**: Default is today
   - **Due Date**: Default is 30 days from today
   - **GST %**: Default is 18% (adjust if needed)

3. **Review Summary**
   - System shows subtotal calculation
   - GST amount is calculated automatically
   - Total amount is displayed

4. **Generate**
   - Click "Generate" button
   - Invoice is created and saved
   - Confirmation message appears

### Invoice Details

**Invoice includes:**
- Invoice number (auto-generated): INV-YYYY-MM-XXXXX
- Client details
- Itemized tasks with amounts
- Subtotal (sum of task fees)
- GST calculation
- Total amount
- Payment terms (customizable)

### Invoice Statuses

| Status | Meaning |
|--------|---------|
| Unpaid | No payment received |
| Partially Paid | Some payment received |
| Paid | Full payment received |
| Overdue | Not paid by due date |

---

## Payment Tracking

### Recording a Payment

1. **Open Invoice**
   - Go to Invoices page
   - Click on the invoice you want to record payment for

2. **Record Payment**
   - Click "Record Payment" button (in invoice details)
   - Fill in payment details:
     - **Payment Date**: Date of payment received
     - **Amount**: Amount received
     - **Payment Method**: Cash, Cheque, Bank Transfer, Online
     - **Reference Number**: Cheque number, transaction ID, etc.
     - **Notes**: Additional details

3. **Save Payment**
   - Click "Save"
   - Invoice status updates automatically:
     - If full amount paid → "Paid"
     - If partial amount → "Partially Paid"

### Payment Example

**Invoice for ₹10,000**
- Payment 1: ₹6,000 on 10 May → Status: "Partially Paid"
- Payment 2: ₹4,000 on 15 May → Status: "Paid"

### Tracking Outstanding Payments

1. **Dashboard**
   - Shows total outstanding payments
   - Shows overdue invoices list
   - Quick overview of payment status

2. **Reports → Outstanding Receivables**
   - Complete list of unpaid invoices
   - Days overdue
   - Client-wise outstanding amounts

---

## Reports

### Report Types

#### 1. Client-wise Billing
- Shows billing summary for each client
- Columns: Client, Invoices count, Paid, Outstanding, Total
- Good for client profitability analysis

#### 2. Outstanding Receivables
- Lists all pending payments
- Shows invoice numbers and amounts
- Helps identify payment follow-ups
- Sorted by due date (overdue first)

#### 3. Monthly Revenue
- Revenue trends over time
- Shows monthly totals
- Compares billed vs collected amounts
- Helps financial planning

### Exporting Reports

1. Open any report
2. Click "Export to Excel" button
3. Save the file to your computer
4. Open in Microsoft Excel or similar

### Using Reports for Analysis

**Example: Identify slow-paying clients**
1. Go to Client-wise Billing report
2. Sort by "Outstanding" amount
3. Focus collection efforts on top clients

**Example: Track revenue trend**
1. Go to Monthly Revenue report
2. Export to Excel
3. Create charts for presentation

---

## User Management

### Admin Features

Only administrators can:
- Create new user accounts
- View all users
- Manage user roles
- Reset passwords

### Adding a New Staff Member

1. **Navigate to Settings**
   - Click "Settings" in menu
   - Click "User Management" tab

2. **Create User**
   - Click "Add User" button
   - Fill in details:
     - **Username**: Unique username
     - **Full Name**: Staff member name
     - **Email**: Email address
     - **Password**: Initial password
     - **Role**: Admin or Staff

3. **Save User**
   - Click "Create User"
   - New user can now login

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access - manage users, clients, all features |
| **Staff** | Limited access - manage clients, tasks, view invoices |

### Password Management

- Each user can change their own password
- Admin can set password for new users
- Passwords must be at least 6 characters

---

## Tips & Best Practices

### Best Practices for Efficiency

1. **Use Priorities**
   - Mark urgent tasks as "High"
   - Use dashboard to focus on priority work

2. **Regular Updates**
   - Update task status daily
   - Record payments immediately
   - Keep client information current

3. **Task Descriptions**
   - Write clear, detailed descriptions
   - Include what was done and deliverables
   - Makes invoicing and follow-up easier

4. **Invoice Organization**
   - Generate invoices weekly/monthly
   - Review before sending to clients
   - Keep invoices numbered sequentially

5. **Payment Tracking**
   - Record partial payments immediately
   - Track payment dates for follow-ups
   - Use reference numbers for reconciliation

### Time-Saving Tips

1. **Batch Processing**
   - Create multiple tasks at once
   - Generate multiple invoices together
   - Record multiple payments in one session

2. **Search Functions**
   - Use search to quickly find clients
   - Filter tasks by status to stay organized
   - Use date filters for reports

3. **Dashboard**
   - Check dashboard daily for pending items
   - Monitor overdue invoices
   - Track monthly revenue progress

### Data Maintenance

1. **Regular Backups**
   - Backup database weekly
   - Store backups in secure location
   - Test restore process occasionally

2. **Archiving**
   - Archive old/completed clients when needed
   - Soft deletion preserves data
   - Reports can include archived clients

3. **Audit Trail**
   - System logs all changes
   - Admin can view audit logs in Settings
   - Useful for troubleshooting and compliance

### Security Tips

1. **Password Management**
   - Use strong, unique passwords
   - Change passwords regularly
   - Don't share login credentials

2. **Access Control**
   - Create separate accounts for each staff
   - Use appropriate roles (don't make all users admin)
   - Review user access periodically

3. **Data Protection**
   - Keep database backups secure
   - Don't share sensitive reports via email
   - Use secure password for backups

---

## Common Workflows

### Daily Workflow
1. Open dashboard
2. Review pending tasks
3. Update task status
4. Check overdue invoices
5. Record any payments received

### Weekly Workflow
1. Generate invoices for completed tasks
2. Review all outstanding invoices
3. Send payment reminders
4. Update client information if needed
5. Create tasks for next week

### Monthly Workflow
1. Generate monthly revenue report
2. Reconcile all invoices and payments
3. Analyze client profitability
4. Backup database
5. Review and update staff workload

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Q | Quit application |
| Ctrl+Shift+I | Open developer tools |
| F5 | Refresh page |
| Ctrl+A | Select all |
| Ctrl+C | Copy |
| Ctrl+V | Paste |

---

## Support

For help or questions:
1. Check application Settings → About
2. Review this user guide
3. Refer to README.md for features
4. Check ARCHITECTURE.md for technical details

---

**Version**: 1.0.0  
**Last Updated**: May 2026

---

**Happy managing! 📊**
