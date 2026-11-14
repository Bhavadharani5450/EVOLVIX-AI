import React, { useState } from 'react';
import { Compass, Send, Plus, CheckCircle2, FileText } from 'lucide-react';
import { Card, PageHeader, ProgressBar, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { DiscoverySession } from '../../types/evolvix';

const ADAPTIVE_QUESTIONS = [
  'Which technical problems do you lose track of time solving—model training, low-latency infrastructure, or user-facing product engineering?',
  'How do you prefer to handle ambiguous project requirements?',
  'When debugging a production bottleneck, do you gravitate toward SQL profiling, distributed tracing, or UI state inspection?',
  'What kind of team environment brings out your best work: independent deep-work sprints or tight cross-functional pairing?',
  'Describe one engineering project you felt proudest of and what measurable outcome it achieved.',
  'Over the next 6 months, would you rather specialize deeply in infrastructure reliability or ship rapid end-to-end AI applications?',
];

export const CareerDiscoveryPage: React.FC = () => {
  const { state, updateState, executeAiTask } = useAppData();
  const { showToast } = useToast();

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    state.discoverySessions[0]?.id ?? ''
  );
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeSession =
    state.discoverySessions.find((s) => s.id === selectedSessionId) ?? state.discoverySessions[0];

  const handleStartNewSession = () => {
    const newId = `disc-${Date.now()}`;
    const newSession: DiscoverySession = {
      id: newId,
      title: `Career Discovery Interview · ${new Date().toLocaleDateString()}`,
      status: 'in_progress',
      progress: 17,
      startedAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      currentStep: 1,
      totalSteps: 6,
      messages: [
        {
          id: `dm-${Date.now()}`,
          sender: 'ai',
          text: ADAPTIVE_QUESTIONS[0],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dimension: 'Intrinsic Motivation',
        },
      ],
    };
    updateState((prev) => ({
      ...prev,
      discoverySessions: [newSession, ...prev.discoverySessions],
    }));
    setSelectedSessionId(newId);
    showToast('New interview started', 'Answer the adaptive prompt to calibrate your Career Discovery profile.');
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !replyText.trim() || activeSession.status === 'completed') return;

    setSubmitting(true);
    const trimmed = replyText.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nextStep = Math.min(activeSession.totalSteps, activeSession.currentStep + 1);
    const isNowComplete = activeSession.currentStep >= activeSession.totalSteps;

    try {
      const aiRes = await executeAiTask<{ text?: string }>('discovery_followup', trimmed, {
        step: activeSession.currentStep,
        targetCareer: state.careerDNA.targetCareerTitle,
      });

      const followUpQuestion = isNowComplete
        ? 'Thank you—all 6 adaptive dimensions are captured. Your Career Discovery 360 report has been generated below.'
        : `${aiRes.result.text ? aiRes.result.text + ' ' : ''}${ADAPTIVE_QUESTIONS[Math.min(nextStep - 1, ADAPTIVE_QUESTIONS.length - 1)]}`;

      updateState((prev) => ({
        ...prev,
        discoverySessions: prev.discoverySessions.map((sess) => {
          if (sess.id !== activeSession.id) return sess;
          return {
            ...sess,
            status: isNowComplete ? 'completed' : 'in_progress',
            currentStep: nextStep,
            progress: isNowComplete ? 100 : Math.round((nextStep / sess.totalSteps) * 100),
            updatedAt: new Date().toISOString().slice(0, 10),
            messages: [
              ...sess.messages,
              { id: `dm-u-${Date.now()}`, sender: 'student', text: trimmed, timestamp: nowTime },
              {
                id: `dm-a-${Date.now() + 1}`,
                sender: 'ai',
                text: followUpQuestion,
                timestamp: nowTime,
                dimension: isNowComplete ? 'Synthesis' : `Dimension ${nextStep}`,
              },
            ],
            summary: isNowComplete
              ? {
                  topThemes: ['Systems Reliability', 'Measurable Benchmarking', 'Applied AI Tooling'],
                  recommendedTracks: ['Applied ML Systems Engineer', 'Full-Stack AI Product Engineer'],
                  workStyle: 'Structured hypothesis-driven builder balancing architecture RFCs with rapid prototyping.',
                  confidence: 94,
                }
              : sess.summary,
          };
        }),
      }));

      setReplyText('');
      showToast(
        isNowComplete ? 'Discovery interview completed' : 'Response recorded',
        isNowComplete ? 'Your Career Discovery 360 report is ready.' : `Advanced to step ${nextStep} of ${activeSession.totalSteps}.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const completedWithReport =
    activeSession?.summary ?? state.discoverySessions.find((s) => s.summary)?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Discovery 360"
        subtitle="Adaptive AI career discovery interview, saved session continuity, and interest synthesis."
        actions={
          <button
            type="button"
            onClick={handleStartNewSession}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Start New Interview</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Session History Sidebar */}
        <Card className="lg:col-span-4 p-5 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-[#0F172A]">Session History</h2>
          <div className="space-y-2.5">
            {state.discoverySessions.map((session) => {
              const selected = session.id === activeSession?.id;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                    selected
                      ? 'bg-indigo-50/70 border-indigo-300'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-[#0F172A] leading-snug">{session.title}</p>
                    <StatusLabel
                      tone={session.status === 'completed' ? 'success' : 'info'}
                      text={session.status === 'completed' ? 'Done' : `${session.progress}%`}
                    />
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1.5 font-mono tabular-nums">
                    Updated {session.updatedAt} · Step {session.currentStep}/{session.totalSteps}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Active Interview Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {activeSession && (
            <Card className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#4F46E5]" />
                    <h2 className="text-base font-semibold text-[#0F172A]">{activeSession.title}</h2>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 font-mono tabular-nums">
                    Step {activeSession.currentStep} of {activeSession.totalSteps} · {activeSession.progress}% complete
                  </p>
                </div>
                <div className="w-full sm:w-44">
                  <ProgressBar
                    value={activeSession.progress}
                    tone={activeSession.status === 'completed' ? 'success' : 'brand'}
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {activeSession.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border ${
                      msg.sender === 'ai'
                        ? 'bg-[#F8FAFC] border-[#E2E8F0]'
                        : 'bg-indigo-50/70 border-indigo-200 ml-6'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1">
                      <span className="font-semibold text-[#0F172A]">
                        {msg.sender === 'ai' ? 'EVOLVIX Discovery Interviewer' : 'Your Response'}
                        {msg.dimension ? ` · ${msg.dimension}` : ''}
                      </span>
                      <span className="font-mono tabular-nums">{msg.timestamp}</span>
                    </div>
                    <p className="text-sm text-[#0F172A] leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              {activeSession.status === 'in_progress' ? (
                <form onSubmit={handleSubmitResponse} className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                  <label htmlFor="discovery-reply" className="block text-xs font-semibold text-[#0F172A]">
                    Continue Saved Interview
                  </label>
                  <textarea
                    id="discovery-reply"
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Describe your technical preferences, workflows, or engineering strengths..."
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#64748B]">
                      Adaptive interviewer calibrates your Career DNA after submission.
                    </span>
                    <button
                      type="submit"
                      disabled={submitting || !replyText.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitting ? 'Analyzing...' : 'Submit Response'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-2.5 text-sm text-[#16A34A]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Interview completed. Review your Career Discovery Report below or start a fresh check-in.</span>
                </div>
              )}
            </Card>
          )}

          {/* Career Discovery Report & Interest Summary */}
          {completedWithReport && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4F46E5]" />
                  <h2 className="text-base font-semibold text-[#0F172A]">Career Discovery Report & Interest Summary</h2>
                </div>
                <span className="text-xs font-mono tabular-nums text-[#16A34A] font-semibold">
                  {completedWithReport.confidence}% Signal Confidence
                </span>
              </div>

              <p className="text-sm text-[#0F172A] leading-relaxed">{completedWithReport.workStyle}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-xs font-semibold text-[#64748B] mb-2">Identified Career Themes</p>
                  <ul className="space-y-1.5 text-sm text-[#0F172A]">
                    {completedWithReport.topThemes.map((theme) => (
                      <li key={theme}>• {theme}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-xs font-semibold text-[#64748B] mb-2">Recommended Tracks</p>
                  <ul className="space-y-1.5 text-sm text-[#4F46E5] font-medium">
                    {completedWithReport.recommendedTracks.map((track) => (
                      <li key={track}>• {track}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
