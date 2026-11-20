import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  FlaskConical,
  Plus,
  Stethoscope,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { diagnosesAPI, patientsAPI } from '../services/api';
import {
  CLINICAL_DISCLAIMER,
  DURATION_UNITS,
  LAB_TEST_PRESETS,
  SEVERITY_OPTIONS,
  STANDARD_SYMPTOMS,
} from '../utils/clinicalConstants';
import { evaluateEmergencyRealtime } from '../utils/emergencyEvaluator';
import EmergencyAlertBanner from '../components/EmergencyAlertBanner';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export default function NewDiagnosisPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState(
    searchParams.get('patientId') || ''
  );

  // Symptoms & Clinical inputs
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [additionalSymptomsInput, setAdditionalSymptomsInput] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('days');
  const [severity, setSeverity] = useState('Moderate');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Vitals
  const [vitals, setVitals] = useState({
    temperature: '',
    systolicBP: '',
    diastolicBP: '',
    heartRate: '',
    oxygenSaturation: '',
  });

  // Lab Test Results
  const [testResults, setTestResults] = useState([]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await patientsAPI.list({ limit: 100 });
        setPatients(data.data || []);
      } catch (err) {
        setError('Unable to load patient list.');
      } finally {
        setLoadingPatients(false);
      }
    }
    load();
  }, []);

  const selectedPatient = useMemo(
    () => patients.find((p) => p._id === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  const additionalSymptomsArray = useMemo(
    () =>
      additionalSymptomsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [additionalSymptomsInput]
  );

  // Immediate real-time emergency screening — NEVER waits for inference engine!
  const realtimeAlert = useMemo(
    () =>
      evaluateEmergencyRealtime({
        selectedSymptoms,
        additionalSymptoms: additionalSymptomsArray,
        severity,
        vitals,
        testResults,
        patient: selectedPatient,
      }),
    [selectedSymptoms, additionalSymptomsArray, severity, vitals, testResults, selectedPatient]
  );

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((item) => item !== symptom)
        : [...prev, symptom]
    );
  };

  const addPresetTest = (preset) => {
    setTestResults((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        testName: preset.testName,
        testKey: preset.testKey,
        value: '',
        unit: preset.unit,
        referenceRange: preset.referenceRange,
        referenceMin: preset.referenceMin,
        referenceMax: preset.referenceMax,
        testDate: TODAY_ISO,
      },
    ]);
  };

  const addBlankTest = () => {
    setTestResults((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        testName: '',
        testKey: '',
        value: '',
        unit: '',
        referenceRange: '',
        referenceMin: '',
        referenceMax: '',
        testDate: TODAY_ISO,
      },
    ]);
  };

  const updateTestRow = (id, field, value) => {
    setTestResults((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeTestRow = (id) => {
    setTestResults((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedPatientId) {
      setError('Please select an existing patient before running clinical decision support.');
      return;
    }

    const validTests = testResults.filter(
      (t) => t.testName.trim() && String(t.value).trim() !== ''
    );
    const hasAnyVital = Object.values(vitals).some((v) => String(v).trim() !== '');

    if (
      selectedSymptoms.length === 0 &&
      additionalSymptomsArray.length === 0 &&
      validTests.length === 0 &&
      !hasAnyVital
    ) {
      setError(
        'Please enter at least one clinical input (symptoms, vital signs, or medical test results).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patientId: selectedPatientId,
        selectedSymptoms,
        additionalSymptoms: additionalSymptomsArray,
        duration: {
          value: durationValue !== '' ? Number(durationValue) : null,
          unit: durationUnit,
        },
        severity,
        vitals,
        clinicalNotes,
        testResults: validTests.map(({ id, ...rest }) => rest),
      };

      const { data } = await diagnosesAPI.create(payload);
      navigate(`/diagnoses/${data.data._id}`);
    } catch (err) {
      const apiErr = err.response?.data;
      setError(
        apiErr?.errors?.map((x) => x.message).join(' ') ||
          apiErr?.message ||
          'Failed to process clinical diagnosis.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-900">
          Start Clinical Diagnosis &amp; Decision Support
        </h2>
        <p className="text-sm text-slate-600">
          Select a patient, record symptoms, vital signs, and laboratory tests to run forward-chaining knowledge base evaluation.
        </p>
      </div>

      {/* Real-time Independent Emergency Safety Banner */}
      <EmergencyAlertBanner alert={realtimeAlert} realtime />

      {error && (
        <div
          role="alert"
          className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Patient Selection & Medical History */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-clinical-700" />
              1. Patient Information &amp; Medical History
            </h3>
            <Link
              to="/patients?action=new"
              className="text-xs font-medium text-clinical-700 hover:underline"
            >
              + Register New Patient
            </Link>
          </div>

          <div>
            <label htmlFor="select-patient" className="form-label">
              Select Existing Patient *
            </label>
            <select
              id="select-patient"
              required
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="form-input"
              disabled={loadingPatients}
            >
              <option value="">
                {loadingPatients ? 'Loading patients...' : '-- Select a patient --'}
              </option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.patientId} — {p.name} ({p.age} yrs, {p.gender})
                </option>
              ))}
            </select>
          </div>

          {selectedPatient && (
            <div className="p-4 rounded-md bg-clinical-50 border border-clinical-200 text-sm space-y-2">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-navy-800">
                <span>
                  <strong>Patient ID:</strong> {selectedPatient.patientId}
                </span>
                <span>
                  <strong>Age/Gender:</strong> {selectedPatient.age} yrs / {selectedPatient.gender}
                </span>
                <span>
                  <strong>Blood Group:</strong> {selectedPatient.bloodGroup}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-clinical-200 text-xs">
                <div>
                  <span className="font-semibold text-navy-800 block">Existing Conditions:</span>
                  <span className="text-slate-700">
                    {selectedPatient.existingConditions?.length
                      ? selectedPatient.existingConditions.join(', ')
                      : 'None documented'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-navy-800 block">Current Medications:</span>
                  <span className="text-slate-700">
                    {selectedPatient.currentMedications?.length
                      ? selectedPatient.currentMedications.join(', ')
                      : 'None documented'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-navy-800 block">Known Allergies:</span>
                  <span className="text-red-700 font-medium">
                    {selectedPatient.knownAllergies?.length
                      ? selectedPatient.knownAllergies.join(', ')
                      : 'None documented'}
                  </span>
                </div>
              </div>
              {selectedPatient.previousMedicalHistory && (
                <div className="pt-2 border-t border-clinical-200 text-xs">
                  <span className="font-semibold text-navy-800">Previous Medical History: </span>
                  <span className="text-slate-700">
                    {selectedPatient.previousMedicalHistory}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Step 2: Symptom Collection & Vital Signs */}
        <section className="card p-5 space-y-5">
          <div className="pb-2 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-clinical-700" />
              2. Symptom Collection &amp; Vital Signs
            </h3>
          </div>

          <div>
            <p className="form-label mb-2">
              Current Symptoms (Select all that apply)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {STANDARD_SYMPTOMS.map((symptom) => {
                const checked = selectedSymptoms.includes(symptom);
                return (
                  <label
                    key={symptom}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md border text-sm cursor-pointer ${
                      checked
                        ? 'bg-clinical-50 border-clinical-600 text-navy-900 font-medium'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSymptom(symptom)}
                      className="rounded border-slate-300 text-clinical-600"
                    />
                    <span>{symptom}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="duration-val" className="form-label">
                Symptom Duration
              </label>
              <div className="flex gap-2">
                <input
                  id="duration-val"
                  type="number"
                  min="0"
                  step="any"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  placeholder="e.g., 3"
                  className="form-input"
                />
                <select
                  aria-label="Duration unit"
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  className="form-input w-32"
                >
                  {DURATION_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="severity" className="form-label">
                Overall Symptom Severity
              </label>
              <select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="form-input"
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="additional-symptoms" className="form-label">
                Additional Symptoms (Manual Entry, comma-separated)
              </label>
              <input
                id="additional-symptoms"
                type="text"
                value={additionalSymptomsInput}
                onChange={(e) => setAdditionalSymptomsInput(e.target.value)}
                placeholder="e.g., chills, blurred vision, dry mouth"
                className="form-input"
              />
            </div>
          </div>

          {/* Vital Signs */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
              Vital Signs (Leave blank if not measured — never estimated)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label htmlFor="vital-temp" className="form-label text-xs">
                  Temperature (°C)
                </label>
                <input
                  id="vital-temp"
                  type="number"
                  step="0.1"
                  min="30"
                  max="45"
                  value={vitals.temperature}
                  onChange={(e) =>
                    setVitals({ ...vitals, temperature: e.target.value })
                  }
                  placeholder="37.0"
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="vital-sys" className="form-label text-xs">
                  Systolic BP (mmHg)
                </label>
                <input
                  id="vital-sys"
                  type="number"
                  min="40"
                  max="300"
                  value={vitals.systolicBP}
                  onChange={(e) =>
                    setVitals({ ...vitals, systolicBP: e.target.value })
                  }
                  placeholder="120"
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="vital-dia" className="form-label text-xs">
                  Diastolic BP (mmHg)
                </label>
                <input
                  id="vital-dia"
                  type="number"
                  min="20"
                  max="200"
                  value={vitals.diastolicBP}
                  onChange={(e) =>
                    setVitals({ ...vitals, diastolicBP: e.target.value })
                  }
                  placeholder="80"
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="vital-hr" className="form-label text-xs">
                  Heart Rate (bpm)
                </label>
                <input
                  id="vital-hr"
                  type="number"
                  min="20"
                  max="250"
                  value={vitals.heartRate}
                  onChange={(e) =>
                    setVitals({ ...vitals, heartRate: e.target.value })
                  }
                  placeholder="76"
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="vital-spo2" className="form-label text-xs">
                  Oxygen Saturation (SpO2 %)
                </label>
                <input
                  id="vital-spo2"
                  type="number"
                  min="40"
                  max="100"
                  value={vitals.oxygenSaturation}
                  onChange={(e) =>
                    setVitals({ ...vitals, oxygenSaturation: e.target.value })
                  }
                  placeholder="98"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="clinical-notes" className="form-label">
              Clinician Examination Notes (Optional)
            </label>
            <textarea
              id="clinical-notes"
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Physical exam findings, onset context, relevant observations..."
              className="form-input"
            />
          </div>
        </section>

        {/* Step 3: Medical Test Results */}
        <section className="card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-clinical-700" />
              3. Medical Test Results (Optional — Add Only Available Results)
            </h3>
            <button
              type="button"
              onClick={addBlankTest}
              className="btn-outline text-xs py-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Test
            </button>
          </div>

          <div>
            <p className="text-xs text-slate-600 mb-2">
              Quick-add common laboratory tests:
            </p>
            <div className="flex flex-wrap gap-2">
              {LAB_TEST_PRESETS.map((preset) => (
                <button
                  key={preset.testKey}
                  type="button"
                  onClick={() => addPresetTest(preset)}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-clinical-200 bg-clinical-50 text-navy-800 hover:bg-clinical-100"
                >
                  + {preset.testName}
                </button>
              ))}
            </div>
          </div>

          {testResults.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No laboratory test results added. Missing tests are tracked transparently by the inference engine and never invented.
            </p>
          ) : (
            <div className="space-y-3">
              {testResults.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200 items-end"
                >
                  <div className="sm:col-span-3">
                    <label className="form-label text-xs">Test Name *</label>
                    <input
                      type="text"
                      required
                      value={row.testName}
                      onChange={(e) =>
                        updateTestRow(row.id, 'testName', e.target.value)
                      }
                      placeholder="e.g., Hemoglobin"
                      className="form-input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label text-xs">Test Value *</label>
                    <input
                      type="text"
                      required
                      value={row.value}
                      onChange={(e) =>
                        updateTestRow(row.id, 'value', e.target.value)
                      }
                      placeholder="e.g., 10.2"
                      className="form-input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label text-xs">Unit</label>
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) =>
                        updateTestRow(row.id, 'unit', e.target.value)
                      }
                      placeholder="g/dL"
                      className="form-input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label text-xs">Reference Range</label>
                    <input
                      type="text"
                      value={row.referenceRange}
                      onChange={(e) =>
                        updateTestRow(row.id, 'referenceRange', e.target.value)
                      }
                      placeholder="12.0 - 16.0"
                      className="form-input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label text-xs">Test Date</label>
                    <input
                      type="date"
                      value={row.testDate}
                      onChange={(e) =>
                        updateTestRow(row.id, 'testDate', e.target.value)
                      }
                      className="form-input"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeTestRow(row.id)}
                      className="btn-danger p-2"
                      aria-label="Remove test"
                      title="Remove test"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Submit Bar */}
        <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-navy-50 border-navy-200">
          <p className="text-xs text-slate-700 max-w-2xl">
            <strong>Clinical Decision Support Notice:</strong> {CLINICAL_DISCLAIMER}
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary py-2.5 px-6 shrink-0"
          >
            <Stethoscope className="w-4 h-4" />
            {submitting
              ? 'Running Forward-Chaining Inference...'
              : 'Generate Clinical Decision Support'}
          </button>
        </div>
      </form>
    </div>
  );
}
