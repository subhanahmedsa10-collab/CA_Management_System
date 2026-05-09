const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../database/ca_system.db');
const schemaPath = path.join(__dirname, '../database/schema.sql');

function initializeDatabase() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      return;
    }
    console.log('Connected to SQLite database');
  });

  // Read and execute schema
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('Error executing schema:', err);
      db.close();
      return;
    }
    console.log('Database schema created successfully');

    // Insert default admin user
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const adminUser = {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@ca-system.local',
      full_name: 'System Administrator',
      role: 'admin',
      is_active: 1
    };

    db.run(
      `INSERT OR IGNORE INTO users (username, password, email, full_name, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminUser.username, adminUser.password, adminUser.email, adminUser.full_name, adminUser.role, adminUser.is_active],
      (err) => {
        if (err) {
          console.error('Error inserting admin user:', err);
        } else {
          console.log('✓ Default admin user created (username: admin, password: admin123)');
        }

        // Insert sample staff user
        const staffPassword = bcrypt.hashSync('staff123', 10);
        const staffUser = {
          username: 'staff',
          password: staffPassword,
          email: 'staff@ca-system.local',
          full_name: 'Staff Member',
          role: 'staff',
          is_active: 1
        };

        db.run(
          `INSERT OR IGNORE INTO users (username, password, email, full_name, role, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [staffUser.username, staffUser.password, staffUser.email, staffUser.full_name, staffUser.role, staffUser.is_active],
          (err) => {
            if (err) {
              console.error('Error inserting staff user:', err);
            } else {
              console.log('✓ Sample staff user created (username: staff, password: staff123)');
            }

            // Insert sample client data
            const sampleClients = [
              {
                client_name: 'Acme Corporation Pvt Ltd',
                firm_name: 'Acme Group',
                gstin: '18AABCT1234H1Z0',
                pan: 'AABCT1234H',
                contact_number: '9876543210',
                email: 'contact@acme.com',
                address: '123 Business Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                postal_code: '400001',
                service_type: 'Tax Compliance',
                notes: 'Regular client, good payment history'
              },
              {
                client_name: 'Tech Solutions Inc',
                firm_name: 'TechCorp',
                gstin: '18AABCS5678H2Z5',
                pan: 'AABCS5678H',
                contact_number: '9876543211',
                email: 'contact@techsolutions.com',
                address: '456 IT Park',
                city: 'Bangalore',
                state: 'Karnataka',
                postal_code: '560001',
                service_type: 'Audit',
                notes: 'Software company, quarterly audits'
              }
            ];

            sampleClients.forEach((client, index) => {
              db.run(
                `INSERT OR IGNORE INTO clients
                 (client_name, firm_name, gstin, pan, contact_number, email, address, city, state, postal_code, service_type, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                Object.values(client),
                (err) => {
                  if (err) {
                    console.error(`Error inserting client ${index + 1}:`, err);
                  } else if (index === sampleClients.length - 1) {
                    console.log('✓ Sample clients created');
                    db.close(() => {
                      console.log('\n✓ Database initialized successfully!');
                      console.log('Default credentials:');
                      console.log('  Admin: admin / admin123');
                      console.log('  Staff: staff / staff123');
                      console.log('\n⚠️  Please change the default password after first login!\n');
                    });
                  }
                }
              );
            });
          }
        );
      }
    );
  });
}

// Check if database already exists
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

initializeDatabase();
