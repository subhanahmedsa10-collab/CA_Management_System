const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/ca_system.db');
const db = new sqlite3.Database(dbPath);

console.log('Scanning for broken invoices (orphaned mappings)...\n');

db.serialize(() => {
  // Step 1: Find broken mappings (invoice_id IS NULL)
  db.all(
    `SELECT id, task_id FROM task_invoice_mapping WHERE invoice_id IS NULL`,
    [],
    (err, brokenMappings) => {
      if (err) { console.error(err); db.close(); return; }
      console.log(`Found ${brokenMappings.length} broken mapping(s) with NULL invoice_id`);

      // Step 2: Find invoices that have NO mapping rows pointing to them
      db.all(
        `SELECT i.id, i.invoice_number FROM invoices i
         WHERE NOT EXISTS (SELECT 1 FROM task_invoice_mapping WHERE invoice_id = i.id)`,
        [],
        (err, orphanInvoices) => {
          if (err) { console.error(err); db.close(); return; }
          console.log(`Found ${orphanInvoices.length} invoice(s) with no task mapping:`);
          orphanInvoices.forEach(i => console.log(`  - ${i.invoice_number} (id=${i.id})`));

          if (brokenMappings.length === 0 && orphanInvoices.length === 0) {
            console.log('\n✓ No broken data found. Nothing to clean up.');
            db.close();
            return;
          }

          // Step 3: Revert tasks (from broken mappings) back to 'Completed'
          const taskIds = brokenMappings.map(m => m.task_id).filter(Boolean);
          const revertTasks = (cb) => {
            if (taskIds.length === 0) return cb();
            const placeholders = taskIds.map(() => '?').join(',');
            db.run(
              `UPDATE tasks SET status = 'Completed' WHERE id IN (${placeholders}) AND status = 'Billed'`,
              taskIds,
              function (err) {
                if (err) console.error(err);
                else console.log(`✓ Reverted ${this.changes} task(s) from 'Billed' back to 'Completed'`);
                cb();
              }
            );
          };

          // Step 4: Delete broken mappings
          const deleteBrokenMappings = (cb) => {
            db.run(
              `DELETE FROM task_invoice_mapping WHERE invoice_id IS NULL`,
              [],
              function (err) {
                if (err) console.error(err);
                else console.log(`✓ Deleted ${this.changes} broken mapping row(s)`);
                cb();
              }
            );
          };

          // Step 5: Delete orphan invoices
          const deleteOrphanInvoices = (cb) => {
            const ids = orphanInvoices.map(i => i.id);
            if (ids.length === 0) return cb();
            const placeholders = ids.map(() => '?').join(',');
            db.run(
              `DELETE FROM invoices WHERE id IN (${placeholders})`,
              ids,
              function (err) {
                if (err) console.error(err);
                else console.log(`✓ Deleted ${this.changes} orphan invoice(s)`);
                cb();
              }
            );
          };

          revertTasks(() => deleteBrokenMappings(() => deleteOrphanInvoices(() => {
            console.log('\n✓ Cleanup complete. You can now regenerate invoices.');
            db.close();
          })));
        }
      );
    }
  );
});
