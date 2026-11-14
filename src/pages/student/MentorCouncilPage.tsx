import React, { useState } from 'react';
import { Bot, CheckCircle2, Send } from 'lucide-react';
import { Card, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { AgentOutput, MentorCouncilConversation } from '../../types/evolvix';

export const MentorCouncilPage: React.FC = () => {
  const { state, updateState, executeAiTask } = useAppData();
  const { showToast } = useToast();

  const [question, setQuestion] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string>(state.councilThreads[0]?.id ?? '');
  const [running, setRunning] = useState(false);

  const activeThread =
    state.councilThreads.find((t) => t.id === selectedThreadId) ?? state.councilThreads[0];

  const handleAskCouncil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setRunning(true);
    const trimmed = question.trim();

    try {
      const aiRes = await executeAiTask<{
        agentOutputs?: AgentOutput[];
        finalSynthesis?: string;
        actionItems?: string[];
      }>('mentor_council', trimmed, {
        targetCareer: state.careerDNA.targetCareerTitle,
        skills: state.careerDNA.technicalSkills.map((s) => `${s.name}:${s.proficiency}%`),
      });

      const newThread: MentorCouncilConversation = {
        id: `mc-${Date.now()}`,
        question: trimmed,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        status: 'completed',
        agentOutputs: aiRes.result.agentOutputs ?? [],
        finalSynthesis: aiRes.result.finalSynthesis ?? 'Council synthesis complete.',
        actionItems: aiRes.result.actionItems ?? [],
      };

      updateState((prev) => ({
        ...prev,
        councilThreads: [newThread, ...prev.councilThreads],
      }));
      setSelectedThreadId(newThread.id);
      setQuestion('');
      showToast('MentorMind Council completed', 'All 3 specialist agents collaborated on your recommendation.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="MentorMind Council"
        subtitle="Ask career or skill questions and inspect multi-agent collaboration, individual agent perspectives, and unified recommendations."
      />

      {/* Ask Council Form */}
      <Card className="p-6 space-y-4">
        <form onSubmit={handleAskCouncil} className="space-y-3">
          <label htmlFor="council-question" className="block text-sm font-semibold text-[#0F172A]">
            Consult the MentorMind Council
          </label>
          <textarea
            id="council-question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a career question or request skill prioritization (e.g., Which distributed systems project should I build next?)..."
            className="w-full p-3.5 rounded-xl border border-[#E2E8F0] text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                'Which skill gap gives me the fastest readiness boost?',
                'Should I add a Kubernetes capstone project this month?',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuestion(preset)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B] hover:text-[#0F172A]"
                >
                  {preset}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={running || !question.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{running ? 'Convening Agents...' : 'Ask Council'}</span>
            </button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Previous Conversations */}
        <Card className="lg:col-span-4 p-5 space-y-3 h-fit">
          <h2 className="text-sm font-semibold text-[#0F172A]">Previous Conversations</h2>
          <div className="space-y-2.5">
            {state.councilThreads.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setSelectedThreadId(th.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                  th.id === activeThread?.id
                    ? 'bg-indigo-50/70 border-indigo-300'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-slate-100/70'
                }`}
              >
                <p className="text-xs font-semibold text-[#0F172A] line-clamp-2">{th.question}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] font-mono tabular-nums text-[#64748B]">{th.createdAt}</span>
                  <StatusLabel tone="success" text={th.status === 'completed' ? 'Completed' : 'Running'} />
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Agent Collaboration & Outputs */}
        <div className="lg:col-span-8 space-y-5">
          {activeThread && (
            <>
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#4F46E5]" />
                    <h2 className="text-base font-semibold text-[#0F172A]">Agent Execution & Collaboration</h2>
                  </div>
                  <StatusLabel
                    tone={running ? 'info' : 'success'}
                    text={running ? 'Executing Agents' : 'All Agents Completed'}
                  />
                </div>
                <p className="text-sm font-medium text-[#0F172A] p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  “{activeThread.question}”
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activeThread.agentOutputs.map((ag) => (
                    <div key={ag.agentName} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#4F46E5]">{ag.agentName}</p>
                        <span className="text-[11px] font-mono tabular-nums text-[#64748B]">{ag.confidence}%</span>
                      </div>
                      <p className="text-[11px] font-medium text-[#64748B]">{ag.role}</p>
                      <p className="text-xs text-[#0F172A] leading-relaxed">{ag.perspective}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h2 className="text-base font-semibold text-[#0F172A]">Final Council Recommendation</h2>
                <p className="text-sm text-[#0F172A] leading-relaxed">{activeThread.finalSynthesis}</p>
                <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                  <p className="text-xs font-semibold text-[#64748B]">Recommended Next Actions</p>
                  <ul className="space-y-1.5">
                    {activeThread.actionItems.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-[#0F172A]">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
