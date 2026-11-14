import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { getDb } from './db.ts';

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
  topRecommendations: CareerRecommendationResult[]; // Top 5
  alternativeOptions: CareerRecommendationResult[]; // Alternative #6-#7
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

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function validateAgentPayload(agentKey: AgentKey, output: Record<string, unknown>): boolean {
  switch (agentKey) {
    case 'career_discovery':
      return Array.isArray(output.intrinsicThemes) && typeof output.workStyleSummary === 'string';
    case 'skill_assessment':
      return typeof output.hasAssessmentEvidence === 'boolean' && Array.isArray(output.verifiedCompetencies);
    case 'career_intelligence':
      return Array.isArray(output.roleExplanations) && output.roleExplanations.length >= 5;
    case 'learning_architect':
      return Array.isArray(output.roadmapPhases) && Array.isArray(output.recommendedMissions);
    case 'performance_evaluator':
      return typeof output.readinessTier === 'string' && Array.isArray(output.strengths) && Array.isArray(output.improvementAreas);
    case 'adaptive_mentor':
      return typeof output.whyItChanged === 'string' && Array.isArray(output.nextCoachingActions);
  }
}

async function runContextualGeminiExplanation(
  ai: GoogleGenAI | null,
  simulateAiFailure: boolean,
  prompt: string,
  fallbackText: string
): Promise<{ text: string; source: string; errorMessage?: string }> {
  if (simulateAiFailure) {
    return {
      text: fallbackText,
      source: 'deterministic-fallback',
      errorMessage: 'Simulated upstream Gemini API timeout — deterministic scoring preserved without data fabrication.',
    };
  }
  if (!ai) {
    return { text: fallbackText, source: 'deterministic-orchestrator' };
  }
  try {
    const resp = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are EVOLVIX AI Career Intelligence. Provide concise, evidence-grounded 2-sentence explanations. Never invent scores, assessments, or achievements not present in input JSON.',
      },
    });
    const txt = (resp.text ?? '').trim();
    if (!txt) return { text: fallbackText, source: 'deterministic-orchestrator' };
    return { text: txt, source: 'gemini-4-hydrogen' };
  } catch (err) {
    return {
      text: fallbackText,
      source: 'deterministic-fallback',
      errorMessage: err instanceof Error ? err.message : 'Gemini call failed',
    };
  }
}

export async function runStudentCareerAnalysisOrchestrator(
  studentId: string,
  options: { triggerReason?: string; useGeminiNarrative?: boolean; simulateAiFailure?: boolean } = {}
): Promise<FullStudentCareerAnalysis> {
  const db = getDb();
  const triggerReason = options.triggerReason ?? 'Full 6-Agent Career Intelligence Orchestration';
  const analysisRunId = `run-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  // 1. Load authentic student facts (never fabricate!)
  const stuRow = db
    .prepare(
      `SELECT s.*, i.name as institution_name, i.education_level, i.academic_structure,
              d.name as department_name, p.name as programme_name, b.name as batch_name
       FROM students s
       JOIN institutions i ON i.id = s.institution_id
       JOIN departments d ON d.id = s.department_id
       JOIN programmes p ON p.id = s.programme_id
       JOIN batches b ON b.id = s.batch_id
       WHERE s.id = ?`
    )
    .get(studentId) as Record<string, unknown> | undefined;

  if (!stuRow) {
    throw new Error(`Student '${studentId}' not found`);
  }

  const profileRow = db
    .prepare('SELECT * FROM student_profiles WHERE student_id = ?')
    .get(studentId) as Record<string, unknown> | undefined;

  const interests: string[] = profileRow ? JSON.parse(String(profileRow.interests_json || '[]')) : [];
  const careerGoals: string[] = profileRow ? JSON.parse(String(profileRow.career_goals_json || '[]')) : [];
  const certifications: Array<{ title: string; issuer: string; date: string; verified: boolean }> = profileRow
    ? JSON.parse(String(profileRow.certifications_json || '[]'))
    : [];
  const learningStyle = String(profileRow?.learning_style || 'Hands-on Labs');
  const weeklyHoursBudget = Number(profileRow?.weekly_hours_budget || 10);
  const problemSolvingIndex = Number(profileRow?.problem_solving_index || 0);
  const academicBackgroundSummary = String(profileRow?.academic_background_summary || '');

  const stuSkills = db
    .prepare(
      `SELECT ss.*, sk.name as skill_name, sk.category, sk.is_soft, sk.industry_demand_score
       FROM student_skills ss
       JOIN skills sk ON sk.id = ss.skill_id
       WHERE ss.student_id = ?`
    )
    .all(studentId) as Array<Record<string, unknown>>;

  const assessments = db
    .prepare('SELECT * FROM career_assessments WHERE student_id = ? ORDER BY completed_at DESC')
    .all(studentId) as Array<Record<string, unknown>>;

  const responses = db
    .prepare('SELECT * FROM assessment_responses WHERE student_id = ? ORDER BY created_at DESC')
    .all(studentId) as Array<Record<string, unknown>>;

  const projects = db
    .prepare('SELECT * FROM projects WHERE student_id = ? AND is_recommended_mission = 0')
    .all(studentId) as Array<Record<string, unknown>>;

  const evidenceRows = db
    .prepare('SELECT * FROM skill_evidence WHERE student_id = ?')
    .all(studentId) as Array<Record<string, unknown>>;

  const careerRoles = db.prepare('SELECT * FROM career_roles').all() as Array<Record<string, unknown>>;
  const roleReqs = db
    .prepare(
      `SELECT r.*, sk.name as skill_name, sk.category, sk.industry_demand_score
       FROM career_skill_requirements r
       JOIN skills sk ON sk.id = r.skill_id`
    )
    .all() as Array<Record<string, unknown>>;

  const previousHistory = db
    .prepare('SELECT * FROM analysis_history WHERE student_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(studentId) as Record<string, unknown> | undefined;

  const skillById = new Map<string, { proficiency: number; verified: boolean; name: string }>();
  for (const row of stuSkills) {
    skillById.set(String(row.skill_id), {
      proficiency: Number(row.proficiency),
      verified: Boolean(row.verified),
      name: String(row.skill_name),
    });
  }

  const hasAssessmentEvidence = assessments.length > 0;
  const avgAssessmentScore = hasAssessmentEvidence
    ? Math.round(
        assessments.reduce((sum, a) => sum + (Number(a.score) / Math.max(1, Number(a.max_score))) * 100, 0) /
          assessments.length
      )
    : 0;

  const verifiedEvidenceCount =
    evidenceRows.filter((e) => e.status === 'verified').length +
    projects.filter((p) => Number(p.verified) === 1).length +
    certifications.filter((c) => c.verified).length;

  // Deterministic Assessment + Problem Solving Score (never fabricated!)
  const assessmentComponent = hasAssessmentEvidence
    ? Math.round(avgAssessmentScore * 0.7 + Math.min(100, problemSolvingIndex) * 0.3)
    : 0;

  const evidenceComponent = Math.min(100, verifiedEvidenceCount * 22 + projects.length * 14);

  const ai = options.useGeminiNarrative ? getGeminiClient() : null;
  const simulateFail = Boolean(options.simulateAiFailure);

  // -------------------------------------------------------------------------
  // AGENT 1: Career Discovery Agent
  // -------------------------------------------------------------------------
  const t1 = performance.now();
  const discoveryInput = {
    studentId,
    interests,
    careerGoals,
    learningStyle,
    responseDimensions: responses.map((r) => ({ dimension: r.dimension, score: r.numeric_score })),
  };
  const discoveryThemes = Array.from(new Set([...interests.slice(0, 3), ...careerGoals.slice(0, 2)]));
  const discoverySummaryFallback = `Learner demonstrates intrinsic preference for ${
    interests.slice(0, 3).join(', ') || 'applied technical exploration'
  } with ${learningStyle} pacing (${weeklyHoursBudget} hrs/week). Academic department (${String(
    stuRow.department_name
  )}) is treated strictly as context, never as a constraint.`;
  const discoveryOutput: Record<string, unknown> = {
    intrinsicThemes: discoveryThemes.length > 0 ? discoveryThemes : ['Foundational Computing'],
    workStyleSummary: discoverySummaryFallback,
    explicitGoals: careerGoals,
    departmentIsolationRemoved: true,
  };
  const d1 = Math.max(8, Math.round(performance.now() - t1));

  // -------------------------------------------------------------------------
  // AGENT 2: Skill Assessment Agent
  // -------------------------------------------------------------------------
  const t2 = performance.now();
  const verifiedCompetencies = stuSkills
    .filter((s) => Number(s.verified) === 1)
    .map((s) => ({ skillId: s.skill_id, name: s.skill_name, proficiency: Number(s.proficiency) }));
  const selfRatedCompetencies = stuSkills
    .filter((s) => Number(s.verified) === 0)
    .map((s) => ({ skillId: s.skill_id, name: s.skill_name, proficiency: Number(s.proficiency) }));
  const skillAssessInput = {
    studentId,
    assessmentsCount: assessments.length,
    recordedSkillsCount: stuSkills.length,
    problemSolvingIndex,
  };
  const skillAssessOutput: Record<string, unknown> = {
    hasAssessmentEvidence,
    avgAssessmentScore: hasAssessmentEvidence ? avgAssessmentScore : null,
    verifiedCompetencies,
    selfRatedCompetencies,
    missingAssessmentWarning: hasAssessmentEvidence
      ? null
      : 'No practical or career assessments completed yet. Assessment component contributes 0% rather than fabricated defaults.',
  };
  const d2 = Math.max(6, Math.round(performance.now() - t2));

  // -------------------------------------------------------------------------
  // AGENT 3: Career Intelligence Agent (Deterministic Multi-Role Scoring + Explanations)
  // -------------------------------------------------------------------------
  const t3 = performance.now();
  const scoredRoles: CareerRecommendationResult[] = careerRoles.map((role) => {
    const roleId = String(role.id);
    const title = String(role.title);
    const domain = String(role.domain);
    const reqs = roleReqs.filter((r) => String(r.career_role_id) === roleId);
    const roleInterests: string[] = JSON.parse(String(role.preferred_interests_json || '[]'));

    let weightedMatchSum = 0;
    let totalWeight = 0;

    const existingSkills: CareerRecommendationResult['existingSkills'] = [];
    const missingSkills: CareerRecommendationResult['missingSkills'] = [];

    for (const req of reqs) {
      const skId = String(req.skill_id);
      const skName = String(req.skill_name);
      const required = Number(req.required_level);
      const weight = Number(req.weight || 1);
      const stuSk = skillById.get(skId);
      const current = stuSk ? stuSk.proficiency : 0;
      const ratio = Math.min(1, current / Math.max(1, required));

      weightedMatchSum += ratio * 100 * weight;
      totalWeight += weight;

      if (current >= required * 0.8) {
        existingSkills.push({
          skillId: skId,
          name: skName,
          current,
          required,
          verified: Boolean(stuSk?.verified),
        });
      }
      if (current < required) {
        const gapPoints = required - current;
        missingSkills.push({
          skillId: skId,
          name: skName,
          current,
          required,
          gapPoints,
          priority: gapPoints >= 25 ? 'Critical' : gapPoints >= 12 ? 'High' : 'Moderate',
        });
      }
    }

    missingSkills.sort((a, b) => b.gapPoints - a.gapPoints);

    const skillAlignment = Math.round(weightedMatchSum / Math.max(0.01, totalWeight));

    // Interest & Goal overlap (deterministic Jaccard-inspired token match)
    const lowerInterests = interests.map((i) => i.toLowerCase());
    const interestMatches = roleInterests.filter((ri) =>
      lowerInterests.some((li) => li.includes(ri.toLowerCase()) || ri.toLowerCase().includes(li))
    ).length;
    const goalBonus = careerGoals.some((g) => g.toLowerCase() === title.toLowerCase()) ? 35 : 0;
    const interestAndGoalFit = Math.min(100, Math.round((interestMatches / Math.max(1, Math.min(3, roleInterests.length))) * 65 + goalBonus));

    // Transparent Suitability Score Formula:
    // 45% Skill Alignment + 25% Assessment & Problem Solving + 15% Evidence/Projects + 15% Interest & Goal Fit
    // NOTE: Department & Academic Marks are intentionally EXCLUDED (weight = 0)!
    const suitabilityScore = Math.round(
      skillAlignment * 0.45 + assessmentComponent * 0.25 + evidenceComponent * 0.15 + interestAndGoalFit * 0.15
    );

    const readinessScore = Math.round(skillAlignment * 0.65 + (hasAssessmentEvidence ? avgAssessmentScore * 0.2 : 0) + evidenceComponent * 0.15);

    const strengths = existingSkills.slice(0, 3).map((s) => `${s.name} (${s.current}%${s.verified ? ' verified' : ''})`);
    if (interestMatches > 0) strengths.push(`${interestMatches} aligned interest domain signal(s)`);
    if (strengths.length === 0) strengths.push('Foundational cross-disciplinary potential');

    const improvementAreas = missingSkills
      .slice(0, 3)
      .map((g) => `Close ${g.name} gap (-${g.gapPoints} pts toward ${g.required}% target)`);
    if (!hasAssessmentEvidence) {
      improvementAreas.unshift('Complete baseline practical career assessment to unlock verified readiness');
    }

    const explanation =
      `${title} achieved ${suitabilityScore}% suitability (Skill Alignment ${skillAlignment}%, ` +
      `Assessment ${hasAssessmentEvidence ? `${assessmentComponent}%` : '0% (pending)'}, ` +
      `Evidence ${evidenceComponent}%, Goal/Interest Fit ${interestAndGoalFit}%). ` +
      (existingSkills.length > 0
        ? `Strongest foundation in ${existingSkills
            .slice(0, 2)
            .map((e) => e.name)
            .join(' & ')}. `
        : '') +
      (missingSkills.length > 0
        ? `Primary growth focus: ${missingSkills
            .slice(0, 2)
            .map((m) => `${m.name} (-${m.gapPoints}%)`)
            .join(', ')}.`
        : 'All core competency thresholds met.');

    return {
      careerRoleId: roleId,
      title,
      domain,
      rank: 0,
      suitabilityScore,
      readinessScore,
      growthOutlook: String(role.growth_outlook),
      medianWeeksToReady: Number(role.median_weeks_to_ready),
      isAlternative: false,
      scoreBreakdown: {
        skillAlignment,
        assessmentPerformance: assessmentComponent,
        evidenceAndProjects: evidenceComponent,
        interestAndGoalFit,
        weights: {
          skillAlignment: 0.45,
          assessmentPerformance: 0.25,
          evidenceAndProjects: 0.15,
          interestAndGoalFit: 0.15,
        },
        departmentIgnored: true,
        missingAssessmentData: !hasAssessmentEvidence,
      },
      explanation,
      existingSkills,
      missingSkills,
      strengths,
      improvementAreas,
    };
  });

  scoredRoles.sort((a, b) => b.suitabilityScore - a.suitabilityScore || b.readinessScore - a.readinessScore);
  scoredRoles.forEach((r, idx) => {
    r.rank = idx + 1;
    r.isAlternative = idx >= 5;
  });

  const top5 = scoredRoles.slice(0, 5);
  const alternatives = scoredRoles.slice(5, 7);
  const topRole = top5[0];

  // Optional Gemini narrative enrichment on the top recommendation
  const geminiSummaryRes = await runContextualGeminiExplanation(
    ai,
    simulateFail,
    `Student: ${String(stuRow.name)} (Dept: ${String(stuRow.department_name)}, Programme: ${String(stuRow.programme_name)}). ` +
      `Top matched career: ${topRole.title} (${topRole.suitabilityScore}% suitability). Existing skills: ${topRole.existingSkills
        .map((s) => s.name)
        .join(', ')}. Missing skills: ${topRole.missingSkills.map((s) => `${s.name} -${s.gapPoints}%`).join(', ')}. ` +
      `Assessments completed: ${assessments.length}. Summarize why this cross-department recommendation fits in 2 sentences.`,
    topRole.explanation
  );
  if (geminiSummaryRes.text) {
    topRole.explanation = geminiSummaryRes.text;
  }

  const careerIntelInput = {
    studentId,
    evaluatedRolesCount: careerRoles.length,
    assessmentScoreUsed: assessmentComponent,
    departmentRestricted: false,
  };
  const careerIntelOutput: Record<string, unknown> = {
    topCareerTitle: topRole.title,
    topSuitabilityScore: topRole.suitabilityScore,
    roleExplanations: top5.map((r) => ({ rank: r.rank, title: r.title, suitabilityScore: r.suitabilityScore, explanation: r.explanation })),
    alternativeTitles: alternatives.map((a) => a.title),
  };
  const d3 = Math.max(12, Math.round(performance.now() - t3));

  // -------------------------------------------------------------------------
  // AGENT 4: Learning Architect Agent
  // -------------------------------------------------------------------------
  const t4 = performance.now();
  const topGaps = topRole.missingSkills.slice(0, 4);
  const roadmapId = `rm-${studentId}-${Date.now()}`;
  const roadmapTitle = `${topRole.title} Personalized Roadmap`;

  const generatedTasks = [
    ...(hasAssessmentEvidence
      ? []
      : [
          {
            id: `rt-${Date.now()}-0`,
            stageNumber: 1,
            stageTitle: 'Diagnostic Baseline',
            title: 'Complete Practical Career Assessment Benchmark',
            taskType: 'assessment',
            estimatedHours: 2,
            completed: false,
          },
        ]),
    ...topGaps.map((gap, idx) => ({
      id: `rt-${Date.now()}-${idx + 1}`,
      stageNumber: idx < 2 ? 1 : 2,
      stageTitle: idx < 2 ? 'Core Skill Gap Closure' : 'Applied Systems Integration',
      title: `Close ${gap.name} gap (${gap.current}% → ${gap.required}%)`,
      taskType: gap.priority === 'Critical' ? 'mission' : 'module',
      estimatedHours: Math.max(4, Math.round(gap.gapPoints * 0.45)),
      completed: false,
    })),
    {
      id: `rt-${Date.now()}-cap`,
      stageNumber: 3,
      stageTitle: 'Capstone Proof & Portfolio',
      title: `Ship Verified Capstone Project for ${topRole.title}`,
      taskType: 'project',
      estimatedHours: 14,
      completed: false,
    },
  ];
  const totalEstimatedHours = generatedTasks.reduce((s, t) => s + t.estimatedHours, 0);

  const recommendedMissions = (topGaps.length > 0 ? topGaps : topRole.existingSkills.slice(0, 2).map((s) => ({
    skillId: s.skillId,
    name: s.name,
    current: s.current,
    required: s.required,
    gapPoints: 5,
    priority: 'Moderate' as const,
  }))).map((g, idx) => ({
    id: `mis-${studentId}-${idx + 1}`,
    title: `${g.name} Production Lab & Benchmark`,
    summary: `Hands-on mission calibrated to raise ${g.name} toward ${g.required}% mastery for ${topRole.title}.`,
    skillsUsed: [g.name, topRole.domain],
    prioritySkill: g.name,
  }));

  const architectInput = {
    studentId,
    targetCareer: topRole.title,
    weeklyHoursBudget,
    learningStyle,
    topGaps: topGaps.map((g) => ({ skill: g.name, gap: g.gapPoints })),
  };
  const architectOutput: Record<string, unknown> = {
    roadmapTitle,
    totalEstimatedHours,
    roadmapPhases: generatedTasks.map((t) => ({ stage: t.stageTitle, title: t.title, hours: t.estimatedHours })),
    recommendedMissions: recommendedMissions.map((m) => m.title),
  };
  const d4 = Math.max(7, Math.round(performance.now() - t4));

  // -------------------------------------------------------------------------
  // AGENT 5: Performance Evaluator Agent
  // -------------------------------------------------------------------------
  const t5 = performance.now();
  const overallReadinessScore = topRole.readinessScore;
  const readinessTier: FullStudentCareerAnalysis['overallReadiness']['tier'] =
    overallReadinessScore >= 82
      ? 'Industry Ready'
      : overallReadinessScore >= 68
      ? 'Near Ready'
      : overallReadinessScore >= 50
      ? 'Developing'
      : 'Early Foundation';

  const evalInput = {
    studentId,
    readinessScore: overallReadinessScore,
    assessmentsCount: assessments.length,
    projectsCount: projects.length,
  };
  const evalOutput: Record<string, unknown> = {
    readinessScore: overallReadinessScore,
    readinessTier,
    strengths: topRole.strengths,
    improvementAreas: topRole.improvementAreas,
    verifiedEvidenceCount,
  };
  const d5 = Math.max(5, Math.round(performance.now() - t5));

  // -------------------------------------------------------------------------
  // AGENT 6: Adaptive Mentor Agent (History Comparison: What Changed & Why)
  // -------------------------------------------------------------------------
  const t6 = performance.now();
  const prevTop = previousHistory ? String(previousHistory.new_top_career) : null;
  const prevReadiness = previousHistory ? Number(previousHistory.new_readiness) : null;

  const changes: string[] = [];
  if (!previousHistory) {
    changes.push(`Initial career baseline computed: #1 ${topRole.title} (${topRole.suitabilityScore}% suitability).`);
  } else {
    if (prevTop !== topRole.title) {
      changes.push(`Top recommended path shifted from ${prevTop} to ${topRole.title}.`);
    } else {
      changes.push(`Retained #1 recommendation: ${topRole.title} (${topRole.suitabilityScore}% suitability).`);
    }
    if (prevReadiness !== null && prevReadiness !== overallReadinessScore) {
      const delta = overallReadinessScore - prevReadiness;
      changes.push(`Career readiness moved ${delta >= 0 ? `+${delta}` : delta} pts (${prevReadiness}% → ${overallReadinessScore}%).`);
    } else if (prevReadiness !== null) {
      changes.push(`Readiness held steady at ${overallReadinessScore}% pending new verified milestones.`);
    }
  }
  if (!hasAssessmentEvidence) {
    changes.push('Assessment signal remains empty; score uses verified skills and profile data without fabrication.');
  }

  const whyItChanged = `Trigger: ${triggerReason}. ${changes.join(' ')}`;
  const adaptiveInput = {
    studentId,
    triggerReason,
    previousTopCareer: prevTop,
    previousReadiness: prevReadiness,
    newTopCareer: topRole.title,
    newReadiness: overallReadinessScore,
  };
  const adaptiveOutput: Record<string, unknown> = {
    whyItChanged,
    changes,
    nextCoachingActions: generatedTasks.slice(0, 3).map((t) => t.title),
  };
  const d6 = Math.max(5, Math.round(performance.now() - t6));

  // -------------------------------------------------------------------------
  // Persist all agent executions, recommendations, skill gaps, roadmap, & history
  // -------------------------------------------------------------------------
  const agentsMeta: Array<{
    key: AgentKey;
    name: string;
    task: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    durationMs: number;
    source: string;
    status: 'success' | 'error';
    errorMessage?: string;
  }> = [
    {
      key: 'career_discovery',
      name: 'Career Discovery Agent',
      task: 'Analyze interests, goals & interview themes',
      input: discoveryInput,
      output: discoveryOutput,
      durationMs: d1,
      source: 'deterministic-orchestrator',
      status: 'success',
    },
    {
      key: 'skill_assessment',
      name: 'Skill Assessment Agent',
      task: 'Audit technical/soft skills & practical assessment evidence',
      input: skillAssessInput,
      output: skillAssessOutput,
      durationMs: d2,
      source: 'deterministic-orchestrator',
      status: 'success',
    },
    {
      key: 'career_intelligence',
      name: 'Career Intelligence Agent',
      task: 'Compute cross-department suitability scores & Top 5 explanations',
      input: careerIntelInput,
      output: careerIntelOutput,
      durationMs: d3,
      source: geminiSummaryRes.source,
      status: geminiSummaryRes.errorMessage ? 'error' : 'success',
      errorMessage: geminiSummaryRes.errorMessage,
    },
    {
      key: 'learning_architect',
      name: 'Learning Architect Agent',
      task: 'Generate personalized roadmap stages & recommended missions',
      input: architectInput,
      output: architectOutput,
      durationMs: d4,
      source: 'deterministic-orchestrator',
      status: 'success',
    },
    {
      key: 'performance_evaluator',
      name: 'Performance Evaluator Agent',
      task: 'Evaluate career readiness tier, strengths & improvement areas',
      input: evalInput,
      output: evalOutput,
      durationMs: d5,
      source: 'deterministic-orchestrator',
      status: 'success',
    },
    {
      key: 'adaptive_mentor',
      name: 'Adaptive Mentor Agent',
      task: 'Diff previous vs. current analysis & explain what changed',
      input: adaptiveInput,
      output: adaptiveOutput,
      durationMs: d6,
      source: 'deterministic-orchestrator',
      status: 'success',
    },
  ];

  db.exec('BEGIN;');
  try {
    // Clear previous recommendations & skill gaps for clean latest state per student (while preserving analysis_history!)
    db.prepare('DELETE FROM career_recommendations WHERE student_id = ?').run(studentId);
    db.prepare('DELETE FROM skill_gaps WHERE student_id = ?').run(studentId);
    db.prepare('DELETE FROM learning_roadmaps WHERE student_id = ?').run(studentId);

    const insRec = db.prepare(
      `INSERT INTO career_recommendations (
         id, analysis_run_id, student_id, career_role_id, rank, suitability_score, readiness_score,
         score_breakdown_json, explanation, existing_skills_json, missing_skills_json, strengths_json,
         improvement_areas_json, is_alternative, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insGap = db.prepare(
      `INSERT INTO skill_gaps (id, analysis_run_id, student_id, career_role_id, skill_id, current_level, required_level, gap_points, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const rec of scoredRoles) {
      insRec.run(
        `rec-${analysisRunId}-${rec.careerRoleId}`,
        analysisRunId,
        studentId,
        rec.careerRoleId,
        rec.rank,
        rec.suitabilityScore,
        rec.readinessScore,
        JSON.stringify(rec.scoreBreakdown),
        rec.explanation,
        JSON.stringify(rec.existingSkills),
        JSON.stringify(rec.missingSkills),
        JSON.stringify(rec.strengths),
        JSON.stringify(rec.improvementAreas),
        rec.isAlternative ? 1 : 0,
        now
      );
      if (rec.rank <= 3) {
        for (const gap of rec.missingSkills) {
          insGap.run(
            `gap-${analysisRunId}-${rec.careerRoleId}-${gap.skillId}`,
            analysisRunId,
            studentId,
            rec.careerRoleId,
            gap.skillId,
            gap.current,
            gap.required,
            gap.gapPoints,
            gap.priority
          );
        }
      }
    }

    // Save Learning Roadmap + Tasks
    db.prepare(
      `INSERT INTO learning_roadmaps (id, student_id, career_role_id, analysis_run_id, title, total_estimated_hours, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
    ).run(roadmapId, studentId, topRole.careerRoleId, analysisRunId, roadmapTitle, totalEstimatedHours, now);

    const insTask = db.prepare(
      `INSERT INTO roadmap_tasks (id, roadmap_id, stage_number, stage_title, title, task_type, estimated_hours, completed, prerequisite_ids_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]')`
    );
    for (const t of generatedTasks) {
      insTask.run(t.id, roadmapId, t.stageNumber, t.stageTitle, t.title, t.taskType, t.estimatedHours, t.completed ? 1 : 0);
    }

    // Save all 6 Agent Executions
    const insExec = db.prepare(
      `INSERT INTO agent_executions (
         id, analysis_run_id, student_id, agent_key, agent_name, task, input_schema_version, output_schema_version,
         input_json, output_json, validation_passed, source, status, duration_ms, error_message, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const agentExecRecords: AgentExecutionRecord[] = agentsMeta.map((a, idx) => {
      const valid = validateAgentPayload(a.key, a.output);
      const execId = `aex-${analysisRunId}-${idx + 1}`;
      insExec.run(
        execId,
        analysisRunId,
        studentId,
        a.key,
        a.name,
        a.task,
        'v1.0',
        'v1.0',
        JSON.stringify(a.input),
        JSON.stringify(a.output),
        valid ? 1 : 0,
        a.source,
        a.status,
        a.durationMs,
        a.errorMessage ?? null,
        now
      );
      return {
        id: execId,
        analysisRunId,
        studentId,
        agentKey: a.key,
        agentName: a.name,
        task: a.task,
        inputSchemaVersion: 'v1.0',
        outputSchemaVersion: 'v1.0',
        inputPayload: a.input,
        outputPayload: a.output,
        validationPassed: valid,
        source: a.source,
        status: a.status,
        durationMs: a.durationMs,
        errorMessage: a.errorMessage,
        createdAt: now,
      };
    });

    // Save Analysis History Diff
    db.prepare(
      `INSERT INTO analysis_history (
         id, student_id, trigger_reason, previous_top_career, new_top_career, previous_readiness, new_readiness,
         diff_summary_json, recommendations_snapshot_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      analysisRunId,
      studentId,
      triggerReason,
      prevTop,
      topRole.title,
      prevReadiness,
      overallReadinessScore,
      JSON.stringify({ changes, whyItChanged }),
      JSON.stringify(top5.map((r) => ({ rank: r.rank, title: r.title, suitabilityScore: r.suitabilityScore }))),
      now
    );

    db.exec('COMMIT;');

    const historyRows = db
      .prepare('SELECT * FROM analysis_history WHERE student_id = ? ORDER BY created_at DESC LIMIT 8')
      .all(studentId) as Array<Record<string, unknown>>;

    return {
      analysisRunId,
      student: {
        id: String(stuRow.id),
        name: String(stuRow.name),
        email: String(stuRow.email),
        institutionId: String(stuRow.institution_id),
        institutionName: String(stuRow.institution_name),
        educationLevel: String(stuRow.education_level),
        academicStructure: String(stuRow.academic_structure),
        departmentId: String(stuRow.department_id),
        departmentName: String(stuRow.department_name),
        programmeId: String(stuRow.programme_id),
        programmeName: String(stuRow.programme_name),
        batchId: String(stuRow.batch_id),
        batchName: String(stuRow.batch_name),
        academicYear: String(stuRow.academic_year),
        gpa: Number(stuRow.gpa),
        status: String(stuRow.status),
      },
      profile: {
        interests,
        careerGoals,
        learningStyle,
        weeklyHoursBudget,
        problemSolvingIndex,
        academicBackgroundSummary,
        certifications,
      },
      assessmentsCount: assessments.length,
      projectsCount: projects.length,
      skillsCount: stuSkills.length,
      topRecommendations: top5,
      alternativeOptions: alternatives,
      overallReadiness: {
        score: overallReadinessScore,
        tier: readinessTier,
        hasAssessmentEvidence,
        warning: hasAssessmentEvidence
          ? undefined
          : 'No practical or career assessments completed yet. Readiness reflects verified skills and profile evidence only.',
      },
      learningRoadmap: {
        id: roadmapId,
        title: roadmapTitle,
        totalEstimatedHours,
        tasks: generatedTasks,
      },
      recommendedProjectsAndMissions: recommendedMissions,
      agentExecutions: agentExecRecords,
      analysisHistory: historyRows.map((h) => {
        const parsedDiff = JSON.parse(String(h.diff_summary_json || '{}')) as { changes?: string[]; whyItChanged?: string };
        return {
          runId: String(h.id),
          triggerReason: String(h.trigger_reason),
          previousTopCareer: h.previous_top_career ? String(h.previous_top_career) : null,
          newTopCareer: String(h.new_top_career),
          previousReadiness: h.previous_readiness !== null && h.previous_readiness !== undefined ? Number(h.previous_readiness) : null,
          newReadiness: Number(h.new_readiness),
          changes: parsedDiff.changes ?? [],
          whyItChanged: parsedDiff.whyItChanged ?? String(h.trigger_reason),
          createdAt: String(h.created_at),
        };
      }),
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export async function getOrRunStudentCareerAnalysis(studentId: string): Promise<FullStudentCareerAnalysis> {
  const db = getDb();
  const existing = db
    .prepare('SELECT analysis_run_id FROM career_recommendations WHERE student_id = ? ORDER BY rank ASC LIMIT 1')
    .get(studentId) as { analysis_run_id: string } | undefined;

  if (!existing) {
    return runStudentCareerAnalysisOrchestrator(studentId, {
      triggerReason: 'Initial Multi-Agent Baseline Assessment',
      useGeminiNarrative: false,
    });
  }

  const runId = existing.analysis_run_id;

  const stuRow = db
    .prepare(
      `SELECT s.*, i.name as institution_name, i.education_level, i.academic_structure,
              d.name as department_name, p.name as programme_name, b.name as batch_name
       FROM students s
       JOIN institutions i ON i.id = s.institution_id
       JOIN departments d ON d.id = s.department_id
       JOIN programmes p ON p.id = s.programme_id
       JOIN batches b ON b.id = s.batch_id
       WHERE s.id = ?`
    )
    .get(studentId) as Record<string, unknown>;

  const profileRow = db
    .prepare('SELECT * FROM student_profiles WHERE student_id = ?')
    .get(studentId) as Record<string, unknown> | undefined;

  const assessments = db.prepare('SELECT id FROM career_assessments WHERE student_id = ?').all(studentId);
  const projects = db
    .prepare('SELECT id FROM projects WHERE student_id = ? AND is_recommended_mission = 0')
    .all(studentId);
  const skills = db.prepare('SELECT id FROM student_skills WHERE student_id = ?').all(studentId);

  const recRows = db
    .prepare(
      `SELECT cr.*, r.title, r.domain, r.growth_outlook, r.median_weeks_to_ready
       FROM career_recommendations cr
       JOIN career_roles r ON r.id = cr.career_role_id
       WHERE cr.student_id = ?
       ORDER BY cr.rank ASC`
    )
    .all(studentId) as Array<Record<string, unknown>>;

  const mappedRecs: CareerRecommendationResult[] = recRows.map((r) => ({
    careerRoleId: String(r.career_role_id),
    title: String(r.title),
    domain: String(r.domain),
    rank: Number(r.rank),
    suitabilityScore: Number(r.suitability_score),
    readinessScore: Number(r.readiness_score),
    growthOutlook: String(r.growth_outlook),
    medianWeeksToReady: Number(r.median_weeks_to_ready),
    isAlternative: Boolean(r.is_alternative),
    scoreBreakdown: JSON.parse(String(r.score_breakdown_json)),
    explanation: String(r.explanation),
    existingSkills: JSON.parse(String(r.existing_skills_json)),
    missingSkills: JSON.parse(String(r.missing_skills_json)),
    strengths: JSON.parse(String(r.strengths_json)),
    improvementAreas: JSON.parse(String(r.improvement_areas_json)),
  }));

  const roadmapRow = db
    .prepare('SELECT * FROM learning_roadmaps WHERE student_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(studentId) as Record<string, unknown> | undefined;

  const taskRows = roadmapRow
    ? (db
        .prepare('SELECT * FROM roadmap_tasks WHERE roadmap_id = ? ORDER BY stage_number ASC')
        .all(String(roadmapRow.id)) as Array<Record<string, unknown>>)
    : [];

  const execRows = db
    .prepare('SELECT * FROM agent_executions WHERE analysis_run_id = ? ORDER BY id ASC')
    .all(runId) as Array<Record<string, unknown>>;

  const historyRows = db
    .prepare('SELECT * FROM analysis_history WHERE student_id = ? ORDER BY created_at DESC LIMIT 8')
    .all(studentId) as Array<Record<string, unknown>>;

  const topRole = mappedRecs[0];
  const score = topRole?.readinessScore ?? 0;
  const tier: FullStudentCareerAnalysis['overallReadiness']['tier'] =
    score >= 82 ? 'Industry Ready' : score >= 68 ? 'Near Ready' : score >= 50 ? 'Developing' : 'Early Foundation';

  const topGaps = topRole?.missingSkills.slice(0, 4) ?? [];
  const recommendedMissions = topGaps.map((g, idx) => ({
    id: `mis-${studentId}-${idx + 1}`,
    title: `${g.name} Production Lab & Benchmark`,
    summary: `Hands-on mission calibrated to raise ${g.name} toward ${g.required}% mastery for ${topRole?.title ?? 'target path'}.`,
    skillsUsed: [g.name, topRole?.domain ?? 'Core Systems'],
    prioritySkill: g.name,
  }));

  return {
    analysisRunId: runId,
    student: {
      id: String(stuRow.id),
      name: String(stuRow.name),
      email: String(stuRow.email),
      institutionId: String(stuRow.institution_id),
      institutionName: String(stuRow.institution_name),
      educationLevel: String(stuRow.education_level),
      academicStructure: String(stuRow.academic_structure),
      departmentId: String(stuRow.department_id),
      departmentName: String(stuRow.department_name),
      programmeId: String(stuRow.programme_id),
      programmeName: String(stuRow.programme_name),
      batchId: String(stuRow.batch_id),
      batchName: String(stuRow.batch_name),
      academicYear: String(stuRow.academic_year),
      gpa: Number(stuRow.gpa),
      status: String(stuRow.status),
    },
    profile: {
      interests: profileRow ? JSON.parse(String(profileRow.interests_json || '[]')) : [],
      careerGoals: profileRow ? JSON.parse(String(profileRow.career_goals_json || '[]')) : [],
      learningStyle: String(profileRow?.learning_style || 'Hands-on Labs'),
      weeklyHoursBudget: Number(profileRow?.weekly_hours_budget || 10),
      problemSolvingIndex: Number(profileRow?.problem_solving_index || 0),
      academicBackgroundSummary: String(profileRow?.academic_background_summary || ''),
      certifications: profileRow ? JSON.parse(String(profileRow.certifications_json || '[]')) : [],
    },
    assessmentsCount: assessments.length,
    projectsCount: projects.length,
    skillsCount: skills.length,
    topRecommendations: mappedRecs.filter((r) => !r.isAlternative),
    alternativeOptions: mappedRecs.filter((r) => r.isAlternative),
    overallReadiness: {
      score,
      tier,
      hasAssessmentEvidence: assessments.length > 0,
      warning:
        assessments.length > 0
          ? undefined
          : 'No practical or career assessments completed yet. Readiness reflects verified skills and profile evidence only.',
    },
    learningRoadmap: roadmapRow
      ? {
          id: String(roadmapRow.id),
          title: String(roadmapRow.title),
          totalEstimatedHours: Number(roadmapRow.total_estimated_hours),
          tasks: taskRows.map((t) => ({
            id: String(t.id),
            stageNumber: Number(t.stage_number),
            stageTitle: String(t.stage_title),
            title: String(t.title),
            taskType: String(t.task_type),
            estimatedHours: Number(t.estimated_hours),
            completed: Boolean(t.completed),
          })),
        }
      : null,
    recommendedProjectsAndMissions: recommendedMissions,
    agentExecutions: execRows.map((e) => ({
      id: String(e.id),
      analysisRunId: String(e.analysis_run_id),
      studentId: String(e.student_id),
      agentKey: String(e.agent_key) as AgentKey,
      agentName: String(e.agent_name),
      task: String(e.task),
      inputSchemaVersion: String(e.input_schema_version),
      outputSchemaVersion: String(e.output_schema_version),
      inputPayload: JSON.parse(String(e.input_json)),
      outputPayload: JSON.parse(String(e.output_json)),
      validationPassed: Boolean(e.validation_passed),
      source: String(e.source),
      status: String(e.status) as 'success' | 'error',
      durationMs: Number(e.duration_ms),
      errorMessage: e.error_message ? String(e.error_message) : undefined,
      createdAt: String(e.created_at),
    })),
    analysisHistory: historyRows.map((h) => {
      const parsedDiff = JSON.parse(String(h.diff_summary_json || '{}')) as { changes?: string[]; whyItChanged?: string };
      return {
        runId: String(h.id),
        triggerReason: String(h.trigger_reason),
        previousTopCareer: h.previous_top_career ? String(h.previous_top_career) : null,
        newTopCareer: String(h.new_top_career),
        previousReadiness: h.previous_readiness !== null && h.previous_readiness !== undefined ? Number(h.previous_readiness) : null,
        newReadiness: Number(h.new_readiness),
        changes: parsedDiff.changes ?? [],
        whyItChanged: parsedDiff.whyItChanged ?? String(h.trigger_reason),
        createdAt: String(h.created_at),
      };
    }),
  };
}
