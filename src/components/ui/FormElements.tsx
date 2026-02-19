import React from 'react';
import { Camera } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string;
  hasCamera?: boolean; onCameraClick?: () => void;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, hasCamera, onCameraClick, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
    <div className="relative">
      <input
        className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none ${hasCamera ? 'pr-12' : ''} ${error ? 'ring-2 ring-red-400' : ''} ${className}`}
        style={{ backgroundColor: 'var(--bg-input)', border: '1.5px solid transparent', color: 'var(--text-primary)' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--hk-primary)'; e.currentTarget.style.backgroundColor = 'var(--bg-primary)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'var(--bg-input)'; }}
        {...props}
      />
      {hasCamera && (
        <button type="button" onClick={onCameraClick} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-muted)' }}>
          <Camera className="w-5 h-5" />
        </button>
      )}
    </div>
    {error && <p className="text-sm" style={{ color: 'var(--hk-error)' }}>{error}</p>}
    {hint && !error && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, options, placeholder, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
    <select
      className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none cursor-pointer ${className}`}
      style={{ backgroundColor: 'var(--bg-input)', border: '1.5px solid transparent', color: 'var(--text-primary)' }}
      {...props}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-sm" style={{ color: 'var(--hk-error)' }}>{error}</p>}
  </div>
);

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode; error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, error, className = '', ...props }) => (
  <div className="space-y-1.5">
    <label className="flex items-start gap-3 cursor-pointer group">
      <input type="checkbox"
        className={`mt-1 w-5 h-5 rounded border-2 cursor-pointer transition-all accent-[var(--hk-primary)] ${className}`}
        style={{ borderColor: 'var(--border-color)' }}
        {...props}
      />
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </label>
    {error && <p className="text-sm ml-8" style={{ color: 'var(--hk-error)' }}>{error}</p>}
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string; hint?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, hint, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
    <textarea
      className={`w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none resize-none ${className}`}
      style={{ backgroundColor: 'var(--bg-input)', border: '1.5px solid transparent', color: 'var(--text-primary)' }}
      {...props}
    />
    {error && <p className="text-sm" style={{ color: 'var(--hk-error)' }}>{error}</p>}
    {hint && !error && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
  </div>
);
