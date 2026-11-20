const express = require('express');
const { body, param } = require('express-validator');
const {
  listDiseases,
  createDisease,
  updateDisease,
  deleteDisease,
  listRules,
  createRule,
  updateRule,
  deleteRule,
} = require('../controllers/knowledgeBaseController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

const expertOnly = authorize('admin', 'medical_expert');

// Disease endpoints
router.get('/diseases', listDiseases);

router.post(
  '/diseases',
  expertOnly,
  [
    body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Disease name is required.'),
    body('description').trim().isLength({ min: 5 }).withMessage('Disease description is required.'),
    body('clinicalReferenceInfo')
      .trim()
      .isLength({ min: 5 })
      .withMessage('Clinical reference information is required.'),
  ],
  handleValidationErrors,
  createDisease
);

router.put(
  '/diseases/:id',
  expertOnly,
  [param('id').isMongoId().withMessage('Invalid disease ID.')],
  handleValidationErrors,
  updateDisease
);

router.delete(
  '/diseases/:id',
  expertOnly,
  [param('id').isMongoId().withMessage('Invalid disease ID.')],
  handleValidationErrors,
  deleteDisease
);

// Medical Rule endpoints
router.get('/rules', listRules);

router.post(
  '/rules',
  expertOnly,
  [
    body('ruleCode').trim().isLength({ min: 3, max: 40 }).withMessage('Rule code is required.'),
    body('name').trim().isLength({ min: 3, max: 160 }).withMessage('Rule name is required.'),
    body('description').trim().isLength({ min: 5 }).withMessage('Rule description is required.'),
    body('disease').isMongoId().withMessage('Valid disease ID is required.'),
    body('conditions')
      .isArray({ min: 1 })
      .withMessage('At least one structured IF condition is required.'),
    body('conclusion').trim().isLength({ min: 5 }).withMessage('THEN conclusion is required.'),
  ],
  handleValidationErrors,
  createRule
);

router.put(
  '/rules/:id',
  expertOnly,
  [param('id').isMongoId().withMessage('Invalid rule ID.')],
  handleValidationErrors,
  updateRule
);

router.delete(
  '/rules/:id',
  expertOnly,
  [param('id').isMongoId().withMessage('Invalid rule ID.')],
  handleValidationErrors,
  deleteRule
);

module.exports = router;
