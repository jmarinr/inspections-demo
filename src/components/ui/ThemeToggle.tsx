import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-white/10"
      aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-5 h-5 text-amber-400" />
          <span className="text-sm hidden sm:inline">Claro</span>
        </>
      ) : (
        <>
          <Moon className="w-5 h-5 text-indigo-500" />
          <span className="text-sm hidden sm:inline">Oscuro</span>
        </>
      )}
    </button>
  );
};
