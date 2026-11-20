const Disease = require('../models/Disease');
const MedicalRule = require('../models/MedicalRule');

/**
 * Educational Demonstration Knowledge Base Seed Data
 *
 * IMPORTANT: Clearly labeled as non-clinical educational demonstration rules
 * designed to illustrate Knowledge Engineering, IF-THEN production rules,
 * and forward-chaining inference. Not validated clinical diagnostic criteria.
 */
const DEFAULT_DISEASES = [
  {
    code: 'DIS-COMMON-COLD',
    name: 'Common Cold (Acute Viral Upper Respiratory Infection)',
    category: 'Respiratory',
    description:
      'A mild, self-limiting viral infection of the upper respiratory tract commonly presenting with sore throat, cough, mild headache, and fatigue without severe systemic distress.',
    commonSymptoms: ['Sore throat', 'Cough', 'Headache', 'Fatigue', 'Fever'],
    associatedTestFindings: [
      'Usually clinical evaluation; WBC and CRP typically normal or mildly elevated',
    ],
    relevantMedicalHistory: [
      'Recent exposure to upper respiratory illness',
      'Seasonal viral circulation',
    ],
    riskFactors: ['Close indoor contact', 'Seasonal changes', 'Immunocompromised state'],
    clinicalReferenceInfo:
      '[Educational Demonstration Reference — Non-Clinical] Acute viral URI is typically managed supportively after excluding bacterial pharyngitis, influenza, COVID-19, or lower respiratory tract infection.',
    recommendedNextSteps: [
      'Perform focused HEENT and lung auscultation examination.',
      'Differentiate from influenza, streptococcal pharyngitis, or COVID-19 if fever or red flags are present.',
      'Review hydration, symptom duration, and return precautions with patient.',
    ],
    isDemonstrationData: true,
    reviewStatus: 'Educational Demonstration (Non-Clinical)',
  },
  {
    code: 'DIS-INFLUENZA',
    name: 'Influenza (Seasonal Viral Syndrome)',
    category: 'Respiratory / Infectious',
    description:
      'An acute respiratory viral illness typically characterized by sudden onset of fever, cough, marked fatigue, headache, and myalgia/joint aches.',
    commonSymptoms: ['Fever', 'Cough', 'Fatigue', 'Headache', 'Joint pain', 'Sore throat'],
    associatedTestFindings: [
      'Rapid influenza diagnostic test (RIDT) or RT-PCR confirmation',
      'Normal or mildly reduced WBC count; CRP may be mildly elevated',
    ],
    relevantMedicalHistory: [
      'Vaccination status',
      'Recent sick contacts',
      'Chronic cardiopulmonary conditions or asthma',
    ],
    riskFactors: [
      'Age ≥ 65 years',
      'Chronic pulmonary or cardiac disease',
      'Immunosuppression',
      'Unvaccinated status during peak season',
    ],
    clinicalReferenceInfo:
      '[Educational Demonstration Reference — Non-Clinical] Clinical presentation overlaps with other respiratory viruses. Confirm with diagnostic testing when treatment decisions (e.g., antiviral therapy) depend on etiology.',
    recommendedNextSteps: [
      'Consider point-of-care respiratory viral panel / influenza PCR if clinically indicated.',
      'Assess oxygenation (SpO2) and auscultate lungs to rule out secondary pneumonia.',
      'Evaluate high-risk comorbidities and symptom onset window (< 48 hours) for antiviral eligibility.',
    ],
    isDemonstrationData: true,
    reviewStatus: 'Educational Demonstration (Non-Clinical)',
  },
  {
    code: 'DIS-TYPE2-DIABETES',
    name: 'Type 2 Diabetes Mellitus (Hyperglycemia Evaluation)',
    category: 'Endocrine / Metabolic',
    description:
      'A chronic metabolic disorder characterized by insulin resistance and elevated blood glucose levels. Often asymptomatic early or accompanied by fatigue and dizziness.',
    commonSymptoms: ['Fatigue', 'Dizziness', 'Headache'],
    associatedTestFindings: [
      'Elevated fasting or random blood glucose above reference range',
      'Elevated HbA1c (≥ 6.5% per standard clinical criteria)',
      'Glycosuria on urine test',
    ],
    relevantMedicalHistory: [
      'History of prediabetes or gestational diabetes',
      'Hypertension or dyslipidemia',
      'Family history of diabetes mellitus',
    ],
    riskFactors: ['Age ≥ 45 years', 'Hypertension', 'Obesity/sedentary lifestyle', 'Family history'],
    clinicalReferenceInfo:
      '[Educational Demonstration Reference — Non-Clinical] A single abnormal glucose measurement flags the need for confirmatory laboratory evaluation (fasting plasma glucose, HbA1c, or OGTT) per clinical guidelines.',
    recommendedNextSteps: [
      'Confirm whether blood glucose sample was fasting or random/postprandial.',
      'Order confirmatory HbA1c and fasting plasma glucose panel.',
      'Evaluate urinalysis for ketones/protein and review cardiovascular risk factors.',
    ],
    isDemonstrationData: true,
    reviewStatus: 'Educational Demonstration (Non-Clinical)',
  },
  {
    code: 'DIS-ANEMIA',
    name: 'Anemia (Reduced Hemoglobin Evaluation)',
    category: 'Hematologic',
    description:
      'A clinical state defined by hemoglobin concentration below age- and sex-appropriate reference intervals, often manifesting with fatigue, dizziness, headache, or exertional breathing difficulty.',
    commonSymptoms: ['Fatigue', 'Dizziness', 'Headache', 'Breathing difficulty'],
    associatedTestFindings: [
      'Hemoglobin below reference range',
      'Abnormal Complete Blood Count (CBC) indices (MCV, MCH, RDW)',
    ],
    relevantMedicalHistory: [
      'Chronic kidney disease',
      'Nutritional deficiency or gastrointestinal blood loss',
      'Heavy menstrual bleeding or chronic inflammatory disease',
    ],
    riskFactors: ['Iron/B12/folate deficiency', 'Chronic blood loss', 'Chronic medical illness'],
    clinicalReferenceInfo:
      '[Educational Demonstration Reference — Non-Clinical] Anemia is a clinical finding requiring etiologic classification (microcytic, normocytic, macrocytic) using CBC indices, reticulocyte count, and iron/vitamin studies.',
    recommendedNextSteps: [
      'Review complete blood count (MCV, RDW, WBC, platelets) and peripheral blood smear.',
      'Order ferritin, iron panel, vitamin B12, folate, and reticulocyte count as appropriate.',
      'Evaluate for acute or occult bleeding and hemodynamic stability.',
    ],
    isDemonstrationData: true,
    reviewStatus: 'Educational Demonstration (Non-Clinical)',
  },
  {
    code: 'DIS-HYPERTENSION',
    name: 'Hypertension (Elevated Blood Pressure Evaluation)',
    category: 'Cardiovascular',
    description:
      'Persistently elevated systemic arterial blood pressure. Frequently asymptomatic, though severe elevations may accompany headache, dizziness, chest pain, or breathing difficulty.',
    commonSymptoms: ['Headache', 'Dizziness', 'Chest pain', 'Breathing difficulty'],
    associatedTestFindings: [
      'Elevated systolic (≥ 140 mmHg) or diastolic (≥ 90 mmHg) blood pressure reading',
      'Baseline renal panel, electrolytes, lipid profile, and ECG for end-organ assessment',
    ],
    relevantMedicalHistory: [
      'Prior elevated BP readings or diagnosed hypertension',
      'Diabetes mellitus or chronic kidney disease',
      'Antihypertensive medication adherence',
    ],
    riskFactors: ['Age ≥ 45 years', 'Diabetes', 'High sodium intake', 'Family history of cardiovascular disease'],
    clinicalReferenceInfo:
      '[Educational Demonstration Reference — Non-Clinical] Diagnosis of hypertension requires standardized repeated blood pressure measurements over multiple visits or ambulatory/home BP monitoring, unless acute end-organ damage is suspected.',
    recommendedNextSteps: [
      'Repeat blood pressure measurement after 5 minutes of seated rest with proper cuff size.',
      'Screen for symptoms of acute target-organ damage (chest pain, dyspnea, focal neurologic deficits).',
      'Review home BP log, medication adherence, renal function, and ECG if indicated.',
    ],
    isDemonstrationData: true,
    reviewStatus: 'Educational Demonstration (Non-Clinical)',
  },
  {
    code: 'DIS-GASTROENTERITIS',
    name: 'Acute Gastroenteritis',
    category: 'Gastrointestinal',
    description:
      'Inflammation of the stomach and intestinal tract commonly presenting with nausea, vomiting, diarrhea, abdominal pain, and occasionally fever or fatigue.',
    commonSymptoms: ['Nausea', 'Vomiting', 'Diarrhea', 'Abdominal pain', 'Fever', 'Fatigue'],
    associatedTestFindings: [
      'Electrolytes and renal function if dehydration suspected',
      'CBC / CRP / stool studies if prolonged, bloody, or febrile',
    ],
    relevantMedicalHistory: [
      'Recent food/water exposure or sick contacts',
      'Recent antibiotic use',
      'Travel history',
    ],
    riskFactors: ['Contaminated food or water exposure', 'Extremes of age', 'Immunocompromise'],
    clinicalReferenceInfo:
      '[Educational Demonstration Reference — Non-Clinical] Most acute cases are viral and self-limited, but clinicians should assess hydration status and exclude surgical abdomen or invasive bacterial infection.',
    recommendedNextSteps: [
      'Perform abdominal examination to exclude peritoneal signs or surgical causes of abdominal pain.',
      'Assess hydration status, orthostatic vitals, and ability to tolerate oral fluids.',
      'Consider serum electrolytes and stool studies if severe, bloody, or lasting > 48–72 hours.',
    ],
    isDemonstrationData: true,
    reviewStatus: 'Educational Demonstration (Non-Clinical)',
  },
];

function buildDefaultRules(diseaseMap) {
  return [
    {
      ruleCode: 'RULE-FLU-01',
      name: 'Influenza-Like Illness Symptom Cluster',
      description:
        'Educational demonstration rule: matches classic acute systemic and respiratory symptom cluster for influenza consideration.',
      disease: diseaseMap.get('DIS-INFLUENZA')._id,
      ruleType: 'condition_consideration',
      conditions: [
        {
          factType: 'symptom',
          key: 'fever',
          label: 'Fever is present',
          operator: 'present',
          weight: 2,
          required: true,
        },
        {
          factType: 'symptom',
          key: 'cough',
          label: 'Cough is present',
          operator: 'present',
          weight: 2,
          required: true,
        },
        {
          factType: 'symptom',
          key: 'fatigue',
          label: 'Fatigue is present',
          operator: 'present',
          weight: 1.5,
          required: true,
        },
        {
          factType: 'symptom',
          key: 'headache',
          label: 'Headache is present',
          operator: 'present',
          weight: 1,
          required: false,
        },
        {
          factType: 'symptom',
          key: 'joint_pain',
          label: 'Joint pain / body aches present',
          operator: 'present',
          weight: 1,
          required: false,
        },
        {
          factType: 'vital',
          key: 'temperature',
          label: 'Measured temperature ≥ 38.0°C',
          operator: 'gte',
          value: 38.0,
          unit: '°C',
          weight: 1.5,
          required: false,
        },
      ],
      minConditionsToTrigger: 3,
      conclusion:
        'Consider influenza as one possible condition (differentiate from COVID-19 and other viral respiratory syndromes).',
      additionalInfoRequired: [
        'Influenza rapid antigen / RT-PCR test if treatment depends on confirmation',
        'Symptom onset timeline (hours since onset) and vaccination history',
        'Lung auscultation and oxygen saturation (SpO2)',
      ],
      suggestedNextSteps: [
        'Verify respiratory examination and SpO2.',
        'Consider targeted viral diagnostic testing.',
        'Assess high-risk comorbidities for antiviral consideration.',
      ],
      isActive: true,
      isDemonstrationRule: true,
    },
    {
      ruleCode: 'RULE-COLD-01',
      name: 'Upper Respiratory Common Cold Pattern',
      description:
        'Educational demonstration rule: mild upper respiratory symptoms (sore throat and cough) typically without severe systemic findings.',
      disease: diseaseMap.get('DIS-COMMON-COLD')._id,
      ruleType: 'condition_consideration',
      conditions: [
        {
          factType: 'symptom',
          key: 'sore_throat',
          label: 'Sore throat is present',
          operator: 'present',
          weight: 2,
          required: true,
        },
        {
          factType: 'symptom',
          key: 'cough',
          label: 'Cough is present',
          operator: 'present',
          weight: 2,
          required: true,
        },
        {
          factType: 'symptom',
          key: 'headache',
          label: 'Headache is present',
          operator: 'present',
          weight: 1,
          required: false,
        },
        {
          factType: 'severity',
          key: 'severity',
          label: 'Symptom severity is Mild or Moderate',
          operator: 'in',
          value: ['Mild', 'Moderate'],
          weight: 1,
          required: false,
        },
        {
          factType: 'symptom',
          key: 'breathing_difficulty',
          label: 'No breathing difficulty reported',
          operator: 'absent',
          weight: 1,
          required: false,
        },
      ],
      minConditionsToTrigger: 2,
      conclusion:
        'Consider common cold (acute viral upper respiratory infection) as one possible condition.',
      additionalInfoRequired: [
        'Oropharyngeal exam (tonsillar exudates, cervical lymphadenopathy)',
        'Duration of symptoms to assess viral vs secondary bacterial course',
      ],
      suggestedNextSteps: [
        'Perform focused upper airway and chest examination.',
        'Consider rapid strep test if Centor criteria are met.',
      ],
      isActive: true,
      isDemonstrationRule: true,
    },
    {
      ruleCode: 'RULE-ANEMIA-01',
      name: 'Low Hemoglobin with Anemia-Associated Symptoms',
      description:
        'Educational demonstration rule: flags anemia consideration when hemoglobin is below reference range alongside fatigue or dizziness.',
      disease: diseaseMap.get('DIS-ANEMIA')._id,
      ruleType: 'condition_consideration',
      conditions: [
        {
          factType: 'lab',
          key: 'hemoglobin',
          label: 'Hemoglobin below appropriate reference range',
          operator: 'below_ref',
          unit: 'g/dL',
          weight: 3,
          required: true,
        },
        {
          factType: 'symptom',
          key: 'fatigue',
          label: 'Fatigue is present',
          operator: 'present',
          weight: 2,
          required: true,
        },
        {
          factType: 'symptom',
          key: 'dizziness',
          label: 'Dizziness is present',
          operator: 'present',
          weight: 1,
          required: false,
        },
        {
          factType: 'symptom',
          key: 'breathing_difficulty',
          label: 'Breathing difficulty / exertional dyspnea',
          operator: 'present',
          weight: 1,
          required: false,
        },
        {
          factType: 'history',
          key: 'anemia',
          label: 'History of anemia, iron deficiency, or blood loss',
          operator: 'includes',
          value: ['anemia', 'iron', 'bleeding', 'kidney'],
          weight: 1,
          required: false,
        },
      ],
      minConditionsToTrigger: 2,
      conclusion:
        'Consider anemia as one possible condition requiring etiologic clinical evaluation.',
      additionalInfoRequired: [
        'Full Complete Blood Count (MCV, MCH, RDW, reticulocyte count)',
        'Iron studies (ferritin, serum iron, TIBC), Vitamin B12, and folate levels',
        'Evaluation for potential source of acute or chronic blood loss',
      ],
      suggestedNextSteps: [
        'Review CBC red cell indices to classify microcytic, normocytic, or macrocytic anemia.',
        'Order targeted nutritional and hemolysis/bleeding workup.',
      ],
      isActive: true,
      isDemonstrationRule: true,
    },
    {
      ruleCode: 'RULE-GLUCOSE-FLAG-01',
      name: 'Abnormal Elevated Blood Glucose Clinical Flag',
      description:
        'Educational demonstration rule: flags blood glucose above the reference range for confirmatory clinical evaluation of diabetes/hyperglycemia.',
      disease: diseaseMap.get('DIS-TYPE2-DIABETES')._id,
      ruleType: 'clinical_flag',
      conditions: [
        {
          factType: 'lab',
          key: 'blood_glucose',
          label: 'Blood glucose is above reference range',
          operator: 'above_ref',
          value: 125,
          unit: 'mg/dL',
          weight: 3,
          required: true,
        },
        {
          factType: 'symptom',
          key: 'fatigue',
          label: 'Fatigue reported',
          operator: 'present',
          weight: 1,
          required: false,
        },
        {
          factType: 'demographic',
          key: 'age',
          label: 'Patient age ≥ 40 years',
          operator: 'gte',
          value: 40,
          weight: 1,
          required: false,
        },
        {
          factType: 'history',
          key: 'diabetes',
          label: 'History of diabetes, prediabetes, or hypertension',
          operator: 'includes',
          value: ['diabetes', 'prediabetes', 'hypertension', 'glucose'],
          weight: 1,
          required: false,
        },
      ],
      minConditionsToTrigger: 1,
      conclusion:
        'Flag abnormal blood glucose reading and recommend confirmatory clinical evaluation for hyperglycemia / Type 2 diabetes.',
      additionalInfoRequired: [
        'Clarify fasting vs postprandial/random sampling status',
        'Confirmatory HbA1c and repeat fasting plasma glucose',
        'Urinalysis (glucose and ketones)',
      ],
      suggestedNextSteps: [
        'Confirm fasting status of the glucose measurement.',
        'Order HbA1c and confirmatory metabolic panel.',
      ],
      isActive: true,
      isDemonstrationRule: true,
    },
    {
      ruleCode: 'RULE-BP-FLAG-01',
      name: 'Elevated Blood Pressure Clinical Flag',
      description:
        'Educational demonstration rule: flags elevated blood pressure (≥ 140/90 mmHg) for doctor review and hypertension assessment.',
      disease: diseaseMap.get('DIS-HYPERTENSION')._id,
      ruleType: 'clinical_flag',
      conditions: [
        {
          factType: 'vital',
          key: 'bloodPressureElevated',
          label: 'Elevated blood pressure recorded (≥ 140/90 mmHg)',
          operator: 'gte',
          value: { systolic: 140, diastolic: 90 },
          unit: 'mmHg',
          weight: 3,
          required: true,
        },
        {
          factType: 'symptom',
          key: 'headache',
          label: 'Headache reported',
          operator: 'present',
          weight: 1,
          required: false,
        },
        {
          factType: 'symptom',
          key: 'dizziness',
          label: 'Dizziness reported',
          operator: 'present',
          weight: 1,
          required: false,
        },
        {
          factType: 'history',
          key: 'hypertension',
          label: 'History of hypertension, renal, or cardiovascular disease',
          operator: 'includes',
          value: ['hypertension', 'blood pressure', 'cardiac', 'kidney', 'diabetes'],
          weight: 1.5,
          required: false,
        },
        {
          factType: 'demographic',
          key: 'age',
          label: 'Patient age ≥ 45 years',
          operator: 'gte',
          value: 45,
          weight: 1,
          required: false,
        },
      ],
      minConditionsToTrigger: 1,
      conclusion:
        'Flag elevated blood pressure reading for doctor review and standardized repeat BP confirmation.',
      additionalInfoRequired: [
        'Repeat seated resting blood pressure after 5 minutes',
        'Home/ambulatory BP history and current antihypertensive medication adherence',
        'Assessment for target-organ symptoms',
      ],
      suggestedNextSteps: [
        'Repeat blood pressure measurement using standardized technique.',
        'Review baseline renal panel, electrolytes, and ECG if persistent or symptomatic.',
      ],
      isActive: true,
      isDemonstrationRule: true,
    },
    {
      ruleCode: 'RULE-GASTRO-01',
      name: 'Acute Gastroenteritis Gastrointestinal Cluster',
      description:
        'Educational demonstration rule: matches acute gastrointestinal symptom cluster (nausea/vomiting, diarrhea, abdominal pain).',
      disease: diseaseMap.get('DIS-GASTROENTERITIS')._id,
      ruleType: 'condition_consideration',
      conditions: [
        {
          factType: 'symptom',
          key: 'diarrhea',
          label: 'Diarrhea is present',
          operator: 'present',
          weight: 2,
          required: false,
        },
        {
          factType: 'symptom',
          key: 'nausea',
          label: 'Nausea is present',
          operator: 'present',
          weight: 1.5,
          required: false,
        },
        {
          factType: 'symptom',
          key: 'vomiting',
          label: 'Vomiting is present',
          operator: 'present',
          weight: 2,
          required: false,
        },
        {
          factType: 'symptom',
          key: 'abdominal_pain',
          label: 'Abdominal pain is present',
          operator: 'present',
          weight: 2,
          required: false,
        },
        {
          factType: 'symptom',
          key: 'fever',
          label: 'Fever is present',
          operator: 'present',
          weight: 1,
          required: false,
        },
        {
          factType: 'lab',
          key: 'wbc',
          label: 'WBC count elevated above reference range',
          operator: 'above_ref',
          value: 11.0,
          unit: '×10³/µL',
          weight: 1,
          required: false,
        },
      ],
      minConditionsToTrigger: 2,
      conclusion:
        'Consider acute gastroenteritis as one possible condition (assess hydration status and exclude surgical or systemic abdominal pathology).',
      additionalInfoRequired: [
        'Focused abdominal physical examination (rebound, guarding, localization)',
        'Hydration assessment and dietary/travel/exposure history',
        'Serum electrolytes if vomiting or diarrhea is frequent/prolonged',
      ],
      suggestedNextSteps: [
        'Assess volume status and oral fluid tolerance.',
        'Exclude acute surgical abdomen and invasive bacterial colitis.',
      ],
      isActive: true,
      isDemonstrationRule: true,
    },
  ];
}

async function ensureSeededKnowledgeBase() {
  const existingDiseasesCount = await Disease.countDocuments();
  const existingRulesCount = await MedicalRule.countDocuments();

  if (existingDiseasesCount > 0 && existingRulesCount > 0) {
    return { seeded: false, diseasesCount: existingDiseasesCount, rulesCount: existingRulesCount };
  }

  const diseaseMap = new Map();

  for (const d of DEFAULT_DISEASES) {
    let doc = await Disease.findOne({ code: d.code });
    if (!doc) {
      doc = await Disease.create(d);
    }
    diseaseMap.set(d.code, doc);
  }

  const defaultRules = buildDefaultRules(diseaseMap);
  for (const r of defaultRules) {
    const existingRule = await MedicalRule.findOne({ ruleCode: r.ruleCode });
    if (!existingRule) {
      await MedicalRule.create(r);
    }
  }

  const finalDiseases = await Disease.countDocuments();
  const finalRules = await MedicalRule.countDocuments();

  return { seeded: true, diseasesCount: finalDiseases, rulesCount: finalRules };
}

async function getActiveRulesWithDiseases() {
  return MedicalRule.find({ isActive: true })
    .populate('disease')
    .sort({ ruleCode: 1 })
    .lean();
}

module.exports = {
  ensureSeededKnowledgeBase,
  getActiveRulesWithDiseases,
  DEFAULT_DISEASES,
};
