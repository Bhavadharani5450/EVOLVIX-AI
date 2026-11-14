import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, PageHeader } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { UserRole } from '../../types/evolvix';

export const SuperAdminRolesPage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const togglePermission = (role: UserRole, permKey: string, label: string) => {
    const today = new Date().toISOString().slice(0, 10);
    updateState((prev) => ({
      ...prev,
      rolePermissions: prev.rolePermissions.map((rp) => {
        if (rp.role !== role) return rp;
        return {
          ...rp,
          lastReviewedAt: today,
          permissions: rp.permissions.map((p) => (p.key === permKey ? { ...p, enabled: !p.enabled } : p)),
        };
      }),
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          actorName: 'Elena Vance',
          actorRole: 'super_admin',
          category: 'permission_update',
          action: `Toggled permission "${label}"`,
          target: `Role: ${role}`,
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          ipMasked: '10.24.**.18',
        },
        ...prev.auditLogs,
      ],
    }));
    showToast('Permission policy updated', `Updated ${role.replace('_', ' ')} access rule and recorded audit entry.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Govern RBAC access rules across all four EVOLVIX AI roles and audit permission policy updates."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {state.rolePermissions.map((rp) => (
          <Card key={rp.role} className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">{rp.label}</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">{rp.description}</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-[#64748B] shrink-0">
                Reviewed {rp.lastReviewedAt}
              </span>
            </div>

            <div className="space-y-2.5">
              {rp.permissions.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{perm.label}</p>
                    <p className="text-[11px] font-mono text-[#64748B]">{perm.key}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={perm.enabled}
                    onChange={() => togglePermission(rp.role, perm.key, perm.label)}
                    className="h-4 w-4 accent-[#4F46E5]"
                  />
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
