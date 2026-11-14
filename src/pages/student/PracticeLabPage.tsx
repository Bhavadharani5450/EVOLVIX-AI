import React, { useMemo, useState } from 'react';
import { CheckCircle2, Code2 } from 'lucide-react';
import { Card, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const PracticeLabPage: React.FC = () => {
  const { state, updateState, executeAiTask } = useAppData();
  const { showToast } = useToast();

  const [kindFilter, setKindFilter] = useState<'ALL' | 'MCQ' | 'Coding' | 'Practical'>('ALL');
  const [selectedId, setSelectedId] = useState<string>(state.practiceChallenges[0]?.id ?? '');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [codeOrTextAnswer, setCodeOrTextAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const filtered = useMemo(
    () => state.practiceChallenges.filter((c) => kindFilter === 'ALL' || c.kind === kindFilter),
    [state.practiceChallenges, kindFilter]
  );

  const selected =
    state.practiceChallenges.find((c) => c.id === selectedId) ?? filtered[0] ?? state.practiceChallenges[0];

  const handleSelectChallenge = (id: string) => {
    const target = state.practiceChallenges.find((c) => c.id === id);
    setSelectedId(id);
    setSelectedOption(null);
    setCodeOrTextAnswer(target?.starterCode ?? '');
    setShowExplanation(Boolean(target?.completed));
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setEvaluating(true);
    try {
      let score = 90;
      if (selected.kind === 'MCQ') {
        if (selectedOption === null) {
          showToast('Select an option', 'Choose an answer option before submitting.', 'error');
          setEvaluating(false);
          return;
        }
        score = selectedOption === selected.correctOptionIndex ? 100 : 40;
      } else {
        if (!codeOrTextAnswer.trim()) {
          showToast('Answer required', 'Enter your code or explanation before submitting.', 'error');
          setEvaluating(false);
          return;
        }
        await executeAiTask('practice_eval', codeOrTextAnswer, { topic: selected.topic, kind: selected.kind });
        score = codeOrTextAnswer.trim().length > 30 ? 92 : 75;
      }

      const today = new Date().toISOString().slice(0, 10);
      updateState((prev) => ({
        ...prev,
        practiceChallenges: prev.practiceChallenges.map((c) =>
          c.id === selected.id
            ? { ...c, completed: true, lastScore: score, lastAttemptAt: today }
            : c
        ),
        careerDNA: {
          ...prev.careerDNA,
          evidenceHistory: [
            {
              id: `ev-pl-${Date.now()}`,
              type: 'assessment',
              title: selected.title,
              skill: selected.topic,
              date: today,
              status: score >= 75 ? 'verified' : 'needs_revision',
              score,
            },
            ...prev.careerDNA.evidenceHistory,
          ],
        },
      }));
      setShowExplanation(true);
      showToast('Assessment evaluated', `Scored ${score}% on ${selected.title}.`);
    } finally {
      setEvaluating(false);
    }
  };

  const completedHistory = state.practiceChallenges.filter((c) => c.completed);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice Lab"
        subtitle="Technical MCQs, coding challenges, and practical exercises with instant explanations and history tracking."
      />

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'MCQ', 'Coding', 'Practical'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKindFilter(k)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              kindFilter === k
                ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                : 'bg-[#FFFFFF] text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]'
            }`}
          >
            {k === 'ALL' ? 'All Exercises' : k}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Challenge Queue */}
        <div className="lg:col-span-4 space-y-3">
          {filtered.map((ch) => (
            <Card
              key={ch.id}
              className={`p-4 cursor-pointer transition-colors ${
                ch.id === selected?.id ? 'border-[#4F46E5] bg-indigo-50/30' : 'hover:bg-slate-50/70'
              }`}
            >
              <div onClick={() => handleSelectChallenge(ch.id)} className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0F172A]">{ch.title}</p>
                  <StatusLabel
                    tone={ch.completed ? 'success' : 'neutral'}
                    text={ch.completed ? `${ch.lastScore ?? 100}%` : 'Open'}
                  />
                </div>
                <p className="text-xs text-[#64748B]">
                  {ch.kind} · {ch.topic} · {ch.difficulty}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Active Exercise */}
        <div className="lg:col-span-8 space-y-6">
          {selected && (
            <Card className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#4F46E5]" />
                    <h2 className="text-base font-semibold text-[#0F172A]">{selected.title}</h2>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    {selected.kind} · {selected.topic} · {selected.difficulty}
                  </p>
                </div>
                {selected.completed && (
                  <span className="text-xs font-mono tabular-nums font-semibold text-[#16A34A]">
                    Last Score: {selected.lastScore}%
                  </span>
                )}
              </div>

              <p className="text-sm text-[#0F172A] leading-relaxed">{selected.prompt}</p>

              <form onSubmit={handleEvaluate} className="space-y-4">
                {selected.kind === 'MCQ' && selected.options ? (
                  <div className="space-y-2.5">
                    {selected.options.map((opt, idx) => (
                      <label
                        key={opt}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                          selectedOption === idx
                            ? 'border-[#4F46E5] bg-indigo-50/50'
                            : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`mcq-${selected.id}`}
                          checked={selectedOption === idx}
                          onChange={() => setSelectedOption(idx)}
                          className="mt-1 text-[#4F46E5]"
                        />
                        <span className="text-sm text-[#0F172A]">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      {selected.kind === 'Coding' ? 'Code Solution (TypeScript)' : 'Practical Architecture Response'}
                    </label>
                    <textarea
                      rows={7}
                      value={codeOrTextAnswer || selected.starterCode || ''}
                      onChange={(e) => setCodeOrTextAnswer(e.target.value)}
                      className={`w-full p-3.5 rounded-xl border border-[#E2E8F0] text-sm ${
                        selected.kind === 'Coding' ? 'font-mono bg-[#F8FAFC]' : 'bg-white'
                      }`}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowExplanation((s) => !s)}
                    className="text-xs font-medium text-[#4F46E5] hover:underline"
                  >
                    {showExplanation ? 'Hide Explanation' : 'Show Solution Explanation'}
                  </button>
                  <button
                    type="submit"
                    disabled={evaluating}
                    className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {evaluating ? 'Evaluating...' : 'Submit Answer'}
                  </button>
                </div>
              </form>

              {showExplanation && (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reference Explanation</span>
                  </div>
                  <p className="text-sm text-[#0F172A] leading-relaxed">{selected.explanation}</p>
                </div>
              )}
            </Card>
          )}

          {/* Assessment History */}
          <Card className="p-6 space-y-3">
            <h2 className="text-base font-semibold text-[#0F172A]">Assessment History</h2>
            {completedHistory.length === 0 ? (
              <p className="text-sm text-[#64748B]">No completed challenges yet.</p>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {completedHistory.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-[#0F172A]">{item.title}</p>
                      <p className="text-xs text-[#64748B]">
                        {item.kind} · {item.topic} · {item.lastAttemptAt}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-[#16A34A]">
                      {item.lastScore}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
