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
    Switch,
    Alert,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Head from 'expo-router/head';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import EditDrawer from '../components/atoms/EditDrawer';
import ImageSelectionModal from '../components/atoms/ImageSelectionModal';
import EventBlurBackground from '../components/event/EventBlurBackground';
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
import { getGradientByIndex, GRADIENT_PAIRS, type GradientId } from '../constants/gradients';
import { geocodeAddress, reverseGeocode } from '../services/geocoding';
import type { EventDetailResponse, TicketOption, CustomField, CustomFieldType } from '../types/events';
import type { AddressSuggestion } from '../services/geocoding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_WIDTH * 0.75;

const BRAND_COLOR_SWATCHES = [
    '#D4006B', '#8B3DC8', '#42dae2', '#00677f',
    '#FF6FA8', '#FF6B35', '#2ECC71', '#F64F59',
    '#1A1A2E', '#FFB300', '#191c1d', '#FFFFFF',
];

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

type DrawerKey = 'image' | 'title' | 'startDateTime' | 'description' | 'categories' | 'location' | 'tickets' | 'details' | 'gallery' | 'customFields' | 'branding' | null;

type ConnectStatus = {
    has_account: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    onboarding_complete: boolean;
};

const STRIPE_SETUP_MESSAGE =
    'Für kostenpflichtige öffentliche Events musst du zuerst Stripe Connect einrichten, damit Gäste Tickets kaufen können.';

function hasPaidTickets(tickets: TicketOption[]): boolean {
    return tickets.some(t => (t.price ?? 0) > 0);
}

function requiresStripeForEvent(isPublic: boolean, tickets: TicketOption[]): boolean {
    return isPublic && hasPaidTickets(tickets);
}

function isStripeReady(status: ConnectStatus | null): boolean {
    return !!status?.has_account && status.charges_enabled;
}

function parseApiError(e: unknown): { status?: number; detail?: string } {
    const msg = e instanceof Error ? e.message : String(e);
    const match = msg.match(/API error (\d+): (.+)/s);
    if (!match) return { detail: msg };
    try {
        const body = JSON.parse(match[2]);
        const raw = body.detail ?? match[2];
        const detail = typeof raw === 'string' ? raw : JSON.stringify(raw);
        return { status: Number(match[1]), detail };
    } catch {
        return { status: Number(match[1]), detail: match[2] };
    }
}

function isStripeSetupError(e: unknown): boolean {
    const { status, detail } = parseApiError(e);
    return status === 402 || !!detail?.toLowerCase().includes('payment setup') || !!detail?.toLowerCase().includes('not yet active');
}

export default function EventEditScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();

    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);    const [error, setError] = useState<string | null>(null);
    const [activeDrawer, setActiveDrawer] = useState<DrawerKey>(null);
    const [selectedGradientId, setSelectedGradientId] = useState<GradientId | undefined>(undefined);
    const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
    const [gradientInitialized, setGradientInitialized] = useState(false);

    // Draft fields
    const [draftTitle, setDraftTitle] = useState('');
    const [draftStartDate, setDraftStartDate] = useState('');
    const [draftStartTime, setDraftStartTime] = useState('');
    const [draftDescription, setDraftDescription] = useState('');
    const [draftCategories, setDraftCategories] = useState<string[]>([]);
    const [draftAddress, setDraftAddress] = useState<AddressSuggestion | null>(null);
    const [draftMaxCapacity, setDraftMaxCapacity] = useState('');
    const [draftMaxTicketsPerPerson, setDraftMaxTicketsPerPerson] = useState('');
    const [waitlistPromotionHours, setWaitlistPromotionHours] = useState<string>('24');
    const [draftIsPublic, setDraftIsPublic] = useState(true);
    const [draftLocationIsPrivate, setDraftLocationIsPrivate] = useState(false);
    const [draftShowWeather, setDraftShowWeather] = useState(false);
    const [draftEndDate, setDraftEndDate] = useState('');
    const [draftEndTime, setDraftEndTime] = useState('');
    const [draftGalleryImages, setDraftGalleryImages] = useState<string[]>([]);
    const [draftTickets, setDraftTickets] = useState<TicketOption[]>([]);
    const [draftCustomFields, setDraftCustomFields] = useState<CustomField[]>([]);
    const [draftPrimaryColor, setDraftPrimaryColor] = useState('');
    const [draftSecondaryColor, setDraftSecondaryColor] = useState('');
    const [draftBrandingGradientId, setDraftBrandingGradientId] = useState<GradientId | undefined>(undefined);
    const [draftBrandingUseImage, setDraftBrandingUseImage] = useState(false);
    const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [previewMapKey, setPreviewMapKey] = useState(0);

    // Location-Drawer: einheitlicher Zustand (kein Tab-System)
    const [draftLocText, setDraftLocText] = useState('');
    const [draftLocCoords, setDraftLocCoords] = useState<{ lat: number; lng: number } | null>(null);
    const drawerMapCenterRef = useRef<{ lat: number; lng: number } | null>(null);
    const [drawerMapKey, setDrawerMapKey] = useState(0);
    const [draftLocAddressConfirmed, setDraftLocAddressConfirmed] = useState(false);
    const [draftLocCity, setDraftLocCity] = useState<string | null>(null);
    const mapMovedRef = useRef(false);
    const pendingSavesRef = useRef(0);
    const mountedRef = useRef(false);
    const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
    const [connectLoading, setConnectLoading] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    useEffect(() => { loadEvent(); }, [loadEvent]);

    const loadConnectStatus = useCallback(async () => {
        try {
            const token = await getSession();
            if (!token) return;
            const status = await api.getConnectStatus(token);
            setConnectStatus(status);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (!event) return;
        if (!requiresStripeForEvent(event.is_public ?? true, event.ticket_options ?? [])) return;
        void loadConnectStatus();
    }, [event?.event_id, event?.is_public, event?.ticket_options, loadConnectStatus]);

    useFocusEffect(useCallback(() => {
        if (!mountedRef.current) { mountedRef.current = true; return; }
        if (pendingSavesRef.current === 0) loadEvent(true);
        void loadConnectStatus();
    }, [loadEvent, loadConnectStatus]));

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
                    const locPatch = patch.location as Record<string, any>;
                    const isCoordWithoutStreet = locPatch.latitude != null && locPatch.longitude != null
                        && !locPatch.street;
                    if (isCoordWithoutStreet) {
                        next.location = {
                            ...prev.location,
                            latitude: locPatch.latitude,
                            longitude: locPatch.longitude,
                            city: locPatch.city ?? undefined,
                            street: undefined,
                            house_number: undefined,
                            postal_code: undefined,
                            country: undefined,
                        } as any;
                    } else {
                        next.location = { ...prev.location, ...locPatch } as any;
                    }
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
        const nullableFields = new Set(['title', 'description', 'category', 'starts_at', 'ends_at', 'max_capacity', 'max_tickets_per_person', 'is_public', 'is_free', 'gradient_id', 'media_urls', 'accent_color_primary', 'accent_color_secondary', 'waitlist_promotion_hours']);
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
            if (updated.location?.latitude != null && updated.location?.longitude != null) {
                setMapCoords({ lat: updated.location.latitude, lng: updated.location.longitude });
                setPreviewMapKey(k => k + 1);
            }
        } catch (e) {
            console.error('[saveField] failed:', e);
            if (isStripeSetupError(e)) {
                Alert.alert('Stripe erforderlich', STRIPE_SETUP_MESSAGE);
                void loadConnectStatus();
            }
            // Keep optimistic state on failure to avoid losing user changes
        } finally {
            pendingSavesRef.current -= 1;
            setSaving(false);
        }
    };

    const saveTickets = async (tickets: TicketOption[]) => {
        if (!event) return false;
        setEvent(prev => prev ? { ...prev, ticket_options: tickets } : prev);
        pendingSavesRef.current += 1;
        setSaving(true);
        try {
            const token = await getSession();
            if (!token) return false;
            const saved = await api.syncTicketOptions(event.event_id, tickets, token);
            console.log('[saveTickets] API response:', saved);
            if (Array.isArray(saved)) {
                setEvent(prev => prev ? { ...prev, ticket_options: saved } : prev);
            }
            return true;
        } catch (e) {
            console.error('[saveTickets] failed:', e);
            if (isStripeSetupError(e)) {
                Alert.alert('Stripe erforderlich', STRIPE_SETUP_MESSAGE);
                void loadConnectStatus();
            }
            return false;
        } finally {
            pendingSavesRef.current -= 1;
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!event) return;
        const tickets = event.ticket_options ?? [];
        if (requiresStripeForEvent(event.is_public ?? true, tickets)) {
            let status = connectStatus;
            if (!status) {
                const token = await getSession();
                if (token) {
                    try {
                        status = await api.getConnectStatus(token);
                        setConnectStatus(status);
                    } catch {
                        /* ignore */
                    }
                }
            }
            if (!isStripeReady(status)) {
                Alert.alert('Stripe erforderlich', STRIPE_SETUP_MESSAGE);
                return;
            }
        }
        await saveField({ status: 'published' });
        router.replace(`/event/${event.event_id}`);
    };

    const handleStripeOnboarding = async () => {
        if (!event) return;
        setConnectLoading(true);
        try {
            const token = await getSession();
            if (!token) return;
            const { url } = await api.createOnboardingLink(token, event.event_id);
            Linking.openURL(url);
        } catch (err: unknown) {
            const { detail } = parseApiError(err);
            Alert.alert('Fehler', detail ?? 'Onboarding konnte nicht gestartet werden.');
        } finally {
            setConnectLoading(false);
        }
    };

    const openDrawer = (key: DrawerKey) => {
        if (!event) return;
        switch (key) {
            case 'title':
                setDraftTitle(event.title || '');
                break;
            case 'startDateTime': {
                const start = new Date(event.starts_at);
                const pad = (n: number) => String(n).padStart(2, '0');
                setDraftStartDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
                setDraftStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
                break;
            }
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
                if (loc?.latitude != null && loc?.longitude != null) {
                    setDraftLocCoords({ lat: loc.latitude, lng: loc.longitude });
                    drawerMapCenterRef.current = { lat: loc.latitude, lng: loc.longitude };
                    setDrawerMapKey(k => k + 1);
                    setDraftLocText('');
                    setDraftLocAddressConfirmed(false);
                    setDraftAddress(null);
                    mapMovedRef.current = false;
                } else if (loc?.street) {
                    setDraftLocText('');
                    setDraftLocCoords(null);
                    drawerMapCenterRef.current = null;
                    setDraftLocAddressConfirmed(false);
                    setDraftAddress(null);
                    mapMovedRef.current = false;
                    geocodeAddress(
                        loc.house_number ? `${loc.street} ${loc.house_number}` : loc.street,
                        loc.city ?? null,
                        loc.postal_code ?? null,
                        loc.country ?? null,
                    ).then(c => { if (c) { setDraftLocCoords(c); drawerMapCenterRef.current = c; setDrawerMapKey(k => k + 1); } });
                } else {
                    setDraftLocText('');
                    setDraftLocCoords(null);
                    setDraftLocAddressConfirmed(false);
                    setDraftAddress(null);
                }
                break;
            }
            case 'details':
                setDraftMaxCapacity(event.max_capacity ? String(event.max_capacity) : '');
                setDraftMaxTicketsPerPerson(event.max_tickets_per_person && event.max_tickets_per_person > 1 ? String(event.max_tickets_per_person) : '');
                setWaitlistPromotionHours(String(event.waitlist_promotion_hours ?? 24));
                setDraftIsPublic(event.is_public ?? true);
                setDraftLocationIsPrivate(event.location_is_private ?? false);
                setDraftShowWeather(event.show_weather_forecast ?? false);
                if (event.ends_at) {
                    const end = new Date(event.ends_at);
                    const pad = (n: number) => String(n).padStart(2, '0');
                    setDraftEndDate(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`);
                    setDraftEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
                } else {
                    setDraftEndDate('');
                    setDraftEndTime('');
                }
                void loadConnectStatus();
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
                void loadConnectStatus();
                break;
            case 'customFields':
                setDraftCustomFields(event.custom_fields?.length ? [...event.custom_fields] : []);
                break;
            case 'branding':
                setDraftPrimaryColor(event.accent_color_primary ?? '');
                setDraftSecondaryColor(event.accent_color_secondary ?? '');
                setDraftBrandingGradientId(selectedGradientId);
                setDraftBrandingUseImage(!!effectiveImageUrl && selectedGradientId === undefined);
                break;
            case 'image':
                break;
        }
        setActiveDrawer(key);
    };

    const saveBrandingDraft = async () => {
        if (!event) return;
        const hexRe = /^#[0-9A-Fa-f]{6}$/;
        const patch: Record<string, any> = {
            accent_color_primary: hexRe.test(draftPrimaryColor) ? draftPrimaryColor : null,
            accent_color_secondary: hexRe.test(draftSecondaryColor) ? draftSecondaryColor : null,
        };
        if (draftBrandingUseImage) {
            if (event.gradient_id != null) patch.gradient_id = null;
            setSelectedGradientId(undefined);
        } else if (draftBrandingGradientId !== undefined && draftBrandingGradientId !== event.gradient_id) {
            patch.gradient_id = draftBrandingGradientId;
        }
        const changed =
            patch.accent_color_primary !== (event.accent_color_primary ?? null) ||
            patch.accent_color_secondary !== (event.accent_color_secondary ?? null) ||
            'gradient_id' in patch;
        if (changed) await saveField(patch);
    };

    const closeDrawer = async () => {
        if (!event || !activeDrawer) { setActiveDrawer(null); return; }
        switch (activeDrawer) {
            case 'image':
                break;
            case 'title':
                if (draftTitle.trim() && draftTitle !== event.title)
                    saveField({ title: draftTitle.trim() });
                break;
            case 'startDateTime':
                if (draftStartDate && draftStartTime) {
                    const newStarts = localIso(draftStartDate, draftStartTime);
                    if (newStarts !== event.starts_at)
                        saveField({ starts_at: newStarts });
                }
                break;
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
                    // Neue Adresse über Autocomplete gewählt
                    saveField({
                        location: {
                            city: draftAddress.city || undefined,
                            street: draftAddress.street || undefined,
                            house_number: draftAddress.houseNumber || undefined,
                            postal_code: draftAddress.postalCode || undefined,
                            country: draftAddress.country || undefined,
                            latitude: draftLocCoords?.lat,
                            longitude: draftLocCoords?.lng,
                        },
                    });
                } else if (mapMovedRef.current && draftLocCoords) {
                    // Karte manuell verschoben — nur Koordinaten speichern
                    saveField({
                        location: {
                            city: draftLocCity || undefined,
                            latitude: draftLocCoords.lat,
                            longitude: draftLocCoords.lng,
                        },
                    });
                } else if (draftLocText.trim() && !draftLocCoords) {
                    saveField({ location: { street: draftLocText.trim() } });
                }
                break;
            case 'details': {
                const patch: Record<string, any> = {};
                patch.ends_at = (draftEndDate && draftEndTime) ? localIso(draftEndDate, draftEndTime) : null;
                patch.max_capacity = draftMaxCapacity ? Number(draftMaxCapacity) : null;
                patch.max_tickets_per_person = draftMaxTicketsPerPerson ? Number(draftMaxTicketsPerPerson) : null;
                patch.is_public = draftIsPublic;
                patch.location_is_private = draftLocationIsPrivate;
                patch.show_weather_forecast = draftShowWeather;
                if (!event.is_free) {
                    patch.waitlist_promotion_hours = parseInt(waitlistPromotionHours, 10) || 24;
                }
                if (
                    requiresStripeForEvent(draftIsPublic, event.ticket_options ?? [])
                    && !isStripeReady(connectStatus)
                ) {
                    Alert.alert('Stripe erforderlich', STRIPE_SETUP_MESSAGE);
                    return;
                }
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
            case 'tickets': {
                if (
                    requiresStripeForEvent(event.is_public ?? true, draftTickets)
                    && !isStripeReady(connectStatus)
                ) {
                    Alert.alert('Stripe erforderlich', STRIPE_SETUP_MESSAGE);
                    return;
                }
                const saved = await saveTickets(draftTickets);
                if (!saved) return;
                break;
            }
            case 'customFields':
                saveCustomFields(draftCustomFields);
                break;
            case 'branding':
                void saveBrandingDraft();
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

    // Custom field helpers
    const saveCustomFields = async (fields: CustomField[]) => {
        if (!event) return;
        setEvent(prev => prev ? { ...prev, custom_fields: fields } : prev);
        pendingSavesRef.current += 1;
        setSaving(true);
        try {
            const token = await getSession();
            if (!token) return;
            const saved = await api.syncCustomFields(event.event_id, fields, token);
            if (Array.isArray(saved)) {
                setEvent(prev => prev ? { ...prev, custom_fields: saved } : prev);
            }
        } catch (e) {
            console.error('[saveCustomFields] failed:', e);
        } finally {
            pendingSavesRef.current -= 1;
            setSaving(false);
        }
    };

    const addCustomField = () => {
        setDraftCustomFields(prev => [...prev, { label: '', field_type: 'text', is_required: false, options: null, sort_order: prev.length }]);
    };
    const updateCustomField = (idx: number, field: keyof CustomField, value: any) => {
        setDraftCustomFields(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
    };
    const removeCustomField = (idx: number) => {
        setDraftCustomFields(prev => prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, sort_order: i })));
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
    const effectivePrimaryEdit = event.accent_color_primary ?? colors.primary;

    // Validation
    const missingFields: string[] = [];
    if (!effectiveImageUrl && selectedGradientId === undefined) missingFields.push('Titelbild');
    if (!event.location?.city && !(event.location?.latitude != null && event.location?.longitude != null)) missingFields.push('Ort');
    if (
        requiresStripeForEvent(event.is_public ?? true, event.ticket_options ?? [])
        && !isStripeReady(connectStatus)
    ) {
        missingFields.push('Stripe');
    }

    const showStripeBannerInTickets = requiresStripeForEvent(event.is_public ?? true, draftTickets)
        && !isStripeReady(connectStatus);
    const showStripeBannerInDetails = requiresStripeForEvent(
        draftIsPublic,
        event.ticket_options?.length ? event.ticket_options : draftTickets,
    ) && !isStripeReady(connectStatus);
    const showStripeStatusOnOverview = requiresStripeForEvent(
        event.is_public ?? true,
        event.ticket_options ?? [],
    );

    const glassCard = [
        styles.glassCard,
        isWeb
            ? { backgroundColor: isDark ? 'rgba(18,19,26,0.55)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any
            : { backgroundColor: isDark ? 'rgba(18,19,26,0.85)' : 'rgba(255,255,255,0.85)' },
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
            <Head><title>{event.title} bearbeiten – Happin</title></Head>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <EventBlurBackground
                    imageUrl={showImage ? effectiveImageUrl : null}
                    gradientColors={heroGradient as [string, string]}
                />

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
                        <TouchableOpacity
                            style={[styles.homeButton, isWeb
                                ? { backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as any
                                : { backgroundColor: colors.surfaceContainerHigh }
                            ]}
                            onPress={() => router.push('/events' as any)}
                        >
                            <Ionicons name="compass-outline" size={22} color="#ffffff" />
                        </TouchableOpacity>

                        {/* Vorschau + Titelbild-Buttons (overlaid on hero, top right) */}
                        <View style={styles.heroTopRight}>
                            <TouchableOpacity style={styles.heroBtn} onPress={async () => {
                                if (activeDrawer === 'branding') {
                                    await saveBrandingDraft();
                                    setActiveDrawer(null);
                                }
                                router.push(`/event/${event.event_id}?preview=1`);
                            }}>
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
                                <TouchableOpacity onPress={() => openDrawer('title')} activeOpacity={0.8} style={styles.heroEditRow}>
                                    <Text style={styles.heroTitle}>{event.title}</Text>
                                    <View style={styles.heroEditIcon}>
                                        <Ionicons name="pencil" size={13} color="#ffffff" />
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => openDrawer('startDateTime')} activeOpacity={0.8} style={styles.heroEditRow}>
                                    <Text style={styles.heroDate}>{formatDateGerman(event.starts_at)}</Text>
                                    <View style={styles.heroEditIcon}>
                                        <Ionicons name="pencil" size={11} color="rgba(255,255,255,0.8)" />
                                    </View>
                                </TouchableOpacity>
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
                                <View style={[styles.hostAvatar, { backgroundColor: effectivePrimaryEdit }]}>
                                    <Text style={[styles.hostAvatarText, { color: '#ffffff' }]}>{hostInitial}</Text>
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
                                    <EventCategories categories={categories} editMode={false} accentColor={event.accent_color_primary} />
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
                        {(event.location?.city || (event.location?.latitude != null && event.location?.longitude != null)) ? (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => openDrawer('location')}>
                                <View style={[styles.section, { position: 'relative' }]}>
                                    <View style={[...glassCard, styles.locationCard]}>
                                        <View style={styles.locationHeader}>
                                            <View style={styles.locationTextContainer}>
                                                <Text style={[styles.locationAddress, { color: colors.onSurface }]}>
                                                    {event.location.street && event.location.house_number
                                                        ? `${event.location.street} ${event.location.house_number}`
                                                        : event.location.street
                                                        ? event.location.street
                                                        : (event.location.latitude != null && event.location.longitude != null)
                                                        ? `${event.location.latitude.toFixed(5)}, ${event.location.longitude.toFixed(5)}`
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
                                                    key={previewMapKey}
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
                            <View style={styles.section}>
                                <TouchableOpacity activeOpacity={0.8} onPress={() => openDrawer('tickets')}>
                                    <View style={[...glassCard, { padding: 20, position: 'relative' }]}>
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
                                {showStripeStatusOnOverview && (
                                    <TouchableOpacity
                                        style={[styles.stripeStatusRow, { borderTopColor: colors.outlineVariant }]}
                                        onPress={() => router.push(`/event/${event.event_id}/manage`)}
                                        activeOpacity={isStripeReady(connectStatus) ? 1 : 0.7}
                                        disabled={isStripeReady(connectStatus)}
                                    >
                                        {connectStatus === null ? (
                                            <>
                                                <ActivityIndicator size="small" color={colors.primary} />
                                                <Text style={[styles.stripeStatusText, { color: colors.onSurfaceVariant }]}>
                                                    Zahlungsstatus wird geladen…
                                                </Text>
                                            </>
                                        ) : isStripeReady(connectStatus) ? (
                                            <>
                                                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                                                <Text style={[styles.stripeStatusText, { color: '#4CAF50', fontWeight: '600' }]}>
                                                    Stripe eingerichtet – Zahlungen aktiv
                                                </Text>
                                            </>
                                        ) : !connectStatus.has_account ? (
                                            <>
                                                <Ionicons name="card-outline" size={18} color={colors.primary} />
                                                <Text style={[styles.stripeStatusText, { color: colors.onSurface, flex: 1 }]}>
                                                    Zahlungen einrichten
                                                </Text>
                                                <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
                                            </>
                                        ) : (
                                            <>
                                                <Ionicons name="time-outline" size={18} color={colors.tertiary} />
                                                <Text style={[styles.stripeStatusText, { color: colors.onSurface, flex: 1 }]}>
                                                    Verifizierung ausstehend
                                                </Text>
                                                <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View style={styles.section}>
                                {renderPlaceholder('Tickets konfigurieren', 'ticket-outline', () => openDrawer('tickets'))}
                            </View>
                        )}

                        {/* Custom Fields Section */}
                        {event.custom_fields && event.custom_fields.length > 0 ? (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => openDrawer('customFields')}>
                                <View style={[...glassCard, styles.section, { padding: 20, position: 'relative' }]}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Zusätzliche Felder</Text>
                                    {event.custom_fields.map((f, i) => (
                                        <View key={i} style={[styles.ticketRow, i < (event.custom_fields?.length ?? 0) - 1 && { borderBottomColor: colors.outlineVariant, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.ticketRowName, { color: colors.onSurface }]}>{f.label || '(Ohne Titel)'}</Text>
                                                <Text style={[styles.ticketRowDesc, { color: colors.onSurfaceVariant }]}>
                                                    {f.field_type === 'text' ? 'Textfeld' : f.field_type === 'textarea' ? 'Mehrzeiliges Textfeld' : f.field_type === 'single_select' ? 'Einfachauswahl' : 'Mehrfachauswahl'}
                                                    {f.is_required ? ' · Pflicht' : ''}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                    {renderEditOverlay(() => openDrawer('customFields'))}
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.section}>
                                {renderPlaceholder('Zusätzliche Felder hinzufügen', 'document-text-outline', () => openDrawer('customFields'))}
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
                                    <Ionicons name={event.is_public ? 'globe-outline' : 'lock-closed-outline'} size={18} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.detailText, { color: colors.onSurface }]}>
                                        {event.is_public ? 'Öffentlich' : 'Privat'}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="people-outline" size={18} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.detailText, { color: colors.onSurface }]}>
                                        {event.max_capacity ? `Max. ${event.max_capacity} Teilnehmer` : 'Keine Begrenzung'}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="person-add-outline" size={18} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.detailText, { color: colors.onSurface }]}>
                                        {event.max_tickets_per_person == null
                                            ? 'Unbegrenzt Tickets pro Gast'
                                            : event.max_tickets_per_person === 1
                                                ? '1 Ticket pro Gast'
                                                : `Max. ${event.max_tickets_per_person} Personen pro Gast`}
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

                        {/* Branding Section */}
                        <TouchableOpacity activeOpacity={0.8} onPress={() => openDrawer('branding')}>
                            <View style={[...glassCard, styles.section, { padding: 20, position: 'relative' }]}>
                                <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Design</Text>
                                <View style={styles.detailRow}>
                                    <Ionicons name="color-palette-outline" size={18} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.detailText, { color: colors.onSurface }]}>
                                        {event.accent_color_primary
                                            ? `Primärfarbe: ${event.accent_color_primary}`
                                            : 'Primärfarbe: App-Standard'}
                                    </Text>
                                    {event.accent_color_primary && (
                                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: event.accent_color_primary, marginLeft: 6 }} />
                                    )}
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="color-palette-outline" size={18} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.detailText, { color: colors.onSurface }]}>
                                        {event.accent_color_secondary
                                            ? `Sekundärfarbe: ${event.accent_color_secondary}`
                                            : 'Sekundärfarbe: App-Standard'}
                                    </Text>
                                    {event.accent_color_secondary && (
                                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: event.accent_color_secondary, marginLeft: 6 }} />
                                    )}
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="image-outline" size={18} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.detailText, { color: colors.onSurface }]}>
                                        {selectedGradientId !== undefined
                                            ? `Farbverlauf: Vorlage ${(selectedGradientId as number) + 1}`
                                            : 'Farbverlauf: Kein'}
                                    </Text>
                                </View>
                                {renderEditOverlay(() => openDrawer('branding'))}
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
                    visible={activeDrawer === 'image'}
                    onClose={closeDrawer}
                    onSelectGradient={(id) => {
                        setSelectedGradientId(id);
                        setLocalImageUrl(null);
                        closeDrawer();
                        saveField({ gradient_id: id });
                    }}
                    onSelectStockImage={(url, photographer) => {
                        setSelectedGradientId(undefined);
                        setLocalImageUrl(url);
                        closeDrawer();
                        saveField({ image_url: url, gradient_id: null });
                    }}
                    selectedGradientId={selectedGradientId}
                    selectedImageUrl={effectiveImageUrl || undefined}
                    eventTitle={event?.title}
                />

                <EditDrawer visible={activeDrawer === 'title'} onClose={closeDrawer} title="Titel bearbeiten">
                    <TextInput
                        style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant, marginBottom: 0 }]}
                        value={draftTitle}
                        onChangeText={setDraftTitle}
                        placeholder="Eventtitel"
                        placeholderTextColor={colors.onSurfaceVariant}
                    />
                </EditDrawer>

                <EditDrawer visible={activeDrawer === 'startDateTime'} onClose={closeDrawer} title="Startzeit bearbeiten">
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>Datum &amp; Uhrzeit</Text>
                    <View style={[styles.drawerRow, { zIndex: 50 }]}>
                        <View style={{ flex: 1 }}>
                            <DatePicker value={draftStartDate} onChange={setDraftStartDate} placeholder="TT.MM.JJJJ" minDate={new Date()} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <TimePicker value={draftStartTime} onChange={setDraftStartTime} placeholder="HH:MM" />
                        </View>
                    </View>
                </EditDrawer>

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
                    {/* Adressfeld mit Autocomplete */}
                    <AddressAutocomplete
                        value={draftLocText}
                        isSelected={draftLocAddressConfirmed}
                        onSelect={(addr) => {
                            setDraftAddress(addr);
                            setDraftLocText(addr.displayLabel);
                            setDraftLocCoords({ lat: addr.lat, lng: addr.lng });
                            drawerMapCenterRef.current = { lat: addr.lat, lng: addr.lng };
                            setDrawerMapKey(k => k + 1);
                            setDraftLocAddressConfirmed(true);
                        }}
                        onClear={() => {
                            setDraftAddress(null);
                            setDraftLocText('');
                            setDraftLocCoords(null);
                            setDraftLocAddressConfirmed(false);
                        }}
                    />

                    {/* Kartenbereich */}
                    <View style={styles.drawerMapWrapper}>
                        {draftLocCoords ? (
                            <>
                                <MapView
                                    key={drawerMapKey}
                                    markers={[]}
                                    centerLat={drawerMapCenterRef.current?.lat ?? draftLocCoords.lat}
                                    centerLng={drawerMapCenterRef.current?.lng ?? draftLocCoords.lng}
                                    zoom={15}
                                    isDark={isDark}
                                    showPopups={false}
                                    onMapMoved={async (lat, lng) => {
                                        mapMovedRef.current = true;
                                        setDraftLocCoords({ lat, lng });
                                        setDraftLocAddressConfirmed(false);
                                        setDraftLocText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                                        setDraftAddress(null);
                                        setDraftLocCity(null);
                                        const addr = await reverseGeocode(lat, lng);
                                        if (addr?.city) setDraftLocCity(addr.city);
                                    }}
                                />
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[styles.mapPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.outlineVariant }]}
                                activeOpacity={0.7}
                                onPress={() => { drawerMapCenterRef.current = { lat: 52.52, lng: 13.405 }; setDrawerMapKey(k => k + 1); setDraftLocCoords({ lat: 52.52, lng: 13.405 }); }}
                            >
                                <Ionicons name="map-outline" size={36} color={colors.onSurfaceVariant} />
                                <Text style={[styles.mapPlaceholderText, { color: colors.onSurfaceVariant }]}>
                                    Wähle den Eventort.
                                </Text>
                                <Text style={[styles.mapPlaceholderSub, { color: colors.onSurfaceVariant }]}>
                                    Tippe die Adresse ein oder tippe hier um die Karte zu öffnen
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {draftLocCoords && (
                        <Text style={[styles.coordsHint, { color: colors.onSurfaceVariant }]}>
                            Karte verschieben, um den Ort anzupassen
                        </Text>
                    )}
                </EditDrawer>

                <EditDrawer visible={activeDrawer === 'tickets'} onClose={closeDrawer} title="Ticketoptionen">
                    {showStripeBannerInTickets && (
                        <View style={[styles.stripeBanner, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                                <Ionicons name="card-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
                                <Text style={{ flex: 1, color: colors.onSurface, fontSize: 14, lineHeight: 20 }}>
                                    {STRIPE_SETUP_MESSAGE}
                                </Text>
                            </View>
                            {!connectStatus?.has_account ? (
                                <TouchableOpacity
                                    style={[styles.stripeBannerButton, { backgroundColor: colors.primary }]}
                                    onPress={handleStripeOnboarding}
                                    disabled={connectLoading}
                                >
                                    <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>
                                        {connectLoading ? 'Wird geladen…' : 'Stripe einrichten'}
                                    </Text>
                                </TouchableOpacity>
                            ) : !connectStatus.charges_enabled ? (
                                <>
                                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, marginBottom: 12 }}>
                                        Konto verbunden – Verifizierung ausstehend. Stripe prüft deine Angaben.
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.stripeBannerButton, { backgroundColor: colors.surfaceContainerHigh || colors.surface, borderWidth: 1, borderColor: colors.outlineVariant }]}
                                        onPress={loadConnectStatus}
                                    >
                                        <Text style={{ color: colors.onSurface, fontWeight: '600' }}>Status aktualisieren</Text>
                                    </TouchableOpacity>
                                </>
                            ) : null}
                        </View>
                    )}
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

                <EditDrawer visible={activeDrawer === 'customFields'} onClose={closeDrawer} title="Zusätzliche Felder">
                    {draftCustomFields.map((field, idx) => (
                        <View key={idx} style={[styles.ticketCard, { borderColor: colors.outlineVariant, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                            <View style={styles.ticketCardHeader}>
                                <Text style={[styles.ticketCardNum, { color: colors.onSurfaceVariant }]}>Feld {idx + 1}</Text>
                                <TouchableOpacity onPress={() => removeCustomField(idx)} hitSlop={8}>
                                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
                                value={field.label}
                                onChangeText={v => updateCustomField(idx, 'label', v)}
                                placeholder="Feldbezeichnung (z.B. Allergien?)"
                                placeholderTextColor={colors.onSurfaceVariant}
                            />
                            <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant, marginTop: 12 }]}>Feldtyp</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                {([['text', 'Text'], ['textarea', 'Mehrzeilig'], ['single_select', 'Einfachauswahl'], ['multi_select', 'Mehrfachauswahl']] as [CustomFieldType, string][]).map(([type, label]) => (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => {
                                            updateCustomField(idx, 'field_type', type);
                                            if (type === 'text' || type === 'textarea') {
                                                updateCustomField(idx, 'options', null);
                                            } else if (!field.options?.length) {
                                                updateCustomField(idx, 'options', ['']);
                                            }
                                        }}
                                        style={[styles.fieldTypeChip, {
                                            backgroundColor: field.field_type === type ? colors.primary : colors.surfaceContainerHigh,
                                            borderColor: field.field_type === type ? colors.primary : colors.outlineVariant,
                                        }]}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: field.field_type === type ? colors.onPrimary : colors.onSurface }}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {(field.field_type === 'single_select' || field.field_type === 'multi_select') && (
                                <View style={{ marginTop: 12 }}>
                                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>Optionen (eine pro Zeile)</Text>
                                    <TextInput
                                        style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant, minHeight: 80, textAlignVertical: 'top' }]}
                                        value={(field.options || []).join('\n')}
                                        onChangeText={v => updateCustomField(idx, 'options', v.split('\n'))}
                                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                                        placeholderTextColor={colors.onSurfaceVariant}
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>
                            )}
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}
                                onPress={() => updateCustomField(idx, 'is_required', !field.is_required)}
                            >
                                <Ionicons name={field.is_required ? 'checkbox' : 'square-outline'} size={22} color={field.is_required ? colors.primary : colors.onSurfaceVariant} />
                                <Text style={{ fontSize: 14, color: colors.onSurface }}>Pflichtfeld</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity style={[styles.addTicketBtn, { borderColor: colors.primary }]} onPress={addCustomField}>
                        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                        <Text style={[styles.addTicketText, { color: colors.primary }]}>Feld hinzufügen</Text>
                    </TouchableOpacity>
                </EditDrawer>

                <EditDrawer visible={activeDrawer === 'details'} onClose={closeDrawer} title="Details bearbeiten">
                    {showStripeBannerInDetails && (
                        <View style={[styles.stripeBanner, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant, marginBottom: 16 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                                <Ionicons name="card-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
                                <Text style={{ flex: 1, color: colors.onSurface, fontSize: 14, lineHeight: 20 }}>
                                    Öffentliche Events mit kostenpflichtigen Tickets erfordern Stripe Connect.
                                </Text>
                            </View>
                            {!connectStatus?.has_account ? (
                                <TouchableOpacity
                                    style={[styles.stripeBannerButton, { backgroundColor: colors.primary }]}
                                    onPress={handleStripeOnboarding}
                                    disabled={connectLoading}
                                >
                                    <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>
                                        {connectLoading ? 'Wird geladen…' : 'Stripe einrichten'}
                                    </Text>
                                </TouchableOpacity>
                            ) : !connectStatus.charges_enabled ? (
                                <TouchableOpacity
                                    style={[styles.stripeBannerButton, { backgroundColor: colors.surfaceContainerHigh || colors.surface, borderWidth: 1, borderColor: colors.outlineVariant }]}
                                    onPress={loadConnectStatus}
                                >
                                    <Text style={{ color: colors.onSurface, fontWeight: '600' }}>Status aktualisieren</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    )}
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>Endet am (optional)</Text>
                    <View style={[styles.drawerRow, { zIndex: 50 }]}>
                        <View style={{ flex: 1 }}>
                            <DatePicker value={draftEndDate} onChange={setDraftEndDate} placeholder="TT.MM.JJJJ" minDate={new Date()} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <TimePicker value={draftEndTime} onChange={setDraftEndTime} placeholder="HH:MM" />
                        </View>
                    </View>
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant, marginTop: 16 }]}>Max. Teilnehmer</Text>
                    <TextInput style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]} value={draftMaxCapacity} onChangeText={setDraftMaxCapacity} placeholder="Keine Begrenzung" placeholderTextColor={colors.onSurfaceVariant} keyboardType="number-pad" />
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant, marginTop: 4 }]}>Max. Personen pro Gast (inkl. Gast selbst)</Text>
                    <TextInput style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]} value={draftMaxTicketsPerPerson} onChangeText={setDraftMaxTicketsPerPerson} placeholder="Unbegrenzt (leer lassen)" placeholderTextColor={colors.onSurfaceVariant} keyboardType="number-pad" />
                    {!event.is_free && (
                        <View style={{ marginTop: 16 }}>
                            <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>
                                Zahlungsfrist für Warteliste (Stunden)
                            </Text>
                            <TextInput
                                style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
                                value={waitlistPromotionHours}
                                onChangeText={setWaitlistPromotionHours}
                                keyboardType="number-pad"
                                placeholder="24"
                                placeholderTextColor={colors.onSurfaceVariant}
                            />
                        </View>
                    )}
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant, marginTop: 16 }]}>Sichtbarkeit</Text>
                    <View style={[styles.segmentControl, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <TouchableOpacity
                            style={[styles.segmentOption, draftIsPublic && styles.segmentOptionActive, draftIsPublic && { backgroundColor: isDark ? colors.surface : '#ffffff' }]}
                            onPress={() => setDraftIsPublic(true)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.segmentOptionText, { color: draftIsPublic ? colors.onSurface : colors.onSurfaceVariant, fontWeight: draftIsPublic ? '700' : '500' }]}>Öffentlich</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segmentOption, !draftIsPublic && styles.segmentOptionActive, !draftIsPublic && { backgroundColor: isDark ? colors.surface : '#ffffff' }]}
                            onPress={() => setDraftIsPublic(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.segmentOptionText, { color: !draftIsPublic ? colors.onSurface : colors.onSurfaceVariant, fontWeight: !draftIsPublic ? '700' : '500' }]}>Privat</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant, marginTop: 16 }]}>Standort</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                        <Text style={{ color: colors.onSurface, fontSize: 15 }}>Standort privat halten</Text>
                        <Switch
                            value={draftLocationIsPrivate}
                            onValueChange={setDraftLocationIsPrivate}
                            trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
                            thumbColor={'#ffffff'}
                        />
                    </View>
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        Nur Zugesagte sehen die genaue Adresse
                    </Text>
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant, marginTop: 16 }]}>Wettervorhersage</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                        <Text style={{ color: colors.onSurface, fontSize: 15 }}>Wettervorhersage anzeigen</Text>
                        <Switch
                            value={draftShowWeather}
                            onValueChange={setDraftShowWeather}
                            trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
                            thumbColor={'#ffffff'}
                        />
                    </View>
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        Zeige Teilnehmern die vorhergesagte Temperatur und Wetterlage
                    </Text>
                </EditDrawer>

                <EditDrawer visible={activeDrawer === 'gallery'} onClose={closeDrawer} title="Bildergalerie">
                    <ImageGalleryUploader images={draftGalleryImages} onChange={setDraftGalleryImages} maxImages={10} />
                </EditDrawer>

                <EditDrawer visible={activeDrawer === 'branding'} onClose={closeDrawer} title="Design & Branding">
                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>Farbverlauf (Hintergrund)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        style={{ marginHorizontal: -24, paddingHorizontal: 24, marginBottom: 24 }}>
                        {/* Aktuelles Titelbild als erste Option (nur wenn vorhanden) */}
                        {effectiveImageUrl && (
                            <TouchableOpacity
                                onPress={() => {
                                    setDraftBrandingUseImage(true);
                                    setDraftBrandingGradientId(undefined);
                                    setSelectedGradientId(undefined);
                                }}
                                style={{
                                    width: 80, height: 56, borderRadius: 12, overflow: 'hidden',
                                    marginRight: 10, borderWidth: 2.5,
                                    borderColor: draftBrandingUseImage ? colors.primary : 'transparent',
                                }}
                            >
                                <Image source={{ uri: effectiveImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                {draftBrandingUseImage && (
                                    <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                                        <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                                    </View>
                                )}
                                <View style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 3,
                                    alignItems: 'center',
                                }}>
                                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '600' }}>Bild</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        {GRADIENT_PAIRS.map((gradient, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    setDraftBrandingGradientId(index as GradientId);
                                    setDraftBrandingUseImage(false);
                                    setSelectedGradientId(index as GradientId);
                                    setLocalImageUrl(null);
                                }}
                                style={{
                                    width: 80, height: 56, borderRadius: 12, overflow: 'hidden',
                                    marginRight: 10, borderWidth: 2.5,
                                    borderColor: !draftBrandingUseImage && draftBrandingGradientId === index ? colors.primary : 'transparent',
                                }}
                            >
                                <LinearGradient
                                    colors={gradient as [string, string]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={{ flex: 1 }}
                                />
                                {!draftBrandingUseImage && draftBrandingGradientId === index && (
                                    <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                                        <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant }]}>Primärfarbe</Text>
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 10 }}>
                        Schaltflächen, Avatar-Hintergrund, Highlights
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                        {BRAND_COLOR_SWATCHES.map((hex) => (
                            <TouchableOpacity
                                key={hex}
                                onPress={() => setDraftPrimaryColor(hex)}
                                style={{
                                    width: 36, height: 36, borderRadius: 18,
                                    backgroundColor: hex,
                                    borderWidth: draftPrimaryColor === hex ? 3 : 1,
                                    borderColor: draftPrimaryColor === hex ? colors.onSurface : colors.outlineVariant,
                                }}
                            />
                        ))}
                    </View>
                    <TextInput
                        style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
                        value={draftPrimaryColor}
                        onChangeText={setDraftPrimaryColor}
                        placeholder="#D4006B"
                        placeholderTextColor={colors.onSurfaceVariant}
                        autoCapitalize="characters"
                        maxLength={7}
                    />

                    <Text style={[styles.drawerLabel, { color: colors.onSurfaceVariant, marginTop: 16 }]}>Sekundärfarbe</Text>
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 10 }}>
                        Sekundäre Aktionen, Akzente
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                        {BRAND_COLOR_SWATCHES.map((hex) => (
                            <TouchableOpacity
                                key={hex}
                                onPress={() => setDraftSecondaryColor(hex)}
                                style={{
                                    width: 36, height: 36, borderRadius: 18,
                                    backgroundColor: hex,
                                    borderWidth: draftSecondaryColor === hex ? 3 : 1,
                                    borderColor: draftSecondaryColor === hex ? colors.onSurface : colors.outlineVariant,
                                }}
                            />
                        ))}
                    </View>
                    <TextInput
                        style={[styles.drawerInput, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
                        value={draftSecondaryColor}
                        onChangeText={setDraftSecondaryColor}
                        placeholder="#8B3DC8"
                        placeholderTextColor={colors.onSurfaceVariant}
                        autoCapitalize="characters"
                        maxLength={7}
                    />
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 8 }}>
                        Farben werden nach dem Schließen gespeichert und in der Vorschau übernommen.
                    </Text>
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

    glassCard: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },

    // Hero (same as EventScreen)
    heroContainer: { position: 'relative', height: HERO_HEIGHT },
    heroImage: { width: '100%', height: '100%' },
    backButton: {
        position: 'absolute', top: Platform.OS === 'ios' ? 50 : 16, left: 16,
        width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
    },
    homeButton: {
        position: 'absolute', top: Platform.OS === 'ios' ? 50 : 16, left: 64,
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
    heroEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroEditIcon: {
        width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
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
    stripeStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    stripeStatusText: { fontSize: 13, lineHeight: 18 },

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

    // Ticket card in drawer
    ticketCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
    ticketCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    ticketCardNum: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    addTicketBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 2, borderStyle: 'dashed', borderRadius: 14, marginTop: 4 },
    addTicketText: { fontSize: 15, fontWeight: '600' },
    fieldTypeChip: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 8 },

    // Location drawer map
    drawerMapWrapper: { marginTop: 16, height: 220, borderRadius: 14, overflow: 'hidden', position: 'relative' },

    mapPlaceholder: { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
    mapPlaceholderText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
    mapPlaceholderSub: { fontSize: 12, textAlign: 'center', opacity: 0.8 },
    coordsHint: { fontSize: 12, marginTop: 8, textAlign: 'center' },

    // Segment control for is_public toggle
    segmentControl: { flexDirection: 'row', borderRadius: 12, padding: 3, marginTop: 8 },
    segmentOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    segmentOptionActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
    segmentOptionText: { fontSize: 15 },
    stripeBanner: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
    stripeBannerButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
    checkmark: {
        position: 'absolute', top: 4, right: 4,
        width: 22, height: 22, borderRadius: 11,
        justifyContent: 'center', alignItems: 'center',
    },
});
