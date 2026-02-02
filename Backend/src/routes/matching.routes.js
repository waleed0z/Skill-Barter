const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matching.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Find matches based on skills
router.get('/find', matchingController.findMatches);

// Find potential mutual exchanges
router.get('/mutual', matchingController.findMutualExchanges);

module.exports = router;