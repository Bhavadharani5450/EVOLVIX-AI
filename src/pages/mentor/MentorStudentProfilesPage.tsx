import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, History, RefreshCw } from 'lucide-react';
import { Card, ErrorBanner, PageHeader, ProgressBar, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { FullStudentCareerAnalysis } from '../../types/careerIntelligence';

export const MentorStudentProfilesPage: React.FC = () => {
  const { user } = useAuth();
  const { state, apiFetch } = useAppData();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const assigned = state.mentorAssignedStudents.filter((s) => s.mentorId === (user?.id ?? 'men-maya'));
  const paramId = searchParams.get('studentId');
  const [selectedId, setSelectedId] = useState<string>(paramId || assigned[0]?.id || '');
  const [authError, setAuthError] = useState<string>('');
  const [careerReport, setCareerReport] = useState<FullStudentCareerAnalysis | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    if (paramId && paramId !== selectedId) {
      setSelectedId(paramId);
    }
  }, [paramId, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setAuthError('');
    setCareerReport(null);

    apiFetch<{ authorized: boolean }>(`/api/mentor/students/${selectedId}`)
      .then(() => apiFetch<FullStudentCareerAnalysis>(`/api/career-intelligence/student/${selectedId}`))
      .then((report) => setCareerReport(report))
      .catch((err) => {
        setAuthError(err instanceof Error ? err.message : 'Unable to verify student access.');
      });
  }, [selectedId, apiFetch]);

  const handleTriggerMentorReanalysis = async () => {
    if (!selectedId) return;
    setReanalyzing(true);
    try {
      const updated = await apiFetch<FullStudentCareerAnalysis>(`/api/career-intelligence/student/${selectedId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({ triggerReason: `Mentor ${user?.name ?? 'Review'} Calibration`, useGeminiNarrative: true }),
      });
      setCareerReport(updated);
      showToast('Student career report refreshed', `${updated.student.name} re-evaluated across all 6 AI agents.`);
    } catch (err) {
      showToast('Re-analysis blocked', err instanceof Error ? err.message : 'Error refreshing report', 'error');
    } finally {
      setReanalyzing(false);
    }
  };

  const student = assigned.find((s) => s.id === selectedId) ?? (authError ? null : assigned[0]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Profiles & AI Career Reports"
        subtitle="Inspect assigned student skills, Top 5 cross-department recommendations, 6-agent evaluations, and progress."
        actions={
          <div className="flex items-center gap-2">
            <select
              aria-label="Select assigned student"
              value={student?.id ?? selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setSearchParams({ studentId: e.target.value });
              }}
              className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#0F172A]"
            >
              {assigned.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.department})
                </option>
              ))}
            </select>
            {student && !authError && (
              <button
                type="button"
                disabled={reanalyzing}
                onClick={handleTriggerMentorReanalysis}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${reanalyzing ? 'animate-spin' : ''}`} />
                <span>Refresh AI Report</span>
              </button>
            )}
          </div>
        }
      />

      {authError && <ErrorBanner message={authError} />}

      {student && !authError && (
        <>
          <Card className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">{careerReport?.student.name ?? student.name}</h2>
              <p className="text-sm text-[#64748B] mt-0.5">
                {careerReport?.student.programmeName ?? student.programme} · {careerReport?.student.batchName ?? student.batch} ·{' '}
                {careerReport?.student.email ?? student.email}
              </p>
              <p className="text-xs text-[#4F46E5] font-semibold mt-1.5">
                Top AI Match: {careerReport?.topRecommendations[0]?.title ?? student.targetCareer} (
                {careerReport?.topRecommendations[0]?.suitabilityScore ?? student.readinessScore}% suitability)
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-[#64748B]">Readiness</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#4F46E5]">
                  {careerReport?.overallReadiness.score ?? student.readinessScore}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Roadmap</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#0F172A]">{student.roadmapProgress}%</p>
              </div>
              <StatusLabel tone={student.atRisk ? 'warning' : 'success'} text={student.atRisk ? 'At Risk' : 'On Track'} />
            </div>
          </Card>

          {careerReport && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#0F172A]">Top 5 Cross-Department Career Recommendations</h3>
                <span className="text-xs font-mono text-[#64748B]">Tier: {careerReport.overallReadiness.tier}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {careerReport.topRecommendations.map((rec) => (
                  <div key={rec.careerRoleId} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#4F46E5]">#{rec.rank}</span>
                      <span className="text-xs font-mono tabular-nums font-semibold text-[#0F172A]">
                        {rec.suitabilityScore}% Suitability
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#0F172A]">{rec.title}</p>
                    <p className="text-xs text-[#64748B] line-clamp-2">{rec.explanation}</p>
                    <p className="text-[11px] text-[#D97706]">
                      Missing: {rec.missingSkills.slice(0, 2).map((m) => `${m.name} (-${m.gapPoints}%)`).join(', ') || 'None'}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-6 p-6 space-y-4">
              <h3 className="text-base font-semibold text-[#0F172A]">Competency Profile</h3>
              <div className="space-y-3.5">
                {student.skills.map((sk) => (
                  <div key={sk.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[#0F172A]">{sk.name}</span>
                      <span className="font-mono tabular-nums text-[#64748B]">
                        {sk.current}% / {sk.required}% required
                      </span>
                    </div>
                    <ProgressBar value={sk.current} max={sk.required} tone={sk.current >= sk.required ? 'success' : 'brand'} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-6 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-base font-semibold text-[#0F172A]">Adaptive Career Change Log</h3>
              </div>
              {careerReport && careerReport.analysisHistory.length > 0 ? (
                <div className="space-y-2.5">
                  {careerReport.analysisHistory.slice(0, 4).map((h) => (
                    <div key={h.runId} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <p className="text-xs font-semibold text-[#0F172A]">{h.triggerReason}</p>
                      <p className="text-xs text-[#4F46E5]">{h.whyItChanged}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {student.assessments.map((a) => (
                    <div key={a.id} className="py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-[#0F172A]">{a.title}</p>
                        <p className="text-xs text-[#64748B] font-mono tabular-nums">{a.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono tabular-nums font-semibold text-[#0F172A]">{a.score}%</p>
                        <p className="text-xs text-[#64748B]">{a.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {careerReport && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-base font-semibold text-[#0F172A]">6-Agent Evaluation Trace</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {careerReport.agentExecutions.map((ex) => (
                  <div key={ex.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#0F172A]">{ex.agentName}</span>
                      <StatusLabel tone={ex.validationPassed ? 'success' : 'warning'} text={ex.source} />
                    </div>
                    <p className="text-[11px] text-[#64748B]">{ex.task}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
