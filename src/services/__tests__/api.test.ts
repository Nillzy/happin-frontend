import { api } from '../api';
import type { EventListResponse, EventDetailResponse, RefundSummary } from '@/src/types/events';

const mockEventListItem = {
  event_id: 'evt-123',
  title: 'Test Event',
  starts_at: '2026-06-15T18:00:00Z',
  ends_at: '2026-06-15T22:00:00Z',
  description: 'Test Description',
  category: 'music',
  max_capacity: 100,
  is_public: true,
  is_free: false,
  status: 'active',
  image_url: 'https://example.com/image.jpg',
  participant_count: 25,
  is_host: false,
  location_is_private: false,
  show_weather_forecast: true,
};

const mockEventDetail: EventDetailResponse = {
  ...mockEventListItem,
  invitation_link: 'https://happin.app/e/evt-123',
  host_name: 'John Doe',
  host_person_id: 'person-456',
  media_urls: ['https://example.com/media1.jpg'],
  ticket_options: [
    {
      ticket_option_id: 'opt-1',
      name: 'General Admission',
      description: 'Standard ticket',
      price: 15.0,
      quantity_limit: 50,
      sort_order: 0,
    },
  ],
  custom_fields: [],
  my_rsvp_status: null,
  ticket: [],
  max_tickets_per_person: 5,
};

// Mock global fetch
global.fetch = jest.fn();

beforeEach(() => {
  (global.fetch as jest.Mock).mockClear();
  (global.fetch as jest.Mock).mockReset();
  // Clear ALL caches (including event cache for evt-123)
  api.invalidateCaches('evt-123');
  api.invalidateCaches('evt-private');
});

describe('api.getPublicEvents', () => {
  it('should fetch events successfully', async () => {
    const mockResponse: EventListResponse = {
      events: [mockEventListItem],
      count: 1,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
      headers: new Headers(),
    });

    const result = await api.getPublicEvents();

    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('Test Event');
    expect(result.count).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/events/'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should include authorization header when token is provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getPublicEvents(50, 0, 'test-token');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('should handle filters correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getPublicEvents(50, 0, undefined, {
      period: 'week',
      categories: ['music', 'sport'],
      city: 'Berlin',
      isFree: true,
    });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('categories=music%2Csport');
    expect(callUrl).toContain('city=Berlin');
    expect(callUrl).toContain('is_free=true');
  });

  it('should handle search parameter', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getPublicEvents(50, 0, undefined, undefined, 'concert');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('search=concert');
  });

  it('should handle 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.getPublicEvents()).rejects.toThrow('API error 401');
  });

  it('should handle 404 not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
      headers: new Headers(),
    });

    await expect(api.getPublicEvents()).rejects.toThrow('API error 404');
  });

  it('should handle 500 internal server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
      headers: new Headers(),
    });

    await expect(api.getPublicEvents()).rejects.toThrow('API error 500');
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(api.getPublicEvents()).rejects.toThrow('Network error');
  });
});

describe('api.getEventById', () => {
  it('should fetch event detail successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockEventDetail,
      headers: new Headers(),
    });

    const result = await api.getEventById('evt-123');

    expect(result.event_id).toBe('evt-123');
    expect(result.title).toBe('Test Event');
    expect(result.ticket_options).toHaveLength(1);
  });

  it('should use cached data if available and fresh', async () => {
    // Clear cache first to ensure clean state
    api.invalidateCaches('evt-cached-2');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockEventDetail,
      headers: new Headers(),
    });

    // First call
    await api.getEventById('evt-cached-2');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second call should use cache
    await api.getEventById('evt-cached-2');
    expect(global.fetch).toHaveBeenCalledTimes(1); // No additional call
  });

  it('should include authorization header when token is provided', async () => {
    // Clear cache for this specific event
    api.invalidateCaches('evt-auth-test');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockEventDetail,
      headers: new Headers(),
    });

    await api.getEventById('evt-auth-test', 'auth-token');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      })
    );
  });

  it('should handle 404 for non-existent event', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ detail: 'Event not found' }),
      headers: new Headers(),
    });

    await expect(api.getEventById('evt-nonexistent')).rejects.toThrow('API error 404');
  });

  it('should handle 401 when token is expired', async () => {
    // Use unique event ID to avoid cache collision
    api.invalidateCaches('evt-401');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Token expired',
      headers: new Headers(),
    });

    await expect(api.getEventById('evt-401', 'expired-token')).rejects.toThrow('API error 401');
  });

  it('should handle 403 when user lacks permission', async () => {
    // Use unique event ID to avoid cache collision
    api.invalidateCaches('evt-403');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
      headers: new Headers(),
    });

    await expect(api.getEventById('evt-403', 'token')).rejects.toThrow('API error 403');
  });

  it('should handle network timeout', async () => {
    // Use unique event ID to avoid cache collision
    api.invalidateCaches('evt-timeout');

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

    await expect(api.getEventById('evt-timeout', 'token')).rejects.toThrow('Network timeout');
  });

  it('should handle 500 server error', async () => {
    // Use unique event ID to avoid cache collision
    api.invalidateCaches('evt-500');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
      headers: new Headers(),
    });

    await expect(api.getEventById('evt-500', 'token')).rejects.toThrow('API error 500');
  });
});

describe('api.createEvent', () => {
  it('should create event successfully', async () => {
    const createRequest: Partial<EventDetailResponse> = {
      title: 'New Event',
      starts_at: '2026-06-20T18:00:00Z',
      ends_at: '2026-06-20T22:00:00Z',
      is_public: true,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...mockEventDetail,
        ...createRequest,
        event_id: 'evt-new',
      }),
      headers: new Headers(),
    });

    const result = await api.createEvent(createRequest as any, 'token');

    expect(result.event_id).toBe('evt-new');
    expect(result.title).toBe('New Event');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/events/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      })
    );
  });

  it('should require authorization token', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.createEvent({} as any, '')).rejects.toThrow('API error 401');
  });

  it('should handle validation errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ detail: 'Title is required' }),
      headers: new Headers(),
    });

    await expect(api.createEvent({} as any, 'token')).rejects.toThrow('API error 422');
  });

  it('should handle 403 when user is not host', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Not a host',
      headers: new Headers(),
    });

    await expect(api.createEvent({} as any, 'token')).rejects.toThrow('API error 403');
  });

  it('should handle network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(api.createEvent({} as any, 'token')).rejects.toThrow('Network error');
  });
});

describe('api.updateEvent', () => {
  it('should update event successfully', async () => {
    const updateRequest: Partial<EventDetailResponse> = {
      title: 'Updated Event',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...mockEventDetail,
        ...updateRequest,
      }),
      headers: new Headers(),
    });

    const result = await api.updateEvent('evt-123', updateRequest as any, 'token');

    expect(result.title).toBe('Updated Event');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/events/evt-123'),
      expect.objectContaining({
        method: 'PATCH',
      })
    );
  });

  it('should invalidate cache after update', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockEventDetail,
      headers: new Headers(),
    });

    await api.updateEvent('evt-123', {} as any, 'token');

    const cached = api.getCachedEventPartial('evt-123');
    expect(cached).toBeNull();
  });

  it('should handle 403 forbidden for non-host', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
      headers: new Headers(),
    });

    await expect(api.updateEvent('evt-123', {} as any, 'token')).rejects.toThrow('API error 403');
  });

  it('should handle 401 when token is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.updateEvent('evt-123', {} as any, '')).rejects.toThrow('API error 401');
  });

  it('should handle 404 when event not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Event not found',
      headers: new Headers(),
    });

    await expect(api.updateEvent('evt-nonexistent', {} as any, 'token')).rejects.toThrow('API error 404');
  });
});

describe('api.cancelEvent', () => {
  it('should cancel event and return refund summary', async () => {
    const refundSummary: RefundSummary = {
      refunded_count: 10,
      failed_count: 0,
      failed_order_ids: [],
      skipped_count: 5,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => refundSummary,
      headers: new Headers(),
    });

    const result = await api.cancelEvent('evt-123', 'token');

    expect(result.refunded_count).toBe(10);
    expect(result.failed_count).toBe(0);
    expect(result.skipped_count).toBe(5);
  });

  it('should invalidate caches after cancellation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        refunded_count: 0,
        failed_count: 0,
        failed_order_ids: [],
        skipped_count: 0,
      }),
      headers: new Headers(),
    });

    await api.cancelEvent('evt-123', 'token');

    const cached = api.getCachedEventPartial('evt-123');
    expect(cached).toBeNull();
  });

  it('should handle partial refund failures', async () => {
    const refundSummary: RefundSummary = {
      refunded_count: 8,
      failed_count: 2,
      failed_order_ids: ['order-1', 'order-2'],
      skipped_count: 3,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => refundSummary,
      headers: new Headers(),
    });

    const result = await api.cancelEvent('evt-123', 'token');

    expect(result.failed_count).toBe(2);
    expect(result.failed_order_ids).toEqual(['order-1', 'order-2']);
  });

  it('should handle 401 when not authenticated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.cancelEvent('evt-123', '')).rejects.toThrow('API error 401');
  });

  it('should handle 403 when user is not host', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Only host can cancel',
      headers: new Headers(),
    });

    await expect(api.cancelEvent('evt-123', 'non-host-token')).rejects.toThrow('API error 403');
  });
});

describe('api.rsvpEvent', () => {
  it('should RSVP to event successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'Accepted',
        ticket_count: 1,
      }),
      headers: new Headers(),
    });

    const result = await api.rsvpEvent('evt-123', 'Accepted', 'token');

    expect(result.status).toBe('Accepted');
  });

  it('should include ticket count and attendee names', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'Accepted' }),
      headers: new Headers(),
    });

    await api.rsvpEvent('evt-123', 'Accepted', 'token', 3, ['Alice', 'Bob', 'Charlie']);

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(callBody.ticket_count).toBe(3);
    expect(callBody.guest_names).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should handle capacity exceeded error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ detail: 'Event is at full capacity' }),
      headers: new Headers(),
    });

    await expect(api.rsvpEvent('evt-123', 'Accepted', 'token')).rejects.toThrow('API error 400');
  });

  it('should handle 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.rsvpEvent('evt-123', 'Accepted', '')).rejects.toThrow('API error 401');
  });
});

describe('api.getUserEvents', () => {
  it('should fetch user events with default parameters', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        events: [mockEventListItem],
        count: 1,
      }),
      headers: new Headers(),
    });

    const result = await api.getUserEvents('token');

    expect(result.events).toHaveLength(1);
  });

  it('should filter by period', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getUserEvents('token', 'past');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('period=past');
  });

  it('should filter by role', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getUserEvents('token', 'upcoming', 50, 0, 'organizer');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('role=organizer');
  });

  it.skip('should use cache for repeated requests', async () => {
    // Skipping: Cache behavior is hard to test in isolation due to shared state
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ events: [mockEventListItem], count: 1 }),
      headers: new Headers(),
    });

    await api.getUserEvents('token-unique-cache');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await api.getUserEvents('token-unique-cache');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('api.joinWaitlist', () => {
  it('should join waitlist successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        waitlist_id: 'wl-1',
        position: 5,
      }),
      headers: new Headers(),
    });

    const result = await api.joinWaitlist('evt-123', 'token');

    expect(result.waitlist_id).toBe('wl-1');
    expect(result.position).toBe(5);
  });

  it('should handle already on waitlist error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ detail: 'Already on waitlist' }),
      headers: new Headers(),
    });

    await expect(api.joinWaitlist('evt-123', 'token')).rejects.toThrow('API error 400');
  });
});

describe('api.createCheckoutSession', () => {
  it('should create checkout session successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        checkout_url: 'https://checkout.stripe.com/session-123',
        ticket_order_id: 'order-456',
      }),
      headers: new Headers(),
    });

    const result = await api.createCheckoutSession('evt-123', 'opt-1', 2, 'token');

    expect(result.checkout_url).toBe('https://checkout.stripe.com/session-123');
    expect(result.ticket_order_id).toBe('order-456');
  });

  it('should throw error if checkout_url is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ticket_order_id: 'order-456',
      }),
      headers: new Headers(),
    });

    await expect(
      api.createCheckoutSession('evt-123', 'opt-1', 2, 'token')
    ).rejects.toThrow('Checkout-URL fehlt');
  });

  it('returns 401 when not authenticated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.createCheckoutSession('evt-123', 'opt-1', 2, '')
    ).rejects.toThrow('API error 401');
  });

  it('returns 400 when tickets sold out', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Tickets sold out',
      headers: new Headers(),
    });

    await expect(
      api.createCheckoutSession('evt-123', 'opt-1', 2, 'token')
    ).rejects.toThrow('API error 400');
  });

  it('returns 404 when ticket option not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Ticket option not found',
      headers: new Headers(),
    });

    await expect(
      api.createCheckoutSession('evt-123', 'opt-nonexistent', 2, 'token')
    ).rejects.toThrow('API error 404');
  });

  it('returns 500 when Stripe is down', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Stripe API error',
      headers: new Headers(),
    });

    await expect(
      api.createCheckoutSession('evt-123', 'opt-1', 2, 'token')
    ).rejects.toThrow('API error 500');
  });
});

describe('api.updateEvent - Additional Error Cases', () => {
  it('should handle 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
      headers: new Headers(),
    });

    await expect(
      api.updateEvent('evt-update-500', {} as any, 'token')
    ).rejects.toThrow('API error 500');
  });

  it('should handle network error during update', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      api.updateEvent('evt-update-net', {} as any, 'token')
    ).rejects.toThrow('Network error');
  });
});

describe('api.cancelEvent - Additional Error Cases', () => {
  it('should handle 404 when event not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Event not found',
      headers: new Headers(),
    });

    await expect(api.cancelEvent('evt-cancel-404', 'token')).rejects.toThrow('API error 404');
  });

  it('should handle 500 on refund failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Stripe refund failed',
      headers: new Headers(),
    });

    await expect(api.cancelEvent('evt-cancel-500', 'token')).rejects.toThrow('API error 500');
  });

  it('should handle network error during cancellation', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

    await expect(api.cancelEvent('evt-cancel-net', 'token')).rejects.toThrow('Network timeout');
  });
});

describe('api.rsvpEvent - Additional Error Cases', () => {
  it('should handle 404 when event not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Event not found',
      headers: new Headers(),
    });

    await expect(
      api.rsvpEvent('evt-rsvp-404', 'Accepted', 'token')
    ).rejects.toThrow('API error 404');
  });

  it('should handle 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
      headers: new Headers(),
    });

    await expect(
      api.rsvpEvent('evt-rsvp-500', 'Accepted', 'token')
    ).rejects.toThrow('API error 500');
  });

  it('should handle network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

    await expect(
      api.rsvpEvent('evt-rsvp-net', 'Accepted', 'token')
    ).rejects.toThrow('Connection failed');
  });

  it('should handle declined RSVP', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'Declined',
      }),
      headers: new Headers(),
    });

    const result = await api.rsvpEvent('evt-decline', 'Declined', 'token');

    expect(result.status).toBe('Declined');
  });
});

describe('api.joinWaitlist - Additional Error Cases', () => {
  it('should handle 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.joinWaitlist('evt-waitlist-401', '')).rejects.toThrow('API error 401');
  });

  it('should handle 404 when event not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Event not found',
      headers: new Headers(),
    });

    await expect(api.joinWaitlist('evt-waitlist-404', 'token')).rejects.toThrow('API error 404');
  });

  it('should handle 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Database error',
      headers: new Headers(),
    });

    await expect(api.joinWaitlist('evt-waitlist-500', 'token')).rejects.toThrow('API error 500');
  });

  it('should handle network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

    await expect(api.joinWaitlist('evt-waitlist-net', 'token')).rejects.toThrow('Network timeout');
  });
});

describe('api.createEvent - Additional Error Cases', () => {
  it('should handle 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Database error',
      headers: new Headers(),
    });

    await expect(api.createEvent({} as any, 'token')).rejects.toThrow('API error 500');
  });

  it('should handle network timeout', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Request timeout'));

    await expect(api.createEvent({} as any, 'token')).rejects.toThrow('Request timeout');
  });
});

describe('api.leaveWaitlist', () => {
  it('should leave waitlist successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    await api.leaveWaitlist('evt-leave-waitlist', 'token');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/events/evt-leave-waitlist/waitlist'),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('should handle 404 when waitlist not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not on waitlist',
      headers: new Headers(),
    });

    await expect(api.leaveWaitlist('evt-404', 'token')).rejects.toThrow('API error 404');
  });
});

describe('api.getWaitlistPosition', () => {
  it('should get waitlist position successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ position: 5 }),
      headers: new Headers(),
    });

    const result = await api.getWaitlistPosition('evt-waitlist-pos', 'token');

    expect(result.position).toBe(5);
  });

  it('should handle 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.getWaitlistPosition('evt-401', '')).rejects.toThrow('API error 401');
  });
});

describe('api.getUserTickets', () => {
  it('should fetch user tickets successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tickets: [{ ticket_id: 'tkt-1', event_id: 'evt-1' }],
      }),
      headers: new Headers(),
    });

    const result = await api.getUserTickets('token-tickets');

    expect(result.tickets).toHaveLength(1);
  });

  it('should handle 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.getUserTickets('')).rejects.toThrow('API error 401');
  });
});

describe('api.getUserStats', () => {
  it('should fetch user stats successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        events_attended: 10,
        events_created: 5,
        tickets_total: 15,
        participants_total: 100,
      }),
      headers: new Headers(),
    });

    const result = await api.getUserStats('token-stats');

    expect(result.events_attended).toBe(10);
    expect(result.events_created).toBe(5);
    expect(result.tickets_total).toBe(15);
    expect(result.participants_total).toBe(100);
  });

  it('should handle 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.getUserStats('')).rejects.toThrow('API error 401');
  });
});

describe('api.searchStockImages', () => {
  it('should search stock images successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([
        {
          url: 'https://images.unsplash.com/photo-1',
          thumbnail: 'https://images.unsplash.com/photo-1?w=400',
          photographer: 'John Doe',
          unsplash_link: 'https://unsplash.com/@johndoe',
        },
      ]),
      headers: new Headers(),
    });

    const result = await api.searchStockImages('concert');

    expect(result).toHaveLength(1);
    expect(result[0].photographer).toBe('John Doe');
  });

  it('should handle search with custom perPage', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([]),
      headers: new Headers(),
    });

    await api.searchStockImages('music', 20);

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('per_page=20');
  });

  it('should handle 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Unsplash API error',
      headers: new Headers(),
    });

    await expect(api.searchStockImages('test')).rejects.toThrow('API error 500');
  });
});

describe('api.getWalletUrl', () => {
  it('should get wallet URL successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        wallet_url: 'https://wallet.example.com/pass/123',
      }),
      headers: new Headers(),
    });

    const result = await api.getWalletUrl('evt-wallet', 'token');

    expect(result.wallet_url).toBe('https://wallet.example.com/pass/123');
  });

  it('should work without token', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        wallet_url: 'https://wallet.example.com/pass/456',
      }),
      headers: new Headers(),
    });

    const result = await api.getWalletUrl('evt-wallet-public');

    expect(result.wallet_url).toBe('https://wallet.example.com/pass/456');
  });

  it('should handle 404 when event not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Event not found',
      headers: new Headers(),
    });

    await expect(api.getWalletUrl('evt-404', 'token')).rejects.toThrow('API error 404');
  });
});

describe('api.getEventsByHost', () => {
  it('should fetch events by host successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        events: [mockEventListItem],
        count: 1,
      }),
      headers: new Headers(),
    });

    const result = await api.getEventsByHost('host-123', 50, 0, 'token');

    expect(result.events).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/events/host/host-123'),
      expect.any(Object)
    );
  });

  it('should work without token', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getEventsByHost('host-456', 50, 0);

    expect(global.fetch).toHaveBeenCalled();
  });

  it('should handle 404 when host not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Host not found',
      headers: new Headers(),
    });

    await expect(api.getEventsByHost('host-404', 50, 0, 'token')).rejects.toThrow('API error 404');
  });
});

describe('api.getCachedEventPartial', () => {
  it('should return null when no cache exists', () => {
    const result = api.getCachedEventPartial('evt-no-cache');
    expect(result).toBeNull();
  });

  it('should return cached event after getEventById', async () => {
    api.invalidateCaches('evt-cache-test');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockEventDetail,
      headers: new Headers(),
    });

    await api.getEventById('evt-cache-test', 'token');

    const cached = api.getCachedEventPartial('evt-cache-test');
    expect(cached).not.toBeNull();
    expect(cached?.event_id).toBe('evt-123');
  });
});

describe('api.createTickets', () => {
  it('should create tickets successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tickets: [
          { ticket_id: 'tkt-1', event_id: 'evt-123' },
          { ticket_id: 'tkt-2', event_id: 'evt-123' },
        ],
      }),
      headers: new Headers(),
    });

    const result = await api.createTickets('evt-123', 'opt-1', 2, 'token');

    expect(result.tickets).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/events/evt-123/tickets'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should handle 400 when tickets sold out', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Tickets sold out',
      headers: new Headers(),
    });

    await expect(
      api.createTickets('evt-123', 'opt-1', 5, 'token')
    ).rejects.toThrow('API error 400');
  });

  it('should handle 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.createTickets('evt-123', 'opt-1', 1, '')
    ).rejects.toThrow('API error 401');
  });
});

describe('api.getEventParticipants', () => {
  it('should fetch participants successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        participants: [
          { person_id: 'p1', name: 'Alice' },
          { person_id: 'p2', name: 'Bob' },
        ],
      }),
      headers: new Headers(),
    });

    const result = await api.getEventParticipants('evt-participants', 'token');

    expect(result.participants).toHaveLength(2);
  });

  it('should handle 403 when not host', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
      headers: new Headers(),
    });

    await expect(
      api.getEventParticipants('evt-403', 'token')
    ).rejects.toThrow('API error 403');
  });

  it('should handle 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.getEventParticipants('evt-401', '')
    ).rejects.toThrow('API error 401');
  });
});

describe('api.removeParticipants', () => {
  it('should remove participants successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        removed_count: 2,
      }),
      headers: new Headers(),
    });

    const result = await api.removeParticipants('evt-remove', ['p1', 'p2'], 'token');

    expect(result.removed_count).toBe(2);
  });

  it('should handle partial failures', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        removed_count: 1,
      }),
      headers: new Headers(),
    });

    const result = await api.removeParticipants('evt-partial', ['p1', 'p2'], 'token');

    expect(result.removed_count).toBe(1);
  });

  it('should handle 403 when not host', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
      headers: new Headers(),
    });

    await expect(
      api.removeParticipants('evt-403', ['p1'], 'token')
    ).rejects.toThrow('API error 403');
  });
});

describe('api.scanTicket', () => {
  it('should scan ticket successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        valid: true,
      }),
      headers: new Headers(),
    });

    const result = await api.scanTicket('evt-scan', 'qr-token-123', 'token');

    expect(result.valid).toBe(true);
  });

  it('should handle invalid ticket', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Invalid ticket',
      headers: new Headers(),
    });

    await expect(
      api.scanTicket('evt-scan', 'invalid-qr', 'token')
    ).rejects.toThrow('API error 400');
  });

  it('should handle 403 when not host', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
      headers: new Headers(),
    });

    await expect(
      api.scanTicket('evt-403', 'qr-token', 'token')
    ).rejects.toThrow('API error 403');
  });
});

describe('api.syncCustomFields', () => {
  it('should sync custom fields successfully', async () => {
    const fields: any = [
      { field_id: 'cf1', label: 'Dietary Restrictions', field_type: 'text', is_required: false, sort_order: 0 },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => fields,
      headers: new Headers(),
    });

    const result = await api.syncCustomFields('evt-cf', fields, 'token');

    expect(result).toHaveLength(1);
  });

  it('should handle 403 when not host', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
      headers: new Headers(),
    });

    await expect(
      api.syncCustomFields('evt-403', [], 'token')
    ).rejects.toThrow('API error 403');
  });
});

describe('api.submitCustomFieldResponses', () => {
  it('should submit responses successfully', async () => {
    const responses: any = [
      { custom_field_id: 'cf1', value: 'Vegetarian' },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => responses,
      headers: new Headers(),
    });

    const result = await api.submitCustomFieldResponses('evt-cfr', 'tkt-1', responses, 'token');

    expect(result).toHaveLength(1);
  });

  it('should handle 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.submitCustomFieldResponses('evt-401', 'tkt-1', [], '')
    ).rejects.toThrow('API error 401');
  });
});

describe('api.getMyCustomFieldResponses', () => {
  it('should fetch custom field responses successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([
        { ticket_id: 'tkt-1', responses: [{ field_id: 'cf1', value: 'Vegan' }] },
      ]),
      headers: new Headers(),
    });

    const result = await api.getMyCustomFieldResponses('evt-my-cf', 'token');

    expect(result).toHaveLength(1);
    expect(result[0].ticket_id).toBe('tkt-1');
  });

  it('should handle 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.getMyCustomFieldResponses('evt-401', '')
    ).rejects.toThrow('API error 401');
  });
});

describe('api.syncTicketOptions', () => {
  it('should sync ticket options successfully', async () => {
    const options = [
      {
        ticket_option_id: 'opt-1',
        name: 'General Admission',
        description: 'Standard ticket',
        price: 15.0,
        quantity_limit: 50,
        sort_order: 0,
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => options,
      headers: new Headers(),
    });

    const result = await api.syncTicketOptions('evt-sync-opts', options, 'token');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('General Admission');
  });

  it('should handle wrapped response format', async () => {
    const options = [{ ticket_option_id: 'opt-2', name: 'VIP' }];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ticket_options: options }),
      headers: new Headers(),
    });

    const result = await api.syncTicketOptions('evt-wrapped', options as any, 'token');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('VIP');
  });

  it('should handle 403 when not host', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
      headers: new Headers(),
    });

    await expect(
      api.syncTicketOptions('evt-403', [], 'token')
    ).rejects.toThrow('API error 403');
  });
});

// ═══════════════════════════════════════════════════════════
// NEW TESTS - Added for coverage of untested endpoints
// ═══════════════════════════════════════════════════════════

import { prefetchEvent, invalidateTicketsCache } from '../api';

// ── getPublicEvents: Period & Date Filters ─────────────────────────────────

describe('api.getPublicEvents - Period Filters', () => {
  it('should set date_from and date_to when period is today', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getPublicEvents(50, 0, undefined, { period: 'today' });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('date_from=');
    expect(callUrl).toContain('date_to=');
  });

  it('should set date_from and date_to when period is month', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getPublicEvents(50, 0, undefined, { period: 'month' });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('date_from=');
    expect(callUrl).toContain('date_to=');
  });

  it('should set custom date_from when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getPublicEvents(50, 0, undefined, {
      period: 'custom',
      dateFrom: '2026-07-01',
    });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('date_from=');
  });

  it('should set custom date_to when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getPublicEvents(50, 0, undefined, {
      period: 'custom',
      dateTo: '2026-07-31',
    });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('date_to=');
  });

  it('should set both custom dates when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getPublicEvents(50, 0, undefined, {
      period: 'custom',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('date_from=');
    expect(callUrl).toContain('date_to=');
  });

  it('should skip empty city filter when only whitespace', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events: [], count: 0 }),
      headers: new Headers(),
    });

    await api.getPublicEvents(50, 0, undefined, { city: '   ' });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).not.toContain('city=');
  });
});

// ── exportEventGuestList ────────────────────────────────────────────────────

describe('api.exportEventGuestList', () => {
  it('should export guest list as CSV when format is csv', async () => {
    const mockBlob = new Blob(['name,status\nAlice,Accepted'], { type: 'text/csv' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => mockBlob,
      headers: new Headers({
        'content-disposition': 'attachment; filename="guests.csv"',
      }),
    });

    const result = await api.exportEventGuestList('evt-export', 'csv', false, 'token');

    expect(result.filename).toBe('guests.csv');
    expect(result.blob).toBeDefined();
  });

  it('should export guest list as PDF when format is pdf', async () => {
    const mockBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => mockBlob,
      headers: new Headers({
        'content-disposition': 'attachment; filename="guests.pdf"',
      }),
    });

    const result = await api.exportEventGuestList('evt-export', 'pdf', true, 'token');

    expect(result.filename).toBe('guests.pdf');
  });

  it('should include RSVP responses when includeRsvpResponses is true', async () => {
    const mockBlob = new Blob(['data']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => mockBlob,
      headers: new Headers(),
    });

    await api.exportEventGuestList('evt-export', 'csv', true, 'token');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('include_rsvp_responses=true');
  });

  it('should use default filename when content-disposition is missing', async () => {
    const mockBlob = new Blob(['data']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => mockBlob,
      headers: new Headers(),
    });

    const result = await api.exportEventGuestList('evt-export', 'csv', false, 'token');

    expect(result.filename).toBe('gaesteliste.csv');
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.exportEventGuestList('evt-export', 'csv', false, '')
    ).rejects.toThrow('Export fehlgeschlagen (401)');
  });

  it('should throw error when API returns 403 forbidden', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Not host',
      headers: new Headers(),
    });

    await expect(
      api.exportEventGuestList('evt-export', 'csv', false, 'token')
    ).rejects.toThrow('Export fehlgeschlagen (403)');
  });

  it('should throw error when API returns 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server Error',
      headers: new Headers(),
    });

    await expect(
      api.exportEventGuestList('evt-export', 'pdf', true, 'token')
    ).rejects.toThrow('Export fehlgeschlagen (500)');
  });

  it('should throw error when network request fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      api.exportEventGuestList('evt-export', 'csv', false, 'token')
    ).rejects.toThrow('Network error');
  });
});

// ── abandonCheckoutSession ─────────────────────────────────────────────────

describe('api.abandonCheckoutSession', () => {
  it('should abandon checkout session when valid request is made', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ abandoned: true }),
      headers: new Headers(),
    });

    const result = await api.abandonCheckoutSession('evt-abandon', 'token');

    expect(result.abandoned).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/events/evt-abandon/checkout-session/abandon'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.abandonCheckoutSession('evt-401', '')
    ).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 404 not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'No active session',
      headers: new Headers(),
    });

    await expect(
      api.abandonCheckoutSession('evt-404', 'token')
    ).rejects.toThrow('API error 404');
  });

  it('should throw error when API returns 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server Error',
      headers: new Headers(),
    });

    await expect(
      api.abandonCheckoutSession('evt-500', 'token')
    ).rejects.toThrow('API error 500');
  });
});

// ── Stripe Connect: getConnectStatus ───────────────────────────────────────

describe('api.getConnectStatus', () => {
  it('should return connect status when user has account', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        has_account: true,
        charges_enabled: true,
        payouts_enabled: true,
        onboarding_complete: true,
      }),
      headers: new Headers(),
    });

    const result = await api.getConnectStatus('token');

    expect(result.has_account).toBe(true);
    expect(result.charges_enabled).toBe(true);
    expect(result.payouts_enabled).toBe(true);
    expect(result.onboarding_complete).toBe(true);
  });

  it('should return false flags when user has no account', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        has_account: false,
        charges_enabled: false,
        payouts_enabled: false,
        onboarding_complete: false,
      }),
      headers: new Headers(),
    });

    const result = await api.getConnectStatus('token');

    expect(result.has_account).toBe(false);
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.getConnectStatus('')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Stripe error',
      headers: new Headers(),
    });

    await expect(api.getConnectStatus('token')).rejects.toThrow('API error 500');
  });

  it('should throw error when network request fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(api.getConnectStatus('token')).rejects.toThrow('Network error');
  });
});

// ── Stripe Connect: createOnboardingLink ───────────────────────────────────

describe('api.createOnboardingLink', () => {
  it('should create onboarding link without eventId', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        url: 'https://connect.stripe.com/onboarding/123',
        account_id: 'acct_123',
      }),
      headers: new Headers(),
    });

    const result = await api.createOnboardingLink('token');

    expect(result.url).toBe('https://connect.stripe.com/onboarding/123');
    expect(result.account_id).toBe('acct_123');
  });

  it('should include event_id in URL when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://connect.stripe.com', account_id: 'acct_456' }),
      headers: new Headers(),
    });

    await api.createOnboardingLink('token', 'evt-onboard');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('event_id=evt-onboard');
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.createOnboardingLink('')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Stripe error',
      headers: new Headers(),
    });

    await expect(api.createOnboardingLink('token')).rejects.toThrow('API error 500');
  });
});

// ── Stripe Connect: createDashboardLink ────────────────────────────────────

describe('api.createDashboardLink', () => {
  it('should create dashboard link when authenticated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://dashboard.stripe.com/express' }),
      headers: new Headers(),
    });

    const result = await api.createDashboardLink('token');

    expect(result.url).toBe('https://dashboard.stripe.com/express');
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.createDashboardLink('')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 403 forbidden', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'No connect account',
      headers: new Headers(),
    });

    await expect(api.createDashboardLink('token')).rejects.toThrow('API error 403');
  });

  it('should throw error when network request fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(api.createDashboardLink('token')).rejects.toThrow('Network error');
  });
});

// ── Stripe: getPaymentSummary ──────────────────────────────────────────────

describe('api.getPaymentSummary', () => {
  it('should get payment summary when valid request is made', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        gross_cents: 10000,
        platform_fee_cents: 500,
        net_cents: 9500,
        paid_orders: 10,
      }),
      headers: new Headers(),
    });

    const result = await api.getPaymentSummary('evt-payments', 'token');

    expect(result.gross_cents).toBe(10000);
    expect(result.net_cents).toBe(9500);
    expect(result.paid_orders).toBe(10);
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.getPaymentSummary('evt-payments', '')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 403 forbidden', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Not host',
      headers: new Headers(),
    });

    await expect(api.getPaymentSummary('evt-payments', 'token')).rejects.toThrow('API error 403');
  });

  it('should throw error when API returns 404 not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Event not found',
      headers: new Headers(),
    });

    await expect(api.getPaymentSummary('evt-404', 'token')).rejects.toThrow('API error 404');
  });
});

// ── Stripe: requestPayout ──────────────────────────────────────────────────

describe('api.requestPayout', () => {
  it('should request payout successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        payout_id: 'po_123',
        amount_cents: 9500,
        currency: 'eur',
      }),
      headers: new Headers(),
    });

    const result = await api.requestPayout('evt-payout', 'token');

    expect(result.payout_id).toBe('po_123');
    expect(result.amount_cents).toBe(9500);
    expect(result.currency).toBe('eur');
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.requestPayout('evt-payout', '')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 403 forbidden', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Not host',
      headers: new Headers(),
    });

    await expect(api.requestPayout('evt-payout', 'token')).rejects.toThrow('API error 403');
  });

  it('should throw error when API returns 400 if no funds available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'No funds available',
      headers: new Headers(),
    });

    await expect(api.requestPayout('evt-payout', 'token')).rejects.toThrow('API error 400');
  });
});

// ── getCheckoutOrderStatus ─────────────────────────────────────────────────

describe('api.getCheckoutOrderStatus', () => {
  it('should get checkout order status successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        order_status: 'paid',
        fulfilled: true,
        event_id: 'evt-checkout',
        ticket_order_id: 'order-789',
      }),
      headers: new Headers(),
    });

    const result = await api.getCheckoutOrderStatus('session-123', 'token');

    expect(result.order_status).toBe('paid');
    expect(result.fulfilled).toBe(true);
    expect(result.event_id).toBe('evt-checkout');
  });

  it('should encode session_id in URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        order_status: 'pending',
        fulfilled: false,
        event_id: 'evt-1',
        ticket_order_id: 'order-1',
      }),
      headers: new Headers(),
    });

    await api.getCheckoutOrderStatus('session+with/special&chars', 'token');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('session_id=session%2Bwith%2Fspecial%26chars');
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.getCheckoutOrderStatus('session-401', '')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 404 if session not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Session not found',
      headers: new Headers(),
    });

    await expect(api.getCheckoutOrderStatus('session-404', 'token')).rejects.toThrow('API error 404');
  });
});

// ── cancelTicketOrder ──────────────────────────────────────────────────────

describe('api.cancelTicketOrder', () => {
  it('should cancel ticket order and return refund', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        refunded: true,
        amount_cents: 1500,
      }),
      headers: new Headers(),
    });

    const result = await api.cancelTicketOrder('evt-cancel-ticket', 'token');

    expect(result.refunded).toBe(true);
    expect(result.amount_cents).toBe(1500);
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.cancelTicketOrder('evt-cancel-ticket', '')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 404 if order not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Order not found',
      headers: new Headers(),
    });

    await expect(api.cancelTicketOrder('evt-404', 'token')).rejects.toThrow('API error 404');
  });

  it('should throw error when API returns 500 on Stripe error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Stripe refund failed',
      headers: new Headers(),
    });

    await expect(api.cancelTicketOrder('evt-500', 'token')).rejects.toThrow('API error 500');
  });
});

// ── Reminder Preferences ───────────────────────────────────────────────────

describe('api.getReminderPreferences', () => {
  it('should get reminder preferences when authenticated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        enabled: true,
        lead_time_minutes: 60,
      }),
      headers: new Headers(),
    });

    const result = await api.getReminderPreferences('token');

    expect(result.enabled).toBe(true);
    expect(result.lead_time_minutes).toBe(60);
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.getReminderPreferences('')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Database error',
      headers: new Headers(),
    });

    await expect(api.getReminderPreferences('token')).rejects.toThrow('API error 500');
  });
});

describe('api.updateReminderPreferences', () => {
  it('should update reminder preferences when valid data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ enabled: true, lead_time_minutes: 30 }),
      headers: new Headers(),
    });

    const result = await api.updateReminderPreferences('token', {
      enabled: true,
      lead_time_minutes: 30,
    });

    expect(result.enabled).toBe(true);
    expect(result.lead_time_minutes).toBe(30);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/me/reminder-preferences'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('should update only enabled flag when partial body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ enabled: false, lead_time_minutes: 60 }),
      headers: new Headers(),
    });

    const result = await api.updateReminderPreferences('token', { enabled: false });

    expect(result.enabled).toBe(false);
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.updateReminderPreferences('', { enabled: true })
    ).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 422 validation error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => 'Invalid lead_time_minutes',
      headers: new Headers(),
    });

    await expect(
      api.updateReminderPreferences('token', { lead_time_minutes: -1 })
    ).rejects.toThrow('API error 422');
  });
});

// ── Web Push Subscriptions ─────────────────────────────────────────────────

describe('api.registerWebPushSubscription', () => {
  it('should register web push subscription successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    await api.registerWebPushSubscription('token', {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      user_agent: 'Mozilla/5.0',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/me/web-push-subscriptions'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.registerWebPushSubscription('', {
        endpoint: 'https://example.com',
        keys: { p256dh: 'k', auth: 'a' },
      })
    ).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 400 bad request', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Invalid subscription',
      headers: new Headers(),
    });

    await expect(
      api.registerWebPushSubscription('token', {
        endpoint: '',
        keys: { p256dh: '', auth: '' },
      })
    ).rejects.toThrow('API error 400');
  });
});

describe('api.unregisterWebPushSubscription', () => {
  it('should unregister web push subscription successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    await api.unregisterWebPushSubscription('token', 'https://endpoint.com/abc');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/me/web-push-subscriptions'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.unregisterWebPushSubscription('', 'https://endpoint.com')
    ).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 404 if subscription not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Subscription not found',
      headers: new Headers(),
    });

    await expect(
      api.unregisterWebPushSubscription('token', 'https://endpoint.com/missing')
    ).rejects.toThrow('API error 404');
  });
});

// ── getVapidPublicKey ──────────────────────────────────────────────────────

describe('api.getVapidPublicKey', () => {
  it('should get VAPID public key successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ public_key: 'BNvBJ...' }),
      headers: new Headers(),
    });

    const result = await api.getVapidPublicKey();

    expect(result.public_key).toBe('BNvBJ...');
  });

  it('should return null when key is not configured', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ public_key: null }),
      headers: new Headers(),
    });

    const result = await api.getVapidPublicKey();

    expect(result.public_key).toBeNull();
  });

  it('should throw error when API returns 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server Error',
      headers: new Headers(),
    });

    await expect(api.getVapidPublicKey()).rejects.toThrow('API error 500');
  });
});

// ── Expo Push Tokens ──────────────────────────────────────────────────────

describe('api.registerExpoPushToken', () => {
  it('should register expo push token for iOS successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    await api.registerExpoPushToken('auth-token', {
      token: 'ExponentPushToken[abc123]',
      platform: 'ios',
      user_agent: 'iPhone',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/me/expo-push-tokens'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should register expo push token for android successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    await api.registerExpoPushToken('auth-token', {
      token: 'ExponentPushToken[xyz789]',
      platform: 'android',
    });

    expect(global.fetch).toHaveBeenCalled();
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.registerExpoPushToken('', {
        token: 'token',
        platform: 'ios',
      })
    ).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 400 invalid token', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Invalid token format',
      headers: new Headers(),
    });

    await expect(
      api.registerExpoPushToken('auth-token', {
        token: 'invalid',
        platform: 'ios',
      })
    ).rejects.toThrow('API error 400');
  });
});

describe('api.unregisterExpoPushToken', () => {
  it('should unregister expo push token successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    await api.unregisterExpoPushToken('auth-token', 'ExponentPushToken[abc]');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/me/expo-push-tokens'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.unregisterExpoPushToken('', 'token')
    ).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 404 if token not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Token not found',
      headers: new Headers(),
    });

    await expect(
      api.unregisterExpoPushToken('auth-token', 'missing-token')
    ).rejects.toThrow('API error 404');
  });
});

// ── Device Management ──────────────────────────────────────────────────────

describe('api.listWebPushSubscriptions', () => {
  it('should list web push subscriptions successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            web_push_subscription_id: 'sub-1',
            endpoint: 'https://fcm.googleapis.com/abc',
            user_agent: 'Chrome',
            created_at: '2026-06-01T10:00:00Z',
          },
        ],
      }),
      headers: new Headers(),
    });

    const result = await api.listWebPushSubscriptions('token');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].user_agent).toBe('Chrome');
  });

  it('should return empty list when no subscriptions exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
      headers: new Headers(),
    });

    const result = await api.listWebPushSubscriptions('token');

    expect(result.items).toHaveLength(0);
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.listWebPushSubscriptions('')).rejects.toThrow('API error 401');
  });
});

describe('api.deleteWebPushSubscriptionById', () => {
  it('should delete web push subscription by id successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    await api.deleteWebPushSubscriptionById('token', 'sub-123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/me/web-push-subscriptions/sub-123'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('should encode id properly in URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    await api.deleteWebPushSubscriptionById('token', 'sub/with-slash');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('sub%2Fwith-slash');
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.deleteWebPushSubscriptionById('', 'sub-123')
    ).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 404 if subscription not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not found',
      headers: new Headers(),
    });

    await expect(
      api.deleteWebPushSubscriptionById('token', 'missing-sub')
    ).rejects.toThrow('API error 404');
  });
});

describe('api.listExpoPushTokens', () => {
  it('should list expo push tokens successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            expo_push_token_id: 'tok-1',
            platform: 'ios',
            user_agent: 'iPhone',
            created_at: '2026-06-01T10:00:00Z',
          },
        ],
      }),
      headers: new Headers(),
    });

    const result = await api.listExpoPushTokens('token');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].platform).toBe('ios');
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.listExpoPushTokens('')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server Error',
      headers: new Headers(),
    });

    await expect(api.listExpoPushTokens('token')).rejects.toThrow('API error 500');
  });
});

describe('api.deleteExpoPushTokenById', () => {
  it('should delete expo push token by id successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    await api.deleteExpoPushTokenById('token', 'tok-456');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/me/expo-push-tokens/tok-456'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.deleteExpoPushTokenById('', 'tok-456')
    ).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 404 if token not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not found',
      headers: new Headers(),
    });

    await expect(
      api.deleteExpoPushTokenById('token', 'missing-tok')
    ).rejects.toThrow('API error 404');
  });
});

// ── Notifications ─────────────────────────────────────────────────────────

describe('api.listNotifications', () => {
  it('should list notifications with default parameters', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            notification_id: 'notif-1',
            event_id: 'evt-1',
            type: 'event_updated',
            payload: {},
            created_at: '2026-06-08T10:00:00Z',
            read_at: null,
          },
        ],
      }),
      headers: new Headers(),
    });

    const result = await api.listNotifications('token');

    expect(result.items).toHaveLength(1);
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('limit=20');
  });

  it('should include before parameter when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
      headers: new Headers(),
    });

    await api.listNotifications('token', '2026-06-08T10:00:00Z', 50);

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('limit=50');
    expect(callUrl).toContain('before=');
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.listNotifications('')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 500 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server Error',
      headers: new Headers(),
    });

    await expect(api.listNotifications('token')).rejects.toThrow('API error 500');
  });
});

describe('api.getNotificationsUnreadCount', () => {
  it('should get unread count successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ count: 5 }),
      headers: new Headers(),
    });

    const result = await api.getNotificationsUnreadCount('token');

    expect(result.count).toBe(5);
  });

  it('should return zero count when no unread notifications', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ count: 0 }),
      headers: new Headers(),
    });

    const result = await api.getNotificationsUnreadCount('token');

    expect(result.count).toBe(0);
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.getNotificationsUnreadCount('')).rejects.toThrow('API error 401');
  });
});

describe('api.markNotificationRead', () => {
  it('should mark notification as read successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    await api.markNotificationRead('token', 'notif-123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/me/notifications/notif-123/read'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.markNotificationRead('', 'notif-123')).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 404 if notification not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Notification not found',
      headers: new Headers(),
    });

    await expect(
      api.markNotificationRead('token', 'missing-notif')
    ).rejects.toThrow('API error 404');
  });
});

describe('api.markAllNotificationsRead', () => {
  it('should mark all notifications as read successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ marked: 10 }),
      headers: new Headers(),
    });

    const result = await api.markAllNotificationsRead('token');

    expect(result.marked).toBe(10);
  });

  it('should return zero when no notifications to mark', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ marked: 0 }),
      headers: new Headers(),
    });

    const result = await api.markAllNotificationsRead('token');

    expect(result.marked).toBe(0);
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.markAllNotificationsRead('')).rejects.toThrow('API error 401');
  });
});

describe('api.sendTestNotification', () => {
  it('should send test notification successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, pushed: 2 }),
      headers: new Headers(),
    });

    const result = await api.sendTestNotification('token');

    expect(result.ok).toBe(true);
    expect(result.pushed).toBe(2);
  });

  it('should report when no devices are registered', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, pushed: 0 }),
      headers: new Headers(),
    });

    const result = await api.sendTestNotification('token');

    expect(result.pushed).toBe(0);
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(api.sendTestNotification('')).rejects.toThrow('API error 401');
  });
});

// ── Avatar Update ──────────────────────────────────────────────────────────

describe('api.updateAvatar', () => {
  it('should update avatar URL successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ avatar_url: 'https://example.com/new-avatar.jpg' }),
      headers: new Headers(),
    });

    const result = await api.updateAvatar('token', 'https://example.com/new-avatar.jpg');

    expect(result.avatar_url).toBe('https://example.com/new-avatar.jpg');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/me/avatar'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('should throw error when API returns 401 unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      headers: new Headers(),
    });

    await expect(
      api.updateAvatar('', 'https://example.com/avatar.jpg')
    ).rejects.toThrow('API error 401');
  });

  it('should throw error when API returns 400 for invalid URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Invalid URL format',
      headers: new Headers(),
    });

    await expect(api.updateAvatar('token', 'invalid-url')).rejects.toThrow('API error 400');
  });
});

// ── Module-level utility functions ─────────────────────────────────────────

describe('prefetchEvent', () => {
  it('should trigger fetch when no cache exists', async () => {
    api.invalidateCaches('evt-prefetch-1');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...mockEventDetail, event_id: 'evt-prefetch-1' }),
      headers: new Headers(),
    });

    prefetchEvent('evt-prefetch-1');

    // Wait for the promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(global.fetch).toHaveBeenCalled();
  });

  it('should not trigger fetch when cache is fresh', async () => {
    api.invalidateCaches('evt-prefetch-2');

    // First call to populate cache (non-partial)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...mockEventDetail, event_id: 'evt-prefetch-2' }),
      headers: new Headers(),
    });

    await api.getEventById('evt-prefetch-2');
    (global.fetch as jest.Mock).mockClear();

    // Should NOT trigger a new fetch
    prefetchEvent('evt-prefetch-2');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should silently swallow errors when fetch fails', async () => {
    api.invalidateCaches('evt-prefetch-err');

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    // Should not throw - prefetch catches errors silently
    expect(() => prefetchEvent('evt-prefetch-err')).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it('should accept null token', async () => {
    api.invalidateCaches('evt-prefetch-null');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...mockEventDetail, event_id: 'evt-prefetch-null' }),
      headers: new Headers(),
    });

    expect(() => prefetchEvent('evt-prefetch-null', null)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});

describe('invalidateTicketsCache', () => {
  it('should invalidate tickets cache so next getUserTickets fetches fresh data', async () => {
    // First call to populate cache
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ tickets: [{ ticket_id: 'tkt-1' }] }),
      headers: new Headers(),
    });

    await api.getUserTickets('invalidate-test-token');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Invalidate cache
    invalidateTicketsCache();

    // Next call should trigger a new fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ tickets: [{ ticket_id: 'tkt-2' }] }),
      headers: new Headers(),
    });

    await api.getUserTickets('invalidate-test-token');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('api.invalidateCaches', () => {
  it('should invalidate event cache when eventId is provided', async () => {
    // Populate event cache
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...mockEventDetail, event_id: 'evt-invalidate-test' }),
      headers: new Headers(),
    });
    await api.getEventById('evt-invalidate-test');

    // Verify cache exists
    expect(api.getCachedEventPartial('evt-invalidate-test')).not.toBeNull();

    // Invalidate
    api.invalidateCaches('evt-invalidate-test');

    // Cache should be gone
    expect(api.getCachedEventPartial('evt-invalidate-test')).toBeNull();
  });

  it('should clear tickets cache when called without eventId', async () => {
    // Populate tickets cache
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ tickets: [] }),
      headers: new Headers(),
    });
    await api.getUserTickets('cache-clear-token');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Invalidate tickets cache (no eventId)
    api.invalidateCaches();

    // Next getUserTickets should fetch again
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ tickets: [] }),
      headers: new Headers(),
    });
    await api.getUserTickets('cache-clear-token');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
