import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Card, PageHeader } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { MentorFeedbackEntry } from '../../types/evolvix';

export const MentorFeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const assigned = state.mentorAssignedStudents.filter((s) => s.mentorId === (user?.id ?? 'men-maya'));
  const [form, setForm] = useState({
    studentId: assigned[0]?.id ?? '',
    category: 'Technical Depth' as MentorFeedbackEntry['category'],
    rating: 4,
    summary: '',
    improvementPlan: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stu = assigned.find((s) => s.id === form.studentId);
    if (!stu || !form.summary.trim() || !form.improvementPlan.trim()) return;

    const entry: MentorFeedbackEntry = {
      id: `fb-${Date.now()}`,
      studentId: stu.id,
      studentName: stu.name,
      category: form.category,
      rating: form.rating,
      summary: form.summary.trim(),
      improvementPlan: form.improvementPlan.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    updateState((prev) => ({
      ...prev,
      mentorFeedbacks: [entry, ...prev.mentorFeedbacks],
    }));
    setForm((p) => ({ ...p, summary: '', improvementPlan: '' }));
    showToast('Feedback submitted', `Recorded structured improvement plan for ${stu.name}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        subtitle="Submit structured learner feedback and track improvement recommendations across your cohort."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5 p-6">
          <h2 className="text-base font-semibold text-[#0F172A] mb-4">Submit Student Feedback</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Student</label>
              <select
                value={form.studentId}
                onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                {assigned.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value as MentorFeedbackEntry['category'] }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                >
                  <option value="Technical Depth">Technical Depth</option>
                  <option value="Project Execution">Project Execution</option>
                  <option value="Career Readiness">Career Readiness</option>
                  <option value="Communication">Communication</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Rating (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={form.rating}
                  onChange={(e) => setForm((p) => ({ ...p, rating: Math.max(1, Math.min(5, Number(e.target.value) || 4)) }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Observation Summary</label>
              <textarea
                rows={3}
                required
                value={form.summary}
                onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                placeholder="Summarize progress and technical observations..."
                className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Improvement Recommendation</label>
              <textarea
                rows={2}
                required
                value={form.improvementPlan}
                onChange={(e) => setForm((p) => ({ ...p, improvementPlan: e.target.value }))}
                placeholder="Concrete next action for the next 2 weeks..."
                className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
            >
              <Send className="w-4 h-4" />
              <span>Submit Feedback</span>
            </button>
          </form>
        </Card>

        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#4F46E5]" />
            <h2 className="text-base font-semibold text-[#0F172A]">Feedback History</h2>
          </div>
          <div className="space-y-3">
            {state.mentorFeedbacks.map((fb) => (
              <div key={fb.id} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {fb.studentName} · {fb.category}
                  </p>
                  <span className="text-xs font-mono tabular-nums font-semibold text-[#4F46E5]">
                    {fb.rating}/5 · {fb.createdAt}
                  </span>
                </div>
                <p className="text-sm text-[#0F172A]">{fb.summary}</p>
                <p className="text-xs text-[#64748B]">
                  <strong>Improvement Plan:</strong> {fb.improvementPlan}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
