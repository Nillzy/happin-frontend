/**
 * Basic tests for types/notifications
 */

import type {
  NotificationType,
  NotificationPayload,
  NotificationItem,
  NotificationListResponse,
} from '../notifications';

describe('notifications types', () => {
  describe('NotificationType', () => {
    it('should accept all valid notification types', () => {
      const types: NotificationType[] = [
        'event_updated',
        'event_cancelled',
        'new_participant',
        'participant_cancelled',
      ];

      types.forEach((type) => {
        expect(type).toBeDefined();
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('NotificationPayload', () => {
    it('should accept payload with event_title', () => {
      const payload: NotificationPayload = {
        event_title: 'My Event',
      };
      expect(payload.event_title).toBe('My Event');
    });

    it('should accept payload with changed_fields', () => {
      const payload: NotificationPayload = {
        changed_fields: ['title', 'starts_at'],
      };
      expect(payload.changed_fields).toEqual(['title', 'starts_at']);
    });

    it('should accept payload with participant_name', () => {
      const payload: NotificationPayload = {
        participant_name: 'John Doe',
      };
      expect(payload.participant_name).toBe('John Doe');
    });

    it('should accept empty payload', () => {
      const payload: NotificationPayload = {};
      expect(payload).toEqual({});
    });

    it('should accept payload with custom fields', () => {
      const payload: NotificationPayload = {
        event_title: 'Event',
        custom_field: 'custom value',
      };
      expect(payload.custom_field).toBe('custom value');
    });
  });

  describe('NotificationItem', () => {
    it('should accept valid notification item', () => {
      const item: NotificationItem = {
        notification_id: 'notif-123',
        event_id: 'evt-456',
        type: 'event_updated',
        payload: { event_title: 'Test Event' },
        created_at: '2026-06-08T10:00:00Z',
        read_at: null,
      };

      expect(item.notification_id).toBe('notif-123');
      expect(item.event_id).toBe('evt-456');
      expect(item.type).toBe('event_updated');
      expect(item.read_at).toBeNull();
    });

    it('should accept notification with null event_id', () => {
      const item: NotificationItem = {
        notification_id: 'notif-789',
        event_id: null,
        type: 'event_cancelled',
        payload: {},
        created_at: '2026-06-08T10:00:00Z',
        read_at: '2026-06-08T11:00:00Z',
      };

      expect(item.event_id).toBeNull();
      expect(item.read_at).toBe('2026-06-08T11:00:00Z');
    });

    it('should accept all notification types', () => {
      const types: NotificationType[] = [
        'event_updated',
        'event_cancelled',
        'new_participant',
        'participant_cancelled',
      ];

      types.forEach((type) => {
        const item: NotificationItem = {
          notification_id: `notif-${type}`,
          event_id: 'evt-123',
          type,
          payload: {},
          created_at: '2026-06-08T10:00:00Z',
          read_at: null,
        };
        expect(item.type).toBe(type);
      });
    });
  });

  describe('NotificationListResponse', () => {
    it('should accept empty list', () => {
      const response: NotificationListResponse = {
        items: [],
      };
      expect(response.items).toHaveLength(0);
    });

    it('should accept list with multiple notifications', () => {
      const response: NotificationListResponse = {
        items: [
          {
            notification_id: 'notif-1',
            event_id: 'evt-1',
            type: 'event_updated',
            payload: {},
            created_at: '2026-06-08T10:00:00Z',
            read_at: null,
          },
          {
            notification_id: 'notif-2',
            event_id: 'evt-2',
            type: 'event_cancelled',
            payload: {},
            created_at: '2026-06-08T11:00:00Z',
            read_at: null,
          },
        ],
      };

      expect(response.items).toHaveLength(2);
      expect(response.items[0].type).toBe('event_updated');
      expect(response.items[1].type).toBe('event_cancelled');
    });
  });
});
