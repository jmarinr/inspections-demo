import React from 'react';

// Card Component
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  onClick,
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`card ${paddingStyles[padding]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral' | 'ai';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    info: 'badge-info',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'bg-red-500/20 text-red-400 border border-red-500/30',
    neutral: 'bg-dark-600/50 text-dark-300 border border-dark-500',
    ai: 'badge-ai',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`badge ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

// Progress Bar Component
interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  color?: 'primary' | 'success' | 'warning';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  size = 'sm',
}) => {
  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
  };

  return (
    <div className="w-full">
      <div className={`progress-bar ${sizeStyles[size]}`}>
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
          {Math.round(progress)}%
        </p>
      )}
    </div>
  );
};

// Alert Component
interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  icon,
  className = '',
}) => {
  const variantStyles = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'bg-red-500/10 border border-red-500/30 text-red-300',
  };

  return (
    <div
      className={`alert ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <div className="text-sm">{children}</div>
    </div>
  );
};

// Divider Component
interface DividerProps {
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ className = '' }) => {
  return <hr className={`${className}`} style={{ borderColor: 'var(--border-color)' }} />;
};

// Skeleton Component
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
}) => {
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`animate-pulse ${variantStyles[variant]} ${className}`}
      style={{ backgroundColor: 'var(--border-color)' }}
    />
  );
};

// Loading Overlay
interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Procesando...',
}) => {
  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(15, 10, 31, 0.9)' }}
    >
      <div className="text-center">
        <div 
          className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: 'var(--hk-magenta)', borderTopColor: 'transparent' }}
        />
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{message}</p>
      </div>
    </div>
  );
};
