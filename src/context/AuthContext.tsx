import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthUser, UserRole } from '../types/evolvix';
import { DEMO_ACCOUNTS } from '../data/demoSeed';
import { IS_DEMO_MODE } from '../config/env';

const AUTH_STORAGE_KEY = 'evolvix_auth_session_v1';

interface StoredSession {
  user: AuthUser;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  loginWithDemoRole: (role: UserRole) => Promise<AuthUser>;
  loginWithCredentials: (email: string, password: string) => Promise<{ ok: boolean; user?: AuthUser; error?: string }>;
  registerDemoStudent: (name: string, email: string) => Promise<{ ok: boolean; user?: AuthUser; error?: string }>;
  updateCurrentUser: (patch: Partial<AuthUser>) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredSession;
        if (parsed?.user?.id && parsed?.token) {
          setUser(parsed.user);
          setToken(parsed.token);
        }
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persistSession = useCallback(async (nextUser: AuthUser) => {
    let issuedToken = `evx-session-${nextUser.role}-${Date.now()}`;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: nextUser }),
      });
      if (res.ok) {
        const data = (await res.json()) as { token?: string };
        if (data.token) issuedToken = data.token;
      }
    } catch {
      // Offline / local fallback token remains valid in demo mode
    }
    const session: StoredSession = { user: nextUser, token: issuedToken };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    setUser(nextUser);
    setToken(issuedToken);
    return nextUser;
  }, []);

  const loginWithDemoRole = useCallback(
    async (role: UserRole) => {
      if (!IS_DEMO_MODE) {
        throw new Error('Demo login is disabled when VITE_DEMO_MODE=false');
      }
      const match = DEMO_ACCOUNTS.find((a) => a.user.role === role);
      if (!match) {
        throw new Error(`No demo account configured for role ${role}`);
      }
      return persistSession(match.user);
    },
    [persistSession]
  );

  const loginWithCredentials = useCallback(
    async (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();
      if (!normalized || !password.trim()) {
        return { ok: false, error: 'Please enter both email address and password.' };
      }

      const demoMatch = DEMO_ACCOUNTS.find((a) => a.user.email.toLowerCase() === normalized);
      if (demoMatch && (IS_DEMO_MODE || password === demoMatch.password)) {
        if (password !== demoMatch.password) {
          return { ok: false, error: 'Incorrect password. Demo accounts use Demo@2026.' };
        }
        const signedIn = await persistSession(demoMatch.user);
        return { ok: true, user: signedIn };
      }

      return { ok: false, error: 'No matching account found. Use one of the verified demo accounts.' };
    },
    [persistSession]
  );

  const registerDemoStudent = useCallback(
    async (name: string, email: string) => {
      if (!IS_DEMO_MODE) {
        return { ok: false, error: 'Self-registration requires Demo Mode or institutional SSO.' };
      }
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedName || !trimmedEmail.includes('@')) {
        return { ok: false, error: 'Enter a valid full name and institutional email.' };
      }
      const initials = trimmedName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');

      const newUser: AuthUser = {
        id: 'stu-alex',
        name: trimmedName,
        email: trimmedEmail,
        role: 'student',
        institutionId: 'inst-pacific',
        institutionName: 'Pacific Institute of Technology',
        department: 'Computer Science & AI',
        avatarInitials: initials || 'ST',
        title: 'Student · EVOLVIX AI Explorer',
      };
      const signedIn = await persistSession(newUser);
      return { ok: true, user: signedIn };
    },
    [persistSession]
  );

  const updateCurrentUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as StoredSession;
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ ...parsed, user: updated }));
        } catch {
          // ignore
        }
      }
      return updated;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore network error on logout
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setToken(null);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        loginWithDemoRole,
        loginWithCredentials,
        registerDemoStudent,
        updateCurrentUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
