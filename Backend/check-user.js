const { db } = require('./src/config/db.sqlite');

// Check the user's verification status
db.get('SELECT id, email, is_verified FROM users WHERE email = ?', ['test@example.com'], (err, row) => {
    if (err) {
        console.error('Error querying user:', err.message);
    } else {
        console.log('User data:', row);
    }
    
    // Close the database connection
    db.close();
});