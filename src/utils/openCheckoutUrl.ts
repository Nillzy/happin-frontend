import { Alert, Linking, Platform } from 'react-native';

const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
    'Host has not completed payment setup':
        'Der Host hat die Zahlungseinrichtung noch nicht abgeschlossen.',
    'Host payment account is not yet active':
        'Das Zahlungskonto des Hosts ist noch nicht aktiv.',
    'Paid tickets require checkout — use /checkout-session':
        'Bezahlte Tickets erfordern den Checkout.',
    'Maximum tickets per person exceeded':
        'Maximale Ticketanzahl pro Person überschritten.',
    'Ticket option sold out': 'Diese Ticket-Option ist ausverkauft.',
    'Event is fully booked': 'Das Event ist ausgebucht.',
    'You already have a pending checkout for this event':
        'Du hast bereits einen offenen Checkout für dieses Event.',
    'Payment is being processed for this event':
        'Deine Zahlung wird gerade verarbeitet. Bitte warte einen Moment.',
};

function formatApiDetail(detail: unknown): string | null {
    if (typeof detail === 'string') {
        return CHECKOUT_ERROR_MESSAGES[detail] ?? detail;
    }

    if (Array.isArray(detail)) {
        const messages = detail
            .map((item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object' && 'msg' in item) {
                    return String((item as { msg?: string }).msg ?? '');
                }
                return null;
            })
            .filter(Boolean);
        if (messages.length > 0) {
            return messages.join('\n');
        }
    }

    if (detail && typeof detail === 'object' && 'msg' in detail) {
        return String((detail as { msg?: string }).msg ?? '');
    }

    return null;
}

/**
 * Open a Stripe hosted Checkout URL (same tab on web to avoid popup blockers).
 */
export function openCheckoutUrl(url: string): void {
    if (!url) {
        throw new Error('Checkout-URL fehlt');
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.assign(url);
        return;
    }

    void Linking.openURL(url);
}

export function showCheckoutAlert(title: string, message: string): void {
    const text = typeof message === 'string' ? message : 'Checkout konnte nicht gestartet werden.';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`${title}\n\n${text}`);
        return;
    }
    Alert.alert(title, text);
}

export function formatCheckoutError(err: unknown): string {
    if (!(err instanceof Error)) {
        return 'Checkout konnte nicht gestartet werden.';
    }

    const jsonMatch = err.message.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const body = JSON.parse(jsonMatch[0]) as { detail?: unknown };
            const formatted = formatApiDetail(body.detail);
            if (formatted) {
                return formatted;
            }
        } catch {
            // fall through
        }
    }

    return err.message;
}
