import React, { useState } from 'react';
import { Edit3, Plus } from 'lucide-react';
import { Card, Modal, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { ProgrammeRecord } from '../../types/evolvix';

export const UniversityProgrammesPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const instId = user?.institutionId ?? 'inst-pacific';
  const depts = state.departments.filter((d) => d.institutionId === instId);
  const programmes = state.programmes.filter((p) => p.institutionId === instId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProgrammeRecord | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    departmentId: depts[0]?.id ?? '',
    level: 'Undergraduate' as ProgrammeRecord['level'],
    durationYears: 4,
    creditsRequired: 120,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      code: '',
      departmentId: depts[0]?.id ?? '',
      level: 'Undergraduate',
      durationYears: 4,
      creditsRequired: 120,
    });
    setModalOpen(true);
  };

  const openEdit = (prog: ProgrammeRecord) => {
    setEditing(prog);
    setForm({
      name: prog.name,
      code: prog.code,
      departmentId: prog.departmentId,
      level: prog.level,
      durationYears: prog.durationYears,
      creditsRequired: prog.creditsRequired,
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const dept = depts.find((d) => d.id === form.departmentId);
    if (!form.name.trim() || !dept) return;

    if (editing) {
      updateState((prev) => ({
        ...prev,
        programmes: prev.programmes.map((p) =>
          p.id === editing.id
            ? {
                ...p,
                name: form.name.trim(),
                code: form.code.trim().toUpperCase(),
                departmentId: dept.id,
                departmentName: dept.name,
                level: form.level,
                durationYears: form.durationYears,
                creditsRequired: form.creditsRequired,
              }
            : p
        ),
      }));
      showToast('Programme updated', `${form.name} configuration saved.`);
    } else {
      const next: ProgrammeRecord = {
        id: `prog-${Date.now()}`,
        institutionId: instId,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        departmentId: dept.id,
        departmentName: dept.name,
        level: form.level,
        durationYears: form.durationYears,
        creditsRequired: form.creditsRequired,
        status: 'active',
      };
      updateState((prev) => ({
        ...prev,
        programmes: [next, ...prev.programmes],
      }));
      showToast('Programme created', `${next.name} assigned to ${dept.name}.`);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programmes"
        subtitle="Configure degree programmes, department ownership, academic levels, and credit requirements."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>Create Programme</span>
          </button>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                <th className="py-3 px-4">Programme</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4 text-right">Duration</th>
                <th className="py-3 px-4 text-right">Credits</th>
                <th className="py-3 px-4 text-right">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {programmes.map((prog) => (
                <tr key={prog.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#0F172A]">{prog.name}</p>
                    <p className="text-xs font-mono text-[#64748B]">{prog.code}</p>
                  </td>
                  <td className="py-3.5 px-4 text-[#0F172A]">{prog.departmentName}</td>
                  <td className="py-3.5 px-4 text-[#64748B]">{prog.level}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#0F172A]">
                    {prog.durationYears} yrs
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#0F172A]">
                    {prog.creditsRequired}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <StatusLabel tone={prog.status === 'active' ? 'success' : 'neutral'} text={prog.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(prog)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-slate-100"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Programme' : 'Create Programme'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Programme Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. M.S. Cloud Systems"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Code</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="MS-CS"
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm((p) => ({ ...p, level: e.target.value as ProgrammeRecord['level'] }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                <option value="Undergraduate">Undergraduate</option>
                <option value="Postgraduate">Postgraduate</option>
                <option value="Diploma">Diploma</option>
                <option value="Certificate">Certificate</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Assign Department</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Duration (Years)</label>
              <input
                type="number"
                min={1}
                max={6}
                value={form.durationYears}
                onChange={(e) => setForm((p) => ({ ...p, durationYears: Number(e.target.value) || 2 }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Credits Required</label>
              <input
                type="number"
                min={12}
                max={200}
                value={form.creditsRequired}
                onChange={(e) => setForm((p) => ({ ...p, creditsRequired: Number(e.target.value) || 48 }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Save Programme
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
