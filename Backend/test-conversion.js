const { db } = require('./src/config/db.sqlite');

// Test how the boolean conversion works
db.get('SELECT * FROM users WHERE email = ?', ['test@example.com'], (err, row) => {
    if (err) {
        console.error('Error:', err.message);
    } else {
        console.log('Raw row:', row);
        console.log('isVerified value:', row.isVerified);
        console.log('Type of isVerified:', typeof row.isVerified);
        console.log('Boolean(isVerified):', Boolean(row.isVerified));
        console.log('isVerified == true:', row.isVerified == true);
        console.log('isVerified === true:', row.isVerified === true);
        
        // Apply the same conversion as in the user model
        if (row) {
            row.isVerified = Boolean(row.isVerified);
        }
        console.log('After conversion:', row.isVerified);
        console.log('Type after conversion:', typeof row.isVerified);
    }
    
    db.close();
});