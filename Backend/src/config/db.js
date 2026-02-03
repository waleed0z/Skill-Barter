const { db, createTables } = require('./db.sqlite');

// Verify connection by running a simple query
const verifyConnection = async () => {
    // First, create the tables if they don't exist
    await createTables();

    return new Promise((resolve, reject) => {
        // Test the connection by running a simple query
        db.get('SELECT 1 as test', (err, row) => {
            if (err) {
                console.error('SQLite connection failed:', err);
                reject(err);
            } else {
                console.log('Connected to SQLite database');
                resolve(row);
            }
        });
    });
};

module.exports = { db, verifyConnection };
