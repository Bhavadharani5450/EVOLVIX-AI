import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, PageHeader, ProgressBar, StatCard, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

export const UniversityOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useAppData();
  const navigate = useNavigate();

  const instId = user?.institutionId ?? 'inst-pacific';
  const depts = state.departments.filter((d) => d.institutionId === instId);
  const students = state.universityStudents.filter((s) => s.institutionId === instId);
  const mentors = state.universityMentors.filter((m) => m.institutionId === instId);
  const trainings = state.trainingProgrammes.filter((t) => t.institutionId === instId);

  const totalEnrolled = depts.reduce((sum, d) => sum + d.studentCount, 0);
  const activePaths = students.filter((s) => s.status === 'active').length;
  const avgInstitutionReadiness = Math.round(
    depts.reduce((sum, d) => sum + d.avgReadiness, 0) / Math.max(depts.length, 1)
  );

  const careerDist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of students) {
      counts.set(s.targetCareer, (counts.get(s.targetCareer) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([career, count]) => ({ career, count }));
  }, [students]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${user?.institutionName ?? 'Pacific Institute of Technology'} — Overview`}
        subtitle="Institution-scoped academic operations, career readiness distribution, and active learning paths."
        actions={
          <button
            type="button"
            onClick={() => navigate('/university/career-analytics')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <span>Career Analytics</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Enrolled Students" value={totalEnrolled.toLocaleString()} helper={`${depts.length} departments`} tone="brand" />
        <StatCard label="Active Mentors" value={mentors.length} helper="Assigned across cohorts" />
        <StatCard label="Institution Avg Readiness" value={`${avgInstitutionReadiness}%`} helper={`${activePaths} tracked active paths`} tone="success" />
        <StatCard label="Active Training Programmes" value={trainings.length} helper="Skill-gap remediation tracks" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Department Statistics</h2>
            <button
              type="button"
              onClick={() => navigate('/university/departments')}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Manage Departments
            </button>
          </div>
          <div className="space-y-3.5">
            {depts.map((dept) => (
              <div key={dept.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {dept.name} <span className="text-xs font-mono text-[#64748B]">({dept.code})</span>
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Head: {dept.headName} · {dept.studentCount} students
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono tabular-nums font-semibold text-[#4F46E5]">
                      {dept.avgReadiness}% readiness
                    </span>
                    <StatusLabel
                      tone={dept.status === 'active' ? 'success' : 'neutral'}
                      text={dept.status === 'active' ? 'Active' : 'Inactive'}
                    />
                  </div>
                </div>
                <ProgressBar value={dept.avgReadiness} tone={dept.avgReadiness >= 75 ? 'success' : 'brand'} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5 p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#0F172A]">Career Target Distribution</h2>
          <div className="space-y-3">
            {careerDist.map((item) => {
              const pct = Math.round((item.count / Math.max(students.length, 1)) * 100);
              return (
                <div key={item.career} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#0F172A]">{item.career}</span>
                    <span className="font-mono tabular-nums text-[#64748B]">
                      {item.count} learners ({pct}%)
                    </span>
                  </div>
                  <ProgressBar value={pct} tone="brand" />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
