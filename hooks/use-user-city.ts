import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'happin_user_city';

export function useUserCity() {
    const [city, setCity] = useState<string>('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((val) => {
            setCity(val ?? '');
            setLoaded(true);
        });
    }, []);

    const saveCity = useCallback(async (value: string) => {
        const trimmed = value.trim();
        setCity(trimmed);
        if (trimmed) {
            await AsyncStorage.setItem(STORAGE_KEY, trimmed);
        } else {
            await AsyncStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    return { city, saveCity, loaded };
}
