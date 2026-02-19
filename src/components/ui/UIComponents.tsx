import React from 'react';

interface CardProps { children: React.ReactNode; className?: string; padding?: 'none' | 'sm' | 'md' | 'lg'; onClick?: () => void; }
export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'md', onClick }) => {
  const pad: Record<string, string> = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };
  return <div className={`card ${pad[padding]} ${className}`} onClick={onClick}>{children}</div>;
};

interface BadgeProps { children: React.ReactNode; variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral' | 'ai'; size?: 'sm' | 'md'; className?: string; }
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'md', className = '' }) => {
  const v: Record<string, string> = {
    info: 'badge-info', success: 'badge-success', warning: 'badge-warning',
    error: 'bg-[var(--hk-error-surface)] text-[var(--hk-error)]',
    neutral: '', ai: 'badge-ai',
  };
  const s: Record<string, string> = { sm: 'px-2 py-0.5 text-xs', md: 'px-3 py-1.5 text-sm' };
  return (
    <span className={`badge ${v[variant]} ${s[size]} ${className}`}
      style={variant === 'neutral' ? { backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' } : undefined}
    >{children}</span>
  );
};

interface ProgressBarProps { progress: number; showLabel?: boolean; size?: 'sm' | 'md'; color?: string; }
export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, showLabel = false, size = 'sm' }) => {
  const h: Record<string, string> = { sm: 'h-1', md: 'h-2' };
  return (
    <div className="w-full">
      <div className={`progress-bar ${h[size]}`}>
        <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
      {showLabel && <p className="text-sm mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{Math.round(progress)}%</p>}
    </div>
  );
};

interface AlertProps { children: React.ReactNode; variant?: 'info' | 'success' | 'warning' | 'error'; icon?: React.ReactNode; className?: string; }
export const Alert: React.FC<AlertProps> = ({ children, variant = 'info', icon, className = '' }) => {
  const v: Record<string, string> = {
    info: 'alert-info', success: 'alert-success', warning: 'alert-warning',
    error: '',
  };
  return (
    <div className={`alert ${v[variant]} ${className}`}
      style={variant === 'error' ? { backgroundColor: 'var(--hk-error-surface)', color: 'var(--hk-error)' } : undefined}
    >
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <div className="text-sm">{children}</div>
    </div>
  );
};

export const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <hr className={className} style={{ borderColor: 'var(--border-color)' }} />
);

interface SkeletonProps { className?: string; variant?: 'text' | 'circular' | 'rectangular'; }
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'text' }) => {
  const v: Record<string, string> = { text: 'h-4 rounded', circular: 'rounded-full', rectangular: 'rounded-lg' };
  return <div className={`animate-pulse ${v[variant]} ${className}`} style={{ backgroundColor: 'var(--border-color)' }} />;
};

export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = 'Procesando...' }) => (
  <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
    <div className="text-center p-8 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-md)' }}>
      <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
        style={{ borderColor: 'var(--hk-primary)', borderTopColor: 'transparent' }} />
      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{message}</p>
    </div>
  </div>
);
