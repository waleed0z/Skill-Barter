#!/usr/bin/env node
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../src/database.sqlite');
const args = process.argv.slice(2);

const emailArg = args.find(a => a.startsWith('--email='));
const amountArg = args.find(a => a.startsWith('--amount='));

if (!emailArg || !amountArg) {
  console.log('Usage: node grant-credits.js --email=user@example.com --amount=10');
  process.exit(1);
}

const email = emailArg.split('=')[1];
const amount = parseInt(amountArg.split('=')[1], 10);

if (!email || isNaN(amount) || amount <= 0) {
  console.error('Invalid email or amount');
  process.exit(1);
}

console.log(`Granting ${amount} credits to ${email}...`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      console.error('Error starting transaction:', err.message);
      db.close();
      process.exit(1);
    }

    // Find user by email
    db.get('SELECT id, name, time_credits FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        console.error('Error finding user:', err.message);
        db.run('ROLLBACK', () => db.close());
        process.exit(1);
      }

      if (!row) {
        console.error(`User with email ${email} not found`);
        db.run('ROLLBACK', () => db.close());
        process.exit(1);
      }

      const oldBalance = row.time_credits;
      const newBalance = oldBalance + amount;

      console.log(`Found user: ${row.name} (${row.id})`);
      console.log(`Current balance: ${oldBalance}`);
      console.log(`New balance: ${newBalance}`);

      // Update credits
      db.run('UPDATE users SET time_credits = time_credits + ? WHERE id = ?', [amount, row.id], function(err) {
        if (err) {
          console.error('Error updating credits:', err.message);
          db.run('ROLLBACK', () => db.close());
          process.exit(1);
        }

        if (this.changes === 0) {
          console.error('No rows updated');
          db.run('ROLLBACK', () => db.close());
          process.exit(1);
        }

        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err.message);
            db.run('ROLLBACK', () => db.close());
            process.exit(1);
          }

          console.log(`✓ Successfully granted ${amount} credits to ${email}`);
          db.close();
        });
      });
    });
  });
});
