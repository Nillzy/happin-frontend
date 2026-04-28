import { NavigationContainer } from '@react-navigation/native';
import { NavigationIndependentTree } from '@react-navigation/core';
import { ThemeProvider } from '@/context/ThemeContext';
import RootNavigator from '../navigation/RootNavigator';

export default function App() {

    const linking = {
        prefixes: ['happin://'],
        config: {
            screens: {
                Home: '/',
                Login: '/login',
                EventList: '/events',
                Event: '/event/:eventId',
            },
        }
    }

  return (
    <NavigationIndependentTree>
      <ThemeProvider>
        <NavigationContainer linking={linking}>
          <RootNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </NavigationIndependentTree>
  );
}
