const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema(
  {
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
    selectedSymptoms: {
      type: [String],
      default: [],
    },
    additionalSymptoms: {
      type: [String],
      default: [],
    },
    duration: {
      value: {
        type: Number,
        min: 0,
        default: null,
      },
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks', 'months'],
        default: 'days',
      },
    },
    severity: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe'],
      default: 'Moderate',
    },
    vitals: {
      temperature: { type: Number, default: null }, // Celsius
      systolicBP: { type: Number, default: null }, // mmHg
      diastolicBP: { type: Number, default: null }, // mmHg
      heartRate: { type: Number, default: null }, // bpm
      oxygenSaturation: { type: Number, default: null }, // %
    },
    clinicalNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Clinical notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

symptomSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('Symptom', symptomSchema);
