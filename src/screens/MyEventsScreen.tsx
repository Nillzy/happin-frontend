import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';

/**
 * MyEventsScreen (M7 - Host-Übersicht)
 *
 * Zeigt alle Events, die der Nutzer als Host erstellt hat.
 * Bietet Zugriff auf:
 * - Event bearbeiten
 * - Gästeliste verwalten
 * - RSVP-Antworten einsehen
 * - Tickets scannen
 * - Event-Statistiken
 *
 * TODO:
 * - Event-Liste vom Backend laden (GET /api/v1/events?role=organizer)
 * - Event-Cards mit Status (kommend/laufend/vergangen)
 * - Quick-Actions (Bearbeiten, Teilen, Statistiken)
 * - Leerer Zustand mit CTA "Erstes Event erstellen"
 */
export default function MyEventsScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    return (
        <ScreenWithNav>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Navbar />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.onSurface }]}>
                            Deine Events
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                            Verwalte deine organisierten Events
                        </Text>
                    </View>

                    {/* Platzhalter für leeren Zustand */}
                    <View style={[styles.placeholder, { backgroundColor: colors.surfaceContainer }]}>
                        <Text style={[styles.icon, { color: colors.primary }]}>🎟️</Text>
                        <Text style={[styles.placeholderTitle, { color: colors.onSurface }]}>
                            Noch keine Events
                        </Text>
                        <Text style={[styles.placeholderText, { color: colors.onSurfaceVariant }]}>
                            Erstelle dein erstes Event und lade Gäste ein.
                        </Text>
                        <TouchableOpacity
                            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/events/create')}
                        >
                            <Text style={[styles.ctaButtonText, { color: colors.onPrimary }]}>
                                Erstes Event erstellen
                            </Text>
                        </TouchableOpacity>
                        <Text style={[styles.hint, { color: colors.outline }]}>
                            (M7 - Host-Übersicht)
                        </Text>
                    </View>

                    {/* TODO: Event-Liste hier einfügen wenn Daten vorhanden */}
                </ScrollView>
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: 24,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    placeholder: {
        padding: 32,
        borderRadius: 20,
        alignItems: 'center',
        gap: 12,
        marginTop: 40,
    },
    icon: {
        fontSize: 64,
        marginBottom: 8,
    },
    placeholderTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    placeholderText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
    },
    ctaButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ctaButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    hint: {
        fontSize: 12,
        marginTop: 12,
        textAlign: 'center',
    },
});
