import React, { useState } from 'react';
import { Plus, UserCheck } from 'lucide-react';
import { Card, Modal, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { UniversityMentorRecord } from '../../types/evolvix';

export const UniversityMentorsPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const instId = user?.institutionId ?? 'inst-pacific';
  const mentors = state.universityMentors.filter((m) => m.institutionId === instId);
  const students = state.universityStudents.filter((s) => s.institutionId === instId);
  const depts = state.departments.filter((d) => d.institutionId === instId);

  const [addOpen, setAddOpen] = useState(false);
  const [assignModalMentor, setAssignModalMentor] = useState<UniversityMentorRecord | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? '');
  const [form, setForm] = useState({
    name: '',
    email: '',
    specialization: '',
    departmentName: depts[0]?.name ?? 'Computer Science & AI',
  });

  const handleAddMentor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    const next: UniversityMentorRecord = {
      id: `men-${Date.now()}`,
      institutionId: instId,
      name: form.name.trim(),
      email: form.email.trim(),
      specialization: form.specialization.trim() || 'Applied Engineering',
      departmentName: form.departmentName,
      assignedStudentIds: [],
      activeSessions: 0,
      avgFeedbackScore: 5.0,
      status: 'active',
    };
    updateState((prev) => ({
      ...prev,
      universityMentors: [next, ...prev.universityMentors],
    }));
    setForm({ name: '', email: '', specialization: '', departmentName: depts[0]?.name ?? '' });
    setAddOpen(false);
    showToast('Mentor added', `${next.name} onboarded to your institution.`);
  };

  const handleAssignStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalMentor || !selectedStudentId) return;

    updateState((prev) => ({
      ...prev,
      universityMentors: prev.universityMentors.map((m) => {
        if (m.id === assignModalMentor.id) {
          return {
            ...m,
            assignedStudentIds: Array.from(new Set([...m.assignedStudentIds, selectedStudentId])),
          };
        }
        return {
          ...m,
          assignedStudentIds: m.assignedStudentIds.filter((sid) => sid !== selectedStudentId),
        };
      }),
      universityStudents: prev.universityStudents.map((s) =>
        s.id === selectedStudentId
          ? { ...s, assignedMentorId: assignModalMentor.id, assignedMentorName: assignModalMentor.name }
          : s
      ),
    }));
    setAssignModalMentor(null);
    showToast('Student assigned', `Updated mentor assignment to ${assignModalMentor.name}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentors"
        subtitle="Manage institutional mentors, assign students to cohorts, and review mentoring activity."
        actions={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Mentor</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mentors.map((mentor) => {
          const assignedList = students.filter((s) => s.assignedMentorId === mentor.id);
          return (
            <Card key={mentor.id} className="p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#0F172A]">{mentor.name}</h2>
                      <p className="text-xs text-[#64748B]">{mentor.departmentName}</p>
                    </div>
                  </div>
                  <StatusLabel
                    tone={mentor.status === 'active' ? 'success' : 'warning'}
                    text={mentor.status === 'active' ? 'Active' : 'On Leave'}
                  />
                </div>
                <p className="text-xs text-[#0F172A]">{mentor.specialization}</p>
                <p className="text-xs text-[#64748B] font-mono tabular-nums">
                  {assignedList.length} assigned students · {mentor.activeSessions} active sessions · {mentor.avgFeedbackScore}/5.0 rating
                </p>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                <p className="text-[11px] text-[#64748B] truncate">
                  Assigned: {assignedList.length > 0 ? assignedList.map((s) => s.name).join(', ') : 'None yet'}
                </p>
                <button
                  type="button"
                  onClick={() => setAssignModalMentor(mentor)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#4F46E5] hover:bg-indigo-50"
                >
                  Assign Student
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Institutional Mentor">
        <form onSubmit={handleAddMentor} className="space-y-4">
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
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Department</label>
            <select
              value={form.departmentName}
              onChange={(e) => setForm((p) => ({ ...p, departmentName: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              {depts.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Specialization</label>
            <input
              type="text"
              required
              value={form.specialization}
              onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))}
              placeholder="e.g. Distributed ML & Observability"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Add Mentor
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(assignModalMentor)}
        onClose={() => setAssignModalMentor(null)}
        title={`Assign Student to ${assignModalMentor?.name ?? ''}`}
      >
        <form onSubmit={handleAssignStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Select Institution Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.departmentName}) — Currently: {s.assignedMentorName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAssignModalMentor(null)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
