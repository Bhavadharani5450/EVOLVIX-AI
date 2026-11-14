import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, Modal, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { PlatformUserRecord, UserRole } from '../../types/evolvix';

export const SuperAdminUsersPage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [selectedUser, setSelectedUser] = useState<PlatformUserRecord | null>(null);

  const filtered = useMemo(() => {
    return state.platformUsers.filter((u) => {
      const matchQ =
        !query.trim() ||
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()) ||
        u.institutionName.toLowerCase().includes(query.toLowerCase());
      const matchR = roleFilter === 'ALL' || u.role === roleFilter;
      return matchQ && matchR;
    });
  }, [state.platformUsers, query, roleFilter]);

  const handleToggleStatus = (u: PlatformUserRecord) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    updateState((prev) => ({
      ...prev,
      platformUsers: prev.platformUsers.map((p) => (p.id === u.id ? { ...p, status: nextStatus } : p)),
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          actorName: 'Elena Vance',
          actorRole: 'super_admin',
          category: 'admin_action',
          action: `${nextStatus === 'active' ? 'Reactivated' : 'Suspended'} account ${u.email}`,
          target: u.institutionName,
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          ipMasked: '10.24.**.18',
        },
        ...prev.auditLogs,
      ],
    }));
    showToast('Account status updated', `${u.name} is now ${nextStatus}.`);
  };

  const handleChangeRole = (u: PlatformUserRecord, nextRole: UserRole) => {
    if (u.role === nextRole) return;
    updateState((prev) => ({
      ...prev,
      platformUsers: prev.platformUsers.map((p) => (p.id === u.id ? { ...p, role: nextRole } : p)),
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          actorName: 'Elena Vance',
          actorRole: 'super_admin',
          category: 'role_change',
          action: `Changed role for ${u.email} from ${u.role} to ${nextRole}`,
          target: u.institutionName,
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          ipMasked: '10.24.**.18',
        },
        ...prev.auditLogs,
      ],
    }));
    showToast('Role updated', `${u.name} assigned role: ${nextRole.replace('_', ' ')}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Users"
        subtitle="Search cross-institution user accounts, manage account status, and apply authorized role changes."
      />

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by name, email, or institution..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
          />
        </div>
        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm"
        >
          <option value="ALL">All Roles</option>
          <option value="student">Student</option>
          <option value="mentor">Mentor</option>
          <option value="university_admin">University Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className="text-left hover:underline font-semibold text-[#0F172A]"
                    >
                      {u.name}
                    </button>
                    <p className="text-xs text-[#64748B]">{u.email}</p>
                  </td>
                  <td className="py-3.5 px-4 text-[#0F172A]">{u.institutionName}</td>
                  <td className="py-3.5 px-4">
                    <select
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                      className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium"
                    >
                      <option value="student">Student</option>
                      <option value="mentor">Mentor</option>
                      <option value="university_admin">University Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#64748B]">{u.lastLogin}</td>
                  <td className="py-3.5 px-4 text-right">
                    <StatusLabel tone={u.status === 'active' ? 'success' : 'error'} text={u.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-slate-100"
                    >
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} title={selectedUser?.name ?? 'User Details'}>
        {selectedUser && (
          <div className="space-y-2.5 text-sm">
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Role:</strong> {selectedUser.role.replace('_', ' ')}</p>
            <p><strong>Institution:</strong> {selectedUser.institutionName}</p>
            <p><strong>Account Status:</strong> {selectedUser.status}</p>
            <p><strong>Last Login:</strong> <span className="font-mono">{selectedUser.lastLogin}</span></p>
          </div>
        )}
      </Modal>
    </div>
  );
};
