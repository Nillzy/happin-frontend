export interface TicketPayload {
    eid: string;
    name: string;
    nr: number;
    opt: string | null;
}

export function parseTicketPayload(token: string): TicketPayload | null {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const payloadB64 = token.slice(0, dotIndex);

    try {
        let padded = payloadB64;
        const padding = 4 - (padded.length % 4);
        if (padding !== 4) padded += '='.repeat(padding);

        const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(decoded);

        if (!payload.eid || !payload.name || typeof payload.nr !== 'number') return null;

        return {
            eid: payload.eid,
            name: payload.name,
            nr: payload.nr,
            opt: payload.opt ?? null,
        };
    } catch {
        return null;
    }
}
