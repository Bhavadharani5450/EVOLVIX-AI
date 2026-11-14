import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Card, PageHeader, SkillComparisonChart } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const MentorSkillGapReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useAppData();
  const { showToast } = useToast();

  const assigned = useMemo(
    () => state.mentorAssignedStudents.filter((s) => s.mentorId === (user?.id ?? 'men-maya')),
    [state.mentorAssignedStudents, user?.id]
  );

  const [selectedStudentId, setSelectedStudentId] = useState(assigned[0]?.id ?? '');
  const activeStudent = assigned.find((s) => s.id === selectedStudentId) ?? assigned[0];

  // Aggregate common skill gaps across assigned cohort
  const commonGaps = useMemo(() => {
    const map = new Map<string, { skill: string; totalGap: number; count: number }>();
    for (const stu of assigned) {
      for (const sk of stu.skills) {
        const gap = Math.max(0, sk.required - sk.current);
        const prev = map.get(sk.name) ?? { skill: sk.name, totalGap: 0, count: 0 };
        prev.totalGap += gap;
        prev.count += 1;
        map.set(sk.name, prev);
      }
    }
    return Array.from(map.values())
      .map((g) => ({ skill: g.skill, avgGap: Math.round(g.totalGap / g.count), learners: g.count }))
      .sort((a, b) => b.avgGap - a.avgGap);
  }, [assigned]);

  const handleExportCsv = () => {
    const rows = ['Student,Skill,Current,Required,Gap'];
    for (const stu of assigned) {
      for (const sk of stu.skills) {
        rows.push(`"${stu.name}","${sk.name}",${sk.current},${sk.required},${Math.max(0, sk.required - sk.current)}`);
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mentor-skill-gap-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Skill gap report exported', 'Downloaded mentor-skill-gap-report.csv');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skill Gap Reports"
        subtitle="Compare competency gaps across your assigned students and export cohort gap breakdowns."
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#0F172A]">Student Competency Comparison</h2>
            <select
              aria-label="Select student to inspect"
              value={activeStudent?.id}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium"
            >
              {assigned.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {activeStudent && <SkillComparisonChart items={activeStudent.skills} />}
        </Card>

        <Card className="lg:col-span-5 p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#0F172A]">Common Cohort Gaps</h2>
          <div className="divide-y divide-[#E2E8F0]">
            {commonGaps.map((g) => (
              <div key={g.skill} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{g.skill}</p>
                  <p className="text-xs text-[#64748B]">Tracked across {g.learners} assigned learners</p>
                </div>
                <span
                  className={`text-sm font-mono tabular-nums font-bold ${
                    g.avgGap >= 20 ? 'text-[#DC2626]' : g.avgGap >= 10 ? 'text-[#D97706]' : 'text-[#16A34A]'
                  }`}
                >
                  -{g.avgGap}% avg gap
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
