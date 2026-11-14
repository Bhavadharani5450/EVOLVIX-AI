import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Card, Modal, PageHeader, ProgressBar, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { BatchRecord } from '../../types/evolvix';

export const UniversityBatchesPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const instId = user?.institutionId ?? 'inst-pacific';
  const programmes = state.programmes.filter((p) => p.institutionId === instId);
  const [query, setQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    programmeId: programmes[0]?.id ?? '',
    academicYear: '2026-2027',
    studentCount: 60,
  });

  const batches = useMemo(() => {
    return state.batches
      .filter((b) => b.institutionId === instId)
      .filter((b) => {
        const matchQ =
          !query.trim() ||
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.programmeName.toLowerCase().includes(query.toLowerCase());
        const matchY = yearFilter === 'ALL' || b.academicYear === yearFilter;
        return matchQ && matchY;
      });
  }, [state.batches, instId, query, yearFilter]);

  const years = Array.from(new Set(state.batches.filter((b) => b.institutionId === instId).map((b) => b.academicYear)));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const prog = programmes.find((p) => p.id === form.programmeId);
    if (!form.name.trim() || !prog) return;

    const created: BatchRecord = {
      id: `bat-${Date.now()}`,
      institutionId: instId,
      name: form.name.trim(),
      programmeId: prog.id,
      programmeName: prog.name,
      academicYear: form.academicYear,
      studentCount: form.studentCount,
      avgProgress: 12,
      status: 'active',
    };
    updateState((prev) => ({
      ...prev,
      batches: [created, ...prev.batches],
    }));
    setForm((p) => ({ ...p, name: '' }));
    setModalOpen(false);
    showToast('Batch created', `${created.name} linked to ${prog.name}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        subtitle="Create student batches, assign academic programmes, set cohort years, and track average progress."
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>Create Batch</span>
          </button>
        }
      />

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search batches by name or programme..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
          />
        </div>
        <select
          aria-label="Filter by academic year"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Academic Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {batches.map((b) => (
          <Card key={b.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">{b.name}</h2>
                <p className="text-xs text-[#64748B]">
                  {b.programmeName} · AY {b.academicYear}
                </p>
              </div>
              <StatusLabel tone={b.status === 'active' ? 'success' : 'neutral'} text={b.status} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#64748B]">{b.studentCount} students</span>
                <span className="font-mono tabular-nums font-semibold text-[#4F46E5]">{b.avgProgress}% avg progress</span>
              </div>
              <ProgressBar value={b.avgProgress} tone={b.status === 'completed' ? 'success' : 'brand'} />
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Batch">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Batch Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Batch 2028 · Spring Cohort"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Programme</label>
            <select
              value={form.programmeId}
              onChange={(e) => setForm((p) => ({ ...p, programmeId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Academic Year</label>
              <input
                type="text"
                required
                value={form.academicYear}
                onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Target Seats</label>
              <input
                type="number"
                min={10}
                value={form.studentCount}
                onChange={(e) => setForm((p) => ({ ...p, studentCount: Number(e.target.value) || 40 }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Create Batch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
