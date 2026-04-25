import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, type ThemeColors } from '@/constants/colors';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<'light' | 'dark' | null>(null);

  const isDark = override !== null ? override === 'dark' : systemScheme === 'dark';

  const toggleTheme = () => setOverride(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ colors: isDark ? Colors.dark : Colors.light, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
