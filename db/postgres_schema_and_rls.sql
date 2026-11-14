-- EVOLVIX AI Multi-Institution Career Intelligence Schema & Row-Level Security Policies (PostgreSQL Reference Migration)
-- Designed for strict multi-tenant institution isolation, mentor assignment scoping, and auditable 6-agent AI orchestration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  region TEXT NOT NULL,
  education_level TEXT NOT NULL CHECK (education_level IN ('University', 'Engineering College', 'High School', 'Polytechnic')),
  academic_structure TEXT NOT NULL CHECK (academic_structure IN ('Semester', 'Trimester', 'Annual', 'Credit-Based')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  head_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE (institution_id, code)
);
CREATE INDEX IF NOT EXISTS idx_departments_inst ON departments(institution_id);

CREATE TABLE IF NOT EXISTS programmes (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('Undergraduate', 'Postgraduate', 'Diploma', 'Certificate', 'Secondary')),
  duration_years INTEGER NOT NULL,
  credits_required INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE (institution_id, code)
);
CREATE INDEX IF NOT EXISTS idx_programmes_inst_dept ON programmes(institution_id, department_id);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  programme_id TEXT NOT NULL REFERENCES programmes(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed'))
);
CREATE INDEX IF NOT EXISTS idx_batches_inst_year ON batches(institution_id, academic_year);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'mentor', 'university_admin', 'super_admin')),
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  last_login TIMESTAMPTZ
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
  gpa NUMERIC(4,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'at_risk', 'graduated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, email)
);
CREATE INDEX IF NOT EXISTS idx_students_tenant_dims ON students(institution_id, department_id, programme_id, batch_id, academic_year);

CREATE TABLE IF NOT EXISTS student_profiles (
  student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  interests_json JSONB NOT NULL DEFAULT '[]',
  career_goals_json JSONB NOT NULL DEFAULT '[]',
  learning_style TEXT NOT NULL DEFAULT 'Hands-on Labs',
  weekly_hours_budget INTEGER NOT NULL DEFAULT 10,
  problem_solving_index INTEGER NOT NULL DEFAULT 70,
  academic_background_summary TEXT NOT NULL DEFAULT '',
  certifications_json JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS career_assessments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assessment_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'completed',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_student ON assessment_responses(student_id);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  is_soft BOOLEAN NOT NULL DEFAULT FALSE,
  industry_demand_score INTEGER NOT NULL DEFAULT 75
);

CREATE TABLE IF NOT EXISTS student_skills (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency INTEGER NOT NULL CHECK (proficiency BETWEEN 0 AND 100),
  target_level INTEGER NOT NULL DEFAULT 80,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'assessment',
  last_assessed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  preferred_interests_json JSONB NOT NULL DEFAULT '[]',
  industry_demand_index INTEGER NOT NULL DEFAULT 85
);

CREATE TABLE IF NOT EXISTS career_skill_requirements (
  id TEXT PRIMARY KEY,
  career_role_id TEXT NOT NULL REFERENCES career_roles(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required_level INTEGER NOT NULL CHECK (required_level BETWEEN 1 AND 100),
  weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
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
  score_breakdown_json JSONB NOT NULL,
  explanation TEXT NOT NULL,
  existing_skills_json JSONB NOT NULL,
  missing_skills_json JSONB NOT NULL,
  strengths_json JSONB NOT NULL,
  improvement_areas_json JSONB NOT NULL,
  is_alternative BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_career_recs_student_run ON career_recommendations(student_id, analysis_run_id);

CREATE TABLE IF NOT EXISTS skill_gaps (
  id TEXT PRIMARY KEY,
  analysis_run_id TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  career_role_id TEXT NOT NULL REFERENCES career_roles(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL,
  required_level INTEGER NOT NULL,
  gap_points INTEGER NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Critical', 'High', 'Moderate'))
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
  input_json JSONB NOT NULL,
  output_json JSONB NOT NULL,
  validation_passed BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  duration_ms INTEGER NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id TEXT PRIMARY KEY,
  roadmap_id TEXT NOT NULL REFERENCES learning_roadmaps(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  stage_title TEXT NOT NULL,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL,
  estimated_hours INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  prerequisite_ids_json JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  skills_used_json JSONB NOT NULL DEFAULT '[]',
  repo_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_recommended_mission BOOLEAN NOT NULL DEFAULT FALSE,
  completed_date TEXT
);

CREATE TABLE IF NOT EXISTS skill_evidence (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  score INTEGER,
  status TEXT NOT NULL CHECK (status IN ('verified', 'pending', 'needs_revision')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentor_assignments (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  mentor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  snapshot_json JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  trigger_reason TEXT NOT NULL,
  previous_top_career TEXT,
  new_top_career TEXT NOT NULL,
  previous_readiness INTEGER,
  new_readiness INTEGER NOT NULL,
  diff_summary_json JSONB NOT NULL,
  recommendations_snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PostgreSQL Row-Level Security (RLS) Tenant & Assignment Isolation Policies
-- ============================================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_isolation_policy ON students
  USING (
    current_setting('app.current_role', true) = 'super_admin'
    OR (current_setting('app.current_role', true) = 'university_admin' AND institution_id = current_setting('app.current_institution_id', true))
    OR (current_setting('app.current_role', true) = 'student' AND id = current_setting('app.current_user_id', true))
    OR (
      current_setting('app.current_role', true) = 'mentor'
      AND EXISTS (
        SELECT 1 FROM mentor_assignments ma
        WHERE ma.student_id = students.id AND ma.mentor_user_id = current_setting('app.current_user_id', true)
      )
    )
  );
