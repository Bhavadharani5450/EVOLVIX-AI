import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, GitBranch } from 'lucide-react';
import { Card, PageHeader, SkillComparisonChart, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';

const PREREQUISITE_CHAIN = [
  { skill: 'SQL & Data Modeling', prerequisite: 'Foundational Programming', unlocks: 'Distributed Systems' },
  { skill: 'REST & Event APIs', prerequisite: 'SQL & Data Modeling', unlocks: 'Distributed Systems' },
  { skill: 'Distributed Systems', prerequisite: 'REST & Event APIs', unlocks: 'Docker & Kubernetes' },
  { skill: 'Docker & Kubernetes', prerequisite: 'Distributed Systems', unlocks: 'Blue/Green Inference Rollouts' },
];

export const SkillGapPage: React.FC = () => {
  const { state } = useAppData();
  const navigate = useNavigate();

  const targetCareer =
    state.careerOptions.find((c) => c.id === state.careerDNA.targetCareerId) ?? state.careerOptions[0];

  const comparisons = targetCareer.requiredSkills.map((req) => {
    const existing = state.careerDNA.technicalSkills.find((s) => s.name === req.name);
    const current = existing?.proficiency ?? 35;
    const gap = Math.max(0, req.requiredLevel - current);
    const priority = gap >= 20 ? 'High' : gap >= 8 ? 'Medium' : 'On Track';
    return {
      name: req.name,
      current,
      required: req.requiredLevel,
      gap,
      priority,
      verified: existing?.verified ?? false,
    };
  });

  const sortedGaps = [...comparisons].sort((a, b) => b.gap - a.gap);
  const missingSkills = sortedGaps.filter((g) => g.gap > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skill Gap Analysis"
        subtitle={`Comparing your Career DNA against ${targetCareer.title} competency thresholds.`}
        actions={
          <button
            type="button"
            onClick={() => navigate('/student/learning-path')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <span>Open Adaptive Roadmap</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">Current Proficiency vs. Target Competencies</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Vertical dark marker indicates required target level.</p>
          </div>
          <SkillComparisonChart
            items={comparisons.map((c) => ({ name: c.name, current: c.current, required: c.required }))}
          />
        </Card>

        <Card className="lg:col-span-5 p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#0F172A]">Gap Priority Queue</h2>
          {missingSkills.length === 0 ? (
            <p className="text-sm text-[#16A34A]">All required competencies meet or exceed target thresholds.</p>
          ) : (
            <div className="space-y-3">
              {missingSkills.map((item) => (
                <div key={item.name} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{item.name}</p>
                    <p className="text-xs text-[#64748B] font-mono tabular-nums mt-0.5">
                      {item.current}% current · {item.required}% required · -{item.gap}% delta
                    </p>
                  </div>
                  <StatusLabel
                    tone={item.priority === 'High' ? 'error' : 'warning'}
                    text={`${item.priority} Priority`}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Prerequisite Relationships & Recommended Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#4F46E5]" />
            <h2 className="text-base font-semibold text-[#0F172A]">Prerequisite Dependency Chain</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                  <th className="py-2 pr-4">Prerequisite</th>
                  <th className="py-2 pr-4">Target Skill</th>
                  <th className="py-2">Unlocks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {PREREQUISITE_CHAIN.map((row) => (
                  <tr key={row.skill}>
                    <td className="py-3 pr-4 text-[#64748B]">{row.prerequisite}</td>
                    <td className="py-3 pr-4 font-semibold text-[#0F172A]">{row.skill}</td>
                    <td className="py-3 text-[#4F46E5] font-medium">{row.unlocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-5 p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#0F172A]">Recommended Next Steps</h2>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <p className="text-sm font-semibold text-[#0F172A]">1. Close Docker & Kubernetes Gap</p>
              <p className="text-xs text-[#64748B]">
                Launch the Multi-Stage Container mission in MissionForge (+12 projected points).
              </p>
              <button
                type="button"
                onClick={() => navigate('/student/missions')}
                className="text-xs font-semibold text-[#4F46E5] hover:underline"
              >
                Go to MissionForge →
              </button>
            </div>
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <p className="text-sm font-semibold text-[#0F172A]">2. Practice Distributed Latency Drills</p>
              <p className="text-xs text-[#64748B]">
                Complete P95 percentile coding challenge in Practice Lab to verify Systems skill.
              </p>
              <button
                type="button"
                onClick={() => navigate('/student/practice-lab')}
                className="text-xs font-semibold text-[#4F46E5] hover:underline"
              >
                Open Practice Lab →
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
