import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { IS_DEMO_MODE } from '../config/env';
import { createInitialDemoState, type EvolvixAppState } from '../data/demoSeed';
import { useAuth } from './AuthContext';

const DEMO_DATA_KEY = 'evolvix_demo_state_v2';

interface AppDataContextValue {
  state: EvolvixAppState;
  updateState: (updater: (prev: EvolvixAppState) => EvolvixAppState) => void;
  resetDemoState: () => void;
  apiFetch: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
  executeAiTask: <T = Record<string, unknown>>(
    task: 'discovery_followup' | 'mentor_council' | 'job_spec_analysis' | 'roadmap_adapt' | 'practice_eval',
    prompt: string,
    context?: Record<string, unknown>
  ) => Promise<{ source: string; durationMs: number; result: T }>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [state, setState] = useState<EvolvixAppState>(() => {
    if (IS_DEMO_MODE) {
      try {
        const saved = localStorage.getItem(DEMO_DATA_KEY);
        if (saved) {
          return JSON.parse(saved) as EvolvixAppState;
        }
      } catch {
        localStorage.removeItem(DEMO_DATA_KEY);
      }
    }
    return createInitialDemoState();
  });

  useEffect(() => {
    if (IS_DEMO_MODE) {
      try {
        localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(state));
      } catch {
        // ignore storage quota issues
      }
    }
  }, [state]);

  const updateState = useCallback((updater: (prev: EvolvixAppState) => EvolvixAppState) => {
    setState((prev) => updater(prev));
  }, []);

  const resetDemoState = useCallback(() => {
    const fresh = createInitialDemoState();
    setState(fresh);
    if (IS_DEMO_MODE) {
      localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(fresh));
    }
  }, []);

  const apiFetch = useCallback(
    async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
      const headers = new Headers(init?.headers);
      headers.set('Content-Type', 'application/json');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (user) {
        headers.set('x-evolvix-role', user.role);
        headers.set('x-evolvix-user-id', user.id);
        headers.set('x-evolvix-institution', user.institutionId);
        headers.set('x-evolvix-user-name', user.name);
        headers.set('x-evolvix-user-email', user.email);
      }

      const res = await fetch(path, { ...init, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
      }
      return data as T;
    },
    [token, user]
  );

  const executeAiTask = useCallback(
    async <T = Record<string, unknown>>(
      task: 'discovery_followup' | 'mentor_council' | 'job_spec_analysis' | 'roadmap_adapt' | 'practice_eval',
      prompt: string,
      context?: Record<string, unknown>
    ) => {
      const response = await apiFetch<{ source: string; durationMs: number; result: T }>('/api/ai/execute', {
        method: 'POST',
        body: JSON.stringify({ task, prompt, context }),
      });

      // Log simulated/live AI execution metadata for Super Admin observability
      setState((prev) => ({
        ...prev,
        agentLogs: [
          {
            id: `al-${Date.now()}`,
            agentName:
              task === 'mentor_council'
                ? 'MentorMind Council Orchestrator'
                : task === 'discovery_followup'
                ? 'Career Discovery Agent'
                : task === 'roadmap_adapt'
                ? 'Adaptive Roadmap Agent'
                : task === 'practice_eval'
                ? 'Mission & Practice Evaluator'
                : 'Pathfinder Simulation Agent',
            roleContext: user?.role ?? 'student',
            inputSummary: `Task=${task}, prompt_len=${prompt.length}`,
            outputSummary: `Completed via ${response.source}`,
            status: 'success',
            durationMs: response.durationMs,
            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          },
          ...prev.agentLogs.slice(0, 24),
        ],
      }));

      return response;
    },
    [apiFetch, user]
  );

  return (
    <AppDataContext.Provider value={{ state, updateState, resetDemoState, apiFetch, executeAiTask }}>
      {children}
    </AppDataContext.Provider>
  );
};

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
