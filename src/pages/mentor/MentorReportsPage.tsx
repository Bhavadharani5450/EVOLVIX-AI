import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Card, PageHeader, StatCard } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const MentorReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useAppData();
  const { showToast } = useToast();

  const [reportType, setReportType] = useState<'performance' | 'assessment' | 'skill_gap' | 'learning_progress'>('performance');

  const assigned = state.mentorAssignedStudents.filter((s) => s.mentorId === (user?.id ?? 'men-maya'));

  const avgReadiness = Math.round(
    assigned.reduce((sum, s) => sum + s.readinessScore, 0) / Math.max(assigned.length, 1)
  );
  const avgProgress = Math.round(
    assigned.reduce((sum, s) => sum + s.roadmapProgress, 0) / Math.max(assigned.length, 1)
  );

  const handleExport = () => {
    const lines = ['Student,Department,Target Career,Readiness %,Roadmap %,Status'];
    for (const s of assigned) {
      lines.push(
        `"${s.name}","${s.department}","${s.targetCareer}",${s.readinessScore},${s.roadmapProgress},${s.atRisk ? 'At Risk' : 'On Track'}`
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mentor-${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report exported', `Downloaded mentor-${reportType}-report.csv`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Generate and export student performance, assessment, skill gap, and learning progress reports."
        actions={
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Download className="w-4 h-4" />
            <span>Export Report CSV</span>
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'performance', label: 'Student Performance' },
            { id: 'assessment', label: 'Assessment Report' },
            { id: 'skill_gap', label: 'Skill Gap Report' },
            { id: 'learning_progress', label: 'Learning Progress' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setReportType(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border ${
              reportType === tab.id
                ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                : 'bg-white text-[#64748B] border-[#E2E8F0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Assigned Students" value={assigned.length} />
        <StatCard label="Average Readiness" value={`${avgReadiness}%`} tone="brand" />
        <StatCard label="Average Roadmap Progress" value={`${avgProgress}%`} tone="success" />
      </div>

      <Card className="p-6 overflow-x-auto">
        <h2 className="text-base font-semibold text-[#0F172A] mb-4">
          {reportType === 'performance'
            ? 'Cohort Performance Summary'
            : reportType === 'assessment'
            ? 'Assessment Outcomes by Submission'
            : reportType === 'skill_gap'
            ? 'Competency Gap Summary'
            : 'Learning Roadmap Velocity'}
        </h2>
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
            {assigned.map((s) => (
              <tr key={s.id}>
                <td className="py-3 pr-4 font-medium text-[#0F172A]">{s.name}</td>
                <td className="py-3 pr-4 text-[#64748B]">{s.department}</td>
                <td className="py-3 pr-4 text-[#0F172A]">{s.targetCareer}</td>
                <td className="py-3 pr-4 text-right font-mono tabular-nums font-semibold text-[#4F46E5]">
                  {s.readinessScore}%
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-[#0F172A]">{s.roadmapProgress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
