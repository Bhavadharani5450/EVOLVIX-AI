import React, { useEffect, useMemo, useState } from 'react';
import { Card, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';

interface DbAgentExecutionRow {
  id: string;
  analysis_run_id: string;
  student_id: string;
  agent_key: string;
  agent_name: string;
  task: string;
  input_schema_version: string;
  output_schema_version: string;
  validation_passed: number;
  source: string;
  status: 'success' | 'error';
  duration_ms: number;
  error_message: string | null;
  created_at: string;
}

export const SuperAdminAgentLogsPage: React.FC = () => {
  const { state, apiFetch } = useAppData();
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'success' | 'error'>('ALL');
  const [dbLogs, setDbLogs] = useState<DbAgentExecutionRow[]>([]);

  useEffect(() => {
    apiFetch<{ executions: DbAgentExecutionRow[] }>('/api/agents/executions')
      .then((res) => setDbLogs(res.executions ?? []))
      .catch(() => null);
  }, [apiFetch]);

  const combinedLogs = useMemo(() => {
    const mappedDb = dbLogs.map((e) => ({
      id: e.id,
      agentName: e.agent_name,
      roleContext: `run:${e.analysis_run_id.slice(-8)} · schema ${e.input_schema_version}→${e.output_schema_version}`,
      inputSummary: `${e.task} (student=${e.student_id})`,
      outputSummary: `Source: ${e.source} · Validated: ${e.validation_passed ? 'Passed' : 'Failed'}`,
      status: e.status,
      durationMs: e.duration_ms,
      timestamp: e.created_at.slice(0, 19).replace('T', ' '),
      errorDetail: e.error_message || undefined,
    }));

    const fallbackMapped = state.agentLogs.map((l) => ({
      id: l.id,
      agentName: l.agentName,
      roleContext: `role:${l.roleContext}`,
      inputSummary: l.inputSummary,
      outputSummary: l.outputSummary,
      status: l.status,
      durationMs: l.durationMs,
      timestamp: l.timestamp,
      errorDetail: l.errorDetail,
    }));

    return [...mappedDb, ...fallbackMapped];
  }, [dbLogs, state.agentLogs]);

  const agentNames = Array.from(new Set(combinedLogs.map((l) => l.agentName)));

  const filtered = useMemo(() => {
    return combinedLogs.filter((l) => {
      const matchA = agentFilter === 'ALL' || l.agentName === agentFilter;
      const matchS = statusFilter === 'ALL' || l.status === statusFilter;
      return matchA && matchS;
    });
  }, [combinedLogs, agentFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Logs"
        subtitle="Execution metadata, schema validation, latency, and error traces across all six EVOLVIX AI agents."
      />

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <select
          aria-label="Filter by AI agent"
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Agents</option>
          {agentNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by execution status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'success' | 'error')}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                <th className="py-3 px-4">Agent & Timestamp</th>
                <th className="py-3 px-4">Task & Schema</th>
                <th className="py-3 px-4">Output & Validation</th>
                <th className="py-3 px-4 text-right">Duration</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#0F172A]">{log.agentName}</p>
                    <p className="text-xs font-mono tabular-nums text-[#64748B]">
                      {log.timestamp} · {log.roleContext}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-[#64748B]">{log.inputSummary}</td>
                  <td className="py-3.5 px-4 text-xs text-[#0F172A]">
                    <p>{log.outputSummary}</p>
                    {log.errorDetail && <p className="text-[#DC2626] mt-0.5">{log.errorDetail}</p>}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#0F172A]">{log.durationMs} ms</td>
                  <td className="py-3.5 px-4 text-right">
                    <StatusLabel tone={log.status === 'success' ? 'success' : 'error'} text={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
