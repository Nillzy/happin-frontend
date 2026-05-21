/**
 * Reminder-Settings (Anforderung K4).
 *
 * `enabled`: Master-Toggle. Wenn false werden keine Reminders geplant/gesendet.
 * `leadTimeMinutes`: Vorlaufzeit vor Eventbeginn (Default 60).
 */
export type ReminderSettings = {
    enabled: boolean;
    leadTimeMinutes: number;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
    enabled: false,
    leadTimeMinutes: 60,
};

export const REMINDER_LEAD_TIME_PRESETS: ReadonlyArray<{ label: string; minutes: number }> = [
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '1 h', minutes: 60 },
    { label: '2 h', minutes: 120 },
    { label: '1 Tag', minutes: 1440 },
];
