import crypto from 'node:crypto';
import { getDb, type AuthContextUser } from './db.ts';
import { getOrRunStudentCareerAnalysis } from './orchestrator.ts';

export interface InstitutionAnalyticsFilter {
  institutionId?: string;
  departmentId?: string;
  programmeId?: string;
  batchId?: string;
  academicYear?: string;
}

export interface InstitutionIntelligenceReport {
  scope: {
    institutionId: string;
    institutionName: string;
    isCrossInstitution: boolean;
    filtersApplied: InstitutionAnalyticsFilter;
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

export async function ensureAllStudentsAnalyzed() {
  const db = getDb();
  const unanalyzed = db
    .prepare(
      `SELECT s.id FROM students s
       LEFT JOIN (SELECT DISTINCT student_id FROM career_recommendations) cr ON cr.student_id = s.id
       WHERE cr.student_id IS NULL`
    )
    .all() as Array<{ id: string }>;

  for (const row of unanalyzed) {
    await getOrRunStudentCareerAnalysis(row.id);
  }
}

export async function computeInstitutionCareerIntelligence(
  user: AuthContextUser,
  filters: InstitutionAnalyticsFilter
): Promise<InstitutionIntelligenceReport> {
  const db = getDb();

  // Enforce strict tenant isolation
  let effectiveInstitutionId = filters.institutionId || user.institutionId;
  if (user.role === 'university_admin') {
    if (filters.institutionId && filters.institutionId !== user.institutionId) {
      throw new Error('Forbidden: Institution Admin cannot view analytics for another institution.');
    }
    effectiveInstitutionId = user.institutionId;
  } else if (user.role === 'mentor' || user.role === 'student') {
    if (filters.institutionId && filters.institutionId !== user.institutionId) {
      throw new Error('Forbidden: Cross-institution analytics requires Super Admin privileges.');
    }
    effectiveInstitutionId = user.institutionId;
  }

  const isCrossInstitution = user.role === 'super_admin' && effectiveInstitutionId === 'ALL';

  await ensureAllStudentsAnalyzed();

  // Load filter dropdown options respecting scope
  const allInsts = db.prepare('SELECT id, name, education_level, academic_structure FROM institutions ORDER BY name').all() as Array<
    Record<string, unknown>
  >;
  const scopedInsts = user.role === 'super_admin' ? allInsts : allInsts.filter((i) => String(i.id) === user.institutionId);

  const deptSql = isCrossInstitution
    ? 'SELECT id, institution_id, name FROM departments ORDER BY name'
    : 'SELECT id, institution_id, name FROM departments WHERE institution_id = ? ORDER BY name';
  const depts = (isCrossInstitution ? db.prepare(deptSql).all() : db.prepare(deptSql).all(effectiveInstitutionId)) as Array<
    Record<string, unknown>
  >;

  const progSql = isCrossInstitution
    ? 'SELECT id, institution_id, department_id, name, level FROM programmes ORDER BY name'
    : 'SELECT id, institution_id, department_id, name, level FROM programmes WHERE institution_id = ? ORDER BY name';
  const progs = (isCrossInstitution ? db.prepare(progSql).all() : db.prepare(progSql).all(effectiveInstitutionId)) as Array<
    Record<string, unknown>
  >;

  const batchSql = isCrossInstitution
    ? 'SELECT id, institution_id, programme_id, name, academic_year FROM batches ORDER BY academic_year DESC, name'
    : 'SELECT id, institution_id, programme_id, name, academic_year FROM batches WHERE institution_id = ? ORDER BY academic_year DESC, name';
  const batches = (isCrossInstitution ? db.prepare(batchSql).all() : db.prepare(batchSql).all(effectiveInstitutionId)) as Array<
    Record<string, unknown>
  >;

  const yearsSet = Array.from(new Set(batches.map((b) => String(b.academic_year)))).sort();

  // Build filtered student query
  const whereClauses: string[] = [];
  const params: Array<string> = [];

  if (!isCrossInstitution) {
    whereClauses.push('s.institution_id = ?');
    params.push(effectiveInstitutionId);
  }
  if (filters.departmentId && filters.departmentId !== 'ALL') {
    whereClauses.push('s.department_id = ?');
    params.push(filters.departmentId);
  }
  if (filters.programmeId && filters.programmeId !== 'ALL') {
    whereClauses.push('s.programme_id = ?');
    params.push(filters.programmeId);
  }
  if (filters.batchId && filters.batchId !== 'ALL') {
    whereClauses.push('s.batch_id = ?');
    params.push(filters.batchId);
  }
  if (filters.academicYear && filters.academicYear !== 'ALL') {
    whereClauses.push('s.academic_year = ?');
    params.push(filters.academicYear);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const studentRows = db
    .prepare(
      `SELECT s.*, i.name as institution_name, d.name as department_name, p.name as programme_name, p.level as programme_level,
              b.name as batch_name, sp.career_goals_json,
              cr.career_role_id as top_career_id, r.title as top_career_title, r.domain as top_career_domain,
              cr.suitability_score as top_suitability, cr.readiness_score as top_readiness
       FROM students s
       JOIN institutions i ON i.id = s.institution_id
       JOIN departments d ON d.id = s.department_id
       JOIN programmes p ON p.id = s.programme_id
       JOIN batches b ON b.id = s.batch_id
       LEFT JOIN student_profiles sp ON sp.student_id = s.id
       LEFT JOIN career_recommendations cr ON cr.student_id = s.id AND cr.rank = 1
       LEFT JOIN career_roles r ON r.id = cr.career_role_id
       ${whereSql}`
    )
    .all(...params) as Array<Record<string, unknown>>;

  const studentIds = studentRows.map((s) => String(s.id));

  // Career preferences distribution
  const prefMap = new Map<string, number>();
  let totalPrefs = 0;
  for (const s of studentRows) {
    const goals: string[] = s.career_goals_json ? JSON.parse(String(s.career_goals_json)) : [];
    for (const g of goals) {
      prefMap.set(g, (prefMap.get(g) ?? 0) + 1);
      totalPrefs += 1;
    }
  }
  const careerPreferenceDistribution = Array.from(prefMap.entries())
    .map(([career, count]) => ({
      career,
      count,
      sharePct: Math.round((count / Math.max(1, totalPrefs)) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Career suitability distribution (from #1 deterministic match)
  const suitMap = new Map<string, { count: number; totalSuit: number; totalReady: number }>();
  let crossDeptMatches = 0;
  for (const s of studentRows) {
    const title = String(s.top_career_title || 'Unanalyzed');
    const entry = suitMap.get(title) ?? { count: 0, totalSuit: 0, totalReady: 0 };
    entry.count += 1;
    entry.totalSuit += Number(s.top_suitability || 0);
    entry.totalReady += Number(s.top_readiness || 0);
    suitMap.set(title, entry);

    const deptLower = String(s.department_name || '').toLowerCase();
    const domLower = String(s.top_career_domain || '').toLowerCase();
    if (deptLower && domLower && !deptLower.includes('computer') && domLower.includes('ai')) {
      crossDeptMatches += 1;
    } else if (deptLower.includes('humanities') || deptLower.includes('mechanical') || deptLower.includes('electrical')) {
      crossDeptMatches += 1;
    }
  }
  const careerSuitabilityDistribution = Array.from(suitMap.entries())
    .map(([career, v]) => ({
      career,
      count: v.count,
      avgSuitability: Math.round(v.totalSuit / Math.max(1, v.count)),
      avgReadiness: Math.round(v.totalReady / Math.max(1, v.count)),
    }))
    .sort((a, b) => b.count - a.count);

  // Skill gaps across filtered students
  let gapRows: Array<Record<string, unknown>> = [];
  if (studentIds.length > 0) {
    const placeholders = studentIds.map(() => '?').join(',');
    gapRows = db
      .prepare(
        `SELECT sg.student_id, sg.skill_id, sg.gap_points, sg.priority, sk.name as skill_name, sk.category,
                s.department_id, d.name as department_name
         FROM skill_gaps sg
         JOIN skills sk ON sk.id = sg.skill_id
         JOIN students s ON s.id = sg.student_id
         JOIN departments d ON d.id = s.department_id
         WHERE sg.student_id IN (${placeholders})`
      )
      .all(...studentIds) as Array<Record<string, unknown>>;
  }

  // Common missing skills
  const gapSkillMap = new Map<
    string,
    { skillId: string; skillName: string; category: string; students: Set<string>; totalGap: number; entries: number; criticalCount: number; depts: Set<string> }
  >();
  const deptTopGapMap = new Map<string, Map<string, number>>();

  for (const g of gapRows) {
    const skId = String(g.skill_id);
    const skName = String(g.skill_name);
    const stuId = String(g.student_id);
    const deptName = String(g.department_name);

    const item = gapSkillMap.get(skId) ?? {
      skillId: skId,
      skillName: skName,
      category: String(g.category),
      students: new Set<string>(),
      totalGap: 0,
      entries: 0,
      criticalCount: 0,
      depts: new Set<string>(),
    };
    item.students.add(stuId);
    item.totalGap += Number(g.gap_points);
    item.entries += 1;
    if (String(g.priority) === 'Critical') item.criticalCount += 1;
    item.depts.add(deptName);
    gapSkillMap.set(skId, item);

    const dMap = deptTopGapMap.get(String(g.department_id)) ?? new Map<string, number>();
    dMap.set(skName, (dMap.get(skName) ?? 0) + Number(g.gap_points));
    deptTopGapMap.set(String(g.department_id), dMap);
  }

  const commonMissingSkills = Array.from(gapSkillMap.values())
    .map((v) => ({
      skillId: v.skillId,
      skillName: v.skillName,
      category: v.category,
      affectedStudents: v.students.size,
      avgGapPoints: Math.round(v.totalGap / Math.max(1, v.entries)),
      criticalCount: v.criticalCount,
    }))
    .sort((a, b) => b.affectedStudents - a.affectedStudents || b.avgGapPoints - a.avgGapPoints);

  // Department Breakdown
  const deptGroups = new Map<string, { name: string; instName: string; count: number; totalReadiness: number }>();
  for (const s of studentRows) {
    const id = String(s.department_id);
    const prev = deptGroups.get(id) ?? {
      name: String(s.department_name),
      instName: String(s.institution_name),
      count: 0,
      totalReadiness: 0,
    };
    prev.count += 1;
    prev.totalReadiness += Number(s.top_readiness || 0);
    deptGroups.set(id, prev);
  }
  const departmentBreakdown = Array.from(deptGroups.entries()).map(([departmentId, v]) => {
    const gapCounts = deptTopGapMap.get(departmentId);
    let topGapSkill = 'Balanced';
    if (gapCounts && gapCounts.size > 0) {
      topGapSkill = Array.from(gapCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    }
    return {
      departmentId,
      departmentName: v.name,
      institutionName: v.instName,
      studentCount: v.count,
      avgReadiness: Math.round(v.totalReadiness / Math.max(1, v.count)),
      topGapSkill,
    };
  });

  // Programme Breakdown
  const progGroups = new Map<string, { name: string; level: string; count: number; totalReadiness: number }>();
  for (const s of studentRows) {
    const id = String(s.programme_id);
    const prev = progGroups.get(id) ?? {
      name: String(s.programme_name),
      level: String(s.programme_level),
      count: 0,
      totalReadiness: 0,
    };
    prev.count += 1;
    prev.totalReadiness += Number(s.top_readiness || 0);
    progGroups.set(id, prev);
  }
  const programmeBreakdown = Array.from(progGroups.entries()).map(([programmeId, v]) => ({
    programmeId,
    programmeName: v.name,
    level: v.level,
    studentCount: v.count,
    avgReadiness: Math.round(v.totalReadiness / Math.max(1, v.count)),
  }));

  // Batch Breakdown
  const batchGroups = new Map<string, { name: string; academicYear: string; count: number; totalReadiness: number }>();
  for (const s of studentRows) {
    const id = String(s.batch_id);
    const prev = batchGroups.get(id) ?? {
      name: String(s.batch_name),
      academicYear: String(s.academic_year),
      count: 0,
      totalReadiness: 0,
    };
    prev.count += 1;
    prev.totalReadiness += Number(s.top_readiness || 0);
    batchGroups.set(id, prev);
  }
  const batchBreakdown = Array.from(batchGroups.entries()).map(([batchId, v]) => ({
    batchId,
    batchName: v.name,
    academicYear: v.academicYear,
    studentCount: v.count,
    avgReadiness: Math.round(v.totalReadiness / Math.max(1, v.count)),
  }));

  // Actionable Training Recommendations
  const trainingRecommendations = commonMissingSkills.slice(0, 4).map((m, idx) => {
    const gapMeta = gapSkillMap.get(m.skillId);
    const priority: 'Critical' | 'High' | 'Moderate' =
      m.criticalCount > 0 || m.avgGapPoints >= 22 ? 'Critical' : m.avgGapPoints >= 14 ? 'High' : 'Moderate';
    return {
      id: `tr-rec-${idx + 1}`,
      title: `${m.skillName} Intensive Bootcamp`,
      targetSkill: m.skillName,
      targetDepartments: gapMeta ? Array.from(gapMeta.depts) : ['All Departments'],
      affectedLearners: m.affectedStudents,
      priority,
      recommendedFormat: idx % 2 === 0 ? '4-Week Hands-On Lab Sprint' : '2-Week Mentor-Guided Capstone Studio',
      expectedReadinessLiftPts: Math.min(18, Math.max(6, Math.round(m.avgGapPoints * 0.45))),
    };
  });

  const totalStudents = studentRows.length;
  const avgReadinessScore =
    totalStudents > 0
      ? Math.round(studentRows.reduce((s, r) => s + Number(r.top_readiness || 0), 0) / totalStudents)
      : 0;
  const avgTopSuitabilityScore =
    totalStudents > 0
      ? Math.round(studentRows.reduce((s, r) => s + Number(r.top_suitability || 0), 0) / totalStudents)
      : 0;
  const readyStudents = studentRows.filter((r) => Number(r.top_readiness || 0) >= 75).length;
  const industryReadyPct = totalStudents > 0 ? Math.round((readyStudents / totalStudents) * 100) : 0;

  let crossInstitutionSummary: InstitutionIntelligenceReport['crossInstitutionSummary'];
  if (isCrossInstitution) {
    crossInstitutionSummary = allInsts.map((inst) => {
      const instId = String(inst.id);
      const instStudents = studentRows.filter((s) => String(s.institution_id) === instId);
      const avgR =
        instStudents.length > 0
          ? Math.round(instStudents.reduce((acc, s) => acc + Number(s.top_readiness || 0), 0) / instStudents.length)
          : 0;
      const topCareer =
        instStudents.length > 0
          ? String(instStudents[0].top_career_title || 'Unanalyzed')
          : 'No students enrolled';
      const instGaps = gapRows.filter((g) => instStudents.some((s) => String(s.id) === String(g.student_id)));
      const gapCounter = new Map<string, number>();
      for (const ig of instGaps) {
        gapCounter.set(String(ig.skill_name), (gapCounter.get(String(ig.skill_name)) ?? 0) + 1);
      }
      const topMissing =
        gapCounter.size > 0 ? Array.from(gapCounter.entries()).sort((a, b) => b[1] - a[1])[0][0] : 'None';

      return {
        institutionId: instId,
        institutionName: String(inst.name),
        educationLevel: String(inst.education_level),
        academicStructure: String(inst.academic_structure),
        studentCount: instStudents.length,
        avgReadiness: avgR,
        topCareer,
        topMissingSkill: topMissing,
      };
    });
  }

  const instRow = allInsts.find((i) => String(i.id) === effectiveInstitutionId);

  return {
    scope: {
      institutionId: effectiveInstitutionId,
      institutionName: isCrossInstitution ? 'All Partner Institutions (Aggregated)' : String(instRow?.name || user.institutionName),
      isCrossInstitution,
      filtersApplied: filters,
    },
    filterOptions: {
      institutions: scopedInsts.map((i) => ({
        id: String(i.id),
        name: String(i.name),
        educationLevel: String(i.education_level),
        academicStructure: String(i.academic_structure),
      })),
      departments: depts.map((d) => ({
        id: String(d.id),
        institutionId: String(d.institution_id),
        name: String(d.name),
      })),
      programmes: progs.map((p) => ({
        id: String(p.id),
        institutionId: String(p.institution_id),
        departmentId: String(p.department_id),
        name: String(p.name),
        level: String(p.level),
      })),
      batches: batches.map((b) => ({
        id: String(b.id),
        institutionId: String(b.institution_id),
        programmeId: String(b.programme_id),
        name: String(b.name),
        academicYear: String(b.academic_year),
      })),
      academicYears: yearsSet,
    },
    kpis: {
      totalStudents,
      analyzedStudents: studentRows.filter((s) => Boolean(s.top_career_title)).length,
      avgReadinessScore,
      avgTopSuitabilityScore,
      industryReadyPct,
      crossDepartmentMatchesCount: crossDeptMatches,
    },
    careerPreferenceDistribution,
    careerSuitabilityDistribution,
    departmentBreakdown,
    programmeBreakdown,
    batchBreakdown,
    commonMissingSkills,
    trainingRecommendations,
    crossInstitutionSummary,
  };
}

export interface StudentImportRow {
  name: string;
  email: string;
  departmentCode: string;
  programmeCode?: string;
  batchName?: string;
  academicYear?: string;
  gpa?: number;
  interests?: string[];
  careerGoals?: string[];
}

export function importStudentsForInstitution(institutionId: string, rows: StudentImportRow[]) {
  const db = getDb();
  const depts = db.prepare('SELECT id, code, name FROM departments WHERE institution_id = ?').all(institutionId) as Array<{
    id: string;
    code: string;
    name: string;
  }>;
  const progs = db.prepare('SELECT id, department_id, code FROM programmes WHERE institution_id = ?').all(institutionId) as Array<{
    id: string;
    department_id: string;
    code: string;
  }>;
  const batches = db.prepare('SELECT id, programme_id, name, academic_year FROM batches WHERE institution_id = ?').all(institutionId) as Array<{
    id: string;
    programme_id: string;
    name: string;
    academic_year: string;
  }>;

  if (depts.length === 0 || progs.length === 0 || batches.length === 0) {
    throw new Error('Institution must have at least one department, programme, and batch before importing students.');
  }

  const imported: Array<{ id: string; name: string; email: string; departmentName: string }> = [];
  const skipped: Array<{ email: string; reason: string }> = [];
  const now = new Date().toISOString();

  db.exec('BEGIN;');
  try {
    const insStu = db.prepare(
      `INSERT INTO students (id, user_id, institution_id, department_id, programme_id, batch_id, name, email, academic_year, gpa, status, created_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
    );
    const insProf = db.prepare(
      `INSERT INTO student_profiles (student_id, interests_json, career_goals_json, learning_style, weekly_hours_budget, problem_solving_index, academic_background_summary, certifications_json, updated_at)
       VALUES (?, ?, ?, 'Hands-on Labs', 10, 0, ?, '[]', ?)`
    );

    for (const r of rows) {
      const name = (r.name || '').trim();
      const email = (r.email || '').trim().toLowerCase();
      if (!name || !email.includes('@')) {
        skipped.push({ email: email || 'unknown', reason: 'Missing valid name or email' });
        continue;
      }

      const existing = db
        .prepare('SELECT id FROM students WHERE institution_id = ? AND email = ?')
        .get(institutionId, email);
      if (existing) {
        skipped.push({ email, reason: 'Already enrolled in institution' });
        continue;
      }

      const matchedDept =
        depts.find(
          (d) =>
            d.code.toLowerCase() === (r.departmentCode || '').toLowerCase() ||
            d.name.toLowerCase() === (r.departmentCode || '').toLowerCase()
        ) ?? depts[0];

      const matchedProg =
        progs.find((p) => p.code.toLowerCase() === (r.programmeCode || '').toLowerCase()) ??
        progs.find((p) => p.department_id === matchedDept.id) ??
        progs[0];

      const matchedBatch =
        batches.find((b) => b.name.toLowerCase() === (r.batchName || '').toLowerCase()) ??
        batches.find((b) => b.programme_id === matchedProg.id) ??
        batches[0];

      const stuId = `stu-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      insStu.run(
        stuId,
        institutionId,
        matchedDept.id,
        matchedProg.id,
        matchedBatch.id,
        name,
        email,
        r.academicYear || matchedBatch.academic_year || '2025-2026',
        typeof r.gpa === 'number' ? r.gpa : 3.5,
        now
      );

      insProf.run(
        stuId,
        JSON.stringify(r.interests && r.interests.length > 0 ? r.interests : ['Applied AI', 'Software Engineering']),
        JSON.stringify(r.careerGoals && r.careerGoals.length > 0 ? r.careerGoals : ['Full-Stack AI Product Engineer']),
        `Imported cohort learner in ${matchedDept.name}.`,
        now
      );

      imported.push({ id: stuId, name, email, departmentName: matchedDept.name });
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { importedCount: imported.length, skippedCount: skipped.length, imported, skipped };
}
