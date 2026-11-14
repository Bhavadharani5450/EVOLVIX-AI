import React, { useMemo, useState } from 'react';
import { Building2, Edit3, Plus, Search } from 'lucide-react';
import { Card, Modal, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { DepartmentRecord } from '../../types/evolvix';

export const UniversityDepartmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const instId = user?.institutionId ?? 'inst-pacific';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRecord | null>(null);
  const [form, setForm] = useState({ name: '', code: '', headName: '', studentCount: 120 });

  const depts = useMemo(() => {
    return state.departments
      .filter((d) => d.institutionId === instId)
      .filter((d) => {
        const matchQ =
          !query.trim() ||
          d.name.toLowerCase().includes(query.toLowerCase()) ||
          d.code.toLowerCase().includes(query.toLowerCase());
        const matchS = statusFilter === 'ALL' || d.status === statusFilter;
        return matchQ && matchS;
      });
  }, [state.departments, instId, query, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', headName: '', studentCount: 120 });
    setModalOpen(true);
  };

  const openEdit = (dept: DepartmentRecord) => {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code, headName: dept.headName, studentCount: dept.studentCount });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;

    if (editing) {
      updateState((prev) => ({
        ...prev,
        departments: prev.departments.map((d) =>
          d.id === editing.id
            ? { ...d, name: form.name.trim(), code: form.code.trim().toUpperCase(), headName: form.headName.trim(), studentCount: form.studentCount }
            : d
        ),
      }));
      showToast('Department updated', `${form.name} saved.`);
    } else {
      const created: DepartmentRecord = {
        id: `dept-${Date.now()}`,
        institutionId: instId,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        headName: form.headName.trim() || 'TBD Chair',
        status: 'active',
        studentCount: form.studentCount,
        avgReadiness: 72,
      };
      updateState((prev) => ({
        ...prev,
        departments: [created, ...prev.departments],
      }));
      showToast('Department created', `${created.name} added to your institution.`);
    }
    setModalOpen(false);
  };

  const toggleStatus = (id: string) => {
    updateState((prev) => ({
      ...prev,
      departments: prev.departments.map((d) =>
        d.id === id ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d
      ),
    }));
    showToast('Department status updated');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Create, edit, activate, and monitor academic departments within your institution."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>Create Department</span>
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
            placeholder="Search departments by name or code..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
          />
        </div>
        <select
          aria-label="Filter department status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'active' | 'inactive')}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {depts.map((dept) => (
          <Card key={dept.id} className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">{dept.name}</h2>
                  <p className="text-xs text-[#64748B]">
                    Code: <span className="font-mono">{dept.code}</span> · Head: {dept.headName}
                  </p>
                </div>
              </div>
              <StatusLabel tone={dept.status === 'active' ? 'success' : 'neutral'} text={dept.status} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] text-xs">
              <span className="font-mono tabular-nums text-[#64748B]">
                {dept.studentCount} students · {dept.avgReadiness}% avg readiness
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(dept)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(dept.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                >
                  {dept.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Department' : 'Create Department'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Department Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Robotics & Autonomous Systems"
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
                placeholder="RAS"
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Enrolled Count</label>
              <input
                type="number"
                min={0}
                value={form.studentCount}
                onChange={(e) => setForm((p) => ({ ...p, studentCount: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Department Head</label>
            <input
              type="text"
              required
              value={form.headName}
              onChange={(e) => setForm((p) => ({ ...p, headName: e.target.value }))}
              placeholder="Prof. Jordan Reyes"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              {editing ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
