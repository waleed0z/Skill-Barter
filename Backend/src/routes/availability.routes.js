const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availability.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Get user's availability
router.get('/', availabilityController.getUserAvailability);

// Set user's availability
router.post('/', availabilityController.setUserAvailability);

// Remove availability slot
router.delete('/:id', availabilityController.removeAvailability);

// Set availability as unavailable
router.put('/:id/unavailable', availabilityController.setUnavailable);

module.exports = router;