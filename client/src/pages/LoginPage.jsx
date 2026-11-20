import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CLINICAL_DISCLAIMER } from '../utils/clinicalConstants';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to sign in. Please verify your credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-lg bg-navy-800 text-white mb-3">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-navy-900">
            Intelligent Medical Diagnosis &amp; Clinical Decision Support System
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Sign in with your registered doctor account
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
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.org"
                  className="form-input pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="form-input pl-9"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            New clinician?{' '}
            <Link to="/register" className="font-semibold text-clinical-700 hover:underline">
              Create a doctor account
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
