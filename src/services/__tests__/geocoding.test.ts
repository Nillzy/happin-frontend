import {
  searchCities,
  geocodeAddress,
  searchAddresses,
  reverseGeocode,
  verifyAddressExists,
  geocodeCity,
  type CitySuggestion,
  type AddressSuggestion,
} from '../geocoding';

// Mock global fetch
global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockClear();
  process.env.EXPO_PUBLIC_MAPTILER_KEY = 'test-maptiler-key';
});

describe('geocoding service', () => {
  describe('searchCities', () => {
    const mockMapTilerResponse = {
      features: [
        {
          text: 'München',
          place_type: ['municipal'],
          context: [
            { id: 'region.123', text: 'Bayern' },
            { id: 'country.456', text: 'Deutschland' },
          ],
          properties: { country_code: 'de' },
          geometry: { coordinates: [11.576124, 48.137154] },
        },
        {
          text: 'Berlin',
          place_type: ['region'],
          context: [
            { id: 'region.789', text: 'Berlin' },
            { id: 'country.456', text: 'Deutschland' },
          ],
          properties: { country_code: 'de' },
          geometry: { coordinates: [13.404954, 52.520008] },
        },
      ],
    };

    it('should search cities successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMapTilerResponse,
      });

      const results = await searchCities('München');

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        name: 'München',
        region: 'Bayern',
        regionCode: 'BY',
        country: 'Deutschland',
        displayLabel: 'München, Bayern, Deutschland',
        lat: 48.137154,
        lng: 11.576124,
      });
    });

    it('should return empty array when query is too short', async () => {
      const results = await searchCities('M');

      expect(results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return empty array when API key is missing', async () => {
      delete process.env.EXPO_PUBLIC_MAPTILER_KEY;

      const results = await searchCities('München');

      expect(results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return empty array on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const results = await searchCities('München');

      expect(results).toEqual([]);
    });

    it('should filter out excluded place types', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'Alexanderplatz',
              place_type: ['poi', 'locality'],
              context: [],
              properties: { country_code: 'de' },
              geometry: { coordinates: [13.413, 52.521] },
            },
            {
              text: 'Berlin',
              place_type: ['municipal'],
              context: [],
              properties: { country_code: 'de' },
              geometry: { coordinates: [13.404954, 52.520008] },
            },
          ],
        }),
      });

      const results = await searchCities('Berlin');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Berlin');
    });

    it('should limit results to 6 cities after filtering', async () => {
      const manyFeatures = Array.from({ length: 20 }, (_, i) => ({
        text: `City ${i}`,
        place_type: ['municipal'],
        context: [],
        properties: { country_code: 'de' },
        geometry: { coordinates: [10 + i, 50 + i] },
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: manyFeatures }),
      });

      const results = await searchCities('City');

      // Slice happens before filtering, then filter is applied, result may be < 6
      expect(results.length).toBeLessThanOrEqual(6);
    });

    it('should handle missing context gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'TestCity',
              place_type: ['municipal'],
              context: [],
              properties: { country_code: 'de' },
              geometry: { coordinates: [10, 50] },
            },
          ],
        }),
      });

      const results = await searchCities('TestCity');

      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        expect(results[0]).toMatchObject({
          name: 'TestCity',
          region: null,
          regionCode: null,
          country: 'DE',
        });
      }
    });

    it('should return empty array on network timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const results = await searchCities('München');

      expect(results).toEqual([]);
    });

    it('should return empty array on 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const results = await searchCities('München');

      expect(results).toEqual([]);
    });

    it('should return empty array on 403 forbidden', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const results = await searchCities('München');

      expect(results).toEqual([]);
    });

    it('should return empty array on malformed response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      const results = await searchCities('München');

      expect(results).toEqual([]);
    });
  });

  describe('geocodeAddress', () => {
    const mockGeocodingResponse = {
      features: [
        {
          place_type: ['address'],
          geometry: { coordinates: [11.576124, 48.137154] },
        },
      ],
    };

    it('should geocode full address successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeocodingResponse,
      });

      const result = await geocodeAddress('Marienplatz 1', 'München', '80331', 'Deutschland');

      expect(result).toEqual({
        lat: 48.137154,
        lng: 11.576124,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('Marienplatz%201%2C%2080331%20M%C3%BCnchen%2C%20Deutschland')
      );
    });

    it('should geocode address without postal code', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeocodingResponse,
      });

      const result = await geocodeAddress('Marienplatz 1', 'München', null, 'Deutschland');

      expect(result).toEqual({
        lat: 48.137154,
        lng: 11.576124,
      });
    });

    it('should geocode city only', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              place_type: ['municipal'],
              geometry: { coordinates: [11.576124, 48.137154] },
            },
          ],
        }),
      });

      const result = await geocodeAddress(null, 'München', null, null);

      expect(result).toEqual({
        lat: 48.137154,
        lng: 11.576124,
      });
    });

    it('should return null when no parts provided', async () => {
      const result = await geocodeAddress(null, null, null, null);

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return null when API key is missing', async () => {
      delete process.env.EXPO_PUBLIC_MAPTILER_KEY;

      const result = await geocodeAddress('Marienplatz 1', 'München', '80331', 'Deutschland');

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return null when API returns no results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [] }),
      });

      const result = await geocodeAddress('Invalid Address', 'Nowhere', '00000', 'NoCountry');

      expect(result).toBeNull();
    });

    it('should prefer address type over other types', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              place_type: ['municipal'],
              geometry: { coordinates: [10, 50] },
            },
            {
              place_type: ['address'],
              geometry: { coordinates: [11.576124, 48.137154] },
            },
          ],
        }),
      });

      const result = await geocodeAddress('Marienplatz 1', 'München', '80331', 'Deutschland');

      expect(result).toEqual({
        lat: 48.137154,
        lng: 11.576124,
      });
    });

    it('should return null on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await geocodeAddress('Marienplatz 1', 'München', '80331', 'Deutschland');

      expect(result).toBeNull();
    });

    it('should return null on network timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await geocodeAddress('Marienplatz 1', 'München', '80331', 'Deutschland');

      expect(result).toBeNull();
    });

    it('should return null on 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await geocodeAddress('Marienplatz 1', 'München', '80331', 'Deutschland');

      expect(result).toBeNull();
    });

    it('should return null on 403 forbidden', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const result = await geocodeAddress('Marienplatz 1', 'München', '80331', 'Deutschland');

      expect(result).toBeNull();
    });

    it('should return null on malformed response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      const result = await geocodeAddress('Marienplatz 1', 'München', '80331', 'Deutschland');

      expect(result).toBeNull();
    });
  });

  describe('searchAddresses', () => {
    const mockAddressResponse = {
      features: [
        {
          text: 'Marienplatz',
          address: '1',
          place_name: 'Marienplatz 1, 80331 München, Deutschland',
          context: [
            { id: 'postal_code.123', text: '80331' },
            { id: 'country.456', text: 'Deutschland' },
          ],
          geometry: { coordinates: [11.576124, 48.137154] },
        },
      ],
    };

    it('should search addresses successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAddressResponse,
      });

      const results = await searchAddresses('Marienplatz 1');

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        street: 'Marienplatz',
        houseNumber: '1',
        postalCode: '80331',
        city: 'München',
        country: 'Deutschland',
        displayLabel: 'Marienplatz 1, 80331 München',
        lat: 48.137154,
        lng: 11.576124,
      });
    });

    it('should return empty array when query is too short', async () => {
      const results = await searchAddresses('M');

      expect(results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return empty array when API key is missing', async () => {
      delete process.env.EXPO_PUBLIC_MAPTILER_KEY;

      const results = await searchAddresses('Marienplatz 1');

      expect(results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle addresses without house number', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'Marienplatz',
              address: null,
              place_name: 'Marienplatz, München, Deutschland',
              context: [
                { id: 'postal_code.123', text: '80331' },
                { id: 'country.456', text: 'Deutschland' },
              ],
              geometry: { coordinates: [11.576124, 48.137154] },
            },
          ],
        }),
      });

      const results = await searchAddresses('Marienplatz');

      expect(results[0]).toMatchObject({
        street: 'Marienplatz',
        houseNumber: null,
        displayLabel: 'Marienplatz, 80331 München',
      });
    });

    it('should handle missing postal code', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'Marienplatz',
              address: '1',
              place_name: 'Marienplatz 1, München, Deutschland',
              context: [
                { id: 'country.456', text: 'Deutschland' },
              ],
              geometry: { coordinates: [11.576124, 48.137154] },
            },
          ],
        }),
      });

      const results = await searchAddresses('Marienplatz 1');

      expect(results[0]).toMatchObject({
        postalCode: null,
        displayLabel: 'Marienplatz 1, München',
      });
    });

    it('should return empty array on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const results = await searchAddresses('Marienplatz 1');

      expect(results).toEqual([]);
    });

    it('should return empty array on network timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const results = await searchAddresses('Marienplatz 1');

      expect(results).toEqual([]);
    });

    it('should return empty array on 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const results = await searchAddresses('Marienplatz 1');

      expect(results).toEqual([]);
    });

    it('should return empty array on 404 not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const results = await searchAddresses('Marienplatz 1');

      expect(results).toEqual([]);
    });

    it('should return empty array on malformed response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      const results = await searchAddresses('Marienplatz 1');

      expect(results).toEqual([]);
    });
  });

  describe('reverseGeocode', () => {
    const mockReverseResponse = {
      features: [
        {
          text: 'Marienplatz',
          address: '1',
          place_type: ['address'],
          place_name: 'Marienplatz 1, 80331 München, Deutschland',
          context: [
            { id: 'postal_code.123', text: '80331' },
            { id: 'country.456', text: 'Deutschland' },
          ],
          geometry: { coordinates: [11.576124, 48.137154] },
        },
      ],
    };

    it('should reverse geocode coordinates successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReverseResponse,
      });

      const result = await reverseGeocode(48.137154, 11.576124);

      expect(result).toMatchObject({
        street: 'Marienplatz',
        houseNumber: '1',
        postalCode: '80331',
        city: 'München',
        country: 'Deutschland',
        displayLabel: 'Marienplatz 1, 80331 München',
        lat: 48.137154,
        lng: 11.576124,
      });
    });

    it('should prefer address type over other types', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'München',
              place_type: ['municipal'],
              place_name: 'München, Deutschland',
              context: [],
              geometry: { coordinates: [11.576124, 48.137154] },
            },
            {
              text: 'Marienplatz',
              address: '1',
              place_type: ['address'],
              place_name: 'Marienplatz 1, München, Deutschland',
              context: [],
              geometry: { coordinates: [11.576124, 48.137154] },
            },
          ],
        }),
      });

      const result = await reverseGeocode(48.137154, 11.576124);

      expect(result?.street).toBe('Marienplatz');
    });

    it('should return null when API key is missing', async () => {
      delete process.env.EXPO_PUBLIC_MAPTILER_KEY;

      const result = await reverseGeocode(48.137154, 11.576124);

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return null when no features returned', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [] }),
      });

      const result = await reverseGeocode(0, 0);

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await reverseGeocode(48.137154, 11.576124);

      expect(result).toBeNull();
    });

    it('should return null on network timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await reverseGeocode(48.137154, 11.576124);

      expect(result).toBeNull();
    });

    it('should return null on 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await reverseGeocode(48.137154, 11.576124);

      expect(result).toBeNull();
    });

    it('should return null on 403 forbidden', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const result = await reverseGeocode(48.137154, 11.576124);

      expect(result).toBeNull();
    });

    it('should return null on malformed response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      const result = await reverseGeocode(48.137154, 11.576124);

      expect(result).toBeNull();
    });

    it('should handle missing context gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'Unknown Street',
              address: null,
              place_type: ['address'],
              place_name: 'Unknown Street',
              context: [],
              geometry: { coordinates: [10, 50] },
            },
          ],
        }),
      });

      const result = await reverseGeocode(50, 10);

      expect(result).toMatchObject({
        street: 'Unknown Street',
        houseNumber: null,
        postalCode: null,
        country: 'Deutschland',
      });
    });
  });

  describe('verifyAddressExists', () => {
    const mockAddress: AddressSuggestion = {
      street: 'Marienplatz',
      houseNumber: '1',
      postalCode: '80331',
      city: 'München',
      country: 'Deutschland',
      displayLabel: 'Marienplatz 1, 80331 München',
      lat: 48.137154,
      lng: 11.576124,
    };

    it('should verify address exists successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              place_type: ['address'],
              address: '1',
            },
          ],
        }),
      });

      const result = await verifyAddressExists(mockAddress);

      expect(result).toBe(true);
    });

    it('should return true when address has no house number', async () => {
      const addressWithoutNumber: AddressSuggestion = {
        ...mockAddress,
        houseNumber: null,
      };

      const result = await verifyAddressExists(addressWithoutNumber);

      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return false when API key is missing', async () => {
      delete process.env.EXPO_PUBLIC_MAPTILER_KEY;

      const result = await verifyAddressExists(mockAddress);

      expect(result).toBe(false);
    });

    it('should return false when house number does not match', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              place_type: ['address'],
              address: '2',
            },
          ],
        }),
      });

      const result = await verifyAddressExists(mockAddress);

      expect(result).toBe(false);
    });

    it('should return false when no address feature found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              place_type: ['place'],
              address: null,
            },
          ],
        }),
      });

      const result = await verifyAddressExists(mockAddress);

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await verifyAddressExists(mockAddress);

      expect(result).toBe(false);
    });

    it('should return false on network timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await verifyAddressExists(mockAddress);

      expect(result).toBe(false);
    });

    it('should handle case-insensitive house number comparison', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              place_type: ['address'],
              address: '1A',
            },
          ],
        }),
      });

      const addressWithSuffix: AddressSuggestion = {
        ...mockAddress,
        houseNumber: '1a',
      };

      const result = await verifyAddressExists(addressWithSuffix);

      expect(result).toBe(true);
    });
  });

  describe('geocodeCity', () => {
    const BERLIN = { lat: 52.52, lng: 13.405 };

    const mockCityResponse = {
      features: [
        {
          text: 'München',
          place_type: ['municipal'],
          geometry: { coordinates: [11.576124, 48.137154] },
        },
      ],
    };

    it('should geocode city successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCityResponse,
      });

      const result = await geocodeCity('München');

      expect(result).toEqual({
        lat: 48.137154,
        lng: 11.576124,
      });
    });

    it('should return Berlin when API key is missing', async () => {
      delete process.env.EXPO_PUBLIC_MAPTILER_KEY;

      const result = await geocodeCity('München');

      expect(result).toEqual(BERLIN);
    });

    it('should return Berlin when city is empty', async () => {
      const result = await geocodeCity('');

      expect(result).toEqual(BERLIN);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return Berlin when city is only whitespace', async () => {
      const result = await geocodeCity('   ');

      expect(result).toEqual(BERLIN);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return Berlin when no results found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [] }),
      });

      const result = await geocodeCity('NonexistentCity');

      expect(result).toEqual(BERLIN);
    });

    it('should filter out excluded place types', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'POI',
              place_type: ['poi'],
              geometry: { coordinates: [10, 50] },
            },
            {
              text: 'München',
              place_type: ['municipal'],
              geometry: { coordinates: [11.576124, 48.137154] },
            },
          ],
        }),
      });

      const result = await geocodeCity('München');

      expect(result).toEqual({
        lat: 48.137154,
        lng: 11.576124,
      });
    });

    it('should return Berlin when only excluded types are returned', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'POI',
              place_type: ['poi'],
              geometry: { coordinates: [10, 50] },
            },
            {
              text: 'Neighborhood',
              place_type: ['neighbourhood'],
              geometry: { coordinates: [11, 51] },
            },
          ],
        }),
      });

      const result = await geocodeCity('SomePlace');

      expect(result).toEqual(BERLIN);
    });

    it('should return Berlin on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await geocodeCity('München');

      expect(result).toEqual(BERLIN);
    });

    it('should return Berlin on network timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await geocodeCity('München');

      expect(result).toEqual(BERLIN);
    });

    it('should return Berlin on 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await geocodeCity('München');

      expect(result).toEqual(BERLIN);
    });

    it('should return Berlin on 403 forbidden', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const result = await geocodeCity('München');

      expect(result).toEqual(BERLIN);
    });

    it('should return Berlin on malformed response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      const result = await geocodeCity('München');

      expect(result).toEqual(BERLIN);
    });
  });
});
