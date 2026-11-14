import React, { useState } from 'react';
import { CheckSquare, LifeBuoy, RefreshCw, Square, History } from 'lucide-react';
import { Card, PageHeader, ProgressBar, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const LearningPathPage: React.FC = () => {
  const { state, updateState, executeAiTask } = useAppData();
  const { showToast } = useToast();
  const [adapting, setAdapting] = useState(false);

  const allTasks = state.roadmapStages.flatMap((s) => s.tasks);
  const completedTasks = allTasks.filter((t) => t.completed);
  const totalHours = allTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const remainingHours = allTasks.filter((t) => !t.completed).reduce((sum, t) => sum + t.estimatedHours, 0);
  const progressPct = Math.round((completedTasks.length / Math.max(allTasks.length, 1)) * 100);

  const isPrerequisiteMet = (prereqIds: string[]) =>
    prereqIds.every((pid) => allTasks.find((t) => t.id === pid)?.completed);

  const handleToggleTask = (stageId: string, taskId: string, prereqIds: string[], currentlyDone: boolean) => {
    if (!currentlyDone && !isPrerequisiteMet(prereqIds)) {
      showToast('Prerequisite incomplete', 'Complete the prerequisite task first before unlocking this step.', 'error');
      return;
    }

    updateState((prev) => {
      const nextStages = prev.roadmapStages.map((stage) => {
        if (stage.id !== stageId) return stage;
        const nextTasks = stage.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
        const allDone = nextTasks.every((t) => t.completed);
        const anyDone = nextTasks.some((t) => t.completed);
        return {
          ...stage,
          tasks: nextTasks,
          status: allDone ? ('completed' as const) : anyDone ? ('active' as const) : ('upcoming' as const),
        };
      });
      return { ...prev, roadmapStages: nextStages };
    });
    showToast(currentlyDone ? 'Task marked incomplete' : 'Task completed', 'Learning path progress updated.');
  };

  const handleAdaptRoadmap = async () => {
    setAdapting(true);
    try {
      const aiRes = await executeAiTask<{ text?: string }>('roadmap_adapt', 'Adapt roadmap after recent assessments', {
        progressPct,
        rescueMode: state.rescueModeActive,
      });

      const adjustmentText =
        aiRes.result.text || 'Re-weighted Stage 3 toward Kubernetes readiness probes based on Practice Lab scores.';
      updateState((prev) => ({
        ...prev,
        roadmapHistory: [
          {
            id: `rh-${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            reason: 'Manual Adaptive Recalibration',
            adjustment: adjustmentText,
          },
          ...prev.roadmapHistory,
        ],
      }));
      showToast('Roadmap adapted', 'Updated stage priorities and logged adaptation history.');
    } finally {
      setAdapting(false);
    }
  };

  const handleToggleRescueMode = () => {
    const nextState = !state.rescueModeActive;
    updateState((prev) => ({
      ...prev,
      rescueModeActive: nextState,
      roadmapHistory: [
        {
          id: `rh-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          reason: nextState ? 'Roadmap Rescue Mode Activated' : 'Roadmap Rescue Mode Deactivated',
          adjustment: nextState
            ? 'Reduced weekly effort target by 35% and prioritized foundational prerequisite drills.'
            : 'Restored standard milestone pacing.',
        },
        ...prev.roadmapHistory,
      ],
    }));
    showToast(
      nextState ? 'Roadmap Rescue Mode activated' : 'Standard pacing restored',
      nextState ? 'Tasks are now paced into lighter recovery blocks.' : 'Full milestone velocity resumed.'
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adaptive Learning Path"
        subtitle="Staged personalized curriculum with prerequisite locks, effort estimates, and Rescue Mode pacing."
        actions={
          <>
            <button
              type="button"
              onClick={handleToggleRescueMode}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                state.rescueModeActive
                  ? 'bg-amber-50 border-amber-300 text-[#D97706]'
                  : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              <LifeBuoy className="w-4 h-4" />
              <span>{state.rescueModeActive ? 'Rescue Mode Active' : 'Activate Rescue Mode'}</span>
            </button>
            <button
              type="button"
              onClick={handleAdaptRoadmap}
              disabled={adapting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${adapting ? 'animate-spin' : ''}`} />
              <span>{adapting ? 'Adapting...' : 'Adapt Roadmap'}</span>
            </button>
          </>
        }
      />

      {state.rescueModeActive && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
          <div className="text-sm text-[#0F172A]">
            <strong className="text-[#D97706]">Roadmap Rescue Mode is active:</strong> Weekly scope reduced to 8.5h/week
            with emphasis on closing Stage 2 prerequisites before advancing.
          </div>
        </div>
      )}

      {/* Summary Strip */}
      <Card className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
        <div className="sm:col-span-2 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-[#0F172A]">Overall Roadmap Progress</span>
            <span className="font-mono tabular-nums font-semibold text-[#4F46E5]">
              {progressPct}% ({completedTasks.length}/{allTasks.length} tasks)
            </span>
          </div>
          <ProgressBar value={progressPct} tone="brand" />
        </div>
        <div>
          <p className="text-xs text-[#64748B]">Estimated Total Effort</p>
          <p className="text-lg font-bold font-mono tabular-nums text-[#0F172A]">{totalHours} hrs</p>
        </div>
        <div>
          <p className="text-xs text-[#64748B]">Remaining Effort</p>
          <p className="text-lg font-bold font-mono tabular-nums text-[#0F172A]">{remainingHours} hrs</p>
        </div>
      </Card>

      {/* Learning Stages */}
      <div className="space-y-4">
        {state.roadmapStages.map((stage) => (
          <Card key={stage.id} className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">
                  Stage {stage.stageNumber}: {stage.title}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">{stage.focusArea}</p>
              </div>
              <StatusLabel
                tone={
                  stage.status === 'completed' ? 'success' : stage.status === 'active' ? 'info' : 'neutral'
                }
                text={
                  stage.status === 'completed'
                    ? 'Completed'
                    : stage.status === 'active'
                    ? 'Active Stage'
                    : 'Upcoming'
                }
              />
            </div>

            <div className="space-y-2.5">
              {stage.tasks.map((task) => {
                const prereqMet = isPrerequisiteMet(task.prerequisiteIds);
                const prereqNames = task.prerequisiteIds
                  .map((pid) => allTasks.find((t) => t.id === pid)?.title)
                  .filter(Boolean);

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      task.completed
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : prereqMet
                        ? 'bg-[#F8FAFC] border-[#E2E8F0]'
                        : 'bg-slate-50 border-[#E2E8F0] opacity-75'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTask(stage.id, task.id, task.prerequisiteIds, task.completed)}
                      className="flex items-start gap-3 text-left"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-5 h-5 text-[#64748B] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            task.completed ? 'line-through text-[#64748B]' : 'text-[#0F172A]'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Type: {task.type} · Est. {task.estimatedHours}h
                          {prereqNames.length > 0 && ` · Prereq: ${prereqNames.join(', ')}`}
                        </p>
                      </div>
                    </button>
                    <span className="text-xs font-mono tabular-nums text-[#64748B] shrink-0">
                      {task.completed ? 'Done' : prereqMet ? 'Ready' : 'Locked'}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Roadmap History */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#4F46E5]" />
          <h2 className="text-base font-semibold text-[#0F172A]">Roadmap Adaptation History</h2>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          {state.roadmapHistory.map((entry) => (
            <div key={entry.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[#0F172A]">{entry.reason}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{entry.adjustment}</p>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#64748B] shrink-0">{entry.date}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
