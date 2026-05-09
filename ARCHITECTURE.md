# CA Management System - Architecture Design

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ELECTRON MAIN PROCESS                    │
│            (Window Management, App Lifecycle)                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                             │
│  (UI Components, State Management, User Interactions)        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  EXPRESS.JS BACKEND API                       │
│     (Business Logic, Validation, Authentication)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SQLITE DATABASE                            │
│            (Data Persistence, Offline Support)               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### User Interaction Flow
```
User Action → React Component → Redux Action → Backend API → Database → Response → UI Update
```

### Authentication Flow
```
Login Form → Validation → Hash Comparison → JWT Token Generation → Session Storage → Protected Routes
```

### Invoice Generation Flow
```
Select Completed Tasks → Create Invoice Record → Update Task Status → Send Confirmation → Save to DB
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL (admin/staff),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Clients Table
```sql
CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  firm_name TEXT,
  gstin TEXT,
  pan TEXT UNIQUE,
  contact_number TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  service_type TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  assigned_to INTEGER,
  status TEXT DEFAULT 'Pending' (Pending/In Progress/Completed/Billed),
  priority TEXT DEFAULT 'Medium' (Low/Medium/High),
  assigned_date DATE,
  due_date DATE,
  completion_date DATE,
  proposed_fee DECIMAL(12, 2),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);
```

### Invoices Table
```sql
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  client_id INTEGER NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(12, 2),
  gst_amount DECIMAL(12, 2),
  total_amount DECIMAL(12, 2),
  payment_status TEXT DEFAULT 'Unpaid' (Paid/Partially Paid/Unpaid/Overdue),
  notes TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2),
  payment_method TEXT (Cash/Cheque/Bank Transfer/Online),
  reference_number TEXT,
  notes TEXT,
  recorded_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);
```

### Task-Invoice Mapping Table
```sql
CREATE TABLE task_invoice_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  UNIQUE(task_id, invoice_id)
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Documents Table
```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  task_id INTEGER,
  invoice_id INTEGER,
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify` - Verify token

### Client Management
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client details
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `GET /api/clients/search` - Search clients

### Task Management
- `GET /api/tasks` - List tasks (with filters)
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/status` - Update task status

### Invoice Management
- `GET /api/invoices` - List invoices
- `GET /api/invoices/:id` - Get invoice
- `POST /api/invoices/generate` - Generate invoice from tasks
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/export/pdf` - Export as PDF
- `GET /api/invoices/export/excel` - Export as Excel

### Payment Management
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `GET /api/payments/:invoiceId` - Get payments for invoice
- `DELETE /api/payments/:id` - Delete payment record

### Dashboard
- `GET /api/dashboard/metrics` - Key metrics
- `GET /api/dashboard/pending-tasks` - Pending tasks
- `GET /api/dashboard/overdue-invoices` - Overdue invoices
- `GET /api/dashboard/revenue-chart` - Revenue data

### Reports
- `GET /api/reports/client-wise-billing` - Client billing report
- `GET /api/reports/staff-performance` - Staff performance
- `GET /api/reports/outstanding-receivables` - Receivables report
- `GET /api/reports/monthly-revenue` - Revenue report

### System
- `POST /api/backup` - Create database backup
- `POST /api/restore` - Restore from backup
- `GET /api/audit-logs` - Get audit trail
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user (admin only)

## Security Architecture

### Authentication
- JWT-based token authentication
- HTTP-only cookies for token storage
- Token expiration (24 hours default)
- Refresh token mechanism

### Authorization
- Role-based access control (RBAC)
- Admin: Full access to all features
- Staff: Limited access (clients, tasks, view invoices)
- Endpoint-level authorization checks

### Data Security
- Password hashing with bcryptjs (salt rounds: 10)
- Input validation and sanitization
- SQL injection prevention via parameterized queries
- CORS configuration
- Rate limiting on API endpoints

### Audit Trail
- All user actions logged
- Timestamp and user tracking
- Change history (old/new values)
- Query logs for sensitive operations

## Performance Optimization

### Database
- Indexed columns for frequent queries
- Connection pooling
- Query optimization
- Pagination for large result sets

### Frontend
- Code splitting and lazy loading
- Component memoization
- Virtual scrolling for large lists
- Caching of API responses

### Backend
- Response compression
- Efficient database queries
- Caching mechanisms
- Background job processing

## Deployment Architecture

### Development
- Local development with hot reload
- SQLite database file stored locally
- Console logging for debugging

### Production
- Packaged Electron app (.exe for Windows)
- Embedded Node.js server
- SQLite database in app data directory
- Auto-update capability

## Backup & Recovery

### Backup Strategy
- On-demand backup to `.backup` files
- Automatic daily backups
- Backup compression
- Versioned backups

### Recovery
- Full database restore capability
- Data integrity checks
- Point-in-time recovery option
- Backup validation

## Scalability Considerations

### For 1000+ Clients
- Database indexing on frequently queried fields
- Pagination for all list views (50-100 items per page)
- Lazy loading for detail pages
- Asynchronous processing for reports
- Archive mechanism for old data

### Future Migration Path
- Easy migration from SQLite to MySQL/PostgreSQL
- API abstraction layer for database independence
- Horizontal scaling with API layer
- Distributed reporting system

## Development Workflow

### Version Control
- Main branch for releases
- Dev branch for development
- Feature branches for new features
- Tag releases with version numbers

### Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical workflows
- Manual testing checklist

### Deployment Process
1. Code review and approval
2. Automated testing
3. Build application
4. Create signed installer
5. Version increment
6. Release notes
7. Auto-update notification to users

---

This architecture ensures scalability, security, and maintainability while keeping the application lightweight and responsive for desktop use.
