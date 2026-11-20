const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Disease code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Disease name is required'],
      unique: true,
      trim: true,
      maxlength: [150, 'Disease name cannot exceed 150 characters'],
    },
    category: {
      type: String,
      trim: true,
      default: 'General Medicine',
    },
    description: {
      type: String,
      required: [true, 'Disease description is required'],
      trim: true,
    },
    commonSymptoms: {
      type: [String],
      default: [],
    },
    associatedTestFindings: {
      type: [String],
      default: [],
    },
    relevantMedicalHistory: {
      type: [String],
      default: [],
    },
    riskFactors: {
      type: [String],
      default: [],
    },
    clinicalReferenceInfo: {
      type: String,
      required: [true, 'Clinical reference information is required'],
      trim: true,
    },
    recommendedNextSteps: {
      type: [String],
      default: [],
    },
    isDemonstrationData: {
      type: Boolean,
      default: true,
    },
    reviewStatus: {
      type: String,
      enum: [
        'Educational Demonstration (Non-Clinical)',
        'Expert Reviewed (Demonstration)',
        'Draft',
      ],
      default: 'Educational Demonstration (Non-Clinical)',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },
  },
  {
    timestamps: true,
  }
);

diseaseSchema.index({ name: 'text', category: 'text', description: 'text' });

module.exports = mongoose.model('Disease', diseaseSchema);
