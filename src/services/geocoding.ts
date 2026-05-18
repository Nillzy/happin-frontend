const BERLIN = { lat: 52.52, lng: 13.405 };

const EUROPE_COUNTRIES =
    'ad,al,at,ba,be,bg,by,ch,cy,cz,de,dk,ee,es,fi,fr,gb,ge,gr,hr,hu,ie,is,it,li,lt,lu,lv,mc,md,me,mk,mt,nl,no,pl,pt,ro,rs,ru,se,si,sk,sm,tr,ua,va,xk';

export interface CitySuggestion {
    name: string;
    region: string | null;
    regionCode: string | null;
    country: string;
    displayLabel: string;
    lat: number;
    lng: number;
}

const REGION_CODES: Record<string, string> = {
    'Baden-Württemberg': 'BW', 'Bayern': 'BY', 'Berlin': 'BE', 'Brandenburg': 'BB',
    'Bremen': 'HB', 'Hamburg': 'HH', 'Hessen': 'HE', 'Mecklenburg-Vorpommern': 'MV',
    'Niedersachsen': 'NI', 'Nordrhein-Westfalen': 'NW', 'Rheinland-Pfalz': 'RP',
    'Saarland': 'SL', 'Sachsen': 'SN', 'Sachsen-Anhalt': 'ST', 'Schleswig-Holstein': 'SH',
    'Thüringen': 'TH',
    // Österreich
    'Burgenland': 'B', 'Kärnten': 'K', 'Niederösterreich': 'NÖ', 'Oberösterreich': 'OÖ',
    'Salzburg': 'S', 'Steiermark': 'ST', 'Tirol': 'T', 'Vorarlberg': 'V', 'Wien': 'W',
    // Schweiz (Kantone)
    'Zürich': 'ZH', 'Bern': 'BE', 'Luzern': 'LU', 'Uri': 'UR', 'Schwyz': 'SZ',
    'Obwalden': 'OW', 'Nidwalden': 'NW', 'Glarus': 'GL', 'Zug': 'ZG', 'Freiburg': 'FR',
    'Solothurn': 'SO', 'Basel-Stadt': 'BS', 'Basel-Landschaft': 'BL', 'Schaffhausen': 'SH',
    'Appenzell Ausserrhoden': 'AR', 'Appenzell Innerrhoden': 'AI', 'St. Gallen': 'SG',
    'Graubünden': 'GR', 'Aargau': 'AG', 'Thurgau': 'TG', 'Tessin': 'TI',
    'Waadt': 'VD', 'Wallis': 'VS', 'Neuenburg': 'NE', 'Genf': 'GE', 'Jura': 'JU',
};

// Types die Stadtteile, Viertel oder POIs sind — werden rausgefiltert
const EXCLUDE_TYPES = new Set(['locality', 'neighbourhood', 'place', 'poi', 'address', 'postal_code', 'major_landform', 'continental_marine']);

export async function searchCities(query: string): Promise<CitySuggestion[]> {
    const key = process.env.EXPO_PUBLIC_MAPTILER_KEY;
    if (!key || query.trim().length < 2) return [];

    try {
        const q = encodeURIComponent(query.trim());
        const res = await fetch(
            `https://api.maptiler.com/geocoding/${q}.json?key=${key}&limit=10&language=de&country=${EUROPE_COUNTRIES}`,
        );
        if (!res.ok) return [];
        const data = await res.json();
        const features: any[] = data?.features ?? [];

        return features
            .filter((f) => {
                const types: string[] = f.place_type ?? [];
                return types.some((t) => !EXCLUDE_TYPES.has(t));
            })
            .slice(0, 6)
            .map((f) => {
                const context: any[] = f.context ?? [];

                const name: string = f.text ?? '';
                const countryEntry = context.find((c: any) => c.id?.startsWith('country.'));
                const regionEntry = context.find((c: any) => c.id?.startsWith('region.'));
                const country: string = countryEntry?.text ?? f.properties?.country_code?.toUpperCase() ?? '';
                const region: string | null = regionEntry?.text ?? null;
                const regionCode: string | null = region ? (REGION_CODES[region] ?? null) : null;

                const parts = [name];
                if (region) parts.push(region);
                parts.push(country);

                const coords = f.geometry?.coordinates ?? [0, 0];

                return {
                    name,
                    region,
                    regionCode,
                    country,
                    displayLabel: parts.join(', '),
                    lat: coords[1],
                    lng: coords[0],
                };
            });
    } catch {
        return [];
    }
}

export async function geocodeAddress(
    street: string | null | undefined,
    city: string | null | undefined,
    postalCode: string | null | undefined,
    country: string | null | undefined,
): Promise<{ lat: number; lng: number } | null> {
    const key = process.env.EXPO_PUBLIC_MAPTILER_KEY;
    if (!key) return null;

    const parts: string[] = [];
    if (street) parts.push(street);
    if (postalCode && city) parts.push(`${postalCode} ${city}`);
    else if (city) parts.push(city);
    if (country) parts.push(country);

    if (parts.length === 0) return null;

    try {
        const q = encodeURIComponent(parts.join(', '));
        const res = await fetch(
            `https://api.maptiler.com/geocoding/${q}.json?key=${key}&limit=5&types=address,place&language=de`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        const features: any[] = data?.features ?? [];
        const match = features.find((f: any) => f.place_type?.includes('address')) ?? features[0];
        const coords = match?.geometry?.coordinates;
        if (!coords) return null;
        return { lat: coords[1], lng: coords[0] };
    } catch {
        return null;
    }
}

export interface AddressSuggestion {
    street: string;
    houseNumber: string | null;
    postalCode: string | null;
    city: string;
    country: string;
    displayLabel: string;
    lat: number;
    lng: number;
}

export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
    const key = process.env.EXPO_PUBLIC_MAPTILER_KEY;
    if (!key || query.trim().length < 2) return [];

    try {
        const q = encodeURIComponent(query.trim());
        const res = await fetch(
            `https://api.maptiler.com/geocoding/${q}.json?key=${key}&limit=5&types=address&language=de&country=${EUROPE_COUNTRIES}`,
        );
        if (!res.ok) return [];
        const data = await res.json();
        const features: any[] = data?.features ?? [];

        return features.map((f) => {
            const context: any[] = f.context ?? [];
            const streetName: string = f.text ?? '';
            const houseNumber: string | null = f.address ?? null;
            const postalEntry = context.find((c: any) => c.id?.startsWith('postal_code.'));
            const countryEntry = context.find((c: any) => c.id?.startsWith('country.'));

            const postalCode: string | null = postalEntry?.text ?? null;
            const country: string = countryEntry?.text ?? 'Deutschland';

            let city = '';
            const placeName: string = f.place_name ?? '';
            const placeNameParts = placeName.split(',').map((s: string) => s.trim());
            if (placeNameParts.length >= 2) {
                const citySegment = placeNameParts[1];
                const cityMatch = citySegment.match(/^\d+\s+(.+)$/);
                city = cityMatch ? cityMatch[1] : citySegment;
            }

            const streetFull = houseNumber ? `${streetName} ${houseNumber}` : streetName;
            const parts = [streetFull];
            if (postalCode && city) parts.push(`${postalCode} ${city}`);
            else if (city) parts.push(city);

            const coords = f.geometry?.coordinates ?? [0, 0];

            return {
                street: streetName,
                houseNumber,
                postalCode,
                city,
                country,
                displayLabel: parts.join(', '),
                lat: coords[1],
                lng: coords[0],
            };
        });
    } catch {
        return [];
    }
}

// Wandelt Koordinaten in eine AddressSuggestion um (Reverse-Geocoding).
export async function reverseGeocode(lat: number, lng: number): Promise<AddressSuggestion | null> {
    const key = process.env.EXPO_PUBLIC_MAPTILER_KEY;
    if (!key) return null;

    try {
        const res = await fetch(
            `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${key}&language=de`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        const features: any[] = data?.features ?? [];

        const feature = features.find((f: any) => f.place_type?.includes('address')) ?? features[0];
        if (!feature) return null;

        const context: any[] = feature.context ?? [];
        const streetName: string = feature.text ?? '';
        const houseNumber: string | null = feature.address ?? null;
        const postalEntry = context.find((c: any) => c.id?.startsWith('postal_code.'));
        const countryEntry = context.find((c: any) => c.id?.startsWith('country.'));
        const postalCode: string | null = postalEntry?.text ?? null;
        const country: string = countryEntry?.text ?? 'Deutschland';

        let city = '';
        const placeName: string = feature.place_name ?? '';
        const placeNameParts = placeName.split(',').map((s: string) => s.trim());
        if (placeNameParts.length >= 2) {
            const citySegment = placeNameParts[1];
            const cityMatch = citySegment.match(/^\d+\s+(.+)$/);
            city = cityMatch ? cityMatch[1] : citySegment;
        }

        const streetFull = houseNumber ? `${streetName} ${houseNumber}` : streetName;
        const parts = [streetFull];
        if (postalCode && city) parts.push(`${postalCode} ${city}`);
        else if (city) parts.push(city);

        const coords = feature.geometry?.coordinates ?? [lng, lat];

        return {
            street: streetName,
            houseNumber,
            postalCode,
            city,
            country,
            displayLabel: parts.join(', '),
            lat: coords[1],
            lng: coords[0],
        };
    } catch {
        return null;
    }
}

// Prüft via Reverse-Geocoding ob an den gegebenen Koordinaten tatsächlich
// die erwartete Hausnummer existiert. Gibt false zurück wenn nicht.
export async function verifyAddressExists(address: AddressSuggestion): Promise<boolean> {
    const key = process.env.EXPO_PUBLIC_MAPTILER_KEY;
    // Ohne Hausnummer gibt es nichts zu verifizieren — Adresse ist gültig
    if (!address.houseNumber) return true;
    if (!key) return false;

    try {
        const res = await fetch(
            `https://api.maptiler.com/geocoding/${address.lng},${address.lat}.json?key=${key}&language=de`,
        );
        if (!res.ok) return false;
        const data = await res.json();
        const features: any[] = data?.features ?? [];

        const addressFeature = features.find((f: any) =>
            f.place_type?.includes('address') && f.address
        );
        if (!addressFeature) return false;

        const returnedHouseNumber: string = (addressFeature.address ?? '').trim().toLowerCase();
        const expectedHouseNumber: string = address.houseNumber.trim().toLowerCase();

        return returnedHouseNumber === expectedHouseNumber;
    } catch {
        return false;
    }
}

export async function geocodeCity(
    city: string,
): Promise<{ lat: number; lng: number }> {
    const key = process.env.EXPO_PUBLIC_MAPTILER_KEY;
    if (!key || !city.trim()) return BERLIN;

    try {
        const query = encodeURIComponent(city.trim());
        const res = await fetch(
            `https://api.maptiler.com/geocoding/${query}.json?key=${key}&limit=5&language=de&country=${EUROPE_COUNTRIES}`,
        );
        if (!res.ok) return BERLIN;
        const data = await res.json();
        const features: any[] = data?.features ?? [];

        const match = features.find((f) => {
            const types: string[] = f.place_type ?? [];
            return types.some((t) => !EXCLUDE_TYPES.has(t));
        });

        const coords = match?.geometry?.coordinates;
        if (!coords) return BERLIN;
        return { lat: coords[1], lng: coords[0] };
    } catch {
        return BERLIN;
    }
}
