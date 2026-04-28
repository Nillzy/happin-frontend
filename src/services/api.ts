import type { EventListResponse, EventDetailResponse } from '@/src/types/events';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

export const api = {
    getPublicEvents: (limit = 50, offset = 0) =>
        request<EventListResponse>(`/api/v1/events/?limit=${limit}&offset=${offset}`),

    getEventById: (eventId: number) =>
        request<EventDetailResponse>(`/api/v1/events/${eventId}`),
};
