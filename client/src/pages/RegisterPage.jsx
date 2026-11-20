import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CLINICAL_DISCLAIMER } from '../utils/clinicalConstants';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialization: 'General Medicine',
    licenseNumber: '',
    requestExpertRole: false,
    expertCode: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        specialization: form.specialization.trim(),
        licenseNumber: form.licenseNumber.trim(),
        requestExpertRole: form.requestExpertRole,
        expertCode: form.requestExpertRole ? form.expertCode.trim() : undefined,
      });
      navigate('/dashboard');
    } catch (err) {
      const apiErr = err.response?.data;
      if (apiErr?.errors?.length) {
        setError(apiErr.errors.map((x) => x.message).join(' '));
      } else {
        setError(apiErr?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4">
      <div className="max-w-lg w-full mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-lg bg-navy-800 text-white mb-3">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-navy-900">
            Doctor Account Registration
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Create your account to access the Clinical Decision Support System
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="form-label">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="e.g., Sarah Patel"
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="email" className="form-label">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="any.valid@email.com"
                className="form-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="specialization" className="form-label">
                  Specialization
                </label>
                <input
                  id="specialization"
                  name="specialization"
                  type="text"
                  value={form.specialization}
                  onChange={handleChange}
                  placeholder="General Medicine"
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="licenseNumber" className="form-label">
                  Medical License No. (Optional)
                </label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  value={form.licenseNumber}
                  onChange={handleChange}
                  placeholder="MD-123456"
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="form-label">
                  Password * (min 8 chars)
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="form-input"
                />
              </div>
            </div>

            {/* Optional Authorized Medical Expert section */}
            <div className="p-3.5 rounded-md bg-clinical-50 border border-clinical-200">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="requestExpertRole"
                  checked={form.requestExpertRole}
                  onChange={handleChange}
                  className="mt-1 rounded border-slate-300 text-navy-700"
                />
                <span className="text-xs text-slate-700">
                  <span className="font-semibold text-navy-800 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-clinical-700" />
                    Register as Authorized Medical Expert / Knowledge Base Admin
                  </span>
                  Only required if you are authorized to add or modify diagnostic rules. Standard doctors have full patient &amp; diagnosis access.
                </span>
              </label>

              {form.requestExpertRole && (
                <div className="mt-3">
                  <label htmlFor="expertCode" className="form-label text-xs">
                    Medical Expert Authorization Code
                  </label>
                  <input
                    id="expertCode"
                    name="expertCode"
                    type="password"
                    value={form.expertCode}
                    onChange={handleChange}
                    placeholder="Enter administrator authorization code"
                    className="form-input"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5"
            >
              {submitting ? 'Creating Account...' : 'Create Doctor Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-clinical-700 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500 leading-relaxed">
          {CLINICAL_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
