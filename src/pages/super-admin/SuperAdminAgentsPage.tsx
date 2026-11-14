import React from 'react';
import { Cpu } from 'lucide-react';
import { Card, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { AIAgentRecord } from '../../types/evolvix';

export const SuperAdminAgentsPage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const toggleAgent = (agent: AIAgentRecord) => {
    const nextEnabled = !agent.enabled;
    updateState((prev) => ({
      ...prev,
      aiAgents: prev.aiAgents.map((a) => (a.id === agent.id ? { ...a, enabled: nextEnabled } : a)),
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          actorName: 'Elena Vance',
          actorRole: 'super_admin',
          category: 'admin_action',
          action: `${nextEnabled ? 'Enabled' : 'Disabled'} AI agent ${agent.name}`,
          target: agent.codename,
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          ipMasked: '10.24.**.18',
        },
        ...prev.auditLogs,
      ],
    }));
    showToast(`${agent.name} ${nextEnabled ? 'enabled' : 'disabled'}`);
  };

  const updateSafetyMode = (id: string, safetyMode: AIAgentRecord['safetyMode']) => {
    updateState((prev) => ({
      ...prev,
      aiAgents: prev.aiAgents.map((a) => (a.id === id ? { ...a, safetyMode } : a)),
    }));
    showToast('Agent safety control updated');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Agent Control"
        subtitle="Monitor execution counts, latency, failure rates, and operational safety controls for all six EVOLVIX AI agents."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {state.aiAgents.map((agent) => (
          <Card key={agent.id} className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">{agent.name}</h2>
                  <p className="text-xs font-mono text-[#64748B]">
                    {agent.codename} · {agent.model}
                  </p>
                </div>
              </div>
              <StatusLabel tone={agent.enabled ? 'success' : 'error'} text={agent.enabled ? 'Enabled' : 'Disabled'} />
            </div>

            <p className="text-sm text-[#64748B]">{agent.purpose}</p>

            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
              <div>
                <p className="text-[11px] text-[#64748B]">Executions</p>
                <p className="text-sm font-bold font-mono tabular-nums text-[#0F172A]">
                  {agent.executionCount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#64748B]">Avg Duration</p>
                <p className="text-sm font-bold font-mono tabular-nums text-[#0F172A]">{agent.avgDurationMs} ms</p>
              </div>
              <div>
                <p className="text-[11px] text-[#64748B]">Failure Rate</p>
                <p
                  className={`text-sm font-bold font-mono tabular-nums ${
                    agent.failureRatePct > 1 ? 'text-[#DC2626]' : 'text-[#16A34A]'
                  }`}
                >
                  {agent.failureRatePct}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#64748B]">Guardrail:</span>
                <select
                  aria-label={`Safety mode for ${agent.name}`}
                  value={agent.safetyMode}
                  onChange={(e) => updateSafetyMode(agent.id, e.target.value as AIAgentRecord['safetyMode'])}
                  className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium"
                >
                  <option value="strict">Strict Policy</option>
                  <option value="balanced">Balanced</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => toggleAgent(agent)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  agent.enabled
                    ? 'border-red-200 bg-red-50 text-[#DC2626] hover:bg-red-100'
                    : 'border-emerald-200 bg-emerald-50 text-[#16A34A] hover:bg-emerald-100'
                }`}
              >
                {agent.enabled ? 'Disable Agent' : 'Enable Agent'}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
