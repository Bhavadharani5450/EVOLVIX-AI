import React, { useState } from 'react';
import { Lock, Save, Shield } from 'lucide-react';
import { Card, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const StudentSettingsPage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState(state.studentSettings);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [sessions, setSessions] = useState([
    { id: 's-1', device: 'Chrome on Linux · Current Session', location: 'San Jose, CA', lastSeen: 'Active now', current: true },
    { id: 's-2', device: 'Safari on iPadOS', location: 'San Jose, CA', lastSeen: '2 days ago', current: false },
  ]);

  const handleSaveSettings = () => {
    updateState((prev) => ({
      ...prev,
      studentSettings: settings,
    }));
    showToast('Settings saved', 'Notification, privacy, and data-sharing preferences updated.');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.next.length < 8) {
      showToast('Password too short', 'New password must be at least 8 characters.', 'error');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      showToast('Passwords do not match', 'Confirm your new password identically.', 'error');
      return;
    }
    setPasswords({ current: '', next: '', confirm: '' });
    showToast('Password updated', 'Your account credentials have been updated.');
  };

  const handleRevokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    showToast('Session revoked', 'Remote device session signed out.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage account security, password, notification preferences, privacy, and active sessions."
        actions={
          <button
            type="button"
            onClick={handleSaveSettings}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Password & Security */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#4F46E5]" />
            <h2 className="text-base font-semibold text-[#0F172A]">Password & Account Security</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">New Password</label>
              <input
                type="password"
                required
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="inline-flex items-center gap-2 text-xs text-[#0F172A]">
                <input
                  type="checkbox"
                  checked={settings.twoFactorEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, twoFactorEnabled: e.target.checked }))}
                />
                <span>Two-Factor Authentication</span>
              </label>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] hover:bg-slate-100"
              >
                Update Password
              </button>
            </div>
          </form>
        </Card>

        {/* Notification & Privacy Preferences */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#4F46E5]" />
            <h2 className="text-base font-semibold text-[#0F172A]">Notifications & Data Privacy</h2>
          </div>
          <div className="space-y-3 text-sm">
            {(
              [
                { key: 'emailNotifications', label: 'Email notifications for new feedback' },
                { key: 'assessmentReminders', label: 'Upcoming assessment & mission reminders' },
                { key: 'mentorSessionAlerts', label: '1:1 mentoring session alerts' },
                { key: 'shareSkillPassportWithMentors', label: 'Share Skill Proof Passport with assigned mentors' },
                { key: 'allowAiTelemetryImprovement', label: 'Allow anonymized skill-gap calibration' },
              ] as const
            ).map((item) => (
              <label key={item.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-[#E2E8F0] last:border-0">
                <span className="text-[#0F172A]">{item.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings[item.key])}
                  onChange={(e) => setSettings((s) => ({ ...s, [item.key]: e.target.checked }))}
                  className="h-4 w-4 accent-[#4F46E5]"
                />
              </label>
            ))}

            <div className="pt-2">
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Profile Visibility</label>
              <select
                value={settings.profileVisibility}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    profileVisibility: e.target.value as 'institution' | 'mentors_only' | 'private',
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                <option value="institution">Institution & Assigned Mentors</option>
                <option value="mentors_only">Assigned Mentors Only</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Session Management */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0F172A]">Active Sessions</h2>
          <button
            type="button"
            onClick={() => logout()}
            className="text-xs font-semibold text-[#DC2626] hover:underline"
          >
            Sign Out All Sessions
          </button>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          {sessions.map((sess) => (
            <div key={sess.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[#0F172A]">{sess.device}</p>
                <p className="text-xs text-[#64748B]">
                  {sess.location} · {sess.lastSeen}
                </p>
              </div>
              {sess.current ? (
                <StatusLabel tone="success" text="Current Session" />
              ) : (
                <button
                  type="button"
                  onClick={() => handleRevokeSession(sess.id)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#DC2626] hover:bg-red-50 self-start sm:self-auto"
                >
                  Revoke Session
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
