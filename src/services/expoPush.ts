/**
 * Expo Push Service — registriert native iOS/Android Push-Tokens beim Backend.
 *
 * Pendant zu reminders.ts/registerWebPush, aber für Native (Remote-Push via
 * Expo Push Service). Lokale Reminders bleiben in reminders.ts (lokale
 * scheduledNotifications für die K4-Lead-Time vor Event-Start).
 *
 * Aufgerufen aus app/_layout.tsx nach Login (Native-only).
 *
 * Hinweis: Funktioniert NICHT in Expo Go (seit SDK 53 keine Remote-Push mehr
 * in Expo Go). Erfordert einen Dev-Build oder Production-Build.
 */

import { Platform } from 'react-native';
import { api } from './api';

let _Notifications: typeof import('expo-notifications') | null = null;
let _Constants: typeof import('expo-constants').default | null = null;

function getNotifications(): typeof import('expo-notifications') | null {
    if (Platform.OS === 'web') return null;
    if (_Notifications) return _Notifications;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        _Notifications = require('expo-notifications');
        return _Notifications;
    } catch {
        return null;
    }
}

let _handlerSet = false;
function ensureNotificationHandler(): void {
    if (_handlerSet) return;
    const N = getNotifications();
    if (!N) return;
    N.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
    _handlerSet = true;
}

function getConstants(): typeof import('expo-constants').default | null {
    if (Platform.OS === 'web') return null;
    if (_Constants) return _Constants;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        _Constants = require('expo-constants').default;
        return _Constants;
    } catch {
        return null;
    }
}

function getProjectId(): string | undefined {
    const C = getConstants();
    if (!C) return undefined;
    return (
        C.expoConfig?.extra?.eas?.projectId ??
        (C as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId ??
        undefined
    );
}

async function ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    const N = getNotifications();
    if (!N) return;
    try {
        await N.setNotificationChannelAsync('default', {
            name: 'Standard',
            importance: N.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    } catch (err) {
        console.warn('[expoPush] setNotificationChannelAsync fehlgeschlagen:', err);
    }
}

async function ensurePermission(): Promise<boolean> {
    const N = getNotifications();
    if (!N) return false;
    const { status: current } = await N.getPermissionsAsync();
    if (current === 'granted') return true;
    const { status } = await N.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return status === 'granted';
}

/**
 * Holt einen Expo-Push-Token und registriert ihn beim Backend.
 *
 * Liefert den Token zurück (oder null bei Fehler / Web / fehlender Permission).
 */
export async function registerExpoPush(authToken: string): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    const N = getNotifications();
    if (!N) return null;

    ensureNotificationHandler();
    await ensureAndroidChannel();

    const ok = await ensurePermission();
    if (!ok) return null;

    const projectId = getProjectId();
    if (!projectId) {
        console.warn(
            '[expoPush] Kein EAS projectId gefunden — getExpoPushTokenAsync wird vermutlich fehlschlagen. ' +
                'Bitte in app.json unter expo.extra.eas.projectId setzen.',
        );
    }

    let tokenResult: { data: string };
    try {
        tokenResult = projectId
            ? await N.getExpoPushTokenAsync({ projectId })
            : await N.getExpoPushTokenAsync();
    } catch (err) {
        console.warn('[expoPush] getExpoPushTokenAsync fehlgeschlagen:', err);
        return null;
    }

    const token = tokenResult.data;
    if (!token) return null;

    const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
    const userAgent = `${Platform.OS} ${Platform.Version}`;

    try {
        await api.registerExpoPushToken(authToken, {
            token,
            platform,
            user_agent: userAgent,
        });
    } catch (err) {
        console.warn('[expoPush] Backend-Registration fehlgeschlagen:', err);
        return null;
    }
    return token;
}

export async function unregisterExpoPush(authToken: string): Promise<void> {
    if (Platform.OS === 'web') return;
    const N = getNotifications();
    if (!N) return;
    const projectId = getProjectId();
    let token: string | null = null;
    try {
        const result = projectId
            ? await N.getExpoPushTokenAsync({ projectId })
            : await N.getExpoPushTokenAsync();
        token = result.data ?? null;
    } catch {
        return;
    }
    if (!token) return;
    try {
        await api.unregisterExpoPushToken(authToken, token);
    } catch (err) {
        console.warn('[expoPush] Backend-Unregister fehlgeschlagen:', err);
    }
}
