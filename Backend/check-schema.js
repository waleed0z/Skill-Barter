const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'src', 'database.sqlite');

if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found at ${dbPath}`);
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

// Check schema
db.all("PRAGMA table_info(skills)", (err, rows) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }
    
    console.log('Skills table columns:');
    rows.forEach(col => {
        console.log(`  ${col.name}: ${col.type}`);
    });
    
    db.all("PRAGMA table_info(sessions)", (err, rows) => {
        if (err) {
            console.error('Error:', err);
            process.exit(1);
        }
        
        console.log('\nSessions table columns:');
        rows.forEach(col => {
            console.log(`  ${col.name}: ${col.type}`);
        });
        
        db.all("SELECT id, name FROM users LIMIT 3", (err, rows) => {
            if (err) {
                console.error('Error:', err);
                process.exit(1);
            }
            
            console.log('\nFirst 3 users:');
            rows.forEach(user => {
                console.log(`  ${user.id}: ${user.name}`);
            });
            
            db.close();
            process.exit(0);
        });
    });
});
