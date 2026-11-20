import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Plus,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function AlertPill({ level }) {
  const styles = {
    RED: 'bg-red-100 text-red-800 border-red-200',
    ORANGE: 'bg-orange-100 text-orange-800 border-orange-200',
    GREEN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border ${
        styles[level] || styles.GREEN
      }`}
    >
      {level || 'GREEN'}
    </span>
  );
}

export default function DashboardPage() {
  const { doctor } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data } = await dashboardAPI.getSummary();
        if (active) setSummary(data.data);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load dashboard summary.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-600 py-8">Loading clinical dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
        {error}
      </div>
    );
  }

  const stats = summary?.stats || {};
  const recentPatients = summary?.recentPatients || [];
  const recentDiagnoses = summary?.recentDiagnoses || [];

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">
            Clinical Overview
          </h2>
          <p className="text-sm text-slate-600">
            Welcome back, Dr. {doctor?.name}. Review recent clinical activity or start a new assessment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/patients?action=new" className="btn-secondary">
            <UserPlus className="w-4 h-4" />
            Add New Patient
          </Link>
          <Link to="/diagnosis/new" className="btn-primary">
            <Stethoscope className="w-4 h-4" />
            Start Diagnosis
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total Patients
              </p>
              <p className="text-2xl font-bold text-navy-900 mt-1">
                {stats.totalPatients ?? 0}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-clinical-100 text-clinical-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <Link
            to="/patients"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-clinical-700 hover:underline"
          >
            Manage patients <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total Diagnosis Records
              </p>
              <p className="text-2xl font-bold text-navy-900 mt-1">
                {stats.totalDiagnoses ?? 0}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-navy-100 text-navy-700">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <Link
            to="/diagnoses"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-clinical-700 hover:underline"
          >
            View diagnosis history <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Urgent Alerts Flagged
              </p>
              <p className="text-2xl font-bold text-navy-900 mt-1">
                {stats.urgentAlertsCount ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Red &amp; Orange safety flags
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-100 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <Link
            to="/diagnoses"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-clinical-700 hover:underline"
          >
            Review flagged cases <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patient Records */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-800">
              Recent Patient Records
            </h3>
            <Link
              to="/patients"
              className="text-xs font-medium text-clinical-700 hover:underline"
            >
              View All
            </Link>
          </div>
          {recentPatients.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              <p>No patients registered yet.</p>
              <Link to="/patients?action=new" className="btn-secondary mt-3 text-xs">
                <Plus className="w-3.5 h-3.5" /> Register First Patient
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Patient ID</th>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Age / Sex</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentPatients.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-navy-700 font-medium">
                        {p.patientId}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.age}y / {p.gender}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/patients/${p._id}`}
                          className="text-xs font-medium text-clinical-700 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Diagnosis Results */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-800">
              Recent Diagnosis Results
            </h3>
            <Link
              to="/diagnoses"
              className="text-xs font-medium text-clinical-700 hover:underline"
            >
              View All
            </Link>
          </div>
          {recentDiagnoses.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              <p>No diagnosis evaluations recorded yet.</p>
              <Link to="/diagnosis/new" className="btn-primary mt-3 text-xs">
                <Stethoscope className="w-3.5 h-3.5" /> Start First Diagnosis
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Patient</th>
                    <th className="px-4 py-2.5">Top Suggestion / Flag</th>
                    <th className="px-4 py-2.5">Alert</th>
                    <th className="px-4 py-2.5 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentDiagnoses.map((d) => {
                    const topCondition =
                      d.inferenceSummary?.possibleConditions?.[0] ||
                      d.inferenceSummary?.clinicalFlags?.[0];
                    return (
                      <tr key={d._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {d.patientSnapshot?.name || d.patient?.name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {d.patientSnapshot?.patientId || d.diagnosisCode}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {topCondition ? (
                            <div>
                              <div className="font-medium text-xs text-navy-800">
                                {topCondition.diseaseName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {topCondition.evidenceMatchingScore}% rule match
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">
                              No rules triggered
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <AlertPill level={d.emergencyAlert?.level} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/diagnoses/${d._id}`}
                            className="text-xs font-medium text-clinical-700 hover:underline"
                          >
                            Open
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
      </div>
    </div>
  );
}
