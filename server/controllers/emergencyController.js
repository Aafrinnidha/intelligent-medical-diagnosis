const Patient = require('../models/Patient');
const { evaluateEmergencyAlert } = require('../services/emergencyAlertService');

async function evaluateEmergency(req, res, next) {
  try {
    const {
      patientId,
      selectedSymptoms = [],
      additionalSymptoms = [],
      severity = 'Moderate',
      vitals = {},
      testResults = [],
    } = req.body;

    let patient = {};
    if (patientId) {
      const found = await Patient.findById(patientId).select('age gender existingConditions').lean();
      if (found) patient = found;
    }

    const alert = evaluateEmergencyAlert({
      selectedSymptoms,
      additionalSymptoms,
      severity,
      vitals,
      testResults,
      patient,
    });

    res.json({
      success: true,
      data: alert,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  evaluateEmergency,
};
