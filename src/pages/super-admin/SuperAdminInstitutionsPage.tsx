import React, { useMemo, useState } from 'react';
import { Edit3, Eye, Landmark, Plus, Search } from 'lucide-react';
import { Card, Modal, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { InstitutionRecord } from '../../types/evolvix';

export const SuperAdminInstitutionsPage: React.FC = () => {
  const { state, updateState, apiFetch } = useAppData();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailInst, setDetailInst] = useState<InstitutionRecord | null>(null);
  const [editing, setEditing] = useState<InstitutionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    domain: '',
    region: 'US-West',
    educationLevel: 'University',
    academicStructure: 'Semester',
  });

  const filtered = useMemo(() => {
    return state.institutions.filter((inst) => {
      const matchQ =
        !query.trim() ||
        inst.name.toLowerCase().includes(query.toLowerCase()) ||
        inst.code.toLowerCase().includes(query.toLowerCase()) ||
        inst.domain.toLowerCase().includes(query.toLowerCase());
      const matchS = statusFilter === 'ALL' || inst.status === statusFilter;
      return matchQ && matchS;
    });
  }, [state.institutions, query, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      code: '',
      domain: '',
      region: 'US-West',
      educationLevel: 'University',
      academicStructure: 'Semester',
    });
    setModalOpen(true);
  };

  const openEdit = (inst: InstitutionRecord) => {
    setEditing(inst);
    setForm({
      name: inst.name,
      code: inst.code,
      domain: inst.domain,
      region: inst.region,
      educationLevel: 'University',
      academicStructure: 'Semester',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;

    if (editing) {
      updateState((prev) => ({
        ...prev,
        institutions: prev.institutions.map((i) =>
          i.id === editing.id
            ? { ...i, name: form.name.trim(), code: form.code.trim().toUpperCase(), domain: form.domain.trim(), region: form.region }
            : i
        ),
      }));
      showToast('Institution updated', `${form.name} metadata saved.`);
      setModalOpen(false);
    } else {
      setSaving(true);
      try {
        const res = await apiFetch<{ institution: InstitutionRecord & { educationLevel?: string; academicStructure?: string } }>(
          '/api/institutions',
          {
            method: 'POST',
            body: JSON.stringify(form),
          }
        );
        const created: InstitutionRecord = {
          id: res.institution.id,
          name: res.institution.name,
          code: res.institution.code,
          domain: res.institution.domain,
          region: res.institution.region,
          status: 'active',
          studentCount: 0,
          mentorCount: 0,
          readinessAvg: 0,
          createdAt: res.institution.createdAt,
        };
        updateState((prev) => ({
          ...prev,
          institutions: [created, ...prev.institutions],
        }));
        showToast('Institution onboarded', `${created.name} (${form.educationLevel} · ${form.academicStructure}) persisted.`, 'success');
        setModalOpen(false);
      } catch (err) {
        showToast('Creation failed', err instanceof Error ? err.message : 'Unable to create institution', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  const toggleStatus = (id: string) => {
    updateState((prev) => ({
      ...prev,
      institutions: prev.institutions.map((i) =>
        i.id === id ? { ...i, status: i.status === 'active' ? 'inactive' : 'active' } : i
      ),
    }));
    showToast('Institution status updated');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutions"
        subtitle="Onboard schools, colleges, and universities with distinct academic structures and tenant isolation."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>Create Institution</span>
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
            placeholder="Search institutions by name, code, or domain..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
          />
        </div>
        <select
          aria-label="Filter institutions by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'active' | 'inactive')}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((inst) => (
          <Card key={inst.id} className="p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">{inst.name}</h2>
                    <p className="text-xs font-mono text-[#64748B]">
                      {inst.code} · {inst.region}
                    </p>
                  </div>
                </div>
                <StatusLabel tone={inst.status === 'active' ? 'success' : 'neutral'} text={inst.status} />
              </div>
              <p className="text-xs text-[#64748B]">
                Domain: <span className="font-mono text-[#0F172A]">{inst.domain}</span>
              </p>
              <p className="text-xs text-[#64748B] font-mono tabular-nums">
                {inst.studentCount} students · {inst.mentorCount} mentors · {inst.readinessAvg}% avg readiness
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] gap-2">
              <button
                type="button"
                onClick={() => setDetailInst(inst)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Details</span>
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEdit(inst)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(inst.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:text-[#0F172A]"
                >
                  {inst.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Institution' : 'Create Institution'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Institution Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
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
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Region</label>
              <select
                value={form.region}
                onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                <option value="US-West">US-West</option>
                <option value="US-East">US-East</option>
                <option value="EU-North">EU-North</option>
                <option value="APAC-South">APAC-South</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Education Level</label>
              <select
                value={form.educationLevel}
                onChange={(e) => setForm((p) => ({ ...p, educationLevel: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                <option value="University">University</option>
                <option value="Engineering College">Engineering College</option>
                <option value="High School">High School</option>
                <option value="Polytechnic">Polytechnic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Academic Structure</label>
              <select
                value={form.academicStructure}
                onChange={(e) => setForm((p) => ({ ...p, academicStructure: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                <option value="Semester">Semester</option>
                <option value="Trimester">Trimester</option>
                <option value="Annual">Annual</option>
                <option value="Credit-Based">Credit-Based</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Primary Domain</label>
            <input
              type="text"
              required
              value={form.domain}
              onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))}
              placeholder="university.edu"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium disabled:opacity-60">
              {editing ? 'Save Changes' : saving ? 'Creating...' : 'Create Institution'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(detailInst)} onClose={() => setDetailInst(null)} title={detailInst?.name ?? 'Institution Details'}>
        {detailInst && (
          <div className="space-y-3 text-sm">
            <p>
              <strong>Tenant Code:</strong> <span className="font-mono">{detailInst.code}</span>
            </p>
            <p>
              <strong>Domain:</strong> <span className="font-mono">{detailInst.domain}</span>
            </p>
            <p>
              <strong>Region:</strong> {detailInst.region}
            </p>
            <p>
              <strong>Onboarded:</strong> <span className="font-mono">{detailInst.createdAt}</span>
            </p>
            <p>
              <strong>Active Population:</strong> {detailInst.studentCount} students, {detailInst.mentorCount} mentors
            </p>
            <p>
              <strong>Average Career Readiness:</strong> <span className="font-mono">{detailInst.readinessAvg}%</span>
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
