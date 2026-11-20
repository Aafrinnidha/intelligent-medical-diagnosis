const TestResult = require('../models/TestResult');
const Patient = require('../models/Patient');

async function submitTestResults(req, res, next) {
  try {
    const { patientId, diagnosisId = null, tests } = req.body;

    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    const testArray = Array.isArray(tests) ? tests : [req.body];
    const created = [];

    for (const item of testArray) {
      if (!item.testName || item.value === undefined || item.value === '') {
        continue;
      }
      const doc = await TestResult.create({
        patient: patient._id,
        doctor: req.user._id,
        diagnosis: diagnosisId || null,
        testName: String(item.testName).trim(),
        testKey: item.testKey || '',
        value: String(item.value).trim(),
        unit: item.unit ? String(item.unit).trim() : '',
        referenceRange: item.referenceRange ? String(item.referenceRange).trim() : '',
        referenceMin:
          item.referenceMin !== '' && item.referenceMin != null
            ? Number(item.referenceMin)
            : null,
        referenceMax:
          item.referenceMax !== '' && item.referenceMax != null
            ? Number(item.referenceMax)
            : null,
        testDate: item.testDate ? new Date(item.testDate) : new Date(),
      });
      created.push(doc);
    }

    if (created.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid medical test result (testName and value) is required.',
      });
    }

    res.status(201).json({
      success: true,
      message: `${created.length} medical test result(s) saved.`,
      data: created,
    });
  } catch (err) {
    next(err);
  }
}

async function getTestResultsByPatient(req, res, next) {
  try {
    const tests = await TestResult.find({ patient: req.params.patientId })
      .sort({ testDate: -1, createdAt: -1 })
      .populate('doctor', 'name specialization')
      .lean();

    res.json({
      success: true,
      data: tests,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitTestResults,
  getTestResultsByPatient,
};
