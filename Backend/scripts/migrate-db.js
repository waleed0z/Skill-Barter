const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Use the same database file path as the application (src/database.sqlite)
const dbPath = path.join(__dirname, '../src/database.sqlite');

async function backupDb() {
  if (!fs.existsSync(dbPath)) {
    console.log('No existing database found, nothing to back up.');
    return null;
  }

  const bakPath = dbPath + '.' + Date.now() + '.bak';
  fs.copyFileSync(dbPath, bakPath);
  console.log('Database backed up to', bakPath);
  return bakPath;
}

function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function columnExists(db, table, column) {
  const rows = await allAsync(db, `PRAGMA table_info(${table})`);
  return rows.some(r => r.name === column);
}

(async function migrate() {
  try {
    await backupDb();

    // Create DB file if missing
    if (!fs.existsSync(dbPath)) {
      // touch file by opening DB
      const tmpdb = new sqlite3.Database(dbPath);
      tmpdb.close();
      console.log('Created new database file at', dbPath);
    }

    const db = new sqlite3.Database(dbPath);

    // Add columns to skills
    try {
      if (!await columnExists(db, 'skills', 'is_course')) {
        await runAsync(db, "ALTER TABLE skills ADD COLUMN is_course INTEGER DEFAULT 0");
        console.log('Added skills.is_course');
      } else console.log('skills.is_course already exists');

      if (!await columnExists(db, 'skills', 'total_sessions')) {
        await runAsync(db, "ALTER TABLE skills ADD COLUMN total_sessions INTEGER");
        console.log('Added skills.total_sessions');
      } else console.log('skills.total_sessions already exists');

      if (!await columnExists(db, 'skills', 'payment_plan')) {
        await runAsync(db, "ALTER TABLE skills ADD COLUMN payment_plan TEXT DEFAULT 'per_session'");
        console.log('Added skills.payment_plan');
      } else console.log('skills.payment_plan already exists');
    } catch (err) {
      console.error('Error updating skills table:', err.message);
    }

    // Add columns to sessions
    try {
      if (!await columnExists(db, 'sessions', 'course_instance_id')) {
        await runAsync(db, "ALTER TABLE sessions ADD COLUMN course_instance_id TEXT");
        console.log('Added sessions.course_instance_id');
      } else console.log('sessions.course_instance_id already exists');

      if (!await columnExists(db, 'sessions', 'sequence_number')) {
        await runAsync(db, "ALTER TABLE sessions ADD COLUMN sequence_number INTEGER DEFAULT 1");
        console.log('Added sessions.sequence_number');
      } else console.log('sessions.sequence_number already exists');

      if (!await columnExists(db, 'sessions', 'credit_amount')) {
        await runAsync(db, "ALTER TABLE sessions ADD COLUMN credit_amount INTEGER DEFAULT 0");
        console.log('Added sessions.credit_amount');
      } else console.log('sessions.credit_amount already exists');
    } catch (err) {
      console.error('Error updating sessions table:', err.message);
    }

    // Create course_instances table if not exists
    try {
      await runAsync(db, `CREATE TABLE IF NOT EXISTS course_instances (
        id TEXT PRIMARY KEY,
        skill_id INTEGER NOT NULL,
        student_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        total_sessions INTEGER NOT NULL,
        completed_sessions INTEGER DEFAULT 0,
        payment_plan TEXT DEFAULT 'per_session',
        held_credits INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      console.log('Ensured course_instances table exists');
    } catch (err) {
      console.error('Error creating course_instances table:', err.message);
    }

    db.close();
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
