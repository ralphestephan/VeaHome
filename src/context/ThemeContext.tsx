import React, { createContext, useContext, useMemo, useState, ReactNode, useCallback } from 'react';
import { ThemeMode, ThemeColors, getThemeColors, gradients, shadows, animations } from '../constants/theme';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  gradients: typeof gradients;
  shadows: typeof shadows;
  animations: typeof animations;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to dark mode for the futuristic neon aesthetic
  const [mode, setModeState] = useState<ThemeMode>('dark');

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      mode,
      colors: getThemeColors(mode),
      gradients,
      shadows,
      animations,
      setMode,
      toggleMode,
      isDark: mode === 'dark',
    };
  }, [mode, setMode, toggleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
