const express = require('express');
const router = express.Router();
const creditController = require('../controllers/credit.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/balance', creditController.getBalance);
router.get('/history', creditController.getHistory);

module.exports = router;
