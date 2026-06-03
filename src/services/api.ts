import { Platform } from 'react-native';
import type { EventListResponse, EventListItem, EventDetailResponse, EventCreateRequest, EventUpdateRequest, TicketOption, RsvpStatus, RsvpResponse, UserTicket, UserTicketListResponse, CustomField, CustomFieldResponseItem, TicketResponses, EventFilterParams, FilterPeriod, RefundSummary } from '@/src/types/events';
import type { ParticipantListResponse, RemoveParticipantsResponse, ScanTicketResponse } from '@/src/types/host';
import type { NotificationListResponse } from '@/src/types/notifications';

/**
 * Get the appropriate backend URL based on platform and environment.
 *
 * - Web (localhost): Use localhost directly
 * - Native (iOS/Android): Use ngrok tunnel URL from env
 * - Fallback: localhost for development
 */
function getBackendUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

    if (envUrl && envUrl.includes('ngrok')) {
        return envUrl;
    }

    if (Platform.OS === 'web') {
        return envUrl ?? '';
    }

    return envUrl ?? '';
}

const BASE_URL = getBackendUrl();

let _ticketsCache: { data: UserTicketListResponse; ts: number } | null = null;
type CachedEvent = {
    data: Partial<EventDetailResponse> & Pick<EventDetailResponse, 'event_id'>;
    ts: number;
    isPartial: boolean;
};
const _eventCache = new Map<string, CachedEvent>();
const _userEventsCache = new Map<string, { data: EventListResponse; ts: number }>();
const CACHE_TTL = 30_000;

function hydrateEventCacheFromList(events: EventListItem[]) {
    const now = Date.now();
    for (const item of events) {
        const existing = _eventCache.get(item.event_id);
        if (existing && !existing.isPartial && now - existing.ts < CACHE_TTL) continue;
        _eventCache.set(item.event_id, {
            data: { ...item } as Partial<EventDetailResponse> & Pick<EventDetailResponse, 'event_id'>,
            ts: now,
            isPartial: true,
        });
    }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = `${base}/${cleanPath}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers as Record<string, string>),
        },
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`API error ${response.status}: ${body}`);
    }
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
    }
    return response.json();
}

function getPeriodDates(period: Exclude<FilterPeriod, 'custom'>): { dateFrom: string; dateTo: string } {
    const now = new Date();
    if (period === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
    }
    if (period === 'week') {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return { dateFrom: monday.toISOString(), dateTo: sunday.toISOString() };
    }
    // month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

export const api = {
    getPublicEvents: async (limit = 50, offset = 0, token?: string, filters?: EventFilterParams, search?: string) => {
        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        if (filters?.period && filters.period !== 'custom') {
            const { dateFrom, dateTo } = getPeriodDates(filters.period);
            params.set('date_from', dateFrom);
            params.set('date_to', dateTo);
        } else if (filters?.period === 'custom') {
            if (filters.dateFrom) {
                const from = new Date(filters.dateFrom);
                from.setHours(0, 0, 0, 0);
                params.set('date_from', from.toISOString());
            }
            if (filters.dateTo) {
                const to = new Date(filters.dateTo);
                to.setHours(23, 59, 59, 999);
                params.set('date_to', to.toISOString());
            }
        }
        if (filters?.categories?.length) {
            params.set('categories', filters.categories.join(','));
        }
        if (filters?.city?.trim()) {
            params.set('city', filters.city.trim());
        }
        if (filters?.isFree) {
            params.set('is_free', 'true');
        }
        if (search?.trim()) {
            params.set('search', search.trim());
        }
        const data = await request<EventListResponse>(`/api/v1/events/?${params}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        hydrateEventCacheFromList(data.events);
        return data;
    },

    getEventsByHost: async (hostPersonId: string, limit = 50, offset = 0, token?: string) => {
        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        const data = await request<EventListResponse>(`/api/v1/events/host/${hostPersonId}?${params}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        hydrateEventCacheFromList(data.events);
        return data;
    },

    getEventById: async (eventId: string, token?: string): Promise<EventDetailResponse> => {
        const cached = _eventCache.get(eventId);
        if (cached && !cached.isPartial && Date.now() - cached.ts < CACHE_TTL) {
            return cached.data as EventDetailResponse;
        }
        const data = await request<EventDetailResponse>(`/api/v1/events/${eventId}`, token ? {
            headers: { Authorization: `Bearer ${token}` },
        } : undefined);
        _eventCache.set(eventId, { data, ts: Date.now(), isPartial: false });
        return data;
    },

    getCachedEventPartial: (eventId: string): Partial<EventDetailResponse> | null => {
        const cached = _eventCache.get(eventId);
        return cached ? cached.data : null;
    },

    createEvent: (data: EventCreateRequest, token: string) =>
        request<EventDetailResponse>('/api/v1/events/', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        }),

    updateEvent: async (eventId: string, data: EventUpdateRequest, token: string) => {
        const result = await request<EventDetailResponse>(`/api/v1/events/${eventId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        _eventCache.delete(eventId);
        return result;
    },

    cancelEvent: async (eventId: string, token: string): Promise<RefundSummary> => {
        const result = await request<RefundSummary>(`/api/v1/events/${eventId}/cancel`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        _eventCache.delete(eventId);
        _userEventsCache.clear();
        return result;
    },

    syncTicketOptions: async (eventId: string, options: TicketOption[], token: string) => {
        const result = await request<TicketOption[] | { ticket_options: TicketOption[] }>(`/api/v1/events/${eventId}/ticket-options`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ticket_options: options }),
        });
        _eventCache.delete(eventId);
        // Backend may return either a plain array or { ticket_options: [...] }
        return Array.isArray(result) ? result : (result as any).ticket_options ?? [];
    },

    rsvpEvent: (eventId: string, status: RsvpStatus, token: string, ticketCount: number = 1, attendeeNames?: string[]) =>
        request<RsvpResponse>(`/api/v1/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                status,
                ticket_count: ticketCount,
                ...(attendeeNames ? { guest_names: attendeeNames } : {}),
            }),
        }),

    joinWaitlist: async (eventId: string, token: string): Promise<{ waitlist_id: string; position: number }> => {
        const result = await request<{ waitlist_id: string; position: number }>(
            `/api/v1/events/${eventId}/waitlist`,
            { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        );
        _eventCache.delete(eventId);
        return result;
    },

    leaveWaitlist: async (eventId: string, token: string): Promise<void> => {
        await request<void>(
            `/api/v1/events/${eventId}/waitlist`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
        );
        _eventCache.delete(eventId);
    },

    getWaitlistPosition: (eventId: string, token: string): Promise<{ position: number }> =>
        request<{ position: number }>(`/api/v1/events/${eventId}/waitlist/position`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getEventParticipants: (eventId: string, token: string) =>
        request<ParticipantListResponse>(`/api/v1/events/${eventId}/participants`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    removeParticipants: (eventId: string, participationIds: string[], token: string) =>
        request<RemoveParticipantsResponse>(`/api/v1/events/${eventId}/participants`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ participation_ids: participationIds }),
        }),

    exportEventGuestList: async (
        eventId: string,
        format: 'csv' | 'pdf',
        includeRsvpResponses: boolean,
        token: string,
    ): Promise<{ blob: Blob; filename: string }> => {
        const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
        const params = new URLSearchParams({
            format,
            include_rsvp_responses: String(includeRsvpResponses),
        });
        const response = await fetch(
            `${base}/api/v1/events/${eventId}/export?${params.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Export fehlgeschlagen (${response.status}): ${body}`);
        }
        const blob = await response.blob();
        const disposition = response.headers.get('content-disposition') ?? '';
        const match = disposition.match(/filename="?([^";]+)"?/i);
        const filename = match?.[1] ?? `gaesteliste.${format}`;
        return { blob, filename };
    },

    getUserEvents: async (token: string, period: 'upcoming' | 'past' = 'upcoming', limit = 50, offset = 0, role?: 'organizer' | 'attendee') => {
        const params = new URLSearchParams({ period, limit: String(limit), offset: String(offset) });
        if (role) params.set('role', role);
        const cacheKey = params.toString();
        const cached = _userEventsCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            hydrateEventCacheFromList(cached.data.events);
            return cached.data;
        }
        const data = await request<EventListResponse>(`/api/v1/events/me?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        _userEventsCache.set(cacheKey, { data, ts: Date.now() });
        hydrateEventCacheFromList(data.events);
        return data;
    },

    getUserTickets: async (token: string) => {
        if (_ticketsCache && Date.now() - _ticketsCache.ts < CACHE_TTL) return _ticketsCache.data;
        const data = await request<UserTicketListResponse>(
            '/api/v1/users/me/tickets',
            { headers: { Authorization: `Bearer ${token}` } }
        );
        _ticketsCache = { data, ts: Date.now() };
        return data;
    },

    createTickets: (eventId: string, ticketOptionId: string | null, quantity: number, token: string) =>
        request<{ tickets: UserTicket[] }>(`/api/v1/events/${eventId}/tickets`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ticket_option_id: ticketOptionId, quantity }),
        }),

    getUserStats: (token: string) =>
        request<{ events_attended: number; events_created: number; tickets_total: number; participants_total: number }>(
            '/api/v1/users/me/stats',
            { headers: { Authorization: `Bearer ${token}` } }
        ),

    searchStockImages: (query: string, perPage = 8) =>
        request<{ url: string; thumbnail: string; photographer: string; unsplash_link: string }[]>(
            `/api/v1/images/search?q=${encodeURIComponent(query)}&per_page=${perPage}`
        ),

    getWalletUrl: (eventId: string, token?: string) =>
        request<{ wallet_url: string }>(`/api/v1/events/${eventId}/wallet`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),

    scanTicket: (eventId: string, qrToken: string, token: string) =>
        request<ScanTicketResponse>(`/api/v1/events/${eventId}/tickets/scan`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ qr_token: qrToken }),
        }),

    syncCustomFields: (eventId: string, fields: CustomField[], token: string) =>
        request<CustomField[]>(`/api/v1/events/${eventId}/custom-fields`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ custom_fields: fields }),
        }),

    submitCustomFieldResponses: (eventId: string, ticketId: string, responses: CustomFieldResponseItem[], token: string) =>
        request<CustomFieldResponseItem[]>(`/api/v1/events/${eventId}/custom-fields/responses`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ticket_id: ticketId, responses }),
        }),

    getMyCustomFieldResponses: (eventId: string, token: string) =>
        request<TicketResponses[]>(`/api/v1/events/${eventId}/custom-fields/responses/me`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    // ── Stripe Connect / Payments ──────────────────────────────────────────

    createCheckoutSession: async (eventId: string, ticketOptionId: string, quantity: number, token: string) => {
        const result = await request<{ checkout_url: string; ticket_order_id: string }>(
            `/api/v1/events/${eventId}/checkout-session`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ticket_option_id: ticketOptionId, quantity }),
            },
        );
        if (!result.checkout_url) {
            throw new Error('Checkout-URL fehlt in der Server-Antwort');
        }
        return result;
    },

    abandonCheckoutSession: (eventId: string, token: string) =>
        request<{ abandoned: boolean }>(`/api/v1/events/${eventId}/checkout-session/abandon`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),

    getConnectStatus: (token: string) =>
        request<{ has_account: boolean; charges_enabled: boolean; payouts_enabled: boolean; onboarding_complete: boolean }>(
            '/api/v1/connect/status',
            { headers: { Authorization: `Bearer ${token}` } }
        ),

    createOnboardingLink: (token: string, eventId?: string) =>
        request<{ url: string; account_id: string }>(
            `/api/v1/connect/onboarding-link${eventId ? `?event_id=${eventId}` : ''}`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            },
        ),

    createDashboardLink: (token: string) =>
        request<{ url: string }>('/api/v1/connect/dashboard-link', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPaymentSummary: (eventId: string, token: string) =>
        request<{ gross_cents: number; platform_fee_cents: number; net_cents: number; paid_orders: number }>(
            `/api/v1/events/${eventId}/payments/summary`,
            { headers: { Authorization: `Bearer ${token}` } }
        ),

    requestPayout: (eventId: string, token: string) =>
        request<{ payout_id: string; amount_cents: number; currency: string }>(`/api/v1/events/${eventId}/payout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),

    getCheckoutOrderStatus: (sessionId: string, token: string) =>
        request<{
            order_status: string;
            fulfilled: boolean;
            event_id: string;
            ticket_order_id: string;
        }>(`/api/v1/checkout/orders/status?session_id=${encodeURIComponent(sessionId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    cancelTicketOrder: (eventId: string, token: string) =>
        request<{ refunded: boolean; amount_cents: number }>(`/api/v1/events/${eventId}/tickets/cancel`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),

    // ── Reminders / K4 ─────────────────────────────────────────────────────

    getReminderPreferences: (token: string) =>
        request<{ enabled: boolean; lead_time_minutes: number }>(
            '/api/v1/users/me/reminder-preferences',
            { headers: { Authorization: `Bearer ${token}` } },
        ),

    updateReminderPreferences: (
        token: string,
        body: { enabled?: boolean; lead_time_minutes?: number },
    ) =>
        request<{ enabled: boolean; lead_time_minutes: number }>(
            '/api/v1/users/me/reminder-preferences',
            {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            },
        ),

    registerWebPushSubscription: (
        token: string,
        body: { endpoint: string; keys: { p256dh: string; auth: string }; user_agent?: string },
    ) =>
        request<void>('/api/v1/users/me/web-push-subscriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        }),

    unregisterWebPushSubscription: (token: string, endpoint: string) =>
        request<void>('/api/v1/users/me/web-push-subscriptions', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ endpoint }),
        }),

    getVapidPublicKey: () =>
        request<{ public_key: string | null }>('/api/v1/users/vapid-public-key'),

    registerExpoPushToken: (
        token: string,
        body: { token: string; platform: 'ios' | 'android'; user_agent?: string },
    ) =>
        request<void>('/api/v1/users/me/expo-push-tokens', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        }),

    unregisterExpoPushToken: (authToken: string, expoToken: string) =>
        request<void>('/api/v1/users/me/expo-push-tokens', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ token: expoToken }),
        }),

    // ── Geräte-Verwaltung ──────────────────────────────────────────────────

    listWebPushSubscriptions: (token: string) =>
        request<{
            items: {
                web_push_subscription_id: string;
                endpoint: string;
                user_agent: string | null;
                created_at: string;
            }[];
        }>('/api/v1/users/me/web-push-subscriptions', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteWebPushSubscriptionById: (token: string, id: string) =>
        request<void>(`/api/v1/users/me/web-push-subscriptions/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }),

    listExpoPushTokens: (token: string) =>
        request<{
            items: {
                expo_push_token_id: string;
                platform: 'ios' | 'android';
                user_agent: string | null;
                created_at: string;
            }[];
        }>('/api/v1/users/me/expo-push-tokens', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteExpoPushTokenById: (token: string, id: string) =>
        request<void>(`/api/v1/users/me/expo-push-tokens/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }),

    listNotifications: (token: string, before?: string, limit = 20) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (before) params.set('before', before);
        return request<NotificationListResponse>(
            `/api/v1/users/me/notifications?${params.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
    },

    getNotificationsUnreadCount: (token: string) =>
        request<{ count: number }>('/api/v1/users/me/notifications/unread-count', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    markNotificationRead: (token: string, notificationId: string) =>
        request<void>(`/api/v1/users/me/notifications/${notificationId}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),

    markAllNotificationsRead: (token: string) =>
        request<{ marked: number }>('/api/v1/users/me/notifications/read-all', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),

    sendTestNotification: (token: string) =>
        request<{ ok: boolean; pushed: number }>('/api/v1/users/me/notifications/test', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateAvatar: (token: string, avatarUrl: string) =>
        request<{ avatar_url: string }>('/api/v1/users/me/avatar', {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ avatar_url: avatarUrl }),
        }),

    invalidateCaches: (eventId?: string) => {
        if (eventId) _eventCache.delete(eventId);
        _ticketsCache = null;
    },
};

export function prefetchEvent(eventId: string, token?: string | null) {
    const cached = _eventCache.get(eventId);
    if (cached && !cached.isPartial && Date.now() - cached.ts < CACHE_TTL) return;
    void api.getEventById(eventId, token ?? undefined).catch(() => {});
}

export function invalidateTicketsCache() {
    _ticketsCache = null;
}
