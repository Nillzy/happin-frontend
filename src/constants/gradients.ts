/**
 * Vordefinierte Gradient-Hintergründe für Events
 *
 * Diese Gradients werden verwendet:
 * - Als Fallback für Events ohne Titelbild
 * - Als Vorlagen bei der Event-Erstellung
 */

export const GRADIENT_PAIRS: [string, string][] = [
    ['#D4006B', '#8B3DC8'], // Pink → Lila        (id 0)
    ['#8B3DC8', '#42dae2'], // Lila → Cyan         (id 1)
    ['#00677f', '#8B3DC8'], // Teal → Lila         (id 2)
    ['#FF6FA8', '#D4006B'], // Hell-Pink → Pink    (id 3)
    ['#FF6B35', '#F7C59F'], // Orange → Peach      (id 4)
    ['#1A1A2E', '#16213E'], // Nacht-Blau → Dunkel (id 5)
    ['#2ECC71', '#1ABC9C'], // Grün → Türkis       (id 6)
    ['#F64F59', '#C0392B'], // Rot → Dunkelrot     (id 7)
];

export type GradientId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
