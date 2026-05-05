import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { updateCity } from '@/src/services/supabase';

const KEY_CITY = 'happin_user_city';
const KEY_LABEL = 'happin_user_city_label';

export function useUserCity() {
    const [city, setCity] = useState<string>('');
    const [cityLabel, setCityLabel] = useState<string>('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        Promise.all([
            AsyncStorage.getItem(KEY_CITY),
            AsyncStorage.getItem(KEY_LABEL),
        ]).then(([c, l]) => {
            setCity(c ?? '');
            setCityLabel(l ?? c ?? '');
            setLoaded(true);
        });
    }, []);

    const saveCity = useCallback(async (value: string, label?: string) => {
        const trimmed = value.trim();
        const trimmedLabel = (label ?? value).trim();
        setCity(trimmed);
        setCityLabel(trimmedLabel || trimmed);
        if (trimmed) {
            await AsyncStorage.multiSet([[KEY_CITY, trimmed], [KEY_LABEL, trimmedLabel || trimmed]]);
        } else {
            await AsyncStorage.multiRemove([KEY_CITY, KEY_LABEL]);
        }
        // Standort im Backend persistieren — fire-and-forget, kein Blocking
        updateCity(trimmed).catch(() => {});
    }, []);

    return { city, cityLabel, saveCity, loaded };
}
