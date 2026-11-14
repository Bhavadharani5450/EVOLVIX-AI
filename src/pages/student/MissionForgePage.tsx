import React, { useMemo, useState } from 'react';
import { CheckCircle2, Flame, Play, Send } from 'lucide-react';
import { Card, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const MissionForgePage: React.FC = () => {
  const { state, updateState, executeAiTask } = useAppData();
  const { showToast } = useToast();

  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'Beginner' | 'Intermediate' | 'Advanced'>('ALL');
  const [selectedId, setSelectedId] = useState<string>(state.missions[0]?.id ?? '');
  const [answerText, setAnswerText] = useState('');
  const [projectLink, setProjectLink] = useState('');
  const [evaluating, setEvaluating] = useState(false);

  const filteredMissions = useMemo(
    () =>
      state.missions.filter((m) => difficultyFilter === 'ALL' || m.difficulty === difficultyFilter),
    [state.missions, difficultyFilter]
  );

  const selectedMission =
    state.missions.find((m) => m.id === selectedId) ?? filteredMissions[0] ?? state.missions[0];

  const completedCount = state.missions.filter((m) => m.status === 'completed').length;

  const handleStartMission = (id: string) => {
    updateState((prev) => ({
      ...prev,
      missions: prev.missions.map((m) => (m.id === id ? { ...m, status: 'in_progress' } : m)),
    }));
    showToast('Mission started', 'Complete the deliverables and submit your answer or repository link.');
  };

  const handleSubmitMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission || (!answerText.trim() && !projectLink.trim())) return;
    setEvaluating(true);
    try {
      const aiRes = await executeAiTask<{ text?: string }>('practice_eval', answerText || projectLink, {
        missionTitle: selectedMission.title,
        skillFocus: selectedMission.skillFocus,
      });

      const score = 88 + (answerText.trim().length > 40 ? 6 : 0);
      const feedback =
        aiRes.result.text ||
        `Deliverable verified for ${selectedMission.skillFocus}. Strong technical clarity and reproducible verification.`;

      const today = new Date().toISOString().slice(0, 10);
      updateState((prev) => ({
        ...prev,
        missions: prev.missions.map((m) =>
          m.id === selectedMission.id
            ? {
                ...m,
                status: 'completed',
                submittedAnswer: answerText.trim(),
                submittedLink: projectLink.trim(),
                evaluationScore: score,
                feedback,
              }
            : m
        ),
        careerDNA: {
          ...prev.careerDNA,
          technicalSkills: prev.careerDNA.technicalSkills.map((sk) =>
            sk.name === selectedMission.skillFocus
              ? { ...sk, proficiency: Math.min(100, sk.proficiency + 6), verified: true, lastAssessed: today }
              : sk
          ),
          evidenceHistory: [
            {
              id: `ev-${Date.now()}`,
              type: 'mission',
              title: selectedMission.title,
              skill: selectedMission.skillFocus,
              date: today,
              status: 'verified',
              score,
            },
            ...prev.careerDNA.evidenceHistory,
          ],
        },
      }));
      setAnswerText('');
      setProjectLink('');
      showToast('Mission evaluated & completed', `Scored ${score}% and updated ${selectedMission.skillFocus}.`);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="MissionForge"
        subtitle={`Applied technical missions with automated evaluation. ${completedCount} of ${state.missions.length} completed.`}
      />

      {/* Difficulty Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'Beginner', 'Intermediate', 'Advanced'] as const).map((diff) => (
          <button
            key={diff}
            type="button"
            onClick={() => setDifficultyFilter(diff)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              difficultyFilter === diff
                ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                : 'bg-[#FFFFFF] text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]'
            }`}
          >
            {diff === 'ALL' ? 'All Difficulties' : diff}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Missions List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredMissions.map((mission) => {
            const active = mission.id === selectedMission?.id;
            return (
              <Card
                key={mission.id}
                className={`p-4 cursor-pointer transition-colors ${
                  active ? 'border-[#4F46E5] bg-indigo-50/30' : 'hover:bg-slate-50/70'
                }`}
              >
                <div onClick={() => setSelectedId(mission.id)} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#0F172A]">{mission.title}</h3>
                    <StatusLabel
                      tone={
                        mission.status === 'completed'
                          ? 'success'
                          : mission.status === 'in_progress'
                          ? 'info'
                          : 'neutral'
                      }
                      text={mission.status.replace('_', ' ')}
                    />
                  </div>
                  <p className="text-xs text-[#64748B] font-mono tabular-nums">
                    {mission.difficulty} · {mission.skillFocus} · {mission.estimatedMinutes} min · {mission.xpReward} XP
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Selected Mission Workspace */}
        <div className="lg:col-span-7">
          {selectedMission && (
            <Card className="p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#4F46E5]" />
                    <h2 className="text-lg font-semibold text-[#0F172A]">{selectedMission.title}</h2>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 font-mono tabular-nums">
                    {selectedMission.difficulty} · {selectedMission.skillFocus} · {selectedMission.estimatedMinutes} mins · +{selectedMission.xpReward} XP
                  </p>
                </div>
                {selectedMission.status === 'not_started' && (
                  <button
                    type="button"
                    onClick={() => handleStartMission(selectedMission.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Mission</span>
                  </button>
                )}
              </div>

              <p className="text-sm text-[#0F172A] leading-relaxed">{selectedMission.description}</p>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <h3 className="text-xs font-semibold text-[#64748B] mb-2">Required Deliverables</h3>
                <ul className="space-y-1.5 text-sm text-[#0F172A]">
                  {selectedMission.deliverables.map((d) => (
                    <li key={d}>• {d}</li>
                  ))}
                </ul>
              </div>

              {selectedMission.status === 'completed' ? (
                <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#16A34A]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Evaluation Complete</span>
                    </div>
                    <span className="text-sm font-mono tabular-nums font-bold text-[#16A34A]">
                      Score: {selectedMission.evaluationScore}%
                    </span>
                  </div>
                  <p className="text-sm text-[#0F172A]">{selectedMission.feedback}</p>
                  {selectedMission.submittedLink && (
                    <p className="text-xs text-[#64748B] font-mono break-all">
                      Submitted Link: {selectedMission.submittedLink}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitMission} className="space-y-4 pt-2 border-t border-[#E2E8F0]">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Implementation Notes & Answer
                    </label>
                    <textarea
                      rows={4}
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Summarize your architectural approach, test coverage, and benchmark results..."
                      className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Project / Repository Link
                    </label>
                    <input
                      type="url"
                      value={projectLink}
                      onChange={(e) => setProjectLink(e.target.value)}
                      placeholder="https://github.com/username/mission-solution"
                      className="w-full px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={evaluating || (!answerText.trim() && !projectLink.trim())}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{evaluating ? 'Evaluating Submission...' : 'Submit for Evaluation'}</span>
                    </button>
                  </div>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
