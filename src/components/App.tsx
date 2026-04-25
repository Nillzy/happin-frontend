import { NavigationContainer } from '@react-navigation/native';
import { NavigationIndependentTree } from '@react-navigation/core';
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
    <NavigationIndependentTree>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
