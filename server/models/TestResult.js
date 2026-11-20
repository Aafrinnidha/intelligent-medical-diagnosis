const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema(
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
    diagnosis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Diagnosis',
      default: null,
    },
    testName: {
      type: String,
      required: [true, 'Test name is required'],
      trim: true,
      maxlength: [120, 'Test name cannot exceed 120 characters'],
    },
    testKey: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    value: {
      type: String,
      required: [true, 'Test value is required'],
      trim: true,
    },
    numericValue: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      trim: true,
      default: '',
    },
    referenceRange: {
      type: String,
      trim: true,
      default: '',
    },
    referenceMin: {
      type: Number,
      default: null,
    },
    referenceMax: {
      type: Number,
      default: null,
    },
    interpretation: {
      type: String,
      enum: ['Normal', 'Low', 'High', 'Abnormal', 'Not Evaluated'],
      default: 'Not Evaluated',
    },
    testDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

testResultSchema.pre('validate', function normalizeTestResult(next) {
  if (this.testName && !this.testKey) {
    this.testKey = this.testName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Parse numeric value if present
  if (this.value !== undefined && this.value !== null && this.numericValue === null) {
    const parsed = parseFloat(String(this.value).replace(/,/g, ''));
    if (!Number.isNaN(parsed) && /^[-+]?\d*\.?\d+$/.test(String(this.value).trim())) {
      this.numericValue = parsed;
    }
  }

  // Parse referenceRange min/max if not explicitly set (e.g., "12.0 - 16.0" or "70-99")
  if (this.referenceRange && (this.referenceMin === null || this.referenceMax === null)) {
    const rangeMatch = this.referenceRange.match(
      /(\d+(?:\.\d+)?)\s*(?:-|to|–)\s*(\d+(?:\.\d+)?)/i
    );
    if (rangeMatch) {
      if (this.referenceMin === null) this.referenceMin = parseFloat(rangeMatch[1]);
      if (this.referenceMax === null) this.referenceMax = parseFloat(rangeMatch[2]);
    } else {
      const ltMatch = this.referenceRange.match(/(?:<|<=|below|under)\s*(\d+(?:\.\d+)?)/i);
      const gtMatch = this.referenceRange.match(/(?:>|>=|above|over)\s*(\d+(?:\.\d+)?)/i);
      if (ltMatch && this.referenceMax === null) {
        this.referenceMax = parseFloat(ltMatch[1]);
      }
      if (gtMatch && this.referenceMin === null) {
        this.referenceMin = parseFloat(gtMatch[1]);
      }
    }
  }

  // Compute interpretation without inventing missing reference bounds
  if (this.numericValue !== null) {
    if (this.referenceMin !== null && this.numericValue < this.referenceMin) {
      this.interpretation = 'Low';
    } else if (this.referenceMax !== null && this.numericValue > this.referenceMax) {
      this.interpretation = 'High';
    } else if (this.referenceMin !== null || this.referenceMax !== null) {
      this.interpretation = 'Normal';
    } else {
      this.interpretation = 'Not Evaluated';
    }
  } else if (this.value) {
    const lowerVal = String(this.value).toLowerCase();
    if (['positive', 'abnormal', 'detected', 'reactive', 'elevated'].includes(lowerVal)) {
      this.interpretation = 'Abnormal';
    } else if (['negative', 'normal', 'clear', 'non-reactive'].includes(lowerVal)) {
      this.interpretation = 'Normal';
    }
  }

  next();
});

testResultSchema.index({ patient: 1, testDate: -1 });
testResultSchema.index({ diagnosis: 1 });

module.exports = mongoose.model('TestResult', testResultSchema);
