const Patient = require('../models/Patient');
const Diagnosis = require('../models/Diagnosis');
const TestResult = require('../models/TestResult');

function normalizeStringArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((v) => String(v).trim()).filter(Boolean);
  }
  return String(input)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

async function createPatient(req, res, next) {
  try {
    const {
      name,
      age,
      gender,
      contactNumber,
      bloodGroup,
      existingConditions,
      previousMedicalHistory,
      currentMedications,
      knownAllergies,
    } = req.body;

    const patient = await Patient.create({
      name: name.trim(),
      age: Number(age),
      gender,
      contactNumber: contactNumber.trim(),
      bloodGroup: bloodGroup || 'Unknown',
      existingConditions: normalizeStringArray(existingConditions),
      previousMedicalHistory: previousMedicalHistory?.trim() || '',
      currentMedications: normalizeStringArray(currentMedications),
      knownAllergies: normalizeStringArray(knownAllergies),
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      data: patient,
    });
  } catch (err) {
    next(err);
  }
}

async function getPatients(req, res, next) {
  try {
    const { search = '', limit = 50, page = 1 } = req.query;
    const query = {};

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { patientId: regex },
        { name: regex },
        { contactNumber: regex },
        { existingConditions: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const [patients, total] = await Promise.all([
      Patient.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('createdBy', 'name specialization')
        .lean(),
      Patient.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: patients,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getPatientById(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('createdBy', 'name specialization')
      .lean();

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found.',
      });
    }

    const [diagnoses, recentTests] = await Promise.all([
      Diagnosis.find({ patient: patient._id })
        .sort({ createdAt: -1 })
        .populate('doctor', 'name specialization')
        .populate('symptomRecord')
        .lean(),
      TestResult.find({ patient: patient._id })
        .sort({ testDate: -1, createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        patient,
        diagnoses,
        recentTests,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updatePatient(req, res, next) {
  try {
    const allowedFields = [
      'name',
      'age',
      'gender',
      'contactNumber',
      'bloodGroup',
      'previousMedicalHistory',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] =
          field === 'age'
            ? Number(req.body[field])
            : typeof req.body[field] === 'string'
            ? req.body[field].trim()
            : req.body[field];
      }
    }

    if (req.body.existingConditions !== undefined) {
      updates.existingConditions = normalizeStringArray(req.body.existingConditions);
    }
    if (req.body.currentMedications !== undefined) {
      updates.currentMedications = normalizeStringArray(req.body.currentMedications);
    }
    if (req.body.knownAllergies !== undefined) {
      updates.knownAllergies = normalizeStringArray(req.body.knownAllergies);
    }

    const patient = await Patient.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found.',
      });
    }

    res.json({
      success: true,
      message: 'Patient details updated successfully.',
      data: patient,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
};
