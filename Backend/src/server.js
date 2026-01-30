require('dotenv').config();
const app = require('./app');
const { verifyConnection } = require('./config/db');

const PORT = process.env.PORT || 8080;

const startServer = async () => {
    try {
        await verifyConnection();
        const host = process.env.HOST || '0.0.0.0';

        app.listen(PORT, host, () => {
            console.log(`Server running on ${host}:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
