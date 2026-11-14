import React, { useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Card, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const MentorAssessmentReviewPage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending');
  const [selectedId, setSelectedId] = useState(state.assessmentReviews[0]?.id ?? '');
  const [marksInput, setMarksInput] = useState<number>(88);
  const [feedbackInput, setFeedbackInput] = useState('');

  const items = state.assessmentReviews.filter((r) =>
    tab === 'pending' ? r.status === 'pending' : r.status !== 'pending'
  );
  const activeItem = state.assessmentReviews.find((r) => r.id === selectedId) ?? items[0];

  const handleDecision = (decision: 'approved' | 'revision_requested') => {
    if (!activeItem) return;
    if (!feedbackInput.trim()) {
      showToast('Feedback required', 'Add constructive review feedback before submitting.', 'error');
      return;
    }

    updateState((prev) => ({
      ...prev,
      assessmentReviews: prev.assessmentReviews.map((r) =>
        r.id === activeItem.id
          ? { ...r, status: decision, marks: marksInput, feedback: feedbackInput.trim() }
          : r
      ),
    }));

    setFeedbackInput('');
    showToast(
      decision === 'approved' ? 'Submission approved' : 'Revision requested',
      `${activeItem.studentName} notified (${marksInput}/100).`
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Review"
        subtitle="Grade pending mission answers and project evidence, add marks and feedback, or request revisions."
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium border ${
            tab === 'pending'
              ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
              : 'bg-white text-[#64748B] border-[#E2E8F0]'
          }`}
        >
          Pending Queue ({state.assessmentReviews.filter((r) => r.status === 'pending').length})
        </button>
        <button
          type="button"
          onClick={() => setTab('reviewed')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium border ${
            tab === 'reviewed'
              ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
              : 'bg-white text-[#64748B] border-[#E2E8F0]'
          }`}
        >
          Reviewed History ({state.assessmentReviews.filter((r) => r.status !== 'pending').length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`p-4 cursor-pointer transition-colors ${
                item.id === activeItem?.id ? 'border-[#4F46E5] bg-indigo-50/30' : 'hover:bg-slate-50/70'
              }`}
            >
              <div onClick={() => setSelectedId(item.id)} className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0F172A]">{item.title}</p>
                  <StatusLabel
                    tone={
                      item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'error'
                    }
                    text={
                      item.status === 'approved'
                        ? `${item.marks ?? 90}%`
                        : item.status === 'pending'
                        ? 'Pending'
                        : 'Revision'
                    }
                  />
                </div>
                <p className="text-xs text-[#64748B]">
                  {item.studentName} · {item.type} · {item.submittedAt}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-7">
          {activeItem ? (
            <Card className="p-6 space-y-5">
              <div className="pb-4 border-b border-[#E2E8F0]">
                <h2 className="text-lg font-semibold text-[#0F172A]">{activeItem.title}</h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Submitted by <strong className="text-[#0F172A]">{activeItem.studentName}</strong> · {activeItem.type} ·{' '}
                  {activeItem.submittedAt}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <p className="text-xs font-semibold text-[#64748B]">Learner Submission</p>
                <p className="text-sm text-[#0F172A] leading-relaxed">{activeItem.answerSummary}</p>
                {activeItem.projectLink && (
                  <p className="text-xs font-mono text-[#4F46E5] break-all">
                    Project Evidence: {activeItem.projectLink}
                  </p>
                )}
              </div>

              {activeItem.status === 'pending' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">Marks (0 – 100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={marksInput}
                      onChange={(e) => setMarksInput(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      className="w-32 px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">Mentor Feedback</label>
                    <textarea
                      rows={3}
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="Provide specific technical feedback on strengths or required revisions..."
                      className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleDecision('revision_requested')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-[#DC2626] hover:bg-red-100"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Request Revision</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision('approved')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#16A34A] text-white text-sm font-medium hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Submission</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                  <p className="text-xs font-semibold text-[#16A34A]">
                    Reviewed · Score: {activeItem.marks}/100 ({activeItem.status.replace('_', ' ')})
                  </p>
                  <p className="text-sm text-[#0F172A]">{activeItem.feedback}</p>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-[#64748B]">No submissions in this queue.</Card>
          )}
        </div>
      </div>
    </div>
  );
};
