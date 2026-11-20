/**
 * Rule-Based Forward-Chaining Inference Engine
 *
 * Implements Knowledge Engineering concepts:
 * 1. Collect patient facts into Working Memory (demographics, history, symptoms, vitals, lab tests).
 * 2. Derive intermediate clinical facts via forward chaining (without inventing missing data).
 * 3. Evaluate structured IF-THEN production rules from the Medical Knowledge Base.
 * 4. Guardrail: Never generate a disease consideration from a single isolated symptom alone.
 * 5. Track matching evidence, conflicting evidence, and missing evidence separately.
 * 6. Calculate a transparent Evidence-Matching Score (rule criteria match — NOT clinical probability).
 * 7. Present results strictly as suggestions requiring qualified doctor verification.
 */

const CLINICAL_DISCLAIMER =
  'This system provides clinical decision support only. Final diagnosis and treatment decisions must be made by a qualified healthcare professional.';

function toNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function normalizeKey(str = '') {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Step 1: Build Working Memory from patient record, symptoms, vitals, and lab tests.
 * Never fabricates or assumes values for missing vitals or missing laboratory tests.
 */
function buildWorkingMemory({ patient = {}, symptomInput = {}, testResults = [] }) {
  const selected = (symptomInput.selectedSymptoms || []).filter(Boolean);
  const additional = (symptomInput.additionalSymptoms || []).filter(Boolean);
  const allSymptomsRaw = [...selected, ...additional];
  const symptomSet = new Set(allSymptomsRaw.map((s) => normalizeKey(s)));

  const vitals = {
    temperature: toNumber(symptomInput.vitals?.temperature),
    systolicBP: toNumber(symptomInput.vitals?.systolicBP),
    diastolicBP: toNumber(symptomInput.vitals?.diastolicBP),
    heartRate: toNumber(symptomInput.vitals?.heartRate),
    oxygenSaturation: toNumber(symptomInput.vitals?.oxygenSaturation),
  };

  // Map lab tests by normalized key and aliases (preserving original values & reference ranges)
  const labs = new Map();
  for (const t of testResults || []) {
    const rawKey = normalizeKey(t.testKey || t.testName);
    if (!rawKey) continue;
    const numericValue =
      t.numericValue !== undefined && t.numericValue !== null
        ? toNumber(t.numericValue)
        : toNumber(t.value);

    const record = {
      testName: t.testName,
      testKey: rawKey,
      value: t.value,
      numericValue,
      unit: t.unit || '',
      referenceRange: t.referenceRange || '',
      referenceMin: toNumber(t.referenceMin),
      referenceMax: toNumber(t.referenceMax),
      interpretation: t.interpretation || 'Not Evaluated',
      testDate: t.testDate,
    };

    // Derive interpretation if not already computed and reference bounds exist
    if (record.numericValue !== null && record.interpretation === 'Not Evaluated') {
      if (record.referenceMin !== null && record.numericValue < record.referenceMin) {
        record.interpretation = 'Low';
      } else if (record.referenceMax !== null && record.numericValue > record.referenceMax) {
        record.interpretation = 'High';
      } else if (record.referenceMin !== null || record.referenceMax !== null) {
        record.interpretation = 'Normal';
      }
    }

    labs.set(rawKey, record);

    // Register canonical aliases so rules match reliably
    if (rawKey.includes('hemoglobin') || rawKey === 'hb' || rawKey === 'hgb') {
      labs.set('hemoglobin', record);
    }
    if (rawKey.includes('glucose') || rawKey.includes('blood_sugar') || rawKey === 'fbs' || rawKey === 'rbs') {
      labs.set('blood_glucose', record);
    }
    if (rawKey.includes('hba1c') || rawKey.includes('a1c')) {
      labs.set('hba1c', record);
    }
    if (rawKey.includes('wbc') || rawKey.includes('white_blood')) {
      labs.set('wbc', record);
    }
    if (rawKey.includes('platelet') || rawKey === 'plt') {
      labs.set('platelet_count', record);
    }
    if (rawKey.includes('crp') || rawKey.includes('c_reactive')) {
      labs.set('crp', record);
    }
    if (rawKey.includes('urine')) {
      labs.set('urine_test', record);
    }
    if (rawKey.includes('cbc') || rawKey.includes('complete_blood_count')) {
      labs.set('cbc', record);
    }
  }

  const historyText = [
    ...(patient.existingConditions || []),
    patient.previousMedicalHistory || '',
    ...(patient.currentMedications || []),
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();

  // Step 2: Forward-chaining Pass 1 — derive intermediate clinical facts from objective data
  const derivedFacts = [];

  if (vitals.temperature !== null) {
    if (vitals.temperature >= 38.0) {
      derivedFacts.push(`Objective fever recorded (${vitals.temperature}°C ≥ 38.0°C)`);
      // Objective febrile temperature confirms fever fact even if checkbox was overlooked
      symptomSet.add('fever');
    } else if (vitals.temperature < 37.5 && symptomSet.has('fever')) {
      derivedFacts.push(
        `Note: Fever symptom reported while current measured temperature is ${vitals.temperature}°C (afebrile at measurement)`
      );
    }
  }

  if (
    (vitals.systolicBP !== null && vitals.systolicBP >= 140) ||
    (vitals.diastolicBP !== null && vitals.diastolicBP >= 90)
  ) {
    derivedFacts.push(
      `Elevated blood pressure detected (${vitals.systolicBP ?? '?'} / ${vitals.diastolicBP ?? '?'} mmHg; ≥ 140/90 mmHg threshold)`
    );
  } else if (vitals.systolicBP !== null && vitals.systolicBP >= 130) {
    derivedFacts.push(
      `Borderline elevated systolic blood pressure (${vitals.systolicBP} / ${vitals.diastolicBP ?? '?'} mmHg)`
    );
  }

  if (vitals.heartRate !== null && vitals.heartRate > 100) {
    derivedFacts.push(`Tachycardia observed (Heart rate ${vitals.heartRate} bpm > 100 bpm)`);
  }

  if (vitals.oxygenSaturation !== null && vitals.oxygenSaturation < 95) {
    derivedFacts.push(`Reduced oxygen saturation (SpO2 ${vitals.oxygenSaturation}% < 95%)`);
  }

  // Sex-aware fallback clinical reference range ONLY for flagging when clinician omitted reference range
  const hb = labs.get('hemoglobin');
  if (hb && hb.numericValue !== null) {
    const refMin =
      hb.referenceMin !== null
        ? hb.referenceMin
        : patient.gender === 'Male'
        ? 13.5
        : patient.gender === 'Female'
        ? 12.0
        : 12.0;
    if (hb.numericValue < refMin) {
      derivedFacts.push(
        `Hemoglobin below reference threshold (${hb.numericValue} ${hb.unit || 'g/dL'} < ${refMin} g/dL)`
      );
    }
  }

  const glucose = labs.get('blood_glucose');
  if (glucose && glucose.numericValue !== null) {
    const refMax = glucose.referenceMax !== null ? glucose.referenceMax : 125;
    if (glucose.numericValue > refMax) {
      derivedFacts.push(
        `Blood glucose above reference threshold (${glucose.numericValue} ${glucose.unit || 'mg/dL'} > ${refMax} mg/dL)`
      );
    }
  }

  const wbc = labs.get('wbc');
  if (wbc && wbc.numericValue !== null) {
    const refMax = wbc.referenceMax !== null ? wbc.referenceMax : 11.0;
    if (wbc.numericValue > refMax) {
      derivedFacts.push(
        `Elevated WBC count (${wbc.numericValue} ${wbc.unit || '×10³/µL'} > ${refMax})`
      );
    }
  }

  const crp = labs.get('crp');
  if (crp && crp.numericValue !== null) {
    const refMax = crp.referenceMax !== null ? crp.referenceMax : 10.0;
    if (crp.numericValue > refMax) {
      derivedFacts.push(
        `Elevated CRP inflammatory marker (${crp.numericValue} ${crp.unit || 'mg/L'} > ${refMax})`
      );
    }
  }

  return {
    patient: {
      age: toNumber(patient.age),
      gender: patient.gender || 'Unknown',
      existingConditions: patient.existingConditions || [],
      previousMedicalHistory: patient.previousMedicalHistory || '',
      currentMedications: patient.currentMedications || [],
      knownAllergies: patient.knownAllergies || [],
      historyText,
    },
    symptoms: symptomSet,
    symptomsRaw: allSymptomsRaw,
    duration: symptomInput.duration || { value: null, unit: 'days' },
    severity: symptomInput.severity || 'Moderate',
    vitals,
    labs,
    derivedFacts,
  };
}

/**
 * Evaluate a single IF condition against Working Memory.
 * Returns status: 'MATCHED' | 'CONFLICTING' | 'MISSING'
 */
function evaluateCondition(condition, wm) {
  const { factType, key, label, operator, value, unit } = condition;
  const normKey = normalizeKey(key);

  if (factType === 'symptom') {
    const isPresent = wm.symptoms.has(normKey);
    if (operator === 'present') {
      return isPresent
        ? { status: 'MATCHED', detail: `Symptom present: ${label}` }
        : { status: 'UNMATCHED', detail: `Symptom not reported: ${label}` };
    }
    if (operator === 'absent') {
      return !isPresent
        ? { status: 'MATCHED', detail: `Symptom absent as expected: ${label}` }
        : { status: 'CONFLICTING', detail: `Conflicting symptom present: ${label}` };
    }
  }

  if (factType === 'vital') {
    // Special composite key for elevated blood pressure
    if (key === 'bloodPressureElevated' || normKey === 'blood_pressure_elevated') {
      const sys = wm.vitals.systolicBP;
      const dia = wm.vitals.diastolicBP;
      if (sys === null && dia === null) {
        return {
          status: 'MISSING',
          detail: 'Blood pressure reading not recorded (required to evaluate BP criterion).',
        };
      }
      const sysThreshold = value?.systolic ?? 140;
      const diaThreshold = value?.diastolic ?? 90;
      const elevated =
        (sys !== null && sys >= sysThreshold) || (dia !== null && dia >= diaThreshold);
      if (elevated) {
        return {
          status: 'MATCHED',
          detail: `Elevated blood pressure recorded: ${sys ?? '?'} / ${dia ?? '?'} mmHg (threshold ≥ ${sysThreshold}/${diaThreshold} mmHg)`,
        };
      }
      return {
        status: 'CONFLICTING',
        detail: `Blood pressure within non-elevated range: ${sys ?? '?'} / ${dia ?? '?'} mmHg (below ${sysThreshold}/${diaThreshold} mmHg)`,
      };
    }

    const vitalValue = wm.vitals[key];
    if (vitalValue === null || vitalValue === undefined) {
      return {
        status: 'MISSING',
        detail: `Vital sign not recorded: ${label}`,
      };
    }

    const target = toNumber(value);
    const matches = compareNumeric(vitalValue, operator, target, value);
    if (matches) {
      return {
        status: 'MATCHED',
        detail: `${label}: ${vitalValue}${unit ? ` ${unit}` : ''}`,
      };
    }
    return {
      status: 'CONFLICTING',
      detail: `${label} not met (measured ${vitalValue}${unit ? ` ${unit}` : ''})`,
    };
  }

  if (factType === 'lab') {
    const lab = wm.labs.get(normKey);
    if (!lab) {
      return {
        status: 'MISSING',
        detail: `Lab test not provided: ${label} (not assumed or invented)`,
      };
    }

    if (operator === 'below_ref') {
      if (lab.numericValue === null) {
        return {
          status: 'MISSING',
          detail: `${lab.testName} value "${lab.value}" is non-numeric; manual review needed.`,
        };
      }
      let refMin = lab.referenceMin;
      // Fallback sex-appropriate educational reference ONLY if doctor left range blank
      if (refMin === null && normKey === 'hemoglobin') {
        refMin = wm.patient.gender === 'Male' ? 13.5 : 12.0;
      } else if (refMin === null && toNumber(value) !== null) {
        refMin = toNumber(value);
      }

      if (refMin === null) {
        return {
          status: 'MISSING',
          detail: `${lab.testName} (${lab.numericValue} ${lab.unit}) has no reference lower bound entered.`,
        };
      }

      if (lab.numericValue < refMin) {
        return {
          status: 'MATCHED',
          detail: `${lab.testName} below reference range: ${lab.numericValue} ${lab.unit || unit} (ref min ${refMin})`,
        };
      }
      return {
        status: 'CONFLICTING',
        detail: `${lab.testName} is not below reference range: ${lab.numericValue} ${lab.unit || unit} (ref min ${refMin})`,
      };
    }

    if (operator === 'above_ref') {
      if (lab.numericValue === null) {
        return {
          status: 'MISSING',
          detail: `${lab.testName} value "${lab.value}" is non-numeric; manual review needed.`,
        };
      }
      let refMax = lab.referenceMax;
      if (refMax === null && toNumber(value) !== null) {
        refMax = toNumber(value);
      } else if (refMax === null && normKey === 'blood_glucose') {
        refMax = 125;
      } else if (refMax === null && normKey === 'wbc') {
        refMax = 11.0;
      } else if (refMax === null && normKey === 'crp') {
        refMax = 10.0;
      }

      if (refMax === null) {
        return {
          status: 'MISSING',
          detail: `${lab.testName} (${lab.numericValue} ${lab.unit}) has no reference upper bound entered.`,
        };
      }

      if (lab.numericValue > refMax) {
        return {
          status: 'MATCHED',
          detail: `${lab.testName} above reference range: ${lab.numericValue} ${lab.unit || unit} (ref max ${refMax})`,
        };
      }
      return {
        status: 'CONFLICTING',
        detail: `${lab.testName} is within/below reference upper bound: ${lab.numericValue} ${lab.unit || unit} (ref max ${refMax})`,
      };
    }

    if (operator === 'abnormal') {
      const isAbnormal = ['Low', 'High', 'Abnormal'].includes(lab.interpretation);
      return isAbnormal
        ? {
            status: 'MATCHED',
            detail: `Abnormal ${lab.testName}: ${lab.value} ${lab.unit} (${lab.interpretation})`,
          }
        : {
            status: 'CONFLICTING',
            detail: `${lab.testName} reported as ${lab.interpretation} (${lab.value} ${lab.unit})`,
          };
    }

    if (lab.numericValue !== null) {
      const matches = compareNumeric(lab.numericValue, operator, toNumber(value), value);
      return matches
        ? {
            status: 'MATCHED',
            detail: `${lab.testName}: ${lab.numericValue} ${lab.unit || unit} matches ${label}`,
          }
        : {
            status: 'CONFLICTING',
            detail: `${lab.testName}: ${lab.numericValue} ${lab.unit || unit} does not meet ${label}`,
          };
    }

    return {
      status: 'MISSING',
      detail: `Unable to numerically evaluate ${lab.testName} (${lab.value})`,
    };
  }

  if (factType === 'history') {
    const terms = Array.isArray(value)
      ? value.map((v) => String(v).toLowerCase())
      : [String(value || key).toLowerCase()];

    if (!wm.patient.historyText.trim()) {
      return {
        status: 'MISSING',
        detail: `No documented medical history to check for: ${label}`,
      };
    }

    const found = terms.some((t) => wm.patient.historyText.includes(t));
    return found
      ? { status: 'MATCHED', detail: `Relevant patient history noted: ${label}` }
      : { status: 'UNMATCHED', detail: `Not noted in documented history: ${label}` };
  }

  if (factType === 'demographic') {
    if (normKey === 'age') {
      if (wm.patient.age === null) {
        return { status: 'MISSING', detail: 'Patient age not available.' };
      }
      const matches = compareNumeric(wm.patient.age, operator, toNumber(value), value);
      return matches
        ? { status: 'MATCHED', detail: `Demographic factor met: Age ${wm.patient.age} (${label})` }
        : { status: 'UNMATCHED', detail: `Demographic criterion not met: Age ${wm.patient.age} (${label})` };
    }
    if (normKey === 'gender') {
      const matches = String(wm.patient.gender).toLowerCase() === String(value).toLowerCase();
      return matches
        ? { status: 'MATCHED', detail: `Patient gender: ${wm.patient.gender}` }
        : { status: 'UNMATCHED', detail: `Patient gender (${wm.patient.gender}) differs from ${value}` };
    }
  }

  if (factType === 'severity') {
    const allowed = Array.isArray(value) ? value : [value];
    const matches = allowed.map((v) => String(v).toLowerCase()).includes(String(wm.severity).toLowerCase());
    return matches
      ? { status: 'MATCHED', detail: `Symptom severity is ${wm.severity}` }
      : { status: 'UNMATCHED', detail: `Symptom severity is ${wm.severity} (rule checks ${allowed.join('/')})` };
  }

  if (factType === 'duration') {
    if (wm.duration.value === null || wm.duration.value === undefined) {
      return { status: 'MISSING', detail: 'Symptom duration not specified.' };
    }
    const days = convertDurationToDays(wm.duration.value, wm.duration.unit);
    const matches = compareNumeric(days, operator, toNumber(value), value);
    return matches
      ? { status: 'MATCHED', detail: `Symptom duration (${wm.duration.value} ${wm.duration.unit}) fits ${label}` }
      : { status: 'UNMATCHED', detail: `Symptom duration (${wm.duration.value} ${wm.duration.unit}) outside ${label}` };
  }

  return { status: 'MISSING', detail: `Unsupported criterion: ${label}` };
}

function compareNumeric(actual, operator, target, rawValue) {
  if (actual === null) return false;
  switch (operator) {
    case 'gte':
      return target !== null && actual >= target;
    case 'gt':
      return target !== null && actual > target;
    case 'lte':
      return target !== null && actual <= target;
    case 'lt':
      return target !== null && actual < target;
    case 'eq':
      return target !== null && actual === target;
    case 'between':
      if (rawValue && typeof rawValue === 'object') {
        const min = toNumber(rawValue.min);
        const max = toNumber(rawValue.max);
        return (min === null || actual >= min) && (max === null || actual <= max);
      }
      return false;
    default:
      return false;
  }
}

function convertDurationToDays(value, unit) {
  const num = toNumber(value);
  if (num === null) return 0;
  switch (unit) {
    case 'hours':
      return num / 24;
    case 'weeks':
      return num * 7;
    case 'months':
      return num * 30;
    case 'days':
    default:
      return num;
  }
}

function formatIfThenTrace(rule) {
  const ifClauses = (rule.conditions || []).map((c) => c.label).join(' AND ');
  return `IF (${ifClauses}) THEN ${rule.conclusion}`;
}

/**
 * Main Forward-Chaining Inference Function
 * @param {Object} params
 * @param {Object} params.patient
 * @param {Object} params.symptomInput
 * @param {Array}  params.testResults
 * @param {Array}  params.rules - Populated MedicalRule documents (with disease populated)
 */
function runInference({ patient = {}, symptomInput = {}, testResults = [], rules = [] }) {
  const wm = buildWorkingMemory({ patient, symptomInput, testResults });
  const activeRules = (rules || []).filter((r) => r.isActive !== false);

  const possibleConditions = [];
  const clinicalFlags = [];
  const globalMissingInfo = new Set();
  const globalConflicts = new Set();
  const globalNextSteps = new Set();

  // Check for missing core vitals to report transparently
  if (wm.vitals.temperature === null) globalMissingInfo.add('Body temperature not recorded.');
  if (wm.vitals.systolicBP === null || wm.vitals.diastolicBP === null) {
    globalMissingInfo.add('Blood pressure (systolic/diastolic) not recorded.');
  }
  if (wm.vitals.heartRate === null) globalMissingInfo.add('Heart rate not recorded.');
  if (wm.vitals.oxygenSaturation === null) globalMissingInfo.add('Oxygen saturation (SpO2) not recorded.');

  for (const rule of activeRules) {
    const conditions = rule.conditions || [];
    if (conditions.length === 0) continue;

    let matchedWeight = 0;
    let totalWeight = 0;
    let matchedCount = 0;
    let matchedSymptomOnlyCount = 0;
    let matchedNonSymptomCount = 0;
    let requiredFailed = false;

    const matchingEvidence = [];
    const unmatchedEvidence = [];
    const conflictingEvidence = [];
    const missingEvidence = [];

    for (const cond of conditions) {
      const weight = Number(cond.weight) || 1;
      totalWeight += weight;

      const outcome = evaluateCondition(cond, wm);

      if (outcome.status === 'MATCHED') {
        matchedWeight += weight;
        matchedCount += 1;
        if (cond.factType === 'symptom') {
          matchedSymptomOnlyCount += 1;
        } else {
          matchedNonSymptomCount += 1;
        }
        matchingEvidence.push(outcome.detail);
      } else if (outcome.status === 'CONFLICTING') {
        conflictingEvidence.push(outcome.detail);
        unmatchedEvidence.push(outcome.detail);
        if (cond.required) requiredFailed = true;
      } else if (outcome.status === 'MISSING') {
        missingEvidence.push(outcome.detail);
        unmatchedEvidence.push(outcome.detail);
        if (cond.required) requiredFailed = true;
      } else {
        unmatchedEvidence.push(outcome.detail);
        if (cond.required) requiredFailed = true;
      }
    }

    const minNeeded = Math.max(1, Number(rule.minConditionsToTrigger) || 2);

    // SAFETY GUARDRAIL: Never suggest a disease from a single isolated symptom alone!
    const isSingleSymptomOnly =
      rule.ruleType !== 'clinical_flag' &&
      matchedCount === 1 &&
      matchedSymptomOnlyCount === 1 &&
      matchedNonSymptomCount === 0;

    const triggered =
      !requiredFailed &&
      !isSingleSymptomOnly &&
      matchedCount >= minNeeded &&
      (rule.ruleType === 'clinical_flag' ? matchedCount >= 1 : matchedCount >= 2);

    if (!triggered) {
      // If a rule partially matched (e.g., 1+ criteria matched) and had conflicting/missing lab info, surface helpful missing data
      if (matchedCount >= 1 && missingEvidence.length > 0 && rule.ruleType === 'condition_consideration') {
        for (const info of rule.additionalInfoRequired || []) {
          globalMissingInfo.add(info);
        }
      }
      continue;
    }

    const rawScore = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
    const disease = rule.disease || {};

    const item = {
      diseaseId: disease._id || null,
      diseaseName: disease.name || rule.name,
      diseaseCategory: disease.category || 'General Medicine',
      diseaseDescription: disease.description || rule.description,
      ruleId: rule._id || null,
      ruleCode: rule.ruleCode,
      ruleName: rule.name,
      ruleType: rule.ruleType || 'condition_consideration',
      evidenceMatchingScore: rawScore,
      matchedWeight: Number(matchedWeight.toFixed(2)),
      totalWeight: Number(totalWeight.toFixed(2)),
      matchedCount,
      totalCriteriaCount: conditions.length,
      scoreLabel: `${rawScore}% Rule Criteria Match (${matchedCount}/${conditions.length} criteria)`,
      scoreExplanation:
        'Evidence-Matching Score reflects the weighted proportion of configured knowledge-base rule criteria matched by available patient data. It is NOT a clinical disease probability or diagnostic accuracy metric.',
      conclusion: rule.conclusion,
      matchingEvidence,
      unmatchedEvidence,
      conflictingEvidence,
      missingEvidence,
      additionalInfoRequired: rule.additionalInfoRequired || [],
      suggestedNextSteps:
        rule.suggestedNextSteps?.length > 0
          ? rule.suggestedNextSteps
          : disease.recommendedNextSteps || [],
      clinicalReferenceInfo:
        disease.clinicalReferenceInfo ||
        'Educational demonstration rule — verify against current peer-reviewed clinical guidelines.',
      ifThenTrace: formatIfThenTrace(rule),
      isDemonstrationRule: rule.isDemonstrationRule !== false,
    };

    for (const info of item.additionalInfoRequired) globalMissingInfo.add(info);
    for (const miss of missingEvidence) globalMissingInfo.add(miss);
    for (const conf of conflictingEvidence) globalConflicts.add(conf);
    for (const step of item.suggestedNextSteps) globalNextSteps.add(step);

    if (item.ruleType === 'clinical_flag') {
      clinicalFlags.push(item);
    } else {
      possibleConditions.push(item);
    }
  }

  // Sort by highest evidence-matching score, then by number of matched criteria
  possibleConditions.sort(
    (a, b) =>
      b.evidenceMatchingScore - a.evidenceMatchingScore || b.matchedCount - a.matchedCount
  );
  clinicalFlags.sort((a, b) => b.evidenceMatchingScore - a.evidenceMatchingScore);

  if (possibleConditions.length === 0 && clinicalFlags.length === 0) {
    globalNextSteps.add(
      'No multi-criteria educational knowledge base rules were triggered from the entered information. Conduct a full history, physical examination, and appropriate diagnostic testing as clinically indicated.'
    );
    if (wm.symptomsRaw.length === 1) {
      globalMissingInfo.add(
        'Only a single symptom was provided. The inference engine intentionally does not generate disease suggestions from a single isolated symptom.'
      );
    }
  }

  return {
    possibleConditions,
    clinicalFlags,
    derivedFacts: wm.derivedFacts,
    missingInformation: Array.from(globalMissingInfo),
    conflictingEvidenceSummary: Array.from(globalConflicts),
    suggestedNextSteps: Array.from(globalNextSteps),
    rulesEvaluatedCount: activeRules.length,
    rulesTriggeredCount: possibleConditions.length + clinicalFlags.length,
    disclaimer: CLINICAL_DISCLAIMER,
  };
}

module.exports = {
  runInference,
  buildWorkingMemory,
  evaluateCondition,
  CLINICAL_DISCLAIMER,
};
