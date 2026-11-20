const Patient = require('../models/Patient');
const Diagnosis = require('../models/Diagnosis');
const Disease = require('../models/Disease');
const MedicalRule = require('../models/MedicalRule');

async function getDashboardSummary(req, res, next) {
  try {
    const [
      totalPatients,
      totalDiagnoses,
      totalDiseases,
      activeRules,
      recentPatients,
      recentDiagnoses,
      urgentAlertsCount,
    ] = await Promise.all([
      Patient.countDocuments(),
      Diagnosis.countDocuments(),
      Disease.countDocuments(),
      MedicalRule.countDocuments({ isActive: true }),
      Patient.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('patientId name age gender bloodGroup existingConditions createdAt')
        .lean(),
      Diagnosis.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('patient', 'patientId name age gender')
        .populate('doctor', 'name specialization')
        .select(
          'diagnosisCode patientSnapshot emergencyAlert inferenceSummary.possibleConditions inferenceSummary.clinicalFlags doctorVerification createdAt'
        )
        .lean(),
      Diagnosis.countDocuments({ 'emergencyAlert.level': { $in: ['RED', 'ORANGE'] } }),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalPatients,
          totalDiagnoses,
          totalDiseases,
          activeRules,
          urgentAlertsCount,
        },
        recentPatients,
        recentDiagnoses,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardSummary,
};
