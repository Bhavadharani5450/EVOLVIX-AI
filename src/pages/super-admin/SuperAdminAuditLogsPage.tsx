import React, { useMemo, useState } from 'react';
import { Card, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import type { AuditLogEntry } from '../../types/evolvix';

export const SuperAdminAuditLogsPage: React.FC = () => {
  const { state } = useAppData();
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AuditLogEntry['category']>('ALL');
  const [actorQuery, setActorQuery] = useState('');

  const filtered = useMemo(() => {
    return state.auditLogs.filter((log) => {
      const matchCat = categoryFilter === 'ALL' || log.category === categoryFilter;
      const matchActor =
        !actorQuery.trim() ||
        log.actorName.toLowerCase().includes(actorQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(actorQuery.toLowerCase());
      return matchCat && matchActor;
    });
  }, [state.auditLogs, categoryFilter, actorQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable administrative, role-change, permission-policy, and security-guard event trail."
      />

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={actorQuery}
          onChange={(e) => setActorQuery(e.target.value)}
          placeholder="Filter by actor or action..."
          className="flex-1 px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-sm"
        />
        <select
          aria-label="Filter audit category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | AuditLogEntry['category'])}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Event Categories</option>
          <option value="role_change">Role Changes</option>
          <option value="permission_update">Permission Updates</option>
          <option value="admin_action">Administrative Actions</option>
          <option value="security_event">Security Events</option>
        </select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4 text-right">Source IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#64748B]">{log.timestamp}</td>
                  <td className="py-3.5 px-4 font-medium text-[#0F172A]">{log.actorName}</td>
                  <td className="py-3.5 px-4">
                    <StatusLabel
                      tone={log.category === 'security_event' ? 'warning' : 'info'}
                      text={log.category.replace('_', ' ')}
                    />
                  </td>
                  <td className="py-3.5 px-4 text-[#0F172A]">{log.action}</td>
                  <td className="py-3.5 px-4 text-[#64748B]">{log.target}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-[#64748B]">{log.ipMasked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
