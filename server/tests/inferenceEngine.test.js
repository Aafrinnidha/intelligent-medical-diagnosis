const test = require('node:test');
const assert = require('node:assert/strict');
const { runInference } = require('../services/inferenceEngine');
const { evaluateEmergencyAlert } = require('../services/emergencyAlertService');

const MOCK_RULES = [
  {
    _id: 'rule-flu',
    ruleCode: 'RULE-FLU-01',
    name: 'Influenza-Like Illness Symptom Cluster',
    description: 'Demonstration rule for influenza',
    ruleType: 'condition_consideration',
    isActive: true,
    isDemonstrationRule: true,
    minConditionsToTrigger: 3,
    conclusion: 'Consider influenza as one possible condition.',
    disease: {
      _id: 'dis-flu',
      name: 'Influenza',
      category: 'Respiratory',
      description: 'Acute viral respiratory illness.',
      clinicalReferenceInfo: 'Educational demonstration reference.',
    },
    conditions: [
      { factType: 'symptom', key: 'fever', label: 'Fever is present', operator: 'present', weight: 2, required: true },
      { factType: 'symptom', key: 'cough', label: 'Cough is present', operator: 'present', weight: 2, required: true },
      { factType: 'symptom', key: 'fatigue', label: 'Fatigue is present', operator: 'present', weight: 1.5, required: true },
      { factType: 'vital', key: 'temperature', label: 'Temp >= 38.0°C', operator: 'gte', value: 38.0, unit: '°C', weight: 1.5, required: false },
    ],
    additionalInfoRequired: ['Rapid influenza test'],
    suggestedNextSteps: ['Assess oxygenation and respiratory exam'],
  },
  {
    _id: 'rule-anemia',
    ruleCode: 'RULE-ANEMIA-01',
    name: 'Low Hemoglobin + Fatigue',
    description: 'Demonstration rule for anemia',
    ruleType: 'condition_consideration',
    isActive: true,
    isDemonstrationRule: true,
    minConditionsToTrigger: 2,
    conclusion: 'Consider anemia as one possible condition.',
    disease: {
      _id: 'dis-anemia',
      name: 'Anemia',
      category: 'Hematologic',
      description: 'Low hemoglobin state.',
      clinicalReferenceInfo: 'Educational demonstration reference.',
    },
    conditions: [
      { factType: 'lab', key: 'hemoglobin', label: 'Hemoglobin below reference range', operator: 'below_ref', unit: 'g/dL', weight: 3, required: true },
      { factType: 'symptom', key: 'fatigue', label: 'Fatigue is present', operator: 'present', weight: 2, required: true },
    ],
    additionalInfoRequired: ['Iron studies and MCV'],
    suggestedNextSteps: ['Review CBC indices'],
  },
  {
    _id: 'rule-glucose',
    ruleCode: 'RULE-GLUCOSE-FLAG-01',
    name: 'Abnormal Blood Glucose Flag',
    description: 'Flags elevated blood glucose',
    ruleType: 'clinical_flag',
    isActive: true,
    isDemonstrationRule: true,
    minConditionsToTrigger: 1,
    conclusion: 'Flag abnormal glucose and recommend clinical evaluation.',
    disease: {
      _id: 'dis-dm',
      name: 'Type 2 Diabetes Mellitus',
      category: 'Endocrine',
      description: 'Hyperglycemia evaluation.',
      clinicalReferenceInfo: 'Educational demonstration reference.',
    },
    conditions: [
      { factType: 'lab', key: 'blood_glucose', label: 'Blood glucose above reference range', operator: 'above_ref', value: 125, unit: 'mg/dL', weight: 3, required: true },
    ],
    additionalInfoRequired: ['Confirmatory HbA1c'],
    suggestedNextSteps: ['Order HbA1c and fasting glucose'],
  },
  {
    _id: 'rule-bp',
    ruleCode: 'RULE-BP-FLAG-01',
    name: 'Elevated Blood Pressure Flag',
    description: 'Flags elevated BP',
    ruleType: 'clinical_flag',
    isActive: true,
    isDemonstrationRule: true,
    minConditionsToTrigger: 1,
    conclusion: 'Flag elevated blood pressure reading for doctor review.',
    disease: {
      _id: 'dis-htn',
      name: 'Hypertension',
      category: 'Cardiovascular',
      description: 'Elevated BP evaluation.',
      clinicalReferenceInfo: 'Educational demonstration reference.',
    },
    conditions: [
      { factType: 'vital', key: 'bloodPressureElevated', label: 'Elevated BP >= 140/90', operator: 'gte', value: { systolic: 140, diastolic: 90 }, unit: 'mmHg', weight: 3, required: true },
    ],
    additionalInfoRequired: ['Repeat resting BP'],
    suggestedNextSteps: ['Repeat seated BP after 5 minutes'],
  },
];

test('Inference engine triggers Influenza when fever + cough + fatigue are present', () => {
  const result = runInference({
    patient: { age: 34, gender: 'Female', existingConditions: [] },
    symptomInput: {
      selectedSymptoms: ['Fever', 'Cough', 'Fatigue'],
      severity: 'Moderate',
      vitals: { temperature: 38.6, systolicBP: 118, diastolicBP: 76, heartRate: 92, oxygenSaturation: 98 },
    },
    testResults: [],
    rules: MOCK_RULES,
  });

  assert.equal(result.possibleConditions.length, 1);
  assert.equal(result.possibleConditions[0].ruleCode, 'RULE-FLU-01');
  assert.equal(result.possibleConditions[0].evidenceMatchingScore, 100);
  assert.equal(result.clinicalFlags.length, 0);
});

test('Inference engine NEVER triggers disease diagnosis from a single isolated symptom', () => {
  const result = runInference({
    patient: { age: 29, gender: 'Male', existingConditions: [] },
    symptomInput: {
      selectedSymptoms: ['Fatigue'],
      severity: 'Mild',
      vitals: {},
    },
    testResults: [],
    rules: MOCK_RULES,
  });

  assert.equal(result.possibleConditions.length, 0);
  assert.equal(result.clinicalFlags.length, 0);
  assert.ok(result.missingInformation.some((m) => m.includes('single symptom')));
});

test('Inference engine triggers Anemia when hemoglobin is below reference range AND fatigue is present, without inventing missing tests', () => {
  const result = runInference({
    patient: { age: 41, gender: 'Female', existingConditions: [] },
    symptomInput: {
      selectedSymptoms: ['Fatigue'],
      severity: 'Moderate',
      vitals: { systolicBP: 115, diastolicBP: 72 },
    },
    testResults: [
      {
        testName: 'Hemoglobin',
        testKey: 'hemoglobin',
        value: '9.4',
        numericValue: 9.4,
        unit: 'g/dL',
        referenceRange: '12.0 - 16.0',
        referenceMin: 12.0,
        referenceMax: 16.0,
        interpretation: 'Low',
      },
    ],
    rules: MOCK_RULES,
  });

  assert.equal(result.possibleConditions.length, 1);
  assert.equal(result.possibleConditions[0].ruleCode, 'RULE-ANEMIA-01');
  assert.equal(result.possibleConditions[0].evidenceMatchingScore, 100);
});

test('Inference engine flags abnormal blood glucose and elevated BP as clinical flags', () => {
  const result = runInference({
    patient: { age: 58, gender: 'Male', existingConditions: ['Family history of diabetes'] },
    symptomInput: {
      selectedSymptoms: ['Headache'],
      severity: 'Moderate',
      vitals: { systolicBP: 156, diastolicBP: 96, heartRate: 84, oxygenSaturation: 98 },
    },
    testResults: [
      {
        testName: 'Blood Glucose',
        testKey: 'blood_glucose',
        value: '215',
        numericValue: 215,
        unit: 'mg/dL',
        referenceRange: '70 - 125',
        referenceMin: 70,
        referenceMax: 125,
        interpretation: 'High',
      },
    ],
    rules: MOCK_RULES,
  });

  assert.equal(result.clinicalFlags.length, 2);
  const codes = result.clinicalFlags.map((f) => f.ruleCode).sort();
  assert.deepEqual(codes, ['RULE-BP-FLAG-01', 'RULE-GLUCOSE-FLAG-01']);
});

test('Emergency alert system triggers RED immediately for chest pain + breathing difficulty or low SpO2', () => {
  const alert = evaluateEmergencyAlert({
    selectedSymptoms: ['Chest pain', 'Breathing difficulty'],
    severity: 'Severe',
    vitals: { oxygenSaturation: 88, systolicBP: 185, diastolicBP: 110 },
    patient: { age: 62 },
  });

  assert.equal(alert.level, 'RED');
  assert.equal(alert.headline, 'Immediate clinical attention may be required.');
  assert.ok(alert.triggeredCriteria.length >= 3);
});

test('Emergency alert GREEN explicitly warns it is not proof of patient safety', () => {
  const alert = evaluateEmergencyAlert({
    selectedSymptoms: ['Sore throat'],
    severity: 'Mild',
    vitals: { temperature: 37.0, systolicBP: 118, diastolicBP: 76, heartRate: 74, oxygenSaturation: 99 },
    patient: { age: 25 },
  });

  assert.equal(alert.level, 'GREEN');
  assert.equal(alert.headline, 'No configured warning criteria detected.');
  assert.ok(alert.safetyNote.toLowerCase().includes('not proof'));
});
