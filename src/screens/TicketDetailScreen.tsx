import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
    Pressable,
    PanResponder,
    Animated,
    Platform,
    Alert,
    Linking,
    useWindowDimensions,
} from 'react-native';
import type { ViewToken } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import type { EventDetailResponse, UserTicket } from '../types/events';
import QRCode from 'react-native-qrcode-svg';
import WalletButton from '../../assets/images/de_add_to_google_wallet_wallet-button.svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SHEET_WIDTH = 480;
const DISMISS_THRESHOLD = 80;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.8;

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

export default function TicketDetailScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();
    const { width: windowWidth } = useWindowDimensions();
    const effectiveWidth = Math.min(windowWidth, MAX_SHEET_WIDTH);

    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [tickets, setTickets] = useState<UserTicket[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [walletLoading, setWalletLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 200,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, [translateY, backdropOpacity]);

    const dismissSheet = useCallback(() => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SHEET_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/');
            }
        });
    }, [translateY, backdropOpacity, router]);

    const handleAddToWallet = async () => {
        if (!eventId) return;
        setWalletLoading(true);
        try {
            const token = await getSession();
            const { wallet_url } = await api.getWalletUrl(eventId, token ?? undefined);
            await Linking.openURL(wallet_url);
        } catch {
            Alert.alert('Fehler', 'Google Wallet konnte nicht geöffnet werden.');
        } finally {
            setWalletLoading(false);
        }
    };

    const handleCancelTicket = () => {
        Alert.alert(
            'Ticket stornieren',
            'Möchtest du dein Ticket wirklich stornieren? Der Betrag wird dir zurückerstattet.',
            [
                { text: 'Abbrechen', style: 'cancel' },
                {
                    text: 'Stornieren',
                    style: 'destructive',
                    onPress: async () => {
                        if (!eventId) return;
                        setCancelLoading(true);
                        try {
                            const token = await getSession();
                            if (!token) return;
                            await api.cancelTicketOrder(eventId, token);
                            Alert.alert('Storniert', 'Dein Ticket wurde storniert und der Betrag wird erstattet.');
                            router.replace(`/event/${eventId}`);
                        } catch (err: any) {
                            Alert.alert('Fehler', err?.message ?? 'Stornierung fehlgeschlagen.');
                        } finally {
                            setCancelLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handlePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
                    dismissSheet();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 4,
                    }).start();
                }
            },
        })
    ).current;

    const handleScrollEndDrag = useCallback((e: any) => {
        const offsetY = e.nativeEvent.contentOffset.y;
        const velocityY = e.nativeEvent.velocity?.y ?? 0;
        if (offsetY <= 0 && velocityY > 0.5) {
            dismissSheet();
        }
    }, [dismissSheet]);

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setActiveIndex(viewableItems[0].index);
        }
    }, []);

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const handleScrollEnd = useCallback((e: any) => {
        const offset = e.nativeEvent.contentOffset.x;
        const index = Math.round(offset / effectiveWidth);
        setActiveIndex(index);
    }, [effectiveWidth]);

    useEffect(() => {
        const loadData = async () => {
            if (!eventId) {
                setError('Keine Event-ID');
                setLoading(false);
                return;
            }

            try {
                const token = await getSession();
                if (!token) {
                    router.replace('/login');
                    setLoading(false);
                    return;
                }

                const eventData = await api.getEventById(eventId, token);
                setEvent(eventData);

                try {
                    const ticketData = await api.getUserTickets(token);
                    const matchingTickets = ticketData.tickets
                        .filter(t => t.event_id === eventId);
                    setTickets(matchingTickets);
                } catch {
                    // Ticket-Laden fehlgeschlagen
                }
            } catch (err) {
                console.error('Failed to load event:', err);
                setError('Event konnte nicht geladen werden');
            } finally {
                setLoading(false);
            }
        };

        void loadData();
    }, [eventId, router]);

    const renderQRCard = ({ item }: { item: UserTicket }) => (
        <View style={[styles.qrCardWrapper, { width: effectiveWidth }]}>
            <View style={[styles.qrCard, { backgroundColor: colors.surface, width: effectiveWidth - 48 }]}>
                {item.guest_name && (
                    <Text style={[styles.ticketName, { color: colors.onSurface }]}>
                        {item.guest_name}
                    </Text>
                )}
                <View style={[styles.qrCode, { backgroundColor: '#FFFFFF', width: effectiveWidth - 128 }]}>
                    <QRCode
                        value={item.qr_token}
                        size={effectiveWidth - 176}
                        backgroundColor="#FFFFFF"
                    />
                </View>
            </View>
        </View>
    );

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.centeredContent}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            );
        }

        if (error || !event) {
            return (
                <View style={styles.centeredContent}>
                    <Text style={[styles.errorText, { color: colors.error }]}>
                        {error || 'Event nicht gefunden'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={dismissSheet}
                    >
                        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Zurück</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        const currentTicket = tickets[activeIndex];

        return (
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScrollEndDrag={handleScrollEndDrag}
                scrollEventThrottle={16}
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

                {/* QR Cards — Swipeable */}
                {tickets.length > 0 ? (
                    <View style={[styles.carouselContainer, { alignItems: 'center' }]}>
                        <FlatList
                            data={tickets}
                            renderItem={renderQRCard}
                            keyExtractor={item => item.ticket_id}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={handleScrollEnd}
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={viewabilityConfig}
                            style={{ width: effectiveWidth }}
                            getItemLayout={(_, index) => ({
                                length: effectiveWidth,
                                offset: effectiveWidth * index,
                                index,
                            })}
                        />

                        {/* Pagination — only when multiple tickets */}
                        {tickets.length > 1 && (
                            <View style={styles.pagination}>
                                <Text style={[styles.paginationText, { color: colors.onSurfaceVariant }]}>
                                    Ticket {tickets[activeIndex]?.ticket_number ?? activeIndex + 1} von {tickets.length}
                                </Text>
                                <View style={styles.dots}>
                                    {tickets.map((_, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.dot,
                                                {
                                                    backgroundColor: i === activeIndex
                                                        ? colors.primary
                                                        : colors.outlineVariant,
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={[styles.qrCard, { backgroundColor: colors.surface, marginHorizontal: 24 }]}>
                        <Text style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
                            Kein Ticket vorhanden
                        </Text>
                    </View>
                )}

                {/* Ticket Info */}
                <View style={[styles.infoSection, { backgroundColor: colors.surfaceContainer }]}>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>
                            Ticket
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.onSurface }]}>
                            {currentTicket?.ticket_option_name ?? 'Standard'}
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

                {/* Add to Google Wallet Button — nur Android + Web */}
                {Platform.OS !== 'ios' && (
                    <Pressable
                        onPress={handleAddToWallet}
                        disabled={walletLoading}
                        style={[styles.walletImageWrapper, { opacity: walletLoading ? 0.5 : 1 }]}
                    >
                        <WalletButton width="100%" height={56} />
                        {walletLoading && (
                            <ActivityIndicator size="small" color={colors.onSurface} style={StyleSheet.absoluteFill} />
                        )}
                    </Pressable>
                )}

                {/* Veranstaltung ansehen Button */}
                <TouchableOpacity
                    style={[styles.eventButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.replace(`/event/${eventId}`)}
                >
                    <Ionicons name="calendar-outline" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                    <Text style={[styles.eventButtonText, { color: colors.onPrimary }]}>
                        Veranstaltung ansehen
                    </Text>
                </TouchableOpacity>

                {/* Ticket stornieren — nur wenn aktiv */}
                {tickets.length > 0 && tickets.every(t => t.status === 'active') && (
                    <TouchableOpacity
                        style={[styles.eventButton, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.error }]}
                        onPress={handleCancelTicket}
                        disabled={cancelLoading}
                    >
                        <Ionicons name="close-circle-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
                        <Text style={[styles.eventButtonText, { color: colors.error }]}>
                            {cancelLoading ? 'Wird storniert…' : 'Ticket stornieren'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Footer Info */}
                <Text style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
                    Zeige diesen QR-Code beim Einlass vor
                </Text>
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <Head><title>{event ? `Ticket – ${event.title}` : 'Ticket – Happin'}</title></Head>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} />
            </Animated.View>

            {/* Bottom Sheet */}
            <Animated.View
                style={[
                    styles.sheet,
                    {
                        backgroundColor: colors.background,
                        transform: [{ translateY }],
                        ...(Platform.OS === 'web' && windowWidth > MAX_SHEET_WIDTH ? {
                            left: '50%',
                            right: 'auto',
                            width: MAX_SHEET_WIDTH,
                            transform: [{ translateX: '-50%' as any }, { translateY }],
                            borderRadius: 24,
                        } : {}),
                    },
                ]}
            >
                {/* Drag Handle — larger touch target, always works */}
                <View {...handlePanResponder.panHandlers} style={styles.handleArea}>
                    <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
                </View>

                {/* Close Button */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={dismissSheet} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color={colors.onSurface} />
                    </TouchableOpacity>
                </View>

                {renderContent()}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SHEET_HEIGHT,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        overflow: 'hidden',
    },
    handleArea: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 16,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 4,
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
        paddingBottom: 24,
    },
    centeredContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
        gap: 16,
    },

    // Title Section
    titleSection: {
        marginBottom: 32,
        alignItems: 'center',
        paddingHorizontal: 24,
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

    ticketName: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 20,
        letterSpacing: -0.3,
    },

    // Carousel
    carouselContainer: {
        marginBottom: 32,
    },
    qrCardWrapper: {
        width: SCREEN_WIDTH,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    qrCard: {
        width: '100%',
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

    // Pagination
    pagination: {
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    paginationText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dots: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    // Info Section
    infoSection: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        gap: 16,
        marginHorizontal: 24,
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
    walletImageWrapper: {
        alignItems: 'center',
        marginBottom: 24,
        marginHorizontal: 24,
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
        marginHorizontal: 24,
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
        paddingHorizontal: 24,
    },

    // Error
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
