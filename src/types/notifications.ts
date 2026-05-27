/**
 * Types für In-App-Benachrichtigungen.
 */

export type NotificationType = 'event_updated' | 'event_cancelled' | 'new_participant' | 'participant_cancelled';

export interface NotificationPayload {
    event_title?: string;
    changed_fields?: string[];
    participant_name?: string;
    [k: string]: unknown;
}

export interface NotificationItem {
    notification_id: string;
    event_id: string | null;
    type: NotificationType;
    payload: NotificationPayload;
    created_at: string;
    read_at: string | null;
}

export interface NotificationListResponse {
    items: NotificationItem[];
}
