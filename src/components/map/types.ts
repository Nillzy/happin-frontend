export interface MapMarker {
    lat: number;
    lng: number;
    title: string;
    eventId: string;
    location?: string;
    startsAt?: string;
    isFree?: boolean;
    imageUrl?: string;
}

export interface MarkerCluster {
    type: 'cluster';
    lat: number;
    lng: number;
    count: number;
    markers: MapMarker[];
}

export type MarkerOrCluster = (MapMarker & { type: 'single' }) | MarkerCluster;

export interface MapViewProps {
    markers: MapMarker[];
    onMarkerPress?: (eventId: string) => void;
    centerLat?: number;
    centerLng?: number;
    zoom?: number;
    isDark?: boolean;
    styleUrl?: string;
    showPopups?: boolean;
    interactive?: boolean;
    onMapMoved?: (lat: number, lng: number) => void;
    onPositionChanged?: (lat: number, lng: number, zoom: number) => void;
}

export const DEFAULT_CENTER = { lat: 52.52, lng: 13.405 };
export const DEFAULT_ZOOM = 11;
export const MAP_STYLE_LIGHT = 'https://api.maptiler.com/maps/019dfc91-be68-7eb0-a241-e7a2d1d21b6a/style.json';
export const MAP_STYLE_DARK  = 'https://api.maptiler.com/maps/019dfca2-7a0c-7ac9-bae7-dfa64252c3f0/style.json';
