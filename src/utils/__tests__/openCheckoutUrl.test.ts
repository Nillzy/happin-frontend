import {
  openCheckoutUrl,
  showCheckoutAlert,
  formatCheckoutError,
} from '../openCheckoutUrl';
import { Platform, Linking, Alert } from 'react-native';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
  Linking: { openURL: jest.fn() },
  Alert: { alert: jest.fn() },
}));

// Mock window for web tests
const mockWindow = {
  location: {
    assign: jest.fn(),
  },
  alert: jest.fn(),
};

// @ts-ignore
global.window = mockWindow;

describe('openCheckoutUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      value: 'web',
      writable: true,
      configurable: true,
    });
  });

  describe('Web Platform', () => {
    it('opens URL in same tab on web', () => {
      const url = 'https://checkout.stripe.com/session-123';

      openCheckoutUrl(url);

      expect(mockWindow.location.assign).toHaveBeenCalledWith(url);
    });

    it('handles HTTPS URLs', () => {
      const url = 'https://checkout.stripe.com/pay/cs_test_abc123';

      openCheckoutUrl(url);

      expect(mockWindow.location.assign).toHaveBeenCalledWith(url);
    });
  });

  describe('Native Platform', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });
    });

    it('opens URL with Linking on iOS', () => {
      const url = 'https://checkout.stripe.com/session-456';

      openCheckoutUrl(url);

      expect(Linking.openURL).toHaveBeenCalledWith(url);
    });

    it('opens URL with Linking on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
        configurable: true,
      });
      const url = 'https://checkout.stripe.com/session-789';

      openCheckoutUrl(url);

      expect(Linking.openURL).toHaveBeenCalledWith(url);
    });
  });

  describe('Error Cases', () => {
    it('throws error for empty URL', () => {
      expect(() => openCheckoutUrl('')).toThrow('Checkout-URL fehlt');
    });

    it('throws error for null URL', () => {
      // @ts-ignore - Testing runtime behavior
      expect(() => openCheckoutUrl(null)).toThrow('Checkout-URL fehlt');
    });

    it('throws error for undefined URL', () => {
      // @ts-ignore - Testing runtime behavior
      expect(() => openCheckoutUrl(undefined)).toThrow('Checkout-URL fehlt');
    });
  });
});

describe('showCheckoutAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      value: 'web',
      writable: true,
      configurable: true,
    });
  });

  describe('Web Platform', () => {
    it('shows alert with window.alert on web', () => {
      showCheckoutAlert('Fehler', 'Test-Nachricht');

      expect(mockWindow.alert).toHaveBeenCalledWith('Fehler\n\nTest-Nachricht');
    });

    it('handles multiline messages', () => {
      showCheckoutAlert('Info', 'Zeile 1\nZeile 2\nZeile 3');

      expect(mockWindow.alert).toHaveBeenCalledWith('Info\n\nZeile 1\nZeile 2\nZeile 3');
    });
  });

  describe('Native Platform', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });
    });

    it('shows Alert.alert on iOS', () => {
      showCheckoutAlert('Fehler', 'Test-Nachricht');

      expect(Alert.alert).toHaveBeenCalledWith('Fehler', 'Test-Nachricht');
    });

    it('shows Alert.alert on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
        configurable: true,
      });

      showCheckoutAlert('Info', 'Android-Nachricht');

      expect(Alert.alert).toHaveBeenCalledWith('Info', 'Android-Nachricht');
    });

    it('handles non-string messages', () => {
      // @ts-ignore - Testing runtime behavior
      showCheckoutAlert('Fehler', 123);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Fehler',
        'Checkout konnte nicht gestartet werden.'
      );
    });
  });
});

describe('formatCheckoutError', () => {
  it('returns message for string error', () => {
    const err = new Error('Simple error message');
    const result = formatCheckoutError(err);

    expect(result).toBe('Simple error message');
  });

  it('extracts detail from JSON error message', () => {
    const err = new Error(
      'API error 400: {"detail":"Host has not completed payment setup"}'
    );
    const result = formatCheckoutError(err);

    expect(result).toBe('Der Host hat die Zahlungseinrichtung noch nicht abgeschlossen.');
  });

  it('translates known error messages', () => {
    const err = new Error('API error 400: {"detail":"Event is fully booked"}');
    const result = formatCheckoutError(err);

    expect(result).toBe('Das Event ist ausgebucht.');
  });

  it('handles ticket sold out error', () => {
    const err = new Error('API error 400: {"detail":"Ticket option sold out"}');
    const result = formatCheckoutError(err);

    expect(result).toBe('Diese Ticket-Option ist ausverkauft.');
  });

  it('handles maximum tickets exceeded error', () => {
    const err = new Error(
      'API error 400: {"detail":"Maximum tickets per person exceeded"}'
    );
    const result = formatCheckoutError(err);

    expect(result).toBe('Maximale Ticketanzahl pro Person überschritten.');
  });

  it('handles pending checkout error', () => {
    const err = new Error(
      'API error 400: {"detail":"You already have a pending checkout for this event"}'
    );
    const result = formatCheckoutError(err);

    expect(result).toBe('Du hast bereits einen offenen Checkout für dieses Event.');
  });

  it('handles payment processing error', () => {
    const err = new Error(
      'API error 400: {"detail":"Payment is being processed for this event"}'
    );
    const result = formatCheckoutError(err);

    expect(result).toBe('Deine Zahlung wird gerade verarbeitet. Bitte warte einen Moment.');
  });

  it('returns original detail for unknown error', () => {
    const err = new Error('API error 400: {"detail":"Unknown custom error"}');
    const result = formatCheckoutError(err);

    expect(result).toBe('Unknown custom error');
  });

  it('handles array of error details', () => {
    const err = new Error(
      'API error 422: {"detail":[{"msg":"Field required"},{"msg":"Invalid format"}]}'
    );
    const result = formatCheckoutError(err);

    expect(result).toBe('Field required\nInvalid format');
  });

  it('handles detail object with msg property', () => {
    const err = new Error('API error 400: {"detail":{"msg":"Custom message"}}');
    const result = formatCheckoutError(err);

    expect(result).toBe('Custom message');
  });

  it('handles invalid JSON in error message', () => {
    const err = new Error('API error 400: {invalid json}');
    const result = formatCheckoutError(err);

    expect(result).toBe('API error 400: {invalid json}');
  });

  it('returns default message for non-Error objects', () => {
    const result = formatCheckoutError('string error');

    expect(result).toBe('Checkout konnte nicht gestartet werden.');
  });

  it('returns default message for null error', () => {
    const result = formatCheckoutError(null);

    expect(result).toBe('Checkout konnte nicht gestartet werden.');
  });

  it('returns default message for undefined error', () => {
    const result = formatCheckoutError(undefined);

    expect(result).toBe('Checkout konnte nicht gestartet werden.');
  });

  it('handles empty detail field', () => {
    const err = new Error('API error 400: {"detail":""}');
    const result = formatCheckoutError(err);

    expect(result).toBe('API error 400: {"detail":""}');
  });

  it('handles missing detail field', () => {
    const err = new Error('API error 400: {"other":"value"}');
    const result = formatCheckoutError(err);

    expect(result).toBe('API error 400: {"other":"value"}');
  });
});
