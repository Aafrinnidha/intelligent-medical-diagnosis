const mongoose = require('mongoose');
const crypto = require('crypto');

function generatePatientId() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PAT-${datePart}-${randomPart}`;
}

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      minlength: [2, 'Patient name must be at least 2 characters'],
      maxlength: [120, 'Patient name cannot exceed 120 characters'],
    },
    age: {
      type: Number,
      required: [true, 'Patient age is required'],
      min: [0, 'Age cannot be negative'],
      max: [130, 'Age cannot exceed 130'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['Male', 'Female', 'Other'],
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
      maxlength: [30, 'Contact number cannot exceed 30 characters'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    existingConditions: {
      type: [String],
      default: [],
    },
    previousMedicalHistory: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Medical history cannot exceed 2000 characters'],
    },
    currentMedications: {
      type: [String],
      default: [],
    },
    knownAllergies: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.pre('validate', function ensurePatientId(next) {
  if (!this.patientId) {
    this.patientId = generatePatientId();
  }
  next();
});

patientSchema.index({ name: 'text', patientId: 'text' });
patientSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Patient', patientSchema);
