import type { UserRole } from '../types/evolvix';

export type SidebarIconName =
  | 'LayoutDashboard'
  | 'Compass'
  | 'Dna'
  | 'Route'
  | 'BarChart3'
  | 'Briefcase'
  | 'Flame'
  | 'Map'
  | 'Code2'
  | 'Bot'
  | 'Award'
  | 'Bell'
  | 'User'
  | 'Settings'
  | 'Users'
  | 'Contact'
  | 'FileWarning'
  | 'ClipboardCheck'
  | 'Sparkles'
  | 'Calendar'
  | 'MessageSquare'
  | 'FileBarChart'
  | 'Building2'
  | 'GraduationCap'
  | 'Layers'
  | 'UserCheck'
  | 'TrendingUp'
  | 'Grid3x3'
  | 'BookOpen'
  | 'Landmark'
  | 'ShieldCheck'
  | 'Cpu'
  | 'Sliders'
  | 'Database'
  | 'ScrollText'
  | 'Activity'
  | 'HeartPulse'
  | 'FileLock2';

export interface NavItemConfig {
  id: string;
  label: string;
  route: string;
  icon: SidebarIconName;
  group: string;
  description: string;
}

export interface RoleNavConfig {
  role: UserRole;
  roleLabel: string;
  homeRoute: string;
  items: NavItemConfig[];
}

export const ROLE_NAV_CONFIG: Record<UserRole, RoleNavConfig> = {
  student: {
    role: 'student',
    roleLabel: 'Student',
    homeRoute: '/student/dashboard',
    items: [
      { id: 'student-overview', label: 'Overview', route: '/student/dashboard', icon: 'LayoutDashboard', group: 'Core Workspace', description: 'Readiness metrics, weekly activity, and next steps' },
      { id: 'student-discovery', label: 'Career Discovery 360', route: '/student/career-discovery', icon: 'Compass', group: 'Core Workspace', description: 'Adaptive AI career interview and synthesis' },
      { id: 'student-dna', label: 'Career DNA', route: '/student/career-dna', icon: 'Dna', group: 'Core Workspace', description: 'Skills, projects, certifications, and learning preferences' },
      { id: 'student-pathfinder', label: 'Pathfinder AI', route: '/student/pathfinder', icon: 'Route', group: 'Core Workspace', description: 'Career comparison and what-if simulation' },
      { id: 'student-skill-gap', label: 'Skill Gap Analysis', route: '/student/skill-gap', icon: 'BarChart3', group: 'Skills & Opportunities', description: 'Competency delta, prerequisites, and priorities' },
      { id: 'student-opportunities', label: 'Opportunity Compiler', route: '/student/opportunities', icon: 'Briefcase', group: 'Skills & Opportunities', description: 'Competency benchmarks and role requirement analyzer' },
      { id: 'student-missions', label: 'MissionForge', route: '/student/missions', icon: 'Flame', group: 'Learning & Practice', description: 'Applied technical missions and evaluation' },
      { id: 'student-learning-path', label: 'Adaptive Learning Path', route: '/student/learning-path', icon: 'Map', group: 'Learning & Practice', description: 'Personalized roadmap and rescue mode' },
      { id: 'student-practice-lab', label: 'Practice Lab', route: '/student/practice-lab', icon: 'Code2', group: 'Learning & Practice', description: 'Technical MCQs, coding challenges, and drills' },
      { id: 'student-mentor-council', label: 'MentorMind Council', route: '/student/mentor-council', icon: 'Bot', group: 'Learning & Practice', description: 'Multi-agent collaborative career guidance' },
      { id: 'student-skill-passport', label: 'Skill Proof Passport', route: '/student/skill-passport', icon: 'Award', group: 'Credentials & Account', description: 'Verified skill credentials and share controls' },
      { id: 'student-notifications', label: 'Notifications', route: '/student/notifications', icon: 'Bell', group: 'Credentials & Account', description: 'Updates, reminders, and activity alerts' },
      { id: 'student-profile', label: 'Profile', route: '/student/profile', icon: 'User', group: 'Credentials & Account', description: 'Academic profile and personal details' },
      { id: 'student-settings', label: 'Settings', route: '/student/settings', icon: 'Settings', group: 'Credentials & Account', description: 'Account security, privacy, and session controls' },
    ],
  },
  mentor: {
    role: 'mentor',
    roleLabel: 'Mentor',
    homeRoute: '/mentor/dashboard',
    items: [
      { id: 'mentor-overview', label: 'Overview', route: '/mentor/dashboard', icon: 'LayoutDashboard', group: 'Mentoring Hub', description: 'Assigned cohort overview and pending reviews' },
      { id: 'mentor-students', label: 'My Students', route: '/mentor/students', icon: 'Users', group: 'Cohort Management', description: 'Search and monitor assigned students' },
      { id: 'mentor-profiles', label: 'Student Profiles', route: '/mentor/student-profiles', icon: 'Contact', group: 'Cohort Management', description: 'Deep-dive skills, goals, and evidence records' },
      { id: 'mentor-skill-gaps', label: 'Skill Gap Reports', route: '/mentor/skill-gap-reports', icon: 'FileWarning', group: 'Cohort Management', description: 'Cohort competency comparisons and exports' },
      { id: 'mentor-assessments', label: 'Assessment Review', route: '/mentor/assessment-review', icon: 'ClipboardCheck', group: 'Reviews & Guidance', description: 'Grade submissions and request revisions' },
      { id: 'mentor-roadmaps', label: 'Learning Roadmaps', route: '/mentor/learning-roadmaps', icon: 'Map', group: 'Reviews & Guidance', description: 'Inspect student roadmaps and leave comments' },
      { id: 'mentor-ai-recs', label: 'AI Recommendations', route: '/mentor/ai-recommendations', icon: 'Sparkles', group: 'Reviews & Guidance', description: 'Accept or reject AI suggestions with rationale' },
      { id: 'mentor-sessions', label: 'Mentoring Sessions', route: '/mentor/sessions', icon: 'Calendar', group: 'Engagement & Reporting', description: 'Schedule 1:1s and maintain meeting notes' },
      { id: 'mentor-feedback', label: 'Feedback', route: '/mentor/feedback', icon: 'MessageSquare', group: 'Engagement & Reporting', description: 'Structured feedback and improvement plans' },
      { id: 'mentor-reports', label: 'Reports', route: '/mentor/reports', icon: 'FileBarChart', group: 'Engagement & Reporting', description: 'Performance, assessment, and gap exports' },
      { id: 'mentor-settings', label: 'Settings', route: '/mentor/settings', icon: 'Settings', group: 'Account', description: 'Profile, security, and mentoring availability' },
    ],
  },
  university_admin: {
    role: 'university_admin',
    roleLabel: 'University Admin',
    homeRoute: '/university/dashboard',
    items: [
      { id: 'uni-overview', label: 'Overview', route: '/university/dashboard', icon: 'LayoutDashboard', group: 'Institution Overview', description: 'Campus-wide readiness, cohorts, and paths' },
      { id: 'uni-departments', label: 'Departments', route: '/university/departments', icon: 'Building2', group: 'Academic Structure', description: 'Manage academic departments and heads' },
      { id: 'uni-programmes', label: 'Programmes', route: '/university/programmes', icon: 'GraduationCap', group: 'Academic Structure', description: 'Degree programmes and credit structures' },
      { id: 'uni-batches', label: 'Batches', route: '/university/batches', icon: 'Layers', group: 'Academic Structure', description: 'Student cohorts by academic year' },
      { id: 'uni-students', label: 'Students', route: '/university/students', icon: 'Users', group: 'People & Assignments', description: 'Enroll, edit, assign, and export students' },
      { id: 'uni-mentors', label: 'Mentors', route: '/university/mentors', icon: 'UserCheck', group: 'People & Assignments', description: 'Manage mentors and student assignments' },
      { id: 'uni-career-analytics', label: 'Career Analytics', route: '/university/career-analytics', icon: 'TrendingUp', group: 'Intelligence & Training', description: 'Career demand trends and department readiness' },
      { id: 'uni-skill-intelligence', label: 'Skill Intelligence', route: '/university/skill-intelligence', icon: 'Grid3x3', group: 'Intelligence & Training', description: 'Department skill-gap heatmaps and priorities' },
      { id: 'uni-training', label: 'Training Management', route: '/university/training', icon: 'BookOpen', group: 'Intelligence & Training', description: 'Targeted training programmes and outcomes' },
      { id: 'uni-reports', label: 'Reports', route: '/university/reports', icon: 'FileBarChart', group: 'Governance', description: 'Institution-scoped analytical exports' },
      { id: 'uni-settings', label: 'Settings', route: '/university/settings', icon: 'Settings', group: 'Governance', description: 'Institution profile and academic rules' },
    ],
  },
  super_admin: {
    role: 'super_admin',
    roleLabel: 'Super Admin',
    homeRoute: '/super-admin/dashboard',
    items: [
      { id: 'sa-overview', label: 'Overview', route: '/super-admin/dashboard', icon: 'LayoutDashboard', group: 'Platform Overview', description: 'Users, institutions, AI executions, and health' },
      { id: 'sa-institutions', label: 'Institutions', route: '/super-admin/institutions', icon: 'Landmark', group: 'Tenant & Access Control', description: 'Onboard and govern partner institutions' },
      { id: 'sa-users', label: 'Users', route: '/super-admin/users', icon: 'Users', group: 'Tenant & Access Control', description: 'Cross-platform accounts and status management' },
      { id: 'sa-roles', label: 'Roles & Permissions', route: '/super-admin/roles', icon: 'ShieldCheck', group: 'Tenant & Access Control', description: 'RBAC policy matrix and access audit' },
      { id: 'sa-agents', label: 'AI Agent Control', route: '/super-admin/agents', icon: 'Cpu', group: 'AI Infrastructure', description: 'Manage the six autonomous EVOLVIX agents' },
      { id: 'sa-gemini', label: 'Gemini Configuration', route: '/super-admin/gemini', icon: 'Sliders', group: 'AI Infrastructure', description: 'Model governance, usage, and quota status' },
      { id: 'sa-knowledge', label: 'Knowledge Base', route: '/super-admin/knowledge-base', icon: 'Database', group: 'AI Infrastructure', description: 'Reference taxonomies and indexing pipeline' },
      { id: 'sa-agent-logs', label: 'Agent Logs', route: '/super-admin/agent-logs', icon: 'ScrollText', group: 'Observability & Security', description: 'Execution metadata, latency, and errors' },
      { id: 'sa-api-monitoring', label: 'API Monitoring', route: '/super-admin/api-monitoring', icon: 'Activity', group: 'Observability & Security', description: 'Endpoint throughput, latency, and error rates' },
      { id: 'sa-system-health', label: 'System Health', route: '/super-admin/system-health', icon: 'HeartPulse', group: 'Observability & Security', description: 'Backend, store, and Gemini service status' },
      { id: 'sa-audit-logs', label: 'Audit Logs', route: '/super-admin/audit-logs', icon: 'FileLock2', group: 'Observability & Security', description: 'Security events and administrative changes' },
      { id: 'sa-settings', label: 'Settings', route: '/super-admin/settings', icon: 'Settings', group: 'Platform Configuration', description: 'Global security, AI, and retention settings' },
    ],
  },
};

export function getRoleHomePath(role: UserRole): string {
  return ROLE_NAV_CONFIG[role].homeRoute;
}

export function getAllRouteEntries(): Array<{ role: UserRole; item: NavItemConfig }> {
  return (Object.keys(ROLE_NAV_CONFIG) as UserRole[]).flatMap((role) =>
    ROLE_NAV_CONFIG[role].items.map((item) => ({ role, item }))
  );
}
