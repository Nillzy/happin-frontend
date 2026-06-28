import { MapMarker, MarkerCluster, MarkerOrCluster } from './types';

const CLUSTER_RADIUS_DEG = 0.0005; // ~55m

export function groupMarkers(markers: MapMarker[]): MarkerOrCluster[] {
    const visited = new Set<number>();
    const result: MarkerOrCluster[] = [];
    for (let i = 0; i < markers.length; i++) {
        if (visited.has(i)) continue;
        visited.add(i);
        const group: MapMarker[] = [markers[i]];
        for (let j = i + 1; j < markers.length; j++) {
            if (visited.has(j)) continue;
            if (
                Math.abs(markers[i].lat - markers[j].lat) <= CLUSTER_RADIUS_DEG &&
                Math.abs(markers[i].lng - markers[j].lng) <= CLUSTER_RADIUS_DEG
            ) {
                visited.add(j);
                group.push(markers[j]);
            }
        }
        if (group.length === 1) {
            result.push({ ...group[0], type: 'single' });
        } else {
            const lat = group.reduce((s, m) => s + m.lat, 0) / group.length;
            const lng = group.reduce((s, m) => s + m.lng, 0) / group.length;
            result.push({ type: 'cluster', lat, lng, count: group.length, markers: group });
        }
    }
    return result;
}

export type { MarkerCluster };