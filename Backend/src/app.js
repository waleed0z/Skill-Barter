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
app.use(express.static(path.join(process.cwd(), 'Frontend')));

// API Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/auth', authRoutes);
app.use('/skills', skillRoutes);
app.use('/credits', creditRoutes);

// Catch-all handler: serve frontend for non-API routes
app.get(/^(?!\/auth|\/skills|\/credits|\/api-docs).*$/, (req, res) => {
    // Serve the frontend for all routes that don't match API routes
    res.sendFile(path.join(process.cwd(), 'Frontend', 'index.html'));
});

module.exports = app;
