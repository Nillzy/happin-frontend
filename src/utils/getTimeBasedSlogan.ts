/**
 * Returns a time-based slogan depending on the current hour of the day.
 *
 * Time ranges:
 * - Morning (6:00 - 9:59): "Was geht heute?" / "Finde es heraus."
 * - Afternoon (10:00 - 17:59): "Pläne für heute Abend?" / "Mach' Dir welche."
 * - Evening (18:00 - 21:59): "Heute Abend noch nichts vor?" / "Hol' Dir Inspiration."
 * - Night (22:00 - 5:59): "Noch wach?" / "Wir auch."
 */
export function getTimeBasedSlogan(): { firstLine: string; secondLine: string } {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 10) {
        // Morning: 6:00 - 9:59
        return {
            firstLine: 'Was geht heute?',
            secondLine: 'Finde es heraus.',
        };
    } else if (hour >= 10 && hour < 18) {
        // Afternoon: 10:00 - 17:59
        return {
            firstLine: 'Pläne für heute Abend?',
            secondLine: "Mach' Dir welche.",
        };
    } else if (hour >= 18 && hour < 22) {
        // Evening: 18:00 - 21:59
        return {
            firstLine: 'Heute Abend noch nichts vor?',
            secondLine: "Hol' Dir Inspiration.",
        };
    } else {
        // Night: 22:00 - 5:59
        return {
            firstLine: 'Noch wach?',
            secondLine: 'Wir auch.',
        };
    }
}
