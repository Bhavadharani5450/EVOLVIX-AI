import React, { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Card, Modal, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { MentoringSession } from '../../types/evolvix';

export const MentorSessionsPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const assigned = state.mentorAssignedStudents.filter((s) => s.mentorId === (user?.id ?? 'men-maya'));
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    studentId: assigned[0]?.id ?? '',
    topic: '',
    scheduledDate: '2026-11-18',
    scheduledTime: '14:00',
    durationMinutes: 45,
    notes: '',
  });
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const stu = assigned.find((s) => s.id === form.studentId);
    if (!stu || !form.topic.trim()) return;

    const nextSession: MentoringSession = {
      id: `ses-${Date.now()}`,
      studentId: stu.id,
      studentName: stu.name,
      topic: form.topic.trim(),
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      durationMinutes: form.durationMinutes,
      status: 'scheduled',
      notes: form.notes.trim(),
    };
    updateState((prev) => ({
      ...prev,
      mentoringSessions: [nextSession, ...prev.mentoringSessions],
    }));
    setForm((p) => ({ ...p, topic: '', notes: '' }));
    setModalOpen(false);
    showToast('Mentoring session scheduled', `${stu.name} · ${form.scheduledDate} at ${form.scheduledTime}`);
  };

  const handleUpdateSession = (id: string, status: MentoringSession['status'], notes: string) => {
    updateState((prev) => ({
      ...prev,
      mentoringSessions: prev.mentoringSessions.map((s) => (s.id === id ? { ...s, status, notes } : s)),
    }));
    showToast('Session updated');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentoring Sessions"
        subtitle="Schedule 1:1 sessions with assigned students, update session statuses, and record meeting notes."
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Session</span>
          </button>
        }
      />

      <div className="space-y-4">
        {state.mentoringSessions.map((ses) => {
          const currentNote = notesDraft[ses.id] ?? ses.notes;
          return (
            <Card key={ses.id} className="p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#0F172A]">{ses.topic}</h2>
                    <p className="text-xs text-[#64748B] font-mono tabular-nums mt-0.5">
                      {ses.studentName} · {ses.scheduledDate} at {ses.scheduledTime} · {ses.durationMinutes} mins
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusLabel
                    tone={
                      ses.status === 'completed' ? 'success' : ses.status === 'scheduled' ? 'info' : 'error'
                    }
                    text={ses.status}
                  />
                  <select
                    aria-label={`Status for ${ses.topic}`}
                    value={ses.status}
                    onChange={(e) =>
                      handleUpdateSession(ses.id, e.target.value as MentoringSession['status'], currentNote)
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={currentNote}
                  onChange={(e) => setNotesDraft((p) => ({ ...p, [ses.id]: e.target.value }))}
                  placeholder="Add meeting notes and action items..."
                  className="flex-1 px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateSession(ses.id, ses.status, currentNote)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] hover:bg-slate-100"
                >
                  Save Notes
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Mentoring Session">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Assigned Student</label>
            <select
              value={form.studentId}
              onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              {assigned.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.department})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Session Topic</label>
            <input
              type="text"
              required
              value={form.topic}
              onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
              placeholder="e.g. Kubernetes Readiness Probe Architecture Review"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Date</label>
              <input
                type="date"
                required
                value={form.scheduledDate}
                onChange={(e) => setForm((p) => ({ ...p, scheduledDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Time</label>
              <input
                type="time"
                required
                value={form.scheduledTime}
                onChange={(e) => setForm((p) => ({ ...p, scheduledTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Mins</label>
              <input
                type="number"
                min={15}
                max={90}
                value={form.durationMinutes}
                onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) || 30 }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Agenda / Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Schedule Session
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
