import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Card, PageHeader } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const UniversityReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useAppData();
  const { showToast } = useToast();

  const instId = user?.institutionId ?? 'inst-pacific';
  const depts = state.departments.filter((d) => d.institutionId === instId);
  const students = state.universityStudents.filter((s) => s.institutionId === instId);
  const trainings = state.trainingProgrammes.filter((t) => t.institutionId === instId);

  const [reportKind, setReportKind] = useState<'department' | 'student_progress' | 'career_readiness' | 'skill_gap' | 'training'>('department');

  const handleExport = () => {
    const lines: string[] = [];
    if (reportKind === 'department') {
      lines.push('Department,Code,Head,Students,Avg Readiness %,Status');
      depts.forEach((d) => lines.push(`"${d.name}",${d.code},"${d.headName}",${d.studentCount},${d.avgReadiness},${d.status}`));
    } else if (reportKind === 'training') {
      lines.push('Training Title,Group,Enrolled,Completion %,Outcome Score %');
      trainings.forEach((t) => lines.push(`"${t.title}","${t.targetGroup}",${t.enrolledCount},${t.completionRate},${t.outcomeScore}`));
    } else {
      lines.push('Student,Department,Batch,Target Career,Readiness %,Roadmap %');
      students.forEach((s) => lines.push(`"${s.name}","${s.departmentName}","${s.batchName}","${s.targetCareer}",${s.readinessScore},${s.roadmapProgress}`));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `university-${reportKind}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Institution report exported', `Downloaded university-${reportKind}-report.csv`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={`Institution-scoped analytical exports for ${user?.institutionName}.`}
        actions={
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'department', label: 'Department Report' },
            { id: 'student_progress', label: 'Student Progress' },
            { id: 'career_readiness', label: 'Career Readiness' },
            { id: 'skill_gap', label: 'Skill Gap Summary' },
            { id: 'training', label: 'Training Outcomes' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setReportKind(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border ${
              reportKind === tab.id
                ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                : 'bg-white text-[#64748B] border-[#E2E8F0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="p-6 overflow-x-auto">
        {reportKind === 'department' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                <th className="py-2.5 pr-4">Department</th>
                <th className="py-2.5 pr-4">Head</th>
                <th className="py-2.5 pr-4 text-right">Students</th>
                <th className="py-2.5 text-right">Avg Readiness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {depts.map((d) => (
                <tr key={d.id}>
                  <td className="py-3 pr-4 font-semibold text-[#0F172A]">{d.name}</td>
                  <td className="py-3 pr-4 text-[#64748B]">{d.headName}</td>
                  <td className="py-3 pr-4 text-right font-mono tabular-nums">{d.studentCount}</td>
                  <td className="py-3 text-right font-mono tabular-nums font-semibold text-[#4F46E5]">{d.avgReadiness}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : reportKind === 'training' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                <th className="py-2.5 pr-4">Training Programme</th>
                <th className="py-2.5 pr-4">Target Group</th>
                <th className="py-2.5 pr-4 text-right">Completion</th>
                <th className="py-2.5 text-right">Outcome Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {trainings.map((t) => (
                <tr key={t.id}>
                  <td className="py-3 pr-4 font-semibold text-[#0F172A]">{t.title}</td>
                  <td className="py-3 pr-4 text-[#64748B]">{t.targetGroup}</td>
                  <td className="py-3 pr-4 text-right font-mono tabular-nums">{t.completionRate}%</td>
                  <td className="py-3 text-right font-mono tabular-nums font-semibold text-[#16A34A]">{t.outcomeScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                <th className="py-2.5 pr-4">Student</th>
                <th className="py-2.5 pr-4">Department</th>
                <th className="py-2.5 pr-4">Target Career</th>
                <th className="py-2.5 pr-4 text-right">Readiness</th>
                <th className="py-2.5 text-right">Roadmap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 pr-4 font-semibold text-[#0F172A]">{s.name}</td>
                  <td className="py-3 pr-4 text-[#64748B]">{s.departmentName}</td>
                  <td className="py-3 pr-4 text-[#0F172A]">{s.targetCareer}</td>
                  <td className="py-3 pr-4 text-right font-mono tabular-nums font-semibold text-[#4F46E5]">{s.readinessScore}%</td>
                  <td className="py-3 text-right font-mono tabular-nums">{s.roadmapProgress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
