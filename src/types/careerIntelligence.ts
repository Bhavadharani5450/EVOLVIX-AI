export type AgentKey =
  | 'career_discovery'
  | 'skill_assessment'
  | 'career_intelligence'
  | 'learning_architect'
  | 'performance_evaluator'
  | 'adaptive_mentor';

export interface ScoreBreakdown {
  skillAlignment: number;
  assessmentPerformance: number;
  evidenceAndProjects: number;
  interestAndGoalFit: number;
  weights: {
    skillAlignment: number;
    assessmentPerformance: number;
    evidenceAndProjects: number;
    interestAndGoalFit: number;
  };
  departmentIgnored: boolean;
  missingAssessmentData: boolean;
}

export interface CareerRecommendationResult {
  careerRoleId: string;
  title: string;
  domain: string;
  rank: number;
  suitabilityScore: number;
  readinessScore: number;
  growthOutlook: string;
  medianWeeksToReady: number;
  isAlternative: boolean;
  scoreBreakdown: ScoreBreakdown;
  explanation: string;
  existingSkills: Array<{ skillId: string; name: string; current: number; required: number; verified: boolean }>;
  missingSkills: Array<{
    skillId: string;
    name: string;
    current: number;
    required: number;
    gapPoints: number;
    priority: 'Critical' | 'High' | 'Moderate';
  }>;
  strengths: string[];
  improvementAreas: string[];
}

export interface AgentExecutionRecord {
  id: string;
  analysisRunId: string;
  studentId: string;
  agentKey: AgentKey;
  agentName: string;
  task: string;
  inputSchemaVersion: string;
  outputSchemaVersion: string;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  validationPassed: boolean;
  source: string;
  status: 'success' | 'error';
  durationMs: number;
  errorMessage?: string;
  createdAt: string;
}

export interface AdaptiveDiffReport {
  runId: string;
  triggerReason: string;
  previousTopCareer: string | null;
  newTopCareer: string;
  previousReadiness: number | null;
  newReadiness: number;
  changes: string[];
  whyItChanged: string;
  createdAt: string;
}

export interface FullStudentCareerAnalysis {
  analysisRunId: string;
  student: {
    id: string;
    name: string;
    email: string;
    institutionId: string;
    institutionName: string;
    educationLevel: string;
    academicStructure: string;
    departmentId: string;
    departmentName: string;
    programmeId: string;
    programmeName: string;
    batchId: string;
    batchName: string;
    academicYear: string;
    gpa: number;
    status: string;
  };
  profile: {
    interests: string[];
    careerGoals: string[];
    learningStyle: string;
    weeklyHoursBudget: number;
    problemSolvingIndex: number;
    academicBackgroundSummary: string;
    certifications: Array<{ title: string; issuer: string; date: string; verified: boolean }>;
  };
  assessmentsCount: number;
  projectsCount: number;
  skillsCount: number;
  topRecommendations: CareerRecommendationResult[];
  alternativeOptions: CareerRecommendationResult[];
  overallReadiness: {
    score: number;
    tier: 'Industry Ready' | 'Near Ready' | 'Developing' | 'Early Foundation';
    hasAssessmentEvidence: boolean;
    warning?: string;
  };
  learningRoadmap: {
    id: string;
    title: string;
    totalEstimatedHours: number;
    tasks: Array<{
      id: string;
      stageNumber: number;
      stageTitle: string;
      title: string;
      taskType: string;
      estimatedHours: number;
      completed: boolean;
    }>;
  } | null;
  recommendedProjectsAndMissions: Array<{
    id: string;
    title: string;
    summary: string;
    skillsUsed: string[];
    prioritySkill: string;
  }>;
  agentExecutions: AgentExecutionRecord[];
  analysisHistory: AdaptiveDiffReport[];
}

export interface InstitutionIntelligenceReport {
  scope: {
    institutionId: string;
    institutionName: string;
    isCrossInstitution: boolean;
    filtersApplied: {
      institutionId?: string;
      departmentId?: string;
      programmeId?: string;
      batchId?: string;
      academicYear?: string;
    };
  };
  filterOptions: {
    institutions: Array<{ id: string; name: string; educationLevel: string; academicStructure: string }>;
    departments: Array<{ id: string; institutionId: string; name: string }>;
    programmes: Array<{ id: string; institutionId: string; departmentId: string; name: string; level: string }>;
    batches: Array<{ id: string; institutionId: string; programmeId: string; name: string; academicYear: string }>;
    academicYears: string[];
  };
  kpis: {
    totalStudents: number;
    analyzedStudents: number;
    avgReadinessScore: number;
    avgTopSuitabilityScore: number;
    industryReadyPct: number;
    crossDepartmentMatchesCount: number;
  };
  careerPreferenceDistribution: Array<{ career: string; count: number; sharePct: number }>;
  careerSuitabilityDistribution: Array<{ career: string; count: number; avgSuitability: number; avgReadiness: number }>;
  departmentBreakdown: Array<{
    departmentId: string;
    departmentName: string;
    institutionName: string;
    studentCount: number;
    avgReadiness: number;
    topGapSkill: string;
  }>;
  programmeBreakdown: Array<{ programmeId: string; programmeName: string; level: string; studentCount: number; avgReadiness: number }>;
  batchBreakdown: Array<{ batchId: string; batchName: string; academicYear: string; studentCount: number; avgReadiness: number }>;
  commonMissingSkills: Array<{
    skillId: string;
    skillName: string;
    category: string;
    affectedStudents: number;
    avgGapPoints: number;
    criticalCount: number;
  }>;
  trainingRecommendations: Array<{
    id: string;
    title: string;
    targetSkill: string;
    targetDepartments: string[];
    affectedLearners: number;
    priority: 'Critical' | 'High' | 'Moderate';
    recommendedFormat: string;
    expectedReadinessLiftPts: number;
  }>;
  crossInstitutionSummary?: Array<{
    institutionId: string;
    institutionName: string;
    educationLevel: string;
    academicStructure: string;
    studentCount: number;
    avgReadiness: number;
    topCareer: string;
    topMissingSkill: string;
  }>;
}
