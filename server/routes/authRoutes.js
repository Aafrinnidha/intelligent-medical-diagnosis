const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  registerDoctor,
  loginDoctor,
  getCurrentDoctor,
  logoutDoctor,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validateMiddleware');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Full name (2-100 chars) is required.'),
    body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long.'),
    body('specialization').optional().trim().isLength({ max: 100 }),
    body('licenseNumber').optional().trim().isLength({ max: 60 }),
  ],
  handleValidationErrors,
  registerDoctor
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Valid email address is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  handleValidationErrors,
  loginDoctor
);

router.get('/me', protect, getCurrentDoctor);
router.post('/logout', protect, logoutDoctor);

module.exports = router;
