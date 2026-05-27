import { Alert, Linking, Platform } from 'react-native';

/**
 * Open a Stripe hosted Checkout URL.
 *
 * On web we use same-tab navigation (window.location.assign) so the redirect
 * is not blocked by popup blockers after an async API call. Stripe recommends
 * redirecting the customer to session.url after creating the Checkout Session.
 */
export function openCheckoutUrl(url: string): void {
    if (!url) {
        throw new Error('Checkout-URL fehlt');
    }

    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
            window.location.assign(url);
        }
        return;
    }

    void Linking.openURL(url);
}

export function showCheckoutAlert(title: string, message: string): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`${title}\n\n${message}`);
        return;
    }
    Alert.alert(title, message);
}

export function formatCheckoutError(err: unknown): string {
    if (!(err instanceof Error)) {
        return 'Checkout konnte nicht gestartet werden.';
    }

    const jsonMatch = err.message.match(/\{.*\}/);
    if (jsonMatch) {
        try {
            const body = JSON.parse(jsonMatch[0]) as { detail?: string };
            const detail = body.detail;
            if (detail) {
                const messages: Record<string, string> = {
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
                };
                return messages[detail] ?? detail;
            }
        } catch {
            // fall through
        }
    }

    return err.message;
}
