import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { updateCity, fetchCityFromBackend } from '@/src/services/supabase';

const KEY_CITY = 'happin_user_city';
const KEY_LABEL = 'happin_user_city_label';

export function useUserCity() {
    const [city, setCity] = useState<string>('');
    const [cityLabel, setCityLabel] = useState<string>('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            // Zuerst lokalen Cache zeigen damit es nicht leer wirkt
            const [c, l] = await Promise.all([
                AsyncStorage.getItem(KEY_CITY),
                AsyncStorage.getItem(KEY_LABEL),
            ]);
            if (c) {
                setCity(c);
                setCityLabel(l ?? c);
            }

            // Immer Backend als Quelle der Wahrheit fetchen
            try {
                const backendCity = await fetchCityFromBackend();
                if (backendCity) {
                    await AsyncStorage.multiSet([
                        [KEY_CITY, backendCity],
                        [KEY_LABEL, backendCity],
                    ]);
                    setCity(backendCity);
                    setCityLabel(backendCity);
                } else if (!c) {
                    // Backend hat keine Stadt, lokal auch nicht → leer lassen
                    await AsyncStorage.multiRemove([KEY_CITY, KEY_LABEL]);
                    setCity('');
                    setCityLabel('');
                }
            } catch {
                // Kein Netz — lokalen Wert behalten
            } finally {
                setLoaded(true);
            }
        })();
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
        updateCity(trimmed).catch(() => {});
    }, []);

    return { city, cityLabel, saveCity, loaded };
}
