const express = require('express');
const { body, param } = require('express-validator');
const {
  submitTestResults,
  getTestResultsByPatient,
} = require('../controllers/testResultController');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [body('patientId').isMongoId().withMessage('Valid patientId is required.')],
  handleValidationErrors,
  submitTestResults
);

router.get(
  '/patient/:patientId',
  [param('patientId').isMongoId().withMessage('Invalid patientId.')],
  handleValidationErrors,
  getTestResultsByPatient
);

module.exports = router;
