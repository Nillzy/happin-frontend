import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '@/src/services/api';
import { getSession } from '@/src/services/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import {
    cancelAllReminders,
    registerWebPush,
    syncReminders,
    unregisterWebPush,
} from '@/src/services/reminders';
import { registerExpoPush, unregisterExpoPush } from '@/src/services/expoPush';
import { DEFAULT_REMINDER_SETTINGS, type ReminderSettings } from '@/src/types/reminders';

const STORAGE_KEY_PREFIX = '@happin:reminder_settings:';
const STORAGE_KEY_LEGACY = '@happin:reminder_settings';

function storageKeyFor(userId: string | null): string {
    return userId ? `${STORAGE_KEY_PREFIX}${userId}` : STORAGE_KEY_LEGACY;
}

interface ReminderSettingsContextType {
    settings: ReminderSettings;
    loaded: boolean;
    setEnabled: (enabled: boolean) => Promise<void>;
    setLeadTimeMinutes: (minutes: number) => Promise<void>;
    refresh: () => Promise<void>;
}

const ReminderSettingsContext = createContext<ReminderSettingsContextType | undefined>(undefined);

export function ReminderSettingsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
    const [loaded, setLoaded] = useState(false);

    // Reload when account changes (login/logout). AsyncStorage ist pro User
    // namespaced, damit Account-Wechsel auf demselben Browser keine fremden
    // Settings sieht.
    useEffect(() => {
        let cancelled = false;
        setLoaded(false);

        if (!userId) {
            setSettings(DEFAULT_REMINDER_SETTINGS);
            setLoaded(true);
            return () => {
                cancelled = true;
            };
        }

        (async () => {
            const key = storageKeyFor(userId);
            try {
                const stored = await AsyncStorage.getItem(key);
                if (stored && !cancelled) {
                    setSettings({ ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(stored) });
                } else if (!cancelled) {
                    setSettings(DEFAULT_REMINDER_SETTINGS);
                }
            } catch (err) {
                console.warn('[reminders] AsyncStorage read failed:', err);
            }

            let resolvedEnabled = DEFAULT_REMINDER_SETTINGS.enabled;
            try {
                const token = await getSession();
                if (token && !cancelled) {
                    const remote = await api.getReminderPreferences(token);
                    const next: ReminderSettings = {
                        enabled: remote.enabled,
                        leadTimeMinutes: remote.lead_time_minutes,
                    };
                    resolvedEnabled = remote.enabled;
                    setSettings(next);
                    await AsyncStorage.setItem(key, JSON.stringify(next));
                }
            } catch {
                // Backend-Fehler tolerieren — lokaler State (oder Defaults) bleibt aktiv.
            }

            if (!cancelled) setLoaded(true);

            // Bei aktiviertem Toggle Push-Registrierung beim Backend frisch
            // setzen — damit übernimmt der Backend-Upsert (on_conflict=token/
            // endpoint) das Gerät auf die neue person_id, falls es vorher
            // einer anderen Person gehörte.
            if (!cancelled && resolvedEnabled) {
                try {
                    const t = await getSession();
                    if (t) {
                        if (Platform.OS === 'web') {
                            await registerWebPush(t).catch(() => {});
                        } else {
                            await registerExpoPush(t).catch(() => {});
                        }
                    }
                } catch {
                    // ignore
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [userId]);

    const persist = useCallback(
        async (next: ReminderSettings) => {
            setSettings(next);
            const key = storageKeyFor(userId);
            try {
                await AsyncStorage.setItem(key, JSON.stringify(next));
            } catch (err) {
                console.warn('[reminders] AsyncStorage write failed:', err);
            }
            const token = await getSession();
            if (token) {
                try {
                    await api.updateReminderPreferences(token, {
                        enabled: next.enabled,
                        lead_time_minutes: next.leadTimeMinutes,
                    });
                } catch (err) {
                    console.warn('[reminders] Backend-Update fehlgeschlagen:', err);
                }
                if (Platform.OS === 'web') {
                    if (next.enabled) await registerWebPush(token).catch(() => {});
                    else await unregisterWebPush(token).catch(() => {});
                } else {
                    if (next.enabled) await registerExpoPush(token).catch(() => {});
                    else await unregisterExpoPush(token).catch(() => {});
                }
                if (next.enabled) await syncReminders(token, next).catch(() => {});
                else await cancelAllReminders().catch(() => {});
            }
        },
        [userId],
    );

    const setEnabled = useCallback(
        async (enabled: boolean) => {
            await persist({ ...settings, enabled });
        },
        [persist, settings],
    );

    const setLeadTimeMinutes = useCallback(
        async (minutes: number) => {
            const clamped = Math.max(1, Math.min(10080, Math.round(minutes)));
            await persist({ ...settings, leadTimeMinutes: clamped });
        },
        [persist, settings],
    );

    const refresh = useCallback(async () => {
        const token = await getSession();
        if (!token) return;
        if (settings.enabled) await syncReminders(token, settings).catch(() => {});
    }, [settings]);

    return (
        <ReminderSettingsContext.Provider value={{ settings, loaded, setEnabled, setLeadTimeMinutes, refresh }}>
            {children}
        </ReminderSettingsContext.Provider>
    );
}

export function useReminderSettings(): ReminderSettingsContextType {
    const ctx = useContext(ReminderSettingsContext);
    if (!ctx) throw new Error('useReminderSettings must be used within ReminderSettingsProvider');
    return ctx;
}
