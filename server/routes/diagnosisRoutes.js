const express = require('express');
const { body, param } = require('express-validator');
const {
  createDiagnosis,
  listDiagnoses,
  getDiagnosisById,
  verifyDiagnosis,
  generateDiagnosisPdfReport,
} = require('../controllers/diagnosisController');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [
    body('patientId').isMongoId().withMessage('Please select a valid patient.'),
    body('severity').optional().isIn(['Mild', 'Moderate', 'Severe']),
    body('vitals.temperature')
      .optional({ values: 'falsy' })
      .isFloat({ min: 30, max: 45 })
      .withMessage('Temperature must be between 30°C and 45°C.'),
    body('vitals.systolicBP')
      .optional({ values: 'falsy' })
      .isFloat({ min: 40, max: 300 })
      .withMessage('Systolic BP must be between 40 and 300 mmHg.'),
    body('vitals.diastolicBP')
      .optional({ values: 'falsy' })
      .isFloat({ min: 20, max: 200 })
      .withMessage('Diastolic BP must be between 20 and 200 mmHg.'),
    body('vitals.heartRate')
      .optional({ values: 'falsy' })
      .isFloat({ min: 20, max: 250 })
      .withMessage('Heart rate must be between 20 and 250 bpm.'),
    body('vitals.oxygenSaturation')
      .optional({ values: 'falsy' })
      .isFloat({ min: 40, max: 100 })
      .withMessage('Oxygen saturation (SpO2) must be between 40% and 100%.'),
  ],
  handleValidationErrors,
  createDiagnosis
);

router.get('/', listDiagnoses);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid diagnosis ID.')],
  handleValidationErrors,
  getDiagnosisById
);

router.patch(
  '/:id/verify',
  [
    param('id').isMongoId().withMessage('Invalid diagnosis ID.'),
    body('status')
      .isIn(['Pending Review', 'Reviewed & Noted', 'Verified by Doctor', 'Dismissed'])
      .withMessage('Invalid verification status.'),
  ],
  handleValidationErrors,
  verifyDiagnosis
);

router.get(
  '/:id/report',
  [param('id').isMongoId().withMessage('Invalid diagnosis ID.')],
  handleValidationErrors,
  generateDiagnosisPdfReport
);

module.exports = router;
