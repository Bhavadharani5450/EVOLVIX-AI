import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Bookmark,
  Bot,
  Check,
  History,
  RefreshCw,
  Route,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  ErrorBanner,
  LoadingSkeleton,
  Modal,
  PageHeader,
  ProgressBar,
  StatusLabel,
} from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { CareerRecommendationResult, FullStudentCareerAnalysis } from '../../types/careerIntelligence';

export const PathfinderPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState, apiFetch } = useAppData();
  const { showToast } = useToast();

  const studentId = user?.role === 'student' ? user.id : 'stu-alex';

  const [analysis, setAnalysis] = useState<FullStudentCareerAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedCareerId, setSelectedCareerId] = useState<string>('');
  const [compareCareerId, setCompareCareerId] = useState<string>('');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState<{
    kind: 'skill_update' | 'assessment' | 'project' | 'goal_update';
    title: string;
    skillName: string;
    score: number;
    careerGoal: string;
  }>({
    kind: 'skill_update',
    title: 'Distributed Inference Container Lab',
    skillName: 'Docker & Kubernetes',
    score: 82,
    careerGoal: 'Applied ML Systems Engineer',
  });

  const [simBoosts, setSimBoosts] = useState<Record<string, number>>({});

  const loadAnalysis = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await apiFetch<FullStudentCareerAnalysis>(`/api/career-intelligence/student/${studentId}`);
      setAnalysis(data);
      if (data.topRecommendations.length > 0) {
        setSelectedCareerId((prev) => prev || data.topRecommendations[0].careerRoleId);
        setCompareCareerId((prev) => prev || data.topRecommendations[1]?.careerRoleId || data.topRecommendations[0].careerRoleId);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load AI career analysis.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, studentId]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  const handleRunReanalysis = async (reason = 'Manual 6-Agent Career Intelligence Re-Analysis') => {
    setAnalyzing(true);
    try {
      const data = await apiFetch<FullStudentCareerAnalysis>(`/api/career-intelligence/student/${studentId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({ triggerReason: reason, useGeminiNarrative: true }),
      });
      setAnalysis(data);
      showToast('6-Agent Analysis Complete', `Top match: ${data.topRecommendations[0]?.title} (${data.topRecommendations[0]?.suitabilityScore}% suitability).`, 'success');
    } catch (err) {
      showToast('Analysis failed', err instanceof Error ? err.message : 'Error running orchestrator', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    try {
      const payload =
        evidenceForm.kind === 'skill_update'
          ? { kind: 'skill_update', skillName: evidenceForm.skillName, proficiency: evidenceForm.score, triggerReanalysis: true }
          : evidenceForm.kind === 'assessment'
          ? {
              kind: 'assessment',
              title: evidenceForm.title,
              skillName: evidenceForm.skillName,
              assessmentScore: evidenceForm.score,
              triggerReanalysis: true,
            }
          : evidenceForm.kind === 'project'
          ? {
              kind: 'project',
              title: evidenceForm.title,
              skillName: evidenceForm.skillName,
              projectSummary: 'Submitted verified technical capstone evidence.',
              triggerReanalysis: true,
            }
          : { kind: 'goal_update', careerGoal: evidenceForm.careerGoal, triggerReanalysis: true };

      const res = await apiFetch<{ updated: boolean; reason: string; analysis?: FullStudentCareerAnalysis }>(
        `/api/career-intelligence/student/${studentId}/evidence`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      if (res.analysis) setAnalysis(res.analysis);
      setEvidenceOpen(false);
      showToast('Adaptive Re-Analysis Triggered', res.reason, 'success');
    } catch (err) {
      showToast('Submission failed', err instanceof Error ? err.message : 'Could not update evidence', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const allEvaluated = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.topRecommendations, ...analysis.alternativeOptions];
  }, [analysis]);

  const selectedCareer: CareerRecommendationResult | undefined =
    allEvaluated.find((c) => c.careerRoleId === selectedCareerId) ?? allEvaluated[0];

  const comparedCareer: CareerRecommendationResult | undefined =
    allEvaluated.find((c) => c.careerRoleId === compareCareerId) ?? allEvaluated[1] ?? allEvaluated[0];

  const handleSelectTarget = (career: CareerRecommendationResult) => {
    updateState((prev) => ({
      ...prev,
      careerDNA: {
        ...prev.careerDNA,
        targetCareerId: career.careerRoleId,
        targetCareerTitle: career.title,
      },
    }));
    showToast('Target career selected', `${career.title} set as active learning goal.`);
  };

  const handleToggleSave = (title: string) => {
    updateState((prev) => ({
      ...prev,
      careerOptions: prev.careerOptions.map((c) => (c.title === title ? { ...c, saved: !c.saved } : c)),
    }));
  };

  const uniqueSelectedSkills = useMemo(() => {
    if (!selectedCareer) return [];
    const map = new Map<string, { skillId: string; name: string; current: number; required: number }>();
    for (const sk of [...selectedCareer.missingSkills, ...selectedCareer.existingSkills]) {
      if (!map.has(sk.skillId)) {
        map.set(sk.skillId, sk);
      }
    }
    return Array.from(map.values());
  }, [selectedCareer]);

  const simulatedReadiness = useMemo(() => {
    if (!selectedCareer) return 0;
    if (uniqueSelectedSkills.length === 0) return selectedCareer.readinessScore;
    const total = uniqueSelectedSkills.reduce((sum, r) => {
      const boosted = Math.min(100, r.current + (simBoosts[r.name] ?? 0));
      return sum + Math.min(100, (boosted / Math.max(1, r.required)) * 100);
    }, 0);
    return Math.round(total / uniqueSelectedSkills.length);
  }, [selectedCareer, uniqueSelectedSkills, simBoosts]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pathfinder AI" subtitle="Loading 6-agent cross-department career intelligence..." />
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pathfinder AI · Career Intelligence"
        subtitle="Cross-department Top 5 recommendations, deterministic suitability math, 6-agent evaluations, and adaptive career history."
        actions={
          <>
            <button
              type="button"
              onClick={() => setEvidenceOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              <Sparkles className="w-4 h-4 text-[#7C3AED]" />
              <span>Log Evidence & Re-Analyze</span>
            </button>
            <button
              type="button"
              disabled={analyzing}
              onClick={() => handleRunReanalysis('Manual 6-Agent Career Intelligence Run')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'Orchestrating 6 Agents...' : 'Run 6-Agent Analysis'}</span>
            </button>
          </>
        }
      />

      {loadError && <ErrorBanner message={loadError} onRetry={loadAnalysis} />}

      {analysis && (
        <>
          {/* Missing assessment warning — transparent, never fabricated */}
          {analysis.overallReadiness.warning && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
              <div className="text-sm text-[#0F172A]">
                <p className="font-semibold text-[#D97706]">Assessment Evidence Missing</p>
                <p className="text-xs text-[#64748B] mt-0.5">{analysis.overallReadiness.warning}</p>
              </div>
            </div>
          )}

          {/* Cross-Department Assurance & Overall Readiness Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5">
              <p className="text-xs font-medium text-[#64748B]">Top Matched Career (#1)</p>
              <p className="text-base font-bold text-[#4F46E5] mt-1">{analysis.topRecommendations[0]?.title}</p>
              <p className="text-xs text-[#64748B] mt-1">
                {analysis.topRecommendations[0]?.suitabilityScore}% Suitability · Dept: {analysis.student.departmentName}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-[#64748B]">Career Readiness Tier</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
                {analysis.overallReadiness.score}%
              </p>
              <p className="text-xs text-[#16A34A] font-medium mt-1">{analysis.overallReadiness.tier}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-[#64748B]">Verified Evidence Signals</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
                {analysis.assessmentsCount} / {analysis.projectsCount}
              </p>
              <p className="text-xs text-[#64748B] mt-1">Assessments · Portfolio Projects</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-[#64748B]">Policy Scope</p>
              <p className="text-sm font-bold text-[#0F172A] mt-1.5">Cross-Department Open</p>
              <p className="text-xs text-[#64748B] mt-1">6 Agents Validated · {analysis.analysisHistory.length} runs</p>
            </Card>
          </div>

          {/* Top 5 Career Recommendations Table */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">Top 5 AI Career Recommendations</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Scored deterministically across skills (45%), practical assessments (25%), evidence (15%), and interests/goals (15%) — unrestricted by academic department.
                </p>
              </div>
              <span className="text-xs font-mono text-[#64748B]">Click row to inspect full breakdown</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                    <th className="py-2.5 pr-3">Rank</th>
                    <th className="py-2.5 pr-4">Career Path</th>
                    <th className="py-2.5 pr-4">Domain</th>
                    <th className="py-2.5 pr-4 text-right">Suitability</th>
                    <th className="py-2.5 pr-4 text-right">Readiness</th>
                    <th className="py-2.5 pr-4 text-right">Est. Time</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm">
                  {analysis.topRecommendations.map((opt) => {
                    const isSelected = opt.careerRoleId === selectedCareer?.careerRoleId;
                    const isTarget =
                      opt.title === state.careerDNA.targetCareerTitle || opt.careerRoleId === state.careerDNA.targetCareerId;
                    const isSaved = state.careerOptions.find((c) => c.title === opt.title)?.saved ?? false;
                    return (
                      <tr
                        key={opt.careerRoleId}
                        onClick={() => setSelectedCareerId(opt.careerRoleId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/60' : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <td className="py-3.5 pr-3 font-mono tabular-nums font-bold text-[#4F46E5]">#{opt.rank}</td>
                        <td className="py-3.5 pr-4">
                          <p className="font-semibold text-[#0F172A]">{opt.title}</p>
                          <p className="text-xs text-[#64748B]">{opt.growthOutlook}</p>
                        </td>
                        <td className="py-3.5 pr-4 text-[#64748B]">{opt.domain}</td>
                        <td className="py-3.5 pr-4 text-right font-mono tabular-nums font-bold text-[#4F46E5]">
                          {opt.suitabilityScore}%
                        </td>
                        <td className="py-3.5 pr-4 text-right font-mono tabular-nums text-[#0F172A]">
                          {opt.readinessScore}%
                        </td>
                        <td className="py-3.5 pr-4 text-right font-mono tabular-nums text-[#64748B]">
                          {opt.medianWeeksToReady} wks
                        </td>
                        <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleSave(opt.title)}
                              aria-label={`Save ${opt.title}`}
                              className={`p-1.5 rounded-lg border text-xs ${
                                isSaved
                                  ? 'border-indigo-300 bg-indigo-50 text-[#4F46E5]'
                                  : 'border-[#E2E8F0] bg-white text-[#64748B]'
                              }`}
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectTarget(opt)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                isTarget
                                  ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                                  : 'bg-[#4F46E5] text-white hover:bg-indigo-700'
                              }`}
                            >
                              {isTarget ? 'Active Target' : 'Select Target'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Alternative Career Options */}
            {analysis.alternativeOptions.length > 0 && (
              <div className="pt-4 border-t border-[#E2E8F0]">
                <h3 className="text-xs font-semibold text-[#64748B] mb-2.5">Alternative Career Options (Adjacent Trajectories)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.alternativeOptions.map((alt) => (
                    <div
                      key={alt.careerRoleId}
                      onClick={() => setSelectedCareerId(alt.careerRoleId)}
                      className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-indigo-300 cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">
                          #{alt.rank} {alt.title}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {alt.domain} · {alt.growthOutlook}
                        </p>
                      </div>
                      <span className="text-sm font-mono tabular-nums font-bold text-[#4F46E5]">{alt.suitabilityScore}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Selected Recommendation Transparency + Career What-If Simulator */}
          {selectedCareer && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-7 p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Route className="w-4 h-4 text-[#4F46E5]" />
                      <h2 className="text-base font-semibold text-[#0F172A]">
                        #{selectedCareer.rank} {selectedCareer.title} — Evidence Breakdown
                      </h2>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">{selectedCareer.domain} · {selectedCareer.growthOutlook}</p>
                  </div>
                  <StatusLabel tone="info" text={`${selectedCareer.suitabilityScore}% Suitability`} />
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <p className="text-xs font-semibold text-[#0F172A]">AI Recommendation Explanation</p>
                  <p className="text-sm text-[#0F172A] leading-relaxed">{selectedCareer.explanation}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E2E8F0] text-xs font-mono tabular-nums">
                    <div>
                      <span className="text-[#64748B]">Skills (45%):</span>{' '}
                      <strong className="text-[#0F172A]">{selectedCareer.scoreBreakdown.skillAlignment}%</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Assessments (25%):</span>{' '}
                      <strong className="text-[#0F172A]">{selectedCareer.scoreBreakdown.assessmentPerformance}%</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Evidence (15%):</span>{' '}
                      <strong className="text-[#0F172A]">{selectedCareer.scoreBreakdown.evidenceAndProjects}%</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Goals/Interests (15%):</span>{' '}
                      <strong className="text-[#0F172A]">{selectedCareer.scoreBreakdown.interestAndGoalFit}%</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                    <h3 className="text-xs font-semibold text-[#16A34A]">Existing Skills & Strengths</h3>
                    {selectedCareer.existingSkills.length > 0 ? (
                      <ul className="space-y-1.5 text-xs">
                        {selectedCareer.existingSkills.map((s) => (
                          <li key={s.skillId} className="flex justify-between">
                            <span className="font-medium text-[#0F172A]">{s.name}</span>
                            <span className="font-mono tabular-nums text-[#16A34A]">
                              {s.current}% / {s.required}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#64748B]">No benchmarked threshold met yet; foundational potential detected.</p>
                    )}
                    <div className="pt-2 border-t border-[#E2E8F0] space-y-1">
                      {selectedCareer.strengths.map((str) => (
                        <p key={str} className="text-xs text-[#64748B] flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                          <span>{str}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                    <h3 className="text-xs font-semibold text-[#D97706]">Missing Skills & Improvement Areas</h3>
                    {selectedCareer.missingSkills.length > 0 ? (
                      <ul className="space-y-1.5 text-xs">
                        {selectedCareer.missingSkills.map((g) => (
                          <li key={g.skillId} className="flex justify-between">
                            <span className="font-medium text-[#0F172A]">
                              {g.name} ({g.priority})
                            </span>
                            <span className="font-mono tabular-nums text-[#D97706]">-{g.gapPoints}% gap</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#16A34A]">All required competency thresholds met.</p>
                    )}
                    <div className="pt-2 border-t border-[#E2E8F0] space-y-1">
                      {selectedCareer.improvementAreas.map((imp) => (
                        <p key={imp} className="text-xs text-[#64748B]">
                          • {imp}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* What-If Simulator */}
              <Card className="lg:col-span-5 p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#7C3AED]" />
                      <h2 className="text-base font-semibold text-[#0F172A]">What-If Readiness Simulator</h2>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">Simulate lifting missing skills for {selectedCareer.title}.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#64748B]">Simulated</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-[#4F46E5]">{simulatedReadiness}%</p>
                  </div>
                </div>

                <ProgressBar value={simulatedReadiness} tone={simulatedReadiness >= 82 ? 'success' : 'brand'} />

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {uniqueSelectedSkills.slice(0, 5).map((sk) => {
                    const boost = simBoosts[sk.name] ?? 0;
                    const projected = Math.min(100, sk.current + boost);
                    return (
                      <div key={sk.skillId} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-[#0F172A]">{sk.name}</span>
                          <span className="font-mono tabular-nums text-[#64748B]">
                            {sk.current}% + {boost}% = <strong className="text-[#0F172A]">{projected}%</strong> (Req {sk.required}%)
                          </span>
                        </div>
                        <input
                          type="range"
                          aria-label={`Simulate boost for ${sk.name}`}
                          min={0}
                          max={40}
                          value={boost}
                          onChange={(e) => setSimBoosts((prev) => ({ ...prev, [sk.name]: Number(e.target.value) }))}
                          className="w-full accent-[#7C3AED]"
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Side-by-Side Career Path Comparison */}
          {selectedCareer && comparedCareer && (
            <Card className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-[#4F46E5]" />
                  <h2 className="text-base font-semibold text-[#0F172A]">Side-by-Side Career Path Comparison</h2>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#64748B]">Compare {selectedCareer.title} vs:</span>
                  <select
                    aria-label="Compare against career"
                    value={comparedCareer.careerRoleId}
                    onChange={(e) => setCompareCareerId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A]"
                  >
                    {allEvaluated.map((c) => (
                      <option key={c.careerRoleId} value={c.careerRoleId}>
                        #{c.rank} {c.title} ({c.suitabilityScore}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[selectedCareer, comparedCareer].map((c, idx) => (
                  <div key={`${c.careerRoleId}-${idx}`} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#0F172A]">
                        #{c.rank} {c.title}
                      </p>
                      <span className="font-mono tabular-nums text-sm font-bold text-[#4F46E5]">{c.suitabilityScore}% fit</span>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      {c.domain} · Readiness {c.readinessScore}% · ~{c.medianWeeksToReady} wks to target
                    </p>
                    <p className="text-xs text-[#0F172A]">
                      <strong>Top Gaps:</strong>{' '}
                      {c.missingSkills.slice(0, 3).map((m) => `${m.name} (-${m.gapPoints}%)`).join(', ') || 'None'}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Personalized Learning Roadmap & Recommended Projects/Missions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {analysis.learningRoadmap && (
              <Card className="lg:col-span-6 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#0F172A]">{analysis.learningRoadmap.title}</h2>
                  <span className="text-xs font-mono tabular-nums text-[#64748B]">
                    {analysis.learningRoadmap.totalEstimatedHours} hrs est.
                  </span>
                </div>
                <div className="space-y-2.5">
                  {analysis.learningRoadmap.tasks.map((t) => (
                    <div key={t.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#0F172A]">{t.title}</p>
                        <p className="text-[11px] text-[#64748B]">
                          Stage {t.stageNumber}: {t.stageTitle} · {t.taskType}
                        </p>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-[#4F46E5] shrink-0">{t.estimatedHours}h</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="lg:col-span-6 p-6 space-y-4">
              <h2 className="text-base font-semibold text-[#0F172A]">Recommended Projects & Missions</h2>
              <div className="space-y-2.5">
                {analysis.recommendedProjectsAndMissions.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0F172A]">{m.title}</p>
                      <span className="text-[11px] font-mono text-[#7C3AED] font-semibold">Focus: {m.prioritySkill}</span>
                    </div>
                    <p className="text-xs text-[#64748B]">{m.summary}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Adaptive Career Analysis History (What Changed & Why) + 6-Agent Execution Trace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-6 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#4F46E5]" />
                <h2 className="text-base font-semibold text-[#0F172A]">Adaptive Analysis History (What Changed & Why)</h2>
              </div>
              <div className="space-y-3">
                {analysis.analysisHistory.map((h) => (
                  <div key={h.runId} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#0F172A]">{h.triggerReason}</span>
                      <span className="font-mono tabular-nums text-[#64748B]">{h.createdAt.slice(0, 16).replace('T', ' ')}</span>
                    </div>
                    <p className="text-xs text-[#4F46E5] font-medium">{h.whyItChanged}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-6 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#4F46E5]" />
                <h2 className="text-base font-semibold text-[#0F172A]">6-Agent Orchestrator Execution Record</h2>
              </div>
              <div className="space-y-2.5">
                {analysis.agentExecutions.map((exec) => (
                  <div key={exec.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#0F172A]">
                        {exec.agentName} <span className="font-mono text-[#64748B]">({exec.inputSchemaVersion} → {exec.outputSchemaVersion})</span>
                      </p>
                      <p className="text-[11px] text-[#64748B] truncate">{exec.task}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono tabular-nums text-[#64748B]">{exec.durationMs} ms</span>
                      <StatusLabel
                        tone={exec.validationPassed && exec.status === 'success' ? 'success' : 'warning'}
                        text={exec.validationPassed ? 'Schema Valid' : 'Fallback'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Adaptive Evidence & Re-Analysis Modal */}
      <Modal
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        title="Submit New Career Evidence & Trigger Adaptive Re-Analysis"
        subtitle="Update skills, assessments, projects, or goals to recompute suitability scores and inspect what changed."
      >
        <form onSubmit={handleSubmitEvidence} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Evidence Type</label>
            <select
              value={evidenceForm.kind}
              onChange={(e) =>
                setEvidenceForm((p) => ({
                  ...p,
                  kind: e.target.value as 'skill_update' | 'assessment' | 'project' | 'goal_update',
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              <option value="skill_update">Skill Proficiency Update</option>
              <option value="assessment">Practical Assessment Score</option>
              <option value="project">Portfolio Project Completion</option>
              <option value="goal_update">Career Goal Update</option>
            </select>
          </div>

          {evidenceForm.kind === 'goal_update' ? (
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">New Target Career Goal</label>
              <select
                value={evidenceForm.careerGoal}
                onChange={(e) => setEvidenceForm((p) => ({ ...p, careerGoal: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                {allEvaluated.map((c) => (
                  <option key={c.careerRoleId} value={c.title}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              {(evidenceForm.kind === 'assessment' || evidenceForm.kind === 'project') && (
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={evidenceForm.title}
                    onChange={(e) => setEvidenceForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Competency / Skill</label>
                <select
                  value={evidenceForm.skillName}
                  onChange={(e) => setEvidenceForm((p) => ({ ...p, skillName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                >
                  <option value="Docker & Kubernetes">Docker & Kubernetes</option>
                  <option value="Distributed Systems">Distributed Systems</option>
                  <option value="Python & PyTorch">Python & PyTorch</option>
                  <option value="TypeScript & React">TypeScript & React</option>
                  <option value="SQL & Data Modeling">SQL & Data Modeling</option>
                  <option value="Cloud Security & IAM">Cloud Security & IAM</option>
                  <option value="MLOps & Model Evaluation">MLOps & Model Evaluation</option>
                </select>
              </div>
              {evidenceForm.kind !== 'project' && (
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Verified Score / Proficiency (%)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    required
                    value={evidenceForm.score}
                    onChange={(e) => setEvidenceForm((p) => ({ ...p, score: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono tabular-nums"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEvidenceOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={analyzing}
              className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {analyzing ? 'Re-Analyzing...' : 'Submit & Re-Analyze'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
