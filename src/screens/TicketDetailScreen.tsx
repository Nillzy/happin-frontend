import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
    Modal,
    Animated,
    PanResponder,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import type { EventDetailResponse, UserTicket } from '../types/events';
import QRCode from 'react-native-qrcode-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatDateGerman(isoDate: string): string {
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

/**
 * TicketDetailScreen
 *
 * Bottom Sheet mit Swipe-to-Dismiss
 * - Swipe down → Schließt Modal
 * - Transparenter Hintergrund (Background bleibt sichtbar)
 */
export default function TicketDetailScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();

    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [ticket, setTicket] = useState<UserTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) {
                    // Swipe down → Close
                    handleClose();
                } else {
                    // Snap back
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        const loadEvent = async () => {
            if (!eventId) return;

            try {
                const token = await getSession();
                if (!token) {
                    router.replace('/login');
                    return;
                }

                const eventData = await api.getEventById(eventId, token);
                setEvent(eventData);

                try {
                    const ticketData = await api.getUserTickets(token);
                    const matchingTicket = ticketData.tickets.find(t => t.event_id === eventId);
                    setTicket(matchingTicket || null);
                } catch {
                    // Ticket-Laden fehlgeschlagen — QR bleibt leer
                }
            } catch (err) {
                console.error('Failed to load event:', err);
                setError('Event konnte nicht geladen werden');
            } finally {
                setLoading(false);
            }
        };

        void loadEvent();

        // Slide up animation
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
        }).start();
    }, [eventId, router]);

    const handleClose = () => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            router.back();
        });
    };

    if (loading) {
        return (
            <Modal
                visible={true}
                transparent
                animationType="none"
                onRequestClose={handleClose}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                </View>
            </Modal>
        );
    }

    if (error || !event) {
        return (
            <Modal
                visible={true}
                transparent
                animationType="none"
                onRequestClose={handleClose}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                        <Text style={[styles.errorText, { color: colors.error }]}>
                            {error || 'Event nicht gefunden'}
                        </Text>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primary }]}
                            onPress={handleClose}
                        >
                            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                                Zurück
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal
            visible={true}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            {/* Semi-transparent Backdrop */}
            <View style={styles.modalOverlay}>
                {/* Bottom Sheet */}
                <Animated.View
                    style={[
                        styles.sheetContainer,
                        {
                            backgroundColor: colors.background,
                            transform: [{ translateY }],
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    <View>
                        {/* Drag Handle */}
                        <View style={styles.dragHandle}>
                            <View style={[styles.dragIndicator, { backgroundColor: colors.outlineVariant }]} />
                        </View>

                        {/* Close Button */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                onPress={handleClose}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={28} color={colors.onSurface} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Event Title */}
                            <View style={styles.titleSection}>
                                <Text style={[styles.eventTitle, { color: colors.onSurface }]}>
                                    {event.title}
                                </Text>
                                <Text style={[styles.eventDate, { color: colors.onSurfaceVariant }]}>
                                    {formatDateGerman(event.starts_at)}
                                </Text>
                            </View>

                            {/* QR Code - Large */}
                            <View style={[styles.qrSection, { backgroundColor: colors.surface }]}>
                                <View style={[styles.qrCode, { backgroundColor: '#FFFFFF' }]}>
                                    {ticket?.qr_token ? (
                                        <QRCode
                                            value={ticket.qr_token}
                                            size={SCREEN_WIDTH - 176}
                                            backgroundColor="#FFFFFF"
                                        />
                                    ) : (
                                        <Text style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
                                            Kein Ticket vorhanden
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Ticket Info */}
                            <View style={[styles.infoSection, { backgroundColor: colors.surfaceContainer }]}>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>
                                        Ticket
                                    </Text>
                                    <Text style={[styles.infoValue, { color: colors.onSurface }]}>
                                        1× Standard
                                    </Text>
                                </View>

                                {event.location && (
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>
                                            Ort
                                        </Text>
                                        <Text style={[styles.infoValue, { color: colors.onSurface }]}>
                                            {[
                                                event.location.street,
                                                event.location.house_number,
                                                event.location.city
                                            ].filter(Boolean).join(' ')}
                                        </Text>
                                    </View>
                                )}

                                {event.host_name && (
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>
                                            Veranstalter
                                        </Text>
                                        <Text style={[styles.infoValue, { color: colors.onSurface }]}>
                                            {event.host_name}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Add to Google Wallet Button */}
                            <TouchableOpacity
                                style={[styles.walletButton, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
                                onPress={() => {
                                    console.log('Add to Google Wallet');
                                }}
                            >
                                <Text style={[styles.walletButtonText, { color: colors.onSurface }]}>
                                    Zu Google Wallet hinzufügen
                                </Text>
                            </TouchableOpacity>

                            {/* Veranstaltung ansehen Button */}
                            <TouchableOpacity
                                style={[styles.eventButton, { backgroundColor: colors.primary }]}
                                onPress={() => {
                                    handleClose();
                                    setTimeout(() => router.push(`/event/${eventId}`), 350);
                                }}
                            >
                                <Ionicons name="calendar-outline" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                                <Text style={[styles.eventButtonText, { color: colors.onPrimary }]}>
                                    Veranstaltung ansehen
                                </Text>
                            </TouchableOpacity>

                            {/* Footer Info */}
                            <Text style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
                                Zeige diesen QR-Code beim Einlass vor
                            </Text>
                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: SCREEN_HEIGHT * 0.92,
        paddingBottom: 24,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 8,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    closeButton: {
        padding: 8,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },

    // Title Section
    titleSection: {
        marginBottom: 32,
        alignItems: 'center',
    },
    eventTitle: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: 8,
    },
    eventDate: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },

    // QR Code Section
    qrSection: {
        marginBottom: 32,
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
    },
    qrCode: {
        width: SCREEN_WIDTH - 128,
        aspectRatio: 1,
        borderRadius: 16,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Info Section
    infoSection: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
    },

    // Wallet Button
    walletButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 2,
        marginBottom: 24,
    },
    walletButtonText: {
        fontSize: 17,
        fontWeight: '600',
    },

    // Event Button
    eventButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 24,
        minHeight: 48,
    },
    eventButtonText: {
        fontSize: 17,
        fontWeight: '600',
    },

    // Footer
    footerText: {
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // Loading/Error
    loadingContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 48,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    errorText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        minHeight: 48,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
