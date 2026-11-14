import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Card, PageHeader } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { UniversitySettingsState } from '../../types/evolvix';

export const UniversitySettingsPage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const [form, setForm] = useState(state.universitySettings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateState((prev) => ({
      ...prev,
      universitySettings: form,
    }));
    showToast('Institution settings saved', 'Academic configuration and permissions updated.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution Settings"
        subtitle="Manage institution profile, academic term configuration, permissions, and notification rules."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0F172A]">Institution Profile & Academic Configuration</h2>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Institution Name</label>
              <input
                type="text"
                value={form.institutionName}
                onChange={(e) => setForm((p) => ({ ...p, institutionName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Institution Code</label>
                <input
                  type="text"
                  value={form.institutionCode}
                  onChange={(e) => setForm((p) => ({ ...p, institutionCode: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Active Academic Term</label>
                <input
                  type="text"
                  value={form.academicTerm}
                  onChange={(e) => setForm((p) => ({ ...p, academicTerm: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Grading Scale</label>
                <select
                  value={form.gradingScale}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, gradingScale: e.target.value as UniversitySettingsState['gradingScale'] }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                >
                  <option value="100-Point Scale">100-Point Scale</option>
                  <option value="4.0 GPA">4.0 GPA</option>
                  <option value="Competency Mastery">Competency Mastery</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Min Readiness Alert (%)</label>
                <input
                  type="number"
                  min={40}
                  max={90}
                  value={form.minReadinessThreshold}
                  onChange={(e) => setForm((p) => ({ ...p, minReadinessThreshold: Number(e.target.value) || 70 }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono tabular-nums"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0F172A]">Permissions & Notifications</h2>
            <div className="space-y-3 text-sm">
              {(
                [
                  { key: 'autoAssignMentors', label: 'Automatically balance new student enrollments across mentors' },
                  { key: 'allowStudentPublicPassports', label: 'Allow students to generate public Skill Proof Passports' },
                  { key: 'weeklyAdminDigest', label: 'Send weekly department readiness digest to Dean & Chairs' },
                ] as const
              ).map((item) => (
                <label key={item.key} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
                  <span className="text-[#0F172A]">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(form[item.key])}
                    onChange={(e) => setForm((p) => ({ ...p, [item.key]: e.target.checked }))}
                    className="h-4 w-4 accent-[#4F46E5]"
                  />
                </label>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Save className="w-4 h-4" />
            <span>Save Institution Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
