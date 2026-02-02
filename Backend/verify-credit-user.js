const { db } = require('./src/config/db.sqlite');

// Manually verify the test user
db.run('UPDATE users SET is_verified = 1 WHERE email = ?', ['credit@test.com'], function(err) {
    if (err) {
        console.error('Error updating user verification status:', err.message);
    } else {
        console.log('Credit test user verification status updated successfully');
        console.log('Rows affected:', this.changes);
    }
    
    // Close the database connection
    db.close();
});