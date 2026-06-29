import { parseTicketPayload } from '../ticketToken';

describe('parseTicketPayload', () => {
  it('should parse valid ticket token with all fields', () => {
    const payload = {
      eid: 'evt-123',
      name: 'John Doe',
      nr: 1,
      opt: 'vip',
    };

    const token = btoa(JSON.stringify(payload)) + '.signature';
    const result = parseTicketPayload(token);

    expect(result).toEqual({
      eid: 'evt-123',
      name: 'John Doe',
      nr: 1,
      opt: 'vip',
    });
  });

  it('should parse valid ticket token without optional fields', () => {
    const payload = {
      eid: 'evt-456',
      name: 'Jane Smith',
      nr: 5,
    };

    const token = btoa(JSON.stringify(payload)) + '.signature';
    const result = parseTicketPayload(token);

    expect(result).toEqual({
      eid: 'evt-456',
      name: 'Jane Smith',
      nr: 5,
      opt: null,
    });
  });

  it('should handle URL-safe base64 encoding', () => {
    const payload = {
      eid: 'evt-789',
      name: 'Test User',
      nr: 10,
      opt: null,
    };

    // Create URL-safe base64 (replace + with - and / with _)
    const normalB64 = btoa(JSON.stringify(payload));
    const urlSafeB64 = normalB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const token = urlSafeB64 + '.signature';

    const result = parseTicketPayload(token);

    expect(result).toEqual({
      eid: 'evt-789',
      name: 'Test User',
      nr: 10,
      opt: null,
    });
  });

  it('should handle base64 without padding', () => {
    const payload = {
      eid: 'evt-short',
      name: 'A',
      nr: 1,
    };

    const normalB64 = btoa(JSON.stringify(payload));
    const noPaddingB64 = normalB64.replace(/=/g, '');
    const token = noPaddingB64 + '.signature';

    const result = parseTicketPayload(token);

    expect(result).toEqual({
      eid: 'evt-short',
      name: 'A',
      nr: 1,
      opt: null,
    });
  });

  it('should return null for token without dot separator', () => {
    const token = 'invalidtoken';
    const result = parseTicketPayload(token);

    expect(result).toBeNull();
  });

  it('should return null for invalid base64', () => {
    const token = 'invalid!!!base64.signature';
    const result = parseTicketPayload(token);

    expect(result).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    const token = btoa('not-valid-json') + '.signature';
    const result = parseTicketPayload(token);

    expect(result).toBeNull();
  });

  it('should return null when eid is missing', () => {
    const payload = {
      name: 'John Doe',
      nr: 1,
    };

    const token = btoa(JSON.stringify(payload)) + '.signature';
    const result = parseTicketPayload(token);

    expect(result).toBeNull();
  });

  it('should return null when name is missing', () => {
    const payload = {
      eid: 'evt-123',
      nr: 1,
    };

    const token = btoa(JSON.stringify(payload)) + '.signature';
    const result = parseTicketPayload(token);

    expect(result).toBeNull();
  });

  it('should return null when nr is missing', () => {
    const payload = {
      eid: 'evt-123',
      name: 'John Doe',
    };

    const token = btoa(JSON.stringify(payload)) + '.signature';
    const result = parseTicketPayload(token);

    expect(result).toBeNull();
  });

  it('should return null when nr is not a number', () => {
    const payload = {
      eid: 'evt-123',
      name: 'John Doe',
      nr: '1', // String instead of number
    };

    const token = btoa(JSON.stringify(payload)) + '.signature';
    const result = parseTicketPayload(token);

    expect(result).toBeNull();
  });

  it('should handle empty string token', () => {
    const result = parseTicketPayload('');

    expect(result).toBeNull();
  });

  it('should handle token with only dot', () => {
    const result = parseTicketPayload('.');

    expect(result).toBeNull();
  });
});
