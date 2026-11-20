import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, Filter, Search, Stethoscope } from 'lucide-react';
import { diagnosesAPI } from '../services/api';
import { exportDiagnosisToPdf } from '../utils/pdfExport';

export default function DiagnosisHistoryPage() {
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    patientId: '',
    patientName: '',
    startDate: '',
    endDate: '',
    alertLevel: '',
  });

  const loadHistory = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const cleanParams = {};
      Object.entries(params).forEach(([k, v]) => {
        if (String(v || '').trim()) cleanParams[k] = String(v).trim();
      });
      const { data } = await diagnosesAPI.list(cleanParams);
      setDiagnoses(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load diagnosis history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory({});
  }, [loadHistory]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadHistory(filters);
  };

  const handleReset = () => {
    const empty = {
      patientId: '',
      patientName: '',
      startDate: '',
      endDate: '',
      alertLevel: '',
    };
    setFilters(empty);
    loadHistory(empty);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Diagnosis History</h2>
          <p className="text-sm text-slate-600">
            Search, filter, inspect, and export previous clinical decision support reports as PDF.
          </p>
        </div>
        <Link to="/diagnosis/new" className="btn-primary">
          <Stethoscope className="w-4 h-4" />
          New Diagnosis
        </Link>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleFilterSubmit} className="card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label htmlFor="filter-pid" className="form-label text-xs">
              Patient ID
            </label>
            <input
              id="filter-pid"
              type="text"
              value={filters.patientId}
              onChange={(e) => setFilters({ ...filters, patientId: e.target.value })}
              placeholder="PAT-..."
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="filter-pname" className="form-label text-xs">
              Patient Name
            </label>
            <input
              id="filter-pname"
              type="text"
              value={filters.patientName}
              onChange={(e) =>
                setFilters({ ...filters, patientName: e.target.value })
              }
              placeholder="Search name..."
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="filter-start" className="form-label text-xs">
              From Date
            </label>
            <input
              id="filter-start"
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="filter-end" className="form-label text-xs">
              To Date
            </label>
            <input
              id="filter-end"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="filter-alert" className="form-label text-xs">
              Safety Alert Level
            </label>
            <select
              id="filter-alert"
              value={filters.alertLevel}
              onChange={(e) =>
                setFilters({ ...filters, alertLevel: e.target.value })
              }
              className="form-input"
            >
              <option value="">All Levels</option>
              <option value="RED">RED (Immediate)</option>
              <option value="ORANGE">ORANGE (Prompt)</option>
              <option value="GREEN">GREEN (No Configured Flags)</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={handleReset} className="btn-outline text-xs">
            Reset Filters
          </button>
          <button type="submit" className="btn-secondary text-xs">
            <Filter className="w-3.5 h-3.5" /> Apply Filters
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Results Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading diagnosis records...
          </div>
        ) : diagnoses.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            <Search className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            No diagnosis records matched your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Report Code</th>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Alert</th>
                  <th className="px-4 py-3">Possible Conditions / Flags</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {diagnoses.map((d) => {
                  const combined = [
                    ...(d.inferenceSummary?.possibleConditions || []),
                    ...(d.inferenceSummary?.clinicalFlags || []),
                  ];
                  const level = d.emergencyAlert?.level || 'GREEN';
                  return (
                    <tr key={d._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-700">
                        {d.diagnosisCode}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {d.patientSnapshot?.name || d.patient?.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {d.patientSnapshot?.patientId || d.patient?.patientId}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                            level === 'RED'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : level === 'ORANGE'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 max-w-xs">
                        {combined.length > 0 ? (
                          <div className="space-y-0.5">
                            {combined.slice(0, 2).map((c, idx) => (
                              <div key={idx} className="truncate">
                                <span className="font-medium text-navy-800">
                                  {c.diseaseName}
                                </span>{' '}
                                <span className="text-slate-500">
                                  ({c.evidenceMatchingScore}%)
                                </span>
                              </div>
                            ))}
                            {combined.length > 2 && (
                              <span className="text-slate-500">
                                +{combined.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">No rules triggered</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {d.doctorVerification?.status || 'Pending Review'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/diagnoses/${d._id}`}
                            className="btn-secondary px-2.5 py-1 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> Report
                          </Link>
                          <button
                            type="button"
                            onClick={() => exportDiagnosisToPdf(d)}
                            className="btn-outline px-2.5 py-1 text-xs"
                            title="Export PDF"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                        </div>
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
  );
}
