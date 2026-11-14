import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Card, PageHeader } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const SuperAdminSettingsPage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const [form, setForm] = useState(state.platformSettings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateState((prev) => ({
      ...prev,
      platformSettings: form,
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          actorName: 'Elena Vance',
          actorRole: 'super_admin',
          category: 'admin_action',
          action: 'Updated global platform security & audit retention configuration',
          target: `Retention: ${form.auditRetentionDays} days`,
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          ipMasked: '10.24.**.18',
        },
        ...prev.auditLogs,
      ],
    }));
    showToast('Platform settings saved', 'Security, AI metadata, and audit retention policies updated.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settings"
        subtitle="Global EVOLVIX AI security configuration, AI operational metadata, notifications, and audit retention."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0F172A]">Platform & Security Configuration</h2>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Platform Brand Name</label>
              <input
                type="text"
                value={form.platformName}
                onChange={(e) => setForm((p) => ({ ...p, platformName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Security Alerts Email</label>
              <input
                type="email"
                value={form.securityAlertsEmail}
                onChange={(e) => setForm((p) => ({ ...p, securityAlertsEmail: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <label className="flex items-center justify-between py-2 border-t border-[#E2E8F0] text-sm">
              <span className="text-[#0F172A]">Enforce Strict Cross-Tenant RBAC Guards</span>
              <input
                type="checkbox"
                checked={form.enforceStrictRBAC}
                onChange={(e) => setForm((p) => ({ ...p, enforceStrictRBAC: e.target.checked }))}
                className="h-4 w-4 accent-[#4F46E5]"
              />
            </label>
            <label className="flex items-center justify-between py-2 border-t border-[#E2E8F0] text-sm">
              <span className="text-[#0F172A]">Maintenance Mode (Read-Only Non-Admin Access)</span>
              <input
                type="checkbox"
                checked={form.maintenanceMode}
                onChange={(e) => setForm((p) => ({ ...p, maintenanceMode: e.target.checked }))}
                className="h-4 w-4 accent-[#4F46E5]"
              />
            </label>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0F172A]">AI Configuration & Audit Retention</h2>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Audit Retention Window (Days)</label>
              <input
                type="number"
                min={30}
                max={1825}
                value={form.auditRetentionDays}
                onChange={(e) => setForm((p) => ({ ...p, auditRetentionDays: Number(e.target.value) || 365 }))}
                className="w-40 px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Default Gemini Model Metadata</label>
              <input
                type="text"
                readOnly
                value={form.defaultGeminiModel}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-mono text-[#64748B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Allowed Gemini Models</label>
              <p className="text-xs font-mono text-[#0F172A] p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                {form.allowedGeminiModels.join(' · ')}
              </p>
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Save className="w-4 h-4" />
            <span>Save Platform Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
