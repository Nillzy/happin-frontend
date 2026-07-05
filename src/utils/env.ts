import { Platform } from 'react-native';

declare global {
  interface Window {
    _env_?: Record<string, string>;
  }
}

export function getEnv(key: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window._env_?.[key]) {
    return window._env_[key];
  }
  return (process.env[key] as string) ?? '';
}