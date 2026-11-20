const Disease = require('../models/Disease');
const MedicalRule = require('../models/MedicalRule');

function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => String(x).trim()).filter(Boolean);
  return String(val)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

// --- Diseases ---

async function listDiseases(req, res, next) {
  try {
    const { search = '' } = req.query;
    const query = {};
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { name: regex },
        { code: regex },
        { category: regex },
        { commonSymptoms: regex },
      ];
    }

    const diseases = await Disease.find(query)
      .sort({ name: 1 })
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .lean();

    res.json({
      success: true,
      data: diseases,
    });
  } catch (err) {
    next(err);
  }
}

async function createDisease(req, res, next) {
  try {
    const {
      code,
      name,
      category,
      description,
      commonSymptoms,
      associatedTestFindings,
      relevantMedicalHistory,
      riskFactors,
      clinicalReferenceInfo,
      recommendedNextSteps,
      isDemonstrationData = true,
      reviewStatus = 'Educational Demonstration (Non-Clinical)',
    } = req.body;

    const generatedCode =
      code?.trim().toUpperCase() ||
      `DIS-${name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .slice(0, 24)}`;

    const disease = await Disease.create({
      code: generatedCode,
      name: name.trim(),
      category: category?.trim() || 'General Medicine',
      description: description.trim(),
      commonSymptoms: toArray(commonSymptoms),
      associatedTestFindings: toArray(associatedTestFindings),
      relevantMedicalHistory: toArray(relevantMedicalHistory),
      riskFactors: toArray(riskFactors),
      clinicalReferenceInfo: clinicalReferenceInfo.trim(),
      recommendedNextSteps: toArray(recommendedNextSteps),
      isDemonstrationData: Boolean(isDemonstrationData),
      reviewStatus,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Disease entry added to the Medical Knowledge Base.',
      data: disease,
    });
  } catch (err) {
    next(err);
  }
}

async function updateDisease(req, res, next) {
  try {
    const updates = {
      updatedBy: req.user._id,
    };

    const stringFields = [
      'code',
      'name',
      'category',
      'description',
      'clinicalReferenceInfo',
      'reviewStatus',
    ];
    for (const f of stringFields) {
      if (req.body[f] !== undefined) {
        updates[f] = f === 'code' ? String(req.body[f]).trim().toUpperCase() : String(req.body[f]).trim();
      }
    }

    const arrayFields = [
      'commonSymptoms',
      'associatedTestFindings',
      'relevantMedicalHistory',
      'riskFactors',
      'recommendedNextSteps',
    ];
    for (const f of arrayFields) {
      if (req.body[f] !== undefined) {
        updates[f] = toArray(req.body[f]);
      }
    }

    if (req.body.isDemonstrationData !== undefined) {
      updates.isDemonstrationData = Boolean(req.body.isDemonstrationData);
    }

    const disease = await Disease.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!disease) {
      return res.status(404).json({
        success: false,
        message: 'Disease entry not found.',
      });
    }

    res.json({
      success: true,
      message: 'Disease information updated successfully.',
      data: disease,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteDisease(req, res, next) {
  try {
    const linkedRulesCount = await MedicalRule.countDocuments({ disease: req.params.id });
    if (linkedRulesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this disease while ${linkedRulesCount} diagnostic rule(s) reference it. Delete or reassign those rules first.`,
      });
    }

    const deleted = await Disease.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Disease entry not found.',
      });
    }

    res.json({
      success: true,
      message: 'Disease entry removed from the Knowledge Base.',
    });
  } catch (err) {
    next(err);
  }
}

// --- Diagnostic Rules ---

async function listRules(req, res, next) {
  try {
    const { diseaseId, activeOnly } = req.query;
    const query = {};
    if (diseaseId) query.disease = diseaseId;
    if (activeOnly === 'true') query.isActive = true;

    const rules = await MedicalRule.find(query)
      .populate('disease', 'code name category reviewStatus isDemonstrationData')
      .populate('createdBy', 'name role')
      .populate('updatedBy', 'name role')
      .sort({ ruleCode: 1 })
      .lean();

    res.json({
      success: true,
      data: rules,
    });
  } catch (err) {
    next(err);
  }
}

async function createRule(req, res, next) {
  try {
    const {
      ruleCode,
      name,
      description,
      disease,
      ruleType = 'condition_consideration',
      conditions,
      minConditionsToTrigger = 2,
      conclusion,
      additionalInfoRequired,
      suggestedNextSteps,
      isActive = true,
      isDemonstrationRule = true,
    } = req.body;

    const existingDisease = await Disease.findById(disease);
    if (!existingDisease) {
      return res.status(404).json({
        success: false,
        message: 'Referenced disease not found in the Knowledge Base.',
      });
    }

    // Safety check: condition_consideration rules must require >= 2 criteria
    const safeMin =
      ruleType === 'clinical_flag'
        ? Math.max(1, Number(minConditionsToTrigger) || 1)
        : Math.max(2, Number(minConditionsToTrigger) || 2);

    const rule = await MedicalRule.create({
      ruleCode: ruleCode.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      disease,
      ruleType,
      conditions,
      minConditionsToTrigger: safeMin,
      conclusion: conclusion.trim(),
      additionalInfoRequired: toArray(additionalInfoRequired),
      suggestedNextSteps: toArray(suggestedNextSteps),
      isActive: Boolean(isActive),
      isDemonstrationRule: Boolean(isDemonstrationRule),
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    const populated = await MedicalRule.findById(rule._id).populate(
      'disease',
      'code name category'
    );

    res.status(201).json({
      success: true,
      message: 'Diagnostic production rule added to the Knowledge Base.',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}

async function updateRule(req, res, next) {
  try {
    const existing = await MedicalRule.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic rule not found.',
      });
    }

    const nextRuleType = req.body.ruleType || existing.ruleType;
    const updates = {
      updatedBy: req.user._id,
      version: (existing.version || 1) + 1,
    };

    if (req.body.ruleCode !== undefined) updates.ruleCode = String(req.body.ruleCode).trim().toUpperCase();
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
    if (req.body.disease !== undefined) updates.disease = req.body.disease;
    if (req.body.ruleType !== undefined) updates.ruleType = nextRuleType;
    if (req.body.conditions !== undefined) updates.conditions = req.body.conditions;
    if (req.body.minConditionsToTrigger !== undefined) {
      updates.minConditionsToTrigger =
        nextRuleType === 'clinical_flag'
          ? Math.max(1, Number(req.body.minConditionsToTrigger) || 1)
          : Math.max(2, Number(req.body.minConditionsToTrigger) || 2);
    }
    if (req.body.conclusion !== undefined) updates.conclusion = String(req.body.conclusion).trim();
    if (req.body.additionalInfoRequired !== undefined) {
      updates.additionalInfoRequired = toArray(req.body.additionalInfoRequired);
    }
    if (req.body.suggestedNextSteps !== undefined) {
      updates.suggestedNextSteps = toArray(req.body.suggestedNextSteps);
    }
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
    if (req.body.isDemonstrationRule !== undefined) {
      updates.isDemonstrationRule = Boolean(req.body.isDemonstrationRule);
    }

    const updated = await MedicalRule.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('disease', 'code name category');

    res.json({
      success: true,
      message: 'Diagnostic rule updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteRule(req, res, next) {
  try {
    const deleted = await MedicalRule.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic rule not found.',
      });
    }

    res.json({
      success: true,
      message: 'Outdated diagnostic rule deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDiseases,
  createDisease,
  updateDisease,
  deleteDisease,
  listRules,
  createRule,
  updateRule,
  deleteRule,
};
