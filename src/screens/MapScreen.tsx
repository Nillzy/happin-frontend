import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';

/**
 * MapScreen (S6 - Kartensuche)
 *
 * Zeigt öffentliche Events auf einer interaktiven Karte.
 * Nutzer können Events nach Ort, Kategorie oder Datum filtern.
 *
 * TODO:
 * - Kartenintegration (react-native-maps oder Mapbox)
 * - Event-Pins mit Clustern
 * - Filter-UI (Kategorie, Datum, Umkreis)
 * - Event-Details beim Klick auf Pin
 */
export default function MapScreen() {
    const { colors } = useTheme();

    return (
        <ScreenWithNav>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Navbar showCta={false} />

                <View style={styles.content}>
                    <View style={[styles.placeholder, { backgroundColor: colors.surfaceContainer }]}>
                        <Text style={[styles.icon, { color: colors.primary }]}>🗺️</Text>
                        <Text style={[styles.title, { color: colors.onSurface }]}>
                            Kartenansicht
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                            Hier werden Events auf einer interaktiven Karte angezeigt.
                        </Text>
                        <Text style={[styles.hint, { color: colors.outline }]}>
                            (S6 - Kartensuche)
                        </Text>
                    </View>
                </View>
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    placeholder: {
        width: '100%',
        maxWidth: 400,
        padding: 32,
        borderRadius: 20,
        alignItems: 'center',
        gap: 12,
    },
    icon: {
        fontSize: 64,
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    hint: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
});
