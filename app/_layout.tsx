import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { SavedEventsProvider } from '@/src/contexts/SavedEventsContext';

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <ThemeProvider>
      <AuthProvider>
        <SavedEventsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ticket/[eventId]" options={{ presentation: 'transparentModal', animation: 'none' }} />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </SavedEventsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
