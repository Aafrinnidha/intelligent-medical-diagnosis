import React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';

const LEVEL_STYLES = {
  RED: {
    container: 'bg-red-50 border-red-300 text-red-900',
    badge: 'bg-red-700 text-white',
    icon: AlertOctagon,
    iconColor: 'text-red-700',
    label: 'RED ALERT',
  },
  ORANGE: {
    container: 'bg-orange-50 border-orange-300 text-orange-900',
    badge: 'bg-orange-600 text-white',
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    label: 'ORANGE ALERT',
  },
  GREEN: {
    container: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    badge: 'bg-emerald-700 text-white',
    icon: CheckCircle2,
    iconColor: 'text-emerald-700',
    label: 'GREEN STATUS',
  },
};

export default function EmergencyAlertBanner({ alert, realtime = false }) {
  if (!alert) return null;
  const config = LEVEL_STYLES[alert.level] || LEVEL_STYLES.GREEN;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`border-2 rounded-lg p-4 ${config.container}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 shrink-0 mt-0.5 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-bold rounded ${config.badge}`}>
              {config.label}
            </span>
            <h2 className="text-sm sm:text-base font-bold">
              {alert.headline}
            </h2>
            {realtime && (
              <span className="text-[11px] font-medium opacity-75 ml-auto">
                Immediate Safety Screening (Independent of Inference Engine)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm leading-relaxed">{alert.safetyNote}</p>
          {alert.triggeredCriteria && alert.triggeredCriteria.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs sm:text-sm list-disc list-inside font-medium">
              {alert.triggeredCriteria.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
