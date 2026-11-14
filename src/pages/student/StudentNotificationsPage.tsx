import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ArrowUpRight } from 'lucide-react';
import { Card, EmptyState, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';

export const StudentNotificationsPage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'all' | 'unread' | 'mentor' | 'assessment' | 'roadmap'>('all');

  const filtered = useMemo(() => {
    return state.notifications.filter((n) => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !n.read;
      return n.category === filter;
    });
  }, [state.notifications, filter]);

  const unreadCount = state.notifications.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    updateState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  const markAllRead = () => {
    updateState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
    showToast('All notifications marked as read');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread updates across assessments, mentor sessions, and roadmap changes.`}
        actions={
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4 text-[#4F46E5]" />
            <span>Mark All as Read</span>
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'mentor', label: 'Mentor' },
            { id: 'assessment', label: 'Assessments' },
            { id: 'roadmap', label: 'Roadmap' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === tab.id
                ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                : 'bg-[#FFFFFF] text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No notifications in this view"
          description="You are completely caught up on activity for this filter."
          actionLabel="Show All Notifications"
          onAction={() => setFilter('all')}
        />
      ) : (
        <Card className="divide-y divide-[#E2E8F0]">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                notif.read ? 'bg-[#FFFFFF]' : 'bg-indigo-50/35'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    notif.read ? 'bg-[#F8FAFC] text-[#64748B]' : 'bg-indigo-50 text-[#4F46E5]'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#0F172A]">{notif.title}</p>
                    {!notif.read && <StatusLabel tone="info" text="Unread" />}
                  </div>
                  <p className="text-sm text-[#64748B] mt-0.5">{notif.message}</p>
                  <p className="text-xs text-[#64748B] mt-1 capitalize">
                    {notif.category} · {notif.timestamp}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!notif.read && (
                  <button
                    type="button"
                    onClick={() => markRead(notif.id)}
                    className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#64748B] hover:text-[#0F172A]"
                  >
                    Mark Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    markRead(notif.id);
                    navigate(notif.actionRoute);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#4F46E5] text-white text-xs font-medium hover:bg-indigo-700"
                >
                  <span>Open</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};
