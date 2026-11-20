const PDFDocument = require('pdfkit');
const Patient = require('../models/Patient');
const Symptom = require('../models/Symptom');
const TestResult = require('../models/TestResult');
const Diagnosis = require('../models/Diagnosis');
const { evaluateEmergencyAlert } = require('../services/emergencyAlertService');
const { getActiveRulesWithDiseases } = require('../services/knowledgeBaseService');
const { runInference } = require('../services/inferenceEngine');

function toNullableNumber(v) {
  if (v === '' || v === null || v === undefined) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

async function createDiagnosis(req, res, next) {
  try {
    const {
      patientId,
      selectedSymptoms = [],
      additionalSymptoms = [],
      duration = {},
      severity = 'Moderate',
      vitals = {},
      clinicalNotes = '',
      testResults = [],
    } = req.body;

    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found.',
      });
    }

    const cleanSelected = Array.isArray(selectedSymptoms)
      ? selectedSymptoms.map((s) => String(s).trim()).filter(Boolean)
      : [];
    const cleanAdditional = Array.isArray(additionalSymptoms)
      ? additionalSymptoms.map((s) => String(s).trim()).filter(Boolean)
      : typeof additionalSymptoms === 'string'
      ? additionalSymptoms
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const cleanVitals = {
      temperature: toNullableNumber(vitals.temperature),
      systolicBP: toNullableNumber(vitals.systolicBP),
      diastolicBP: toNullableNumber(vitals.diastolicBP),
      heartRate: toNullableNumber(vitals.heartRate),
      oxygenSaturation: toNullableNumber(vitals.oxygenSaturation),
    };

    const validRawTests = (Array.isArray(testResults) ? testResults : []).filter(
      (t) => t && String(t.testName || '').trim() && String(t.value ?? '').trim() !== ''
    );

    if (
      cleanSelected.length === 0 &&
      cleanAdditional.length === 0 &&
      validRawTests.length === 0 &&
      Object.values(cleanVitals).every((v) => v === null)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide symptoms, vital signs, or medical test results to run clinical decision support.',
      });
    }

    // 1. IMMEDIATE Emergency Safety Screening (never waits for inference engine)
    const emergencyAlert = evaluateEmergencyAlert({
      selectedSymptoms: cleanSelected,
      additionalSymptoms: cleanAdditional,
      severity,
      vitals: cleanVitals,
      testResults: validRawTests,
      patient,
    });

    // 2. Persist Symptom submission
    const symptomRecord = await Symptom.create({
      patient: patient._id,
      doctor: req.user._id,
      selectedSymptoms: cleanSelected,
      additionalSymptoms: cleanAdditional,
      duration: {
        value: toNullableNumber(duration.value),
        unit: duration.unit || 'days',
      },
      severity,
      vitals: cleanVitals,
      clinicalNotes: String(clinicalNotes || '').trim(),
    });

    // 3. Persist Medical Test Results
    const savedTestDocs = [];
    for (const item of validRawTests) {
      const testDoc = await TestResult.create({
        patient: patient._id,
        doctor: req.user._id,
        testName: String(item.testName).trim(),
        testKey: item.testKey || '',
        value: String(item.value).trim(),
        unit: item.unit ? String(item.unit).trim() : '',
        referenceRange: item.referenceRange ? String(item.referenceRange).trim() : '',
        referenceMin: toNullableNumber(item.referenceMin),
        referenceMax: toNullableNumber(item.referenceMax),
        testDate: item.testDate ? new Date(item.testDate) : new Date(),
      });
      savedTestDocs.push(testDoc);
    }

    // 4. Load active Knowledge Base rules & run Forward-Chaining Inference Engine
    const activeRules = await getActiveRulesWithDiseases();
    const inferenceSummary = runInference({
      patient,
      symptomInput: {
        selectedSymptoms: cleanSelected,
        additionalSymptoms: cleanAdditional,
        duration: symptomRecord.duration,
        severity,
        vitals: cleanVitals,
      },
      testResults: savedTestDocs.map((d) => d.toObject()),
      rules: activeRules,
    });

    // 5. Persist Diagnosis Record
    const diagnosis = await Diagnosis.create({
      patient: patient._id,
      doctor: req.user._id,
      symptomRecord: symptomRecord._id,
      testResults: savedTestDocs.map((d) => d._id),
      patientSnapshot: {
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        existingConditions: patient.existingConditions || [],
        previousMedicalHistory: patient.previousMedicalHistory || '',
        currentMedications: patient.currentMedications || [],
        knownAllergies: patient.knownAllergies || [],
      },
      emergencyAlert,
      inferenceSummary,
    });

    // Link saved TestResults back to Diagnosis
    if (savedTestDocs.length > 0) {
      await TestResult.updateMany(
        { _id: { $in: savedTestDocs.map((d) => d._id) } },
        { $set: { diagnosis: diagnosis._id } }
      );
    }

    const populated = await Diagnosis.findById(diagnosis._id)
      .populate('patient')
      .populate('doctor', 'name email specialization licenseNumber')
      .populate('symptomRecord')
      .populate('testResults')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Clinical decision support evaluation completed.',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}

async function listDiagnoses(req, res, next) {
  try {
    const {
      patientId = '',
      patientName = '',
      search = '',
      startDate = '',
      endDate = '',
      alertLevel = '',
      limit = 50,
      page = 1,
    } = req.query;

    const query = {};

    if (patientId.trim()) {
      const escaped = patientId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query['patientSnapshot.patientId'] = new RegExp(escaped, 'i');
    }

    if (patientName.trim()) {
      const escaped = patientName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query['patientSnapshot.name'] = new RegExp(escaped, 'i');
    }

    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { diagnosisCode: regex },
        { 'patientSnapshot.patientId': regex },
        { 'patientSnapshot.name': regex },
        { 'inferenceSummary.possibleConditions.diseaseName': regex },
      ];
    }

    if (alertLevel && ['RED', 'ORANGE', 'GREEN'].includes(alertLevel.toUpperCase())) {
      query['emergencyAlert.level'] = alertLevel.toUpperCase();
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!Number.isNaN(start.getTime())) query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!Number.isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const [records, total] = await Promise.all([
      Diagnosis.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('patient', 'patientId name age gender')
        .populate('doctor', 'name specialization')
        .populate('symptomRecord')
        .populate('testResults')
        .lean(),
      Diagnosis.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: records,
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

async function getDiagnosisById(req, res, next) {
  try {
    const diagnosis = await Diagnosis.findById(req.params.id)
      .populate('patient')
      .populate('doctor', 'name email specialization licenseNumber')
      .populate('symptomRecord')
      .populate('testResults')
      .populate('doctorVerification.verifiedBy', 'name specialization')
      .lean();

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnosis record not found.',
      });
    }

    res.json({
      success: true,
      data: diagnosis,
    });
  } catch (err) {
    next(err);
  }
}

async function verifyDiagnosis(req, res, next) {
  try {
    const { status, finalClinicalImpression = '', doctorNotes = '' } = req.body;

    const diagnosis = await Diagnosis.findByIdAndUpdate(
      req.params.id,
      {
        doctorVerification: {
          status: status || 'Reviewed & Noted',
          finalClinicalImpression: String(finalClinicalImpression).trim(),
          doctorNotes: String(doctorNotes).trim(),
          verifiedAt: new Date(),
          verifiedBy: req.user._id,
        },
      },
      { new: true, runValidators: true }
    )
      .populate('patient')
      .populate('doctor', 'name email specialization licenseNumber')
      .populate('symptomRecord')
      .populate('testResults')
      .populate('doctorVerification.verifiedBy', 'name specialization');

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnosis record not found.',
      });
    }

    res.json({
      success: true,
      message: 'Doctor review and clinical verification saved.',
      data: diagnosis,
    });
  } catch (err) {
    next(err);
  }
}

async function generateDiagnosisPdfReport(req, res, next) {
  try {
    const diagnosis = await Diagnosis.findById(req.params.id)
      .populate('patient')
      .populate('doctor', 'name email specialization licenseNumber')
      .populate('symptomRecord')
      .populate('testResults')
      .populate('doctorVerification.verifiedBy', 'name specialization')
      .lean();

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnosis record not found.',
      });
    }

    const doc = new PDFDocument({ margin: 45, size: 'A4' });
    const filename = `CDSS-Report-${diagnosis.diagnosisCode}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const p = diagnosis.patientSnapshot || diagnosis.patient || {};
    const sym = diagnosis.symptomRecord || {};
    const vitals = sym.vitals || {};
    const alert = diagnosis.emergencyAlert || {};
    const summary = diagnosis.inferenceSummary || {};

    // Header
    doc
      .fillColor('#0F2A4A')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Intelligent Medical Diagnosis & Clinical Decision Support Report');
    doc
      .fontSize(9.5)
      .font('Helvetica')
      .fillColor('#475569')
      .text(
        `Report ID: ${diagnosis.diagnosisCode}   |   Generated: ${new Date(
          diagnosis.createdAt
        ).toLocaleString()}   |   Clinician: Dr. ${diagnosis.doctor?.name || 'N/A'}`
      );
    doc.moveDown(0.5);
    doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor('#CBD5E1').stroke();
    doc.moveDown(0.7);

    // Emergency Alert Banner
    const alertColors = {
      RED: { bg: '#FEE2E2', text: '#991B1B' },
      ORANGE: { bg: '#FFEDD5', text: '#9A3412' },
      GREEN: { bg: '#DCFCE7', text: '#166534' },
    };
    const style = alertColors[alert.level] || alertColors.GREEN;
    doc
      .fillColor(style.text)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`SAFETY SCREENING ALERT [${alert.level || 'GREEN'}]: ${alert.headline || ''}`);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#334155')
      .text(alert.safetyNote || '');
    if (alert.triggeredCriteria?.length > 0) {
      alert.triggeredCriteria.forEach((c) => {
        doc.text(`  • ${c}`);
      });
    }
    doc.moveDown(0.8);

    // Patient Info
    doc.fillColor('#0F2A4A').font('Helvetica-Bold').fontSize(11).text('1. Patient Information & Medical History');
    doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B');
    doc.text(
      `Patient ID: ${p.patientId || 'N/A'}   |   Name: ${p.name || 'N/A'}   |   Age/Gender: ${p.age ?? 'N/A'} / ${p.gender || 'N/A'}   |   Blood Group: ${p.bloodGroup || 'Unknown'}`
    );
    doc.text(
      `Existing Conditions: ${p.existingConditions?.length ? p.existingConditions.join(', ') : 'None documented'}`
    );
    doc.text(
      `Current Medications: ${p.currentMedications?.length ? p.currentMedications.join(', ') : 'None documented'}`
    );
    doc.text(
      `Known Allergies: ${p.knownAllergies?.length ? p.knownAllergies.join(', ') : 'None documented'}`
    );
    if (p.previousMedicalHistory) {
      doc.text(`Previous Medical History: ${p.previousMedicalHistory}`);
    }
    doc.moveDown(0.7);

    // Symptoms & Vitals
    doc.fillColor('#0F2A4A').font('Helvetica-Bold').fontSize(11).text('2. Clinical Presentation & Vital Signs');
    doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B');
    const allSymptoms = [
      ...(sym.selectedSymptoms || []),
      ...(sym.additionalSymptoms || []),
    ];
    doc.text(`Reported Symptoms: ${allSymptoms.length ? allSymptoms.join(', ') : 'None entered'}`);
    doc.text(
      `Severity: ${sym.severity || 'N/A'}   |   Duration: ${
        sym.duration?.value ? `${sym.duration.value} ${sym.duration.unit}` : 'Not specified'
      }`
    );
    doc.text(
      `Vitals: Temp ${vitals.temperature != null ? `${vitals.temperature}°C` : 'N/R'} | BP ${
        vitals.systolicBP != null ? `${vitals.systolicBP}/${vitals.diastolicBP ?? '?'} mmHg` : 'N/R'
      } | HR ${vitals.heartRate != null ? `${vitals.heartRate} bpm` : 'N/R'} | SpO2 ${
        vitals.oxygenSaturation != null ? `${vitals.oxygenSaturation}%` : 'N/R'
      }`
    );
    doc.moveDown(0.7);

    // Medical Test Results
    doc.fillColor('#0F2A4A').font('Helvetica-Bold').fontSize(11).text('3. Laboratory & Diagnostic Test Results');
    doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B');
    if (diagnosis.testResults?.length > 0) {
      diagnosis.testResults.forEach((t) => {
        doc.text(
          `• ${t.testName}: ${t.value} ${t.unit || ''} (Ref: ${t.referenceRange || 'N/A'}) — [${t.interpretation}]`
        );
      });
    } else {
      doc.text('No laboratory test results entered for this encounter.');
    }
    doc.moveDown(0.7);

    // Inference Results
    doc
      .fillColor('#0F2A4A')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('4. Knowledge-Based Decision Support Suggestions (Non-Clinical Demonstration Rules)');
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(
      'Note: Evidence-Matching Score indicates matched rule criteria only and is NOT a clinical disease probability.'
    );
    doc.moveDown(0.3);

    const allItems = [
      ...(summary.possibleConditions || []),
      ...(summary.clinicalFlags || []),
    ];

    if (allItems.length === 0) {
      doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B').text(
        'No multi-criteria knowledge base rules were triggered based on available data.'
      );
    } else {
      allItems.forEach((item, idx) => {
        doc
          .fillColor('#0F2A4A')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(
            `${idx + 1}. ${item.diseaseName} [${item.ruleCode}] — ${item.scoreLabel}`
          );
        doc.font('Helvetica').fontSize(9).fillColor('#1E293B');
        doc.text(`   Suggestion: ${item.conclusion}`);
        doc.text(`   Rule Trace: ${item.ifThenTrace}`);
        if (item.matchingEvidence?.length) {
          doc.text(`   Supporting Evidence: ${item.matchingEvidence.join('; ')}`);
        }
        if (item.unmatchedEvidence?.length) {
          doc.text(`   Unmatched / Missing / Conflicting: ${item.unmatchedEvidence.join('; ')}`);
        }
        doc.moveDown(0.35);
      });
    }

    if (summary.missingInformation?.length > 0) {
      doc.moveDown(0.3);
      doc.fillColor('#0F2A4A').font('Helvetica-Bold').fontSize(10.5).text('5. Additional Information Required');
      doc.font('Helvetica').fontSize(9).fillColor('#1E293B');
      summary.missingInformation.slice(0, 8).forEach((m) => doc.text(`• ${m}`));
    }

    if (summary.suggestedNextSteps?.length > 0) {
      doc.moveDown(0.4);
      doc.fillColor('#0F2A4A').font('Helvetica-Bold').fontSize(10.5).text('6. Suggested Next Steps for Clinical Review');
      doc.font('Helvetica').fontSize(9).fillColor('#1E293B');
      summary.suggestedNextSteps.slice(0, 8).forEach((s) => doc.text(`• ${s}`));
    }

    // Doctor verification
    doc.moveDown(0.5);
    doc.fillColor('#0F2A4A').font('Helvetica-Bold').fontSize(10.5).text('7. Physician Verification');
    doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B');
    doc.text(`Review Status: ${diagnosis.doctorVerification?.status || 'Pending Review'}`);
    if (diagnosis.doctorVerification?.finalClinicalImpression) {
      doc.text(`Final Clinical Impression: ${diagnosis.doctorVerification.finalClinicalImpression}`);
    }
    if (diagnosis.doctorVerification?.doctorNotes) {
      doc.text(`Clinician Notes: ${diagnosis.doctorVerification.doctorNotes}`);
    }

    // Mandatory disclaimer footer
    doc.moveDown(0.9);
    doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor('#94A3B8').stroke();
    doc.moveDown(0.4);
    doc
      .fillColor('#7F1D1D')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(
        summary.disclaimer ||
          'This system provides clinical decision support only. Final diagnosis and treatment decisions must be made by a qualified healthcare professional.'
      );

    doc.end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDiagnosis,
  listDiagnoses,
  getDiagnosisById,
  verifyDiagnosis,
  generateDiagnosisPdfReport,
};
