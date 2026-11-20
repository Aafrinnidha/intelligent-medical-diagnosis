import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertCircle,
  BookOpen,
  Edit2,
  GitBranch,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { knowledgeBaseAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const EMPTY_DISEASE = {
  code: '',
  name: '',
  category: 'General Medicine',
  description: '',
  commonSymptoms: '',
  associatedTestFindings: '',
  relevantMedicalHistory: '',
  riskFactors: '',
  clinicalReferenceInfo: '',
  recommendedNextSteps: '',
  reviewStatus: 'Educational Demonstration (Non-Clinical)',
};

const EMPTY_CONDITION = {
  factType: 'symptom',
  key: 'fever',
  label: 'Fever is present',
  operator: 'present',
  value: '',
  unit: '',
  weight: 1,
  required: false,
};

const EMPTY_RULE = {
  ruleCode: '',
  name: '',
  description: '',
  disease: '',
  ruleType: 'condition_consideration',
  minConditionsToTrigger: 2,
  conclusion: '',
  additionalInfoRequired: '',
  suggestedNextSteps: '',
  isActive: true,
  conditions: [{ ...EMPTY_CONDITION }],
};

export default function KnowledgeBasePage() {
  const { isExpert } = useAuth();

  const [tab, setTab] = useState('diseases');
  const [diseases, setDiseases] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Disease modal state
  const [diseaseModalOpen, setDiseaseModalOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState(null);
  const [diseaseForm, setDiseaseForm] = useState(EMPTY_DISEASE);
  const [diseaseError, setDiseaseError] = useState('');
  const [savingDisease, setSavingDisease] = useState(false);

  // Rule modal state
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE);
  const [ruleError, setRuleError] = useState('');
  const [savingRule, setSavingRule] = useState(false);

  const loadKB = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [disRes, ruleRes] = await Promise.all([
        knowledgeBaseAPI.listDiseases(),
        knowledgeBaseAPI.listRules(),
      ]);
      setDiseases(disRes.data.data || []);
      setRules(ruleRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Medical Knowledge Base.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKB();
  }, [loadKB]);

  // --- Disease Handlers ---
  const openAddDisease = () => {
    setEditingDisease(null);
    setDiseaseForm(EMPTY_DISEASE);
    setDiseaseError('');
    setDiseaseModalOpen(true);
  };

  const openEditDisease = (d) => {
    setEditingDisease(d);
    setDiseaseForm({
      code: d.code || '',
      name: d.name || '',
      category: d.category || 'General Medicine',
      description: d.description || '',
      commonSymptoms: (d.commonSymptoms || []).join(', '),
      associatedTestFindings: (d.associatedTestFindings || []).join(', '),
      relevantMedicalHistory: (d.relevantMedicalHistory || []).join(', '),
      riskFactors: (d.riskFactors || []).join(', '),
      clinicalReferenceInfo: d.clinicalReferenceInfo || '',
      recommendedNextSteps: (d.recommendedNextSteps || []).join(', '),
      reviewStatus: d.reviewStatus || 'Educational Demonstration (Non-Clinical)',
    });
    setDiseaseError('');
    setDiseaseModalOpen(true);
  };

  const handleSaveDisease = async (e) => {
    e.preventDefault();
    setDiseaseError('');
    setSavingDisease(true);
    try {
      if (editingDisease) {
        await knowledgeBaseAPI.updateDisease(editingDisease._id, diseaseForm);
      } else {
        await knowledgeBaseAPI.createDisease(diseaseForm);
      }
      setDiseaseModalOpen(false);
      await loadKB();
    } catch (err) {
      setDiseaseError(
        err.response?.data?.message || 'Failed to save disease entry.'
      );
    } finally {
      setSavingDisease(false);
    }
  };

  const handleDeleteDisease = async (d) => {
    if (!window.confirm(`Delete disease "${d.name}" from the Knowledge Base?`)) return;
    try {
      await knowledgeBaseAPI.deleteDisease(d._id);
      await loadKB();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to delete disease.');
    }
  };

  // --- Rule Handlers ---
  const openAddRule = () => {
    setEditingRule(null);
    setRuleForm({
      ...EMPTY_RULE,
      disease: diseases[0]?._id || '',
      conditions: [{ ...EMPTY_CONDITION }],
    });
    setRuleError('');
    setRuleModalOpen(true);
  };

  const openEditRule = (r) => {
    setEditingRule(r);
    setRuleForm({
      ruleCode: r.ruleCode || '',
      name: r.name || '',
      description: r.description || '',
      disease: r.disease?._id || r.disease || '',
      ruleType: r.ruleType || 'condition_consideration',
      minConditionsToTrigger: r.minConditionsToTrigger || 2,
      conclusion: r.conclusion || '',
      additionalInfoRequired: (r.additionalInfoRequired || []).join(', '),
      suggestedNextSteps: (r.suggestedNextSteps || []).join(', '),
      isActive: r.isActive !== false,
      conditions: (r.conditions || []).map((c) => ({
        ...c,
        value:
          c.value !== null && typeof c.value === 'object'
            ? JSON.stringify(c.value)
            : c.value ?? '',
      })),
    });
    setRuleError('');
    setRuleModalOpen(true);
  };

  const updateCondition = (index, field, value) => {
    setRuleForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, idx) =>
        idx === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addConditionRow = () => {
    setRuleForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { ...EMPTY_CONDITION }],
    }));
  };

  const removeConditionRow = (index) => {
    setRuleForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, idx) => idx !== index),
    }));
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    setRuleError('');
    if (!ruleForm.conditions.length) {
      setRuleError('At least one IF condition is required.');
      return;
    }

    setSavingRule(true);
    try {
      const normalizedConditions = ruleForm.conditions.map((c) => {
        let parsedVal = c.value;
        if (parsedVal === '' || parsedVal === undefined) {
          parsedVal = null;
        } else if (typeof parsedVal === 'string') {
          const trimmed = parsedVal.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
              parsedVal = JSON.parse(trimmed);
            } catch {
              parsedVal = trimmed;
            }
          } else if (c.operator === 'in' || c.operator === 'includes') {
            parsedVal = trimmed.split(',').map((x) => x.trim()).filter(Boolean);
          } else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            parsedVal = Number(trimmed);
          }
        }
        return {
          factType: c.factType,
          key: c.key.trim(),
          label: c.label.trim(),
          operator: c.operator,
          value: parsedVal,
          unit: c.unit?.trim() || '',
          weight: Number(c.weight) || 1,
          required: Boolean(c.required),
        };
      });

      const payload = {
        ...ruleForm,
        minConditionsToTrigger: Number(ruleForm.minConditionsToTrigger) || 2,
        conditions: normalizedConditions,
      };

      if (editingRule) {
        await knowledgeBaseAPI.updateRule(editingRule._id, payload);
      } else {
        await knowledgeBaseAPI.createRule(payload);
      }
      setRuleModalOpen(false);
      await loadKB();
    } catch (err) {
      setRuleError(err.response?.data?.message || 'Failed to save diagnostic rule.');
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (r) => {
    if (!window.confirm(`Delete outdated rule "${r.ruleCode} — ${r.name}"?`)) return;
    try {
      await knowledgeBaseAPI.deleteRule(r._id);
      await loadKB();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to delete rule.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">
            Medical Knowledge Base &amp; Production Rules
          </h2>
          <p className="text-sm text-slate-600">
            Structured disease knowledge and IF-THEN production rules powering the forward-chaining inference engine.
          </p>
        </div>

        {isExpert && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openAddDisease} className="btn-secondary">
              <Plus className="w-4 h-4" /> Add Disease
            </button>
            <button
              type="button"
              onClick={openAddRule}
              disabled={diseases.length === 0}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Add Diagnostic Rule
            </button>
          </div>
        )}
      </div>

      {/* Role & Non-Clinical Demonstration Notice */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-clinical-50 border border-clinical-200 text-xs text-navy-900 flex items-start gap-2.5">
          <BookOpen className="w-4 h-4 text-clinical-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Educational Demonstration Knowledge Base (Non-Clinical)</p>
            <p className="text-slate-700 mt-0.5">
              Included conditions (Common Cold, Influenza, Type 2 Diabetes, Anemia, Hypertension, Gastroenteritis) and IF-THEN rules are educational demonstrations, not validated clinical diagnostic criteria.
            </p>
          </div>
        </div>

        <div
          className={`p-4 rounded-lg border text-xs flex items-start gap-2.5 ${
            isExpert
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          {isExpert ? (
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">
              {isExpert
                ? 'Authorized Medical Expert / Admin Mode Enabled'
                : 'Read-Only Access (Standard Doctor Role)'}
            </p>
            <p className="mt-0.5">
              {isExpert
                ? 'You are authorized to add or update disease entries and manage IF-THEN diagnostic rules.'
                : 'Ordinary doctor accounts can inspect all diseases and rules for transparency, but only authorized medical experts/administrators may modify validated medical rules.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6">
        <button
          type="button"
          onClick={() => setTab('diseases')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
            tab === 'diseases'
              ? 'border-clinical-600 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Diseases ({diseases.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('rules')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
            tab === 'rules'
              ? 'border-clinical-600 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          IF-THEN Production Rules ({rules.length})
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-500 py-8">Loading knowledge base...</div>
      ) : tab === 'diseases' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {diseases.map((d) => (
            <div key={d._id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-clinical-700">
                      {d.code}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] rounded bg-slate-100 text-slate-700">
                      {d.category}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {d.reviewStatus}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-navy-900 mt-1">{d.name}</h3>
                </div>

                {isExpert && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditDisease(d)}
                      className="btn-outline px-2 py-1 text-xs"
                      title="Edit Disease"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDisease(d)}
                      className="btn-danger px-2 py-1 text-xs"
                      title="Delete Disease"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{d.description}</p>

              <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
                <p>
                  <strong className="text-navy-800">Common Symptoms:</strong>{' '}
                  {d.commonSymptoms?.join(', ') || 'N/A'}
                </p>
                <p>
                  <strong className="text-navy-800">Associated Test Findings:</strong>{' '}
                  {d.associatedTestFindings?.join('; ') || 'N/A'}
                </p>
                <p>
                  <strong className="text-navy-800">Relevant Medical History:</strong>{' '}
                  {d.relevantMedicalHistory?.join('; ') || 'N/A'}
                </p>
                <p>
                  <strong className="text-navy-800">Risk Factors:</strong>{' '}
                  {d.riskFactors?.join(', ') || 'N/A'}
                </p>
                <p className="text-slate-600 pt-1">
                  <strong className="text-navy-800">Clinical Reference:</strong>{' '}
                  {d.clinicalReferenceInfo}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((r) => (
            <div key={r._id} className="card p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-navy-800 bg-navy-100 px-2 py-0.5 rounded">
                      {r.ruleCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                        r.ruleType === 'clinical_flag'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-clinical-100 text-clinical-700'
                      }`}
                    >
                      {r.ruleType === 'clinical_flag'
                        ? 'Clinical Flag Rule'
                        : 'Condition Consideration Rule'}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] rounded ${
                        r.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-slate-500">
                      Disease: <strong>{r.disease?.name || 'N/A'}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-navy-900 mt-1">{r.name}</h3>
                  <p className="text-xs text-slate-600">{r.description}</p>
                </div>

                {isExpert && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditRule(r)}
                      className="btn-outline px-2.5 py-1 text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(r)}
                      className="btn-danger px-2.5 py-1 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Structured IF-THEN block */}
              <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div>
                  <span className="font-bold text-navy-800">IF</span>{' '}
                  <span className="text-slate-500">
                    (minimum {r.minConditionsToTrigger} criteria matched):
                  </span>
                  <ul className="mt-1.5 space-y-1 ml-4 list-disc">
                    {(r.conditions || []).map((c, idx) => (
                      <li key={idx} className="text-slate-800">
                        <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 mr-1.5">
                          {c.factType}:{c.key} {c.operator}
                        </span>
                        <span>{c.label}</span>
                        <span className="text-slate-500 ml-1.5">
                          (weight: {c.weight}
                          {c.required ? ', REQUIRED' : ''})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-bold text-clinical-700">THEN: </span>
                  <span className="font-medium text-navy-900">{r.conclusion}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disease Modal (Experts Only) */}
      <Modal
        isOpen={diseaseModalOpen}
        onClose={() => setDiseaseModalOpen(false)}
        title={editingDisease ? `Update Disease — ${editingDisease.code}` : 'Add Disease to Knowledge Base'}
      >
        {diseaseError && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{diseaseError}</span>
          </div>
        )}
        <form onSubmit={handleSaveDisease} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label text-xs">Disease Code</label>
              <input
                type="text"
                value={diseaseForm.code}
                onChange={(e) => setDiseaseForm({ ...diseaseForm, code: e.target.value })}
                placeholder="DIS-ASTHMA"
                className="form-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label text-xs">Disease Name *</label>
              <input
                type="text"
                required
                value={diseaseForm.name}
                onChange={(e) => setDiseaseForm({ ...diseaseForm, name: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Category</label>
              <input
                type="text"
                value={diseaseForm.category}
                onChange={(e) => setDiseaseForm({ ...diseaseForm, category: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label text-xs">Review Status</label>
              <select
                value={diseaseForm.reviewStatus}
                onChange={(e) =>
                  setDiseaseForm({ ...diseaseForm, reviewStatus: e.target.value })
                }
                className="form-input"
              >
                <option value="Educational Demonstration (Non-Clinical)">
                  Educational Demonstration (Non-Clinical)
                </option>
                <option value="Expert Reviewed (Demonstration)">
                  Expert Reviewed (Demonstration)
                </option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label text-xs">Disease Description *</label>
            <textarea
              rows={2}
              required
              value={diseaseForm.description}
              onChange={(e) =>
                setDiseaseForm({ ...diseaseForm, description: e.target.value })
              }
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label text-xs">Common Symptoms (comma-separated)</label>
            <input
              type="text"
              value={diseaseForm.commonSymptoms}
              onChange={(e) =>
                setDiseaseForm({ ...diseaseForm, commonSymptoms: e.target.value })
              }
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label text-xs">Associated Test Findings (comma-separated)</label>
            <input
              type="text"
              value={diseaseForm.associatedTestFindings}
              onChange={(e) =>
                setDiseaseForm({
                  ...diseaseForm,
                  associatedTestFindings: e.target.value,
                })
              }
              className="form-input"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Relevant Medical History</label>
              <input
                type="text"
                value={diseaseForm.relevantMedicalHistory}
                onChange={(e) =>
                  setDiseaseForm({
                    ...diseaseForm,
                    relevantMedicalHistory: e.target.value,
                  })
                }
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label text-xs">Risk Factors</label>
              <input
                type="text"
                value={diseaseForm.riskFactors}
                onChange={(e) =>
                  setDiseaseForm({ ...diseaseForm, riskFactors: e.target.value })
                }
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label text-xs">Clinical Reference Information *</label>
            <textarea
              rows={2}
              required
              value={diseaseForm.clinicalReferenceInfo}
              onChange={(e) =>
                setDiseaseForm({
                  ...diseaseForm,
                  clinicalReferenceInfo: e.target.value,
                })
              }
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label text-xs">Recommended Next Steps (comma-separated)</label>
            <input
              type="text"
              value={diseaseForm.recommendedNextSteps}
              onChange={(e) =>
                setDiseaseForm({
                  ...diseaseForm,
                  recommendedNextSteps: e.target.value,
                })
              }
              className="form-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setDiseaseModalOpen(false)}
              className="btn-outline"
            >
              Cancel
            </button>
            <button type="submit" disabled={savingDisease} className="btn-primary">
              {savingDisease ? 'Saving...' : editingDisease ? 'Update Disease' : 'Add Disease'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Rule Modal (Experts Only) */}
      <Modal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={
          editingRule
            ? `Modify Production Rule — ${editingRule.ruleCode}`
            : 'Add IF-THEN Diagnostic Production Rule'
        }
        maxWidth="max-w-3xl"
      >
        {ruleError && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{ruleError}</span>
          </div>
        )}
        <form onSubmit={handleSaveRule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label text-xs">Rule Code *</label>
              <input
                type="text"
                required
                value={ruleForm.ruleCode}
                onChange={(e) => setRuleForm({ ...ruleForm, ruleCode: e.target.value })}
                placeholder="RULE-CUSTOM-01"
                className="form-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label text-xs">Rule Name *</label>
              <input
                type="text"
                required
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label text-xs">Associated Disease *</label>
              <select
                required
                value={ruleForm.disease}
                onChange={(e) => setRuleForm({ ...ruleForm, disease: e.target.value })}
                className="form-input"
              >
                <option value="">-- Select Disease --</option>
                {diseases.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Rule Type</label>
              <select
                value={ruleForm.ruleType}
                onChange={(e) => setRuleForm({ ...ruleForm, ruleType: e.target.value })}
                className="form-input"
              >
                <option value="condition_consideration">Condition Consideration (min 2 criteria)</option>
                <option value="clinical_flag">Clinical Lab/Vital Flag</option>
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Min Criteria to Trigger</label>
              <input
                type="number"
                min={ruleForm.ruleType === 'clinical_flag' ? 1 : 2}
                value={ruleForm.minConditionsToTrigger}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, minConditionsToTrigger: e.target.value })
                }
                className="form-input"
              />
            </div>
          </div>

          <div>
            <label className="form-label text-xs">Description *</label>
            <input
              type="text"
              required
              value={ruleForm.description}
              onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
              className="form-input"
            />
          </div>

          {/* IF Conditions Builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="form-label text-xs mb-0">IF Conditions *</label>
              <button
                type="button"
                onClick={addConditionRow}
                className="btn-secondary px-2.5 py-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Condition
              </button>
            </div>

            {ruleForm.conditions.map((cond, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
              >
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-slate-600">Fact Type</label>
                  <select
                    value={cond.factType}
                    onChange={(e) => updateCondition(idx, 'factType', e.target.value)}
                    className="form-input text-xs py-1.5"
                  >
                    <option value="symptom">symptom</option>
                    <option value="vital">vital</option>
                    <option value="lab">lab</option>
                    <option value="history">history</option>
                    <option value="demographic">demographic</option>
                    <option value="severity">severity</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-slate-600">Fact Key</label>
                  <input
                    type="text"
                    required
                    value={cond.key}
                    onChange={(e) => updateCondition(idx, 'key', e.target.value)}
                    placeholder="fever / hemoglobin"
                    className="form-input text-xs py-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-slate-600">Operator</label>
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                    className="form-input text-xs py-1.5"
                  >
                    <option value="present">present</option>
                    <option value="absent">absent</option>
                    <option value="below_ref">below_ref</option>
                    <option value="above_ref">above_ref</option>
                    <option value="abnormal">abnormal</option>
                    <option value="gte">gte (&ge;)</option>
                    <option value="lte">lte (&le;)</option>
                    <option value="includes">includes</option>
                    <option value="in">in</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-medium text-slate-600">Readable Label *</label>
                  <input
                    type="text"
                    required
                    value={cond.label}
                    onChange={(e) => updateCondition(idx, 'label', e.target.value)}
                    placeholder="Fever is present"
                    className="form-input text-xs py-1.5"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-medium text-slate-600">Value</label>
                  <input
                    type="text"
                    value={cond.value ?? ''}
                    onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                    placeholder="-"
                    className="form-input text-xs py-1.5"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-medium text-slate-600">Wt</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    value={cond.weight}
                    onChange={(e) => updateCondition(idx, 'weight', e.target.value)}
                    className="form-input text-xs py-1.5"
                  />
                </div>
                <div className="sm:col-span-1 flex items-center justify-between gap-1">
                  <label className="flex items-center gap-1 text-[11px] cursor-pointer" title="Required condition">
                    <input
                      type="checkbox"
                      checked={Boolean(cond.required)}
                      onChange={(e) => updateCondition(idx, 'required', e.target.checked)}
                    />
                    Req
                  </label>
                  {ruleForm.conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeConditionRow(idx)}
                      className="text-red-600 hover:text-red-800 p-1"
                      aria-label="Remove condition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="form-label text-xs">THEN Conclusion Statement *</label>
            <textarea
              rows={2}
              required
              value={ruleForm.conclusion}
              onChange={(e) => setRuleForm({ ...ruleForm, conclusion: e.target.value })}
              placeholder="Consider [condition] as one possible condition requiring clinical evaluation."
              className="form-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Additional Info Required (comma-separated)</label>
              <input
                type="text"
                value={ruleForm.additionalInfoRequired}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, additionalInfoRequired: e.target.value })
                }
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label text-xs">Suggested Next Steps (comma-separated)</label>
              <input
                type="text"
                value={ruleForm.suggestedNextSteps}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, suggestedNextSteps: e.target.value })
                }
                className="form-input"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={ruleForm.isActive}
              onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
            />
            Rule is Active in Inference Engine
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setRuleModalOpen(false)}
              className="btn-outline"
            >
              Cancel
            </button>
            <button type="submit" disabled={savingRule} className="btn-primary">
              {savingRule ? 'Saving...' : editingRule ? 'Update Rule' : 'Save Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
