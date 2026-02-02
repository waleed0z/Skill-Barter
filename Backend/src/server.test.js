require('dotenv').config();
const app = require('./app');
// Using mock database connection for testing
const { verifyConnection } = require('./config/db.mock');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await verifyConnection();
        app.listen(PORT, () => {
            console.log(`Test server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start test server:', error);
        process.exit(1);
    }
};

startServer();