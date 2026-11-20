/**
 * Real-time client-side Emergency Safety Screening.
 * Mirrors server/services/emergencyAlertService.js so emergency warnings appear
 * instantaneously during data entry without waiting for the inference engine.
 */

function toNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export function evaluateEmergencyRealtime({
  selectedSymptoms = [],
  additionalSymptoms = [],
  severity = 'Moderate',
  vitals = {},
  testResults = [],
  patient = {},
} = {}) {
  const symptoms = [...selectedSymptoms, ...additionalSymptoms]
    .filter(Boolean)
    .map((s) => String(s).trim().toLowerCase());

  const hasSymptom = (term) => symptoms.some((s) => s.includes(term.toLowerCase()));

  const redCriteria = [];
  const orangeCriteria = [];

  const temp = toNum(vitals.temperature);
  const sysBP = toNum(vitals.systolicBP);
  const diaBP = toNum(vitals.diastolicBP);
  const hr = toNum(vitals.heartRate);
  const spo2 = toNum(vitals.oxygenSaturation);
  const age = toNum(patient?.age);

  const hasChestPain = hasSymptom('chest pain');
  const hasBreathingDiff =
    hasSymptom('breathing difficulty') ||
    hasSymptom('shortness of breath') ||
    hasSymptom('dyspnea');
  const hasDizziness = hasSymptom('dizziness') || hasSymptom('fainting') || hasSymptom('syncope');

  // RED Criteria
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
    redCriteria.push(`Extreme body temperature: ${temp}°C (≥ 40.0°C or < 35.0°C).`);
  }

  for (const test of testResults || []) {
    const key = String(test.testKey || test.testName || '').toLowerCase();
    const num = toNum(test.value);
    if (num === null) continue;

    if (key.includes('glucose')) {
      if (num < 54) {
        redCriteria.push(`Critical hypoglycemia: Blood glucose ${num} ${test.unit || 'mg/dL'} (< 54).`);
      } else if (num >= 400) {
        redCriteria.push(`Critical hyperglycemia: Blood glucose ${num} ${test.unit || 'mg/dL'} (≥ 400).`);
      } else if (num < 70 || num >= 250) {
        orangeCriteria.push(`Markedly abnormal blood glucose: ${num} ${test.unit || 'mg/dL'}.`);
      }
    }

    if (key.includes('hemoglobin') || key === 'hb' || key === 'hgb') {
      if (num < 7.0) {
        redCriteria.push(`Critically low hemoglobin: ${num} ${test.unit || 'g/dL'} (< 7.0).`);
      } else if (num < 8.5) {
        orangeCriteria.push(`Severely reduced hemoglobin: ${num} ${test.unit || 'g/dL'} (< 8.5).`);
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

  // ORANGE Criteria
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
    (sysBP !== null && sysBP >= 160 && sysBP < 180) ||
    (diaBP !== null && diaBP >= 100 && diaBP < 120)
  ) {
    orangeCriteria.push(
      `Stage 2 elevated blood pressure: ${sysBP ?? '?'} / ${diaBP ?? '?'} mmHg (≥ 160/100 mmHg).`
    );
  }

  if (hr !== null && ((hr > 110 && hr <= 130) || (hr >= 45 && hr < 50))) {
    orangeCriteria.push(`Abnormal heart rate: ${hr} bpm.`);
  }

  if (temp !== null && temp >= 39.0 && temp < 40.0) {
    orangeCriteria.push(`High fever: ${temp}°C (39.0–39.9°C).`);
  }

  if (severity === 'Severe' && redCriteria.length === 0) {
    orangeCriteria.push('Overall symptom severity marked as Severe.');
  }

  if (hasSymptom('vomiting') && hasSymptom('diarrhea') && hasDizziness) {
    orangeCriteria.push('Vomiting, diarrhea, and dizziness — evaluate for dehydration.');
  }

  if (redCriteria.length > 0) {
    return {
      level: 'RED',
      headline: 'Immediate clinical attention may be required.',
      safetyNote:
        'Urgent warning criteria detected immediately. Prioritize bedside assessment and emergency clinical protocols before reviewing decision-support suggestions.',
      triggeredCriteria: [...redCriteria, ...orangeCriteria],
    };
  }

  if (orangeCriteria.length > 0) {
    return {
      level: 'ORANGE',
      headline: 'Prompt medical evaluation recommended.',
      safetyNote:
        'Configured warning indicators detected. Timely physician assessment and targeted diagnostic workup are recommended.',
      triggeredCriteria: orangeCriteria,
    };
  }

  return {
    level: 'GREEN',
    headline: 'No configured warning criteria detected.',
    safetyNote:
      'Note: A green status indicates only that no configured warning criteria were triggered by the entered fields. It is NOT proof that the patient is safe. Always apply full clinical judgment.',
    triggeredCriteria: [],
  };
}
