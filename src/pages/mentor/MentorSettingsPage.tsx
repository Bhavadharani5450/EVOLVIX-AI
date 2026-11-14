import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Card, PageHeader } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const MentorSettingsPage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const [profile, setProfile] = useState({
    name: user?.name ?? 'Dr. Maya Lin',
    email: user?.email ?? 'dr.maya.lin@evolvix.edu',
    title: user?.title ?? 'Principal AI Systems Mentor',
  });
  const [settings, setSettings] = useState(state.mentorSettings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUser(profile);
    updateState((prev) => ({
      ...prev,
      mentorSettings: settings,
    }));
    showToast('Mentor settings saved', 'Availability, security, and notification preferences updated.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentor Settings"
        subtitle="Configure mentor profile, account security, notification preferences, and mentoring availability."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0F172A]">Profile & Availability</h2>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Title / Specialization</label>
              <input
                type="text"
                value={profile.title}
                onChange={(e) => setProfile((p) => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Office Hours / Availability</label>
              <input
                type="text"
                value={settings.availabilityHours ?? ''}
                onChange={(e) => setSettings((s) => ({ ...s, availabilityHours: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Office Location / Meeting Link</label>
              <input
                type="text"
                value={settings.officeLocation ?? ''}
                onChange={(e) => setSettings((s) => ({ ...s, officeLocation: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0F172A]">Security & Notification Preferences</h2>
            <div className="space-y-3 text-sm">
              {(
                [
                  { key: 'twoFactorEnabled', label: 'Require Two-Factor Authentication' },
                  { key: 'emailNotifications', label: 'Email alerts for pending assessment submissions' },
                  { key: 'mentorSessionAlerts', label: '1:1 session schedule reminders' },
                  { key: 'weeklyDigest', label: 'Weekly cohort at-risk summary digest' },
                ] as const
              ).map((item) => (
                <label key={item.key} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
                  <span className="text-[#0F172A]">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings[item.key])}
                    onChange={(e) => setSettings((s) => ({ ...s, [item.key]: e.target.checked }))}
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
            <span>Save Mentor Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
