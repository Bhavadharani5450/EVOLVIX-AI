import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type UserRole = 'student' | 'mentor' | 'university_admin' | 'super_admin';

export interface AuthContextUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId: string;
  institutionName: string;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'evolvix.db');

let dbInstance: DatabaseSync | null = null;

export function hashPassword(plain: string, salt?: string): string {
  const usedSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, usedSalt, 64).toString('hex');
  return `${usedSalt}:${derived}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const candidateHex = crypto.scryptSync(plain, salt, 64).toString('hex');
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(candidateHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  initializeSchema(db);
  seedInitialData(db);
  dbInstance = db;
  return db;
}

function initializeSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      region TEXT NOT NULL,
      education_level TEXT NOT NULL,
      academic_structure TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      head_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE (institution_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_departments_inst ON departments(institution_id);

    CREATE TABLE IF NOT EXISTS programmes (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      level TEXT NOT NULL,
      duration_years INTEGER NOT NULL,
      credits_required INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE (institution_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_programmes_inst ON programmes(institution_id, department_id);

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      programme_id TEXT NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE INDEX IF NOT EXISTS idx_batches_inst_year ON batches(institution_id, academic_year);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      last_login TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_users_inst_role ON users(institution_id, role);

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      programme_id TEXT NOT NULL REFERENCES programmes(id) ON DELETE RESTRICT,
      batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      gpa REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      UNIQUE (institution_id, email)
    );
    CREATE INDEX IF NOT EXISTS idx_students_dims ON students(institution_id, department_id, programme_id, batch_id, academic_year);

    CREATE TABLE IF NOT EXISTS student_profiles (
      student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
      interests_json TEXT NOT NULL DEFAULT '[]',
      career_goals_json TEXT NOT NULL DEFAULT '[]',
      learning_style TEXT NOT NULL DEFAULT 'Hands-on Labs',
      weekly_hours_budget INTEGER NOT NULL DEFAULT 10,
      problem_solving_index INTEGER NOT NULL DEFAULT 0,
      academic_background_summary TEXT NOT NULL DEFAULT '',
      certifications_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS career_assessments (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      assessment_type TEXT NOT NULL,
      score INTEGER NOT NULL,
      max_score INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'completed',
      completed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_assessments_student ON career_assessments(student_id);

    CREATE TABLE IF NOT EXISTS assessment_responses (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL REFERENCES career_assessments(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      dimension TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response_text TEXT NOT NULL,
      numeric_score INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_assessment_responses_student ON assessment_responses(student_id);

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      is_soft INTEGER NOT NULL DEFAULT 0,
      industry_demand_score INTEGER NOT NULL DEFAULT 75
    );

    CREATE TABLE IF NOT EXISTS student_skills (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      proficiency INTEGER NOT NULL,
      target_level INTEGER NOT NULL DEFAULT 80,
      verified INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'assessment',
      last_assessed TEXT NOT NULL,
      UNIQUE (student_id, skill_id)
    );
    CREATE INDEX IF NOT EXISTS idx_student_skills_student ON student_skills(student_id);

    CREATE TABLE IF NOT EXISTS career_roles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      summary TEXT NOT NULL,
      growth_outlook TEXT NOT NULL,
      median_weeks_to_ready INTEGER NOT NULL,
      preferred_interests_json TEXT NOT NULL DEFAULT '[]',
      industry_demand_index INTEGER NOT NULL DEFAULT 85
    );

    CREATE TABLE IF NOT EXISTS career_skill_requirements (
      id TEXT PRIMARY KEY,
      career_role_id TEXT NOT NULL REFERENCES career_roles(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      required_level INTEGER NOT NULL,
      weight REAL NOT NULL DEFAULT 1.0,
      UNIQUE (career_role_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS career_recommendations (
      id TEXT PRIMARY KEY,
      analysis_run_id TEXT NOT NULL,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      career_role_id TEXT NOT NULL REFERENCES career_roles(id) ON DELETE CASCADE,
      rank INTEGER NOT NULL,
      suitability_score INTEGER NOT NULL,
      readiness_score INTEGER NOT NULL,
      score_breakdown_json TEXT NOT NULL,
      explanation TEXT NOT NULL,
      existing_skills_json TEXT NOT NULL,
      missing_skills_json TEXT NOT NULL,
      strengths_json TEXT NOT NULL,
      improvement_areas_json TEXT NOT NULL,
      is_alternative INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_career_recs_student ON career_recommendations(student_id, analysis_run_id);

    CREATE TABLE IF NOT EXISTS skill_gaps (
      id TEXT PRIMARY KEY,
      analysis_run_id TEXT NOT NULL,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      career_role_id TEXT NOT NULL REFERENCES career_roles(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      current_level INTEGER NOT NULL,
      required_level INTEGER NOT NULL,
      gap_points INTEGER NOT NULL,
      priority TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_skill_gaps_student ON skill_gaps(student_id, analysis_run_id);

    CREATE TABLE IF NOT EXISTS agent_executions (
      id TEXT PRIMARY KEY,
      analysis_run_id TEXT NOT NULL,
      student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
      agent_key TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      task TEXT NOT NULL,
      input_schema_version TEXT NOT NULL,
      output_schema_version TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      validation_passed INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_agent_exec_run ON agent_executions(analysis_run_id, agent_key);

    CREATE TABLE IF NOT EXISTS learning_roadmaps (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      career_role_id TEXT NOT NULL REFERENCES career_roles(id) ON DELETE CASCADE,
      analysis_run_id TEXT NOT NULL,
      title TEXT NOT NULL,
      total_estimated_hours INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roadmap_tasks (
      id TEXT PRIMARY KEY,
      roadmap_id TEXT NOT NULL REFERENCES learning_roadmaps(id) ON DELETE CASCADE,
      stage_number INTEGER NOT NULL,
      stage_title TEXT NOT NULL,
      title TEXT NOT NULL,
      task_type TEXT NOT NULL,
      estimated_hours INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      prerequisite_ids_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      skills_used_json TEXT NOT NULL DEFAULT '[]',
      repo_url TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      is_recommended_mission INTEGER NOT NULL DEFAULT 0,
      completed_date TEXT
    );

    CREATE TABLE IF NOT EXISTS skill_evidence (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      evidence_type TEXT NOT NULL,
      title TEXT NOT NULL,
      score INTEGER,
      status TEXT NOT NULL,
      submitted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mentor_assignments (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      mentor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      assigned_at TEXT NOT NULL,
      UNIQUE (mentor_user_id, student_id)
    );
    CREATE INDEX IF NOT EXISTS idx_mentor_assign ON mentor_assignments(institution_id, mentor_user_id);

    CREATE TABLE IF NOT EXISTS institution_analytics (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      department_id TEXT,
      programme_id TEXT,
      batch_id TEXT,
      academic_year TEXT,
      snapshot_json TEXT NOT NULL,
      computed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      institution_id TEXT,
      category TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analysis_history (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      trigger_reason TEXT NOT NULL,
      previous_top_career TEXT,
      new_top_career TEXT NOT NULL,
      previous_readiness INTEGER,
      new_readiness INTEGER NOT NULL,
      diff_summary_json TEXT NOT NULL,
      recommendations_snapshot_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function seedInitialData(db: DatabaseSync) {
  const existingInst = db.prepare('SELECT COUNT(*) as cnt FROM institutions').get() as { cnt: number };
  if (existingInst.cnt > 0) return;

  const now = new Date().toISOString();
  const demoPassHash = hashPassword('Demo@2026');

  db.exec('BEGIN;');
  try {
    // 1. Institutions
    const insertInst = db.prepare(
      `INSERT INTO institutions (id, name, code, domain, region, education_level, academic_structure, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertInst.run('inst-pacific', 'Pacific Institute of Technology', 'PIT-USW', 'pacifictech.edu', 'US-West', 'University', 'Semester', 'active', '2025-09-01');
    insertInst.run('inst-atlantic', 'Atlantic College of Engineering & Sciences', 'ACES-USE', 'atlanticengineering.edu', 'US-East', 'Engineering College', 'Credit-Based', 'active', '2025-10-12');
    insertInst.run('inst-meridian', 'Meridian STEM Academy', 'MSA-EUN', 'meridianstem.edu', 'EU-North', 'High School', 'Annual', 'active', '2026-01-08');

    // 2. Departments
    const insertDept = db.prepare(
      `INSERT INTO departments (id, institution_id, name, code, head_name, status) VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertDept.run('dept-cs', 'inst-pacific', 'Computer Science & AI', 'CSAI', 'Prof. Alan Brooks', 'active');
    insertDept.run('dept-ds', 'inst-pacific', 'Data Science & Analytics', 'DSAN', 'Dr. Nadia Kapoor', 'active');
    insertDept.run('dept-ee', 'inst-pacific', 'Electrical & Systems Engineering', 'ELSY', 'Prof. Marcus Holt', 'active');
    insertDept.run('dept-hum', 'inst-pacific', 'Digital Humanities & Design', 'DHDS', 'Dr. Clara Okafor', 'active');

    insertDept.run('dept-atl-sw', 'inst-atlantic', 'Software Systems & Cloud', 'SWCL', 'Dr. Victor Sterling', 'active');
    insertDept.run('dept-atl-me', 'inst-atlantic', 'Mechanical & Robotics', 'MERO', 'Prof. Elena Rostova', 'active');

    insertDept.run('dept-mer-stem', 'inst-meridian', 'STEM Foundations & Computing', 'STEM', 'Ms. Hannah Lindqvist', 'active');
    insertDept.run('dept-mer-bio', 'inst-meridian', 'Biomedical & Data Track', 'BIOD', 'Mr. Daniel Weber', 'active');

    // 3. Programmes
    const insertProg = db.prepare(
      `INSERT INTO programmes (id, institution_id, department_id, name, code, level, duration_years, credits_required, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertProg.run('prog-bscs', 'inst-pacific', 'dept-cs', 'B.S. Computer Science (AI Track)', 'BSCS-AI', 'Undergraduate', 4, 128, 'active');
    insertProg.run('prog-msds', 'inst-pacific', 'dept-ds', 'M.S. Data Science & Engineering', 'MSDS', 'Postgraduate', 2, 64, 'active');
    insertProg.run('prog-bsee', 'inst-pacific', 'dept-ee', 'B.S. Electrical & Embedded Systems', 'BSEE', 'Undergraduate', 4, 132, 'active');
    insertProg.run('prog-bahum', 'inst-pacific', 'dept-hum', 'B.A. Human-Centered Design & Analytics', 'BAHD', 'Undergraduate', 4, 120, 'active');

    insertProg.run('prog-atl-se', 'inst-atlantic', 'dept-atl-sw', 'B.Eng. Cloud & Distributed Software', 'BESE', 'Undergraduate', 4, 136, 'active');
    insertProg.run('prog-atl-rob', 'inst-atlantic', 'dept-atl-me', 'B.Eng. Autonomous Robotics', 'BERO', 'Undergraduate', 4, 138, 'active');

    insertProg.run('prog-mer-hs', 'inst-meridian', 'dept-mer-stem', 'Honors STEM Computing Diploma', 'HSTEM', 'Secondary', 2, 48, 'active');
    insertProg.run('prog-mer-bio', 'inst-meridian', 'dept-mer-bio', 'Pre-University Computational Bio', 'PCBIO', 'Secondary', 2, 48, 'active');

    // 4. Batches
    const insertBatch = db.prepare(
      `INSERT INTO batches (id, institution_id, programme_id, name, academic_year, status) VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertBatch.run('batch-2026-cs', 'inst-pacific', 'prog-bscs', 'Class of 2026 · CS-AI', '2025-2026', 'active');
    insertBatch.run('batch-2026-ds', 'inst-pacific', 'prog-msds', 'Fall 2025–2026 · MSDS', '2025-2026', 'active');
    insertBatch.run('batch-2027-ee', 'inst-pacific', 'prog-bsee', 'Class of 2027 · BSEE', '2026-2027', 'active');
    insertBatch.run('batch-2026-hum', 'inst-pacific', 'prog-bahum', 'Class of 2026 · BAHD', '2025-2026', 'active');

    insertBatch.run('batch-atl-2026', 'inst-atlantic', 'prog-atl-se', 'Cohort 2026 · Cloud Eng', '2025-2026', 'active');
    insertBatch.run('batch-atl-2027', 'inst-atlantic', 'prog-atl-rob', 'Cohort 2027 · Robotics', '2026-2027', 'active');

    insertBatch.run('batch-mer-2026', 'inst-meridian', 'prog-mer-hs', 'Grade 12 STEM · 2026', '2025-2026', 'active');
    insertBatch.run('batch-mer-2026b', 'inst-meridian', 'prog-mer-bio', 'Grade 12 CompBio · 2026', '2025-2026', 'active');

    // 5. Users (hashed passwords, zero plaintext!)
    const insertUser = db.prepare(
      `INSERT INTO users (id, email, name, role, institution_id, password_hash, status, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertUser.run('stu-alex', 'alex.rivera@evolvix.edu', 'Alex Rivera', 'student', 'inst-pacific', demoPassHash, 'active', now);
    insertUser.run('stu-priya', 'priya.nair@pacifictech.edu', 'Priya Nair', 'student', 'inst-pacific', demoPassHash, 'active', now);
    insertUser.run('stu-jordan', 'jordan.kim@pacifictech.edu', 'Jordan Kim', 'student', 'inst-pacific', demoPassHash, 'active', now);
    insertUser.run('stu-samira', 'samira.patel@pacifictech.edu', 'Samira Patel', 'student', 'inst-pacific', demoPassHash, 'active', now);
    insertUser.run('stu-liam', 'liam.okafor@pacifictech.edu', 'Liam Okafor', 'student', 'inst-pacific', demoPassHash, 'active', now);
    insertUser.run('stu-dev', 'dev.mehta@atlanticengineering.edu', 'Dev Mehta', 'student', 'inst-atlantic', demoPassHash, 'active', now);
    insertUser.run('stu-nina', 'nina.solberg@meridianstem.edu', 'Nina Solberg', 'student', 'inst-meridian', demoPassHash, 'active', now);

    insertUser.run('men-maya', 'dr.maya.lin@evolvix.edu', 'Dr. Maya Lin', 'mentor', 'inst-pacific', demoPassHash, 'active', now);
    insertUser.run('men-carlos', 'carlos.vega@pacifictech.edu', 'Carlos Vega', 'mentor', 'inst-pacific', demoPassHash, 'active', now);
    insertUser.run('men-arjun', 'arjun.menon@atlanticengineering.edu', 'Dr. Arjun Menon', 'mentor', 'inst-atlantic', demoPassHash, 'active', now);

    insertUser.run('uni-dean-chen', 'dean.chen@pacifictech.edu', 'Dean Evelyn Chen', 'university_admin', 'inst-pacific', demoPassHash, 'active', now);
    insertUser.run('uni-atl-admin', 'provost.grant@atlanticengineering.edu', 'Provost Owen Grant', 'university_admin', 'inst-atlantic', demoPassHash, 'active', now);

    insertUser.run('sa-elena', 'ops.admin@evolvix.ai', 'Elena Vance', 'super_admin', 'inst-pacific', demoPassHash, 'active', now);

    // 6. Students
    const insertStudent = db.prepare(
      `INSERT INTO students (id, user_id, institution_id, department_id, programme_id, batch_id, name, email, academic_year, gpa, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertStudent.run('stu-alex', 'stu-alex', 'inst-pacific', 'dept-cs', 'prog-bscs', 'batch-2026-cs', 'Alex Rivera', 'alex.rivera@evolvix.edu', '2025-2026', 3.74, 'active', '2025-09-10');
    // Cross-department proof: Priya is in Data Science & Analytics, Samira is in Electrical Systems, Liam is in Digital Humanities!
    insertStudent.run('stu-priya', 'stu-priya', 'inst-pacific', 'dept-ds', 'prog-msds', 'batch-2026-ds', 'Priya Nair', 'priya.nair@pacifictech.edu', '2025-2026', 3.88, 'active', '2025-09-10');
    insertStudent.run('stu-jordan', 'stu-jordan', 'inst-pacific', 'dept-cs', 'prog-bscs', 'batch-2026-cs', 'Jordan Kim', 'jordan.kim@pacifictech.edu', '2025-2026', 3.45, 'active', '2025-09-12');
    insertStudent.run('stu-samira', 'stu-samira', 'inst-pacific', 'dept-ee', 'prog-bsee', 'batch-2027-ee', 'Samira Patel', 'samira.patel@pacifictech.edu', '2026-2027', 3.62, 'active', '2025-09-14');
    // Liam is in Digital Humanities & Design, yet has strong coding + UX prototyping skills -> non-department AI/Product recommendations!
    insertStudent.run('stu-liam', 'stu-liam', 'inst-pacific', 'dept-hum', 'prog-bahum', 'batch-2026-hum', 'Liam Okafor', 'liam.okafor@pacifictech.edu', '2025-2026', 3.55, 'at_risk', '2025-09-15');
    // Atlantic College student
    insertStudent.run('stu-dev', 'stu-dev', 'inst-atlantic', 'dept-atl-sw', 'prog-atl-se', 'batch-atl-2026', 'Dev Mehta', 'dev.mehta@atlanticengineering.edu', '2025-2026', 3.81, 'active', '2025-10-15');
    insertStudent.run('stu-claire', null, 'inst-atlantic', 'dept-atl-me', 'prog-atl-rob', 'batch-atl-2027', 'Claire Bennett', 'claire.bennett@atlanticengineering.edu', '2026-2027', 3.67, 'active', '2025-10-18');
    // Meridian High School student (no assessments yet -> tests missing assessment data behavior)
    insertStudent.run('stu-nina', 'stu-nina', 'inst-meridian', 'dept-mer-stem', 'prog-mer-hs', 'batch-mer-2026', 'Nina Solberg', 'nina.solberg@meridianstem.edu', '2025-2026', 3.92, 'active', '2026-01-10');

    // 7. Student Profiles
    const insertProfile = db.prepare(
      `INSERT INTO student_profiles (student_id, interests_json, career_goals_json, learning_style, weekly_hours_budget, problem_solving_index, academic_background_summary, certifications_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertProfile.run(
      'stu-alex',
      JSON.stringify(['Distributed ML Serving', 'Low-Latency APIs', 'Observability', 'Cloud Native']),
      JSON.stringify(['Applied ML Systems Engineer', 'Cloud Infrastructure Engineer']),
      'Hands-on Labs',
      12,
      82,
      'Senior CS undergraduate focusing on distributed computing and ML inference systems.',
      JSON.stringify([{ title: 'AWS Solutions Architect Associate', issuer: 'Amazon Web Services', date: '2025-11-04', verified: true }]),
      now
    );
    insertProfile.run(
      'stu-priya',
      JSON.stringify(['Statistical Modeling', 'ML Pipelines', 'Data Governance', 'Experimentation']),
      JSON.stringify(['Data & AI Architect', 'Applied ML Systems Engineer']),
      'Structured Theory',
      14,
      86,
      'Postgraduate Data Science fellow specializing in streaming ETL and model evaluation.',
      JSON.stringify([{ title: 'dbt Analytics Engineering Certification', issuer: 'dbt Labs', date: '2025-12-10', verified: true }]),
      now
    );
    insertProfile.run(
      'stu-jordan',
      JSON.stringify(['Developer Tooling', 'AI Agents', 'Interactive Interfaces', 'API Design']),
      JSON.stringify(['Full-Stack AI Product Engineer']),
      'Project-First',
      10,
      74,
      'CS junior building agentic developer interfaces and type-safe web architectures.',
      JSON.stringify([]),
      now
    );
    insertProfile.run(
      'stu-samira',
      JSON.stringify(['Edge AI', 'Robotics Control', 'Embedded Telemetry', 'Distributed Systems']),
      JSON.stringify(['Autonomous Robotics & Edge AI Engineer', 'Cloud Infrastructure Engineer']),
      'Hands-on Labs',
      11,
      79,
      'Electrical & Systems undergraduate bridging embedded hardware telemetry with cloud ML pipelines.',
      JSON.stringify([{ title: 'ROS2 Robotics Fundamentals', issuer: 'Open Robotics', date: '2026-01-12', verified: true }]),
      now
    );
    insertProfile.run(
      'stu-liam',
      JSON.stringify(['Interactive Interfaces', 'AI Workflows', 'Design Systems', 'Product Analytics']),
      JSON.stringify(['Full-Stack AI Product Engineer', 'Product Analytics & UX Engineer']),
      'Mentor-Guided',
      8,
      71,
      'Digital Humanities student who independently completed TypeScript, React, and SQL bootcamps.',
      JSON.stringify([]),
      now
    );
    insertProfile.run(
      'stu-dev',
      JSON.stringify(['Zero-Trust Security', 'Kubernetes', 'High-Throughput Backends', 'SRE']),
      JSON.stringify(['Cloud Infrastructure & Platform Engineer', 'Security & AI Governance Engineer']),
      'Hands-on Labs',
      14,
      85,
      'Cloud Engineering scholar running multi-cluster Kubernetes observability benchmarks.',
      JSON.stringify([{ title: 'Certified Kubernetes Administrator (CKA)', issuer: 'CNCF', date: '2026-01-22', verified: true }]),
      now
    );
    insertProfile.run(
      'stu-claire',
      JSON.stringify(['Autonomous Navigation', 'Computer Vision', 'Simulation', 'PyTorch']),
      JSON.stringify(['Autonomous Robotics & Edge AI Engineer', 'Applied ML Systems Engineer']),
      'Project-First',
      12,
      80,
      'Mechanical & Robotics undergraduate specializing in sensor fusion and vision inference.',
      JSON.stringify([]),
      now
    );
    insertProfile.run(
      'stu-nina',
      JSON.stringify(['Algorithmic Problem Solving', 'Biotech Simulation', 'Python']),
      JSON.stringify(['Data & AI Architect']),
      'Structured Theory',
      6,
      0, // No assessments completed yet!
      'High school STEM honors student building early Python data literacy.',
      JSON.stringify([]),
      now
    );

    // 8. Skills Ontology
    const insertSkill = db.prepare(
      `INSERT INTO skills (id, name, category, is_soft, industry_demand_score) VALUES (?, ?, ?, ?, ?)`
    );
    const skillsSeed: Array<[string, string, string, number, number]> = [
      ['sk-py-torch', 'Python & PyTorch', 'AI & ML', 0, 94],
      ['sk-ts-react', 'TypeScript & React', 'Frontend', 0, 89],
      ['sk-dist-sys', 'Distributed Systems', 'Systems', 0, 92],
      ['sk-sql-data', 'SQL & Data Modeling', 'Data', 0, 88],
      ['sk-docker-k8s', 'Docker & Kubernetes', 'Cloud', 0, 91],
      ['sk-rest-api', 'REST & Event APIs', 'Backend', 0, 86],
      ['sk-mlops', 'MLOps & Model Evaluation', 'AI & ML', 0, 90],
      ['sk-cloud-sec', 'Cloud Security & IAM', 'Cloud', 0, 87],
      ['sk-data-eng', 'Streaming ETL & Warehousing', 'Data', 0, 85],
      ['sk-ux-eng', 'Product Design & UX Systems', 'Frontend', 0, 81],
      ['sk-robotics', 'Embedded Systems & Edge Telemetry', 'Systems', 0, 83],
      ['sk-comm', 'Technical Communication & RFC Writing', 'Soft Skill', 1, 88],
      ['sk-prob', 'Structured Problem Solving', 'Soft Skill', 1, 93],
      ['sk-collab', 'Cross-Functional Collaboration', 'Soft Skill', 1, 86],
    ];
    for (const s of skillsSeed) insertSkill.run(...s);

    // 9. Student Skills
    const insertStuSkill = db.prepare(
      `INSERT INTO student_skills (id, student_id, skill_id, proficiency, target_level, verified, source, last_assessed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const assignSkills = (stuId: string, map: Record<string, [number, number, boolean]>) => {
      for (const [skId, [prof, tgt, ver]] of Object.entries(map)) {
        insertStuSkill.run(`ssk-${stuId}-${skId}`, stuId, skId, prof, tgt, ver ? 1 : 0, 'assessment', '2026-03-01');
      }
    };
    assignSkills('stu-alex', {
      'sk-py-torch': [84, 90, true],
      'sk-ts-react': [81, 85, true],
      'sk-dist-sys': [58, 85, false],
      'sk-sql-data': [76, 85, true],
      'sk-docker-k8s': [52, 80, false],
      'sk-rest-api': [79, 85, true],
      'sk-mlops': [64, 85, false],
      'sk-prob': [82, 90, true],
      'sk-comm': [80, 85, true],
    });
    assignSkills('stu-priya', {
      'sk-py-torch': [88, 90, true],
      'sk-sql-data': [92, 95, true],
      'sk-data-eng': [87, 90, true],
      'sk-mlops': [79, 85, true],
      'sk-dist-sys': [68, 82, false],
      'sk-docker-k8s': [62, 80, false],
      'sk-prob': [86, 90, true],
    });
    assignSkills('stu-jordan', {
      'sk-ts-react': [86, 90, true],
      'sk-rest-api': [78, 85, true],
      'sk-sql-data': [71, 80, false],
      'sk-ux-eng': [82, 85, true],
      'sk-py-torch': [58, 78, false],
      'sk-docker-k8s': [46, 75, false],
      'sk-prob': [74, 85, true],
    });
    assignSkills('stu-samira', {
      'sk-robotics': [85, 90, true],
      'sk-py-torch': [74, 85, true],
      'sk-dist-sys': [72, 85, true],
      'sk-docker-k8s': [59, 80, false],
      'sk-rest-api': [66, 80, false],
      'sk-prob': [79, 88, true],
    });
    assignSkills('stu-liam', {
      // Digital Humanities major with verified frontend/UX + SQL skills -> proves cross-department matches!
      'sk-ts-react': [77, 85, true],
      'sk-ux-eng': [88, 90, true],
      'sk-sql-data': [69, 80, true],
      'sk-rest-api': [61, 80, false],
      'sk-py-torch': [42, 70, false],
      'sk-comm': [91, 90, true],
      'sk-prob': [71, 82, true],
    });
    assignSkills('stu-dev', {
      'sk-docker-k8s': [91, 92, true],
      'sk-dist-sys': [86, 90, true],
      'sk-cloud-sec': [83, 88, true],
      'sk-rest-api': [84, 88, true],
      'sk-sql-data': [75, 82, true],
      'sk-py-torch': [61, 75, false],
      'sk-prob': [85, 90, true],
    });
    assignSkills('stu-claire', {
      'sk-robotics': [86, 90, true],
      'sk-py-torch': [79, 85, true],
      'sk-dist-sys': [64, 80, false],
      'sk-docker-k8s': [54, 78, false],
      'sk-prob': [80, 88, true],
    });
    assignSkills('stu-nina', {
      'sk-py-torch': [64, 80, false],
      'sk-sql-data': [58, 75, false],
    });

    // 10. Career Roles (Cross-department catalog: 7 diverse career roles)
    const insertRole = db.prepare(
      `INSERT INTO career_roles (id, title, domain, summary, growth_outlook, median_weeks_to_ready, preferred_interests_json, industry_demand_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertRoleReq = db.prepare(
      `INSERT INTO career_skill_requirements (id, career_role_id, skill_id, required_level, weight) VALUES (?, ?, ?, ?, ?)`
    );

    const roleCatalog: Array<{
      id: string;
      title: string;
      domain: string;
      summary: string;
      growth: string;
      weeks: number;
      interests: string[];
      demand: number;
      reqs: Array<[string, number, number]>;
    }> = [
      {
        id: 'car-ml-sys',
        title: 'Applied ML Systems Engineer',
        domain: 'AI Infrastructure & Inference',
        summary: 'Designs production ML inference pipelines, distributed model serving layers, and observable vector workflows.',
        growth: '+28% YoY demand',
        weeks: 10,
        interests: ['Distributed ML Serving', 'Low-Latency APIs', 'Cloud Native', 'ML Pipelines', 'PyTorch'],
        demand: 95,
        reqs: [
          ['sk-py-torch', 88, 1.3],
          ['sk-dist-sys', 85, 1.2],
          ['sk-docker-k8s', 82, 1.1],
          ['sk-mlops', 84, 1.1],
          ['sk-sql-data', 78, 0.9],
          ['sk-prob', 82, 0.8],
        ],
      },
      {
        id: 'car-fs-ai',
        title: 'Full-Stack AI Product Engineer',
        domain: 'Agentic Web Applications',
        summary: 'Builds interactive web applications powered by structured LLM workflows, type-safe APIs, and responsive UI architecture.',
        growth: '+24% YoY demand',
        weeks: 7,
        interests: ['Interactive Interfaces', 'AI Agents', 'AI Workflows', 'API Design', 'Product Analytics', 'Design Systems'],
        demand: 92,
        reqs: [
          ['sk-ts-react', 85, 1.3],
          ['sk-rest-api', 82, 1.2],
          ['sk-sql-data', 78, 1.0],
          ['sk-ux-eng', 76, 1.0],
          ['sk-py-torch', 70, 0.9],
          ['sk-comm', 80, 0.8],
        ],
      },
      {
        id: 'car-data-arch',
        title: 'Data & AI Architect',
        domain: 'Data Engineering & Modeling',
        summary: 'Architects lakehouse pipelines, streaming analytics, feature stores, and reliable model training foundations.',
        growth: '+19% YoY demand',
        weeks: 9,
        interests: ['Statistical Modeling', 'Data Governance', 'ML Pipelines', 'Experimentation', 'Python'],
        demand: 89,
        reqs: [
          ['sk-sql-data', 90, 1.3],
          ['sk-data-eng', 86, 1.2],
          ['sk-py-torch', 80, 1.0],
          ['sk-dist-sys', 78, 1.0],
          ['sk-mlops', 76, 0.9],
        ],
      },
      {
        id: 'car-cloud-infra',
        title: 'Cloud Infrastructure & Platform Engineer',
        domain: 'Cloud Native Reliability',
        summary: 'Operates Kubernetes platforms, automated CI/CD, observability stacks, and fault-tolerant multi-region infrastructure.',
        growth: '+22% YoY demand',
        weeks: 11,
        interests: ['Kubernetes', 'Observability', 'Cloud Native', 'SRE', 'High-Throughput Backends'],
        demand: 91,
        reqs: [
          ['sk-docker-k8s', 90, 1.4],
          ['sk-dist-sys', 86, 1.3],
          ['sk-cloud-sec', 82, 1.1],
          ['sk-rest-api', 80, 0.9],
          ['sk-prob', 82, 0.8],
        ],
      },
      {
        id: 'car-edge-robotics',
        title: 'Autonomous Robotics & Edge AI Engineer',
        domain: 'Embedded & Cyber-Physical AI',
        summary: 'Bridges embedded sensor telemetry, real-time control loops, and edge computer vision models.',
        growth: '+21% YoY demand',
        weeks: 12,
        interests: ['Edge AI', 'Robotics Control', 'Embedded Telemetry', 'Autonomous Navigation', 'Computer Vision'],
        demand: 87,
        reqs: [
          ['sk-robotics', 88, 1.4],
          ['sk-py-torch', 82, 1.2],
          ['sk-dist-sys', 76, 1.0],
          ['sk-docker-k8s', 72, 0.8],
          ['sk-prob', 84, 0.9],
        ],
      },
      {
        id: 'car-sec-gov',
        title: 'Security & AI Governance Engineer',
        domain: 'Trustworthy Systems & IAM',
        summary: 'Hardens distributed APIs, multi-tenant IAM isolation, auditability pipelines, and AI compliance guardrails.',
        growth: '+26% YoY demand',
        weeks: 10,
        interests: ['Zero-Trust Security', 'Data Governance', 'Observability', 'Low-Latency APIs'],
        demand: 90,
        reqs: [
          ['sk-cloud-sec', 88, 1.4],
          ['sk-dist-sys', 82, 1.2],
          ['sk-docker-k8s', 80, 1.1],
          ['sk-rest-api', 78, 1.0],
          ['sk-comm', 82, 0.8],
        ],
      },
      {
        id: 'car-prod-ux',
        title: 'Product Analytics & UX Engineer',
        domain: 'Human-Centered Engineering',
        summary: 'Combines front-end systems engineering, behavioral SQL analytics, and user-centered interaction design.',
        growth: '+17% YoY demand',
        weeks: 6,
        interests: ['Design Systems', 'Interactive Interfaces', 'Product Analytics', 'Developer Tooling'],
        demand: 84,
        reqs: [
          ['sk-ux-eng', 88, 1.3],
          ['sk-ts-react', 84, 1.3],
          ['sk-sql-data', 76, 1.0],
          ['sk-comm', 88, 1.0],
          ['sk-rest-api', 70, 0.8],
        ],
      },
    ];

    for (const r of roleCatalog) {
      insertRole.run(r.id, r.title, r.domain, r.summary, r.growth, r.weeks, JSON.stringify(r.interests), r.demand);
      for (const [skId, reqLvl, weight] of r.reqs) {
        insertRoleReq.run(`req-${r.id}-${skId}`, r.id, skId, reqLvl, weight);
      }
    }

    // 11. Career Assessments & Responses (Alex + other Pacific/Atlantic students; Nina intentionally has NONE!)
    const insertAssess = db.prepare(
      `INSERT INTO career_assessments (id, student_id, title, assessment_type, score, max_score, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertResp = db.prepare(
      `INSERT INTO assessment_responses (id, assessment_id, student_id, dimension, prompt, response_text, numeric_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertAssess.run('asm-alex-1', 'stu-alex', 'Systems & Distributed Architecture Diagnostic', 'Practical Assessment', 82, 100, 'completed', '2026-02-20');
    insertAssess.run('asm-alex-2', 'stu-alex', 'Applied ML & Tensor Evaluation', 'Coding Assessment', 86, 100, 'completed', '2026-03-01');
    insertResp.run(
      'resp-alex-1',
      'asm-alex-1',
      'stu-alex',
      'Problem Solving',
      'How do you diagnose tail-latency spikes in a distributed inference cluster?',
      'Profile queue wait time vs. GPU batch execution using distributed traces, isolate noisy tenants via token-bucket rate limiting, and tune batch timeouts.',
      85,
      '2026-02-20'
    );

    insertAssess.run('asm-priya-1', 'stu-priya', 'Data Warehousing & Modeling Benchmark', 'Practical Assessment', 91, 100, 'completed', '2026-02-24');
    insertAssess.run('asm-jordan-1', 'stu-jordan', 'Type-Safe Product Engineering Sprint', 'Practical Assessment', 78, 100, 'completed', '2026-02-25');
    insertAssess.run('asm-samira-1', 'stu-samira', 'Edge Telemetry & Control Systems Lab', 'Practical Assessment', 83, 100, 'completed', '2026-02-26');
    insertAssess.run('asm-liam-1', 'stu-liam', 'Frontend UX & SQL Analytics Diagnostic', 'Practical Assessment', 76, 100, 'completed', '2026-02-27');
    insertAssess.run('asm-dev-1', 'stu-dev', 'Kubernetes Fault Tolerance Audit', 'Practical Assessment', 89, 100, 'completed', '2026-02-28');
    insertAssess.run('asm-claire-1', 'stu-claire', 'Autonomous Perception Benchmark', 'Practical Assessment', 81, 100, 'completed', '2026-03-01');

    // 12. Projects & Skill Evidence
    const insertProj = db.prepare(
      `INSERT INTO projects (id, student_id, title, summary, skills_used_json, repo_url, verified, is_recommended_mission, completed_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertProj.run(
      'proj-alex-1',
      'stu-alex',
      'VectorRAG Inference Router',
      'Built an evaluation harness and semantic query cache reducing median RAG response latency by 38%.',
      JSON.stringify(['Python & PyTorch', 'REST & Event APIs', 'SQL & Data Modeling']),
      'https://github.com/alex-rivera/vector-rag-router',
      1,
      0,
      '2026-02-18'
    );
    insertProj.run(
      'proj-alex-2',
      'stu-alex',
      'Cohort Skill Matrix Explorer',
      'Created an interactive React & TypeScript dashboard visualizing curriculum readiness gaps.',
      JSON.stringify(['TypeScript & React', 'SQL & Data Modeling']),
      'https://github.com/alex-rivera/skill-matrix-ui',
      1,
      0,
      '2026-01-19'
    );
    insertProj.run(
      'proj-priya-1',
      'stu-priya',
      'Real-Time Feature Store Pipeline',
      'Streaming Kafka-to-Postgres feature pipeline serving low-latency churn risk predictions.',
      JSON.stringify(['Streaming ETL & Warehousing', 'SQL & Data Modeling', 'Python & PyTorch']),
      'https://github.com/priya-nair/feature-store',
      1,
      0,
      '2026-02-14'
    );
    insertProj.run(
      'proj-liam-1',
      'stu-liam',
      'Accessible Campus Courseway Explorer',
      'WCAG-compliant React interface with SQL-backed course dependency visualizations.',
      JSON.stringify(['TypeScript & React', 'Product Design & UX Systems', 'SQL & Data Modeling']),
      'https://github.com/liam-okafor/courseway-ux',
      1,
      0,
      '2026-02-21'
    );

    const insertEv = db.prepare(
      `INSERT INTO skill_evidence (id, student_id, skill_id, evidence_type, title, score, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertEv.run('ev-alex-1', 'stu-alex', 'sk-py-torch', 'assessment', 'PyTorch Autograd & Batching Lab', 89, 'verified', '2026-03-01');
    insertEv.run('ev-alex-2', 'stu-alex', 'sk-ts-react', 'project', 'Cohort Skill Matrix Explorer', 92, 'verified', '2026-02-19');
    insertEv.run('ev-alex-3', 'stu-alex', 'sk-docker-k8s', 'mission', 'Containerize & Profile API Cluster', null, 'pending', '2026-03-04');

    // 13. Mentor Assignments
    const insertAssign = db.prepare(
      `INSERT INTO mentor_assignments (id, institution_id, mentor_user_id, student_id, assigned_at) VALUES (?, ?, ?, ?, ?)`
    );
    insertAssign.run('ma-1', 'inst-pacific', 'men-maya', 'stu-alex', '2025-09-20');
    insertAssign.run('ma-2', 'inst-pacific', 'men-maya', 'stu-priya', '2025-09-20');
    insertAssign.run('ma-3', 'inst-pacific', 'men-maya', 'stu-jordan', '2025-09-20');
    insertAssign.run('ma-4', 'inst-pacific', 'men-maya', 'stu-samira', '2025-09-20');
    insertAssign.run('ma-5', 'inst-pacific', 'men-carlos', 'stu-liam', '2025-09-22');
    insertAssign.run('ma-6', 'inst-atlantic', 'men-arjun', 'stu-dev', '2025-10-20');

    // 14. Initial Audit Log
    db.prepare(
      `INSERT INTO audit_logs (id, actor_user_id, actor_name, actor_role, institution_id, category, action, target, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'aud-init-1',
      'sa-elena',
      'Elena Vance',
      'super_admin',
      'inst-pacific',
      'security_event',
      'Initialized multi-institution RBAC & tenant isolation schema',
      'Platform Database',
      JSON.stringify({ institutionsSeeded: 3 }),
      now
    );

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function canAccessStudent(user: AuthContextUser, studentId: string): { allowed: boolean; reason?: string; studentInstId?: string } {
  const db = getDb();
  const row = db.prepare('SELECT id, institution_id FROM students WHERE id = ?').get(studentId) as
    | { id: string; institution_id: string }
    | undefined;

  if (!row) {
    return { allowed: false, reason: 'Student record not found.' };
  }

  if (user.role === 'student') {
    if (user.id !== studentId) {
      return { allowed: false, reason: 'Students can only access their own career analysis and roadmap.' };
    }
    return { allowed: true, studentInstId: row.institution_id };
  }

  if (user.role === 'mentor') {
    const assigned = db
      .prepare('SELECT 1 as ok FROM mentor_assignments WHERE mentor_user_id = ? AND student_id = ?')
      .get(user.id, studentId);
    if (!assigned) {
      return { allowed: false, reason: 'Mentors can only view career reports for explicitly assigned students.' };
    }
    return { allowed: true, studentInstId: row.institution_id };
  }

  if (user.role === 'university_admin') {
    if (row.institution_id !== user.institutionId) {
      return { allowed: false, reason: 'Institution Admins cannot access students from another institution.' };
    }
    return { allowed: true, studentInstId: row.institution_id };
  }

  if (user.role === 'super_admin') {
    return { allowed: true, studentInstId: row.institution_id };
  }

  return { allowed: false, reason: 'Unauthorized role.' };
}

export function recordAuditLog(
  user: AuthContextUser,
  category: string,
  action: string,
  target: string,
  metadata: Record<string, unknown> = {}
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, actor_name, actor_role, institution_id, category, action, target, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    `aud-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    user.id,
    user.name,
    user.role,
    user.institutionId,
    category,
    action,
    target,
    JSON.stringify(metadata),
    new Date().toISOString()
  );
}
