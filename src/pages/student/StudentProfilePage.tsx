import React, { useState } from 'react';
import { Camera, Plus, Save, X } from 'lucide-react';
import { Card, PageHeader } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const StudentProfilePage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const [form, setForm] = useState(state.studentProfile);
  const [newInterest, setNewInterest] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateState((prev) => ({
      ...prev,
      studentProfile: form,
    }));
    updateCurrentUser({ name: form.fullName, email: form.email, department: form.department });
    showToast('Profile saved', 'Your academic and personal details have been updated.');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        setForm((prev) => ({ ...prev, avatarUrl: result }));
        showToast('Profile photo loaded', 'Click Save Changes to persist your photo.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddInterest = () => {
    if (!newInterest.trim()) return;
    setForm((prev) => ({
      ...prev,
      interests: Array.from(new Set([...prev.interests, newInterest.trim()])),
    }));
    setNewInterest('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Manage personal information, academic enrollment, career interests, and profile photo."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {form.avatarUrl ? (
              <img
                src={form.avatarUrl}
                alt={form.fullName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border border-[#E2E8F0]"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center text-xl font-bold">
                {user?.avatarInitials ?? 'AR'}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A]">{form.fullName}</h2>
              <p className="text-xs text-[#64748B]">
                {form.university} · {form.department}
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-xs font-medium text-[#0F172A] cursor-pointer">
            <Camera className="w-4 h-4 text-[#4F46E5]" />
            <span>Upload Profile Picture</span>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
          </label>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#0F172A]">Personal Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Academic Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#0F172A]">Education & Interests</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">University</label>
                <input
                  type="text"
                  value={form.university}
                  onChange={(e) => setForm((p) => ({ ...p, university: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Programme</label>
                <input
                  type="text"
                  value={form.programme}
                  onChange={(e) => setForm((p) => ({ ...p, programme: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">GPA / Standing</label>
                <input
                  type="text"
                  value={form.gpa}
                  onChange={(e) => setForm((p) => ({ ...p, gpa: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-[#0F172A]">Interests</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add interest..."
                  className="flex-1 px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddInterest}
                  className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl">
                {form.interests.map((item) => (
                  <div key={item} className="flex items-center justify-between px-3 py-2 text-xs text-[#0F172A]">
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, interests: p.interests.filter((x) => x !== item) }))
                      }
                      aria-label={`Remove ${item}`}
                      className="text-[#64748B] hover:text-[#DC2626]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
