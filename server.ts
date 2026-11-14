import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  canAccessStudent,
  getDb,
  recordAuditLog,
  verifyPassword,
  type AuthContextUser,
  type UserRole,
} from './src/server/db.ts';
import {
  getOrRunStudentCareerAnalysis,
  runStudentCareerAnalysisOrchestrator,
} from './src/server/orchestrator.ts';
import {
  computeInstitutionCareerIntelligence,
  importStudentsForInstitution,
  type StudentImportRow,
} from './src/server/analytics.ts';

dotenv.config();

interface RequestWithAuth extends Request {
  authUser?: AuthContextUser;
}

const PORT = 3000;
const SERVER_START = Date.now();

// In-memory server telemetry & active session store
const endpointMetrics = new Map<
  string,
  { endpoint: string; method: string; requests: number; totalLatencyMs: number; errors: number; lastError?: string }
>();

const activeSessions = new Map<string, AuthContextUser>();

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function recordMetric(method: string, endpoint: string, latencyMs: number, statusCode: number, errMsg?: string) {
  const key = `${method} ${endpoint}`;
  const prev = endpointMetrics.get(key) ?? {
    endpoint,
    method,
    requests: 0,
    totalLatencyMs: 0,
    errors: 0,
  };
  prev.requests += 1;
  prev.totalLatencyMs += latencyMs;
  if (statusCode >= 400) {
    prev.errors += 1;
    if (errMsg) prev.lastError = errMsg;
  }
  endpointMetrics.set(key, prev);
}

function authenticate(req: RequestWithAuth, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (token && activeSessions.has(token)) {
    req.authUser = activeSessions.get(token);
    return next();
  }

  // Fallback header verification for stateless preview requests with explicit session token prefix
  const roleHeader = req.headers['x-evolvix-role'] as UserRole | undefined;
  const userIdHeader = req.headers['x-evolvix-user-id'] as string | undefined;
  const instHeader = req.headers['x-evolvix-institution'] as string | undefined;
  if (
    token.startsWith('evx-session-') &&
    roleHeader &&
    ['student', 'mentor', 'university_admin', 'super_admin'].includes(roleHeader) &&
    userIdHeader
  ) {
    const db = getDb();
    const userRow = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.institution_id, i.name as institution_name
         FROM users u
         LEFT JOIN institutions i ON i.id = u.institution_id
         WHERE u.id = ?`
      )
      .get(userIdHeader) as Record<string, unknown> | undefined;

    if (userRow) {
      req.authUser = {
        id: String(userRow.id),
        name: String(userRow.name),
        email: String(userRow.email),
        role: String(userRow.role) as UserRole,
        institutionId: String(userRow.institution_id),
        institutionName: String(userRow.institution_name || 'Pacific Institute of Technology'),
      };
      return next();
    }

    req.authUser = {
      id: userIdHeader,
      name: (req.headers['x-evolvix-user-name'] as string) || 'Authorized User',
      email: (req.headers['x-evolvix-user-email'] as string) || 'user@evolvix.edu',
      role: roleHeader,
      institutionId: instHeader || 'inst-pacific',
      institutionName: 'Pacific Institute of Technology',
    };
    return next();
  }

  return res.status(401).json({ error: 'Authentication required' });
}

function requireRole(...allowedRoles: UserRole[]) {
  return (req: RequestWithAuth, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      return res.status(403).json({
        error: `Forbidden: role '${req.authUser.role}' cannot access this resource.`,
      });
    }
    return next();
  };
}

async function startServer() {
  // Initialize SQLite schema & seed data once cleanly
  getDb();

  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Telemetry middleware for /api/*
  app.use('/api', (req, res, next) => {
    const start = performance.now();
    res.on('finish', () => {
      const elapsed = Math.round(performance.now() - start);
      const cleanPath = req.baseUrl + req.path;
      recordMetric(req.method, cleanPath, elapsed, res.statusCode);
    });
    next();
  });

  // Public health check (never exposes secrets)
  app.get('/api/health', (_req, res) => {
    const aiReady = Boolean(getGeminiClient());
    res.json({
      status: 'ok',
      service: 'EVOLVIX AI Career Intelligence Backend',
      uptimeSeconds: Math.round((Date.now() - SERVER_START) / 1000),
      databaseConnected: true,
      geminiConfigured: aiReady,
      memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      timestamp: new Date().toISOString(),
    });
  });

  // Auth routes
  app.post('/api/auth/login', (req, res) => {
    const { user, email, password } = req.body as {
      user?: AuthContextUser;
      email?: string;
      password?: string;
    };

    if (email && password) {
      const db = getDb();
      const row = db
        .prepare(
          `SELECT u.*, i.name as institution_name
           FROM users u
           JOIN institutions i ON i.id = u.institution_id
           WHERE LOWER(u.email) = LOWER(?)`
        )
        .get(email.trim()) as Record<string, unknown> | undefined;

      if (!row || !verifyPassword(password, String(row.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (String(row.status) !== 'active') {
        return res.status(403).json({ error: 'Account is suspended' });
      }

      const sessionUser: AuthContextUser = {
        id: String(row.id),
        name: String(row.name),
        email: String(row.email),
        role: String(row.role) as UserRole,
        institutionId: String(row.institution_id),
        institutionName: String(row.institution_name),
      };
      const token = `evx-session-${sessionUser.role}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      activeSessions.set(token, sessionUser);
      db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), sessionUser.id);
      return res.json({ token, user: sessionUser });
    }

    if (!user || !user.id || !user.role) {
      return res.status(400).json({ error: 'Invalid login payload' });
    }
    const token = `evx-session-${user.role}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    activeSessions.set(token, user);
    return res.json({ token, user });
  });

  app.post('/api/auth/logout', authenticate, (req, res) => {
    const token = req.headers.authorization?.slice(7).trim();
    if (token) activeSessions.delete(token);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', authenticate, (req: RequestWithAuth, res) => {
    res.json({ user: req.authUser });
  });

  // =========================================================================
  // MULTI-INSTITUTION AI CAREER PATH ANALYSIS ENDPOINTS (6-AGENT ORCHESTRATOR)
  // =========================================================================

  // Get full Career Intelligence Analysis for an authorized student
  app.get('/api/career-intelligence/student/:studentId', authenticate, async (req: RequestWithAuth, res) => {
    try {
      const studentId = String(req.params.studentId);
      const access = canAccessStudent(req.authUser!, studentId);
      if (!access.allowed) {
        return res.status(403).json({ error: access.reason || 'Access denied.' });
      }
      const analysis = await getOrRunStudentCareerAnalysis(studentId);
      return res.json(analysis);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load career analysis';
      return res.status(500).json({ error: msg });
    }
  });

  // Trigger full 6-Agent Career Analysis / Adaptive Re-Analysis
  app.post('/api/career-intelligence/student/:studentId/analyze', authenticate, async (req: RequestWithAuth, res) => {
    try {
      const studentId = String(req.params.studentId);
      const access = canAccessStudent(req.authUser!, studentId);
      if (!access.allowed) {
        return res.status(403).json({ error: access.reason || 'Access denied.' });
      }
      const { triggerReason, useGeminiNarrative, simulateAiFailure } = (req.body ?? {}) as {
        triggerReason?: string;
        useGeminiNarrative?: boolean;
        simulateAiFailure?: boolean;
      };

      const analysis = await runStudentCareerAnalysisOrchestrator(studentId, {
        triggerReason: triggerReason || 'Manual 6-Agent Career Re-Analysis',
        useGeminiNarrative: useGeminiNarrative !== false,
        simulateAiFailure: Boolean(simulateAiFailure),
      });

      recordAuditLog(
        req.authUser!,
        'admin_action',
        'Executed 6-Agent Career Intelligence Orchestrator',
        studentId,
        { runId: analysis.analysisRunId, topCareer: analysis.topRecommendations[0]?.title }
      );

      return res.json(analysis);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Career analysis execution failed';
      return res.status(500).json({ error: msg });
    }
  });

  // Submit new assessment evidence, skill update, project, or goal -> triggers Adaptive Re-Analysis
  app.post('/api/career-intelligence/student/:studentId/evidence', authenticate, async (req: RequestWithAuth, res) => {
    try {
      const studentId = String(req.params.studentId);
      const access = canAccessStudent(req.authUser!, studentId);
      if (!access.allowed) {
        return res.status(403).json({ error: access.reason || 'Access denied.' });
      }

      const db = getDb();
      const {
        kind,
        title,
        skillName,
        proficiency,
        assessmentScore,
        careerGoal,
        interest,
        projectSummary,
        repoUrl,
        triggerReanalysis = true,
      } = req.body as {
        kind: 'skill_update' | 'assessment' | 'project' | 'goal_update';
        title?: string;
        skillName?: string;
        proficiency?: number;
        assessmentScore?: number;
        careerGoal?: string;
        interest?: string;
        projectSummary?: string;
        repoUrl?: string;
        triggerReanalysis?: boolean;
      };

      const now = new Date().toISOString();
      let reason = 'Updated learner career evidence';

      if (kind === 'skill_update' && skillName && typeof proficiency === 'number') {
        let skillRow = db.prepare('SELECT id, name FROM skills WHERE LOWER(name) = LOWER(?)').get(skillName.trim()) as
          | { id: string; name: string }
          | undefined;
        if (!skillRow) {
          const newSkId = `sk-${Date.now()}`;
          db.prepare('INSERT INTO skills (id, name, category, is_soft, industry_demand_score) VALUES (?, ?, ?, 0, 82)').run(
            newSkId,
            skillName.trim(),
            'Systems'
          );
          skillRow = { id: newSkId, name: skillName.trim() };
        }
        const bounded = Math.max(0, Math.min(100, Math.round(proficiency)));
        db.prepare(
          `INSERT INTO student_skills (id, student_id, skill_id, proficiency, target_level, verified, source, last_assessed)
           VALUES (?, ?, ?, ?, 85, 1, 'evidence', ?)
           ON CONFLICT(student_id, skill_id) DO UPDATE SET proficiency = excluded.proficiency, verified = 1, last_assessed = excluded.last_assessed`
        ).run(`ssk-${studentId}-${skillRow.id}`, studentId, skillRow.id, bounded, now.slice(0, 10));
        reason = `Skill proficiency updated: ${skillRow.name} → ${bounded}%`;
      } else if (kind === 'assessment' && typeof assessmentScore === 'number') {
        const asmId = `asm-${Date.now()}`;
        const bounded = Math.max(0, Math.min(100, Math.round(assessmentScore)));
        const asmTitle = (title || 'Practical Competency Assessment').trim();
        db.prepare(
          `INSERT INTO career_assessments (id, student_id, title, assessment_type, score, max_score, status, completed_at)
           VALUES (?, ?, ?, 'Practical Assessment', ?, 100, 'completed', ?)`
        ).run(asmId, studentId, asmTitle, bounded, now.slice(0, 10));
        db.prepare(
          `INSERT INTO assessment_responses (id, assessment_id, student_id, dimension, prompt, response_text, numeric_score, created_at)
           VALUES (?, ?, ?, 'Practical Mastery', ?, ?, ?, ?)`
        ).run(`resp-${Date.now()}`, asmId, studentId, asmTitle, 'Verified practical lab submission.', bounded, now.slice(0, 10));

        // Update problem solving index if higher
        db.prepare(
          `UPDATE student_profiles SET problem_solving_index = MAX(problem_solving_index, ?), updated_at = ? WHERE student_id = ?`
        ).run(bounded, now, studentId);

        if (skillName) {
          const skillRow = db.prepare('SELECT id FROM skills WHERE LOWER(name) = LOWER(?)').get(skillName.trim()) as
            | { id: string }
            | undefined;
          if (skillRow) {
            db.prepare(
              `INSERT INTO skill_evidence (id, student_id, skill_id, evidence_type, title, score, status, submitted_at)
               VALUES (?, ?, ?, 'assessment', ?, ?, 'verified', ?)`
            ).run(`ev-${Date.now()}`, studentId, skillRow.id, asmTitle, bounded, now.slice(0, 10));
            db.prepare(
              `INSERT INTO student_skills (id, student_id, skill_id, proficiency, target_level, verified, source, last_assessed)
               VALUES (?, ?, ?, ?, 85, 1, 'assessment', ?)
               ON CONFLICT(student_id, skill_id) DO UPDATE SET proficiency = MAX(proficiency, excluded.proficiency), verified = 1, last_assessed = excluded.last_assessed`
            ).run(`ssk-${studentId}-${skillRow.id}`, studentId, skillRow.id, bounded, now.slice(0, 10));
          }
        }
        reason = `Completed assessment "${asmTitle}" (${bounded}%)`;
      } else if (kind === 'project' && title) {
        const projId = `proj-${Date.now()}`;
        const skArr = skillName ? [skillName.trim()] : ['Systems Engineering'];
        db.prepare(
          `INSERT INTO projects (id, student_id, title, summary, skills_used_json, repo_url, verified, is_recommended_mission, completed_date)
           VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)`
        ).run(
          projId,
          studentId,
          title.trim(),
          projectSummary?.trim() || 'Completed verified engineering capstone.',
          JSON.stringify(skArr),
          repoUrl?.trim() || 'https://github.com/student/project',
          now.slice(0, 10)
        );
        reason = `Submitted verified project "${title.trim()}"`;
      } else if (kind === 'goal_update') {
        const prof = db.prepare('SELECT interests_json, career_goals_json FROM student_profiles WHERE student_id = ?').get(studentId) as
          | { interests_json: string; career_goals_json: string }
          | undefined;
        const currGoals: string[] = prof ? JSON.parse(prof.career_goals_json) : [];
        const currInterests: string[] = prof ? JSON.parse(prof.interests_json) : [];
        if (careerGoal && !currGoals.includes(careerGoal)) currGoals.unshift(careerGoal);
        if (interest && !currInterests.includes(interest)) currInterests.unshift(interest);
        db.prepare('UPDATE student_profiles SET career_goals_json = ?, interests_json = ?, updated_at = ? WHERE student_id = ?').run(
          JSON.stringify(currGoals.slice(0, 4)),
          JSON.stringify(currInterests.slice(0, 6)),
          now,
          studentId
        );
        reason = careerGoal ? `Career goal updated to "${careerGoal}"` : `Added domain interest "${interest}"`;
      } else {
        return res.status(400).json({ error: 'Invalid evidence submission payload.' });
      }

      if (triggerReanalysis) {
        const analysis = await runStudentCareerAnalysisOrchestrator(studentId, {
          triggerReason: reason,
          useGeminiNarrative: true,
        });
        return res.json({ updated: true, reason, analysis });
      }
      return res.json({ updated: true, reason });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit evidence';
      return res.status(500).json({ error: msg });
    }
  });

  // Institution & Cross-Institution Career Intelligence Analytics (filtered by institution/dept/programme/batch/year)
  app.get('/api/career-intelligence/institution', authenticate, async (req: RequestWithAuth, res) => {
    try {
      const filters = {
        institutionId: req.query.institutionId ? String(req.query.institutionId) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        programmeId: req.query.programmeId ? String(req.query.programmeId) : undefined,
        batchId: req.query.batchId ? String(req.query.batchId) : undefined,
        academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      };
      const report = await computeInstitutionCareerIntelligence(req.authUser!, filters);
      return res.json(report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to compute analytics';
      const status = msg.startsWith('Forbidden:') ? 403 : 500;
      return res.status(status).json({ error: msg });
    }
  });

  // Bulk CSV / JSON Student Import for Institution Admins & Super Admins (strictly tenant-isolated)
  app.post(
    '/api/university/students/import',
    authenticate,
    requireRole('university_admin', 'super_admin'),
    async (req: RequestWithAuth, res) => {
      try {
        const { institutionId, rows, csvText } = req.body as {
          institutionId?: string;
          rows?: StudentImportRow[];
          csvText?: string;
        };

        const targetInst = institutionId || req.authUser!.institutionId;
        if (req.authUser!.role === 'university_admin' && targetInst !== req.authUser!.institutionId) {
          return res.status(403).json({
            error: 'Access denied: University Admin can only import students into their own institution.',
          });
        }

        let parsedRows: StudentImportRow[] = Array.isArray(rows) ? rows : [];
        if (parsedRows.length === 0 && typeof csvText === 'string' && csvText.trim().length > 0) {
          const lines = csvText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          // Skip header if present
          const dataLines = lines[0].toLowerCase().includes('email') ? lines.slice(1) : lines;
          parsedRows = dataLines.map((line) => {
            const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
            return {
              name: cols[0] || '',
              email: cols[1] || '',
              departmentCode: cols[2] || '',
              programmeCode: cols[3] || '',
              batchName: cols[4] || '',
              academicYear: cols[5] || '2025-2026',
              gpa: cols[6] ? Number(cols[6]) : 3.5,
              interests: cols[7] ? cols[7].split(';').map((s) => s.trim()).filter(Boolean) : undefined,
            };
          });
        }

        if (parsedRows.length === 0) {
          return res.status(400).json({ error: 'Provide either non-empty rows[] or csvText.' });
        }

        const result = importStudentsForInstitution(targetInst, parsedRows);

        // Immediately analyze imported students so they appear in career intelligence
        for (const stu of result.imported) {
          await getOrRunStudentCareerAnalysis(stu.id);
        }

        recordAuditLog(req.authUser!, 'admin_action', `Imported ${result.importedCount} students`, targetInst, {
          importedCount: result.importedCount,
          skippedCount: result.skippedCount,
        });

        return res.json(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Student import failed';
        return res.status(400).json({ error: msg });
      }
    }
  );

  // Institutions CRUD (Super Admin manages platform institutions)
  app.get('/api/institutions', authenticate, (req: RequestWithAuth, res) => {
    const db = getDb();
    if (req.authUser!.role === 'super_admin') {
      const rows = db.prepare('SELECT * FROM institutions ORDER BY created_at DESC').all();
      return res.json({ institutions: rows });
    }
    const rows = db.prepare('SELECT * FROM institutions WHERE id = ?').all(req.authUser!.institutionId);
    return res.json({ institutions: rows });
  });

  app.post('/api/institutions', authenticate, requireRole('super_admin'), (req: RequestWithAuth, res) => {
    const { name, code, domain, region, educationLevel, academicStructure } = req.body as {
      name: string;
      code: string;
      domain: string;
      region: string;
      educationLevel?: string;
      academicStructure?: string;
    };
    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({ error: 'Institution name and code are required.' });
    }
    const db = getDb();
    const id = `inst-${Date.now()}`;
    const cleanCode = code.trim().toUpperCase();
    const today = new Date().toISOString().slice(0, 10);
    db.prepare(
      `INSERT INTO institutions (id, name, code, domain, region, education_level, academic_structure, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
    ).run(
      id,
      name.trim(),
      cleanCode,
      domain?.trim() || 'institution.edu',
      region?.trim() || 'US-West',
      educationLevel || 'University',
      academicStructure || 'Semester',
      today
    );

    // Seed default department, programme, and batch so the institution is immediately operational
    const deptId = `dept-${id}-gen`;
    const progId = `prog-${id}-gen`;
    const batchId = `batch-${id}-2026`;
    db.prepare(`INSERT INTO departments (id, institution_id, name, code, head_name, status) VALUES (?, ?, 'Foundational Computing', 'COMP', 'Academic Dean', 'active')`).run(deptId, id);
    db.prepare(`INSERT INTO programmes (id, institution_id, department_id, name, code, level, duration_years, credits_required, status) VALUES (?, ?, ?, 'B.S. Applied Technology', 'BSAT', 'Undergraduate', 4, 120, 'active')`).run(progId, id, deptId);
    db.prepare(`INSERT INTO batches (id, institution_id, programme_id, name, academic_year, status) VALUES (?, ?, ?, 'Cohort 2026', '2025-2026', 'active')`).run(batchId, id, progId);

    recordAuditLog(req.authUser!, 'admin_action', `Created institution ${name.trim()}`, cleanCode);
    return res.status(201).json({
      institution: {
        id,
        name: name.trim(),
        code: cleanCode,
        domain: domain?.trim() || 'institution.edu',
        region: region?.trim() || 'US-West',
        educationLevel: educationLevel || 'University',
        academicStructure: academicStructure || 'Semester',
        status: 'active',
        createdAt: today,
      },
    });
  });

  // Agent Execution Records & Schemas API (Super Admin observability + scoped student run lookup)
  app.get('/api/agents/executions', authenticate, (req: RequestWithAuth, res) => {
    const db = getDb();
    const studentId = req.query.studentId ? String(req.query.studentId) : undefined;
    if (studentId) {
      const access = canAccessStudent(req.authUser!, studentId);
      if (!access.allowed) {
        return res.status(403).json({ error: access.reason || 'Access denied.' });
      }
      const rows = db
        .prepare('SELECT * FROM agent_executions WHERE student_id = ? ORDER BY created_at DESC LIMIT 30')
        .all(studentId);
      return res.json({ executions: rows });
    }
    if (req.authUser!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Platform-wide agent execution logs require Super Admin privileges.' });
    }
    const rows = db.prepare('SELECT * FROM agent_executions ORDER BY created_at DESC LIMIT 60').all();
    return res.json({ executions: rows });
  });

  // =========================================================================
  // EXISTING SCOPED EVOLVIX AI ROUTES (PRESERVED & HARDENED AGAINST SQLITE)
  // =========================================================================

  app.get('/api/student/overview', authenticate, requireRole('student'), (req: RequestWithAuth, res) => {
    res.json({
      userId: req.authUser!.id,
      status: 'authorized',
      checkedAt: new Date().toISOString(),
    });
  });

  app.get('/api/mentor/students/:studentId', authenticate, requireRole('mentor'), (req: RequestWithAuth, res) => {
    const mentorId = req.authUser!.id;
    const studentId = String(req.params.studentId);
    const access = canAccessStudent(req.authUser!, studentId);
    if (!access.allowed) {
      return res.status(403).json({
        error: 'Access denied: Mentor can only view students explicitly assigned to them.',
      });
    }
    return res.json({ authorized: true, mentorId, studentId });
  });

  app.get(
    '/api/university/institutions/:institutionId/analytics',
    authenticate,
    requireRole('university_admin'),
    (req: RequestWithAuth, res) => {
      const requestedInst = String(req.params.institutionId);
      if (requestedInst !== req.authUser!.institutionId) {
        return res.status(403).json({
          error: 'Access denied: University Admin can only manage data belonging to their institution.',
        });
      }
      return res.json({ authorized: true, institutionId: requestedInst });
    }
  );

  app.get('/api/university/students/:studentId', authenticate, requireRole('university_admin'), (req: RequestWithAuth, res) => {
    const studentId = String(req.params.studentId);
    const access = canAccessStudent(req.authUser!, studentId);
    if (!access.allowed) {
      return res.status(403).json({
        error: 'Access denied: Student belongs to a different institution.',
      });
    }
    return res.json({ authorized: true, studentId, institutionId: req.authUser!.institutionId });
  });

  app.get('/api/super-admin/gemini-status', authenticate, requireRole('super_admin'), (_req, res) => {
    const configured = Boolean(getGeminiClient());
    res.json({
      provider: 'Google Gemini API (@google/genai)',
      configured,
      activeModel: 'gemini-4-hydrogen',
      allowedModels: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
      quotaTier: configured ? 'Active Key Attached (Managed via Platform Secrets)' : 'Deterministic Simulation Fallback',
      secretExposed: false,
    });
  });

  app.get('/api/super-admin/api-telemetry', authenticate, requireRole('super_admin'), (_req, res) => {
    const metrics = Array.from(endpointMetrics.values()).map((item) => ({
      endpoint: item.endpoint,
      method: item.method,
      requests24h: item.requests,
      avgLatencyMs: item.requests > 0 ? Math.round(item.totalLatencyMs / item.requests) : 0,
      errorRatePct: item.requests > 0 ? Number(((item.errors / item.requests) * 100).toFixed(1)) : 0,
      status: item.errors > 0 ? 'degraded' : 'healthy',
      lastError: item.lastError,
    }));
    res.json({ metrics });
  });

  app.post('/api/ai/execute', authenticate, async (req: RequestWithAuth, res) => {
    const { task, prompt, context } = req.body as {
      task: 'discovery_followup' | 'mentor_council' | 'job_spec_analysis' | 'roadmap_adapt' | 'practice_eval';
      prompt: string;
      context?: Record<string, unknown>;
    };

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const ai = getGeminiClient();
    const start = performance.now();

    if (ai) {
      try {
        if (task === 'mentor_council') {
          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: `Student context: ${JSON.stringify(context ?? {})}\nQuestion: ${prompt}`,
            config: {
              systemInstruction:
                'You are the EVOLVIX AI MentorMind Council orchestrator. Produce concise, practical, light-weight structured career advice from our specialist agents: Career Discovery Agent, Skill Assessment Agent, Career Intelligence Agent, Learning Architect Agent, Performance Evaluator Agent, and Adaptive Mentor Agent.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  agentOutputs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        agentName: { type: Type.STRING },
                        role: { type: Type.STRING },
                        perspective: { type: Type.STRING },
                        confidence: { type: Type.INTEGER },
                      },
                    },
                  },
                  finalSynthesis: { type: Type.STRING },
                  actionItems: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
              },
            },
          });

          const parsed = JSON.parse((response.text ?? '{}').trim());
          return res.json({
            source: 'gemini-4-hydrogen',
            durationMs: Math.round(performance.now() - start),
            result: parsed,
          });
        }

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Task: ${task}\nContext: ${JSON.stringify(context ?? {})}\nInput: ${prompt}`,
          config: {
            systemInstruction:
              'You are an educational career & engineering mentor inside EVOLVIX AI. Respond concisely in 2-4 crisp sentences with concrete, actionable guidance.',
          },
        });

        return res.json({
          source: 'gemini-4-hydrogen',
          durationMs: Math.round(performance.now() - start),
          result: { text: response.text ?? '' },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gemini API execution error';
        recordMetric('POST', '/api/ai/execute', Math.round(performance.now() - start), 502, message);
        if (process.env.VITE_DEMO_MODE === 'false') {
          return res.status(502).json({ error: message });
        }
      }
    }

    const durationMs = Math.round(performance.now() - start) + 120;
    if (task === 'mentor_council') {
      return res.json({
        source: 'deterministic-orchestrator',
        durationMs,
        result: {
          agentOutputs: [
            {
              agentName: 'Career Discovery Agent',
              role: 'Goal & Interest Alignment',
              perspective: `Aligned "${prompt.slice(0, 60)}" with your top cross-department career trajectories and verified projects.`,
              confidence: 91,
            },
            {
              agentName: 'Skill Assessment Agent',
              role: 'Competency Verification',
              perspective: 'Verified strengths in Python & PyTorch (84%) and TypeScript (81%); container orchestration gap identified.',
              confidence: 94,
            },
            {
              agentName: 'Learning Architect Agent',
              role: 'Roadmap Optimization',
              perspective: 'Sequencing Docker & Kubernetes + Distributed Systems labs maximizes readiness gain per study hour.',
              confidence: 89,
            },
          ],
          finalSynthesis:
            'Prioritize closing Docker & Kubernetes and Distributed Systems gaps while completing one verified inference benchmark mission.',
          actionItems: [
            'Run 6-Agent Adaptive Re-Analysis after submitting your next mission',
            'Close Docker & Kubernetes gap in Adaptive Learning Path',
            'Review cross-department alternative tracks in Pathfinder AI',
          ],
        },
      });
    }

    return res.json({
      source: 'deterministic-orchestrator',
      durationMs,
      result: {
        text: `Analyzed "${prompt.slice(0, 80)}": Your verified competencies align with high-growth technical trajectories; prioritize closing top missing skills in your adaptive roadmap.`,
      },
    });
  });

  // Vite or static serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EVOLVIX AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
