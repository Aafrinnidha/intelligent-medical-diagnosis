const mongoose = require('mongoose');

const ruleConditionSchema = new mongoose.Schema(
  {
    factType: {
      type: String,
      required: true,
      enum: [
        'symptom',
        'vital',
        'lab',
        'history',
        'demographic',
        'severity',
        'duration',
      ],
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    operator: {
      type: String,
      required: true,
      enum: [
        'present',
        'absent',
        'gte',
        'lte',
        'gt',
        'lt',
        'eq',
        'between',
        'below_ref',
        'above_ref',
        'abnormal',
        'includes',
        'in',
      ],
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    unit: {
      type: String,
      trim: true,
      default: '',
    },
    weight: {
      type: Number,
      default: 1,
      min: 0.1,
      max: 10,
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const medicalRuleSchema = new mongoose.Schema(
  {
    ruleCode: {
      type: String,
      required: [true, 'Rule code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Rule name is required'],
      trim: true,
      maxlength: [160, 'Rule name cannot exceed 160 characters'],
    },
    description: {
      type: String,
      required: [true, 'Rule description is required'],
      trim: true,
    },
    disease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disease',
      required: [true, 'Associated disease is required'],
    },
    ruleType: {
      type: String,
      enum: ['condition_consideration', 'clinical_flag'],
      default: 'condition_consideration',
    },
    conditions: {
      type: [ruleConditionSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'A production rule must contain at least one IF condition',
      },
    },
    minConditionsToTrigger: {
      type: Number,
      default: 2,
      min: 1,
    },
    conclusion: {
      type: String,
      required: [true, 'THEN conclusion statement is required'],
      trim: true,
    },
    additionalInfoRequired: {
      type: [String],
      default: [],
    },
    suggestedNextSteps: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDemonstrationRule: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
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

medicalRuleSchema.index({ disease: 1, isActive: 1 });

module.exports = mongoose.model('MedicalRule', medicalRuleSchema);
