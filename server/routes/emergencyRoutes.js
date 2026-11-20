const express = require('express');
const { evaluateEmergency } = require('../controllers/emergencyController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/evaluate', protect, evaluateEmergency);

module.exports = router;
