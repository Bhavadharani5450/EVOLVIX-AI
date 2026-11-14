import React, { useCallback, useEffect, useState } from 'react';
import { Filter, Sparkles } from 'lucide-react';
import {
  Card,
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  PageHeader,
  ProgressBar,
  StatCard,
  StatusLabel,
} from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import type { InstitutionIntelligenceReport } from '../../types/careerIntelligence';

export const UniversityCareerAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { apiFetch } = useAppData();

  const instId = user?.institutionId ?? 'inst-pacific';
  const [departmentId, setDepartmentId] = useState('ALL');
  const [programmeId, setProgrammeId] = useState('ALL');
  const [batchId, setBatchId] = useState('ALL');
  const [academicYear, setAcademicYear] = useState('ALL');
  const [report, setReport] = useState<InstitutionIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        institutionId: instId,
        departmentId,
        programmeId,
        batchId,
        academicYear,
      });
      const data = await apiFetch<InstitutionIntelligenceReport>(`/api/career-intelligence/institution?${qs.toString()}`);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load institution career intelligence.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, instId, departmentId, programmeId, batchId, academicYear]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const resetFilters = () => {
    setDepartmentId('ALL');
    setProgrammeId('ALL');
    setBatchId('ALL');
    setAcademicYear('ALL');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution Career Intelligence"
        subtitle="Career preferences vs. suitability distribution, department & programme skill gaps, industry readiness, and training recommendations."
        actions={
          <button
            type="button"
            onClick={resetFilters}
            className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            Reset Filters
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={fetchAnalytics} />}

      {/* Multi-Dimensional Academic Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-3">
          <Filter className="w-3.5 h-3.5 text-[#4F46E5]" />
          <span>Filter Institution Intelligence ({report?.scope.institutionName ?? user?.institutionName})</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            aria-label="Filter by department"
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setProgrammeId('ALL');
            }}
            className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A]"
          >
            <option value="ALL">All Departments</option>
            {report?.filterOptions.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by programme"
            value={programmeId}
            onChange={(e) => setProgrammeId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A]"
          >
            <option value="ALL">All Programmes</option>
            {report?.filterOptions.programmes
              .filter((p) => departmentId === 'ALL' || p.departmentId === departmentId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.level})
                </option>
              ))}
          </select>

          <select
            aria-label="Filter by batch"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A]"
          >
            <option value="ALL">All Batches</option>
            {report?.filterOptions.batches
              .filter((b) => programmeId === 'ALL' || b.programmeId === programmeId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>

          <select
            aria-label="Filter by academic year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A]"
          >
            <option value="ALL">All Academic Years</option>
            {report?.filterOptions.academicYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading && !report ? (
        <LoadingSkeleton rows={5} />
      ) : report && report.kpis.totalStudents === 0 ? (
        <EmptyState
          title="No students match selected academic filters"
          description="Try widening your department, programme, batch, or academic year filter."
          actionLabel="Reset Filters"
          onAction={resetFilters}
        />
      ) : (
        report && (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Filtered Students Analyzed"
                value={`${report.kpis.analyzedStudents} / ${report.kpis.totalStudents}`}
                helper={`${report.kpis.crossDepartmentMatchesCount} cross-department matches`}
                tone="brand"
              />
              <StatCard
                label="Average Career Suitability"
                value={`${report.kpis.avgTopSuitabilityScore}%`}
                helper="Multi-factor fit score"
              />
              <StatCard
                label="Average Industry Readiness"
                value={`${report.kpis.avgReadinessScore}%`}
                helper={`${report.kpis.industryReadyPct}% at ≥75% threshold`}
                tone="success"
              />
              <StatCard
                label="Top Common Missing Skill"
                value={report.commonMissingSkills[0]?.skillName ?? 'Balanced'}
                helper={
                  report.commonMissingSkills[0]
                    ? `Avg gap -${report.commonMissingSkills[0].avgGapPoints}% (${report.commonMissingSkills[0].affectedStudents} students)`
                    : 'No systemic gaps detected'
                }
                tone="warning"
              />
            </div>

            {/* Preference Distribution vs. Suitability Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-6 p-6 space-y-4">
                <h2 className="text-base font-semibold text-[#0F172A]">Career Suitability Distribution (AI-Matched #1)</h2>
                <div className="space-y-3.5">
                  {report.careerSuitabilityDistribution.map((c) => (
                    <div key={c.career} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#0F172A]">{c.career}</span>
                        <span className="font-mono tabular-nums text-[#64748B]">
                          {c.count} students · {c.avgSuitability}% fit · {c.avgReadiness}% ready
                        </span>
                      </div>
                      <ProgressBar value={c.avgSuitability} tone="brand" />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="lg:col-span-6 p-6 space-y-4">
                <h2 className="text-base font-semibold text-[#0F172A]">Career Preference Distribution (Student Goals)</h2>
                <div className="space-y-3.5">
                  {report.careerPreferenceDistribution.map((p) => (
                    <div key={p.career} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#0F172A]">{p.career}</span>
                        <span className="font-mono tabular-nums text-[#64748B]">
                          {p.count} selections ({p.sharePct}%)
                        </span>
                      </div>
                      <ProgressBar value={p.sharePct} tone="accent" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Department Breakdown + Common Missing Skills */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-6 p-6 space-y-4">
                <h2 className="text-base font-semibold text-[#0F172A]">Department & Programme Readiness</h2>
                <div className="space-y-3">
                  {report.departmentBreakdown.map((d) => (
                    <div key={d.departmentId} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0F172A]">
                          {d.departmentName} ({d.studentCount} students)
                        </span>
                        <span className="font-mono tabular-nums text-[#4F46E5] font-semibold">
                          {d.avgReadiness}% ready · Top gap: {d.topGapSkill}
                        </span>
                      </div>
                      <ProgressBar value={d.avgReadiness} tone={d.avgReadiness >= 75 ? 'success' : 'brand'} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="lg:col-span-6 p-6 space-y-4">
                <h2 className="text-base font-semibold text-[#0F172A]">Common Missing Skills Across Filtered Cohort</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                        <th className="py-2 pr-4">Skill</th>
                        <th className="py-2 pr-4">Category</th>
                        <th className="py-2 pr-4 text-right">Students</th>
                        <th className="py-2 text-right">Avg Gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-sm">
                      {report.commonMissingSkills.slice(0, 6).map((sk) => (
                        <tr key={sk.skillId}>
                          <td className="py-2.5 pr-4 font-medium text-[#0F172A]">{sk.skillName}</td>
                          <td className="py-2.5 pr-4 text-xs text-[#64748B]">{sk.category}</td>
                          <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[#0F172A]">
                            {sk.affectedStudents}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-[#D97706]">
                            -{sk.avgGapPoints}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Training Recommendations */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4F46E5]" />
                <h2 className="text-base font-semibold text-[#0F172A]">Evidence-Based Institutional Training Recommendations</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.trainingRecommendations.map((tr) => (
                  <div key={tr.id} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0F172A]">{tr.title}</p>
                      <StatusLabel
                        tone={tr.priority === 'Critical' ? 'error' : tr.priority === 'High' ? 'warning' : 'info'}
                        text={`${tr.priority} Priority`}
                      />
                    </div>
                    <p className="text-xs text-[#64748B]">
                      {tr.recommendedFormat} · Target: {tr.targetDepartments.join(', ')}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#16A34A] font-medium">
                      Affects {tr.affectedLearners} learners · Est. +{tr.expectedReadinessLiftPts}% readiness lift
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )
      )}
    </div>
  );
};
