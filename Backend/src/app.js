const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const skillRoutes = require('./routes/skill.routes');
const creditRoutes = require('./routes/credit.routes');
const swaggerDocument = YAML.load('./src/docs/swagger.yaml');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from the Frontend directory
app.use(express.static(path.join(__dirname, '../../Frontend')));

// API Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/auth', authRoutes);
app.use('/skills', skillRoutes);
app.use('/credits', creditRoutes);

// Catch-all handler: serve frontend for non-API routes
app.get('*', (req, res) => {
    // If it's an API route, let it fall through to return a 404 or be handled by routes
    if (
        req.path.startsWith('/auth') ||
        req.path.startsWith('/skills') ||
        req.path.startsWith('/credits') ||
        req.path.startsWith('/api-docs')
    ) {
        // Return a 404 for unmatched API routes
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        // Serve the frontend for all other routes
        res.sendFile(path.join(__dirname, '../../Frontend/index.html'));
    }
});

module.exports = app;
