import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Compass,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { Modal } from '../../components/UiPrimitives';
import { IS_DEMO_MODE } from '../../config/env';
import { getRoleHomePath } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DEMO_ACCOUNTS } from '../../data/demoSeed';
import type { UserRole } from '../../types/evolvix';

export const LoginPage: React.FC = () => {
  const { loginWithDemoRole, loginWithCredentials, registerDemoStudent } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('alex.rivera@evolvix.edu');
  const [password, setPassword] = useState('Demo@2026');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        const res = await loginWithCredentials(email, password);
        if (!res.ok || !res.user) {
          setErrorMsg(res.error || 'Unable to sign in.');
          return;
        }
        showToast(`Welcome back, ${res.user.name}`, `Signed in to ${res.user.institutionName}.`);
        navigate(getRoleHomePath(res.user.role), { replace: true });
      } else {
        const res = await registerDemoStudent(fullName, email);
        if (!res.ok || !res.user) {
          setErrorMsg(res.error || 'Unable to create account.');
          return;
        }
        showToast('Account created', 'Welcome to EVOLVIX AI Student Portal.');
        navigate(getRoleHomePath(res.user.role), { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      const signedIn = await loginWithDemoRole(role);
      showToast(`Signed in as ${signedIn.name}`, `${signedIn.title}`, 'success');
      navigate(getRoleHomePath(signedIn.role), { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const roleIcons: Record<UserRole, React.ComponentType<{ className?: string }>> = {
    student: GraduationCap,
    mentor: UserCheck,
    university_admin: Users,
    super_admin: ShieldCheck,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
        <BrandLogo size="md" />
        {IS_DEMO_MODE && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-xs font-semibold text-[#D97706]">
            DEMO MODE ACTIVE
          </span>
        )}
      </header>

      {/* Main Split Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Value Story (Light Enterprise Surface) */}
        <section className="lg:col-span-6 space-y-6">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#4F46E5] uppercase">
              Career Discovery & Adaptive Learning
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] mt-2 leading-tight">
              Your Potential. Your Future. <span className="text-[#4F46E5]">One Intelligent Path.</span>
            </h1>
            <p className="text-base text-[#64748B] mt-3 max-w-xl leading-relaxed">
              EVOLVIX AI connects learner skill diagnostics, multi-agent career guidance, mentor oversight, and
              institutional curriculum intelligence inside one unified workspace.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0]">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">Discover your strengths</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Adaptive Career Discovery 360 interviews and verified Career DNA skill inventories.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0]">
              <div className="w-9 h-9 rounded-lg bg-violet-50 text-[#7C3AED] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">Explore your career possibilities</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Pathfinder AI simulations, skill gap diagnostics, and competency-matched benchmarks.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0]">
              <div className="w-9 h-9 rounded-lg bg-cyan-50 text-[#06B6D4] flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">Build your personalized learning path</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  MissionForge projects, Practice Lab evaluations, and MentorMind Council collaboration.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Sign-In & One-Click Demo Panel */}
        <section className="lg:col-span-6 space-y-5">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">
                  {mode === 'signin' ? 'Welcome Back' : 'Create Student Account'}
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  {mode === 'signin'
                    ? 'Sign in to continue your journey with EVOLVIX AI'
                    : 'Register a local demo learner session'}
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg('');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    mode === 'signin' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    mode === 'signup' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B]'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="full-name" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signin' && (
                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-2 text-[#64748B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#E2E8F0] text-[#4F46E5] focus:ring-[#4F46E5]"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setForgotOpen(true);
                    }}
                    className="font-medium text-[#4F46E5] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg bg-[#4F46E5] hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {IS_DEMO_MODE && (
              <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-[#0F172A]">One-Click Demo Role Access</p>
                  <span className="text-[11px] font-mono text-[#64748B]">Password: Demo@2026</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEMO_ACCOUNTS.map((acc) => {
                    const RoleIcon = roleIcons[acc.user.role];
                    return (
                      <button
                        key={acc.user.id}
                        type="button"
                        data-testid={`demo-login-${acc.user.role}`}
                        onClick={() => handleDemoLogin(acc.user.role)}
                        disabled={submitting}
                        className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-indigo-50/70 hover:border-indigo-300 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] text-[#4F46E5] flex items-center justify-center shrink-0">
                          <RoleIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#0F172A] truncate">{acc.user.name}</p>
                          <p className="text-[11px] text-[#64748B] truncate">{acc.badgeSummary}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-[#FFFFFF] px-6 py-4 text-center text-xs text-[#64748B]">
        EVOLVIX AI · Enterprise Career Discovery & Adaptive Learning Platform
      </footer>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset Account Password"
        subtitle="Demo accounts use Demo@2026 or one-click sign in."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setForgotOpen(false);
            showToast('Password reset simulated', `Recovery link logged for ${resetEmail || email}.`, 'info');
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Account Email</label>
            <input
              type="email"
              required
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#64748B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium"
            >
              Send Recovery Link
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
