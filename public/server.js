const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const { promisify } = require('util');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer setup for file uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Database initialization
const dbPath = path.join(__dirname, './database/ca_system.db');
const rawDb = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✓ Connected to SQLite database');
  }
});

// Ensure firm_profile table exists on existing databases (idempotent)
rawDb.serialize(() => {
  rawDb.run(`
    CREATE TABLE IF NOT EXISTS firm_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      firm_name TEXT,
      proprietor_name TEXT,
      membership_no TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      gstin TEXT,
      pan TEXT,
      bank_name TEXT,
      bank_account TEXT,
      bank_ifsc TEXT,
      bank_branch TEXT,
      invoice_prefix TEXT DEFAULT 'INV',
      invoice_footer TEXT,
      default_gst_percentage DECIMAL(5,2) DEFAULT 18,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  rawDb.run(`INSERT OR IGNORE INTO firm_profile (id, firm_name) VALUES (1, 'Your CA Firm Name')`);
});

// Custom promise wrappers — db.run must capture `this.lastID` and `this.changes`,
// which util.promisify cannot do. Use these instead of util.promisify.
const db = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
};

// Helper functions
async function logAudit(userId, action, entityType, entityId, oldValue = null, newValue = null) {
  try {
    await db.run(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId, oldValue, newValue]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// Authentication middleware
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Admin check middleware
function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ==================== AUTHENTICATION ENDPOINTS ====================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        email: user.email
      }
    });

    await logAudit(user.id, 'LOGIN', 'User', user.id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify token
app.post('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ valid: true });
});

// Logout
app.post('/api/auth/logout', verifyToken, async (req, res) => {
  await logAudit(req.userId, 'LOGOUT', 'User', req.userId);
  res.json({ success: true });
});

// ==================== CLIENT ENDPOINTS ====================

// Get all clients
app.get('/api/clients', verifyToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    let query = 'SELECT * FROM clients WHERE is_active = 1';
    const params = [];

    if (search) {
      query += ' AND (client_name LIKE ? OR pan LIKE ? OR gstin LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const clients = await db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM clients WHERE is_active = 1';
    if (search) {
      countQuery += ' AND (client_name LIKE ? OR pan LIKE ? OR gstin LIKE ? OR email LIKE ?)';
    }
    const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : [];
    const { total } = await db.get(countQuery, countParams);

    res.json({
      clients,
      pagination: { page: parseInt(page), limit, total }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single client
app.get('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    const client = await db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get associated tasks and invoices
    const tasks = await db.all('SELECT * FROM tasks WHERE client_id = ? ORDER BY created_at DESC', [req.params.id]);
    const invoices = await db.all('SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC', [req.params.id]);
    const documents = await db.all('SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC', [req.params.id]);

    res.json({ client, tasks, invoices, documents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create client
app.post('/api/clients', verifyToken, async (req, res) => {
  try {
    const {
      client_name, firm_name, gstin, pan, contact_number, email,
      address, city, state, postal_code, service_type, notes
    } = req.body;

    const result = await db.run(
      `INSERT INTO clients (client_name, firm_name, gstin, pan, contact_number, email,
       address, city, state, postal_code, service_type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_name, firm_name, gstin, pan, contact_number, email, address, city, state, postal_code, service_type, notes]
    );

    await logAudit(req.userId, 'CREATE', 'Client', result.lastID, null, JSON.stringify(req.body));

    res.json({ id: result.lastID, message: 'Client created successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'PAN already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update client
app.put('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    const {
      client_name, firm_name, gstin, pan, contact_number, email,
      address, city, state, postal_code, service_type, notes
    } = req.body;

    await db.run(
      `UPDATE clients SET client_name = ?, firm_name = ?, gstin = ?, pan = ?,
       contact_number = ?, email = ?, address = ?, city = ?, state = ?,
       postal_code = ?, service_type = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [client_name, firm_name, gstin, pan, contact_number, email, address, city, state, postal_code, service_type, notes, req.params.id]
    );

    await logAudit(req.userId, 'UPDATE', 'Client', req.params.id, null, JSON.stringify(req.body));

    res.json({ message: 'Client updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete client (soft delete)
app.delete('/api/clients/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await db.run('UPDATE clients SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    await logAudit(req.userId, 'DELETE', 'Client', req.params.id);
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TASK ENDPOINTS ====================

// Get all tasks with filters
app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const { clientId, status, page = 1, limit = 50 } = req.query;
    let query = 'SELECT t.*, c.client_name, u.full_name as assigned_to_name FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN users u ON t.assigned_to = u.id WHERE 1=1';
    const params = [];

    if (clientId) {
      query += ' AND t.client_id = ?';
      params.push(clientId);
    }
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY t.due_date ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const tasks = await db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM tasks WHERE 1=1';
    if (clientId) countQuery += ' AND client_id = ?';
    if (status) countQuery += ' AND status = ?';
    const countParams = [];
    if (clientId) countParams.push(clientId);
    if (status) countParams.push(status);
    const { total } = await db.get(countQuery, countParams);

    res.json({
      tasks,
      pagination: { page: parseInt(page), limit, total }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single task
app.get('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const task = await db.get(
      'SELECT t.*, c.client_name, u.full_name as assigned_to_name FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?',
      [req.params.id]
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create task
app.post('/api/tasks', verifyToken, async (req, res) => {
  try {
    const {
      client_id, description, assigned_to, priority,
      assigned_date, due_date, proposed_fee, notes
    } = req.body;

    const result = await db.run(
      `INSERT INTO tasks (client_id, description, assigned_to, status, priority, assigned_date, due_date, proposed_fee, notes)
       VALUES (?, ?, ?, 'Pending', ?, ?, ?, ?, ?)`,
      [client_id, description, assigned_to, priority, assigned_date, due_date, proposed_fee, notes]
    );

    await logAudit(req.userId, 'CREATE', 'Task', result.lastID, null, JSON.stringify(req.body));
    res.json({ id: result.lastID, message: 'Task created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
app.put('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const {
      description, assigned_to, status, priority,
      assigned_date, due_date, completion_date, proposed_fee, notes
    } = req.body;

    const safeStatus = status && ['Pending', 'In Progress', 'Completed', 'Billed'].includes(status) ? status : 'Pending';
    const safePriority = priority && ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium';

    await db.run(
      `UPDATE tasks SET description = ?, assigned_to = ?, status = ?, priority = ?,
       assigned_date = ?, due_date = ?, completion_date = ?, proposed_fee = ?, notes = ?,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [description, assigned_to || null, safeStatus, safePriority, assigned_date || null, due_date || null, completion_date || null, proposed_fee || 0, notes || '', req.params.id]
    );

    await logAudit(req.userId, 'UPDATE', 'Task', req.params.id, null, JSON.stringify(req.body));
    res.json({ message: 'Task updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    await logAudit(req.userId, 'DELETE', 'Task', req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== INVOICE ENDPOINTS ====================

// Generate invoice from tasks
app.post('/api/invoices/generate', verifyToken, async (req, res) => {
  try {
    const { client_id, task_ids, invoice_date, due_date, gst_percentage = 18, invoice_number: customNumber } = req.body;

    // Get tasks details
    const placeholders = task_ids.map(() => '?').join(',');
    const tasks = await db.all(
      `SELECT * FROM tasks WHERE id IN (${placeholders}) AND status = 'Completed'`,
      task_ids
    );

    if (tasks.length === 0) {
      return res.status(400).json({ error: 'No completed tasks found' });
    }

    const subtotal = tasks.reduce((sum, t) => sum + Number(t.proposed_fee || 0), 0);
    const gst_amount = (subtotal * Number(gst_percentage)) / 100;
    const total_amount = subtotal + gst_amount;

    // Build invoice number: use custom if provided, else firm prefix + auto sequence
    let invoiceNumber;
    if (customNumber && customNumber.trim()) {
      invoiceNumber = customNumber.trim();
      const exists = await db.get('SELECT id FROM invoices WHERE invoice_number = ?', [invoiceNumber]);
      if (exists) return res.status(400).json({ error: 'Invoice number already exists. Please use a different one.' });
    } else {
      const firm = await db.get('SELECT invoice_prefix FROM firm_profile WHERE id = 1');
      const prefix = (firm && firm.invoice_prefix) || 'INV';
      const date = new Date();
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      // Find next sequence for this month
      const lastRow = await db.get(
        `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1`,
        [`${prefix}-${yearMonth}-%`]
      );
      let next = 1;
      if (lastRow) {
        const m = lastRow.invoice_number.match(/-(\d+)$/);
        if (m) next = parseInt(m[1], 10) + 1;
      }
      invoiceNumber = `${prefix}-${yearMonth}-${String(next).padStart(4, '0')}`;
    }

    const result = await db.run(
      `INSERT INTO invoices (invoice_number, client_id, invoice_date, due_date, subtotal, gst_percentage, gst_amount, total_amount, payment_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Unpaid', ?)`,
      [invoiceNumber, client_id, invoice_date, due_date, subtotal, gst_percentage, gst_amount, total_amount, req.userId]
    );

    // Map tasks to invoice and update task status
    for (const task of tasks) {
      await db.run(
        'INSERT INTO task_invoice_mapping (task_id, invoice_id) VALUES (?, ?)',
        [task.id, result.lastID]
      );
      await db.run('UPDATE tasks SET status = ?, completion_date = CURRENT_DATE WHERE id = ?', ['Billed', task.id]);
    }

    await logAudit(req.userId, 'CREATE', 'Invoice', result.lastID, null, invoiceNumber);

    res.json({
      invoiceId: result.lastID,
      invoiceNumber,
      message: 'Invoice generated successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all invoices
app.get('/api/invoices', verifyToken, async (req, res) => {
  try {
    const { clientId, status, page = 1, limit = 50 } = req.query;
    let query = 'SELECT i.*, c.client_name, c.contact_number AS client_phone, c.email AS client_email FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE 1=1';
    const params = [];

    if (clientId) {
      query += ' AND i.client_id = ?';
      params.push(clientId);
    }
    if (status) {
      query += ' AND i.payment_status = ?';
      params.push(status);
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY i.invoice_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const invoices = await db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM invoices WHERE 1=1';
    if (clientId) countQuery += ' AND client_id = ?';
    if (status) countQuery += ' AND payment_status = ?';
    const countParams = [];
    if (clientId) countParams.push(clientId);
    if (status) countParams.push(status);
    const { total } = await db.get(countQuery, countParams);

    res.json({
      invoices,
      pagination: { page: parseInt(page), limit, total }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single invoice with details
app.get('/api/invoices/:id', verifyToken, async (req, res) => {
  try {
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const tasks = await db.all(
      `SELECT t.* FROM tasks t
       INNER JOIN task_invoice_mapping tim ON t.id = tim.task_id
       WHERE tim.invoice_id = ?`,
      [req.params.id]
    );

    const payments = await db.all(
      'SELECT p.*, u.full_name FROM payments p LEFT JOIN users u ON p.recorded_by = u.id WHERE p.invoice_id = ? ORDER BY p.payment_date DESC',
      [req.params.id]
    );

    res.json({ invoice, tasks, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate invoice PDF
app.get('/api/invoices/:id/pdf', verifyToken, async (req, res) => {
  try {
    const invoice = await db.get(
      `SELECT i.*, c.client_name, c.firm_name, c.gstin, c.pan, c.address, c.city, c.state, c.postal_code, c.email, c.contact_number
       FROM invoices i INNER JOIN clients c ON i.client_id = c.id WHERE i.id = ?`,
      [req.params.id]
    );
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const tasks = await db.all(
      `SELECT t.* FROM tasks t INNER JOIN task_invoice_mapping tim ON t.id = tim.task_id WHERE tim.invoice_id = ?`,
      [req.params.id]
    );

    const firm = (await db.get('SELECT * FROM firm_profile WHERE id = 1')) || {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    // Firm Header
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1976d2')
      .text(firm.firm_name || 'Your CA Firm', { align: 'center' });
    doc.fillColor('black').fontSize(9).font('Helvetica');
    if (firm.proprietor_name) doc.text(firm.proprietor_name, { align: 'center' });
    if (firm.membership_no) doc.text(`Membership No: ${firm.membership_no}`, { align: 'center' });

    const firmAddrLine = [firm.address, firm.city, firm.state, firm.postal_code].filter(Boolean).join(', ');
    if (firmAddrLine) doc.text(firmAddrLine, { align: 'center' });

    const contactLine = [
      firm.phone && `Phone: ${firm.phone}`,
      firm.email && `Email: ${firm.email}`,
      firm.website,
    ].filter(Boolean).join('  |  ');
    if (contactLine) doc.text(contactLine, { align: 'center' });

    const taxLine = [
      firm.gstin && `GSTIN: ${firm.gstin}`,
      firm.pan && `PAN: ${firm.pan}`,
    ].filter(Boolean).join('  |  ');
    if (taxLine) doc.text(taxLine, { align: 'center' });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1.5).strokeColor('#1976d2').stroke();
    doc.strokeColor('black').lineWidth(1);
    doc.moveDown(0.5);

    doc.fontSize(16).font('Helvetica-Bold').fillColor('black').text('TAX INVOICE', { align: 'center' });
    doc.moveDown();

    // Invoice info box
    const startY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').text('Invoice No:', 50, startY);
    doc.font('Helvetica').text(invoice.invoice_number, 130, startY);
    doc.font('Helvetica-Bold').text('Date:', 350, startY);
    doc.font('Helvetica').text(new Date(invoice.invoice_date).toLocaleDateString('en-IN'), 400, startY);

    doc.font('Helvetica-Bold').text('Due Date:', 350, startY + 18);
    doc.font('Helvetica').text(invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '-', 410, startY + 18);

    doc.moveDown(2);

    // Bill To
    doc.fontSize(11).font('Helvetica-Bold').text('Bill To:', 50);
    doc.fontSize(10).font('Helvetica');
    doc.text(invoice.client_name || '');
    if (invoice.firm_name) doc.text(invoice.firm_name);
    if (invoice.address) doc.text(invoice.address);
    const cityLine = [invoice.city, invoice.state, invoice.postal_code].filter(Boolean).join(', ');
    if (cityLine) doc.text(cityLine);
    if (invoice.pan) doc.text(`PAN: ${invoice.pan}`);
    if (invoice.gstin) doc.text(`GSTIN: ${invoice.gstin}`);

    doc.moveDown(1.5);

    // Tasks table header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.rect(50, tableTop, 500, 22).fill('#1976d2');
    doc.fillColor('white');
    doc.text('#', 55, tableTop + 7);
    doc.text('Description', 80, tableTop + 7);
    doc.text('Amount (Rs.)', 460, tableTop + 7, { width: 85, align: 'right' });
    doc.fillColor('black');

    let y = tableTop + 25;
    doc.font('Helvetica');
    tasks.forEach((task, idx) => {
      const fee = Number(task.proposed_fee || 0);
      doc.text(String(idx + 1), 55, y);
      doc.text(task.description || '', 80, y, { width: 370 });
      doc.text(fee.toFixed(2), 460, y, { width: 85, align: 'right' });
      y += Math.max(20, doc.heightOfString(task.description || '', { width: 370 }) + 6);
    });

    // Totals
    y += 10;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    const subtotal = Number(invoice.subtotal || 0);
    const gstAmount = Number(invoice.gst_amount || 0);
    const totalAmount = Number(invoice.total_amount || 0);
    const gstPct = Number(invoice.gst_percentage || 18);

    doc.font('Helvetica').text('Subtotal:', 380, y);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    y += 18;
    doc.text(`GST (${gstPct}%):`, 380, y);
    doc.text(`Rs. ${gstAmount.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    y += 18;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total:', 380, y);
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, 460, y, { width: 85, align: 'right' });

    y += 35;
    doc.font('Helvetica').fontSize(10).fillColor('gray');
    doc.text(`Payment Status: ${invoice.payment_status || 'Unpaid'}`, 50, y);
    if (invoice.notes) {
      y += 18;
      doc.text(`Notes: ${invoice.notes}`, 50, y);
    }

    // Bank details box (if filled)
    if (firm.bank_name || firm.bank_account) {
      y += 30;
      doc.fillColor('black').font('Helvetica-Bold').fontSize(10).text('Bank Details:', 50, y);
      y += 15;
      doc.font('Helvetica').fontSize(9);
      if (firm.bank_name) { doc.text(`Bank: ${firm.bank_name}`, 50, y); y += 13; }
      if (firm.bank_account) { doc.text(`A/c No: ${firm.bank_account}`, 50, y); y += 13; }
      if (firm.bank_ifsc) { doc.text(`IFSC: ${firm.bank_ifsc}`, 50, y); y += 13; }
      if (firm.bank_branch) { doc.text(`Branch: ${firm.bank_branch}`, 50, y); y += 13; }
    }

    // Footer line
    if (firm.invoice_footer) {
      doc.fontSize(9).fillColor('gray').font('Helvetica-Oblique')
        .text(firm.invoice_footer, 50, 780, { width: 495, align: 'center' });
    }

    // Signature block
    doc.fontSize(10).fillColor('black').font('Helvetica')
      .text(`For ${firm.firm_name || 'Firm'}`, 400, 720);
    doc.text('_____________________', 400, 760);
    doc.text('Authorised Signatory', 400, 775);

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Excel export: All clients (master data)
app.get('/api/clients/export/excel', verifyToken, async (req, res) => {
  try {
    const clients = await db.all('SELECT * FROM clients WHERE is_active = 1 ORDER BY client_name');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Clients');
    sheet.columns = [
      { header: 'Client Name', key: 'client_name', width: 30 },
      { header: 'Firm Name', key: 'firm_name', width: 25 },
      { header: 'PAN', key: 'pan', width: 15 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'Contact Number', key: 'contact_number', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Postal Code', key: 'postal_code', width: 12 },
      { header: 'Service Type', key: 'service_type', width: 18 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    clients.forEach(c => sheet.addRow(c));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="clients-master.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excel template (empty) for import
app.get('/api/clients/import/template', verifyToken, async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Clients');
    sheet.columns = [
      { header: 'Client Name', key: 'client_name', width: 30 },
      { header: 'Firm Name', key: 'firm_name', width: 25 },
      { header: 'PAN', key: 'pan', width: 15 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'Contact Number', key: 'contact_number', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Postal Code', key: 'postal_code', width: 12 },
      { header: 'Service Type', key: 'service_type', width: 18 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    // Sample row
    sheet.addRow({
      client_name: 'Sample Client Pvt Ltd',
      firm_name: 'Sample Group',
      pan: 'ABCDE1234F',
      gstin: '27ABCDE1234F1Z5',
      contact_number: '9876543210',
      email: 'contact@sample.com',
      address: '123 Sample Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400001',
      service_type: 'Tax Compliance',
      notes: 'Sample notes',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="clients-import-template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import clients from Excel
app.post('/api/clients/import/excel', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ error: 'Excel file has no sheets' });

    const headerRow = sheet.getRow(1).values;
    // Map header text -> column index. ExcelJS uses 1-based.
    const headers = {};
    headerRow.forEach((h, idx) => {
      if (typeof h === 'string') headers[h.trim().toLowerCase()] = idx;
    });

    const getCell = (row, name) => {
      const idx = headers[name.toLowerCase()];
      if (!idx) return '';
      const v = row.getCell(idx).value;
      if (v === null || v === undefined) return '';
      if (typeof v === 'object' && v.text) return String(v.text).trim();
      return String(v).trim();
    };

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const client_name = getCell(row, 'Client Name');
      if (!client_name) { skipped++; continue; }

      const pan = getCell(row, 'PAN');
      try {
        if (pan) {
          const exists = await db.get('SELECT id FROM clients WHERE pan = ?', [pan]);
          if (exists) {
            errors.push(`Row ${i}: PAN ${pan} already exists, skipped`);
            skipped++;
            continue;
          }
        }
        await db.run(
          `INSERT INTO clients (client_name, firm_name, gstin, pan, contact_number, email, address, city, state, postal_code, service_type, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            client_name,
            getCell(row, 'Firm Name'),
            getCell(row, 'GSTIN'),
            pan || null,
            getCell(row, 'Contact Number'),
            getCell(row, 'Email'),
            getCell(row, 'Address'),
            getCell(row, 'City'),
            getCell(row, 'State'),
            getCell(row, 'Postal Code'),
            getCell(row, 'Service Type'),
            getCell(row, 'Notes'),
          ]
        );
        inserted++;
      } catch (err) {
        errors.push(`Row ${i}: ${err.message}`);
        skipped++;
      }
    }

    // Cleanup uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    await logAudit(req.userId, 'IMPORT', 'Client', null, null, `${inserted} clients imported`);
    res.json({ inserted, skipped, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excel export: Client-wise billing
app.get('/api/reports/client-wise-billing/excel', verifyToken, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT c.client_name, c.pan,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(CASE WHEN i.payment_status = 'Paid' THEN i.total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN i.payment_status IN ('Unpaid', 'Partially Paid', 'Overdue') THEN i.total_amount ELSE 0 END), 0) as outstanding_amount,
        COALESCE(SUM(i.total_amount), 0) as total_billed
       FROM clients c LEFT JOIN invoices i ON c.id = i.client_id
       WHERE c.is_active = 1 GROUP BY c.id ORDER BY total_billed DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Client-wise Billing');
    sheet.columns = [
      { header: 'Client Name', key: 'client_name', width: 30 },
      { header: 'PAN', key: 'pan', width: 15 },
      { header: 'Invoices', key: 'invoice_count', width: 12 },
      { header: 'Paid (Rs.)', key: 'paid_amount', width: 15 },
      { header: 'Outstanding (Rs.)', key: 'outstanding_amount', width: 18 },
      { header: 'Total Billed (Rs.)', key: 'total_billed', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    rows.forEach(r => sheet.addRow(r));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="client-wise-billing.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excel export: Outstanding receivables
app.get('/api/reports/outstanding-receivables/excel', verifyToken, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT i.invoice_number, c.client_name, i.total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (i.total_amount - COALESCE(SUM(p.amount), 0)) as outstanding_amount,
        i.due_date, i.payment_status
       FROM invoices i INNER JOIN clients c ON i.client_id = c.id
       LEFT JOIN payments p ON i.id = p.invoice_id
       WHERE i.payment_status IN ('Unpaid', 'Partially Paid', 'Overdue')
       GROUP BY i.id ORDER BY i.due_date ASC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Outstanding Receivables');
    sheet.columns = [
      { header: 'Invoice #', key: 'invoice_number', width: 22 },
      { header: 'Client', key: 'client_name', width: 30 },
      { header: 'Total (Rs.)', key: 'total_amount', width: 15 },
      { header: 'Paid (Rs.)', key: 'paid_amount', width: 15 },
      { header: 'Outstanding (Rs.)', key: 'outstanding_amount', width: 18 },
      { header: 'Due Date', key: 'due_date', width: 14 },
      { header: 'Status', key: 'payment_status', width: 16 },
    ];
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    rows.forEach(r => sheet.addRow(r));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="outstanding-receivables.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excel export: Monthly revenue
app.get('/api/reports/monthly-revenue/excel', verifyToken, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT strftime('%Y-%m', i.invoice_date) as month,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(i.total_amount), 0) as total_billed,
        COALESCE(SUM(p.amount), 0) as total_collected
       FROM invoices i LEFT JOIN payments p ON i.id = p.invoice_id
       GROUP BY strftime('%Y-%m', i.invoice_date) ORDER BY month DESC LIMIT 12`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Monthly Revenue');
    sheet.columns = [
      { header: 'Month', key: 'month', width: 14 },
      { header: 'Invoices', key: 'invoice_count', width: 12 },
      { header: 'Total Billed (Rs.)', key: 'total_billed', width: 18 },
      { header: 'Total Collected (Rs.)', key: 'total_collected', width: 20 },
      { header: 'Outstanding (Rs.)', key: 'outstanding', width: 18 },
    ];
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    rows.forEach(r => sheet.addRow({ ...r, outstanding: Number(r.total_billed || 0) - Number(r.total_collected || 0) }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="monthly-revenue.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suggest next invoice number based on firm prefix
app.get('/api/invoices/next-number', verifyToken, async (req, res) => {
  try {
    const firm = await db.get('SELECT invoice_prefix FROM firm_profile WHERE id = 1');
    const prefix = (firm && firm.invoice_prefix) || 'INV';
    const date = new Date();
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const lastRow = await db.get(
      `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1`,
      [`${prefix}-${yearMonth}-%`]
    );
    let next = 1;
    if (lastRow) {
      const m = lastRow.invoice_number.match(/-(\d+)$/);
      if (m) next = parseInt(m[1], 10) + 1;
    }
    res.json({ suggested: `${prefix}-${yearMonth}-${String(next).padStart(4, '0')}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice (number, dates, notes)
app.put('/api/invoices/:id', verifyToken, async (req, res) => {
  try {
    const { invoice_number, invoice_date, due_date, notes } = req.body;
    if (invoice_number) {
      const existing = await db.get(
        'SELECT id FROM invoices WHERE invoice_number = ? AND id != ?',
        [invoice_number, req.params.id]
      );
      if (existing) return res.status(400).json({ error: 'Invoice number already in use' });
    }
    await db.run(
      `UPDATE invoices SET invoice_number = COALESCE(?, invoice_number),
        invoice_date = COALESCE(?, invoice_date),
        due_date = COALESCE(?, due_date),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [invoice_number || null, invoice_date || null, due_date || null, notes !== undefined ? notes : null, req.params.id]
    );
    await logAudit(req.userId, 'UPDATE', 'Invoice', req.params.id);
    res.json({ message: 'Invoice updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PAYMENT ENDPOINTS ====================

// Record payment
app.post('/api/payments', verifyToken, async (req, res) => {
  try {
    const { invoice_id, payment_date, amount, payment_method, reference_number, notes } = req.body;

    if (!invoice_id) return res.status(400).json({ error: 'invoice_id required' });
    if (!payment_date) return res.status(400).json({ error: 'payment_date required' });
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'amount must be greater than 0' });

    const allowedMethods = ['Cash', 'Cheque', 'Bank Transfer', 'Online', 'Other'];
    const safeMethod = allowedMethods.includes(payment_method) ? payment_method : 'Other';

    const result = await db.run(
      `INSERT INTO payments (invoice_id, payment_date, amount, payment_method, reference_number, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [invoice_id, payment_date, amt, safeMethod, reference_number || '', notes || '', req.userId]
    );

    // Update invoice payment status (cast to Number — sqlite returns DECIMAL as string)
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoice_id]);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const totalPaidRow = await db.get(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?',
      [invoice_id]
    );
    const totalPaid = Number(totalPaidRow.total || 0);
    const invoiceTotal = Number(invoice.total_amount || 0);

    let paymentStatus = 'Unpaid';
    if (totalPaid >= invoiceTotal - 0.01) {
      paymentStatus = 'Paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'Partially Paid';
    }

    await db.run(
      'UPDATE invoices SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [paymentStatus, invoice_id]
    );

    await logAudit(req.userId, 'CREATE', 'Payment', result.lastID, null, `Invoice ${invoice_id}: ${amt}`);

    res.json({ id: result.lastID, message: 'Payment recorded successfully', new_status: paymentStatus });
  } catch (err) {
    console.error('Record payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== DASHBOARD ENDPOINTS ====================

// Get dashboard metrics
app.get('/api/dashboard/metrics', verifyToken, async (req, res) => {
  try {
    const pendingTasks = await db.get('SELECT COUNT(*) as count FROM tasks WHERE status = \'Pending\'');
    const overdueTasks = await db.get('SELECT COUNT(*) as count FROM tasks WHERE status IN (\'Pending\', \'In Progress\') AND due_date < DATE(\'now\')');
    const totalClients = await db.get('SELECT COUNT(*) as count FROM clients WHERE is_active = 1');
    const outstandingPayments = await db.get('SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE payment_status IN (\'Unpaid\', \'Partially Paid\', \'Overdue\')');
    const monthlyRevenue = await db.get('SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE strftime(\'%Y-%m\', invoice_date) = strftime(\'%Y-%m\', \'now\')');

    res.json({
      pendingTasks: pendingTasks.count,
      overdueTasks: overdueTasks.count,
      totalClients: totalClients.count,
      outstandingPayments: outstandingPayments.total,
      monthlyRevenue: monthlyRevenue.total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending tasks
app.get('/api/dashboard/pending-tasks', verifyToken, async (req, res) => {
  try {
    const tasks = await db.all(
      `SELECT t.*, c.client_name FROM tasks t
       INNER JOIN clients c ON t.client_id = c.id
       WHERE t.status IN ('Pending', 'In Progress')
       ORDER BY t.due_date ASC LIMIT 10`
    );
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get overdue invoices
app.get('/api/dashboard/overdue-invoices', verifyToken, async (req, res) => {
  try {
    const invoices = await db.all(
      `SELECT i.*, c.client_name FROM invoices i
       INNER JOIN clients c ON i.client_id = c.id
       WHERE i.payment_status != 'Paid' AND i.due_date < DATE('now')
       ORDER BY i.due_date ASC LIMIT 10`
    );
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== REPORT ENDPOINTS ====================

// Client-wise billing report
app.get('/api/reports/client-wise-billing', verifyToken, async (req, res) => {
  try {
    const report = await db.all(
      `SELECT c.id, c.client_name, c.pan,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(CASE WHEN i.payment_status = 'Paid' THEN i.total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN i.payment_status IN ('Unpaid', 'Partially Paid', 'Overdue') THEN i.total_amount ELSE 0 END), 0) as outstanding_amount,
        COALESCE(SUM(i.total_amount), 0) as total_billed
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id
      WHERE c.is_active = 1
      GROUP BY c.id, c.client_name, c.pan
      ORDER BY total_billed DESC`
    );
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Outstanding receivables report
app.get('/api/reports/outstanding-receivables', verifyToken, async (req, res) => {
  try {
    const report = await db.all(
      `SELECT i.id, i.invoice_number, c.client_name, i.total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (i.total_amount - COALESCE(SUM(p.amount), 0)) as outstanding_amount,
        i.due_date, i.payment_status
      FROM invoices i
      INNER JOIN clients c ON i.client_id = c.id
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE i.payment_status IN ('Unpaid', 'Partially Paid', 'Overdue')
      GROUP BY i.id, i.invoice_number, c.client_name, i.total_amount, i.due_date, i.payment_status
      ORDER BY i.due_date ASC`
    );
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff performance report
app.get('/api/reports/staff-performance', verifyToken, async (req, res) => {
  try {
    const report = await db.all(
      `SELECT u.id, u.full_name, u.role,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'Pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status = 'Billed' THEN 1 ELSE 0 END) as billed_tasks,
        SUM(CASE WHEN t.status IN ('Pending','In Progress') AND t.due_date < DATE('now') THEN 1 ELSE 0 END) as overdue_tasks,
        COALESCE(SUM(CASE WHEN t.status IN ('Completed','Billed') THEN t.proposed_fee ELSE 0 END), 0) as billable_value,
        COALESCE(SUM(CASE WHEN t.status = 'Billed' THEN t.proposed_fee ELSE 0 END), 0) as billed_value
       FROM users u
       LEFT JOIN tasks t ON u.id = t.assigned_to
       WHERE u.is_active = 1
       GROUP BY u.id, u.full_name, u.role
       ORDER BY total_tasks DESC`
    );
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excel export: Staff performance
app.get('/api/reports/staff-performance/excel', verifyToken, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT u.full_name, u.role,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'Pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status = 'Billed' THEN 1 ELSE 0 END) as billed_tasks,
        SUM(CASE WHEN t.status IN ('Pending','In Progress') AND t.due_date < DATE('now') THEN 1 ELSE 0 END) as overdue_tasks,
        COALESCE(SUM(CASE WHEN t.status = 'Billed' THEN t.proposed_fee ELSE 0 END), 0) as billed_value
       FROM users u LEFT JOIN tasks t ON u.id = t.assigned_to
       WHERE u.is_active = 1 GROUP BY u.id ORDER BY total_tasks DESC`
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Staff Performance');
    sheet.columns = [
      { header: 'Staff Name', key: 'full_name', width: 25 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Total Tasks', key: 'total_tasks', width: 12 },
      { header: 'Pending', key: 'pending_tasks', width: 12 },
      { header: 'In Progress', key: 'in_progress_tasks', width: 12 },
      { header: 'Completed', key: 'completed_tasks', width: 12 },
      { header: 'Billed', key: 'billed_tasks', width: 12 },
      { header: 'Overdue', key: 'overdue_tasks', width: 12 },
      { header: 'Billed Value (Rs.)', key: 'billed_value', width: 18 },
    ];
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    rows.forEach(r => sheet.addRow(r));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="staff-performance.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly revenue report
app.get('/api/reports/monthly-revenue', verifyToken, async (req, res) => {
  try {
    const report = await db.all(
      `SELECT strftime('%Y-%m', i.invoice_date) as month,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(i.total_amount), 0) as total_billed,
        COALESCE(SUM(p.amount), 0) as total_collected
      FROM invoices i
      LEFT JOIN payments p ON i.id = p.invoice_id
      GROUP BY strftime('%Y-%m', i.invoice_date)
      ORDER BY month DESC LIMIT 12`
    );
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DOCUMENT ENDPOINTS ====================

// Upload document
app.post('/api/documents/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { client_id, task_id, invoice_id } = req.body;
    const result = await db.run(
      `INSERT INTO documents (client_id, task_id, invoice_id, document_name, file_path, file_type, file_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id, task_id, invoice_id, req.file.originalname, req.file.path, req.file.mimetype, req.file.size, req.userId]
    );

    await logAudit(req.userId, 'UPLOAD', 'Document', result.lastID, null, req.file.originalname);
    res.json({ id: result.lastID, message: 'Document uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== FIRM PROFILE ENDPOINTS ====================

app.get('/api/firm-profile', verifyToken, async (req, res) => {
  try {
    const profile = await db.get('SELECT * FROM firm_profile WHERE id = 1');
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/firm-profile', verifyToken, requireAdmin, async (req, res) => {
  try {
    const f = req.body;
    await db.run(
      `UPDATE firm_profile SET
        firm_name = ?, proprietor_name = ?, membership_no = ?,
        address = ?, city = ?, state = ?, postal_code = ?,
        phone = ?, email = ?, website = ?,
        gstin = ?, pan = ?,
        bank_name = ?, bank_account = ?, bank_ifsc = ?, bank_branch = ?,
        invoice_prefix = ?, invoice_footer = ?, default_gst_percentage = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [
        f.firm_name || '', f.proprietor_name || '', f.membership_no || '',
        f.address || '', f.city || '', f.state || '', f.postal_code || '',
        f.phone || '', f.email || '', f.website || '',
        f.gstin || '', f.pan || '',
        f.bank_name || '', f.bank_account || '', f.bank_ifsc || '', f.bank_branch || '',
        f.invoice_prefix || 'INV', f.invoice_footer || '', Number(f.default_gst_percentage || 18),
      ]
    );
    await logAudit(req.userId, 'UPDATE', 'FirmProfile', 1);
    res.json({ message: 'Firm profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SYSTEM ENDPOINTS ====================

// Get audit logs
app.get('/api/audit-logs', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const logs = await db.all(
      `SELECT al.*, u.full_name FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const { total } = await db.get('SELECT COUNT(*) as total FROM audit_logs');

    res.json({
      logs,
      pagination: { page: parseInt(page), limit, total }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User management endpoints
app.get('/api/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.all('SELECT id, username, email, full_name, role, is_active, created_at FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, email, full_name, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = await db.run(
      `INSERT INTO users (username, password, email, full_name, role)
       VALUES (?, ?, ?, ?, ?)`,
      [username, hashedPassword, email, full_name, role]
    );

    await logAudit(req.userId, 'CREATE', 'User', result.lastID, null, username);
    res.json({ id: result.lastID, message: 'User created successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Backend server running on http://localhost:${PORT}`);
});

module.exports = app;
