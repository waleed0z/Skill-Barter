const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./src/database.sqlite');
const sessionId = process.argv[2];
if (!sessionId) { console.error('Usage: node inspect-session.js <sessionId>'); process.exit(1); }

db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, row) => {
  if (err) { console.error(err); process.exit(1); }
  console.log('Session row:', row);
  db.get('SELECT id, time_credits FROM users WHERE id = ?', [row.student_id], (e,u) => {
    if (e) { console.error(e); process.exit(1); }
    console.log('Student row:', u);
    db.close();
  });
});
