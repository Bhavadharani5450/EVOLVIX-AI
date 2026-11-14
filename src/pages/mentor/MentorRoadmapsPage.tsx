import React, { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Card, PageHeader, ProgressBar } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const MentorRoadmapsPage: React.FC = () => {
  const { user } = useAuth();
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const assigned = state.mentorAssignedStudents.filter((s) => s.mentorId === (user?.id ?? 'men-maya'));
  const [selectedStudentId, setSelectedStudentId] = useState(assigned[0]?.id ?? '');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const student = assigned.find((s) => s.id === selectedStudentId) ?? assigned[0];

  const handleSaveComment = (stageId: string, defaultNote: string) => {
    if (!student) return;
    const text = (notesDraft[stageId] ?? defaultNote).trim();
    updateState((prev) => ({
      ...prev,
      mentorAssignedStudents: prev.mentorAssignedStudents.map((stu) => {
        if (stu.id !== student.id) return stu;
        return {
          ...stu,
          roadmapStages: stu.roadmapStages.map((st) => (st.id === stageId ? { ...st, mentorNote: text } : st)),
        };
      }),
    }));
    showToast('Mentor comment saved', `Updated roadmap guidance for ${student.name}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Roadmaps"
        subtitle="Inspect assigned students' learning roadmaps, completed tasks, and attach stage-level mentor guidance."
        actions={
          <select
            aria-label="Select assigned student roadmap"
            value={student?.id}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium"
          >
            {assigned.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.roadmapProgress}% complete
              </option>
            ))}
          </select>
        }
      />

      {student && (
        <div className="space-y-4">
          <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">{student.name} — {student.targetCareer}</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {student.department} · {student.batch}
              </p>
            </div>
            <div className="w-full sm:w-56 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#64748B]">Overall Progress</span>
                <span className="font-mono tabular-nums font-semibold text-[#4F46E5]">{student.roadmapProgress}%</span>
              </div>
              <ProgressBar value={student.roadmapProgress} tone={student.atRisk ? 'warning' : 'brand'} />
            </div>
          </Card>

          {student.roadmapStages.map((stage) => (
            <Card key={stage.id} className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">{stage.title}</h3>
                  <p className="text-xs text-[#64748B] font-mono tabular-nums mt-0.5">
                    {stage.tasksCompleted} of {stage.totalTasks} tasks completed · {stage.progress}%
                  </p>
                </div>
                <div className="w-40">
                  <ProgressBar value={stage.progress} tone={stage.progress === 100 ? 'success' : 'brand'} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#E2E8F0]">
                <input
                  type="text"
                  value={notesDraft[stage.id] ?? stage.mentorNote}
                  onChange={(e) => setNotesDraft((p) => ({ ...p, [stage.id]: e.target.value }))}
                  placeholder="Add mentor comment or recommended roadmap adjustment..."
                  className="flex-1 px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleSaveComment(stage.id, stage.mentorNote)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 shrink-0"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>Save Comment</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
