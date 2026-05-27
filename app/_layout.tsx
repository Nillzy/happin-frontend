import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { SavedEventsProvider } from '@/src/contexts/SavedEventsContext';
import { ReminderSettingsProvider } from '@/src/contexts/ReminderSettingsContext';
import { NotificationsProvider } from '@/src/contexts/NotificationsContext';

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <ThemeProvider>
      <AuthProvider>
        <SavedEventsProvider>
          <ReminderSettingsProvider>
          <NotificationsProvider>
          <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
            <Stack.Screen name="index" options={{ title: 'Happin' }} />
            <Stack.Screen name="login" options={{ title: 'Anmelden – Happin' }} />
            <Stack.Screen name="events/index" options={{ title: 'Events – Happin' }} />
            <Stack.Screen name="events/create" options={{ title: 'Event erstellen – Happin' }} />
            <Stack.Screen name="events/create/step-2" options={{ title: 'Event erstellen – Happin' }} />
            <Stack.Screen name="my-events" options={{ title: 'Meine Events – Happin' }} />
            <Stack.Screen name="saved-events" options={{ title: 'Gespeicherte Events – Happin' }} />
            <Stack.Screen name="account" options={{ title: 'Konto – Happin' }} />
            <Stack.Screen name="map" options={{ title: 'Karte – Happin' }} />
            <Stack.Screen name="contact" options={{ title: 'Kontakt – Happin' }} />
            <Stack.Screen name="imprint" options={{ title: 'Impressum – Happin' }} />
            <Stack.Screen name="privacy" options={{ title: 'Datenschutz – Happin' }} />
            <Stack.Screen name="notifications" options={{ title: 'Benachrichtigungen – Happin' }} />
            <Stack.Screen
              name="ticket/[eventId]"
              options={{
                title: 'Ticket – Happin',
                presentation: 'transparentModal',
                animation: 'fade',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          </NotificationsProvider>
          </ReminderSettingsProvider>
        </SavedEventsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
