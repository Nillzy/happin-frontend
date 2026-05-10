import { Platform } from 'react-native';
import type { EventListResponse, EventDetailResponse, EventCreateRequest, EventUpdateRequest, TicketOption, RsvpStatus, RsvpResponse, UserTicket, UserTicketListResponse, CustomField, CustomFieldResponseItem, TicketResponses } from '@/src/types/events';
import type { ParticipantListResponse, RemoveParticipantsResponse, ScanTicketResponse } from '@/src/types/host';

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
const _eventCache = new Map<string, { data: EventDetailResponse; ts: number }>();
const _userEventsCache = new Map<string, { data: EventListResponse; ts: number }>();
const CACHE_TTL = 30_000;

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
    return response.json();
}

export const api = {
    getPublicEvents: (limit = 50, offset = 0, token?: string) =>
        request<EventListResponse>(`/api/v1/events/?limit=${limit}&offset=${offset}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),

    getEventById: async (eventId: string, token?: string) => {
        const cached = _eventCache.get(eventId);
        if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
        const data = await request<EventDetailResponse>(`/api/v1/events/${eventId}`, token ? {
            headers: { Authorization: `Bearer ${token}` },
        } : undefined);
        _eventCache.set(eventId, { data, ts: Date.now() });
        return data;
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

    getUserEvents: async (token: string, period: 'upcoming' | 'past' = 'upcoming', limit = 50, offset = 0, role?: 'organizer' | 'attendee') => {
        const params = new URLSearchParams({ period, limit: String(limit), offset: String(offset) });
        if (role) params.set('role', role);
        const cacheKey = params.toString();
        const cached = _userEventsCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
        const data = await request<EventListResponse>(`/api/v1/events/me?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        _userEventsCache.set(cacheKey, { data, ts: Date.now() });
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

    invalidateCaches: (eventId?: string) => {
        if (eventId) _eventCache.delete(eventId);
        _ticketsCache = null;
    },
};

export function invalidateTicketsCache() {
    _ticketsCache = null;
}
