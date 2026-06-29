/**
 * Basic tests for types/events
 * Tests type guards and helper functions
 */

import type { EventListItem, TicketOption, EventLocation } from '../events';

describe('events types', () => {
  describe('TicketOption', () => {
    it('should accept valid ticket option', () => {
      const ticket: TicketOption = {
        name: 'Standard Ticket',
        price: 10.50,
        sort_order: 1,
      };

      expect(ticket.name).toBe('Standard Ticket');
      expect(ticket.price).toBe(10.50);
      expect(ticket.sort_order).toBe(1);
    });

    it('should accept ticket option with all fields', () => {
      const ticket: TicketOption = {
        ticket_option_id: '123',
        name: 'VIP Ticket',
        description: 'Includes backstage access',
        price: 50.00,
        quantity_limit: 100,
        sort_order: 0,
      };

      expect(ticket.ticket_option_id).toBe('123');
      expect(ticket.description).toBe('Includes backstage access');
      expect(ticket.quantity_limit).toBe(100);
    });
  });

  describe('EventLocation', () => {
    it('should accept valid location', () => {
      const location: EventLocation = {
        location_id: 'loc-123',
        city: 'Berlin',
        street: 'Alexanderplatz',
        house_number: '1',
        postal_code: '10178',
        country: 'Germany',
      };

      expect(location.location_id).toBe('loc-123');
      expect(location.city).toBe('Berlin');
    });

    it('should accept location with coordinates', () => {
      const location: EventLocation = {
        location_id: 'loc-456',
        latitude: 52.5200,
        longitude: 13.4050,
      };

      expect(location.latitude).toBe(52.5200);
      expect(location.longitude).toBe(13.4050);
    });
  });

  describe('EventListItem', () => {
    it('should accept valid event', () => {
      const event: EventListItem = {
        event_id: 'evt-123',
        title: 'Test Event',
        starts_at: '2026-06-10T20:00:00Z',
        is_public: true,
        is_free: false,
        status: 'published',
        participant_count: 10,
      };

      expect(event.event_id).toBe('evt-123');
      expect(event.title).toBe('Test Event');
      expect(event.participant_count).toBe(10);
    });

    it('should accept event with optional fields', () => {
      const event: EventListItem = {
        event_id: 'evt-456',
        title: 'Premium Event',
        starts_at: '2026-06-15T18:00:00Z',
        ends_at: '2026-06-15T23:00:00Z',
        description: 'A premium event',
        category: 'music',
        max_capacity: 500,
        is_public: true,
        is_free: false,
        status: 'published',
        participant_count: 250,
        is_host: true,
        is_cancelled: false,
        image_url: 'https://example.com/image.jpg',
        gradient_id: 0,
      };

      expect(event.description).toBe('A premium event');
      expect(event.max_capacity).toBe(500);
      expect(event.is_host).toBe(true);
    });
  });
});
