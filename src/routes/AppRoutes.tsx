import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { SidebarLayout } from '../components/SidebarLayout';
import { LoadingSkeleton } from '../components/UiPrimitives';
import { getRoleHomePath } from '../config/navigation';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/evolvix';

import { LoginPage } from '../pages/auth/LoginPage';
import { NotFoundPage } from '../pages/errors/NotFoundPage';
import { UnauthorizedPage } from '../pages/errors/UnauthorizedPage';

// Student Pages (14)
import { StudentOverviewPage } from '../pages/student/StudentOverviewPage';
import { CareerDiscoveryPage } from '../pages/student/CareerDiscoveryPage';
import { CareerDNAPage } from '../pages/student/CareerDNAPage';
import { PathfinderPage } from '../pages/student/PathfinderPage';
import { SkillGapPage } from '../pages/student/SkillGapPage';
import { OpportunitiesPage } from '../pages/student/OpportunitiesPage';
import { MissionForgePage } from '../pages/student/MissionForgePage';
import { LearningPathPage } from '../pages/student/LearningPathPage';
import { PracticeLabPage } from '../pages/student/PracticeLabPage';
import { MentorCouncilPage } from '../pages/student/MentorCouncilPage';
import { SkillPassportPage } from '../pages/student/SkillPassportPage';
import { StudentNotificationsPage } from '../pages/student/StudentNotificationsPage';
import { StudentProfilePage } from '../pages/student/StudentProfilePage';
import { StudentSettingsPage } from '../pages/student/StudentSettingsPage';

// Mentor Pages (11)
import { MentorOverviewPage } from '../pages/mentor/MentorOverviewPage';
import { MentorStudentsPage } from '../pages/mentor/MentorStudentsPage';
import { MentorStudentProfilesPage } from '../pages/mentor/MentorStudentProfilesPage';
import { MentorSkillGapReportsPage } from '../pages/mentor/MentorSkillGapReportsPage';
import { MentorAssessmentReviewPage } from '../pages/mentor/MentorAssessmentReviewPage';
import { MentorRoadmapsPage } from '../pages/mentor/MentorRoadmapsPage';
import { MentorAIRecommendationsPage } from '../pages/mentor/MentorAIRecommendationsPage';
import { MentorSessionsPage } from '../pages/mentor/MentorSessionsPage';
import { MentorFeedbackPage } from '../pages/mentor/MentorFeedbackPage';
import { MentorReportsPage } from '../pages/mentor/MentorReportsPage';
import { MentorSettingsPage } from '../pages/mentor/MentorSettingsPage';

// University Admin Pages (11)
import { UniversityOverviewPage } from '../pages/university/UniversityOverviewPage';
import { UniversityDepartmentsPage } from '../pages/university/UniversityDepartmentsPage';
import { UniversityProgrammesPage } from '../pages/university/UniversityProgrammesPage';
import { UniversityBatchesPage } from '../pages/university/UniversityBatchesPage';
import { UniversityStudentsPage } from '../pages/university/UniversityStudentsPage';
import { UniversityMentorsPage } from '../pages/university/UniversityMentorsPage';
import { UniversityCareerAnalyticsPage } from '../pages/university/UniversityCareerAnalyticsPage';
import { UniversitySkillIntelligencePage } from '../pages/university/UniversitySkillIntelligencePage';
import { UniversityTrainingPage } from '../pages/university/UniversityTrainingPage';
import { UniversityReportsPage } from '../pages/university/UniversityReportsPage';
import { UniversitySettingsPage } from '../pages/university/UniversitySettingsPage';

// Super Admin Pages (12)
import { SuperAdminOverviewPage } from '../pages/super-admin/SuperAdminOverviewPage';
import { SuperAdminInstitutionsPage } from '../pages/super-admin/SuperAdminInstitutionsPage';
import { SuperAdminUsersPage } from '../pages/super-admin/SuperAdminUsersPage';
import { SuperAdminRolesPage } from '../pages/super-admin/SuperAdminRolesPage';
import { SuperAdminAgentsPage } from '../pages/super-admin/SuperAdminAgentsPage';
import { SuperAdminGeminiPage } from '../pages/super-admin/SuperAdminGeminiPage';
import { SuperAdminKnowledgeBasePage } from '../pages/super-admin/SuperAdminKnowledgeBasePage';
import { SuperAdminAgentLogsPage } from '../pages/super-admin/SuperAdminAgentLogsPage';
import { SuperAdminApiMonitoringPage } from '../pages/super-admin/SuperAdminApiMonitoringPage';
import { SuperAdminSystemHealthPage } from '../pages/super-admin/SuperAdminSystemHealthPage';
import { SuperAdminAuditLogsPage } from '../pages/super-admin/SuperAdminAuditLogsPage';
import { SuperAdminSettingsPage } from '../pages/super-admin/SuperAdminSettingsPage';

const ProtectedRoute: React.FC<{ role: UserRole; element: React.ReactElement }> = ({ role, element }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8 max-w-4xl mx-auto">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <SidebarLayout>{element}</SidebarLayout>;
};

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHomePath(user.role)} replace />;
};

const LoginGuard: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to={getRoleHomePath(user.role)} replace />;
  return <LoginPage />;
};

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<RootRedirect />} />
    <Route path="/login" element={<LoginGuard />} />
    <Route path="/unauthorized" element={<UnauthorizedPage />} />

    {/* STUDENT ROUTES (14) */}
    <Route path="/student/dashboard" element={<ProtectedRoute role="student" element={<StudentOverviewPage />} />} />
    <Route path="/student/career-discovery" element={<ProtectedRoute role="student" element={<CareerDiscoveryPage />} />} />
    <Route path="/student/career-dna" element={<ProtectedRoute role="student" element={<CareerDNAPage />} />} />
    <Route path="/student/pathfinder" element={<ProtectedRoute role="student" element={<PathfinderPage />} />} />
    <Route path="/student/skill-gap" element={<ProtectedRoute role="student" element={<SkillGapPage />} />} />
    <Route path="/student/opportunities" element={<ProtectedRoute role="student" element={<OpportunitiesPage />} />} />
    <Route path="/student/missions" element={<ProtectedRoute role="student" element={<MissionForgePage />} />} />
    <Route path="/student/learning-path" element={<ProtectedRoute role="student" element={<LearningPathPage />} />} />
    <Route path="/student/practice-lab" element={<ProtectedRoute role="student" element={<PracticeLabPage />} />} />
    <Route path="/student/mentor-council" element={<ProtectedRoute role="student" element={<MentorCouncilPage />} />} />
    <Route path="/student/skill-passport" element={<ProtectedRoute role="student" element={<SkillPassportPage />} />} />
    <Route path="/student/notifications" element={<ProtectedRoute role="student" element={<StudentNotificationsPage />} />} />
    <Route path="/student/profile" element={<ProtectedRoute role="student" element={<StudentProfilePage />} />} />
    <Route path="/student/settings" element={<ProtectedRoute role="student" element={<StudentSettingsPage />} />} />

    {/* MENTOR ROUTES (11) */}
    <Route path="/mentor/dashboard" element={<ProtectedRoute role="mentor" element={<MentorOverviewPage />} />} />
    <Route path="/mentor/students" element={<ProtectedRoute role="mentor" element={<MentorStudentsPage />} />} />
    <Route path="/mentor/student-profiles" element={<ProtectedRoute role="mentor" element={<MentorStudentProfilesPage />} />} />
    <Route path="/mentor/skill-gap-reports" element={<ProtectedRoute role="mentor" element={<MentorSkillGapReportsPage />} />} />
    <Route path="/mentor/assessment-review" element={<ProtectedRoute role="mentor" element={<MentorAssessmentReviewPage />} />} />
    <Route path="/mentor/learning-roadmaps" element={<ProtectedRoute role="mentor" element={<MentorRoadmapsPage />} />} />
    <Route path="/mentor/ai-recommendations" element={<ProtectedRoute role="mentor" element={<MentorAIRecommendationsPage />} />} />
    <Route path="/mentor/sessions" element={<ProtectedRoute role="mentor" element={<MentorSessionsPage />} />} />
    <Route path="/mentor/feedback" element={<ProtectedRoute role="mentor" element={<MentorFeedbackPage />} />} />
    <Route path="/mentor/reports" element={<ProtectedRoute role="mentor" element={<MentorReportsPage />} />} />
    <Route path="/mentor/settings" element={<ProtectedRoute role="mentor" element={<MentorSettingsPage />} />} />

    {/* UNIVERSITY ADMIN ROUTES (11) */}
    <Route path="/university/dashboard" element={<ProtectedRoute role="university_admin" element={<UniversityOverviewPage />} />} />
    <Route path="/university/departments" element={<ProtectedRoute role="university_admin" element={<UniversityDepartmentsPage />} />} />
    <Route path="/university/programmes" element={<ProtectedRoute role="university_admin" element={<UniversityProgrammesPage />} />} />
    <Route path="/university/batches" element={<ProtectedRoute role="university_admin" element={<UniversityBatchesPage />} />} />
    <Route path="/university/students" element={<ProtectedRoute role="university_admin" element={<UniversityStudentsPage />} />} />
    <Route path="/university/mentors" element={<ProtectedRoute role="university_admin" element={<UniversityMentorsPage />} />} />
    <Route path="/university/career-analytics" element={<ProtectedRoute role="university_admin" element={<UniversityCareerAnalyticsPage />} />} />
    <Route path="/university/skill-intelligence" element={<ProtectedRoute role="university_admin" element={<UniversitySkillIntelligencePage />} />} />
    <Route path="/university/training" element={<ProtectedRoute role="university_admin" element={<UniversityTrainingPage />} />} />
    <Route path="/university/reports" element={<ProtectedRoute role="university_admin" element={<UniversityReportsPage />} />} />
    <Route path="/university/settings" element={<ProtectedRoute role="university_admin" element={<UniversitySettingsPage />} />} />

    {/* SUPER ADMIN ROUTES (12) */}
    <Route path="/super-admin/dashboard" element={<ProtectedRoute role="super_admin" element={<SuperAdminOverviewPage />} />} />
    <Route path="/super-admin/institutions" element={<ProtectedRoute role="super_admin" element={<SuperAdminInstitutionsPage />} />} />
    <Route path="/super-admin/users" element={<ProtectedRoute role="super_admin" element={<SuperAdminUsersPage />} />} />
    <Route path="/super-admin/roles" element={<ProtectedRoute role="super_admin" element={<SuperAdminRolesPage />} />} />
    <Route path="/super-admin/agents" element={<ProtectedRoute role="super_admin" element={<SuperAdminAgentsPage />} />} />
    <Route path="/super-admin/gemini" element={<ProtectedRoute role="super_admin" element={<SuperAdminGeminiPage />} />} />
    <Route path="/super-admin/knowledge-base" element={<ProtectedRoute role="super_admin" element={<SuperAdminKnowledgeBasePage />} />} />
    <Route path="/super-admin/agent-logs" element={<ProtectedRoute role="super_admin" element={<SuperAdminAgentLogsPage />} />} />
    <Route path="/super-admin/api-monitoring" element={<ProtectedRoute role="super_admin" element={<SuperAdminApiMonitoringPage />} />} />
    <Route path="/super-admin/system-health" element={<ProtectedRoute role="super_admin" element={<SuperAdminSystemHealthPage />} />} />
    <Route path="/super-admin/audit-logs" element={<ProtectedRoute role="super_admin" element={<SuperAdminAuditLogsPage />} />} />
    <Route path="/super-admin/settings" element={<ProtectedRoute role="super_admin" element={<SuperAdminSettingsPage />} />} />

    {/* FALLBACK 404 */}
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
