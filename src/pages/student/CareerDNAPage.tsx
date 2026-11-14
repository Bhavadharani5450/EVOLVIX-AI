import React, { useState } from 'react';
import { Plus, RefreshCw, Trash2, Save } from 'lucide-react';
import { Card, Modal, PageHeader, ProgressBar, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { CareerDNA, TechnicalSkill } from '../../types/evolvix';

export const CareerDNAPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState, apiFetch } = useAppData();
  const { showToast } = useToast();
  const dna = state.careerDNA;

  const [newInterest, setNewInterest] = useState('');
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [projModalOpen, setProjModalOpen] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const [skillForm, setSkillForm] = useState<{
    name: string;
    category: TechnicalSkill['category'];
    proficiency: number;
    target: number;
  }>({ name: '', category: 'Systems', proficiency: 65, target: 85 });

  const [certForm, setCertForm] = useState({ title: '', issuer: '', credentialId: '' });
  const [projForm, setProjForm] = useState({ title: '', summary: '', skillsUsed: '', repoUrl: '' });

  const handleUpdateSkillProficiency = (id: string, proficiency: number) => {
    updateState((prev) => ({
      ...prev,
      careerDNA: {
        ...prev.careerDNA,
        technicalSkills: prev.careerDNA.technicalSkills.map((s) =>
          s.id === id ? { ...s, proficiency, lastAssessed: new Date().toISOString().slice(0, 10) } : s
        ),
      },
    }));
  };

  const handleUpdateSoftSkill = (id: string, rating: number) => {
    updateState((prev) => ({
      ...prev,
      careerDNA: {
        ...prev.careerDNA,
        softSkills: prev.careerDNA.softSkills.map((s) => (s.id === id ? { ...s, rating } : s)),
      },
    }));
    showToast('Soft skill rating updated');
  };

  const handleAddTechnicalSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillForm.name.trim()) return;
    const nextSkill: TechnicalSkill = {
      id: `sk-${Date.now()}`,
      name: skillForm.name.trim(),
      category: skillForm.category,
      proficiency: skillForm.proficiency,
      target: skillForm.target,
      verified: false,
      lastAssessed: new Date().toISOString().slice(0, 10),
    };
    updateState((prev) => ({
      ...prev,
      careerDNA: {
        ...prev.careerDNA,
        technicalSkills: [...prev.careerDNA.technicalSkills, nextSkill],
      },
    }));
    setSkillForm({ name: '', category: 'Systems', proficiency: 65, target: 85 });
    setSkillModalOpen(false);
    showToast('Technical skill added', `${nextSkill.name} added to your Career DNA.`);
  };

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterest.trim()) return;
    updateState((prev) => ({
      ...prev,
      careerDNA: {
        ...prev.careerDNA,
        interests: Array.from(new Set([...prev.careerDNA.interests, newInterest.trim()])),
      },
    }));
    setNewInterest('');
    showToast('Interest added');
  };

  const handleRemoveInterest = (interest: string) => {
    updateState((prev) => ({
      ...prev,
      careerDNA: {
        ...prev.careerDNA,
        interests: prev.careerDNA.interests.filter((i) => i !== interest),
      },
    }));
  };

  const handleAddCertification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certForm.title.trim() || !certForm.issuer.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    updateState((prev) => ({
      ...prev,
      careerDNA: {
        ...prev.careerDNA,
        certifications: [
          {
            id: `cert-${Date.now()}`,
            title: certForm.title.trim(),
            issuer: certForm.issuer.trim(),
            credentialId: certForm.credentialId.trim() || `EVX-${Date.now().toString().slice(-5)}`,
            issuedDate: today,
            verified: false,
          },
          ...prev.careerDNA.certifications,
        ],
        evidenceHistory: [
          {
            id: `ev-${Date.now()}`,
            type: 'certification',
            title: certForm.title.trim(),
            skill: 'Cloud & Architecture',
            date: today,
            status: 'pending',
          },
          ...prev.careerDNA.evidenceHistory,
        ],
      },
    }));
    setCertForm({ title: '', issuer: '', credentialId: '' });
    setCertModalOpen(false);
    showToast('Certification added', 'Logged to Career DNA & Skill Proof Passport.');
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projForm.title.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const skillsArr = projForm.skillsUsed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    updateState((prev) => ({
      ...prev,
      careerDNA: {
        ...prev.careerDNA,
        projects: [
          {
            id: `proj-${Date.now()}`,
            title: projForm.title.trim(),
            summary: projForm.summary.trim(),
            skillsUsed: skillsArr.length > 0 ? skillsArr : ['Systems Engineering'],
            repoUrl: projForm.repoUrl.trim() || 'https://github.com/student/project',
            completedDate: today,
            verified: false,
          },
          ...prev.careerDNA.projects,
        ],
        evidenceHistory: [
          {
            id: `ev-${Date.now()}`,
            type: 'project',
            title: projForm.title.trim(),
            skill: skillsArr[0] || 'Engineering',
            date: today,
            status: 'pending',
          },
          ...prev.careerDNA.evidenceHistory,
        ],
      },
    }));
    setProjForm({ title: '', summary: '', skillsUsed: '', repoUrl: '' });
    setProjModalOpen(false);
    showToast('Project recorded', 'Added to Career DNA and evidence log.');
  };

  const handleSyncAdaptiveReanalysis = async () => {
    setReanalyzing(true);
    const stuId = user?.role === 'student' ? user.id : 'stu-alex';
    try {
      await apiFetch(`/api/career-intelligence/student/${stuId}/evidence`, {
        method: 'POST',
        body: JSON.stringify({
          kind: 'goal_update',
          careerGoal: dna.targetCareerTitle,
          interest: dna.interests[0] || 'Systems Architecture',
          triggerReanalysis: true,
        }),
      });
      showToast('Career DNA synced', '6-Agent adaptive re-analysis updated your Pathfinder recommendations.', 'success');
    } catch (err) {
      showToast('Sync error', err instanceof Error ? err.message : 'Unable to sync Career DNA', 'error');
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career DNA"
        subtitle="Manage your living learner profile: technical skills, soft skills, certifications, projects, and preferences."
        actions={
          <>
            <button
              type="button"
              disabled={reanalyzing}
              onClick={handleSyncAdaptiveReanalysis}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-sm font-medium text-[#4F46E5] hover:bg-indigo-50/50 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${reanalyzing ? 'animate-spin' : ''}`} />
              <span>{reanalyzing ? 'Re-Analyzing...' : 'Sync & Re-Analyze'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSkillModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Skill</span>
            </button>
            <button
              type="button"
              onClick={() => setProjModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project</span>
            </button>
          </>
        }
      />

      {/* Goals & Learning Preferences */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label htmlFor="dna-career-goal" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Target Career Goal
            </label>
            <select
              id="dna-career-goal"
              value={dna.targetCareerId}
              onChange={(e) => {
                const chosen = state.careerOptions.find((c) => c.id === e.target.value);
                if (!chosen) return;
                updateState((prev) => ({
                  ...prev,
                  careerDNA: {
                    ...prev.careerDNA,
                    targetCareerId: chosen.id,
                    targetCareerTitle: chosen.title,
                  },
                }));
                showToast('Career goal updated', `Target set to ${chosen.title}.`);
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A]"
            >
              {state.careerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dna-learning-style" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Learning Preference
            </label>
            <select
              id="dna-learning-style"
              value={dna.learningStyle}
              onChange={(e) => {
                updateState((prev) => ({
                  ...prev,
                  careerDNA: {
                    ...prev.careerDNA,
                    learningStyle: e.target.value as CareerDNA['learningStyle'],
                  },
                }));
                showToast('Learning style saved');
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A]"
            >
              <option value="Hands-on Labs">Hands-on Labs</option>
              <option value="Project-First">Project-First</option>
              <option value="Structured Theory">Structured Theory</option>
              <option value="Mentor-Guided">Mentor-Guided</option>
            </select>
          </div>

          <div>
            <label htmlFor="dna-weekly-hours" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Weekly Study Budget (Hours)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="dna-weekly-hours"
                type="number"
                min={4}
                max={40}
                value={dna.weeklyHoursBudget}
                onChange={(e) => {
                  const val = Math.max(4, Math.min(40, Number(e.target.value) || 10));
                  updateState((prev) => ({
                    ...prev,
                    careerDNA: { ...prev.careerDNA, weeklyHoursBudget: val },
                  }));
                }}
                className="w-24 px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono tabular-nums"
              />
              <button
                type="button"
                onClick={() => showToast('Preferences saved', `${dna.weeklyHoursBudget} hrs/week saved.`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Technical & Soft Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Technical Skills</h2>
            <span className="text-xs text-[#64748B] font-mono tabular-nums">
              {dna.technicalSkills.length} competencies
            </span>
          </div>
          <div className="space-y-4">
            {dna.technicalSkills.map((sk) => (
              <div key={sk.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{sk.name}</p>
                    <p className="text-xs text-[#64748B]">
                      {sk.category} · Target {sk.target}% · Last assessed {sk.lastAssessed}
                    </p>
                  </div>
                  <StatusLabel tone={sk.verified ? 'success' : 'neutral'} text={sk.verified ? 'Verified' : 'Self-Rated'} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={sk.proficiency} tone={sk.proficiency >= sk.target ? 'success' : 'brand'} />
                  </div>
                  <input
                    type="range"
                    aria-label={`${sk.name} proficiency`}
                    min={10}
                    max={100}
                    value={sk.proficiency}
                    onChange={(e) => handleUpdateSkillProficiency(sk.id, Number(e.target.value))}
                    className="w-24 accent-[#4F46E5]"
                  />
                  <span className="text-xs font-mono tabular-nums font-semibold text-[#0F172A] w-10 text-right">
                    {sk.proficiency}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-5 space-y-6">
          {/* Soft Skills */}
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0F172A]">Soft Skills (1–5 Scale)</h2>
            <div className="space-y-3">
              {dna.softSkills.map((ss) => (
                <div key={ss.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#E2E8F0] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{ss.name}</p>
                    <p className="text-xs text-[#64748B] font-mono tabular-nums">{ss.evidenceCount} evidence items</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleUpdateSoftSkill(ss.id, num)}
                        className={`w-7 h-7 rounded-md text-xs font-mono tabular-nums font-semibold transition-colors ${
                          ss.rating >= num
                            ? 'bg-[#4F46E5] text-white'
                            : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Interests */}
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0F172A]">Domain Interests</h2>
            <form onSubmit={handleAddInterest} className="flex gap-2">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add technical interest..."
                className="flex-1 px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium"
              >
                Add
              </button>
            </form>
            <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl">
              {dna.interests.map((interest) => (
                <div key={interest} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                  <span className="text-[#0F172A]">{interest}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    aria-label={`Remove ${interest}`}
                    className="text-[#64748B] hover:text-[#DC2626]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Certifications & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Certifications</h2>
            <button
              type="button"
              onClick={() => setCertModalOpen(true)}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              + Add Certification
            </button>
          </div>
          <div className="space-y-3">
            {dna.certifications.map((cert) => (
              <div key={cert.id} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{cert.title}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {cert.issuer} · Issued {cert.issuedDate} · ID {cert.credentialId}
                  </p>
                </div>
                <StatusLabel tone={cert.verified ? 'success' : 'info'} text={cert.verified ? 'Verified' : 'Pending'} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Portfolio Projects</h2>
            <button
              type="button"
              onClick={() => setProjModalOpen(true)}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              + Add Project
            </button>
          </div>
          <div className="space-y-3">
            {dna.projects.map((proj) => (
              <div key={proj.id} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0F172A]">{proj.title}</p>
                  <StatusLabel tone={proj.verified ? 'success' : 'info'} text={proj.verified ? 'Verified' : 'Submitted'} />
                </div>
                <p className="text-xs text-[#64748B]">{proj.summary}</p>
                <p className="text-[11px] text-[#64748B]">
                  Skills: {proj.skillsUsed.join(' · ')} · Completed {proj.completedDate}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Evidence History Table */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#0F172A]">Evidence History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                <th className="py-2.5 pr-4">Artifact</th>
                <th className="py-2.5 pr-4">Type</th>
                <th className="py-2.5 pr-4">Skill</th>
                <th className="py-2.5 pr-4">Date</th>
                <th className="py-2.5 pr-4 text-right">Score</th>
                <th className="py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {dna.evidenceHistory.map((ev) => (
                <tr key={ev.id}>
                  <td className="py-3 pr-4 font-medium text-[#0F172A]">{ev.title}</td>
                  <td className="py-3 pr-4 text-[#64748B] capitalize">{ev.type}</td>
                  <td className="py-3 pr-4 text-[#64748B]">{ev.skill}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums text-xs text-[#64748B]">{ev.date}</td>
                  <td className="py-3 pr-4 text-right font-mono tabular-nums text-[#0F172A]">
                    {ev.score !== undefined ? `${ev.score}%` : '—'}
                  </td>
                  <td className="py-3 text-right">
                    <StatusLabel
                      tone={ev.status === 'verified' ? 'success' : ev.status === 'pending' ? 'warning' : 'error'}
                      text={ev.status === 'verified' ? 'Verified' : ev.status === 'pending' ? 'Pending' : 'Revision'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      <Modal open={skillModalOpen} onClose={() => setSkillModalOpen(false)} title="Add Technical Skill">
        <form onSubmit={handleAddTechnicalSkill} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Skill Name</label>
            <input
              type="text"
              required
              value={skillForm.name}
              onChange={(e) => setSkillForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. GraphQL Federation"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Category</label>
            <select
              value={skillForm.category}
              onChange={(e) => setSkillForm((p) => ({ ...p, category: e.target.value as TechnicalSkill['category'] }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              <option value="AI & ML">AI & ML</option>
              <option value="Systems">Systems</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Data">Data</option>
              <option value="Cloud">Cloud</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Current (%)</label>
              <input
                type="number"
                min={10}
                max={100}
                value={skillForm.proficiency}
                onChange={(e) => setSkillForm((p) => ({ ...p, proficiency: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Target (%)</label>
              <input
                type="number"
                min={20}
                max={100}
                value={skillForm.target}
                onChange={(e) => setSkillForm((p) => ({ ...p, target: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-mono tabular-nums"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSkillModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Add Skill
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={certModalOpen} onClose={() => setCertModalOpen(false)} title="Add Certification">
        <form onSubmit={handleAddCertification} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Certification Title</label>
            <input
              type="text"
              required
              value={certForm.title}
              onChange={(e) => setCertForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Kubernetes Application Developer"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Issuing Organization</label>
            <input
              type="text"
              required
              value={certForm.issuer}
              onChange={(e) => setCertForm((p) => ({ ...p, issuer: e.target.value }))}
              placeholder="e.g. CNCF / Linux Foundation"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Credential ID</label>
            <input
              type="text"
              value={certForm.credentialId}
              onChange={(e) => setCertForm((p) => ({ ...p, credentialId: e.target.value }))}
              placeholder="Optional reference ID"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCertModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Save Certification
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={projModalOpen} onClose={() => setProjModalOpen(false)} title="Add Project Evidence">
        <form onSubmit={handleAddProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Project Title</label>
            <input
              type="text"
              required
              value={projForm.title}
              onChange={(e) => setProjForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Distributed Cache Benchmark"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Summary</label>
            <textarea
              rows={3}
              required
              value={projForm.summary}
              onChange={(e) => setProjForm((p) => ({ ...p, summary: e.target.value }))}
              placeholder="Describe architecture, metrics, and outcome..."
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Skills Used (comma-separated)</label>
            <input
              type="text"
              value={projForm.skillsUsed}
              onChange={(e) => setProjForm((p) => ({ ...p, skillsUsed: e.target.value }))}
              placeholder="Distributed Systems, Docker & Kubernetes"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Repository URL</label>
            <input
              type="url"
              value={projForm.repoUrl}
              onChange={(e) => setProjForm((p) => ({ ...p, repoUrl: e.target.value }))}
              placeholder="https://github.com/..."
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setProjModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Add Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
