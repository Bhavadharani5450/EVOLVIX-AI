import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, PageHeader, ProgressBar, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

const HEATMAP_SKILLS = ['Python & PyTorch', 'Distributed Systems', 'Docker & Kubernetes', 'SQL & Data Modeling', 'REST & Event APIs'];

const HEATMAP_DATA: Record<string, Record<string, number>> = {
  CSAI: { 'Python & PyTorch': 82, 'Distributed Systems': 61, 'Docker & Kubernetes': 54, 'SQL & Data Modeling': 75, 'REST & Event APIs': 79 },
  DSA: { 'Python & PyTorch': 78, 'Distributed Systems': 48, 'Docker & Kubernetes': 46, 'SQL & Data Modeling': 84, 'REST & Event APIs': 66 },
  SWE: { 'Python & PyTorch': 65, 'Distributed Systems': 69, 'Docker & Kubernetes': 59, 'SQL & Data Modeling': 74, 'REST & Event APIs': 85 },
  CYB: { 'Python & PyTorch': 58, 'Distributed Systems': 71, 'Docker & Kubernetes': 74, 'SQL & Data Modeling': 68, 'REST & Event APIs': 72 },
};

export const UniversitySkillIntelligencePage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useAppData();
  const navigate = useNavigate();

  const instId = user?.institutionId ?? 'inst-pacific';
  const depts = state.departments.filter((d) => d.institutionId === instId);

  const priorityNeeds = [
    { skill: 'Docker & Kubernetes', avgProficiency: 58, required: 80, gap: 22, priority: 'Critical' },
    { skill: 'Distributed Systems', avgProficiency: 62, required: 82, gap: 20, priority: 'High' },
    { skill: 'Python & PyTorch', avgProficiency: 71, required: 80, gap: 9, priority: 'Moderate' },
  ];

  const getCellStyle = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 text-[#16A34A] border-emerald-200';
    if (score >= 65) return 'bg-indigo-50 text-[#4F46E5] border-indigo-200';
    if (score >= 55) return 'bg-amber-50 text-[#D97706] border-amber-200';
    return 'bg-red-50 text-[#DC2626] border-red-200';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skill Intelligence"
        subtitle="Department skill-gap heatmap, common missing competencies, and priority institutional training needs."
        actions={
          <button
            type="button"
            onClick={() => navigate('/university/training')}
            className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            Launch Training Intervention
          </button>
        }
      />

      {/* Department Skill-Gap Heatmap */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Department Skill-Gap Heatmap</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Average cohort proficiency (%) across core technical competencies by department.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                <th className="py-2.5 pr-4">Department</th>
                {HEATMAP_SKILLS.map((sk) => (
                  <th key={sk} className="py-2.5 px-2 text-center">
                    {sk}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {depts.map((dept) => {
                const row = HEATMAP_DATA[dept.code] ?? HEATMAP_DATA.CSAI;
                return (
                  <tr key={dept.id}>
                    <td className="py-3 pr-4 font-semibold text-[#0F172A]">
                      {dept.name} <span className="text-xs font-mono text-[#64748B]">({dept.code})</span>
                    </td>
                    {HEATMAP_SKILLS.map((sk) => {
                      const val = row[sk] ?? 65;
                      return (
                        <td key={sk} className="py-2.5 px-2 text-center">
                          <span
                            className={`inline-block w-14 py-1.5 rounded-lg border text-xs font-mono tabular-nums font-semibold ${getCellStyle(
                              val
                            )}`}
                          >
                            {val}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Priority Training Needs & Required Competencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#0F172A]">Priority Training Needs</h2>
          <div className="space-y-3">
            {priorityNeeds.map((item) => (
              <div key={item.skill} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#0F172A]">{item.skill}</p>
                  <StatusLabel
                    tone={item.priority === 'Critical' ? 'error' : item.priority === 'High' ? 'warning' : 'info'}
                    text={`${item.priority} (-${item.gap}% gap)`}
                  />
                </div>
                <ProgressBar value={item.avgProficiency} max={item.required} tone={item.gap >= 20 ? 'warning' : 'brand'} />
                <p className="text-xs text-[#64748B] font-mono tabular-nums">
                  Current Avg: {item.avgProficiency}% · Required Competency: {item.required}%
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#0F172A]">Skill Distribution Summary</h2>
          <div className="space-y-3 text-sm text-[#0F172A]">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <p className="font-semibold">Strongest Institutional Competency</p>
              <p className="text-xs text-[#64748B] mt-1">
                REST & Event APIs (75.5% cross-department average) — 78% of Batch 2027 students verified.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <p className="font-semibold">Most Common Missing Skill</p>
              <p className="text-xs text-[#64748B] mt-1">
                Docker & Kubernetes orchestration (54% in CSAI, 46% in DSA) — targeted by Training Bootcamp.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
