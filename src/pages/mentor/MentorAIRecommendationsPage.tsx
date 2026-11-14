import React, { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { Card, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const MentorAIRecommendationsPage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const handleAction = (id: string, status: 'accepted' | 'rejected') => {
    const explanation = (explanations[id] ?? '').trim();
    updateState((prev) => ({
      ...prev,
      mentorAiRecommendations: prev.mentorAiRecommendations.map((rec) =>
        rec.id === id
          ? {
              ...rec,
              status,
              mentorExplanation:
                explanation ||
                (status === 'accepted'
                  ? 'Approved by mentor for student roadmap.'
                  : 'Deferred by mentor based on current sprint load.'),
            }
          : rec
      ),
    }));
    showToast(
      status === 'accepted' ? 'Recommendation accepted' : 'Recommendation rejected',
      'Decision and mentor explanation logged.'
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Recommendations"
        subtitle="Review EVOLVIX AI cohort interventions, accept or reject suggestions, and record mentor rationale."
      />

      <div className="space-y-4">
        {state.mentorAiRecommendations.map((rec) => (
          <Card key={rec.id} className="p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#4F46E5]" />
                  <h2 className="text-base font-semibold text-[#0F172A]">{rec.recommendation}</h2>
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  Learner: <strong className="text-[#0F172A]">{rec.studentName}</strong> · Priority: {rec.priority} · Generated {rec.createdAt}
                </p>
              </div>
              <StatusLabel
                tone={rec.status === 'accepted' ? 'success' : rec.status === 'rejected' ? 'error' : 'info'}
                text={rec.status === 'accepted' ? 'Accepted' : rec.status === 'rejected' ? 'Rejected' : 'Pending Review'}
              />
            </div>

            <p className="text-sm text-[#0F172A] leading-relaxed bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-xl">
              {rec.rationale}
            </p>

            {rec.status === 'pending' ? (
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <input
                  type="text"
                  value={explanations[rec.id] ?? ''}
                  onChange={(e) => setExplanations((p) => ({ ...p, [rec.id]: e.target.value }))}
                  placeholder="Add mentor explanation (optional)..."
                  className="flex-1 px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAction(rec.id, 'rejected')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-[#DC2626] hover:bg-red-100"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(rec.id, 'accepted')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#16A34A] text-white text-xs font-semibold hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#64748B]">
                Mentor Rationale: <span className="text-[#0F172A] font-medium">{rec.mentorExplanation}</span>
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
