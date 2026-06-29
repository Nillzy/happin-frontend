/**
 * Basic tests for types/reminders
 * Tests default values and presets
 */

import {
  DEFAULT_REMINDER_SETTINGS,
  REMINDER_LEAD_TIME_PRESETS,
  type ReminderSettings,
} from '../reminders';

describe('reminders types', () => {
  describe('DEFAULT_REMINDER_SETTINGS', () => {
    it('should have enabled set to false by default', () => {
      expect(DEFAULT_REMINDER_SETTINGS.enabled).toBe(false);
    });

    it('should have leadTimeMinutes set to 60 (1 hour) by default', () => {
      expect(DEFAULT_REMINDER_SETTINGS.leadTimeMinutes).toBe(60);
    });

    it('should be a valid ReminderSettings object', () => {
      expect(DEFAULT_REMINDER_SETTINGS).toHaveProperty('enabled');
      expect(DEFAULT_REMINDER_SETTINGS).toHaveProperty('leadTimeMinutes');
    });

    it('should have correct types', () => {
      expect(typeof DEFAULT_REMINDER_SETTINGS.enabled).toBe('boolean');
      expect(typeof DEFAULT_REMINDER_SETTINGS.leadTimeMinutes).toBe('number');
    });
  });

  describe('REMINDER_LEAD_TIME_PRESETS', () => {
    it('should contain exactly 5 presets', () => {
      expect(REMINDER_LEAD_TIME_PRESETS).toHaveLength(5);
    });

    it('should have 15 min preset', () => {
      const preset = REMINDER_LEAD_TIME_PRESETS.find(p => p.minutes === 15);
      expect(preset).toBeDefined();
      expect(preset?.label).toBe('15 min');
    });

    it('should have 30 min preset', () => {
      const preset = REMINDER_LEAD_TIME_PRESETS.find(p => p.minutes === 30);
      expect(preset).toBeDefined();
      expect(preset?.label).toBe('30 min');
    });

    it('should have 1 hour preset', () => {
      const preset = REMINDER_LEAD_TIME_PRESETS.find(p => p.minutes === 60);
      expect(preset).toBeDefined();
      expect(preset?.label).toBe('1 h');
    });

    it('should have 2 hours preset', () => {
      const preset = REMINDER_LEAD_TIME_PRESETS.find(p => p.minutes === 120);
      expect(preset).toBeDefined();
      expect(preset?.label).toBe('2 h');
    });

    it('should have 1 day preset', () => {
      const preset = REMINDER_LEAD_TIME_PRESETS.find(p => p.minutes === 1440);
      expect(preset).toBeDefined();
      expect(preset?.label).toBe('1 Tag');
    });

    it('should be sorted in ascending order by minutes', () => {
      const minutes = REMINDER_LEAD_TIME_PRESETS.map(p => p.minutes);
      const sorted = [...minutes].sort((a, b) => a - b);
      expect(minutes).toEqual(sorted);
    });

    it('should all have valid label and minutes', () => {
      REMINDER_LEAD_TIME_PRESETS.forEach(preset => {
        expect(typeof preset.label).toBe('string');
        expect(typeof preset.minutes).toBe('number');
        expect(preset.label.length).toBeGreaterThan(0);
        expect(preset.minutes).toBeGreaterThan(0);
      });
    });

    it('should have unique minute values', () => {
      const minutes = REMINDER_LEAD_TIME_PRESETS.map(p => p.minutes);
      const unique = new Set(minutes);
      expect(unique.size).toBe(minutes.length);
    });
  });

  describe('ReminderSettings type', () => {
    it('should accept valid ReminderSettings', () => {
      const settings: ReminderSettings = {
        enabled: true,
        leadTimeMinutes: 30,
      };
      expect(settings.enabled).toBe(true);
      expect(settings.leadTimeMinutes).toBe(30);
    });

    it('should accept disabled settings', () => {
      const settings: ReminderSettings = {
        enabled: false,
        leadTimeMinutes: 0,
      };
      expect(settings.enabled).toBe(false);
    });
  });
});
