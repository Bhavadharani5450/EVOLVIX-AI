import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, PageHeader, StatCard, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import type { APIEndpointStat } from '../../types/evolvix';

export const SuperAdminApiMonitoringPage: React.FC = () => {
  const { state, apiFetch } = useAppData();
  const [liveStats, setLiveStats] = useState<APIEndpointStat[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTelemetry = async () => {
    setRefreshing(true);
    try {
      const res = await apiFetch<{ metrics: APIEndpointStat[] }>('/api/super-admin/api-telemetry');
      setLiveStats(res.metrics ?? []);
    } catch {
      setLiveStats([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, []);

  const combined = liveStats.length > 0 ? [...liveStats, ...state.apiStats] : state.apiStats;
  const totalReq = combined.reduce((s, e) => s + e.requests24h, 0);
  const avgLatency = Math.round(combined.reduce((s, e) => s + e.avgLatencyMs, 0) / Math.max(combined.length, 1));
  const recentErrors = combined.filter((e) => e.lastError);

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Monitoring"
        subtitle="Real-time Express endpoint throughput, average response times, error rates, and recent API errors."
        actions={
          <button
            type="button"
            onClick={loadTelemetry}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="API Requests (24h)" value={totalReq.toLocaleString()} tone="brand" />
        <StatCard label="Mean Response Time" value={`${avgLatency} ms`} tone="success" />
        <StatCard label="Degraded Endpoints" value={combined.filter((e) => e.status === 'degraded').length} tone="warning" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Requests</th>
                <th className="py-3 px-4 text-right">Avg Latency</th>
                <th className="py-3 px-4 text-right">Error Rate</th>
                <th className="py-3 px-4 text-right">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {combined.map((stat, idx) => (
                <tr key={`${stat.method}-${stat.endpoint}-${idx}`} className="hover:bg-[#F8FAFC]">
                  <td className="py-3.5 px-4 font-mono text-xs text-[#0F172A]">{stat.endpoint}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-[#64748B]">{stat.method}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">{stat.requests24h.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">{stat.avgLatencyMs} ms</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">{stat.errorRatePct}%</td>
                  <td className="py-3.5 px-4 text-right">
                    <StatusLabel tone={stat.status === 'healthy' ? 'success' : 'warning'} text={stat.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {recentErrors.length > 0 && (
        <Card className="p-6 space-y-3">
          <h2 className="text-base font-semibold text-[#0F172A]">Recent API Errors</h2>
          <div className="space-y-2">
            {recentErrors.map((err, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-[#0F172A]">
                <span className="font-mono font-semibold text-[#D97706]">{err.method} {err.endpoint}:</span>{' '}
                {err.lastError}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
