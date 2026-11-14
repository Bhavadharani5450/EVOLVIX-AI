import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Calendar, ClipboardCheck } from 'lucide-react';
import { Card, PageHeader, ProgressBar, StatCard, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

export const MentorOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useAppData();
  const navigate = useNavigate();

  const assignedStudents = state.mentorAssignedStudents.filter((s) => s.mentorId === (user?.id ?? 'men-maya'));
  const atRiskStudents = assignedStudents.filter((s) => s.atRisk);
  const activeSessions = state.mentoringSessions.filter((s) => s.status === 'scheduled');
  const pendingReviews = state.assessmentReviews.filter((r) => r.status === 'pending');

  const avgProgress = Math.round(
    assignedStudents.reduce((acc, s) => acc + s.roadmapProgress, 0) / Math.max(assignedStudents.length, 1)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Mentor Workspace · ${user?.name ?? 'Dr. Maya Lin'}`}
        subtitle={`Scoped strictly to your ${assignedStudents.length} assigned students at ${user?.institutionName}.`}
        actions={
          <button
            type="button"
            onClick={() => navigate('/mentor/assessment-review')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Review Pending ({pendingReviews.length})</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Assigned Students" value={assignedStudents.length} helper="Active cohort scope" tone="brand" />
        <StatCard label="Active Mentoring Sessions" value={activeSessions.length} helper="Scheduled 1:1 reviews" />
        <StatCard label="Pending Assessment Reviews" value={pendingReviews.length} helper="Awaiting marks & feedback" tone="warning" />
        <StatCard label="Cohort Avg Roadmap Progress" value={`${avgProgress}%`} helper={`${atRiskStudents.length} learners flagged at-risk`} tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Student Progress */}
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Assigned Student Progress</h2>
            <button
              type="button"
              onClick={() => navigate('/mentor/students')}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              View All Students
            </button>
          </div>
          <div className="space-y-3.5">
            {assignedStudents.map((stu) => (
              <div key={stu.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{stu.name}</p>
                    <p className="text-xs text-[#64748B]">
                      {stu.department} · {stu.targetCareer}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums font-semibold text-[#0F172A]">
                    Readiness {stu.readinessScore}% · Roadmap {stu.roadmapProgress}%
                  </span>
                </div>
                <ProgressBar value={stu.roadmapProgress} tone={stu.atRisk ? 'warning' : 'brand'} />
              </div>
            ))}
          </div>
        </Card>

        {/* At-Risk Learners */}
        <Card className="lg:col-span-5 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
            <h2 className="text-base font-semibold text-[#0F172A]">At-Risk Learners ({atRiskStudents.length})</h2>
          </div>
          <div className="space-y-3">
            {atRiskStudents.map((stu) => (
              <div key={stu.id} className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#0F172A]">{stu.name}</p>
                  <StatusLabel tone="warning" text={`Readiness ${stu.readinessScore}%`} />
                </div>
                <p className="text-xs text-[#64748B]">{stu.riskReason}</p>
                <button
                  type="button"
                  onClick={() => navigate('/mentor/learning-roadmaps')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F46E5] hover:underline"
                >
                  <span>Inspect Roadmap & Intervene</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Upcoming Sessions & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4F46E5]" />
              <h2 className="text-base font-semibold text-[#0F172A]">Upcoming Mentoring Sessions</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/mentor/sessions')}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Manage Sessions
            </button>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {activeSessions.map((ses) => (
              <div key={ses.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{ses.topic}</p>
                  <p className="text-xs text-[#64748B]">
                    {ses.studentName} · {ses.scheduledDate} at {ses.scheduledTime} ({ses.durationMinutes} min)
                  </p>
                </div>
                <StatusLabel tone="info" text="Scheduled" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#0F172A]">Recent Cohort Activities</h2>
          <div className="divide-y divide-[#E2E8F0] text-sm">
            {state.assessmentReviews.slice(0, 3).map((rev) => (
              <div key={rev.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#0F172A]">
                    {rev.studentName} submitted {rev.title}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {rev.type} · {rev.submittedAt}
                  </p>
                </div>
                <StatusLabel
                  tone={rev.status === 'approved' ? 'success' : rev.status === 'pending' ? 'warning' : 'error'}
                  text={rev.status === 'approved' ? 'Approved' : rev.status === 'pending' ? 'Pending' : 'Revision'}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
