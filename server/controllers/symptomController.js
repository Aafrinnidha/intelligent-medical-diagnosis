const Symptom = require('../models/Symptom');
const Patient = require('../models/Patient');
const { evaluateEmergencyAlert } = require('../services/emergencyAlertService');

async function submitSymptoms(req, res, next) {
  try {
    const {
      patientId,
      selectedSymptoms = [],
      additionalSymptoms = [],
      duration = {},
      severity = 'Moderate',
      vitals = {},
      clinicalNotes = '',
    } = req.body;

    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Selected patient not found.',
      });
    }

    // Immediate emergency safety evaluation before anything else
    const emergencyAlert = evaluateEmergencyAlert({
      selectedSymptoms,
      additionalSymptoms,
      severity,
      vitals,
      patient,
    });

    const symptomRecord = await Symptom.create({
      patient: patient._id,
      doctor: req.user._id,
      selectedSymptoms,
      additionalSymptoms,
      duration: {
        value:
          duration.value !== undefined && duration.value !== '' && duration.value !== null
            ? Number(duration.value)
            : null,
        unit: duration.unit || 'days',
      },
      severity,
      vitals: {
        temperature: vitals.temperature !== '' && vitals.temperature != null ? Number(vitals.temperature) : null,
        systolicBP: vitals.systolicBP !== '' && vitals.systolicBP != null ? Number(vitals.systolicBP) : null,
        diastolicBP: vitals.diastolicBP !== '' && vitals.diastolicBP != null ? Number(vitals.diastolicBP) : null,
        heartRate: vitals.heartRate !== '' && vitals.heartRate != null ? Number(vitals.heartRate) : null,
        oxygenSaturation:
          vitals.oxygenSaturation !== '' && vitals.oxygenSaturation != null
            ? Number(vitals.oxygenSaturation)
            : null,
      },
      clinicalNotes,
    });

    res.status(201).json({
      success: true,
      message: 'Symptom record saved.',
      data: symptomRecord,
      emergencyAlert,
    });
  } catch (err) {
    next(err);
  }
}

async function getSymptomsByPatient(req, res, next) {
  try {
    const records = await Symptom.find({ patient: req.params.patientId })
      .sort({ createdAt: -1 })
      .populate('doctor', 'name specialization')
      .lean();

    res.json({
      success: true,
      data: records,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitSymptoms,
  getSymptomsByPatient,
};
