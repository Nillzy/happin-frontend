import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, type ThemeColors } from '@/src/constants/colors';

const THEME_STORAGE_KEY = 'happin-theme-override';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<'light' | 'dark' | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark') {
        setOverride(value);
      }
      setLoaded(true);
    });
  }, []);

  const isDark = override !== null ? override === 'dark' : systemScheme === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setOverride(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  };

  if (!loaded) return null;

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
