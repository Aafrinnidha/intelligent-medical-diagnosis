import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Edit2, Eye, Search, Stethoscope, UserPlus, AlertCircle } from 'lucide-react';
import { patientsAPI } from '../services/api';
import { BLOOD_GROUPS } from '../utils/clinicalConstants';
import Modal from '../components/Modal';

const EMPTY_FORM = {
  name: '',
  age: '',
  gender: 'Male',
  contactNumber: '',
  bloodGroup: 'Unknown',
  existingConditions: '',
  previousMedicalHistory: '',
  currentMedications: '',
  knownAllergies: '',
};

export default function PatientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPatients = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientsAPI.list({ search: query });
      setPatients(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients('');
  }, [loadPatients]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openCreateModal();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPatients(search);
  };

  const openCreateModal = () => {
    setEditingPatient(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (patient) => {
    setEditingPatient(patient);
    setForm({
      name: patient.name || '',
      age: patient.age ?? '',
      gender: patient.gender || 'Male',
      contactNumber: patient.contactNumber || '',
      bloodGroup: patient.bloodGroup || 'Unknown',
      existingConditions: (patient.existingConditions || []).join(', '),
      previousMedicalHistory: patient.previousMedicalHistory || '',
      currentMedications: (patient.currentMedications || []).join(', '),
      knownAllergies: (patient.knownAllergies || []).join(', '),
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim() || form.age === '' || !form.contactNumber.trim()) {
      setFormError('Patient name, age, and contact number are required.');
      return;
    }

    const ageNum = Number(form.age);
    if (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      setFormError('Please enter a valid age between 0 and 130.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        age: ageNum,
      };
      if (editingPatient) {
        await patientsAPI.update(editingPatient._id, payload);
      } else {
        await patientsAPI.create(payload);
      }
      setModalOpen(false);
      await loadPatients(search);
    } catch (err) {
      const apiErr = err.response?.data;
      setFormError(
        apiErr?.errors?.map((x) => x.message).join(' ') ||
          apiErr?.message ||
          'Failed to save patient record.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Patient Management</h2>
          <p className="text-sm text-slate-600">
            Register patients, maintain clinical history, and access prior diagnostic evaluations.
          </p>
        </div>
        <button type="button" onClick={openCreateModal} className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Add New Patient
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Patient ID, name, contact number, or existing condition..."
            className="form-input pl-9"
          />
        </div>
        <button type="submit" className="btn-secondary">
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              loadPatients('');
            }}
            className="btn-outline"
          >
            Clear
          </button>
        )}
      </form>

      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Patient Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No matching patient records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Patient ID</th>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Age / Gender</th>
                  <th className="px-4 py-3">Blood Group</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Existing Conditions</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {patients.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-700">
                      {p.patientId}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.age} yrs &bull; {p.gender}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-clinical-50 text-clinical-700 border border-clinical-200">
                        {p.bloodGroup}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.contactNumber}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {p.existingConditions?.length
                        ? p.existingConditions.join(', ')
                        : 'None documented'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/patients/${p._id}`}
                          className="btn-outline px-2.5 py-1 text-xs"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="btn-outline px-2.5 py-1 text-xs"
                          title="Edit Patient"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <Link
                          to={`/diagnosis/new?patientId=${p._id}`}
                          className="btn-secondary px-2.5 py-1 text-xs"
                          title="Start Diagnosis"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          Diagnose
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Patient Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingPatient
            ? `Edit Patient — ${editingPatient.patientId}`
            : 'Register New Patient'
        }
      >
        {formError && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {!editingPatient && (
            <p className="text-xs text-slate-500 bg-clinical-50 border border-clinical-200 px-3 py-2 rounded">
              A unique Patient ID (e.g., PAT-YYYYMMDD-XXXX) will be generated automatically upon registration. Do not enter real patient PHI for demonstrations.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient-name" className="form-label">
                Patient Name *
              </label>
              <input
                id="patient-name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleFormChange}
                placeholder="e.g., Alex Morgan (Demo)"
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="patient-contact" className="form-label">
                Contact Number *
              </label>
              <input
                id="patient-contact"
                name="contactNumber"
                type="text"
                required
                value={form.contactNumber}
                onChange={handleFormChange}
                placeholder="+1-555-0100"
                className="form-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="patient-age" className="form-label">
                Age (Years) *
              </label>
              <input
                id="patient-age"
                name="age"
                type="number"
                min="0"
                max="130"
                required
                value={form.age}
                onChange={handleFormChange}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="patient-gender" className="form-label">
                Gender *
              </label>
              <select
                id="patient-gender"
                name="gender"
                value={form.gender}
                onChange={handleFormChange}
                className="form-input"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="patient-blood" className="form-label">
                Blood Group
              </label>
              <select
                id="patient-blood"
                name="bloodGroup"
                value={form.bloodGroup}
                onChange={handleFormChange}
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
            <label htmlFor="patient-conditions" className="form-label">
              Existing Medical Conditions (comma-separated)
            </label>
            <input
              id="patient-conditions"
              name="existingConditions"
              type="text"
              value={form.existingConditions}
              onChange={handleFormChange}
              placeholder="e.g., Hypertension, Asthma, Type 2 Diabetes"
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="patient-meds" className="form-label">
              Current Medications (comma-separated)
            </label>
            <input
              id="patient-meds"
              name="currentMedications"
              type="text"
              value={form.currentMedications}
              onChange={handleFormChange}
              placeholder="e.g., Lisinopril 10mg, Metformin 500mg"
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="patient-allergies" className="form-label">
              Known Allergies (comma-separated)
            </label>
            <input
              id="patient-allergies"
              name="knownAllergies"
              type="text"
              value={form.knownAllergies}
              onChange={handleFormChange}
              placeholder="e.g., Penicillin, Sulfa drugs (or leave blank if none)"
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="patient-history" className="form-label">
              Previous Medical History
            </label>
            <textarea
              id="patient-history"
              name="previousMedicalHistory"
              rows={3}
              value={form.previousMedicalHistory}
              onChange={handleFormChange}
              placeholder="Surgeries, hospitalizations, family history, relevant past illnesses..."
              className="form-input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-outline"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving
                ? 'Saving...'
                : editingPatient
                ? 'Save Changes'
                : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
