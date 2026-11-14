import React, { useMemo, useState } from 'react';
import { Bookmark, Search, Sparkles } from 'lucide-react';
import { Card, PageHeader, ProgressBar, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { OpportunitySpec } from '../../types/evolvix';

export const OpportunitiesPage: React.FC = () => {
  const { state, updateState, executeAiTask } = useAppData();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [selectedOppId, setSelectedOppId] = useState<string>(state.opportunities[0]?.id ?? '');
  const [customSpecText, setCustomSpecText] = useState('');
  const [analysisOutput, setAnalysisOutput] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);

  const filteredOpps = useMemo(() => {
    return state.opportunities.filter((opp) => {
      const matchesQuery =
        !query.trim() ||
        opp.title.toLowerCase().includes(query.toLowerCase()) ||
        opp.track.toLowerCase().includes(query.toLowerCase());
      const matchesType = typeFilter === 'ALL' || opp.type === typeFilter;
      const matchesSkill =
        skillFilter === 'ALL' || opp.requiredCompetencies.some((c) => c.skill === skillFilter);
      return matchesQuery && matchesType && matchesSkill;
    });
  }, [state.opportunities, query, typeFilter, skillFilter]);

  const selectedOpp =
    state.opportunities.find((o) => o.id === selectedOppId) ?? filteredOpps[0] ?? state.opportunities[0];

  const handleToggleSave = (id: string) => {
    updateState((prev) => ({
      ...prev,
      opportunities: prev.opportunities.map((o) =>
        o.id === id
          ? {
              ...o,
              saved: !o.saved,
              applicationStatus: !o.saved && o.applicationStatus === 'not_applied' ? 'saved' : o.applicationStatus,
            }
          : o
      ),
    }));
  };

  const handleUpdateStatus = (id: string, status: OpportunitySpec['applicationStatus']) => {
    updateState((prev) => ({
      ...prev,
      opportunities: prev.opportunities.map((o) => (o.id === id ? { ...o, applicationStatus: status } : o)),
    }));
    showToast('Application status updated');
  };

  const handleAnalyzeDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSpecText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await executeAiTask<{ text?: string }>('job_spec_analysis', customSpecText, {
        studentSkills: state.careerDNA.technicalSkills.map((s) => `${s.name}: ${s.proficiency}%`),
      });
      setAnalysisOutput(res.result.text || 'Competency match extracted.');
      showToast('Description analyzed', 'Extracted required skills and readiness alignment.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunity Compiler"
        subtitle="Simulated academic & industry competency benchmarks. Compare personal skills against role specifications without fake job postings."
      />

      {/* Search & Filters */}
      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search benchmarks by title or track..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
          />
        </div>
        <select
          aria-label="Filter by benchmark type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Types</option>
          <option value="Capstone Benchmark">Capstone Benchmark</option>
          <option value="Applied Lab">Applied Lab</option>
          <option value="Systems Fellowship">Systems Fellowship</option>
          <option value="Research Track">Research Track</option>
        </select>
        <select
          aria-label="Filter by skill"
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Skills</option>
          {state.careerDNA.technicalSkills.map((sk) => (
            <option key={sk.id} value={sk.name}>
              {sk.name}
            </option>
          ))}
        </select>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Opportunity List */}
        <div className="lg:col-span-6 space-y-3">
          {filteredOpps.map((opp) => {
            const active = opp.id === selectedOpp?.id;
            return (
              <Card
                key={opp.id}
                className={`p-5 cursor-pointer transition-colors ${
                  active ? 'border-[#4F46E5] bg-indigo-50/30' : 'hover:bg-slate-50/70'
                }`}
              >
                <div onClick={() => setSelectedOppId(opp.id)} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0F172A]">{opp.title}</h3>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {opp.type} · {opp.track} · {opp.commitment}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSave(opp.id);
                      }}
                      aria-label={opp.saved ? 'Unsave benchmark' : 'Save benchmark'}
                      className={`p-1.5 rounded-lg border ${
                        opp.saved ? 'border-indigo-300 bg-indigo-50 text-[#4F46E5]' : 'border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#64748B]">Level: {opp.level}</span>
                    <StatusLabel
                      tone={
                        opp.applicationStatus === 'accepted'
                          ? 'success'
                          : opp.applicationStatus === 'in_review'
                          ? 'info'
                          : opp.applicationStatus === 'saved'
                          ? 'warning'
                          : 'neutral'
                      }
                      text={opp.applicationStatus.replace('_', ' ')}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Competency Comparison & Description Analyzer */}
        <div className="lg:col-span-6 space-y-6">
          {selectedOpp && (
            <Card className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">{selectedOpp.title}</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {selectedOpp.type} · {selectedOpp.commitment}
                  </p>
                </div>
                <select
                  aria-label="Track application status"
                  value={selectedOpp.applicationStatus}
                  onChange={(e) =>
                    handleUpdateStatus(selectedOpp.id, e.target.value as OpportunitySpec['applicationStatus'])
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium bg-white"
                >
                  <option value="not_applied">Not Applied</option>
                  <option value="saved">Saved</option>
                  <option value="in_review">In Review</option>
                  <option value="accepted">Accepted</option>
                </select>
              </div>

              <p className="text-sm text-[#0F172A] leading-relaxed">{selectedOpp.summary}</p>

              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-[#64748B]">Personal Skills vs. Benchmark Requirements</h3>
                {selectedOpp.requiredCompetencies.map((req) => {
                  const mine = state.careerDNA.technicalSkills.find((s) => s.name === req.skill)?.proficiency ?? 45;
                  return (
                    <div key={req.skill} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#0F172A]">{req.skill}</span>
                        <span className="font-mono tabular-nums text-[#64748B]">
                          You: {mine}% / Min: {req.minLevel}%
                        </span>
                      </div>
                      <ProgressBar value={mine} max={req.minLevel} tone={mine >= req.minLevel ? 'success' : 'warning'} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Analyze Job Description */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#4F46E5]" />
              <h2 className="text-base font-semibold text-[#0F172A]">Analyze Role Description</h2>
            </div>
            <form onSubmit={handleAnalyzeDescription} className="space-y-3">
              <textarea
                rows={4}
                value={customSpecText}
                onChange={(e) => setCustomSpecText(e.target.value)}
                placeholder="Paste a role specification or syllabus description to extract required competencies..."
                className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm"
              />
              <button
                type="submit"
                disabled={analyzing || !customSpecText.trim()}
                className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {analyzing ? 'Analyzing Specification...' : 'Analyze Competencies'}
              </button>
            </form>
            {analysisOutput && (
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0F172A]">
                {analysisOutput}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
