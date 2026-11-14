import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, X, Inbox } from 'lucide-react';

export const PageHeader: React.FC<{
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
    <div className="min-w-0">
      <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">{title}</h1>
      <p className="text-sm text-[#64748B] mt-1">{subtitle}</p>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
  </div>
);

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
    {children}
  </div>
);

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error' | 'brand';
}> = ({ label, value, helper, tone = 'neutral' }) => {
  const valueColor =
    tone === 'success'
      ? 'text-[#16A34A]'
      : tone === 'warning'
      ? 'text-[#D97706]'
      : tone === 'error'
      ? 'text-[#DC2626]'
      : tone === 'brand'
      ? 'text-[#4F46E5]'
      : 'text-[#0F172A]';

  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1.5 ${valueColor}`}>{value}</p>
      {helper && <p className="text-xs text-[#64748B] mt-1.5">{helper}</p>}
    </Card>
  );
};

export const StatusLabel: React.FC<{
  tone: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  text: string;
}> = ({ tone, text }) => {
  const config = {
    success: { icon: CheckCircle2, color: 'text-[#16A34A]' },
    warning: { icon: AlertTriangle, color: 'text-[#D97706]' },
    error: { icon: XCircle, color: 'text-[#DC2626]' },
    info: { icon: Clock, color: 'text-[#4F46E5]' },
    neutral: { icon: Clock, color: 'text-[#64748B]' },
  }[tone];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${config.color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{text}</span>
    </span>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <Card className="p-10 text-center">
    <div className="mx-auto w-11 h-11 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] mb-3">
      <Inbox className="w-5 h-5" />
    </div>
    <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
    <p className="text-sm text-[#64748B] mt-1 max-w-md mx-auto">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-[#4F46E5] text-white hover:bg-indigo-700 transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </Card>
);

export const ErrorBanner: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => (
  <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-4">
    <div className="flex items-center gap-2.5 text-sm text-[#DC2626]">
      <XCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-red-200 text-[#DC2626] hover:bg-red-50 shrink-0"
      >
        Retry
      </button>
    )}
  </div>
);

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-12 rounded-xl bg-slate-100 border border-[#E2E8F0]" />
    ))}
  </div>
);

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
            {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const ProgressBar: React.FC<{
  value: number;
  max?: number;
  tone?: 'brand' | 'success' | 'warning' | 'error' | 'accent';
}> = ({ value, max = 100, tone = 'brand' }) => {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const fill =
    tone === 'success'
      ? 'bg-[#16A34A]'
      : tone === 'warning'
      ? 'bg-[#D97706]'
      : tone === 'error'
      ? 'bg-[#DC2626]'
      : tone === 'accent'
      ? 'bg-[#06B6D4]'
      : 'bg-[#4F46E5]';

  return (
    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-300 ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const WeeklyActivityChart: React.FC<{
  data: { label: string; value: number; target?: number }[];
  unit?: string;
}> = ({ data, unit = 'h' }) => {
  const maxVal = Math.max(...data.map((d) => Math.max(d.value, d.target ?? 0)), 1);
  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-2 items-end h-40 pt-4">
        {data.map((item) => {
          const heightPct = Math.round((item.value / maxVal) * 100);
          const metTarget = item.target ? item.value >= item.target : true;
          return (
            <div key={item.label} className="flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-[11px] font-mono tabular-nums text-[#64748B]">
                {item.value}
                {unit}
              </span>
              <div className="w-full max-w-[36px] flex-1 flex items-end bg-[#F8FAFC] rounded-md border border-[#E2E8F0] p-1">
                <div
                  className={`w-full rounded-sm transition-all duration-300 ${
                    metTarget ? 'bg-[#4F46E5]' : 'bg-[#06B6D4]'
                  }`}
                  style={{ height: `${Math.max(heightPct, 8)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-[#64748B]">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SkillComparisonChart: React.FC<{
  items: { name: string; current: number; required: number }[];
}> = ({ items }) => (
  <div className="space-y-4">
    {items.map((item) => {
      const gap = item.required - item.current;
      return (
        <div key={item.name} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#0F172A]">{item.name}</span>
            <span className="font-mono tabular-nums text-[#64748B]">
              Current {item.current}% · Target {item.required}%{' '}
              <span className={gap > 0 ? 'text-[#D97706] font-semibold' : 'text-[#16A34A] font-semibold'}>
                ({gap > 0 ? `-${gap}% gap` : 'Met'})
              </span>
            </span>
          </div>
          <div className="relative h-3 rounded-md bg-slate-100 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#4F46E5] rounded-md transition-all duration-300"
              style={{ width: `${Math.min(100, item.current)}%` }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-[#0F172A]"
              style={{ left: `${Math.min(99, item.required)}%` }}
              title={`Target: ${item.required}%`}
            />
          </div>
        </div>
      );
    })}
  </div>
);
