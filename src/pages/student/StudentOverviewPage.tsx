import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Sparkles, Target } from 'lucide-react';
import { Card, PageHeader, ProgressBar, StatCard, StatusLabel, WeeklyActivityChart } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

export const StudentOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useAppData();
  const navigate = useNavigate();

  const targetCareer =
    state.careerOptions.find((c) => c.id === state.careerDNA.targetCareerId) ?? state.careerOptions[0];

  // Transparent Career Readiness Score calculation
  const skillMatchAvg = Math.round(
    targetCareer.requiredSkills.reduce((acc, req) => {
      const current = state.careerDNA.technicalSkills.find((s) => s.name === req.name)?.proficiency ?? 45;
      return acc + Math.min(100, (current / req.requiredLevel) * 100);
    }, 0) / Math.max(targetCareer.requiredSkills.length, 1)
  );

  const allTasks = state.roadmapStages.flatMap((s) => s.tasks);
  const completedTasksCount = allTasks.filter((t) => t.completed).length;
  const roadmapPct = Math.round((completedTasksCount / Math.max(allTasks.length, 1)) * 100);

  const verifiedEvidenceCount = state.careerDNA.evidenceHistory.filter((e) => e.status === 'verified').length;
  const evidenceScore = Math.min(100, verifiedEvidenceCount * 22);

  // Formula: 50% Skill Fit + 30% Roadmap Progress + 20% Verified Evidence
  const readinessScore = Math.round(skillMatchAvg * 0.5 + roadmapPct * 0.3 + evidenceScore * 0.2);

  const completedMissions = state.missions.filter((m) => m.status === 'completed');
  const pendingChallenges = state.practiceChallenges.filter((c) => !c.completed);
  const totalWeeklyHours = state.weeklyActivityHours.reduce((sum, d) => sum + d.hours, 0).toFixed(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0] ?? 'Alex'}`}
        subtitle={`${state.studentProfile.university} · ${state.studentProfile.programme} · ${state.studentProfile.batchYear}`}
        actions={
          <button
            type="button"
            onClick={() => navigate('/student/learning-path')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <span>Continue Learning Path</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        }
      />

      {/* Top KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Career Readiness Score"
          value={`${readinessScore}%`}
          helper={`Target: ${targetCareer.title}`}
          tone="brand"
        />
        <StatCard
          label="Roadmap Completion"
          value={`${roadmapPct}%`}
          helper={`${completedTasksCount} of ${allTasks.length} tasks finished`}
          tone="success"
        />
        <StatCard
          label="Weekly Learning Activity"
          value={`${totalWeeklyHours} hrs`}
          helper={`Budget: ${state.careerDNA.weeklyHoursBudget} hrs/week`}
        />
        <StatCard
          label="Completed Missions"
          value={completedMissions.length}
          helper={`${state.missions.length - completedMissions.length} active or available`}
        />
      </div>

      {/* Transparent Readiness Formula + Career Target */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">Transparent Readiness Breakdown</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Formula: 50% Skill Match + 30% Roadmap Execution + 20% Verified Evidence
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/student/pathfinder')}
              className="text-xs font-medium text-[#4F46E5] hover:underline whitespace-nowrap"
            >
              Change Target
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Active Career Target</p>
                <p className="text-sm font-semibold text-[#0F172A]">{targetCareer.title}</p>
              </div>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#64748B]">
              {targetCareer.matchScore}% role fit · {targetCareer.growthOutlook}
            </span>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-[#0F172A]">Skill Match (Weight 50%)</span>
                <span className="font-mono tabular-nums text-[#64748B]">{skillMatchAvg}%</span>
              </div>
              <ProgressBar value={skillMatchAvg} tone="brand" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-[#0F172A]">Roadmap Execution (Weight 30%)</span>
                <span className="font-mono tabular-nums text-[#64748B]">{roadmapPct}%</span>
              </div>
              <ProgressBar value={roadmapPct} tone="success" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-[#0F172A]">Verified Evidence (Weight 20%)</span>
                <span className="font-mono tabular-nums text-[#64748B]">{evidenceScore}% ({verifiedEvidenceCount} verified)</span>
              </div>
              <ProgressBar value={evidenceScore} tone="accent" />
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-5 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">Weekly Learning Activity</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Daily logged focus hours against 2.0h daily cadence</p>
          </div>
          <WeeklyActivityChart
            data={state.weeklyActivityHours.map((d) => ({ label: d.day, value: d.hours, target: d.target }))}
          />
        </Card>
      </div>

      {/* Skill Progress & Learning Roadmap Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Core Skill Progress</h2>
            <button
              type="button"
              onClick={() => navigate('/student/skill-gap')}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Inspect Skill Gaps
            </button>
          </div>
          <div className="space-y-3">
            {state.careerDNA.technicalSkills.slice(0, 5).map((skill) => (
              <div key={skill.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#0F172A]">
                    {skill.name} <span className="text-[#64748B] font-normal">· {skill.category}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[#64748B]">
                    {skill.proficiency}% / {skill.target}%
                  </span>
                </div>
                <ProgressBar
                  value={skill.proficiency}
                  tone={skill.proficiency >= skill.target ? 'success' : 'brand'}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Learning Roadmap Summary</h2>
            <button
              type="button"
              onClick={() => navigate('/student/learning-path')}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Open Full Roadmap
            </button>
          </div>
          <div className="space-y-3">
            {state.roadmapStages.map((stage) => {
              const done = stage.tasks.filter((t) => t.completed).length;
              return (
                <div
                  key={stage.id}
                  className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0F172A] truncate">
                      Stage {stage.stageNumber}: {stage.title}
                    </p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {stage.focusArea} · {done}/{stage.tasks.length} tasks
                    </p>
                  </div>
                  <StatusLabel
                    tone={
                      stage.status === 'completed'
                        ? 'success'
                        : stage.status === 'active'
                        ? 'info'
                        : 'neutral'
                    }
                    text={
                      stage.status === 'completed'
                        ? 'Completed'
                        : stage.status === 'active'
                        ? 'In Progress'
                        : 'Upcoming'
                    }
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Upcoming Assessments, AI Recommendations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Upcoming Assessments</h2>
            <button
              type="button"
              onClick={() => navigate('/student/practice-lab')}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Practice Lab
            </button>
          </div>
          <div className="space-y-2.5">
            {pendingChallenges.slice(0, 3).map((ch) => (
              <div key={ch.id} className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                <p className="text-xs font-semibold text-[#0F172A]">{ch.title}</p>
                <p className="text-[11px] text-[#64748B] mt-1">
                  {ch.kind} · {ch.topic} · {ch.difficulty}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">AI Recommendations</h2>
            <button
              type="button"
              onClick={() => navigate('/student/mentor-council')}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Ask Council
            </button>
          </div>
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4F46E5]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Priority Competency Action</span>
              </div>
              <p className="text-xs text-[#0F172A] leading-relaxed">
                Closing your Docker & Kubernetes gap (+28 pts) lifts your Applied ML Systems readiness from {readinessScore}% to 84%.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <p className="text-xs font-semibold text-[#0F172A]">Next Mission Ready</p>
              <p className="text-xs text-[#64748B]">
                Submit your Token-Bucket Rate Limiter implementation to unlock Stage 3 orchestration labs.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Recent Activity</h2>
            <button
              type="button"
              onClick={() => navigate('/student/career-dna')}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Evidence Log
            </button>
          </div>
          <ul className="space-y-3">
            {state.careerDNA.evidenceHistory.slice(0, 4).map((ev) => (
              <li key={ev.id} className="flex items-start gap-2.5 text-xs">
                {ev.status === 'verified' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-[#0F172A] truncate">{ev.title}</p>
                  <p className="text-[#64748B] mt-0.5">
                    {ev.skill} · {ev.date}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};
