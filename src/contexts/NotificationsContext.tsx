/**
 * NotificationsContext: hält den Unread-Count + Liste-Refresh-Funktion.
 *
 * - Lädt Count beim Login und alle 60s im Vordergrund (Polling-Fallback
 *   für User ohne aktivierten Push).
 * - Wird vom NotificationBell-Badge konsumiert; Liste-Screens rufen
 *   `refreshList` direkt nach Mark-Read.
 */

import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { api } from '@/src/services/api';
import { getSession } from '@/src/services/supabase';
import { useAuth } from '@/src/contexts/AuthContext';

const POLL_INTERVAL_MS = 60_000;

interface NotificationsContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const [unreadCount, setUnreadCount] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refreshUnreadCount = useCallback(async () => {
        if (!userId) {
            setUnreadCount(0);
            return;
        }
        try {
            const token = await getSession();
            if (!token) return;
            const { count } = await api.getNotificationsUnreadCount(token);
            setUnreadCount(count);
        } catch {
            // Stillschweigend ignorieren — Badge bleibt beim letzten Stand.
        }
    }, [userId]);

    // Initial laden + Polling starten/stoppen je nach Login-State.
    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (!userId) {
            setUnreadCount(0);
            return;
        }
        refreshUnreadCount();
        intervalRef.current = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [userId, refreshUnreadCount]);

    // Beim App-Resume sofort refreshen (statt erst beim nächsten Tick)
    useEffect(() => {
        const onChange = (state: AppStateStatus) => {
            if (state === 'active') refreshUnreadCount();
        };
        const sub = AppState.addEventListener('change', onChange);
        return () => sub.remove();
    }, [refreshUnreadCount]);

    // Bei eingehender Web-Push-Nachricht (Service Worker postet) Unread-Count nachladen.
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
        const onMessage = (ev: MessageEvent) => {
            const data = ev.data;
            if (data && data.kind === 'happin-notification') {
                refreshUnreadCount();
            }
        };
        navigator.serviceWorker.addEventListener('message', onMessage);
        return () => {
            navigator.serviceWorker.removeEventListener('message', onMessage);
        };
    }, [refreshUnreadCount]);

    // Bei eingehender Native-Push-Nachricht (Expo) Unread-Count nachladen.
    useEffect(() => {
        if (Platform.OS === 'web') return;
        let N: typeof import('expo-notifications') | null = null;
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            N = require('expo-notifications');
        } catch {
            return;
        }
        if (!N) return;
        const receivedSub = N.addNotificationReceivedListener(() => {
            refreshUnreadCount();
        });
        const responseSub = N.addNotificationResponseReceivedListener(() => {
            refreshUnreadCount();
        });
        return () => {
            receivedSub.remove();
            responseSub.remove();
        };
    }, [refreshUnreadCount]);

    return (
        <NotificationsContext.Provider value={{ unreadCount, refreshUnreadCount }}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications(): NotificationsContextType {
    const ctx = useContext(NotificationsContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
    return ctx;
}
