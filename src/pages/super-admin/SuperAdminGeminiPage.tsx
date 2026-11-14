import React, { useEffect, useState } from 'react';
import { Save, Sliders } from 'lucide-react';
import { Card, PageHeader, StatCard, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

interface GeminiStatusResponse {
  provider: string;
  configured: boolean;
  activeModel: string;
  allowedModels: string[];
  quotaTier: string;
  secretExposed: boolean;
}

export const SuperAdminGeminiPage: React.FC = () => {
  const { state, updateState, apiFetch } = useAppData();
  const { showToast } = useToast();

  const [status, setStatus] = useState<GeminiStatusResponse | null>(null);
  const [defaultModel, setDefaultModel] = useState(state.platformSettings.defaultGeminiModel);
  const [maxConcurrent, setMaxConcurrent] = useState(state.platformSettings.maxConcurrentAgents);

  useEffect(() => {
    apiFetch<GeminiStatusResponse>('/api/super-admin/gemini-status')
      .then(setStatus)
      .catch(() =>
        setStatus({
          provider: 'Google Gemini API (@google/genai)',
          configured: false,
          activeModel: state.platformSettings.defaultGeminiModel,
          allowedModels: state.platformSettings.allowedGeminiModels,
          quotaTier: 'Demo Simulation Mode (Managed via Server Environment)',
          secretExposed: false,
        })
      );
  }, [apiFetch, state.platformSettings.allowedGeminiModels, state.platformSettings.defaultGeminiModel]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateState((prev) => ({
      ...prev,
      platformSettings: {
        ...prev.platformSettings,
        defaultGeminiModel: defaultModel,
        maxConcurrentAgents: maxConcurrent,
      },
      aiAgents: prev.aiAgents.map((a) => ({ ...a, model: defaultModel })),
    }));
    showToast('Gemini configuration updated', `Active model set to ${defaultModel}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gemini Configuration"
        subtitle="Provider status, allowed model governance, API usage telemetry, and quota posture. Secret keys are managed server-side and never displayed."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Provider Integration Status"
          value={status?.configured ? 'Connected' : 'Demo Simulator'}
          helper="Server-side @google/genai proxy"
          tone={status?.configured ? 'success' : 'brand'}
        />
        <StatCard
          label="Total AI Requests (24h)"
          value={state.aiAgents.reduce((s, a) => s + a.executionCount, 0).toLocaleString()}
          helper="0.5% mean error rate"
        />
        <StatCard
          label="Secret Protection"
          value="Server-Only"
          helper="No API keys exposed to client"
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#4F46E5]" />
              <h2 className="text-base font-semibold text-[#0F172A]">Allowed Model Configuration</h2>
            </div>
            <StatusLabel
              tone={status?.configured ? 'success' : 'info'}
              text={status?.configured ? 'Live Key Active' : 'Server-Managed'}
            />
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Default Execution Model</label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value as 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite')}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono"
              >
                <option value="gemini-4-hydrogen">gemini-4-hydrogen (Standard Reasoning)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Low Latency)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Max Concurrent Agents</label>
              <input
                type="number"
                min={1}
                max={12}
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(Math.max(1, Math.min(12, Number(e.target.value) || 6)))}
                className="w-32 px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
            >
              <Save className="w-4 h-4" />
              <span>Save Model Policy</span>
            </button>
          </form>
        </Card>

        <Card className="lg:col-span-6 p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#0F172A]">Quota & Error Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between">
              <span className="text-[#64748B]">Quota Tier</span>
              <span className="font-medium text-[#0F172A]">{status?.quotaTier ?? 'Standard'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between">
              <span className="text-[#64748B]">SDK Version Policy</span>
              <span className="font-mono text-[#0F172A]">@google/genai (Server-Side)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between">
              <span className="text-[#64748B]">Recent Provider Errors (24h)</span>
              <span className="font-mono text-[#16A34A] font-semibold">1 transient timeout (recovered)</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
