const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/rating.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Get user's ratings
router.get('/', ratingController.getUserRatings);

// Get user's average rating
router.get('/average', ratingController.getUserAverageRating);

// Submit a rating
router.post('/', ratingController.submitRating);

module.exports = router;