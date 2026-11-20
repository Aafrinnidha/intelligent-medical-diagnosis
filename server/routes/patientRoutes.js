const express = require('express');
const { body, param } = require('express-validator');
const {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
} = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

const patientValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Patient name (2-120 characters) is required.'),
  body('age')
    .isFloat({ min: 0, max: 130 })
    .withMessage('Valid patient age (0-130) is required.'),
  body('gender')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other.'),
  body('contactNumber')
    .trim()
    .isLength({ min: 5, max: 30 })
    .withMessage('Valid contact number is required.'),
  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'])
    .withMessage('Invalid blood group.'),
];

router.post('/', patientValidation, handleValidationErrors, createPatient);
router.get('/', getPatients);
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid patient ID.')],
  handleValidationErrors,
  getPatientById
);
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid patient ID.'),
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('age').optional().isFloat({ min: 0, max: 130 }),
    body('gender').optional().isIn(['Male', 'Female', 'Other']),
    body('contactNumber').optional().trim().isLength({ min: 5, max: 30 }),
    body('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']),
  ],
  handleValidationErrors,
  updatePatient
);

module.exports = router;
