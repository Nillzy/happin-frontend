const BERLIN = { lat: 52.52, lng: 13.405 };

// Bounding Box Europa: West, Süd, Ost, Nord
const EUROPE_BBOX = '-31.266,27.636,69.033,81.008';

export async function geocodeCity(
    city: string,
): Promise<{ lat: number; lng: number }> {
    const key = process.env.EXPO_PUBLIC_MAPTILER_KEY;
    if (!key || !city.trim()) return BERLIN;

    try {
        const query = encodeURIComponent(city.trim());
        const res = await fetch(
            `https://api.maptiler.com/geocoding/${query}.json?key=${key}&limit=1&types=municipality,place&bbox=${EUROPE_BBOX}`,
        );
        if (!res.ok) return BERLIN;
        const data = await res.json();
        const coords = data?.features?.[0]?.geometry?.coordinates;
        if (!coords) return BERLIN;
        return { lat: coords[1], lng: coords[0] };
    } catch {
        return BERLIN;
    }
}
