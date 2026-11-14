import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpRight } from 'lucide-react';
import { Card, EmptyState, PageHeader, ProgressBar, StatusLabel } from '../../components/UiPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

export const MentorStudentsPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useAppData();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [progressFilter, setProgressFilter] = useState<'ALL' | 'ON_TRACK' | 'AT_RISK'>('ALL');

  const assigned = useMemo(
    () => state.mentorAssignedStudents.filter((s) => s.mentorId === (user?.id ?? 'men-maya')),
    [state.mentorAssignedStudents, user?.id]
  );

  const departments = Array.from(new Set(assigned.map((s) => s.department)));

  const filtered = useMemo(() => {
    return assigned.filter((stu) => {
      const matchQuery =
        !query.trim() ||
        stu.name.toLowerCase().includes(query.toLowerCase()) ||
        stu.targetCareer.toLowerCase().includes(query.toLowerCase());
      const matchDept = deptFilter === 'ALL' || stu.department === deptFilter;
      const matchProg =
        progressFilter === 'ALL' ||
        (progressFilter === 'AT_RISK' && stu.atRisk) ||
        (progressFilter === 'ON_TRACK' && !stu.atRisk);
      return matchQuery && matchDept && matchProg;
    });
  }, [assigned, query, deptFilter, progressFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Students"
        subtitle={`Showing only learners explicitly assigned to ${user?.name ?? 'you'} (${assigned.length} total).`}
      />

      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assigned students by name or target career..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
          />
        </div>
        <select
          aria-label="Filter by department"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by progress"
          value={progressFilter}
          onChange={(e) => setProgressFilter(e.target.value as 'ALL' | 'ON_TRACK' | 'AT_RISK')}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="ON_TRACK">On Track</option>
          <option value="AT_RISK">At Risk</option>
        </select>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No assigned students match your filters"
          description="Try clearing the search query or department filter."
          actionLabel="Clear Filters"
          onAction={() => {
            setQuery('');
            setDeptFilter('ALL');
            setProgressFilter('ALL');
          }}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Department & Batch</th>
                  <th className="py-3 px-4">Target Career</th>
                  <th className="py-3 px-4 text-right">Readiness</th>
                  <th className="py-3 px-4 w-44">Roadmap Progress</th>
                  <th className="py-3 px-4 text-right">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {filtered.map((stu) => (
                  <tr key={stu.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#0F172A]">{stu.name}</p>
                      <p className="text-xs text-[#64748B]">{stu.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-[#0F172A]">{stu.department}</p>
                      <p className="text-xs text-[#64748B]">{stu.batch}</p>
                    </td>
                    <td className="py-3.5 px-4 text-[#0F172A]">{stu.targetCareer}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#4F46E5]">
                      {stu.readinessScore}%
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ProgressBar value={stu.roadmapProgress} tone={stu.atRisk ? 'warning' : 'brand'} />
                        </div>
                        <span className="text-xs font-mono tabular-nums text-[#64748B]">{stu.roadmapProgress}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <StatusLabel tone={stu.atRisk ? 'warning' : 'success'} text={stu.atRisk ? 'At Risk' : 'On Track'} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/mentor/student-profiles?studentId=${stu.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4F46E5] hover:bg-indigo-50"
                      >
                        <span>Profile</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
