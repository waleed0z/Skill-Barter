const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const skillRoutes = require('./routes/skill.routes');
const creditRoutes = require('./routes/credit.routes');
const availabilityRoutes = require('./routes/availability.routes');
const sessionRoutes = require('./routes/session.routes');
const ratingRoutes = require('./routes/rating.routes');
const matchingRoutes = require('./routes/matching.routes');
const invitationRoutes = require('./routes/invitation.routes');
const swaggerDocument = YAML.load('./src/docs/swagger.yaml');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/auth', authRoutes);
app.use('/skills', skillRoutes);
app.use('/credits', creditRoutes);
app.use('/availability', availabilityRoutes);
app.use('/sessions', sessionRoutes);
app.use('/ratings', ratingRoutes);
app.use('/matching', matchingRoutes);
app.use('/invitations', invitationRoutes);

app.get('/', (req, res) => {
    res.send('SkillBarter Backend is running');
});

module.exports = app;
