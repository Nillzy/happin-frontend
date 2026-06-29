import { deviceLabelFromUserAgent, DeviceLabel } from '../userAgent';

describe('userAgent', () => {
  describe('deviceLabelFromUserAgent', () => {
    // Native Platform Tests
    it('parses iOS user agent correctly', () => {
      const result = deviceLabelFromUserAgent('ios 17.0');

      expect(result.name).toBe('iPhone (iOS 17.0)');
      expect(result.icon).toBe('mobile');
    });

    it('parses Android user agent correctly', () => {
      const result = deviceLabelFromUserAgent('android 14');

      expect(result.name).toBe('Android (14)');
      expect(result.icon).toBe('mobile');
    });

    it('handles iOS with extra whitespace', () => {
      const result = deviceLabelFromUserAgent('  ios 16.5  ');

      expect(result.name).toBe('iPhone (iOS 16.5)');
      expect(result.icon).toBe('mobile');
    });

    it('handles Android with extra whitespace', () => {
      const result = deviceLabelFromUserAgent('  android 13  ');

      expect(result.name).toBe('Android (13)');
      expect(result.icon).toBe('mobile');
    });

    // Web Browser Tests
    it('detects Chrome on Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toBe('Chrome (Windows)');
      expect(result.icon).toBe('web');
    });

    it('detects Firefox on macOS', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toBe('Firefox (macOS)');
      expect(result.icon).toBe('web');
    });

    it('detects Safari on macOS', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toBe('Safari (macOS)');
      expect(result.icon).toBe('web');
    });

    it('detects Edge on Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toBe('Edge (Windows)');
      expect(result.icon).toBe('web');
    });

    it('detects Opera on Windows', () => {
      // Opera uses "OPR/" in UA, but Chrome is detected first due to "Chrome/" string
      // Expected behavior: Chrome detection takes precedence
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0';
      const result = deviceLabelFromUserAgent(ua);

      // Note: Current implementation detects Chrome before Opera
      expect(result.name).toBe('Chrome (Windows)');
      expect(result.icon).toBe('web');
    });

    it('detects Chrome on Android', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toBe('Chrome (Android)');
      expect(result.icon).toBe('web');
    });

    it('detects Safari on iOS', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toBe('Safari (iOS)');
      expect(result.icon).toBe('web');
    });

    it('detects Chrome on Linux', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toBe('Chrome (Linux)');
      expect(result.icon).toBe('web');
    });

    // Edge Cases
    it('handles null user agent with web platform hint', () => {
      const result = deviceLabelFromUserAgent(null, 'web');

      expect(result.name).toBe('Browser');
      expect(result.icon).toBe('web');
    });

    it('handles null user agent with mobile platform hint', () => {
      const result = deviceLabelFromUserAgent(null, 'ios');

      expect(result.name).toBe('Gerät');
      expect(result.icon).toBe('mobile');
    });

    it('handles undefined user agent', () => {
      const result = deviceLabelFromUserAgent(undefined);

      expect(result.name).toBe('Gerät');
      expect(result.icon).toBe('mobile');
    });

    it('handles empty string user agent', () => {
      const result = deviceLabelFromUserAgent('');

      expect(result.name).toBe('Gerät');
      expect(result.icon).toBe('mobile');
    });

    it('handles very long unknown user agent', () => {
      const longUA = 'a'.repeat(100);
      const result = deviceLabelFromUserAgent(longUA);

      expect(result.name).toHaveLength(58); // 57 chars + ellipsis
      expect(result.name).toMatch(/…$/);
      expect(result.icon).toBe('mobile');
    });

    it('handles short unknown user agent', () => {
      const shortUA = 'UnknownBrowser/1.0';
      const result = deviceLabelFromUserAgent(shortUA);

      expect(result.name).toBe(shortUA);
      expect(result.icon).toBe('mobile');
    });

    it('returns browser name only when OS cannot be detected', () => {
      const ua = 'Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toBe('Chrome');
      expect(result.icon).toBe('web');
    });

    it('handles iPad user agent', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toBe('Safari (iOS)');
      expect(result.icon).toBe('web');
    });

    it('handles case-insensitive iOS format', () => {
      const result = deviceLabelFromUserAgent('IOS 15.0');

      expect(result.name).toBe('iPhone (iOS 15.0)');
      expect(result.icon).toBe('mobile');
    });

    it('handles case-insensitive Android format', () => {
      const result = deviceLabelFromUserAgent('ANDROID 12');

      expect(result.name).toBe('Android (12)');
      expect(result.icon).toBe('mobile');
    });

    it('prefers Edge detection over Chrome when both present', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toContain('Edge');
      expect(result.name).not.toContain('Chrome');
    });

    it('prefers Safari over Chrome when only Safari markers present', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
      const result = deviceLabelFromUserAgent(ua);

      expect(result.name).toContain('Safari');
      expect(result.name).not.toContain('Chrome');
    });
  });
});
