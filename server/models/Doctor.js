const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: ['doctor', 'medical_expert', 'admin'],
      default: 'doctor',
    },
    specialization: {
      type: String,
      trim: true,
      default: 'General Medicine',
      maxlength: [100, 'Specialization cannot exceed 100 characters'],
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: '',
      maxlength: [60, 'License number cannot exceed 60 characters'],
    },
  },
  {
    timestamps: true,
  }
);

doctorSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

doctorSchema.methods.comparePassword = async function comparePassword(
  candidatePassword
) {
  return bcrypt.compare(candidatePassword, this.password);
};

doctorSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    specialization: this.specialization,
    licenseNumber: this.licenseNumber,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('Doctor', doctorSchema);
