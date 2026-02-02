const { db } = require('./src/config/db');

console.log('Testing database connection...');

db.serialize(() => {
    // Test inserting a simple record
    const stmt = db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)');
    stmt.run(['test-id', 'Test User', 'test@example.com', 'hashed_password'], function(err) {
        if (err) {
            console.error('Error inserting test record:', err.message);
        } else {
            console.log('Test record inserted successfully with ID:', this.lastID);
        }
    });
    stmt.finalize();

    // Query the record back
    db.each('SELECT * FROM users WHERE email = ?', ['test@example.com'], (err, row) => {
        if (err) {
            console.error('Error querying record:', err.message);
        } else {
            console.log('Retrieved record:', row);
        }
    });
});