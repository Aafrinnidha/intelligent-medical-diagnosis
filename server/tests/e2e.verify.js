/**
 * End-to-End API Integration Verification Script
 * Tests the full workflow against a live Express + MongoDB instance:
 * Registration -> RBAC -> Patient CRUD -> Emergency Screening ->
 * Multi-scenario Forward-Chaining Diagnosis -> Doctor Verification ->
 * History Filtering -> PDF Report Generation -> Dashboard -> Logout.
 */

const assert = require('node:assert/strict');

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5000/api';

async function apiFetch(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, contentType, buffer: buf };
  }

  const data = await res.json().catch(() => null);
  return { status: res.status, contentType, data };
}

async function run() {
  const suffix = Date.now();
  const doctorEmail = `dr.test.${suffix}@clinic-demo.org`;
  const expertEmail = `expert.test.${suffix}@clinic-demo.org`;
  const password = 'ClinicalPassword123!';

  console.log('1. Checking API health...');
  const health = await apiFetch('/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.status, 'ok');

  console.log('2. Registering standard doctor account...');
  const regDoc = await apiFetch('/auth/register', {
    method: 'POST',
    body: {
      name: 'Elena Carter',
      email: doctorEmail,
      password,
      specialization: 'Internal Medicine',
      licenseNumber: 'MD-DEMO-901',
    },
  });
  assert.equal(regDoc.status, 201, JSON.stringify(regDoc.data));
  assert.equal(regDoc.data.doctor.role, 'doctor');
  assert.ok(regDoc.data.token);

  console.log('3. Logging in with registered doctor...');
  const loginDoc = await apiFetch('/auth/login', {
    method: 'POST',
    body: { email: doctorEmail, password },
  });
  assert.equal(loginDoc.status, 200);
  const doctorToken = loginDoc.data.token;

  const me = await apiFetch('/auth/me', { token: doctorToken });
  assert.equal(me.status, 200);
  assert.equal(me.data.doctor.email, doctorEmail);

  console.log('4. Verifying RBAC: ordinary doctor CANNOT modify Knowledge Base...');
  const kbList = await apiFetch('/knowledge-base/diseases', { token: doctorToken });
  assert.equal(kbList.status, 200);
  assert.ok(kbList.data.data.length >= 6, 'Seeded diseases should exist');

  const forbiddenCreate = await apiFetch('/knowledge-base/diseases', {
    method: 'POST',
    token: doctorToken,
    body: {
      name: 'Unauthorized Disease',
      description: 'Should fail',
      clinicalReferenceInfo: 'N/A',
    },
  });
  assert.equal(forbiddenCreate.status, 403);

  console.log('5. Registering Authorized Medical Expert & verifying Knowledge Base CRUD...');
  const regExp = await apiFetch('/auth/register', {
    method: 'POST',
    body: {
      name: 'Marcus Reed',
      email: expertEmail,
      password,
      specialization: 'Clinical Informatics',
      requestExpertRole: true,
      expertCode: process.env.EXPERT_REGISTRATION_CODE || 'CDSS-EXPERT-2026',
    },
  });
  assert.equal(regExp.status, 201, JSON.stringify(regExp.data));
  assert.equal(regExp.data.doctor.role, 'medical_expert');
  const expertToken = regExp.data.token;

  const createDis = await apiFetch('/knowledge-base/diseases', {
    method: 'POST',
    token: expertToken,
    body: {
      code: `DIS-DEMO-${suffix}`,
      name: `Demo Condition ${suffix}`,
      category: 'Educational Demo',
      description: 'Temporary demonstration condition for E2E verification.',
      commonSymptoms: ['Fatigue', 'Headache'],
      clinicalReferenceInfo: 'Non-clinical E2E test reference.',
    },
  });
  assert.equal(createDis.status, 201, JSON.stringify(createDis.data));
  const tempDiseaseId = createDis.data.data._id;

  const createRule = await apiFetch('/knowledge-base/rules', {
    method: 'POST',
    token: expertToken,
    body: {
      ruleCode: `RULE-DEMO-${suffix}`,
      name: 'Temporary E2E Rule',
      description: 'Verifies expert rule authoring.',
      disease: tempDiseaseId,
      ruleType: 'condition_consideration',
      minConditionsToTrigger: 2,
      conditions: [
        { factType: 'symptom', key: 'fatigue', label: 'Fatigue present', operator: 'present', weight: 1, required: true },
        { factType: 'symptom', key: 'headache', label: 'Headache present', operator: 'present', weight: 1, required: true },
      ],
      conclusion: 'Consider demo condition for verification.',
    },
  });
  assert.equal(createRule.status, 201, JSON.stringify(createRule.data));
  const tempRuleId = createRule.data.data._id;

  const delRule = await apiFetch(`/knowledge-base/rules/${tempRuleId}`, {
    method: 'DELETE',
    token: expertToken,
  });
  assert.equal(delRule.status, 200);

  const delDis = await apiFetch(`/knowledge-base/diseases/${tempDiseaseId}`, {
    method: 'DELETE',
    token: expertToken,
  });
  assert.equal(delDis.status, 200);

  console.log('6. Creating, searching, viewing, and editing a Patient...');
  const createPat = await apiFetch('/patients', {
    method: 'POST',
    token: doctorToken,
    body: {
      name: `Jordan Demo ${suffix}`,
      age: 48,
      gender: 'Female',
      contactNumber: '+1-555-0199',
      bloodGroup: 'O+',
      existingConditions: ['Mild Asthma'],
      previousMedicalHistory: 'Prior seasonal respiratory infections.',
      currentMedications: ['Albuterol PRN'],
      knownAllergies: ['Penicillin'],
    },
  });
  assert.equal(createPat.status, 201, JSON.stringify(createPat.data));
  const patient = createPat.data.data;
  assert.match(patient.patientId, /^PAT-\d{8}-[A-F0-9]{4}$/);

  const searchPat = await apiFetch(`/patients?search=${encodeURIComponent(patient.patientId)}`, {
    token: doctorToken,
  });
  assert.equal(searchPat.status, 200);
  assert.equal(searchPat.data.data.length, 1);

  const editPat = await apiFetch(`/patients/${patient._id}`, {
    method: 'PUT',
    token: doctorToken,
    body: { existingConditions: ['Mild Asthma', 'Family history of diabetes'] },
  });
  assert.equal(editPat.status, 200);
  assert.equal(editPat.data.data.existingConditions.length, 2);

  console.log('7. Testing independent Emergency Alert endpoint...');
  const redCheck = await apiFetch('/emergency/evaluate', {
    method: 'POST',
    token: doctorToken,
    body: {
      patientId: patient._id,
      selectedSymptoms: ['Chest pain', 'Breathing difficulty'],
      severity: 'Severe',
      vitals: { oxygenSaturation: 87, systolicBP: 185, diastolicBP: 112 },
    },
  });
  assert.equal(redCheck.status, 200);
  assert.equal(redCheck.data.data.level, 'RED');

  console.log('8. Running full Diagnosis (Influenza + Anemia + Glucose Flag + Elevated BP Flag)...');
  const dx = await apiFetch('/diagnoses', {
    method: 'POST',
    token: doctorToken,
    body: {
      patientId: patient._id,
      selectedSymptoms: ['Fever', 'Cough', 'Fatigue', 'Headache'],
      additionalSymptoms: ['body aches'],
      duration: { value: 3, unit: 'days' },
      severity: 'Moderate',
      vitals: {
        temperature: 38.6,
        systolicBP: 152,
        diastolicBP: 94,
        heartRate: 96,
        oxygenSaturation: 97,
      },
      testResults: [
        {
          testName: 'Hemoglobin',
          testKey: 'hemoglobin',
          value: '9.8',
          unit: 'g/dL',
          referenceRange: '12.0 - 16.0',
          testDate: new Date().toISOString().slice(0, 10),
        },
        {
          testName: 'Blood Glucose',
          testKey: 'blood_glucose',
          value: '198',
          unit: 'mg/dL',
          referenceRange: '70 - 125',
          testDate: new Date().toISOString().slice(0, 10),
        },
      ],
    },
  });
  assert.equal(dx.status, 201, JSON.stringify(dx.data));
  const diagnosis = dx.data.data;

  const condCodes = diagnosis.inferenceSummary.possibleConditions.map((c) => c.ruleCode);
  const flagCodes = diagnosis.inferenceSummary.clinicalFlags.map((f) => f.ruleCode);
  assert.ok(condCodes.includes('RULE-FLU-01'), `Expected RULE-FLU-01 in ${condCodes}`);
  assert.ok(condCodes.includes('RULE-ANEMIA-01'), `Expected RULE-ANEMIA-01 in ${condCodes}`);
  assert.ok(flagCodes.includes('RULE-GLUCOSE-FLAG-01'), `Expected RULE-GLUCOSE-FLAG-01 in ${flagCodes}`);
  assert.ok(flagCodes.includes('RULE-BP-FLAG-01'), `Expected RULE-BP-FLAG-01 in ${flagCodes}`);

  console.log('9. Testing single-symptom guardrail...');
  const singleSymDx = await apiFetch('/diagnoses', {
    method: 'POST',
    token: doctorToken,
    body: {
      patientId: patient._id,
      selectedSymptoms: ['Fatigue'],
      severity: 'Mild',
      vitals: {},
      testResults: [],
    },
  });
  assert.equal(singleSymDx.status, 201);
  assert.equal(singleSymDx.data.data.inferenceSummary.possibleConditions.length, 0);

  console.log('10. Testing Physician Verification update...');
  const verify = await apiFetch(`/diagnoses/${diagnosis._id}/verify`, {
    method: 'PATCH',
    token: doctorToken,
    body: {
      status: 'Verified by Doctor',
      finalClinicalImpression: 'Suspected viral influenza with incidental anemia and hyperglycemia; ordered confirmatory labs.',
      doctorNotes: 'Ordered influenza PCR, iron panel, HbA1c, and repeat BP check.',
    },
  });
  assert.equal(verify.status, 200);
  assert.equal(verify.data.data.doctorVerification.status, 'Verified by Doctor');

  console.log('11. Testing Diagnosis History filtering...');
  const history = await apiFetch(
    `/diagnoses?patientId=${encodeURIComponent(patient.patientId)}`,
    { token: doctorToken }
  );
  assert.equal(history.status, 200);
  assert.ok(history.data.data.length >= 2);

  console.log('12. Testing Server PDF Report Generation...');
  const pdf = await apiFetch(`/diagnoses/${diagnosis._id}/report`, {
    token: doctorToken,
  });
  assert.equal(pdf.status, 200);
  assert.ok(pdf.contentType.includes('application/pdf'));
  assert.equal(pdf.buffer.subarray(0, 5).toString('utf8'), '%PDF-');
  assert.ok(pdf.buffer.length > 1000, 'PDF report should contain valid content');

  console.log('13. Testing Dashboard Summary & Logout...');
  const dash = await apiFetch('/dashboard/summary', { token: doctorToken });
  assert.equal(dash.status, 200);
  assert.ok(dash.data.data.stats.totalPatients >= 1);
  assert.ok(dash.data.data.stats.totalDiagnoses >= 2);

  const logout = await apiFetch('/auth/logout', { method: 'POST', token: doctorToken });
  assert.equal(logout.status, 200);

  console.log('\nALL 13 END-TO-END VERIFICATION STEPS PASSED!');
}

run().catch((err) => {
  console.error('E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
