import React, { useState } from 'react';
import { Award, Copy, Plus, RefreshCw, Share2 } from 'lucide-react';
import { Card, Modal, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const SkillPassportPage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [evidenceType, setEvidenceType] = useState<'certification' | 'project'>('project');
  const [title, setTitle] = useState('');
  const [skill, setSkill] = useState('Distributed Systems');
  const [detail, setDetail] = useState('');

  const verifiedSkills = state.careerDNA.technicalSkills.filter((s) => s.verified);
  const assessmentProofs = state.careerDNA.evidenceHistory.filter((e) => e.type === 'assessment' || e.type === 'mission');

  const handleGeneratePassport = () => {
    const newCode = `EVX-PT-2027-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    updateState((prev) => ({
      ...prev,
      skillPassport: {
        ...prev.skillPassport,
        passportCode: newCode,
        shareUrl: `https://evolvix.ai/passport/${newCode}`,
        lastGeneratedAt: new Date().toISOString().slice(0, 10),
        headline: `${prev.careerDNA.targetCareerTitle} Candidate · ${verifiedSkills.length} Verified Technical Competencies`,
      },
    }));
    showToast('Skill Proof Passport regenerated', `Credential ID ${newCode} issued.`);
  };

  const handleTogglePublicSharing = () => {
    const next = !state.skillPassport.publicEnabled;
    updateState((prev) => ({
      ...prev,
      skillPassport: { ...prev.skillPassport, publicEnabled: next },
    }));
    showToast(next ? 'Public sharing enabled' : 'Public sharing disabled');
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(state.skillPassport.shareUrl);
      showToast('Share URL copied', state.skillPassport.shareUrl);
    } catch {
      showToast('Passport URL ready', state.skillPassport.shareUrl, 'info');
    }
  };

  const handleAddEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const today = new Date().toISOString().slice(0, 10);

    updateState((prev) => ({
      ...prev,
      careerDNA: {
        ...prev.careerDNA,
        certifications:
          evidenceType === 'certification'
            ? [
                {
                  id: `cert-${Date.now()}`,
                  title: title.trim(),
                  issuer: detail.trim() || 'Accredited Provider',
                  issuedDate: today,
                  credentialId: `EVX-${Date.now().toString().slice(-5)}`,
                  verified: false,
                },
                ...prev.careerDNA.certifications,
              ]
            : prev.careerDNA.certifications,
        projects:
          evidenceType === 'project'
            ? [
                {
                  id: `proj-${Date.now()}`,
                  title: title.trim(),
                  summary: detail.trim() || 'Submitted for verification.',
                  skillsUsed: [skill],
                  repoUrl: 'https://github.com/student/evidence',
                  completedDate: today,
                  verified: false,
                },
                ...prev.careerDNA.projects,
              ]
            : prev.careerDNA.projects,
        evidenceHistory: [
          {
            id: `ev-${Date.now()}`,
            type: evidenceType,
            title: title.trim(),
            skill,
            date: today,
            status: 'pending',
          },
          ...prev.careerDNA.evidenceHistory,
        ],
      },
    }));
    setTitle('');
    setDetail('');
    setEvidenceModalOpen(false);
    showToast('Evidence submitted', 'Queued for mentor verification.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skill Proof Passport"
        subtitle="Verified competency credentials, project & certification evidence, assessment proofs, and public sharing controls."
        actions={
          <>
            <button
              type="button"
              onClick={() => setEvidenceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Evidence</span>
            </button>
            <button
              type="button"
              onClick={handleGeneratePassport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Generate Passport</span>
            </button>
          </>
        }
      />

      {/* Passport Banner & Public Sharing */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">{state.studentProfile.fullName}</h2>
                <p className="text-xs text-[#64748B]">{state.skillPassport.headline}</p>
              </div>
            </div>
            <p className="text-xs font-mono tabular-nums text-[#64748B]">
              Passport ID: <strong className="text-[#0F172A]">{state.skillPassport.passportCode}</strong> · Issued{' '}
              {state.skillPassport.lastGeneratedAt}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 min-w-[280px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                <Share2 className="w-4 h-4 text-[#4F46E5]" />
                <span>Public Sharing</span>
              </div>
              <button
                type="button"
                onClick={handleTogglePublicSharing}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  state.skillPassport.publicEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-[#16A34A]'
                    : 'bg-white border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {state.skillPassport.publicEnabled ? 'Enabled' : 'Private'}
              </button>
            </div>
            {state.skillPassport.publicEnabled && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={state.skillPassport.shareUrl}
                  aria-label="Public passport URL"
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-mono text-[#64748B]"
                />
                <button
                  type="button"
                  onClick={handleCopyShareUrl}
                  className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"
                  title="Copy share URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Verified Skills & Assessment Proofs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5 p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#0F172A]">Verified Skills ({verifiedSkills.length})</h2>
          <div className="divide-y divide-[#E2E8F0]">
            {verifiedSkills.map((sk) => (
              <div key={sk.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{sk.name}</p>
                  <p className="text-xs text-[#64748B]">
                    {sk.category} · Verified {sk.lastAssessed}
                  </p>
                </div>
                <span className="text-sm font-mono tabular-nums font-bold text-[#16A34A]">{sk.proficiency}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-7 p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#0F172A]">Assessment & Evidence Verification Status</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                  <th className="py-2 pr-4">Proof Artifact</th>
                  <th className="py-2 pr-4">Skill</th>
                  <th className="py-2 pr-4 text-right">Score</th>
                  <th className="py-2 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {[...assessmentProofs, ...state.careerDNA.evidenceHistory.filter((e) => e.type === 'certification' || e.type === 'project')].map(
                  (item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[#0F172A]">{item.title}</p>
                        <p className="text-xs text-[#64748B] capitalize">
                          {item.type} · {item.date}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-[#64748B]">{item.skill}</td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums text-[#0F172A]">
                        {item.score !== undefined ? `${item.score}%` : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <StatusLabel
                          tone={
                            item.status === 'verified' ? 'success' : item.status === 'pending' ? 'warning' : 'error'
                          }
                          text={
                            item.status === 'verified'
                              ? 'Verified'
                              : item.status === 'pending'
                              ? 'Pending Review'
                              : 'Needs Revision'
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={evidenceModalOpen} onClose={() => setEvidenceModalOpen(false)} title="Add Passport Evidence">
        <form onSubmit={handleAddEvidence} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Evidence Type</label>
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value as 'certification' | 'project')}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              <option value="project">Project Evidence</option>
              <option value="certification">Certification</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kubernetes Autoscaling Lab"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Target Skill</label>
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            >
              {state.careerDNA.technicalSkills.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              {evidenceType === 'certification' ? 'Issuing Organization' : 'Summary / Verification Notes'}
            </label>
            <input
              type="text"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEvidenceModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Submit Evidence
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
