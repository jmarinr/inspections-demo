import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'whatsapp' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', isLoading = false,
  leftIcon, rightIcon, fullWidth = false, className = '', disabled, ...props
}) => {
  const vc: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    whatsapp: 'bg-[#1faa59] text-white hover:bg-[#189e4f] rounded-full font-semibold flex items-center justify-center gap-2 transition-all',
    ghost: 'bg-transparent rounded-full font-medium flex items-center justify-center gap-2 transition-all',
  };
  const ss: Record<string, string> = { sm: 'py-2 px-4 text-sm', md: 'py-3 px-6', lg: 'py-4 px-8 text-lg' };

  return (
    <button
      className={`${vc[variant]} ${ss[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={variant === 'ghost' ? { color: 'var(--text-secondary)' } : undefined}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{leftIcon}{children}{rightIcon}</>}
    </button>
  );
};
