const express = require('express');
const { body, param } = require('express-validator');
const {
  submitSymptoms,
  getSymptomsByPatient,
} = require('../controllers/symptomController');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [
    body('patientId').isMongoId().withMessage('Valid patientId is required.'),
    body('severity').optional().isIn(['Mild', 'Moderate', 'Severe']),
  ],
  handleValidationErrors,
  submitSymptoms
);

router.get(
  '/patient/:patientId',
  [param('patientId').isMongoId().withMessage('Invalid patientId.')],
  handleValidationErrors,
  getSymptomsByPatient
);

module.exports = router;
