import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200"
      style={{
        backgroundColor: theme === 'dark' ? 'rgba(138,180,248,0.12)' : 'var(--bg-input)',
        color: theme === 'dark' ? 'var(--hk-primary)' : 'var(--text-secondary)',
      }}
      aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
      <span className="text-xs font-medium hidden sm:inline">
        {theme === 'dark' ? 'Claro' : 'Oscuro'}
      </span>
    </button>
  );
};
