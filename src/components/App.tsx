import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '@/context/ThemeContext';
import RootNavigator from '../navigation/RootNavigator';

export default function App() {

    const linking = {
        prefixes: ['happin://'],
        config: {
            screens: {
                Home: '/',
                Login: '/login',
                Event: '/event',
            },
        }
    }

  return (
    <ThemeProvider>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
}
