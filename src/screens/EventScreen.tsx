import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import type { EventDetailResponse } from '../types/events';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_WIDTH * 0.75; // 3:4 aspect ratio

const GRADIENT_FALLBACK = ['#b32053', '#6645c7'];

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
 * EventScreen - Luma-inspired Event Detail View
 *
 * Layout inspired by Luma (Hero Image, Action Buttons, Location Card, Host Section)
 * Design System: Material Design 3 tokens from DESIGN.md
 * Color Palette: useTheme() hook (Happin Light / Neon Horizon)
 * Typography: Inter for body, Plus Jakarta Sans for headings
 * Spacing: 8px system (DESIGN.md)
 * Border Radius: 12-20px (DESIGN.md card_radius)
 */
export default function EventScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string; eventId?: string }>();
    const id = params.id || params.eventId; // Support both /event/[id] and /event/[eventId]

    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadEvent();
    }, [id]);

    const loadEvent = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!id) {
                throw new Error('Event-ID fehlt');
            }

            console.log('[EventScreen] Loading event with ID:', id);
            const token = await getSession();
            console.log('[EventScreen] Token available:', !!token);
            const data = await api.getEventById(id, token || undefined);
            console.log('[EventScreen] Event loaded:', data.title);
            setEvent(data);
        } catch (e) {
            console.error('[EventScreen] Load error:', e);
            setError(e instanceof Error ? e.message : 'Event konnte nicht geladen werden');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = () => {
        // TODO: RSVP Logic
        console.log('Register for event');
    };

    const handleContact = () => {
        // TODO: Contact host
        console.log('Contact host');
    };

    const handleShare = () => {
        // TODO: Share event
        console.log('Share event');
    };

    if (loading) {
        return (
            <ScreenWithNav showBottomNav={false}>
                <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWithNav>
        );
    }

    if (error || !event) {
        return (
            <ScreenWithNav showBottomNav={false}>
                <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error || 'Event nicht gefunden'}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        onPress={loadEvent}
                    >
                        <Text style={[styles.retryText, { color: colors.onPrimary }]}>Erneut versuchen</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWithNav>
        );
    }

    const hostInitial = event.host_name?.charAt(0).toUpperCase() || 'H';

    return (
        <ScreenWithNav showBottomNav={false}>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Hero Image with Title Overlay */}
                    <View style={styles.heroContainer}>
                        {event.image_url ? (
                            <Image
                                source={{ uri: event.image_url }}
                                style={styles.heroImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <LinearGradient
                                colors={GRADIENT_FALLBACK as [string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.heroImage}
                            />
                        )}

                        {/* Back Button */}
                        <TouchableOpacity
                            style={[styles.backButton, { backgroundColor: colors.surfaceContainerHigh }]}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
                        </TouchableOpacity>

                        {/* Title Overlay (Luma-style) */}
                        <View style={styles.titleOverlay}>
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.85)']}
                                style={styles.titleGradient}
                            >
                                <Text style={styles.heroTitle}>{event.title}</Text>
                                <Text style={styles.heroDate}>{formatDateGerman(event.starts_at)}</Text>
                            </LinearGradient>
                        </View>
                    </View>

                    {/* Content Container */}
                    <View style={styles.content}>
                        {/* Host Card (Luma-style "invited you") */}
                        <View style={[styles.hostCard, { backgroundColor: colors.surfaceContainer }]}>
                            <View style={styles.hostInfo}>
                                <View style={[styles.hostAvatar, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.hostAvatarText, { color: colors.onPrimary }]}>
                                        {hostInitial}
                                    </Text>
                                </View>
                                <View style={styles.hostTextContainer}>
                                    <Text style={[styles.hostName, { color: colors.onSurface }]}>
                                        {event.host_name || 'Host'}
                                    </Text>
                                    <Text style={[styles.hostSubtitle, { color: colors.onSurfaceVariant }]}>
                                        invited you
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity>
                                <Ionicons name="ellipsis-horizontal" size={24} color={colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        </View>

                        {/* Action Buttons Row (Luma-style) */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    {
                                        backgroundColor: colors.surfaceContainerLowest,
                                        borderColor: colors.outline,
                                        borderWidth: 1,
                                    },
                                ]}
                                onPress={handleRegister}
                            >
                                <Ionicons name="checkbox-outline" size={20} color={colors.onSurface} />
                                <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Register</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.surfaceContainer }]}
                                onPress={handleContact}
                            >
                                <Ionicons name="mail-outline" size={20} color={colors.onSurfaceVariant} />
                                <Text style={[styles.actionButtonText, { color: colors.onSurfaceVariant }]}>Contact</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.surfaceContainer }]}
                                onPress={handleShare}
                            >
                                <Ionicons name="share-outline" size={20} color={colors.onSurfaceVariant} />
                                <Text style={[styles.actionButtonText, { color: colors.onSurfaceVariant }]}>Share</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.surfaceContainer }]}
                            >
                                <Ionicons name="ellipsis-horizontal" size={20} color={colors.onSurfaceVariant} />
                                <Text style={[styles.actionButtonText, { color: colors.onSurfaceVariant }]}>More</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Location Section */}
                        {event.location && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Location</Text>
                                <View style={[styles.locationCard, { backgroundColor: colors.surfaceContainer }]}>
                                    <View style={styles.locationHeader}>
                                        <View style={styles.locationTextContainer}>
                                            <Text style={[styles.locationAddress, { color: colors.onSurface }]}>
                                                {event.location.street && event.location.house_number
                                                    ? `${event.location.street} ${event.location.house_number}`
                                                    : event.location.city || 'Adresse nicht verfügbar'}
                                            </Text>
                                            <Text style={[styles.locationCity, { color: colors.onSurfaceVariant }]}>
                                                {event.location.city && event.location.country
                                                    ? `${event.location.city}, ${event.location.country}`
                                                    : event.location.city || ''}
                                            </Text>
                                        </View>
                                        <View style={styles.weatherContainer}>
                                            <Ionicons name="partly-sunny-outline" size={20} color={colors.onSurfaceVariant} />
                                            <Text style={[styles.weatherText, { color: colors.onSurfaceVariant }]}>18°C</Text>
                                        </View>
                                    </View>
                                    {/* Map Placeholder */}
                                    <View style={[styles.mapPlaceholder, { backgroundColor: colors.surfaceContainerHigh }]}>
                                        <Ionicons name="map-outline" size={48} color={colors.onSurfaceVariant} />
                                        <Text style={[styles.mapPlaceholderText, { color: colors.onSurfaceVariant }]}>
                                            Kartenansicht
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Host Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Host</Text>
                                <TouchableOpacity onPress={handleContact}>
                                    <Text style={[styles.contactLink, { color: colors.primary }]}>Contact</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.hostRow}>
                                <View style={[styles.hostAvatar, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.hostAvatarText, { color: colors.onPrimary }]}>
                                        {hostInitial}
                                    </Text>
                                </View>
                                <Text style={[styles.hostNameLarge, { color: colors.onSurface }]}>
                                    {event.host_name || 'Host'}
                                </Text>
                            </View>
                        </View>

                        {/* About Event Section */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>About Event</Text>
                            <Text style={[styles.description, { color: colors.onSurface }]}>
                                {event.description || 'Keine Beschreibung verfügbar.'}
                            </Text>
                        </View>

                        {/* Accept Invite CTA Button (Luma-style) */}
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                            onPress={handleRegister}
                        >
                            <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                                Accept Invite
                            </Text>
                        </TouchableOpacity>

                        {/* Bottom Spacing */}
                        <View style={{ height: 48 }} />
                    </View>
                </ScrollView>
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    errorText: {
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        minHeight: 48,
    },
    retryText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Hero Section
    heroContainer: {
        position: 'relative',
        height: HERO_HEIGHT,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 16,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    titleOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    titleGradient: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    heroTitle: {
        fontSize: 32, // h2 from DESIGN.md
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    heroDate: {
        fontSize: 16, // body-md from DESIGN.md
        color: 'rgba(255,255,255,0.9)',
    },

    // Content
    content: {
        paddingHorizontal: 24, // grid_margin from DESIGN.md
        paddingTop: 24,
    },

    // Host Card (Luma-style)
    hostCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    hostInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hostAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    hostAvatarText: {
        fontSize: 20,
        fontWeight: '700',
    },
    hostTextContainer: {
        justifyContent: 'center',
    },
    hostName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    hostSubtitle: {
        fontSize: 14,
    },

    // Action Buttons Row (Luma-style)
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 32,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12, // card_radius from DESIGN.md
        gap: 4,
        minHeight: 72,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Sections
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    contactLink: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Location Card
    locationCard: {
        borderRadius: 16, // card_radius_large from DESIGN.md
        overflow: 'hidden',
        padding: 16,
    },
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationAddress: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    locationCity: {
        fontSize: 14,
    },
    weatherContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    weatherText: {
        fontSize: 14,
        fontWeight: '600',
    },
    mapPlaceholder: {
        height: 200,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    mapPlaceholderText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Host Row
    hostRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hostNameLarge: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 12,
    },

    // Description
    description: {
        fontSize: 15, // body-md from DESIGN.md
        lineHeight: 24,
    },

    // Primary CTA Button
    primaryButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        minHeight: 56,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
