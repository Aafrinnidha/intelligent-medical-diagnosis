const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');

function signToken(doctor) {
  return jwt.sign(
    {
      id: doctor._id,
      email: doctor.email,
      role: doctor.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '12h',
    }
  );
}

async function registerDoctor(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      specialization,
      licenseNumber,
      requestExpertRole,
      expertCode,
    } = req.body;

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await Doctor.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address is already registered.',
      });
    }

    let role = 'doctor';
    if (requestExpertRole) {
      const configuredCode = process.env.EXPERT_REGISTRATION_CODE;
      if (!configuredCode || !expertCode || expertCode.trim() !== configuredCode) {
        return res.status(403).json({
          success: false,
          message:
            'Invalid or missing Medical Expert authorization code. Leave expert role unchecked to register as a standard doctor.',
        });
      }
      role = 'medical_expert';
    }

    const doctor = await Doctor.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      specialization: specialization?.trim() || 'General Medicine',
      licenseNumber: licenseNumber?.trim() || '',
    });

    const token = signToken(doctor);

    res.status(201).json({
      success: true,
      message: 'Doctor account created successfully.',
      token,
      doctor: doctor.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
}

async function loginDoctor(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    const doctor = await Doctor.findOne({ email: normalizedEmail }).select('+password');
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = signToken(doctor);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      doctor: doctor.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
}

async function getCurrentDoctor(req, res) {
  res.json({
    success: true,
    doctor: req.user.toSafeObject(),
  });
}

async function logoutDoctor(req, res) {
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
}

module.exports = {
  registerDoctor,
  loginDoctor,
  getCurrentDoctor,
  logoutDoctor,
};
