const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitation.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Send an invitation
router.post('/', invitationController.sendInvitation);

// Get user's invitations
router.get('/', invitationController.getUserInvitations);

// Respond to an invitation
router.put('/:invitationId/respond', invitationController.respondToInvitation);

module.exports = router;