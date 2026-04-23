import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

export type AppNav = NativeStackNavigationProp<RootStackParamList>;

export function useAppNavigation() {
    return useNavigation<AppNav>();
}
