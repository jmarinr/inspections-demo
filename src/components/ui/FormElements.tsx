import React from 'react';
import { Camera } from 'lucide-react';

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  hasCamera?: boolean;
  onCameraClick?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  hasCamera,
  onCameraClick,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-dark-200">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`bg-dark-800 border ${
            error ? 'border-red-500' : 'border-dark-600'
          } rounded-lg px-4 py-3 w-full text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
            hasCamera ? 'pr-12' : ''
          } ${className}`}
          {...props}
        />
        {hasCamera && (
          <button
            type="button"
            onClick={onCameraClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
          >
            <Camera className="w-5 h-5" />
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {hint && !error && <p className="text-sm text-dark-400">{hint}</p>}
    </div>
  );
};

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  placeholder,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-dark-200">
          {label}
        </label>
      )}
      <select
        className={`bg-dark-800 border ${
          error ? 'border-red-500' : 'border-dark-600'
        } rounded-lg px-4 py-3 w-full text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

// Checkbox Component
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          className={`mt-1 w-5 h-5 rounded border-2 border-dark-500 bg-dark-800 checked:bg-primary-500 checked:border-primary-500 cursor-pointer transition-all focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 ${className}`}
          {...props}
        />
        <span className="text-sm text-dark-200 group-hover:text-white transition-colors">
          {label}
        </span>
      </label>
      {error && <p className="text-sm text-red-500 ml-8">{error}</p>}
    </div>
  );
};

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-dark-200">
          {label}
        </label>
      )}
      <textarea
        className={`bg-dark-800 border ${
          error ? 'border-red-500' : 'border-dark-600'
        } rounded-lg px-4 py-3 w-full text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {hint && !error && <p className="text-sm text-dark-400">{hint}</p>}
    </div>
  );
};
