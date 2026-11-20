export const STANDARD_SYMPTOMS = [
  'Fever',
  'Headache',
  'Cough',
  'Fatigue',
  'Chest pain',
  'Breathing difficulty',
  'Nausea',
  'Vomiting',
  'Diarrhea',
  'Abdominal pain',
  'Joint pain',
  'Skin rash',
  'Dizziness',
  'Sore throat',
];

export const BLOOD_GROUPS = [
  'Unknown',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

export const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe'];

export const DURATION_UNITS = ['hours', 'days', 'weeks', 'months'];

export const LAB_TEST_PRESETS = [
  {
    testName: 'Hemoglobin',
    testKey: 'hemoglobin',
    unit: 'g/dL',
    referenceRange: '12.0 - 16.0',
    referenceMin: 12.0,
    referenceMax: 16.0,
  },
  {
    testName: 'Blood Glucose',
    testKey: 'blood_glucose',
    unit: 'mg/dL',
    referenceRange: '70 - 125',
    referenceMin: 70,
    referenceMax: 125,
  },
  {
    testName: 'Complete Blood Count (CBC)',
    testKey: 'cbc',
    unit: 'summary',
    referenceRange: 'Normal',
    referenceMin: '',
    referenceMax: '',
  },
  {
    testName: 'WBC Count',
    testKey: 'wbc',
    unit: '×10³/µL',
    referenceRange: '4.5 - 11.0',
    referenceMin: 4.5,
    referenceMax: 11.0,
  },
  {
    testName: 'Platelet Count',
    testKey: 'platelet_count',
    unit: '×10³/µL',
    referenceRange: '150 - 400',
    referenceMin: 150,
    referenceMax: 400,
  },
  {
    testName: 'CRP (C-Reactive Protein)',
    testKey: 'crp',
    unit: 'mg/L',
    referenceRange: '0 - 10',
    referenceMin: 0,
    referenceMax: 10,
  },
  {
    testName: 'Urine Test',
    testKey: 'urine_test',
    unit: 'qualitative',
    referenceRange: 'Negative / Normal',
    referenceMin: '',
    referenceMax: '',
  },
  {
    testName: 'HbA1c',
    testKey: 'hba1c',
    unit: '%',
    referenceRange: '4.0 - 5.6',
    referenceMin: 4.0,
    referenceMax: 5.6,
  },
];

export const CLINICAL_DISCLAIMER =
  'This system provides clinical decision support only. Final diagnosis and treatment decisions must be made by a qualified healthcare professional.';
