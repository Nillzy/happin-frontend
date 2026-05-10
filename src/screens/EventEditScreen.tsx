import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import EditDrawer from '../components/atoms/EditDrawer';
import ImageSelectionModal from '../components/atoms/ImageSelectionModal';
import EventCategories from '../components/event/EventCategories';
import EventImageGallery from '../components/atoms/EventImageGallery';
import CategorySelector, { CATEGORIES } from '../components/atoms/CategorySelector';
import DatePicker from '../components/atoms/DatePicker';
import TimePicker from '../components/atoms/TimePicker';
import ImageGalleryUploader from '../components/atoms/ImageGalleryUploader';
import AddressAutocomplete from '../components/atoms/AddressAutocomplete';
import MapView from '../components/MapView';
import { api } from '../services/api';
import { getSession } from '../services/supabase';
import { getGradientByIndex, type GradientId } from '../constants/gradients';
import { geocodeAddress } from '../services/geocoding';
import type { EventDetailResponse, TicketOption } from '../types/events';
import type { AddressSuggestion } from '../services/geocoding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_WIDTH * 0.75;

function formatDateGerman(isoDate: string): string {
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat('de-DE', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }).format(d);
}

function localIso(date: string, time: string): string {
    const d = new Date(`${date}T${time}:00`);
    const tzOffset = -d.getTimezoneOffset();
    const sign = tzOffset >= 0 ? '+' : '-';
    const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
    return `${date}T${time}:00${sign}${pad(Math.floor(Math.abs(tzOffset) / 60))}:${pad(Math.abs(tzOffset) % 60)}`;
}

type DrawerKey = 'image' | 'description' | 'categories' | 'location' | 'tickets' | 'details' | 'gallery' | null;

export default function EventEditScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();

    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);    const [error, setError] = useState<string | null>(null);
    const [activeDrawer, setActiveDrawer] = useState<DrawerKey>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedGradientId, setSelectedGradientId] = useState<GradientId | undefined>(undefined);
    const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
    const [gradientInitialized, setGradientInitialized] = useState(false);

    // Draft fields
    const [draftDescription, setDraftDescription] = useState('');
    const [draftCategories, setDraftCategories] = useState<string[]>([]);
    const [draftAddress, setDraftAddress] = useState<AddressSuggestion | null>(null);
    const [draftMaxCapacity, setDraftMaxCapacity] = useState('');
    const [draftEndDate, setDraftEndDate] = useState('');
    const [draftEndTime, setDraftEndTime] = useState('');
    const [draftGalleryImages, setDraftGalleryImages] = useState<string[]>([]);
    const [draftTickets, setDraftTickets] = useState<TicketOption[]>([]);
    const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
    const pendingSavesRef = useRef(0);
    const mountedRef = useRef(false);

    const isWeb = Platform.OS === 'web';
    const isDraft = event?.status === 'draft';

    const loadEvent = useCallback(async (silent = false) => {
        if (!eventId) return;
        try {
            if (!silent) setLoading(true);
            const token = await getSession();
            const data = await api.getEventById(eventId, token || undefined);
            if (!data.is_host) {
                router.replace(`/event/${eventId}`);
                return;
            }
            setEvent(data);
            const loc = data.location;
            if (loc) {
                if (loc.latitude != null && loc.longitude != null) {
                    setMapCoords({ lat: loc.latitude, lng: loc.longitude });
                } else if (loc.city) {
                    geocodeAddress(
                        loc.house_number ? `${loc.street} ${loc.house_number}` : loc.street,
                        loc.city, loc.postal_code ?? null, loc.country ?? null,
                    ).then((c) => { if (c) setMapCoords(c); });
                }
            }
        } catch (e) {
            setError('Event konnte nicht geladen werden');
            console.error(e);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [eventId]);

    useEffect(() => { loadEvent(); }, [loadEvent]);

    useFocusEffect(useCallback(() => {
        if (!mountedRef.current) { mountedRef.current = true; return; }
        if (pendingSavesRef.current === 0) loadEvent(true);
    }, [loadEvent]));

    useEffect(() => {
        if (event && !gradientInitialized) {
            if (event.gradient_id != null) {
                setSelectedGradientId(event.gradient_id as GradientId);
            }
            setGradientInitialized(true);
        }
    }, [event, gradientInitialized]);

    const saveField = async (patch: Record<string, any>) => {
        if (!event) return;
        // Apply optimistic update immediately (including media_urls which backend may not support)
        setEvent(prev => {
            if (!prev) return prev;
            const next = { ...prev };
            for (const key of Object.keys(patch)) {
                if (key === 'location') {
                    next.location = { ...prev.location, ...patch.location } as any;
                } else if (key === 'category') {
                    (next as any).category = patch.category;
                } else {
                    (next as any)[key] = patch[key];
                }
            }
            return next;
        });

        // Strip fields the backend doesn't support via PATCH
        // Remove keys whose value is null unless they are explicitly nullable fields
        const nullableFields = new Set(['description', 'category', 'ends_at', 'max_capacity', 'gradient_id', 'media_urls']);
        const cleanPatch = Object.fromEntries(
            Object.entries(patch).filter(([k, v]) => v !== null || nullableFields.has(k))
        );
        if (Object.keys(cleanPatch).length === 0) return;

        pendingSavesRef.current += 1;
        setSaving(true);
        try {
            const token = await getSession();
            if (!token) return;
            const updated = await api.updateEvent(event.event_id, cleanPatch, token);
            setEvent(prev => {
                if (!prev) return updated;
                return {
                    ...updated,
                    ticket_options: updated.ticket_options ?? prev.ticket_options,
                    media_urls: updated.media_urls ?? prev.media_urls ?? [],
                };
            });
        } catch (e) {
            console.error('[saveField] failed:', e);
            // Keep optimistic state on failure to avoid losing user changes
        } finally {
            pendingSavesRef.current -= 1;
            setSaving(false);
        }
    };

    const saveTickets = async (tickets: TicketOption[]) => {
        if (!event) return;
        setEvent(prev => prev ? { ...prev, ticket_options: tickets } : prev);
        pendingSavesRef.current += 1;
        setSaving(true);
        try {
            const token = await getSession();
            if (!token) return;
            const saved = await api.syncTicketOptions(event.event_id, tickets, token);
            console.log('[saveTickets] API response:', saved);
            if (Array.isArray(saved)) {
                setEvent(prev => prev ? { ...prev, ticket_options: saved } : prev);
            }
        } catch (e) {
            console.error('[saveTickets] failed:', e);
            // Keep optimistic state instead of rolling back — server might just not support this endpoint yet
        } finally {
            pendingSavesRef.current -= 1;
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        // TODO Backend: status 'draft' -> 'published' muss unterstuetzt werden
        await saveField({ status: 'published' });
        if (event) router.replace(`/event/${event.event_id}`);
    };

    const openDrawer = (key: DrawerKey) => {
        if (!event) return;
        switch (key) {
            case 'description':
                setDraftDescription(event.description || '');
                break;
            case 'categories': {
                const raw = event.category ? event.category.split(',').map(c => c.trim()).filter(Boolean) : [];
                // Normalize: accept both IDs and labels (legacy data may store labels)
                const normalized = raw.map(val => {
                    const byId = CATEGORIES.find(c => c.id === val);
                    if (byId) return byId.id;
                    const byLabel = CATEGORIES.find(c => c.label.toLowerCase() === val.toLowerCase());
                    return byLabel ? byLabel.id : null;
                }).filter((id): id is string => id !== null);
                setDraftCategories(normalized);
                break;
            }
            case 'location': {
                const loc = event.location;
                if (loc?.street && loc?.city) {
                    const addr: AddressSuggestion = {
                        street: loc.street,
                        houseNumber: loc.house_number ?? null,
                        postalCode: loc.postal_code ?? null,
                        city: loc.city,
                        country: loc.country ?? 'Deutschland',
                        displayLabel: [
                            loc.house_number ? `${loc.street} ${loc.house_number}` : loc.street,
                            [loc.postal_code, loc.city].filter(Boolean).join(' '),
                        ].filter(Boolean).join(', '),
                        lat: 0,
                        lng: 0,
                    };
                    setDraftAddress(addr);
                    // Koordinaten nachladen damit die Karte korrekt zentriert ist
                    geocodeAddress(
                        loc.house_number ? `${loc.street} ${loc.house_number}` : loc.street,
                        loc.city,
                        loc.postal_code ?? null,
                        loc.country ?? null,
                    ).then((coords) => {
                        if (coords) setDraftAddress(prev => prev ? { ...prev, lat: coords.lat, lng: coords.lng } : prev);
                    });
                } else {
                    setDraftAddress(null);
                }
                break;
            }
            case 'details':
                setDraftMaxCapacity(event.max_capacity ? String(event.max_capacity) : '');
                if (event.ends_at) {
                    const end = new Date(event.ends_at);
                    setDraftEndDate(end.toISOString().slice(0, 10));
                    setDraftEndTime(end.toISOString().slice(11, 16));
                } else {
                    setDraftEndDate('');
                    setDraftEndTime('');
                }
                break;
            case 'gallery': {
                // Exclude the cover image from the gallery editor
                const cover = effectiveImageUrl;
                const galleryOnly = (event.media_urls || []).filter(u => u !== cover);
                setDraftGalleryImages(galleryOnly);
                break;
            }
            case 'tickets':
                setDraftTickets(event.ticket_options?.length ? [...event.ticket_options] : []);
                break;
            case 'image':
                setShowImageModal(true);
                return;
        }
        setActiveDrawer(key);
    };

    const closeDrawer = () => {
        if (!event || !activeDrawer) { setActiveDrawer(null); return; }
        switch (activeDrawer) {
            case 'description':
                if (draftDescription !== (event.description || ''))
                    saveField({ description: draftDescription || null });
                break;
            case 'categories': {
                const newCat = draftCategories.join(',');
                if (newCat !== (event.category || ''))
                    saveField({ category: newCat || null });
                break;
            }
            case 'location':
                if (draftAddress) {
                    saveField({
                        location: {
                            city: draftAddress.city,
                            street: draftAddress.street || undefined,
                            house_number: draftAddress.houseNumber || undefined,
                            postal_code: draftAddress.postalCode || undefined,
                            country: draftAddress.country || undefined,
                        },
                    });
                }
                break;
            case 'details': {
                const patch: Record<string, any> = {};
                patch.max_capacity = draftMaxCapacity ? Number(draftMaxCapacity) : null;
                patch.ends_at = (draftEndDate && draftEndTime) ? localIso(draftEndDate, draftEndTime) : null;
                saveField(patch);
                break;
            }
            case 'gallery': {
                // Prepend cover image so the backend's full-replace doesn't lose it
                const coverUrl = effectiveImageUrl;
                const allUrls = coverUrl
                    ? [coverUrl, ...draftGalleryImages.filter(u => u !== coverUrl)]
                    : draftGalleryImages;
                if (JSON.stringify(allUrls) !== JSON.stringify(event.media_urls || []))
                    saveField({ media_urls: allUrls });
                break;
            }
            case 'tickets':
                saveTickets(draftTickets);
                break;
        }
        setActiveDrawer(null);
    };

    // Ticket helpers
    const addTicket = () => {
        setDraftTickets(prev => [...prev, { name: '', price: 0, sort_order: prev.length, quantity_limit: null, description: null }]);
    };
    const updateTicket = (idx: number, field: keyof TicketOption, value: any) => {
        setDraftTickets(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    };
    const removeTicket = (idx: number) => {
        setDraftTickets(prev => prev.filter((_, i) => i !== idx).map((t, i) => ({ ...t, sort_order: i })));
    };

    // --- Loading / Error ---
    if (loading) {
        return (
            <ScreenWithNav showBottomNav={false}>
                <View style={[styles.center, { backgroundColor: colors.background }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWithNav>
        );
    }
    if (error || !event) {
        return (
            <ScreenWithNav showBottomNav={false}>
                <View style={[styles.center, { backgroundColor: colors.background }]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error || 'Event nicht gefunden'}</Text>
                    <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => loadEvent()}>
                        <Text style={[styles.retryText, { color: colors.onPrimary }]}>Erneut versuchen</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWithNav>
        );
    }

    // An event is expired when ends_at (or starts_at as fallback) is in the past
    const referenceDate = event.ends_at ? new Date(event.ends_at) : new Date(event.starts_at);
    const isExpired = referenceDate < new Date();

    if (isExpired) {
        return (
            <ScreenWithNav showBottomNav={false}>
                <View style={[styles.center, { backgroundColor: colors.background }]}>
                    <Ionicons name="time-outline" size={48} color={colors.onSurfaceVariant} style={{ marginBottom: 16 }} />
                    <Text style={[styles.errorText, { color: colors.onSurface, fontWeight: '700', fontSize: 20 }]}>Event abgelaufen</Text>
                    <Text style={[styles.errorText, { color: colors.onSurfaceVariant, marginTop: 8, fontSize: 15 }]}>
                        Abgelaufene Events können nicht mehr bearbeitet werden.
                    </Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.surfaceContainer, marginTop: 24 }]}
                        onPress={() => router.push(`/event/${event.event_id}`)}
                    >
                        <Text style={[styles.retryText, { color: colors.onSurface }]}>Event ansehen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: 'transparent', marginTop: 8 }]}
                        onPress={() => router.canGoBack() ? router.back() : router.push('/my-events')}
                    >
                        <Text style={[styles.retryText, { color: colors.onSurfaceVariant }]}>Zurück</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWithNav>
        );
    }

    // --- Derived ---
    const hostInitial = event.host_name?.charAt(0).toUpperCase() || 'H';
    const categories = event.category ? event.category.split(',').map(c => c.trim()) : [];
    const heroGradient = selectedGradientId !== undefined ? getGradientByIndex(selectedGradientId) : getGradientByIndex(0);
    const effectiveImageUrl = localImageUrl ?? event.image_url;
    const showImage = effectiveImageUrl && selectedGradientId === undefined;

    // Validation
    const missingFields: string[] = [];
    if (!effectiveImageUrl && selectedGradientId === undefined) missingFields.push('Titelbild');
    if (!event.location?.city) missingFields.push('Ort');

    const glassCard = [
        styles.glassCard,
        isWeb
            ? { backgroundColor: isDark ? 'rgba(18,19,26,0.55)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any
            : { backgroundColor: isDark ? 'rgba(18,19,26,0.85)' : 'rgba(255,255,255,0.85)' },
    ];
    const glassActionBtn = [
        styles.actionButton,
        { borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' },
        isWeb
            ? { backgroundColor: isDark ? 'rgba(30,31,38,0.6)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any
            : { backgroundColor: isDark ? 'rgba(30,31,38,0.85)' : 'rgba(255,255,255,0.85)' },
    ];

    const renderEditOverlay = (onPress: () => void) => (
        <TouchableOpacity style={styles.editOverlay} onPress={onPress} hitSlop={8}>
            <View style={[styles.editBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                <Ionicons name="pencil" size={14} color={colors.onSurface} />
            </View>
        </TouchableOpacity>
    );

    const renderPlaceholder = (text: string, icon: string, onPress: () => void) => (
        <TouchableOpacity
            style={[styles.placeholder, { borderColor: colors.outlineVariant }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Ionicons name={icon as any} size={28} color={colors.onSurfaceVariant} />
            <Text style={[styles.placeholderText, { color: colors.onSurfaceVariant }]}>{text}</Text>
        </TouchableOpacity>
    );

    return (
        <ScreenWithNav showBottomNav={false}>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                {/* === Blurred background === */}
                {showImage ? (
                    <Image
                        source={{ uri: effectiveImageUrl! }}
                        style={[styles.bgImage, isWeb ? { filter: 'blur(60px) saturate(1.8) brightness(0.7)' } as any : {}]}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient colors={heroGradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bgImage} />
                )}
                <View style={[styles.bgOverlay, { backgroundColor: isDark ? 'rgba(12,13,20,0.35)' : 'rgba(248,249,250,0.25)' }]} />

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* === Hero Image with Title Overlay (identical to EventScreen) === */}
                    <View style={[styles.heroContainer, isWeb && { height: 320 }]}>
                        {showImage ? (
                            <Image source={{ uri: effectiveImageUrl! }} style={styles.heroImage} resizeMode="cover" />
                        ) : (
                            <LinearGradient colors={heroGradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroImage} />
                        )}

                        {/* Back Button */}
                        <TouchableOpacity
                            style={[styles.backButton, isWeb
                                ? { backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as any
                                : { backgroundColor: colors.surfaceContainerHigh }
                            ]}
                            onPress={() => router.canGoBack() ? router.back() : router.push('/my-events')}
                        >
                            <Ionicons name="arrow-back" size={24} color="#ffffff" />
                        </TouchableOpacity>

                        {/* Vorschau + Titelbild-Buttons (overlaid on hero, top right) */}
                        <View style={styles.heroTopRight}>
                            <TouchableOpacity style={styles.heroBtn} onPress={() => router.push(`/event/${event.event_id}?preview=1`)}>
                                <Ionicons name="eye-outline" size={18} color="#ffffff" />
                                <Text style={styles.editImageText}>Vorschau</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.heroBtn} onPress={() => openDrawer('image')}>
                                <Ionicons name="camera-outline" size={18} color="#ffffff" />
                                <Text style={styles.editImageText}>Ändern</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Title Overlay */}
                        <View style={styles.titleOverlay}>
                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.titleGradient}>
                                <Text style={styles.heroTitle}>{event.title}</Text>
                                <Text style={styles.heroDate}>{formatDateGerman(event.starts_at)}</Text>
                            </LinearGradient>
                        </View>

                        {/* Draft Badge */}
                        {isDraft && (
                            <View style={styles.draftBadge}>
                                <Text style={styles.draftBadgeText}>ENTWURF</Text>
                            </View>
                        )}
                    </View>

                    {/* === Content Container (mirrors EventScreen exactly) === */}
                    <View style={styles.content}>

                        {/* Host Card (same as EventScreen) */}
                        <View style={[...glassCard, styles.hostCard]}>
                            <View style={styles.hostInfo}>
                                <View style={[styles.hostAvatar, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.hostAvatarText, { color: colors.onPrimary }]}>{hostInitial}</Text>
                                </View>
                                <View style={styles.hostTextContainer}>
                                    <Text style={[styles.hostName, { color: colors.onSurface }]}>{event.host_name || 'Host'}</Text>
                                    <Text style={[styles.hostSubtitle, { color: colors.onSurfaceVariant }]}>Veranstalter</Text>
                                </View>
                            </View>
                        </View>

                        {/* Kategorien Section (same as EventScreen) */}
                        {categories.length > 0 ? (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => openDrawer('categories')}>
                                <View style={{ position: 'relative' }}>
                                    <EventCategories categories={categories} editMode={false} />
                                    {renderEditOverlay(() => openDrawer('categories'))}
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.section}>
                                {renderPlaceholder('Kategorien hinzufügen', 'pricetags-outline', () => openDrawer('categories'))}
                            </View>
                        )}

                        {/* Beschreibung Section (same as EventScreen) */}
                        {event.description ? (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => openDrawer('description')}>
                                <View style={[...glassCard, styles.section, { padding: 20, position: 'relative' }]}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Beschreibung</Text>
                                    <Text style={[styles.description, { color: colors.onSurface }]}>{event.description}</Text>
                                    {renderEditOverlay(() => openDrawer('description'))}
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.section}>
                                {renderPlaceholder('Beschreibung hinzufügen', 'document-text-outline', () => openDrawer('description'))}
                            </View>
                        )}

                        {/* Location Section (same as EventScreen) */}
                        {event.location?.city ? (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => openDrawer('location')}>
                                <View style={[styles.section, { position: 'relative' }]}>
                                    <View style={[...glassCard, styles.locationCard]}>
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
                                        </View>
                                        <View style={styles.mapPreview}>
                                            {mapCoords ? (
                                                <MapView
                                                    markers={[{
                                                        lat: mapCoords.lat,
                                                        lng: mapCoords.lng,
                                                        title: event.location?.city ?? '',
                                                        eventId: '__preview__',
                                                    }]}
                                                    centerLat={mapCoords.lat}
                                                    centerLng={mapCoords.lng}
                                                    zoom={15}
                                                    isDark={isDark}
                                                    showPopups={false}
                                                    interactive={false}
                                                />
                                            ) : (
                                                <View style={[styles.mapPreview, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' }]}>
                                                    <Ionicons name="map-outline" size={48} color={colors.onSurfaceVariant} />
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    {renderEditOverlay(() => openDrawer('location'))}
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.section}>
                                {renderPlaceholder('Ort hinzufügen *', 'location-outline', () => openDrawer('location'))}
                            </View>
                        )}

                        {/* Ticket Options Section */}
                        {event.ticket_options?.length > 0 ? (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => openDrawer('tickets')}>
                                <View style={[...glassCard, styles.section, { padding: 20, position: 'relative' }]}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Ticketoptionen</Text>
                                    {event.ticket_options.map((t, i) => (
                                        <View key={i} style={[styles.ticketRow, i < event.ticket_options.length - 1 && { borderBottomColor: colors.outlineVariant, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.ticketRowName, { color: colors.onSurface }]}>{t.name}</Text>
                                                {t.description && <Text style={[styles.ticketRowDesc, { color: colors.onSurfaceVariant }]} numberOfLines={1}>{t.description}</Text>}
                                            </View>
                                            <Text style={[styles.ticketRowPrice, { color: colors.onSurface }]}>
                                                {t.price === 0 ? 'Kostenlos' : `${t.price.toFixed(2)} €`}
                                            </Text>
                                        </View>
                                    ))}
                                    {renderEditOverlay(() => openDrawer('tickets'))}
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.section}>
                                {renderPlaceholder('Tickets konfigurieren', 'ticket-outline', () => openDrawer('tickets'))}
                            </View>
                        )}

                        {/* Galerie Section (same as EventScreen) */}
                        {event.media_urls && event.media_urls.length > 0 ? (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => openDrawer('gallery')}>
                                <View style={[styles.section, { position: 'relative' }]}>
                                    <EventImageGallery images={event.media_urls} />
                                    {renderEditOverlay(() => openDrawer('gallery'))}
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.section}>
                                {renderPlaceholder('Bilder hinzufügen', 'images-outline', () => openDrawer('gallery'))}
                            </View>
                        )}

                        {/* Details Info (capacity, end date, visibility) */}
                        <TouchableOpacity activeOpacity={0.8} onPress={() => openDrawer('details')}>
                            <View style={[...glassCard, styles.section, { padding: 20, position: 'relative' }]}>
                                <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Details</Text>
                                <View style={styles.detailRow}>
                                    <Ionicons name="people-outline" size={18} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.detailText, { color: colors.onSurface }]}>
                                        {event.max_capacity ? `Max. ${event.max_capacity} Teilnehmer` : 'Keine Begrenzung'}
                                    </Text>
                                </View>
                                {event.ends_at ? (
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={18} color={colors.onSurfaceVariant} />
                                        <Text style={[styles.detailText, { color: colors.onSurface }]}>Endet: {formatDateGerman(event.ends_at)}</Text>
                                    </View>
                                ) : (
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={18} color={colors.onSurfaceVariant} />
                                        <Text style={[styles.detailText, { color: colors.onSurface }]}>Endzeit: optional</Text>
                                    </View>
                                )}
                                {renderEditOverlay(() => openDrawer('details'))}
                            </View>
                        </TouchableOpacity>

                        <View style={{ height: 120 }} />
                    </View>
                </ScrollView>

                {/* === Sticky Bottom Bar === */}
                <View style={[
                    styles.stickyBar,
                    { borderTopColor: colors.outlineVariant },
                    isWeb
                        ? { backgroundColor: isDark ? 'rgba(18,19,26,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any
                        : { backgroundColor: colors.surface },
                ]}>
                    <View style={styles.stickyBarInfo}>
                        {saving ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={[styles.stickyBarStatus, { color: colors.onSurfaceVariant }]}>Speichert...</Text>
                            </View>
                        ) : isDraft ? (
                            missingFields.length > 0 ? (
                                <Text style={[styles.stickyBarStatus, { color: colors.onSurfaceVariant }]}>Noch offen: {missingFields.join(', ')}</Text>
                            ) : (
                                <Text style={[styles.stickyBarStatus, { color: colors.primary }]}>Bereit zum Veröffentlichen</Text>
                            )
                        ) : (
                            <Text style={[styles.stickyBarStatus, { color: colors.primary }]}>Veröffentlicht</Text>
                        )}
                    </View>
                    {isDraft ? (
                        <TouchableOpacity
                            style={[styles.stickyBarButton, { backgroundColor: missingFields.length > 0 ? colors.surfaceContainer : colors.primary }]}
                            onPress={handlePublish}
                            disabled={missingFields.length > 0}
                        >
                            <Text style={[styles.stickyBarButtonText, { color: missingFields.length > 0 ? colors.onSurfaceVariant : colors.onPrimary }]}>Veröffentlichen</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.stickyBarButton, { backgroundColor: colors.surfaceContainer }]}
                            onPress={() => router.push(`/event/${event.event_id}`)}
                        >
                            <Text style={[styles.stickyBarButtonText, { color: colors.onSurface }]}>Zum Event</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* === DRAWERS === */}

                <ImageSelectionModal
                    visible={showImageModal}
                    onClose={() => setShowImageModal(false)}
                    onSelectGradient={(id) => {
                        setSelectedGradientId(id);
                        setLocalImageUrl(null);
                        setShowImageModal(false);
                        saveField({ gradient_id: id });
                    }}
                    onSelectStockImage={(url, photographer) => {
                        setSelectedGradientId(undefined);
                        setLocalImageUrl(url);
                        setShowImageModal(false);
                        saveField({ image_url: url, gradient_id: null });
                    }}
                    selectedGradientId={selectedGradientId}
                    selectedImageUrl={effectiveImageUrl || undefined}
                    eventTitle={event?.title}
                />

                <EditDrawer visible={activeDrawer === 'description'} onClose={closeDrawer} title="Beschreibung">
                    <TextInput
                        style={[styles.drawerTextarea, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
                        value={draftDescription}
                        onChangeText={setDraftDescription}
                        placeholder="Beschreibe dein Event..."
                        placeholderTextColor={colors.onSurfaceVariant}
                        multiline
                        textAlignVertical="top"
                    />
                </EditDrawer>

                <EditDrawer visible={activeDrawer === 'categories'} onClose={closeDrawer} title="Kategorien">
                    <CategorySelector value={draftCategories} onChange={setDraftCategories} />
                </EditDrawer>

                <EditDrawer visible={activeDrawer === 'location'} onClose={closeDrawer} title="Ort bearbeiten">
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>Adresse *</Text>
                    <AddressAutocomplete
                        initialSelected={draftAddress}
                        onSelect={setDraftAddress}
                        onClear={() => setDraftAddress(null)}
                    />
                    {draftAddress && draftAddress.lat !== 0 && draftAddress.lng !== 0 && (
                        <View style={styles.drawerMap}>
                            <MapView
                                markers={[{
                                    lat: draftAddress.lat,
                                    lng: draftAddress.lng,
                                    title: draftAddress.displayLabel,
                                    eventId: '__preview__',
                                }]}
                                centerLat={draftAddress.lat}
                                centerLng={draftAddress.lng}
                                zoom={15}
                                isDark={isDark}
                                showPopups={false}
                            />
                        </View>
                    )}
                </EditDrawer>

                <EditDrawer visible={activeDrawer === 'tickets'} onClose={closeDrawer} title="Ticketoptionen">
                    {draftTickets.map((ticket, idx) => (
                        <View key={idx} style={[styles.ticketCard, { borderColor: colors.outlineVariant, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                            <View style={styles.ticketCardHeader}>
                                <Text style={[styles.ticketCardNum, { color: colors.onSurfaceVariant }]}>Ticket {idx + 1}</Text>
                                <TouchableOpacity onPress={() => removeTicket(idx)} hitSlop={8}>
                                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                            <TextInput style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]} value={ticket.name} onChangeText={v => updateTicket(idx, 'name', v)} placeholder="Ticket-Name (z.B. Early Bird)" placeholderTextColor={colors.onSurfaceVariant} />
                            <View style={styles.drawerRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>Preis (€)</Text>
                                    <TextInput style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]} value={ticket.price ? String(ticket.price) : ''} onChangeText={v => updateTicket(idx, 'price', parseFloat(v) || 0)} placeholder="0.00" placeholderTextColor={colors.onSurfaceVariant} keyboardType="decimal-pad" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>Limit</Text>
                                    <TextInput style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]} value={ticket.quantity_limit != null ? String(ticket.quantity_limit) : ''} onChangeText={v => updateTicket(idx, 'quantity_limit', v ? parseInt(v) : null)} placeholder="Unbegrenzt" placeholderTextColor={colors.onSurfaceVariant} keyboardType="number-pad" />
                                </View>
                            </View>
                            <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>Beschreibung (optional)</Text>
                            <TextInput style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]} value={ticket.description || ''} onChangeText={v => updateTicket(idx, 'description', v || null)} placeholder="Kurze Beschreibung" placeholderTextColor={colors.onSurfaceVariant} />
                        </View>
                    ))}
                    <TouchableOpacity style={[styles.addTicketBtn, { borderColor: colors.primary }]} onPress={addTicket}>
                        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                        <Text style={[styles.addTicketText, { color: colors.primary }]}>Ticket hinzufügen</Text>
                    </TouchableOpacity>
                </EditDrawer>

                <EditDrawer visible={activeDrawer === 'details'} onClose={closeDrawer} title="Details bearbeiten">
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>Max. Teilnehmer</Text>
                    <TextInput style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]} value={draftMaxCapacity} onChangeText={setDraftMaxCapacity} placeholder="Keine Begrenzung" placeholderTextColor={colors.onSurfaceVariant} keyboardType="number-pad" />
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant, marginTop: 16 }]}>Endet am (optional)</Text>
                    <View style={[styles.drawerRow, { zIndex: 50 }]}>
                        <View style={{ flex: 1 }}>
                            <DatePicker value={draftEndDate} onChange={setDraftEndDate} placeholder="TT.MM.JJJJ" minDate={new Date()} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <TimePicker value={draftEndTime} onChange={setDraftEndTime} placeholder="HH:MM" />
                        </View>
                    </View>
                </EditDrawer>

                <EditDrawer visible={activeDrawer === 'gallery'} onClose={closeDrawer} title="Bildergalerie">
                    <ImageGalleryUploader images={draftGalleryImages} onChange={setDraftGalleryImages} maxImages={10} />
                </EditDrawer>

            </View>
        </ScreenWithNav>
    );
}

// Styles mirror EventScreen exactly, plus edit-specific additions
const styles = StyleSheet.create({
    root: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    errorText: { fontSize: 16, marginBottom: 16, textAlign: 'center' },
    retryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 48 },
    retryText: { fontSize: 14, fontWeight: '600' },

    // Background (same as EventScreen)
    bgImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    bgOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    glassCard: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },

    // Hero (same as EventScreen)
    heroContainer: { position: 'relative', height: HERO_HEIGHT },
    heroImage: { width: '100%', height: '100%' },
    backButton: {
        position: 'absolute', top: Platform.OS === 'ios' ? 50 : 16, left: 16,
        width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
    },
    heroTopRight: {
        position: 'absolute', top: Platform.OS === 'ios' ? 52 : 18, right: 16,
        flexDirection: 'row', gap: 8, alignItems: 'center',
    },
    heroBtn: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, gap: 6, backgroundColor: 'rgba(0,0,0,0.45)',
    },
    editImageText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
    titleOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
    titleGradient: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 24 },
    heroTitle: { fontSize: 32, fontWeight: '700', color: '#ffffff', marginBottom: 8, letterSpacing: -0.5 },
    heroDate: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
    draftBadge: {
        position: 'absolute', top: Platform.OS === 'ios' ? 52 : 18, alignSelf: 'center',
        backgroundColor: 'rgba(255,180,0,0.9)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12,
    },
    draftBadgeText: { color: '#000', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

    // Content (same as EventScreen)
    content: { paddingHorizontal: 24, paddingTop: 24 },

    // Host Card (same as EventScreen)
    hostCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginBottom: 16 },
    hostInfo: { flexDirection: 'row', alignItems: 'center' },
    hostAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    hostAvatarText: { fontSize: 20, fontWeight: '700' },
    hostTextContainer: { justifyContent: 'center' },
    hostName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
    hostSubtitle: { fontSize: 14 },

    // Action Buttons (same as EventScreen)
    actionButtons: { flexDirection: 'row', gap: 8, marginBottom: 32 },
    actionButton: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 4, minHeight: 72 },
    actionButtonText: { fontSize: 12, fontWeight: '600' },

    // Sections (same as EventScreen)
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginBottom: 12 },
    sectionTitleRequired: { fontSize: 13, fontWeight: '700', lineHeight: 13 },

    // Location (same as EventScreen)
    locationCard: { padding: 16 },
    locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    locationTextContainer: { flex: 1 },
    locationAddress: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    locationCity: { fontSize: 14 },
    mapPreview: { height: 200, borderRadius: 12, overflow: 'hidden' },

    // Host Row (same as EventScreen)
    hostRow: { flexDirection: 'row', alignItems: 'center' },
    hostNameLarge: { fontSize: 18, fontWeight: '600', marginLeft: 12 },

    // Description (same as EventScreen)
    description: { fontSize: 15, lineHeight: 24 },

    // Edit overlay button
    editOverlay: { position: 'absolute', top: 8, right: 8, zIndex: 10 },
    editBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

    // Placeholder for empty sections
    placeholder: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 32, alignItems: 'center', justifyContent: 'center', gap: 8 },
    placeholderText: { fontSize: 14, fontWeight: '500' },

    // Ticket preview in content
    ticketRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    ticketRowName: { fontSize: 15, fontWeight: '600' },
    ticketRowDesc: { fontSize: 13, marginTop: 2 },
    ticketRowPrice: { fontSize: 15, fontWeight: '700', marginLeft: 12 },

    // Details rows
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    detailText: { fontSize: 15 },

    // Sticky bar (same as EventScreen)
    stickyBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    stickyBarInfo: { flex: 1, marginRight: 16 },
    stickyBarStatus: { fontSize: 14, fontWeight: '500' },
    stickyBarButton: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
    stickyBarButtonText: { fontSize: 16, fontWeight: '700' },

    // Drawer form styles
    drawerTextarea: {
        fontSize: 16, fontWeight: '500', paddingVertical: 12, paddingHorizontal: 16,
        borderWidth: 1, borderRadius: 12, minHeight: 160,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    drawerInput: {
        fontSize: 16, fontWeight: '500', paddingVertical: 12, paddingHorizontal: 16,
        borderWidth: 1, borderRadius: 12, marginBottom: 12,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    drawerLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.2 },
    drawerRow: { flexDirection: 'row', gap: 12 },
    drawerMap: { marginTop: 16, height: 200, borderRadius: 14, overflow: 'hidden' },

    // Ticket card in drawer
    ticketCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
    ticketCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    ticketCardNum: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    addTicketBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 2, borderStyle: 'dashed', borderRadius: 14, marginTop: 4 },
    addTicketText: { fontSize: 15, fontWeight: '600' },
});
