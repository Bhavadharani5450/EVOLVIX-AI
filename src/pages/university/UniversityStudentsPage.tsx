import React, { useMemo, useState } from 'react';
import { Download, Edit3, Plus, Search, Upload } from 'lucide-react';
import { Card, Modal, PageHeader, ProgressBar, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { UniversityStudentRecord } from '../../types/evolvix';

export const UniversityStudentsPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState, apiFetch } = useAppData();
  const { showToast } = useToast();

  const instId = user?.institutionId ?? 'inst-pacific';
  const depts = state.departments.filter((d) => d.institutionId === instId);
  const batches = state.batches.filter((b) => b.institutionId === instId);
  const mentors = state.universityMentors.filter((m) => m.institutionId === instId);

  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState(
    'name,email,departmentCode,programmeCode,batchName,academicYear,gpa,interests\nElena Kim,elena.kim@pacifictech.edu,CSAI,BSCS-AI,Class of 2026,2025-2026,3.72,Distributed ML Serving;Cloud Native'
  );
  const [editing, setEditing] = useState<UniversityStudentRecord | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    departmentId: depts[0]?.id ?? '',
    batchId: batches[0]?.id ?? '',
    targetCareer: 'Applied ML Systems Engineer',
    assignedMentorId: mentors[0]?.id ?? '',
  });

  const students = useMemo(() => {
    return state.universityStudents
      .filter((s) => s.institutionId === instId)
      .filter((s) => {
        const matchQ =
          !query.trim() ||
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.email.toLowerCase().includes(query.toLowerCase());
        const matchD = deptFilter === 'ALL' || s.departmentId === deptFilter;
        return matchQ && matchD;
      });
  }, [state.universityStudents, instId, query, deptFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      email: '',
      departmentId: depts[0]?.id ?? '',
      batchId: batches[0]?.id ?? '',
      targetCareer: 'Applied ML Systems Engineer',
      assignedMentorId: mentors[0]?.id ?? '',
    });
    setModalOpen(true);
  };

  const openEdit = (stu: UniversityStudentRecord) => {
    setEditing(stu);
    setForm({
      name: stu.name,
      email: stu.email,
      departmentId: stu.departmentId,
      batchId: stu.batchId,
      targetCareer: stu.targetCareer,
      assignedMentorId: stu.assignedMentorId,
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const dept = depts.find((d) => d.id === form.departmentId);
    const batch = batches.find((b) => b.id === form.batchId);
    const mentor = mentors.find((m) => m.id === form.assignedMentorId);
    if (!form.name.trim() || !dept || !batch) return;

    if (editing) {
      updateState((prev) => ({
        ...prev,
        universityStudents: prev.universityStudents.map((s) =>
          s.id === editing.id
            ? {
                ...s,
                name: form.name.trim(),
                email: form.email.trim(),
                departmentId: dept.id,
                departmentName: dept.name,
                batchId: batch.id,
                batchName: batch.name,
                targetCareer: form.targetCareer.trim(),
                assignedMentorId: mentor?.id ?? s.assignedMentorId,
                assignedMentorName: mentor?.name ?? s.assignedMentorName,
              }
            : s
        ),
      }));
      showToast('Student updated', `${form.name} details saved.`);
    } else {
      const created: UniversityStudentRecord = {
        id: `stu-${Date.now()}`,
        institutionId: instId,
        name: form.name.trim(),
        email: form.email.trim(),
        departmentId: dept.id,
        departmentName: dept.name,
        batchId: batch.id,
        batchName: batch.name,
        targetCareer: form.targetCareer.trim(),
        readinessScore: 62,
        roadmapProgress: 25,
        assignedMentorId: mentor?.id ?? '',
        assignedMentorName: mentor?.name ?? 'Unassigned',
        status: 'active',
      };
      updateState((prev) => ({
        ...prev,
        universityStudents: [created, ...prev.universityStudents],
      }));
      showToast('Student enrolled', `${created.name} added to ${batch.name}.`);
    }
    setModalOpen(false);
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const result = await apiFetch<{
        importedCount: number;
        skippedCount: number;
        imported: Array<{ id: string; name: string; email: string; departmentName: string }>;
      }>('/api/university/students/import', {
        method: 'POST',
        body: JSON.stringify({ institutionId: instId, csvText }),
      });

      if (result.imported.length > 0) {
        const defaultBatch = batches[0];
        const defaultMentor = mentors[0];
        const addedRecords: UniversityStudentRecord[] = result.imported.map((imp) => ({
          id: imp.id,
          institutionId: instId,
          name: imp.name,
          email: imp.email,
          departmentId: depts.find((d) => d.name === imp.departmentName)?.id ?? depts[0]?.id ?? '',
          departmentName: imp.departmentName,
          batchId: defaultBatch?.id ?? '',
          batchName: defaultBatch?.name ?? 'Cohort 2026',
          targetCareer: 'Full-Stack AI Product Engineer',
          readinessScore: 64,
          roadmapProgress: 15,
          assignedMentorId: defaultMentor?.id ?? '',
          assignedMentorName: defaultMentor?.name ?? 'Unassigned',
          status: 'active',
        }));

        updateState((prev) => ({
          ...prev,
          universityStudents: [...addedRecords, ...prev.universityStudents],
        }));
      }

      setImportOpen(false);
      showToast(
        'CSV Import Completed',
        `Imported ${result.importedCount} student(s) and ran baseline 6-agent analysis (${result.skippedCount} skipped).`,
        'success'
      );
    } catch (err) {
      showToast('Import failed', err instanceof Error ? err.message : 'Unable to import CSV', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleExportCsv = () => {
    const rows = ['Name,Email,Department,Batch,Target Career,Readiness %,Roadmap %,Mentor,Status'];
    for (const s of students) {
      rows.push(
        `"${s.name}","${s.email}","${s.departmentName}","${s.batchName}","${s.targetCareer}",${s.readinessScore},${s.roadmapProgress},"${s.assignedMentorName}",${s.status}`
      );
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'university-students.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Student roster exported', 'Downloaded university-students.csv');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle="Enroll students, import institutional CSV rosters, assign departments and batches, and track readiness."
        actions={
          <>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#4F46E5] hover:bg-indigo-50/50"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </button>
          </>
        }
      />

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students by name or email..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
          />
        </div>
        <select
          aria-label="Filter by department"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Departments</option>
          {depts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Department & Batch</th>
                <th className="py-3 px-4">Mentor</th>
                <th className="py-3 px-4 text-right">Readiness</th>
                <th className="py-3 px-4 w-40">Progress</th>
                <th className="py-3 px-4 text-right">Status</th>
                <th className="py-3 px-4 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {students.map((stu) => (
                <tr key={stu.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#0F172A]">{stu.name}</p>
                    <p className="text-xs text-[#64748B]">{stu.email}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-[#0F172A]">{stu.departmentName}</p>
                    <p className="text-xs text-[#64748B]">{stu.batchName}</p>
                  </td>
                  <td className="py-3.5 px-4 text-[#0F172A]">{stu.assignedMentorName}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#4F46E5]">
                    {stu.readinessScore}%
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ProgressBar value={stu.roadmapProgress} tone={stu.status === 'at_risk' ? 'warning' : 'brand'} />
                      </div>
                      <span className="text-xs font-mono tabular-nums text-[#64748B]">{stu.roadmapProgress}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <StatusLabel
                      tone={stu.status === 'active' ? 'success' : stu.status === 'at_risk' ? 'warning' : 'neutral'}
                      text={stu.status.replace('_', ' ')}
                    />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(stu)}
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
        title={editing ? 'Edit Student Record' : 'Add Student to Institution'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Department</label>
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
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Batch</label>
              <select
                value={form.batchId}
                onChange={(e) => setForm((p) => ({ ...p, batchId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Assign Mentor</label>
            <select
              value={form.assignedMentorId}
              onChange={(e) => setForm((p) => ({ ...p, assignedMentorId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.specialization})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Target Career</label>
            <input
              type="text"
              value={form.targetCareer}
              onChange={(e) => setForm((p) => ({ ...p, targetCareer: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              {editing ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Bulk Import Students (CSV)"
        subtitle="Paste CSV rows scoped strictly to your institution. Imported students receive automatic baseline 6-agent analysis."
      >
        <form onSubmit={handleBulkImport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              CSV Data (name,email,departmentCode,programmeCode,batchName,academicYear,gpa,interests)
            </label>
            <textarea
              rows={6}
              required
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 rounded-lg border border-[#E2E8F0] text-xs font-mono text-[#0F172A]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importing}
              className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {importing ? 'Importing & Analyzing...' : 'Import Students'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

