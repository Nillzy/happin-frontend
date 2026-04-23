import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import EventScreen from '../screens/EventScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const universalOptions = { headerShown: false };

    return (
        <Stack.Navigator initialRouteName='Home' >
            <Stack.Screen name='Home' component={HomeScreen} options={universalOptions}/>
            <Stack.Screen name='Login' component={LoginScreen} options={universalOptions}/>
            <Stack.Screen name='Event' component={EventScreen} options={universalOptions}/>
        </Stack.Navigator>
    );
}

// For type checking in navigator.navigate()
export type RootStackParamList = {
    Home: undefined,
    Login: undefined,
    Event: undefined,
};
