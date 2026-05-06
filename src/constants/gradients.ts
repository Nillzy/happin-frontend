/**
 * Vordefinierte Gradient-Hintergründe für Events
 *
 * Diese Gradients werden verwendet:
 * - Als Fallback für Events ohne Titelbild
 * - Als Vorlagen bei der Event-Erstellung
 */

export const GRADIENT_PAIRS: [string, string][] = [
    ['#D4006B', '#8B3DC8'], // Pink → Lila
    ['#8B3DC8', '#42dae2'], // Lila → Cyan
    ['#00677f', '#8B3DC8'], // Teal → Lila
    ['#FF6FA8', '#D4006B'], // Hell-Pink → Pink
];

export type GradientId = 0 | 1 | 2 | 3;

/**
 * Gibt den Gradient für eine bestimmte ID zurück
 */
export function getGradient(id: GradientId): [string, string] {
    return GRADIENT_PAIRS[id];
}

/**
 * Gibt einen Gradient basierend auf einem Index zurück (mit Modulo-Wrapping)
 * Nützlich für Listen-Ansichten
 */
export function getGradientByIndex(index: number): [string, string] {
    return GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];
}
