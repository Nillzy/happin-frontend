import { NavigationContainer } from '@react-navigation/native';
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
    <NavigationContainer linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
}
