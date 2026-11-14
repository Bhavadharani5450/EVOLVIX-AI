export type UserRole = 'student' | 'mentor' | 'university_admin' | 'super_admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId: string;
  institutionName: string;
  department?: string;
  avatarInitials: string;
  avatarUrl?: string;
  title: string;
}

export interface TechnicalSkill {
  id: string;
  name: string;
  category: 'AI & ML' | 'Systems' | 'Frontend' | 'Backend' | 'Data' | 'Cloud';
  proficiency: number; // 0 - 100
  target: number; // 0 - 100
  verified: boolean;
  lastAssessed: string;
}

export interface SoftSkill {
  id: string;
  name: string;
  rating: number; // 1 - 5
  evidenceCount: number;
}

export interface CertificationRecord {
  id: string;
  title: string;
  issuer: string;
  issuedDate: string;
  credentialId: string;
  verified: boolean;
}

export interface ProjectRecord {
  id: string;
  title: string;
  summary: string;
  skillsUsed: string[];
  repoUrl: string;
  completedDate: string;
  verified: boolean;
}

export interface EvidenceLogItem {
  id: string;
  type: 'assessment' | 'mission' | 'project' | 'certification';
  title: string;
  skill: string;
  date: string;
  status: 'verified' | 'pending' | 'needs_revision';
  score?: number;
}

export interface CareerDNA {
  targetCareerId: string;
  targetCareerTitle: string;
  learningStyle: 'Hands-on Labs' | 'Structured Theory' | 'Project-First' | 'Mentor-Guided';
  weeklyHoursBudget: number;
  interests: string[];
  technicalSkills: TechnicalSkill[];
  softSkills: SoftSkill[];
  certifications: CertificationRecord[];
  projects: ProjectRecord[];
  evidenceHistory: EvidenceLogItem[];
}

export interface DiscoveryMessage {
  id: string;
  sender: 'ai' | 'student';
  text: string;
  timestamp: string;
  dimension?: string;
}

export interface DiscoverySession {
  id: string;
  title: string;
  status: 'in_progress' | 'completed';
  progress: number;
  startedAt: string;
  updatedAt: string;
  currentStep: number;
  totalSteps: number;
  messages: DiscoveryMessage[];
  summary?: {
    topThemes: string[];
    recommendedTracks: string[];
    workStyle: string;
    confidence: number;
  };
}

export interface CareerOption {
  id: string;
  title: string;
  domain: string;
  matchScore: number;
  readinessScore: number;
  growthOutlook: string;
  medianTimeToReadyWeeks: number;
  summary: string;
  requiredSkills: { name: string; requiredLevel: number }[];
  milestones: string[];
  saved: boolean;
}

export interface OpportunitySpec {
  id: string;
  title: string;
  track: string;
  type: 'Capstone Benchmark' | 'Research Track' | 'Systems Fellowship' | 'Applied Lab';
  commitment: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  requiredCompetencies: { skill: string; minLevel: number }[];
  saved: boolean;
  applicationStatus: 'not_applied' | 'saved' | 'in_review' | 'accepted';
}

export interface MissionItem {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  skillFocus: string;
  estimatedMinutes: number;
  xpReward: number;
  description: string;
  deliverables: string[];
  status: 'not_started' | 'in_progress' | 'submitted' | 'completed';
  submittedAnswer?: string;
  submittedLink?: string;
  evaluationScore?: number;
  feedback?: string;
}

export interface RoadmapTask {
  id: string;
  title: string;
  type: 'module' | 'mission' | 'practice' | 'review';
  estimatedHours: number;
  completed: boolean;
  prerequisiteIds: string[];
}

export interface RoadmapStage {
  id: string;
  stageNumber: number;
  title: string;
  focusArea: string;
  status: 'completed' | 'active' | 'upcoming';
  tasks: RoadmapTask[];
}

export interface RoadmapHistoryEntry {
  id: string;
  date: string;
  reason: string;
  adjustment: string;
}

export interface PracticeChallenge {
  id: string;
  title: string;
  kind: 'MCQ' | 'Coding' | 'Practical';
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  starterCode?: string;
  explanation: string;
  completed: boolean;
  lastScore?: number;
  lastAttemptAt?: string;
}

export interface AgentOutput {
  agentName: string;
  role: string;
  perspective: string;
  confidence: number;
}

export interface MentorCouncilConversation {
  id: string;
  question: string;
  createdAt: string;
  status: 'completed' | 'running';
  agentOutputs: AgentOutput[];
  finalSynthesis: string;
  actionItems: string[];
}

export interface SkillPassportConfig {
  passportCode: string;
  publicEnabled: boolean;
  shareUrl: string;
  lastGeneratedAt: string;
  headline: string;
}

export interface NotificationItem {
  id: string;
  category: 'assessment' | 'mentor' | 'roadmap' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRoute: string;
}

export interface StudentProfileDetails {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  university: string;
  department: string;
  programme: string;
  batchYear: string;
  gpa: string;
  bio: string;
  interests: string[];
  avatarUrl: string;
}

export interface AccountSettingsState {
  emailNotifications: boolean;
  assessmentReminders: boolean;
  mentorSessionAlerts: boolean;
  weeklyDigest: boolean;
  profileVisibility: 'institution' | 'mentors_only' | 'private';
  shareSkillPassportWithMentors: boolean;
  allowAiTelemetryImprovement: boolean;
  twoFactorEnabled: boolean;
  availabilityHours?: string;
  officeLocation?: string;
}

export interface MentorAssignedStudent {
  id: string;
  name: string;
  email: string;
  department: string;
  programme: string;
  batch: string;
  targetCareer: string;
  readinessScore: number;
  roadmapProgress: number;
  atRisk: boolean;
  riskReason?: string;
  lastActive: string;
  mentorId: string;
  institutionId: string;
  skills: { name: string; current: number; required: number }[];
  assessments: { id: string; title: string; score: number; date: string; status: string }[];
  evidence: { id: string; title: string; kind: string; status: string; date: string }[];
  roadmapStages: { id: string; title: string; progress: number; mentorNote: string; tasksCompleted: number; totalTasks: number }[];
}

export interface AssessmentReviewItem {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  type: 'Mission Submission' | 'Coding Challenge' | 'Project Evidence';
  submittedAt: string;
  answerSummary: string;
  projectLink?: string;
  status: 'pending' | 'approved' | 'revision_requested';
  marks?: number;
  feedback?: string;
}

export interface MentorAIRecommendation {
  id: string;
  studentId: string;
  studentName: string;
  recommendation: string;
  rationale: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'pending' | 'accepted' | 'rejected';
  mentorExplanation?: string;
  createdAt: string;
}

export interface MentoringSession {
  id: string;
  studentId: string;
  studentName: string;
  topic: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
}

export interface MentorFeedbackEntry {
  id: string;
  studentId: string;
  studentName: string;
  category: 'Technical Depth' | 'Project Execution' | 'Career Readiness' | 'Communication';
  rating: number;
  summary: string;
  improvementPlan: string;
  createdAt: string;
}

export interface InstitutionRecord {
  id: string;
  name: string;
  code: string;
  domain: string;
  region: string;
  status: 'active' | 'inactive';
  studentCount: number;
  mentorCount: number;
  readinessAvg: number;
  createdAt: string;
}

export interface DepartmentRecord {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  headName: string;
  status: 'active' | 'inactive';
  studentCount: number;
  avgReadiness: number;
}

export interface ProgrammeRecord {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  departmentId: string;
  departmentName: string;
  level: 'Undergraduate' | 'Postgraduate' | 'Diploma' | 'Certificate';
  durationYears: number;
  creditsRequired: number;
  status: 'active' | 'inactive';
}

export interface BatchRecord {
  id: string;
  institutionId: string;
  name: string;
  programmeId: string;
  programmeName: string;
  academicYear: string;
  studentCount: number;
  avgProgress: number;
  status: 'active' | 'completed';
}

export interface UniversityStudentRecord {
  id: string;
  institutionId: string;
  name: string;
  email: string;
  departmentId: string;
  departmentName: string;
  batchId: string;
  batchName: string;
  targetCareer: string;
  readinessScore: number;
  roadmapProgress: number;
  assignedMentorId: string;
  assignedMentorName: string;
  status: 'active' | 'at_risk' | 'graduated';
}

export interface UniversityMentorRecord {
  id: string;
  institutionId: string;
  name: string;
  email: string;
  specialization: string;
  departmentName: string;
  assignedStudentIds: string[];
  activeSessions: number;
  avgFeedbackScore: number;
  status: 'active' | 'on_leave';
}

export interface TrainingProgrammeRecord {
  id: string;
  institutionId: string;
  title: string;
  targetSkills: string[];
  targetGroup: string;
  resourceCount: number;
  resources: string[];
  enrolledCount: number;
  completionRate: number;
  outcomeScore: number;
  status: 'active' | 'planned' | 'completed';
}

export interface PlatformUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId: string;
  institutionName: string;
  status: 'active' | 'suspended';
  lastLogin: string;
}

export interface RolePermissionEntry {
  role: UserRole;
  label: string;
  description: string;
  permissions: {
    key: string;
    label: string;
    enabled: boolean;
  }[];
  lastReviewedAt: string;
}

export interface AIAgentRecord {
  id: string;
  name: string;
  codename: string;
  purpose: string;
  enabled: boolean;
  model: string;
  executionCount: number;
  avgDurationMs: number;
  failureRatePct: number;
  maxTokensBudget: number;
  safetyMode: 'strict' | 'balanced';
}

export interface KnowledgeSourceRecord {
  id: string;
  title: string;
  category: 'Career Taxonomy' | 'Skill Ontology' | 'Curriculum Guide' | 'Assessment Rubric';
  format: 'Markdown' | 'JSON' | 'PDF';
  chunkCount: number;
  status: 'indexed' | 'indexing' | 'error';
  errorMessage?: string;
  updatedAt: string;
}

export interface AgentExecutionLog {
  id: string;
  agentName: string;
  roleContext: UserRole;
  inputSummary: string;
  outputSummary: string;
  status: 'success' | 'error';
  durationMs: number;
  timestamp: string;
  errorDetail?: string;
}

export interface APIEndpointStat {
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  requests24h: number;
  avgLatencyMs: number;
  errorRatePct: number;
  status: 'healthy' | 'degraded';
  lastError?: string;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: UserRole;
  category: 'role_change' | 'permission_update' | 'admin_action' | 'security_event';
  action: string;
  target: string;
  timestamp: string;
  ipMasked: string;
}

export interface UniversitySettingsState {
  institutionName: string;
  institutionCode: string;
  academicTerm: string;
  gradingScale: '100-Point Scale' | '4.0 GPA' | 'Competency Mastery';
  autoAssignMentors: boolean;
  allowStudentPublicPassports: boolean;
  weeklyAdminDigest: boolean;
  minReadinessThreshold: number;
}

export interface PlatformSettingsState {
  platformName: string;
  maintenanceMode: boolean;
  enforceStrictRBAC: boolean;
  auditRetentionDays: number;
  defaultGeminiModel: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
  allowedGeminiModels: string[];
  maxConcurrentAgents: number;
  securityAlertsEmail: string;
}
