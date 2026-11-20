import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CLINICAL_DISCLAIMER } from '../utils/clinicalConstants';

const DOCTOR_NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/diagnosis/new', label: 'Start Diagnosis', icon: Stethoscope },
  { to: '/diagnoses', label: 'Diagnosis History', icon: ClipboardList },
];

export default function Layout({ children }) {
  const { doctor, isExpert, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden no-print"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-navy-800 text-white flex flex-col lg:static lg:translate-x-0 no-print ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-4 border-b border-navy-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-clinical-600 text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight tracking-tight">
                MedCDSS
              </p>
              <p className="text-[11px] text-clinical-200 leading-tight">
                Knowledge Engineering
              </p>
            </div>
          </div>
          <button
            type="button"
            className="lg:hidden p-1 text-slate-300 hover:text-white"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
          {DOCTOR_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-clinical-600 text-white'
                    : 'text-slate-200 hover:bg-navy-700 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}

          {isExpert && (
            <div className="pt-4 mt-4 border-t border-navy-700">
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-clinical-200">
                Expert Administration
              </p>
              <NavLink
                to="/admin/knowledge-base"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-clinical-600 text-white'
                      : 'text-slate-200 hover:bg-navy-700 hover:text-white'
                  }`
                }
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Manage Medical Rules</span>
              </NavLink>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-navy-700 bg-navy-900/40">
          <div className="flex items-start gap-2.5 mb-3">
            <div className="p-1.5 rounded bg-navy-700 text-clinical-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Dr. {doctor?.name}
              </p>
              <p className="text-xs text-slate-300 truncate">
                {doctor?.specialization || 'General Medicine'}
              </p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 text-[11px] font-medium rounded ${
                  isExpert
                    ? 'bg-clinical-600/30 text-clinical-200 border border-clinical-500/40'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {isExpert ? 'Medical Expert / Admin' : 'Doctor'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 bg-navy-700 hover:bg-navy-600 rounded-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-semibold text-navy-800">
                Intelligent Medical Diagnosis &amp; Clinical Decision Support System
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Rule-Based Knowledge Engineering &bull; Forward-Chaining Clinical Support
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-navy-700 bg-clinical-50 border border-clinical-200 px-3 py-1.5 rounded-md">
            <Stethoscope className="w-3.5 h-3.5 text-clinical-600" />
            <span>Clinician Assist Only — Doctor Verification Required</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto print-full">
          {children}
        </main>

        <footer className="bg-white border-t border-slate-200 px-4 lg:px-8 py-3 text-xs text-slate-600 no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span>{CLINICAL_DISCLAIMER}</span>
            <span className="text-slate-400">Clinical Decision Support System</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
