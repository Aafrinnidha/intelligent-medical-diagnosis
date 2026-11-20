import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Edit2,
  FlaskConical,
  Stethoscope,
  User,
} from 'lucide-react';
import { patientsAPI } from '../services/api';
import { BLOOD_GROUPS } from '../utils/clinicalConstants';
import Modal from '../components/Modal';

export default function PatientDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await patientsAPI.getById(id);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patient details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const openEdit = () => {
    const p = data.patient;
    setForm({
      name: p.name || '',
      age: p.age ?? '',
      gender: p.gender || 'Male',
      contactNumber: p.contactNumber || '',
      bloodGroup: p.bloodGroup || 'Unknown',
      existingConditions: (p.existingConditions || []).join(', '),
      previousMedicalHistory: p.previousMedicalHistory || '',
      currentMedications: (p.currentMedications || []).join(', '),
      knownAllergies: (p.knownAllergies || []).join(', '),
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await patientsAPI.update(id, { ...form, age: Number(form.age) });
      setEditOpen(false);
      await loadDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update patient.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-600 py-8">Loading patient profile...</div>;
  }

  if (error || !data?.patient) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error || 'Patient not found.'}
        </div>
        <Link to="/patients" className="btn-outline">
          <ArrowLeft className="w-4 h-4" /> Back to Patients
        </Link>
      </div>
    );
  }

  const { patient, diagnoses = [], recentTests = [] } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/patients"
            className="inline-flex items-center gap-1 text-xs font-medium text-clinical-700 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Patient List
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-navy-900">{patient.name}</h2>
            <span className="px-2.5 py-0.5 font-mono text-xs font-semibold rounded bg-navy-100 text-navy-800">
              {patient.patientId}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={openEdit} className="btn-outline">
            <Edit2 className="w-4 h-4" /> Edit Patient
          </button>
          <Link to={`/diagnosis/new?patientId=${patient._id}`} className="btn-primary">
            <Stethoscope className="w-4 h-4" /> Start Diagnosis
          </Link>
        </div>
      </div>

      {/* Patient Profile Card */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
          <User className="w-4 h-4 text-clinical-700" />
          <h3 className="text-sm font-semibold text-navy-800">
            Demographics &amp; Clinical Background
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-5">
          <div>
            <p className="text-xs text-slate-500">Age / Gender</p>
            <p className="font-semibold text-slate-900">
              {patient.age} years / {patient.gender}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Blood Group</p>
            <p className="font-semibold text-slate-900">{patient.bloodGroup}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Contact Number</p>
            <p className="font-semibold text-slate-900">{patient.contactNumber}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Registered On</p>
            <p className="font-semibold text-slate-900">
              {new Date(patient.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
              Existing Medical Conditions
            </p>
            {patient.existingConditions?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {patient.existingConditions.map((c, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded bg-clinical-50 text-navy-800 border border-clinical-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs">None documented</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
              Current Medications
            </p>
            {patient.currentMedications?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {patient.currentMedications.map((m, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {m}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs">None documented</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase mb-1.5">
              Known Allergies
            </p>
            {patient.knownAllergies?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {patient.knownAllergies.map((a, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded bg-red-50 text-red-800 border border-red-200 font-medium"
                  >
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs">None documented</p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
            Previous Medical History
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {patient.previousMedicalHistory || 'No previous medical history notes entered.'}
          </p>
        </div>
      </div>

      {/* Previous Diagnosis Records */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-clinical-700" />
            <h3 className="text-sm font-semibold text-navy-800">
              Previous Diagnosis Records ({diagnoses.length})
            </h3>
          </div>
        </div>
        {diagnoses.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No previous diagnosis evaluations for this patient yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Diagnosis ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Alert Level</th>
                  <th className="px-4 py-3">Suggestions / Flags</th>
                  <th className="px-4 py-3">Review Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {diagnoses.map((d) => {
                  const items = [
                    ...(d.inferenceSummary?.possibleConditions || []),
                    ...(d.inferenceSummary?.clinicalFlags || []),
                  ];
                  return (
                    <tr key={d._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-navy-700">
                        {d.diagnosisCode}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(d.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                            d.emergencyAlert?.level === 'RED'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : d.emergencyAlert?.level === 'ORANGE'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {d.emergencyAlert?.level || 'GREEN'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {items.length > 0
                          ? items.map((x) => x.diseaseName).join(', ')
                          : 'No rules triggered'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {d.doctorVerification?.status || 'Pending Review'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/diagnoses/${d._id}`}
                          className="text-xs font-semibold text-clinical-700 hover:underline"
                        >
                          View Report
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Lab Test Results */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-clinical-700" />
          <h3 className="text-sm font-semibold text-navy-800">
            Recent Laboratory &amp; Diagnostic Test Results ({recentTests.length})
          </h3>
        </div>
        {recentTests.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No laboratory test results recorded for this patient.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Test Name</th>
                  <th className="px-4 py-2.5">Value</th>
                  <th className="px-4 py-2.5">Reference Range</th>
                  <th className="px-4 py-2.5">Interpretation</th>
                  <th className="px-4 py-2.5">Test Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentTests.map((t) => (
                  <tr key={t._id}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{t.testName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {t.value} {t.unit}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {t.referenceRange || 'N/A'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          ['Low', 'High', 'Abnormal'].includes(t.interpretation)
                            ? 'bg-amber-100 text-amber-900'
                            : t.interpretation === 'Normal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.interpretation}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {t.testDate ? new Date(t.testDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Patient — ${patient.patientId}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Name *</label>
              <input
                type="text"
                required
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Contact Number *</label>
              <input
                type="text"
                required
                value={form.contactNumber || ''}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Age *</label>
              <input
                type="number"
                min="0"
                max="130"
                required
                value={form.age ?? ''}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Gender *</label>
              <select
                value={form.gender || 'Male'}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="form-input"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Blood Group</label>
              <select
                value={form.bloodGroup || 'Unknown'}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="form-input"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Existing Conditions (comma-separated)</label>
            <input
              type="text"
              value={form.existingConditions || ''}
              onChange={(e) => setForm({ ...form, existingConditions: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Current Medications (comma-separated)</label>
            <input
              type="text"
              value={form.currentMedications || ''}
              onChange={(e) => setForm({ ...form, currentMedications: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Known Allergies (comma-separated)</label>
            <input
              type="text"
              value={form.knownAllergies || ''}
              onChange={(e) => setForm({ ...form, knownAllergies: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Previous Medical History</label>
            <textarea
              rows={3}
              value={form.previousMedicalHistory || ''}
              onChange={(e) =>
                setForm({ ...form, previousMedicalHistory: e.target.value })
              }
              className="form-input"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
