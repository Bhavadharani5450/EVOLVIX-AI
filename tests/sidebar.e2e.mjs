import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000';

const EXPECTED_SIDEBAR = {
  student: [
    { label: 'Overview', route: '/student/dashboard', heading: 'Welcome back' },
    { label: 'Career Discovery 360', route: '/student/career-discovery', heading: 'Career Discovery 360' },
    { label: 'Career DNA', route: '/student/career-dna', heading: 'Career DNA' },
    { label: 'Pathfinder AI', route: '/student/pathfinder', heading: 'Pathfinder AI' },
    { label: 'Skill Gap Analysis', route: '/student/skill-gap', heading: 'Skill Gap Analysis' },
    { label: 'Opportunity Compiler', route: '/student/opportunities', heading: 'Opportunity Compiler' },
    { label: 'MissionForge', route: '/student/missions', heading: 'MissionForge' },
    { label: 'Adaptive Learning Path', route: '/student/learning-path', heading: 'Adaptive Learning Path' },
    { label: 'Practice Lab', route: '/student/practice-lab', heading: 'Practice Lab' },
    { label: 'MentorMind Council', route: '/student/mentor-council', heading: 'MentorMind Council' },
    { label: 'Skill Proof Passport', route: '/student/skill-passport', heading: 'Skill Proof Passport' },
    { label: 'Notifications', route: '/student/notifications', heading: 'Notifications' },
    { label: 'Profile', route: '/student/profile', heading: 'Profile' },
    { label: 'Settings', route: '/student/settings', heading: 'Settings' },
  ],
  mentor: [
    { label: 'Overview', route: '/mentor/dashboard', heading: 'Mentor Workspace' },
    { label: 'My Students', route: '/mentor/students', heading: 'My Students' },
    { label: 'Student Profiles', route: '/mentor/student-profiles', heading: 'Student Profiles' },
    { label: 'Skill Gap Reports', route: '/mentor/skill-gap-reports', heading: 'Skill Gap Reports' },
    { label: 'Assessment Review', route: '/mentor/assessment-review', heading: 'Assessment Review' },
    { label: 'Learning Roadmaps', route: '/mentor/learning-roadmaps', heading: 'Learning Roadmaps' },
    { label: 'AI Recommendations', route: '/mentor/ai-recommendations', heading: 'AI Recommendations' },
    { label: 'Mentoring Sessions', route: '/mentor/sessions', heading: 'Mentoring Sessions' },
    { label: 'Feedback', route: '/mentor/feedback', heading: 'Feedback' },
    { label: 'Reports', route: '/mentor/reports', heading: 'Reports' },
    { label: 'Settings', route: '/mentor/settings', heading: 'Mentor Settings' },
  ],
  university_admin: [
    { label: 'Overview', route: '/university/dashboard', heading: 'Overview' },
    { label: 'Departments', route: '/university/departments', heading: 'Departments' },
    { label: 'Programmes', route: '/university/programmes', heading: 'Programmes' },
    { label: 'Batches', route: '/university/batches', heading: 'Batches' },
    { label: 'Students', route: '/university/students', heading: 'Students' },
    { label: 'Mentors', route: '/university/mentors', heading: 'Mentors' },
    { label: 'Career Analytics', route: '/university/career-analytics', heading: 'Institution Career Intelligence' },
    { label: 'Skill Intelligence', route: '/university/skill-intelligence', heading: 'Skill Intelligence' },
    { label: 'Training Management', route: '/university/training', heading: 'Training Management' },
    { label: 'Reports', route: '/university/reports', heading: 'Reports' },
    { label: 'Settings', route: '/university/settings', heading: 'Institution Settings' },
  ],
  super_admin: [
    { label: 'Overview', route: '/super-admin/dashboard', heading: 'Platform Control Plane' },
    { label: 'Institutions', route: '/super-admin/institutions', heading: 'Institutions' },
    { label: 'Users', route: '/super-admin/users', heading: 'Platform Users' },
    { label: 'Roles & Permissions', route: '/super-admin/roles', heading: 'Roles & Permissions' },
    { label: 'AI Agent Control', route: '/super-admin/agents', heading: 'AI Agent Control' },
    { label: 'Gemini Configuration', route: '/super-admin/gemini', heading: 'Gemini Configuration' },
    { label: 'Knowledge Base', route: '/super-admin/knowledge-base', heading: 'Knowledge Base' },
    { label: 'Agent Logs', route: '/super-admin/agent-logs', heading: 'Agent Logs' },
    { label: 'API Monitoring', route: '/super-admin/api-monitoring', heading: 'API Monitoring' },
    { label: 'System Health', route: '/super-admin/system-health', heading: 'System Health' },
    { label: 'Audit Logs', route: '/super-admin/audit-logs', heading: 'Audit Logs' },
    { label: 'Settings', route: '/super-admin/settings', heading: 'Platform Settings' },
  ],
};

function findBrowserExecutable() {
  const candidates = [
    '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

function authHeaders(role, userId, institutionId) {
  return {
    Authorization: `Bearer evx-session-${role}-test`,
    'Content-Type': 'application/json',
    'x-evolvix-role': role,
    'x-evolvix-user-id': userId,
    'x-evolvix-institution': institutionId,
  };
}

async function verifyBackendCareerIntelligenceAndSecurity() {
  // 1. Unauthenticated request blocked
  const unauth = await fetch(`${BASE_URL}/api/student/overview`);
  if (unauth.status !== 401) throw new Error(`Expected 401 for unauthenticated request, got ${unauth.status}`);

  // 2. Student cannot access another student's analysis (RBAC isolation)
  const stuBlocked = await fetch(`${BASE_URL}/api/career-intelligence/student/stu-priya`, {
    headers: authHeaders('student', 'stu-alex', 'inst-pacific'),
  });
  if (stuBlocked.status !== 403) {
    throw new Error(`Expected 403 for student accessing peer analysis, got ${stuBlocked.status}`);
  }

  // 3. Mentor cannot access unassigned student
  const mentorBlocked = await fetch(`${BASE_URL}/api/career-intelligence/student/stu-liam`, {
    headers: authHeaders('mentor', 'men-maya', 'inst-pacific'),
  });
  if (mentorBlocked.status !== 403) {
    throw new Error(`Expected 403 for unassigned mentor student, got ${mentorBlocked.status}`);
  }

  // 4. Mentor CAN access assigned student
  const mentorOk = await fetch(`${BASE_URL}/api/career-intelligence/student/stu-alex`, {
    headers: authHeaders('mentor', 'men-maya', 'inst-pacific'),
  });
  if (mentorOk.status !== 200) throw new Error(`Expected 200 for assigned mentor student, got ${mentorOk.status}`);

  // 5. University Admin cannot access external institution analytics OR import students externally
  const uniBlocked = await fetch(`${BASE_URL}/api/career-intelligence/institution?institutionId=inst-atlantic`, {
    headers: authHeaders('university_admin', 'uni-dean-chen', 'inst-pacific'),
  });
  if (uniBlocked.status !== 403) {
    throw new Error(`Expected 403 for cross-institution analytics access, got ${uniBlocked.status}`);
  }

  const uniImportBlocked = await fetch(`${BASE_URL}/api/university/students/import`, {
    method: 'POST',
    headers: authHeaders('university_admin', 'uni-dean-chen', 'inst-pacific'),
    body: JSON.stringify({
      institutionId: 'inst-atlantic',
      rows: [{ name: 'Bad Cross Import', email: 'bad@atlantic.edu', departmentCode: 'SWCL' }],
    }),
  });
  if (uniImportBlocked.status !== 403) {
    throw new Error(`Expected 403 for cross-institution CSV import, got ${uniImportBlocked.status}`);
  }

  // 6. Full 6-Agent Career Analysis for Student (Top 5 + Alternative + 6 Validated Agents)
  const alexRes = await fetch(`${BASE_URL}/api/career-intelligence/student/stu-alex/analyze`, {
    method: 'POST',
    headers: authHeaders('student', 'stu-alex', 'inst-pacific'),
    body: JSON.stringify({ triggerReason: 'E2E 6-Agent Verification', useGeminiNarrative: false }),
  });
  if (alexRes.status !== 200) throw new Error(`Student analyze failed with ${alexRes.status}`);
  const alexData = await alexRes.json();
  if (alexData.topRecommendations.length !== 5) {
    throw new Error(`Expected 5 recommendations, got ${alexData.topRecommendations.length}`);
  }
  if (alexData.alternativeOptions.length < 1) {
    throw new Error('Expected alternative career options');
  }
  if (alexData.agentExecutions.length !== 6 || alexData.agentExecutions.some((a) => !a.validationPassed)) {
    throw new Error('Expected all 6 specialized AI agents to execute and pass schema validation');
  }

  // 7. Cross-Department Verification: Liam (Digital Humanities & Design) gets Tech/UX/AI careers
  const liamRes = await fetch(`${BASE_URL}/api/career-intelligence/student/stu-liam`, {
    headers: authHeaders('student', 'stu-liam', 'inst-pacific'),
  });
  const liamData = await liamRes.json();
  if (liamData.student.departmentName !== 'Digital Humanities & Design') {
    throw new Error('Unexpected department for Liam');
  }
  if (!liamData.topRecommendations[0].scoreBreakdown.departmentIgnored) {
    throw new Error('Department isolation flag missing');
  }
  if (!['Product Analytics & UX Engineer', 'Full-Stack AI Product Engineer'].includes(liamData.topRecommendations[0].title)) {
    throw new Error(`Expected cross-department Product/AI match for Liam, got ${liamData.topRecommendations[0].title}`);
  }

  // 8. Missing Assessment Verification: Nina (stu-nina) has 0 assessments -> no fabricated assessment score!
  const ninaRes = await fetch(`${BASE_URL}/api/career-intelligence/student/stu-nina`, {
    headers: authHeaders('student', 'stu-nina', 'inst-meridian'),
  });
  const ninaData = await ninaRes.json();
  if (
    ninaData.assessmentsCount !== 0 ||
    ninaData.overallReadiness.hasAssessmentEvidence !== false ||
    ninaData.topRecommendations[0].scoreBreakdown.assessmentPerformance !== 0 ||
    !ninaData.overallReadiness.warning
  ) {
    throw new Error('Missing assessment data safety check failed (score was fabricated or warning missing)');
  }

  // 9. Adaptive Re-Analysis + History Diff check
  const adaptiveRes = await fetch(`${BASE_URL}/api/career-intelligence/student/stu-alex/evidence`, {
    method: 'POST',
    headers: authHeaders('student', 'stu-alex', 'inst-pacific'),
    body: JSON.stringify({
      kind: 'skill_update',
      skillName: 'Docker & Kubernetes',
      proficiency: 86,
      triggerReanalysis: true,
    }),
  });
  const adaptiveData = await adaptiveRes.json();
  if (!adaptiveData.updated || !adaptiveData.analysis?.analysisHistory?.[0]?.whyItChanged) {
    throw new Error('Adaptive re-analysis did not produce history diff explaining what changed and why');
  }

  // 10. API Failure Resilience check (simulateAiFailure=true degrades gracefully)
  const failSimRes = await fetch(`${BASE_URL}/api/career-intelligence/student/stu-alex/analyze`, {
    method: 'POST',
    headers: authHeaders('student', 'stu-alex', 'inst-pacific'),
    body: JSON.stringify({ triggerReason: 'AI Outage Resilience Check', useGeminiNarrative: true, simulateAiFailure: true }),
  });
  if (failSimRes.status !== 200) throw new Error('Expected graceful deterministic fallback on AI failure');
  const failSimData = await failSimRes.json();
  const intelExec = failSimData.agentExecutions.find((e) => e.agentKey === 'career_intelligence');
  if (!intelExec || intelExec.source !== 'deterministic-fallback') {
    throw new Error('Expected career_intelligence agent to record deterministic-fallback cleanly');
  }

  // 11. Filtered Institution Career Intelligence & Super Admin Cross-Institution Aggregation
  const deptFilterRes = await fetch(
    `${BASE_URL}/api/career-intelligence/institution?institutionId=inst-pacific&departmentId=dept-cs`,
    { headers: authHeaders('university_admin', 'uni-dean-chen', 'inst-pacific') }
  );
  const deptFilterData = await deptFilterRes.json();
  if (deptFilterRes.status !== 200 || deptFilterData.departmentBreakdown.length !== 1) {
    throw new Error('Department filter on Institution Career Intelligence failed');
  }

  const crossInstRes = await fetch(`${BASE_URL}/api/career-intelligence/institution?institutionId=ALL`, {
    headers: authHeaders('super_admin', 'sa-elena', 'inst-pacific'),
  });
  const crossInstData = await crossInstRes.json();
  if (crossInstRes.status !== 200 || !crossInstData.crossInstitutionSummary || crossInstData.crossInstitutionSummary.length < 3) {
    throw new Error('Super Admin aggregated cross-institution intelligence check failed');
  }

  // 12. Super Admin Gemini status never exposes API key
  const geminiRes = await fetch(`${BASE_URL}/api/super-admin/gemini-status`, {
    headers: authHeaders('super_admin', 'sa-elena', 'inst-pacific'),
  });
  const geminiData = await geminiRes.json();
  if (geminiRes.status !== 200 || geminiData.secretExposed !== false) {
    throw new Error('Super Admin Gemini status check failed or exposed secrets');
  }
  console.log('✓ Backend 6-agent AI orchestrator, cross-dept matching, missing-assessment safety, adaptive diff, RBAC & multi-institution filters verified.');
}

async function run() {
  await verifyBackendCareerIntelligenceAndSecurity();

  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('favicon.ico')) {
        consoleErrors.push(`[${page.url()}] ${txt}`);
      }
    }
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  let totalPassed = 0;

  for (const [role, items] of Object.entries(EXPECTED_SIDEBAR)) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    const loginBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    if (loginBg !== 'rgb(248, 250, 252)') {
      throw new Error(`Expected light background rgb(248, 250, 252) on login, got ${loginBg}`);
    }

    await page.getByTestId(`demo-login-${role}`).click();
    await page.waitForURL(`**${items[0].route}`, { timeout: 10000 });
    await page.getByText('DEMO MODE').first().waitFor({ state: 'visible', timeout: 5000 });

    for (const item of items) {
      const navLink = page.locator(`aside nav a[href="${item.route}"]`).first();
      await navLink.click();
      await page.waitForURL(`**${item.route}`, { timeout: 5000 });
      await page.locator('main h1', { hasText: item.heading }).first().waitFor({ state: 'visible', timeout: 5000 });

      const h1Text = await page.locator('main h1').first().textContent();
      if (!h1Text || !h1Text.includes(item.heading)) {
        throw new Error(`[${role}] ${item.route} heading mismatch: got "${h1Text}", expected to include "${item.heading}"`);
      }

      const layoutCheck = await page.evaluate(() => ({
        bodyBg: getComputedStyle(document.body).backgroundColor,
        hasDarkClass: document.documentElement.classList.contains('dark'),
        overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      }));
      if (layoutCheck.bodyBg !== 'rgb(248, 250, 252)' || layoutCheck.hasDarkClass) {
        throw new Error(`[${role}] ${item.route} failed light-theme enforcement: ${JSON.stringify(layoutCheck)}`);
      }
      if (layoutCheck.overflow) {
        throw new Error(`[${role}] ${item.route} has horizontal overflow at 1440px`);
      }

      totalPassed += 1;
      console.log(`✓ [${role}] ${item.label} -> ${item.route}`);
    }

    if (role === 'student') {
      // Verify Pathfinder AI shows Top 5 Recommendations + 6-Agent Orchestrator Trace + Adaptive History
      await page.goto(`${BASE_URL}/student/pathfinder`, { waitUntil: 'networkidle' });
      await page.getByText('Top 5 AI Career Recommendations').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByText('6-Agent Orchestrator Execution Record').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByText('Adaptive Analysis History (What Changed & Why)').waitFor({ state: 'visible', timeout: 5000 });

      await page.goto(`${BASE_URL}/student/practice-lab`, { waitUntil: 'networkidle' });
      await page.locator('input[type="radio"]').nth(1).check();
      await page.getByRole('button', { name: 'Submit Answer' }).click();
      await page.getByText('Reference Explanation').waitFor({ state: 'visible' });

      await page.goto(`${BASE_URL}/super-admin/dashboard`, { waitUntil: 'networkidle' });
      await page.waitForURL('**/unauthorized');
      const unauthTitle = await page.locator('h1').textContent();
      if (!unauthTitle?.includes('Unauthorized')) throw new Error('Expected Unauthorized page');
      console.log('✓ [student] Pathfinder 6-agent UI, adaptive history, Practice Lab & RBAC redirect verified.');
    }

    if (role === 'mentor') {
      await page.goto(`${BASE_URL}/mentor/student-profiles`, { waitUntil: 'networkidle' });
      await page.getByText('Top 5 Cross-Department Career Recommendations').waitFor({ state: 'visible', timeout: 5000 });
      await page.goto(`${BASE_URL}/mentor/feedback`, { waitUntil: 'networkidle' });
      await page.locator('textarea').first().fill('Strong systems throughput benchmark.');
      await page.locator('textarea').nth(1).fill('Complete container readiness probe lab.');
      await page.getByRole('button', { name: 'Submit Feedback' }).click();
      await page.getByText('Feedback submitted').waitFor({ state: 'visible' });
      console.log('✓ [mentor] Assigned student AI career report & feedback submission verified.');
    }

    if (role === 'university_admin') {
      await page.goto(`${BASE_URL}/university/career-analytics`, { waitUntil: 'networkidle' });
      await page.getByText('Career Suitability Distribution (AI-Matched #1)').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByText('Evidence-Based Institutional Training Recommendations').waitFor({ state: 'visible', timeout: 5000 });
      // Verify department filter dropdown changes analytics cleanly
      await page.getByLabel('Filter by department').selectOption('dept-cs');
      await page.waitForTimeout(400);

      // Verify CSV Import Modal opens on Students page
      await page.goto(`${BASE_URL}/university/students`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Import CSV' }).click();
      await page.getByText('Bulk Import Students (CSV)').waitFor({ state: 'visible', timeout: 3000 });
      await page.getByRole('button', { name: 'Import Students' }).click();
      await page.getByText('CSV Import Completed').waitFor({ state: 'visible', timeout: 8000 });

      await page.goto(`${BASE_URL}/university/departments`, { waitUntil: 'networkidle' });
      await page.reload({ waitUntil: 'networkidle' });
      if (!page.url().includes('/university/departments')) {
        throw new Error('Refresh did not preserve /university/departments route');
      }
      console.log('✓ [university_admin] Multi-filter Career Intelligence, CSV import & refresh persistence verified.');
    }

    if (role === 'super_admin') {
      await page.goto(`${BASE_URL}/super-admin/dashboard`, { waitUntil: 'networkidle' });
      await page.getByText('Cross-Institution Aggregated Career Intelligence').waitFor({ state: 'visible', timeout: 5000 });

      await page.goto(`${BASE_URL}/super-admin/agents`, { waitUntil: 'networkidle' });
      const toggleBtn = page.getByRole('button', { name: 'Disable Agent' }).first();
      await toggleBtn.click();
      await page.getByRole('button', { name: 'Enable Agent' }).first().click();

      await page.goto(`${BASE_URL}/super-admin/nonexistent-route`, { waitUntil: 'networkidle' });
      const nfTitle = await page.locator('h1').textContent();
      if (!nfTitle?.includes('Page Not Found')) throw new Error('Expected 404 Page Not Found');
      console.log('✓ [super_admin] Cross-institution analytics, 6-agent toggle & 404 fallback verified.');
    }

    await page.goto(`${BASE_URL}${items[0].route}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.waitForURL('**/login');
    console.log(`✓ [${role}] Logout verified.`);
  }

  // Mobile responsive check
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByTestId('demo-login-student').click();
  await page.waitForURL('**/student/dashboard');
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('button', { name: 'Close navigation menu' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Close navigation menu' }).click();
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (mobileOverflow) throw new Error('Mobile layout has horizontal overflow');
  console.log('✓ Mobile slide-out drawer & responsive layout (390px) verified.');

  await browser.close();

  if (consoleErrors.length > 0 || pageErrors.length > 0) {
    throw new Error(`Console/Page errors detected:\nConsole: ${consoleErrors.join('; ')}\nPage: ${pageErrors.join('; ')}`);
  }

  console.log(`\nALL CHECKS PASSED: ${totalPassed}/48 sidebar routes + Multi-Institution 6-Agent Career Intelligence verified with 0 console errors!`);
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
