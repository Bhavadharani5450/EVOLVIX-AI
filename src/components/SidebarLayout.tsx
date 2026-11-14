import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Code2,
  Compass,
  Contact,
  Cpu,
  Database,
  Dna,
  FileBarChart,
  FileLock2,
  FileWarning,
  Flame,
  GraduationCap,
  Grid3x3,
  HeartPulse,
  Landmark,
  Layers,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageSquare,
  RotateCcw,
  Route,
  ScrollText,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { IS_DEMO_MODE } from '../config/env';
import { ROLE_NAV_CONFIG, type NavItemConfig, type SidebarIconName } from '../config/navigation';
import type { UserRole } from '../types/evolvix';
import { BrandLogo } from './BrandLogo';

const ICON_MAP: Record<SidebarIconName, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Compass,
  Dna,
  Route,
  BarChart3,
  Briefcase,
  Flame,
  Map: MapIcon,
  Code2,
  Bot,
  Award,
  Bell,
  User,
  Settings,
  Users,
  Contact,
  FileWarning,
  ClipboardCheck,
  Sparkles,
  Calendar,
  MessageSquare,
  FileBarChart,
  Building2,
  GraduationCap,
  Layers,
  UserCheck,
  TrendingUp,
  Grid3x3,
  BookOpen,
  Landmark,
  ShieldCheck,
  Cpu,
  Sliders,
  Database,
  ScrollText,
  Activity,
  HeartPulse,
  FileLock2,
};

export const SidebarLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, loginWithDemoRole } = useAuth();
  const { state, resetDemoState } = useAppData();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleConfig = user ? ROLE_NAV_CONFIG[user.role] : ROLE_NAV_CONFIG.student;

  // Group navigation items preserving declaration order
  const groupedItems = useMemo(() => {
    const groups: { name: string; items: NavItemConfig[] }[] = [];
    for (const item of roleConfig.items) {
      let existing = groups.find((g) => g.name === item.group);
      if (!existing) {
        existing = { name: item.group, items: [] };
        groups.push(existing);
      }
      existing.items.push(item);
    }
    return groups;
  }, [roleConfig]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Ensure every group is expanded by default and active route's group stays expanded
  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const g of groupedItems) {
        if (next[g.name] === undefined) next[g.name] = true;
        if (g.items.some((it) => location.pathname === it.route)) {
          next[g.name] = true;
        }
      }
      return next;
    });
    setMobileOpen(false);
  }, [groupedItems, location.pathname]);

  const currentNavItem = useMemo(
    () => roleConfig.items.find((it) => it.route === location.pathname) ?? roleConfig.items[0],
    [roleConfig, location.pathname]
  );

  const unreadCount = useMemo(
    () => (user?.role === 'student' ? state.notifications.filter((n) => !n.read).length : 0),
    [state.notifications, user?.role]
  );

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
    showToast('Signed out', 'Your session has been cleared.', 'info');
  };

  const handleQuickRoleSwitch = async (nextRole: UserRole) => {
    if (!IS_DEMO_MODE) return;
    await loginWithDemoRole(nextRole);
    navigate(ROLE_NAV_CONFIG[nextRole].homeRoute);
    showToast(`Switched to ${ROLE_NAV_CONFIG[nextRole].roleLabel}`, 'Demo role session updated.', 'info');
  };

  const renderNavContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-[#FFFFFF]">
      {/* Sidebar Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2E8F0] shrink-0">
        <NavLink to={roleConfig.homeRoute} className="focus:outline-none">
          <BrandLogo compact={collapsed && !isMobile} size="sm" />
        </NavLink>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Role Context Bar */}
      {(!collapsed || isMobile) && (
        <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <p className="text-[11px] font-semibold tracking-wide text-[#64748B]">ACTIVE WORKSPACE</p>
          <p className="text-xs font-semibold text-[#0F172A] mt-0.5 truncate">{roleConfig.roleLabel} Portal</p>
        </div>
      )}

      {/* Navigation Links */}
      <nav aria-label={`${roleConfig.roleLabel} sidebar navigation`} className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {groupedItems.map((group) => {
          const isOpen = expandedGroups[group.name] ?? true;
          return (
            <div key={group.name}>
              {(!collapsed || isMobile) && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  <span className="truncate">{group.name}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`}
                  />
                </button>
              )}

              {(isOpen || (collapsed && !isMobile)) && (
                <ul className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = ICON_MAP[item.icon];
                    const showUnread = item.id === 'student-notifications' && unreadCount > 0;
                    return (
                      <li key={item.id} className="relative group">
                        <NavLink
                          to={item.route}
                          title={collapsed && !isMobile ? item.label : undefined}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                              collapsed && !isMobile ? 'justify-center px-2' : ''
                            } ${
                              isActive
                                ? 'bg-indigo-50 text-[#4F46E5] font-semibold'
                                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive ? 'text-[#4F46E5]' : 'text-[#64748B] group-hover:text-[#0F172A]'
                                }`}
                              />
                              {(!collapsed || isMobile) && (
                                <span className="flex-1 truncate">{item.label}</span>
                              )}
                              {(!collapsed || isMobile) && showUnread && (
                                <span className="text-[11px] font-mono tabular-nums font-semibold text-[#4F46E5]">
                                  {unreadCount}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>

                        {/* Hover tooltip when desktop sidebar is collapsed */}
                        {collapsed && !isMobile && (
                          <div
                            role="tooltip"
                            className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 px-2.5 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-medium whitespace-nowrap shadow-md"
                          >
                            {item.label}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom User Profile & Logout */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#FFFFFF] shrink-0">
        {user && (!collapsed || isMobile) && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="w-9 h-9 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {user.avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#0F172A] truncate">{user.name}</p>
              <p className="text-[11px] text-[#64748B] truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          title="Log out"
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 transition-colors ${
            collapsed && !isMobile ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-[#E2E8F0] bg-[#FFFFFF] shrink-0 sticky top-0 h-screen transition-all duration-200 ${
          collapsed ? 'w-[76px]' : 'w-[264px]'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/35"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] h-full border-r border-[#E2E8F0] bg-[#FFFFFF] shadow-xl">
            {renderNavContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex items-center gap-2 text-sm">
              <span className="hidden sm:inline text-[#64748B] whitespace-nowrap">{roleConfig.roleLabel}</span>
              <span className="hidden sm:inline text-[#CBD5E1]" aria-hidden="true">/</span>
              <span className="font-semibold text-[#0F172A] truncate">{currentNavItem.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {IS_DEMO_MODE && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-xs font-semibold text-[#D97706] whitespace-nowrap">
                  DEMO MODE
                </span>
                <label className="sr-only" htmlFor="demo-role-switcher">
                  Switch Demo Role
                </label>
                <select
                  id="demo-role-switcher"
                  value={user?.role ?? 'student'}
                  onChange={(e) => handleQuickRoleSwitch(e.target.value as UserRole)}
                  className="hidden md:block text-xs font-medium text-[#0F172A] bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value="student">Role: Student</option>
                  <option value="mentor">Role: Mentor</option>
                  <option value="university_admin">Role: University Admin</option>
                  <option value="super_admin">Role: Super Admin</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    resetDemoState();
                    showToast('Demo data reset', 'Restored initial realistic EVOLVIX AI demo state.', 'info');
                  }}
                  title="Reset Demo Data"
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F8FAFC] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            )}

            {user?.role === 'student' && (
              <button
                type="button"
                onClick={() => navigate('/student/notifications')}
                aria-label="Open notifications"
                className="relative p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] border border-[#E2E8F0] transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="sr-only">{unreadCount} unread notifications</span>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
