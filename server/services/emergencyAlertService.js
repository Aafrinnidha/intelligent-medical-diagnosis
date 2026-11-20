/**
 * Emergency Alert System (Independent Clinical Safety Screening)
 *
 * Evaluates urgent symptoms, abnormal vital signs, and critical lab values
 * synchronously and independently of the inference engine so urgent warnings
 * never wait for rule-chaining to finish.
 *
 * IMPORTANT: These thresholds are educational demonstration safety criteria,
 * not a substitute for local emergency protocols or physician judgment.
 */

function toNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function normalizeSymptoms(selectedSymptoms = [], additionalSymptoms = []) {
  return [...selectedSymptoms, ...additionalSymptoms]
    .filter(Boolean)
    .map((s) => String(s).trim().toLowerCase());
}

function evaluateEmergencyAlert({
  selectedSymptoms = [],
  additionalSymptoms = [],
  severity = 'Moderate',
  vitals = {},
  testResults = [],
  patient = {},
} = {}) {
  const symptoms = normalizeSymptoms(selectedSymptoms, additionalSymptoms);
  const redCriteria = [];
  const orangeCriteria = [];

  const hasSymptom = (name) => symptoms.some((s) => s.includes(name.toLowerCase()));

  const temp = toNumber(vitals.temperature);
  const sysBP = toNumber(vitals.systolicBP);
  const diaBP = toNumber(vitals.diastolicBP);
  const hr = toNumber(vitals.heartRate);
  const spo2 = toNumber(vitals.oxygenSaturation);
  const age = toNumber(patient.age);

  const hasChestPain = hasSymptom('chest pain');
  const hasBreathingDiff =
    hasSymptom('breathing difficulty') ||
    hasSymptom('shortness of breath') ||
    hasSymptom('dyspnea');
  const hasDizziness = hasSymptom('dizziness') || hasSymptom('syncope') || hasSymptom('fainting');

  // --- RED: Immediate clinical attention may be required ---
  if (hasChestPain && hasBreathingDiff) {
    redCriteria.push(
      'Concurrent chest pain and breathing difficulty reported (potential acute cardiopulmonary concern).'
    );
  } else if (hasChestPain && (severity === 'Severe' || hasDizziness || (age !== null && age >= 50))) {
    redCriteria.push(
      'Chest pain with high-risk feature (severe intensity, dizziness, or age ≥ 50).'
    );
  }

  if (hasBreathingDiff && severity === 'Severe') {
    redCriteria.push('Severe breathing difficulty reported.');
  }

  if (spo2 !== null && spo2 < 90) {
    redCriteria.push(`Critical low oxygen saturation: SpO2 ${spo2}% (< 90%).`);
  }

  if ((sysBP !== null && sysBP >= 180) || (diaBP !== null && diaBP >= 120)) {
    redCriteria.push(
      `Hypertensive crisis-range blood pressure: ${sysBP ?? '?'} / ${diaBP ?? '?'} mmHg (≥ 180/120 mmHg).`
    );
  }

  if (sysBP !== null && sysBP < 90) {
    redCriteria.push(`Marked hypotension: Systolic BP ${sysBP} mmHg (< 90 mmHg).`);
  }

  if (hr !== null && (hr > 130 || hr < 45)) {
    redCriteria.push(`Critical heart rate abnormality: ${hr} bpm (> 130 or < 45 bpm).`);
  }

  if (temp !== null && (temp >= 40.0 || temp < 35.0)) {
    redCriteria.push(
      `Extreme body temperature: ${temp}°C (≥ 40.0°C hyperpyrexia or < 35.0°C hypothermia).`
    );
  }

  // Check critical lab values if provided (never invent missing values)
  for (const test of testResults || []) {
    const key = String(test.testKey || test.testName || '').toLowerCase();
    const num = toNumber(test.numericValue ?? test.value);
    if (num === null) continue;

    if (key.includes('glucose')) {
      if (num < 54) {
        redCriteria.push(`Critical hypoglycemia: Blood glucose ${num} ${test.unit || 'mg/dL'} (< 54).`);
      } else if (num >= 400) {
        redCriteria.push(`Critical hyperglycemia: Blood glucose ${num} ${test.unit || 'mg/dL'} (≥ 400).`);
      } else if (num < 70 || num >= 250) {
        orangeCriteria.push(
          `Markedly abnormal blood glucose: ${num} ${test.unit || 'mg/dL'} (< 70 or ≥ 250).`
        );
      }
    }

    if (key.includes('hemoglobin') || key === 'hb' || key === 'hgb') {
      if (num < 7.0) {
        redCriteria.push(`Critically low hemoglobin: ${num} ${test.unit || 'g/dL'} (< 7.0 g/dL).`);
      } else if (num < 8.5) {
        orangeCriteria.push(`Severely reduced hemoglobin: ${num} ${test.unit || 'g/dL'} (< 8.5 g/dL).`);
      }
    }

    if (key.includes('platelet')) {
      if (num < 50) {
        redCriteria.push(`Critically low platelet count: ${num} ${test.unit || '×10³/µL'} (< 50).`);
      } else if (num < 100) {
        orangeCriteria.push(`Low platelet count: ${num} ${test.unit || '×10³/µL'} (< 100).`);
      }
    }
  }

  // --- ORANGE: Prompt medical evaluation recommended ---
  if (hasChestPain && redCriteria.length === 0) {
    orangeCriteria.push('Chest pain reported — warrants prompt clinical and cardiac evaluation.');
  }

  if (hasBreathingDiff && severity !== 'Severe') {
    orangeCriteria.push('Breathing difficulty reported — prompt respiratory evaluation recommended.');
  }

  if (spo2 !== null && spo2 >= 90 && spo2 <= 94) {
    orangeCriteria.push(`Borderline/low oxygen saturation: SpO2 ${spo2}% (90–94%).`);
  }

  if (
    ((sysBP !== null && sysBP >= 160 && sysBP < 180) ||
      (diaBP !== null && diaBP >= 100 && diaBP < 120))
  ) {
    orangeCriteria.push(
      `Stage 2 elevated blood pressure: ${sysBP ?? '?'} / ${diaBP ?? '?'} mmHg (≥ 160/100 mmHg).`
    );
  }

  if (hr !== null && ((hr > 110 && hr <= 130) || (hr >= 45 && hr < 50))) {
    orangeCriteria.push(`Abnormal heart rate: ${hr} bpm (tachycardia > 110 or bradycardia < 50).`);
  }

  if (temp !== null && temp >= 39.0 && temp < 40.0) {
    orangeCriteria.push(`High fever: ${temp}°C (39.0–39.9°C).`);
  }

  if (severity === 'Severe' && redCriteria.length === 0) {
    orangeCriteria.push('Doctor recorded overall symptom severity as Severe.');
  }

  if (hasSymptom('vomiting') && hasSymptom('diarrhea') && hasDizziness) {
    orangeCriteria.push(
      'Vomiting and diarrhea accompanied by dizziness — evaluate for volume depletion/dehydration.'
    );
  }

  if (redCriteria.length > 0) {
    return {
      level: 'RED',
      headline: 'Immediate clinical attention may be required.',
      safetyNote:
        'Urgent warning criteria detected. Prioritize immediate bedside assessment and emergency clinical protocols before reviewing decision-support suggestions.',
      triggeredCriteria: [...redCriteria, ...orangeCriteria],
      evaluatedAt: new Date(),
    };
  }

  if (orangeCriteria.length > 0) {
    return {
      level: 'ORANGE',
      headline: 'Prompt medical evaluation recommended.',
      safetyNote:
        'Configured warning indicators were detected. Timely physician assessment and targeted diagnostic workup are recommended.',
      triggeredCriteria: orangeCriteria,
      evaluatedAt: new Date(),
    };
  }

  return {
    level: 'GREEN',
    headline: 'No configured warning criteria detected.',
    safetyNote:
      'IMPORTANT: A green status only indicates no configured automated warning thresholds were triggered from the entered data. It is NOT proof that the patient is safe or stable. Always apply full clinical judgment and verify missing vital signs.',
    triggeredCriteria: [],
    evaluatedAt: new Date(),
  };
}

module.exports = {
  evaluateEmergencyAlert,
};
