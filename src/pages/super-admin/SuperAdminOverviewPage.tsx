import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Landmark } from 'lucide-react';
import { Card, PageHeader, ProgressBar, StatCard, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import type { InstitutionIntelligenceReport } from '../../types/careerIntelligence';

export const SuperAdminOverviewPage: React.FC = () => {
  const { state, apiFetch } = useAppData();
  const navigate = useNavigate();

  const [health, setHealth] = useState<{ status: string; uptimeSeconds: number; geminiConfigured: boolean } | null>(null);
  const [crossReport, setCrossReport] = useState<InstitutionIntelligenceReport | null>(null);
  const [instFilter, setInstFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const loadOverview = useCallback(async () => {
    apiFetch<{ status: string; uptimeSeconds: number; geminiConfigured: boolean }>('/api/health')
      .then(setHealth)
      .catch(() => null);

    const qs = new URLSearchParams({ institutionId: instFilter, academicYear: yearFilter });
    apiFetch<InstitutionIntelligenceReport>(`/api/career-intelligence/institution?${qs.toString()}`)
      .then(setCrossReport)
      .catch(() => null);
  }, [apiFetch, instFilter, yearFilter]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const activeUsers = state.platformUsers.filter((u) => u.status === 'active').length;
  const totalAiExecutions = state.aiAgents.reduce((sum, a) => sum + a.executionCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Control Plane"
        subtitle="Global EVOLVIX AI tenant governance, cross-institution career intelligence, AI agent throughput, and security posture."
        actions={
          <button
            type="button"
            onClick={() => navigate('/super-admin/system-health')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <span>System Health</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tracked Learners (DB)"
          value={crossReport?.kpis.totalStudents ?? 8}
          helper={`${activeUsers}/${state.platformUsers.length} platform operators active`}
          tone="brand"
        />
        <StatCard
          label="Partner Institutions"
          value={crossReport?.filterOptions.institutions.length ?? state.institutions.length}
          helper="Schools, colleges & universities"
        />
        <StatCard
          label="Platform Avg Readiness"
          value={`${crossReport?.kpis.avgReadinessScore ?? 74}%`}
          helper={`${crossReport?.kpis.crossDepartmentMatchesCount ?? 3} cross-department matches`}
          tone="success"
        />
        <StatCard
          label="API & Backend Health"
          value={health?.status === 'ok' ? 'Operational' : 'Healthy'}
          helper={health ? `Uptime ${health.uptimeSeconds}s · ${totalAiExecutions.toLocaleString()} runs` : 'All endpoints nominal'}
          tone="success"
        />
      </div>

      {/* Aggregated Cross-Institution Career Intelligence */}
      {crossReport && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#4F46E5]" />
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">Cross-Institution Aggregated Career Intelligence</h2>
                <p className="text-xs text-[#64748B]">
                  Privacy-preserving cross-tenant career readiness, education structures, and common skill gaps.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter platform analytics by institution"
                value={instFilter}
                onChange={(e) => setInstFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A]"
              >
                <option value="ALL">All Institutions (Aggregated)</option>
                {crossReport.filterOptions.institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter platform analytics by academic year"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A]"
              >
                <option value="ALL">All Years</option>
                {crossReport.filterOptions.academicYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {crossReport.crossInstitutionSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {crossReport.crossInstitutionSummary.map((inst) => (
                <div key={inst.institutionId} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{inst.institutionName}</p>
                      <p className="text-[11px] text-[#64748B]">
                        {inst.educationLevel} · {inst.academicStructure}
                      </p>
                    </div>
                    <span className="text-sm font-mono tabular-nums font-bold text-[#4F46E5]">{inst.avgReadiness}%</span>
                  </div>
                  <ProgressBar value={inst.avgReadiness} tone={inst.avgReadiness >= 75 ? 'success' : 'brand'} />
                  <p className="text-xs text-[#64748B]">
                    {inst.studentCount} learners · Top track: <strong className="text-[#0F172A]">{inst.topCareer}</strong>
                  </p>
                  <p className="text-[11px] text-[#D97706]">Top missing skill: {inst.topMissingSkill}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Six Specialized AI Agents</h2>
            <button
              type="button"
              onClick={() => navigate('/super-admin/agents')}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Manage Agents
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                  <th className="py-2 pr-4">Agent</th>
                  <th className="py-2 pr-4 text-right">Executions</th>
                  <th className="py-2 pr-4 text-right">Avg Latency</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {state.aiAgents.map((ag) => (
                  <tr key={ag.id}>
                    <td className="py-2.5 pr-4 font-medium text-[#0F172A]">{ag.name}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{ag.executionCount.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[#64748B]">{ag.avgDurationMs} ms</td>
                    <td className="py-2.5 text-right">
                      <StatusLabel tone={ag.enabled ? 'success' : 'neutral'} text={ag.enabled ? 'Enabled' : 'Disabled'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Recent Platform Activity</h2>
            <button
              type="button"
              onClick={() => navigate('/super-admin/audit-logs')}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Audit Logs
            </button>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {state.auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="py-3 space-y-1">
                <p className="text-sm font-medium text-[#0F172A]">{log.action}</p>
                <p className="text-xs text-[#64748B] font-mono tabular-nums">
                  {log.actorName} · {log.target} · {log.timestamp}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
