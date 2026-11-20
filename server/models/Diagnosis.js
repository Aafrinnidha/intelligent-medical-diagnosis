const mongoose = require('mongoose');
const crypto = require('crypto');

function generateDiagnosisCode() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `DX-${datePart}-${randomPart}`;
}

const evaluationItemSchema = new mongoose.Schema(
  {
    diseaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Disease' },
    diseaseName: String,
    diseaseCategory: String,
    diseaseDescription: String,
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRule' },
    ruleCode: String,
    ruleName: String,
    ruleType: String,
    evidenceMatchingScore: Number,
    matchedWeight: Number,
    totalWeight: Number,
    matchedCount: Number,
    totalCriteriaCount: Number,
    scoreLabel: String,
    scoreExplanation: String,
    conclusion: String,
    matchingEvidence: [String],
    unmatchedEvidence: [String],
    conflictingEvidence: [String],
    missingEvidence: [String],
    additionalInfoRequired: [String],
    suggestedNextSteps: [String],
    clinicalReferenceInfo: String,
    ifThenTrace: String,
    isDemonstrationRule: { type: Boolean, default: true },
  },
  { _id: false }
);

const diagnosisSchema = new mongoose.Schema(
  {
    diagnosisCode: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
    },
    symptomRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Symptom',
      required: true,
    },
    testResults: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestResult',
      },
    ],
    patientSnapshot: {
      patientId: String,
      name: String,
      age: Number,
      gender: String,
      bloodGroup: String,
      existingConditions: [String],
      previousMedicalHistory: String,
      currentMedications: [String],
      knownAllergies: [String],
    },
    emergencyAlert: {
      level: {
        type: String,
        enum: ['RED', 'ORANGE', 'GREEN'],
        required: true,
      },
      headline: { type: String, required: true },
      safetyNote: { type: String, required: true },
      triggeredCriteria: [String],
      evaluatedAt: { type: Date, default: Date.now },
    },
    inferenceSummary: {
      possibleConditions: [evaluationItemSchema],
      clinicalFlags: [evaluationItemSchema],
      derivedFacts: [String],
      missingInformation: [String],
      conflictingEvidenceSummary: [String],
      suggestedNextSteps: [String],
      rulesEvaluatedCount: { type: Number, default: 0 },
      rulesTriggeredCount: { type: Number, default: 0 },
      disclaimer: {
        type: String,
        default:
          'This system provides clinical decision support only. Final diagnosis and treatment decisions must be made by a qualified healthcare professional.',
      },
    },
    doctorVerification: {
      status: {
        type: String,
        enum: [
          'Pending Review',
          'Reviewed & Noted',
          'Verified by Doctor',
          'Dismissed',
        ],
        default: 'Pending Review',
      },
      finalClinicalImpression: { type: String, trim: true, default: '' },
      doctorNotes: { type: String, trim: true, default: '' },
      verifiedAt: { type: Date, default: null },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

diagnosisSchema.pre('validate', function ensureDiagnosisCode(next) {
  if (!this.diagnosisCode) {
    this.diagnosisCode = generateDiagnosisCode();
  }
  next();
});

diagnosisSchema.index({ patient: 1, createdAt: -1 });
diagnosisSchema.index({ doctor: 1, createdAt: -1 });
diagnosisSchema.index({ 'patientSnapshot.patientId': 1 });
diagnosisSchema.index({ 'patientSnapshot.name': 1 });

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
