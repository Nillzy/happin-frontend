import { Platform } from 'react-native';
import type { EventListResponse, EventDetailResponse, EventCreateRequest, EventUpdateRequest, TicketOption, RsvpStatus, RsvpResponse } from '@/src/types/events';
import type { ParticipantListResponse, RemoveParticipantsResponse } from '@/src/types/host';

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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${path}`;
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

    getEventById: (eventId: string, token?: string) =>
        request<EventDetailResponse>(`/api/v1/events/${eventId}`, token ? {
            headers: { Authorization: `Bearer ${token}` },
        } : undefined),

    createEvent: (data: EventCreateRequest, token: string) =>
        request<EventDetailResponse>('/api/v1/events/', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        }),

    updateEvent: (eventId: string, data: EventUpdateRequest, token: string) =>
        request<EventDetailResponse>(`/api/v1/events/${eventId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        }),

    syncTicketOptions: (eventId: string, options: TicketOption[], token: string) =>
        request<TicketOption[]>(`/api/v1/events/${eventId}/ticket-options`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ticket_options: options }),
        }),

    rsvpEvent: (eventId: string, status: RsvpStatus, token: string) =>
        request<RsvpResponse>(`/api/v1/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status }),
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
};
