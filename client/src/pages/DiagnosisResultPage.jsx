import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ClipboardCheck,
  Download,
  FileText,
  FlaskConical,
  HelpCircle,
  Info,
  Printer,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { diagnosesAPI } from '../services/api';
import { CLINICAL_DISCLAIMER } from '../utils/clinicalConstants';
import { exportDiagnosisToPdf } from '../utils/pdfExport';
import EmergencyAlertBanner from '../components/EmergencyAlertBanner';

function RuleEvaluationCard({ item, isFlag = false }) {
  return (
    <div
      className={`card p-5 border-l-4 ${
        isFlag ? 'border-l-amber-500' : 'border-l-clinical-600'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2 py-0.5 text-[11px] font-semibold uppercase rounded ${
                isFlag
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-clinical-100 text-navy-800'
              }`}
            >
              {isFlag ? 'Abnormal Finding Flag' : 'Possible Condition (Suggestion)'}
            </span>
            <span className="font-mono text-xs text-slate-500">{item.ruleCode}</span>
            {item.isDemonstrationRule && (
              <span className="px-2 py-0.5 text-[11px] rounded bg-slate-100 text-slate-600 border border-slate-200">
                Non-Clinical Demonstration Rule
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-navy-900 mt-1">
            {item.diseaseName}
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">{item.diseaseDescription}</p>
        </div>

        {/* Transparent Evidence-Matching Score */}
        <div className="sm:text-right shrink-0 bg-clinical-50 border border-clinical-200 rounded-md px-3 py-2">
          <p className="text-[11px] font-semibold uppercase text-navy-700">
            Evidence-Matching Score
          </p>
          <p className="text-xl font-bold text-clinical-700">
            {item.evidenceMatchingScore}%
          </p>
          <p className="text-[11px] text-slate-600">
            {item.matchedCount} of {item.totalCriteriaCount} rule criteria matched
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Rule match only — NOT clinical probability
          </p>
        </div>
      </div>

      {/* Conclusion */}
      <div className="p-3 rounded bg-slate-50 border border-slate-200 text-sm text-navy-900 mb-3">
        <strong className="text-navy-800">Decision Support Note: </strong>
        {item.conclusion}
      </div>

      {/* Matching vs Unmatched / Conflicting Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-3">
        <div className="p-3 rounded bg-emerald-50/70 border border-emerald-200">
          <p className="font-semibold text-emerald-900 mb-1.5">
            Matching Symptoms &amp; Supporting Test Findings ({item.matchingEvidence?.length || 0})
          </p>
          {item.matchingEvidence?.length ? (
            <ul className="space-y-1 list-disc list-inside text-emerald-900">
              {item.matchingEvidence.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">None</p>
          )}
        </div>

        <div className="p-3 rounded bg-slate-50 border border-slate-200">
          <p className="font-semibold text-slate-800 mb-1.5">
            Unmatched / Missing / Conflicting Evidence (
            {item.unmatchedEvidence?.length || 0})
          </p>
          {item.unmatchedEvidence?.length ? (
            <ul className="space-y-1 list-disc list-inside text-slate-700">
              {item.unmatchedEvidence.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">All configured criteria in this rule matched.</p>
          )}
        </div>
      </div>

      {/* Matched Medical Rule & Explanation */}
      <div className="p-3 rounded bg-navy-50 border border-navy-100 text-xs space-y-1.5">
        <p className="font-semibold text-navy-800 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-clinical-700" />
          Matched Medical Rule &amp; Explanation ({item.ruleName})
        </p>
        <p className="font-mono text-[11px] text-navy-900 bg-white px-2.5 py-1.5 rounded border border-navy-100">
          {item.ifThenTrace}
        </p>
        {item.clinicalReferenceInfo && (
          <p className="text-slate-600 pt-1">
            <strong>Clinical Reference:</strong> {item.clinicalReferenceInfo}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DiagnosisResultPage() {
  const { id } = useParams();
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Doctor verification form
  const [verifyStatus, setVerifyStatus] = useState('Pending Review');
  const [finalImpression, setFinalImpression] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [savingVerify, setSavingVerify] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');

  const loadDiagnosis = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await diagnosesAPI.getById(id);
      const record = data.data;
      setDiagnosis(record);
      setVerifyStatus(record.doctorVerification?.status || 'Pending Review');
      setFinalImpression(record.doctorVerification?.finalClinicalImpression || '');
      setDoctorNotes(record.doctorVerification?.doctorNotes || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load diagnosis report.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDiagnosis();
  }, [loadDiagnosis]);

  const handleSaveVerification = async (e) => {
    e.preventDefault();
    setSavingVerify(true);
    setVerifyMessage('');
    try {
      const { data } = await diagnosesAPI.verify(id, {
        status: verifyStatus,
        finalClinicalImpression: finalImpression,
        doctorNotes,
      });
      setDiagnosis(data.data);
      setVerifyMessage('Doctor clinical verification saved successfully.');
    } catch (err) {
      setVerifyMessage(
        err.response?.data?.message || 'Failed to save verification.'
      );
    } finally {
      setSavingVerify(false);
    }
  };

  const handleServerPdfDownload = async () => {
    try {
      const response = await diagnosesAPI.downloadServerPdf(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CDSS-Report-${diagnosis.diagnosisCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback to client-side jsPDF export
      exportDiagnosisToPdf(diagnosis);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-600 py-8">Loading diagnosis report...</div>;
  }

  if (error || !diagnosis) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error || 'Diagnosis record not found.'}
        </div>
        <Link to="/diagnoses" className="btn-outline">
          <ArrowLeft className="w-4 h-4" /> Back to Diagnosis History
        </Link>
      </div>
    );
  }

  const p = diagnosis.patientSnapshot || diagnosis.patient || {};
  const sym = diagnosis.symptomRecord || {};
  const vitals = sym.vitals || {};
  const summary = diagnosis.inferenceSummary || {};
  const allSymptoms = [
    ...(sym.selectedSymptoms || []),
    ...(sym.additionalSymptoms || []),
  ];

  return (
    <div className="space-y-6">
      {/* Header & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/diagnoses"
            className="inline-flex items-center gap-1 text-xs font-medium text-clinical-700 hover:underline mb-1.5 no-print"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Diagnosis History
          </Link>
          <h2 className="text-xl font-bold text-navy-900">
            Clinical Decision Support Report
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Report Code: <span className="font-mono font-semibold">{diagnosis.diagnosisCode}</span>{' '}
            &bull; Evaluated on {new Date(diagnosis.createdAt).toLocaleString()} &bull; Clinician: Dr.{' '}
            {diagnosis.doctor?.name || 'N/A'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-outline text-xs"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
          <button
            type="button"
            onClick={() => exportDiagnosisToPdf(diagnosis)}
            className="btn-secondary text-xs"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
          <button
            type="button"
            onClick={handleServerPdfDownload}
            className="btn-primary text-xs"
          >
            <FileText className="w-4 h-4" /> Server PDF Report
          </button>
        </div>
      </div>

      {/* Mandatory Clinical Disclaimer Banner */}
      <div className="p-4 rounded-lg bg-navy-800 text-white flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-clinical-200 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold">Clinical Decision Support Disclaimer</p>
          <p className="text-slate-200 mt-0.5">
            {summary.disclaimer || CLINICAL_DISCLAIMER}
          </p>
        </div>
      </div>

      {/* Emergency Safety Alert */}
      <EmergencyAlertBanner alert={diagnosis.emergencyAlert} />

      {/* Patient Info & Clinical Inputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Info & History Considered */}
        <section className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-navy-800 pb-2 border-b border-slate-200">
            Patient Information &amp; Medical History Considered
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Patient Name</p>
              <p className="font-semibold text-slate-900">{p.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Patient ID</p>
              <p className="font-mono text-xs font-semibold text-navy-700">{p.patientId}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Age / Gender</p>
              <p className="font-medium text-slate-900">
                {p.age} yrs / {p.gender}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Blood Group</p>
              <p className="font-medium text-slate-900">{p.bloodGroup || 'Unknown'}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5">
            <p>
              <strong className="text-slate-700">Existing Conditions:</strong>{' '}
              {p.existingConditions?.length ? p.existingConditions.join(', ') : 'None documented'}
            </p>
            <p>
              <strong className="text-slate-700">Current Medications:</strong>{' '}
              {p.currentMedications?.length ? p.currentMedications.join(', ') : 'None documented'}
            </p>
            <p>
              <strong className="text-slate-700">Known Allergies:</strong>{' '}
              <span className={p.knownAllergies?.length ? 'text-red-700 font-medium' : ''}>
                {p.knownAllergies?.length ? p.knownAllergies.join(', ') : 'None documented'}
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Previous Medical History:</strong>{' '}
              {p.previousMedicalHistory || 'None documented'}
            </p>
          </div>
        </section>

        {/* Entered Symptoms & Vitals */}
        <section className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-navy-800 pb-2 border-b border-slate-200">
            Entered Symptoms &amp; Vital Signs
          </h3>

          <div>
            <p className="text-xs text-slate-500 mb-1.5">Reported Symptoms</p>
            {allSymptoms.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {allSymptoms.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-clinical-50 text-navy-800 border border-clinical-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No symptoms selected.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
            <div>
              <span className="text-slate-500 block">Severity</span>
              <span className="font-semibold text-slate-900">{sym.severity || 'Not recorded'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Duration</span>
              <span className="font-semibold text-slate-900">
                {sym.duration?.value
                  ? `${sym.duration.value} ${sym.duration.unit}`
                  : 'Not specified'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Temperature</span>
              <span className="font-semibold text-slate-900">
                {vitals.temperature != null ? `${vitals.temperature} °C` : 'Not recorded'}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Blood Pressure</span>
              <span className="font-semibold text-slate-900">
                {vitals.systolicBP != null
                  ? `${vitals.systolicBP}/${vitals.diastolicBP ?? '?'} mmHg`
                  : 'Not recorded'}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Heart Rate</span>
              <span className="font-semibold text-slate-900">
                {vitals.heartRate != null ? `${vitals.heartRate} bpm` : 'Not recorded'}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">SpO2</span>
              <span className="font-semibold text-slate-900">
                {vitals.oxygenSaturation != null
                  ? `${vitals.oxygenSaturation}%`
                  : 'Not recorded'}
              </span>
            </div>
          </div>

          {sym.clinicalNotes && (
            <p className="text-xs text-slate-700 pt-2 border-t border-slate-100">
              <strong>Clinician Notes:</strong> {sym.clinicalNotes}
            </p>
          )}
        </section>
      </div>

      {/* Medical Test Results */}
      <section className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-clinical-700" />
          <h3 className="text-sm font-semibold text-navy-800">
            Medical Test Results Evaluated ({diagnosis.testResults?.length || 0})
          </h3>
        </div>
        {diagnosis.testResults?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Test Name</th>
                  <th className="px-4 py-2.5">Value</th>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Reference Range</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Test Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {diagnosis.testResults.map((t) => (
                  <tr key={t._id}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{t.testName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold">{t.value}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{t.unit || '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {t.referenceRange || 'Not provided'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded ${
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
        ) : (
          <div className="p-4 text-xs text-slate-500">
            No laboratory test results were entered for this encounter. Missing laboratory values were NOT estimated or invented.
          </div>
        )}
      </section>

      {/* Possible Conditions & Clinical Flags */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-clinical-700" />
            Rule-Based Inference Output ({summary.rulesTriggeredCount || 0} of{' '}
            {summary.rulesEvaluatedCount || 0} active rules triggered)
          </h3>
          <span className="text-xs text-slate-500">
            Forward-Chaining Engine &bull; Transparent Rule Criteria Scoring
          </span>
        </div>

        {/* Forward Chaining Derived Facts */}
        {summary.derivedFacts?.length > 0 && (
          <div className="card p-4 bg-clinical-50 border-clinical-200">
            <p className="text-xs font-semibold text-navy-800 mb-1.5 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-clinical-700" />
              Forward-Chaining Intermediate Derived Clinical Facts
            </p>
            <ul className="list-disc list-inside text-xs text-navy-900 space-y-1">
              {summary.derivedFacts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Possible Conditions */}
        {summary.possibleConditions?.length > 0 && (
          <div className="space-y-4">
            {summary.possibleConditions.map((item, idx) => (
              <RuleEvaluationCard key={`${item.ruleCode}-${idx}`} item={item} />
            ))}
          </div>
        )}

        {/* Clinical Flags (Abnormal Glucose / Elevated BP) */}
        {summary.clinicalFlags?.length > 0 && (
          <div className="space-y-4">
            {summary.clinicalFlags.map((item, idx) => (
              <RuleEvaluationCard
                key={`${item.ruleCode}-${idx}`}
                item={item}
                isFlag
              />
            ))}
          </div>
        )}

        {(!summary.possibleConditions || summary.possibleConditions.length === 0) &&
          (!summary.clinicalFlags || summary.clinicalFlags.length === 0) && (
            <div className="card p-6 text-sm text-slate-700">
              No multi-criteria knowledge base rules were triggered by the entered clinical facts. Remember that the inference engine intentionally does not generate disease suggestions from a single isolated symptom or fabricate missing laboratory tests.
            </div>
          )}
      </section>

      {/* Additional Information Required, Conflicting Evidence, Suggested Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="card p-5">
          <h3 className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-clinical-700" />
            Missing Information &amp; Additional Data Required
          </h3>
          {summary.missingInformation?.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
              {summary.missingInformation.map((info, i) => (
                <li key={i}>{info}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No missing core information flagged.</p>
          )}
        </section>

        <section className="card p-5">
          <h3 className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Conflicting Evidence Detected
          </h3>
          {summary.conflictingEvidenceSummary?.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
              {summary.conflictingEvidenceSummary.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">
              No direct contradictions detected among triggered rule criteria.
            </p>
          )}
        </section>

        <section className="card p-5">
          <h3 className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700" />
            Recommendations for Doctor Review
          </h3>
          {summary.suggestedNextSteps?.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
              {summary.suggestedNextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">
              Apply standard physician clinical evaluation.
            </p>
          )}
        </section>
      </div>

      {/* Doctor Verification Panel */}
      <section className="card p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-clinical-700" />
            Physician Review &amp; Final Verification
          </h3>
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-navy-100 text-navy-800">
            Status: {diagnosis.doctorVerification?.status || 'Pending Review'}
          </span>
        </div>

        <form onSubmit={handleSaveVerification} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="verify-status" className="form-label">
                Verification Status
              </label>
              <select
                id="verify-status"
                value={verifyStatus}
                onChange={(e) => setVerifyStatus(e.target.value)}
                className="form-input"
              >
                <option value="Pending Review">Pending Review</option>
                <option value="Reviewed & Noted">Reviewed &amp; Noted</option>
                <option value="Verified by Doctor">Verified by Doctor</option>
                <option value="Dismissed">Dismissed</option>
              </select>
            </div>
            <div>
              <label htmlFor="final-impression" className="form-label">
                Doctor&apos;s Final Clinical Impression
              </label>
              <input
                id="final-impression"
                type="text"
                value={finalImpression}
                onChange={(e) => setFinalImpression(e.target.value)}
                placeholder="Enter physician's verified clinical assessment..."
                className="form-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="doctor-notes" className="form-label">
              Clinical Decision &amp; Plan Notes
            </label>
            <textarea
              id="doctor-notes"
              rows={3}
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Ordered confirmatory labs, treatment plan, follow-up instructions..."
              className="form-input"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            {verifyMessage ? (
              <span className="text-xs font-medium text-emerald-700">
                {verifyMessage}
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                All decision support suggestions require documented doctor verification.
              </span>
            )}
            <button type="submit" disabled={savingVerify} className="btn-primary">
              {savingVerify ? 'Saving...' : 'Save Physician Verification'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
