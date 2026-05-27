/**
 * Reminder-Service (Anforderung K4).
 *
 * - Native (iOS/Android): plant lokale Notifications via expo-notifications.
 *   Funktioniert auch bei geschlossener App.
 * - Web: registriert eine Push-Subscription beim Backend; das Backend sendet
 *   Reminders via Web Push (siehe reminder_scheduler.py im Backend).
 *
 * Aufrufstellen:
 *   - nach Login (App.tsx)
 *   - nach Toggle/LeadTime-Änderung (ReminderSettingsContext)
 *   - nach RSVP-Änderung (EventScreen)
 *   - nach Event-Liste-Reload (MyEventsScreen)
 */

import { Platform } from 'react-native';
import { api } from './api';
import type { ReminderSettings } from '@/src/types/reminders';
import type { EventListItem } from '@/src/types/events';

let _Notifications: typeof import('expo-notifications') | null = null;
function getNotifications(): typeof import('expo-notifications') | null {
    if (Platform.OS === 'web') return null;
    if (_Notifications) return _Notifications;
    try {
        // Hinweis: In Expo Go auf Android logt expo-notifications beim Modul-Load
        // einen Warntext zu Remote-Push (in SDK 53+ aus Expo Go entfernt). Wir
        // nutzen nur lokale Scheduled-Notifications via scheduleNotificationAsync;
        // diese funktionieren auch in Expo Go weiterhin. In einem Dev-Build /
        // Production-Build verschwindet die Warnung.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        _Notifications = require('expo-notifications');
        return _Notifications;
    } catch {
        return null;
    }
}

const REMINDER_PREFIX = 'event-reminder-';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermissionStatus(): Promise<PermissionStatus> {
    if (Platform.OS === 'web') {
        if (typeof Notification === 'undefined') return 'unsupported';
        const p = Notification.permission;
        if (p === 'granted') return 'granted';
        if (p === 'denied') return 'denied';
        return 'undetermined';
    }
    const N = getNotifications();
    if (!N) return 'unsupported';
    const { status } = await N.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
}

export async function requestPermission(): Promise<PermissionStatus> {
    if (Platform.OS === 'web') {
        if (typeof Notification === 'undefined') return 'unsupported';
        const result = await Notification.requestPermission();
        return result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'undetermined';
    }
    const N = getNotifications();
    if (!N) return 'unsupported';
    const { status } = await N.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

async function cancelAllNativeReminders(): Promise<void> {
    const N = getNotifications();
    if (!N) return;
    const all = await N.getAllScheduledNotificationsAsync();
    await Promise.all(
        all
            .filter((n) => typeof n.identifier === 'string' && n.identifier.startsWith(REMINDER_PREFIX))
            .map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
    );
}

async function scheduleNativeReminder(
    event: EventListItem,
    leadTimeMinutes: number,
): Promise<void> {
    const N = getNotifications();
    if (!N) return;
    const startsAt = new Date(event.starts_at);
    const fireAt = new Date(startsAt.getTime() - leadTimeMinutes * 60_000);
    if (fireAt.getTime() <= Date.now()) return;

    const SchedulableTriggerInputTypes = (N as unknown as { SchedulableTriggerInputTypes: Record<string, string> })
        .SchedulableTriggerInputTypes;
    await N.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${event.event_id}`,
        content: {
            title: event.title,
            body: buildReminderBody(leadTimeMinutes),
            data: { eventId: event.event_id },
        },
        trigger: {
            type: SchedulableTriggerInputTypes?.DATE ?? 'date',
            date: fireAt,
        },
    });
}

function buildReminderBody(leadTimeMinutes: number): string {
    if (leadTimeMinutes < 60) return `Beginnt in ${leadTimeMinutes} Minuten.`;
    if (leadTimeMinutes < 1440) {
        const h = Math.round((leadTimeMinutes / 60) * 10) / 10;
        return `Beginnt in ${h} Stunden.`;
    }
    const d = Math.round((leadTimeMinutes / 1440) * 10) / 10;
    return `Beginnt in ${d} Tagen.`;
}

/**
 * Synchronisiert Reminders für alle Gast-Events des Users.
 *
 * Native: cancel alle Reminders mit unserem Prefix, dann re-schedule.
 * Web: pusht Settings ans Backend (Subscription wird separat verwaltet).
 */
export async function syncReminders(token: string, settings: ReminderSettings): Promise<void> {
    if (Platform.OS === 'web') {
        // Settings sind bereits über updateReminderPreferences synchronisiert
        // (siehe ReminderSettingsContext). Nichts weiter zu tun hier.
        return;
    }

    const N = getNotifications();
    if (!N) return;

    await cancelAllNativeReminders();
    if (!settings.enabled) return;

    const perm = await getPermissionStatus();
    if (perm !== 'granted') return;

    let events: EventListItem[];
    try {
        const resp = await api.getUserEvents(token, 'upcoming', 200, 0, 'attendee');
        events = resp.events;
    } catch (err) {
        console.warn('[reminders] Konnte Gast-Events nicht laden:', err);
        return;
    }

    await Promise.all(
        events
            .filter((e) => !e.is_cancelled)
            .map((e) => scheduleNativeReminder(e, settings.leadTimeMinutes)),
    );
}

export async function cancelAllReminders(): Promise<void> {
    if (Platform.OS === 'web') return;
    await cancelAllNativeReminders();
}

/**
 * Web-only: registriert die Push-Subscription beim Backend.
 * Aufgerufen, wenn Toggle aktiviert wird.
 */
export async function registerWebPush(token: string): Promise<boolean> {
    if (Platform.OS !== 'web') return false;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
    }

    const { public_key } = await api.getVapidPublicKey();
    if (!public_key) {
        console.warn('[reminders] Backend liefert keinen VAPID-Public-Key.');
        return false;
    }

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
        subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(public_key),
        });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    await api.registerWebPushSubscription(token, {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
    return true;
}

export async function unregisterWebPush(token: string): Promise<void> {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;
    try {
        await api.unregisterWebPushSubscription(token, subscription.endpoint);
    } catch (err) {
        console.warn('[reminders] Backend-Unregister fehlgeschlagen:', err);
    }
    await subscription.unsubscribe();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
}
