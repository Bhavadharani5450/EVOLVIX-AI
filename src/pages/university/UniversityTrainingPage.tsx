import React, { useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Card, Modal, PageHeader, ProgressBar, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { TrainingProgrammeRecord } from '../../types/evolvix';

export const UniversityTrainingPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const instId = user?.institutionId ?? 'inst-pacific';
  const trainings = state.trainingProgrammes.filter((t) => t.institutionId === instId);
  const batches = state.batches.filter((b) => b.institutionId === instId);

  const [modalOpen, setModalOpen] = useState(false);
  const [resourceInput, setResourceInput] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: '',
    targetSkills: 'Docker & Kubernetes, Distributed Systems',
    targetGroup: batches[0]?.name ?? 'Batch 2027 · Fall Cohort',
    resources: 'Hands-on Lab Workbook, Evaluation Rubric',
    enrolledCount: 80,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const skillsArr = form.targetSkills.split(',').map((s) => s.trim()).filter(Boolean);
    const resArr = form.resources.split(',').map((s) => s.trim()).filter(Boolean);

    const created: TrainingProgrammeRecord = {
      id: `trn-${Date.now()}`,
      institutionId: instId,
      title: form.title.trim(),
      targetSkills: skillsArr,
      targetGroup: form.targetGroup,
      resourceCount: resArr.length,
      resources: resArr,
      enrolledCount: form.enrolledCount,
      completionRate: 15,
      outcomeScore: 78,
      status: 'active',
    };
    updateState((prev) => ({
      ...prev,
      trainingProgrammes: [created, ...prev.trainingProgrammes],
    }));
    setForm((p) => ({ ...p, title: '' }));
    setModalOpen(false);
    showToast('Training programme launched', `${created.title} assigned to ${created.targetGroup}.`);
  };

  const handleAddResource = (id: string) => {
    const text = (resourceInput[id] ?? '').trim();
    if (!text) return;
    updateState((prev) => ({
      ...prev,
      trainingProgrammes: prev.trainingProgrammes.map((t) =>
        t.id === id
          ? { ...t, resources: [...t.resources, text], resourceCount: t.resourceCount + 1 }
          : t
      ),
    }));
    setResourceInput((p) => ({ ...p, [id]: '' }));
    showToast('Resource attached', `Added "${text}" to training programme.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Management"
        subtitle="Create targeted training programmes, attach learning resources, assign student batches, and evaluate outcomes."
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>Create Training Programme</span>
          </button>
        }
      />

      <div className="space-y-4">
        {trainings.map((trn) => (
          <Card key={trn.id} className="p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">{trn.title}</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Group: <strong className="text-[#0F172A]">{trn.targetGroup}</strong> · Skills:{' '}
                    {trn.targetSkills.join(', ')}
                  </p>
                </div>
              </div>
              <StatusLabel
                tone={trn.status === 'active' ? 'success' : trn.status === 'planned' ? 'info' : 'neutral'}
                text={trn.status}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div>
                <p className="text-xs text-[#64748B]">Enrolled Learners</p>
                <p className="text-lg font-bold font-mono tabular-nums text-[#0F172A]">{trn.enrolledCount}</p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Completion Rate</span>
                  <span className="font-mono tabular-nums font-semibold text-[#4F46E5]">{trn.completionRate}%</span>
                </div>
                <ProgressBar value={trn.completionRate} tone="brand" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Evaluated Outcome Score</p>
                <p className="text-lg font-bold font-mono tabular-nums text-[#16A34A]">{trn.outcomeScore}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#64748B]">Attached Resources ({trn.resources.length})</p>
              <p className="text-sm text-[#0F172A]">{trn.resources.join(' · ')}</p>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={resourceInput[trn.id] ?? ''}
                  onChange={(e) => setResourceInput((p) => ({ ...p, [trn.id]: e.target.value }))}
                  placeholder="Add new lab guide or resource title..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleAddResource(trn.id)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] hover:bg-slate-100"
                >
                  Add Resource
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Training Programme">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Programme Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Distributed Observability & Tracing Workshop"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Target Skills (comma-separated)</label>
            <input
              type="text"
              required
              value={form.targetSkills}
              onChange={(e) => setForm((p) => ({ ...p, targetSkills: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Assign Student Group / Batch</label>
            <select
              value={form.targetGroup}
              onChange={(e) => setForm((p) => ({ ...p, targetGroup: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Initial Resources (comma-separated)</label>
            <input
              type="text"
              value={form.resources}
              onChange={(e) => setForm((p) => ({ ...p, resources: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Create Programme
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
