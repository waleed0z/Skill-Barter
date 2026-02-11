const path = require('path');
const sqlite3 = require('sqlite3').verbose();
// inspect the application's sqlite under src
const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) return console.error('Open DB error:', err.message);
});

db.serialize(() => {
  db.all("SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','index') ORDER BY type, name", [], (err, rows) => {
    if (err) return console.error('Error reading sqlite_master:', err.message);
    console.log('--- sqlite_master ---');
    rows.forEach(r => console.log(r.name, '-', r.type));

    db.all("PRAGMA table_info('skills')", [], (err, cols) => {
      if (err) {
        console.error('PRAGMA skills error:', err.message);
      } else {
        console.log('\n--- skills columns ---');
        if (cols.length === 0) console.log('(no skills table or no columns)');
        cols.forEach(c => console.log(c.name, c.type, c.notnull ? 'NOT NULL' : 'NULL', c.dflt_value ? `DEFAULT ${c.dflt_value}` : ''));
      }

      db.all("PRAGMA table_info('sessions')", [], (err2, cols2) => {
        if (err2) console.error('PRAGMA sessions error:', err2.message);
        else {
          console.log('\n--- sessions columns ---');
          if (cols2.length === 0) console.log('(no sessions table or no columns)');
          cols2.forEach(c => console.log(c.name, c.type, c.notnull ? 'NOT NULL' : 'NULL', c.dflt_value ? `DEFAULT ${c.dflt_value}` : ''));
        }
        db.close();
      });
    });
  });
});
