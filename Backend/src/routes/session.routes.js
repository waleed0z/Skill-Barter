const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Get user's sessions
router.get('/', sessionController.getUserSessions);

// Schedule a new session
router.post('/', sessionController.scheduleSession);

// Update session status
router.put('/:sessionId/status', sessionController.updateSessionStatus);

// Join a session via Jitsi
router.get('/:sessionId/join', sessionController.joinSession);

module.exports = router;