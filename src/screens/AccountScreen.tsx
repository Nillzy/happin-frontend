import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    Pressable,
    Animated,
    Image,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useTheme } from '@/hooks/use-theme';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import DarkLightToggle from '../components/atoms/DarkLightToggle';
import ReminderSettingsSection from '../components/atoms/ReminderSettingsSection';
import { PersonIcon, EditIcon, LogoutIcon, TrashIcon, ChevronRightIcon, MailIcon, GpsIcon } from '../components/atoms/icons';
import {
    getUserProfile,
    updateDisplayName,
    updateName,
    signOut,
    deleteAccount,
    getSession,
    UserProfile,
    uploadProfilePicture,
} from '../services/supabase';
import { useUserCity } from '@/hooks/use-user-city';
import CityAutocomplete from '../components/atoms/CityAutocomplete';
import { searchCities } from '../services/geocoding';
import { api } from '../services/api';
import { SkeletonBox } from '../components/atoms/SkeletonBox';

// ── Profilbild-Platzhalter ────────────────────────────────────────────────────

function AvatarPlaceholder({
    displayName,
    avatarUrl,
    colors,
    onPress,
}: {
    displayName: string | null;
    avatarUrl: string | null;
    colors: ReturnType<typeof useTheme>['colors'];
    onPress: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    const initials = displayName
        ? displayName.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : null;

    return (
        <Pressable
            onPress={onPress}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            style={[avatarStyles.circle, { backgroundColor: avatarUrl ? 'transparent' : colors.primaryContainer }]}
        >
            {avatarUrl ? (
                <Image
                    source={{ uri: avatarUrl }}
                    style={avatarStyles.image}
                    resizeMode="cover"
                />
            ) : initials ? (
                <Text style={[avatarStyles.initials, { color: colors.onPrimaryContainer }]}>{initials}</Text>
            ) : (
                <PersonIcon size={40} color={colors.onPrimaryContainer} />
            )}

            {/* Stift-Overlay beim Hovern */}
            {hovered && (
                <View style={[avatarStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                    <EditIcon size={22} color="#fff" />
                </View>
            )}
        </Pressable>
    );
}

const avatarStyles = StyleSheet.create({
    circle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    initials: {
        fontSize: 32,
        fontWeight: '700',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// ── Statistik-Kachel ──────────────────────────────────────────────────────────

function SkeletonPulse({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [opacity]);

    return (
        <Animated.View style={[skeletonStyles.bar, { backgroundColor: colors.outlineVariant, opacity }]} />
    );
}

const skeletonStyles = StyleSheet.create({
    bar: { width: 40, height: 22, borderRadius: 6, marginBottom: 4 },
});

function StatTile({ label, value, loading, colors }: { label: string; value: string | number; loading: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
    return (
        <View style={[statStyles.tile, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            {loading
                ? <SkeletonPulse colors={colors} />
                : <Text style={[statStyles.value, { color: colors.onSurface }]}>{value}</Text>
            }
            <Text style={[statStyles.label, { color: colors.onSurfaceVariant }]}>{label}</Text>
        </View>
    );
}

const statStyles = StyleSheet.create({
    tile: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    value: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
});

// ── Aktionszeile ──────────────────────────────────────────────────────────────

function ActionRow({
    icon,
    label,
    onPress,
    destructive = false,
    colors,
}: {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    destructive?: boolean;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    return (
        <TouchableOpacity
            style={[actionStyles.row, { borderBottomColor: colors.outlineVariant }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={actionStyles.left}>
                {icon}
                <Text style={[actionStyles.label, { color: destructive ? colors.error : colors.onSurface }]}>
                    {label}
                </Text>
            </View>
            <ChevronRightIcon size={18} color={destructive ? colors.error : colors.onSurfaceVariant} />
        </TouchableOpacity>
    );
}

const actionStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    label: {
        fontSize: 15,
        fontWeight: '500',
    },
});

// ── Hauptscreen ───────────────────────────────────────────────────────────────

export default function AccountScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{ events_attended: number; events_created: number; tickets_total: number; participants_total: number } | null>(null);

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [savingName, setSavingName] = useState(false);

    const [editingRealName, setEditingRealName] = useState(false);
    const [firstNameInput, setFirstNameInput] = useState('');
    const [lastNameInput, setLastNameInput] = useState('');
    const [savingRealName, setSavingRealName] = useState(false);

    const { city: savedCity, cityLabel: savedCityLabel, saveCity } = useUserCity();
    const [editingCity, setEditingCity] = useState(false);
    const [cityInput, setCityInput] = useState('');
    const [savingCity, setSavingCity] = useState(false);
    const [locating, setLocating] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        const p = await getUserProfile();
        if (!p) {
            router.replace('/login');
            return;
        }
        setProfile(p);
        setNameInput(p.displayName ?? '');
        setFirstNameInput(p.firstName ?? '');
        setLastNameInput(p.lastName ?? '');
        setLoading(false);
        const token = await getSession();
        if (token) {
            api.getUserStats(token).then(setStats).catch(() => {});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleSaveName = async () => {
        if (!nameInput.trim()) return;
        setSavingName(true);
        try {
            await updateDisplayName(nameInput.trim());
            setProfile(prev => prev ? { ...prev, displayName: nameInput.trim() } : prev);
            setEditingName(false);
        } catch {
            Alert.alert('Fehler', 'Anzeigename konnte nicht gespeichert werden.');
        } finally {
            setSavingName(false);
        }
    };

    const handleSaveRealName = async () => {
        setSavingRealName(true);
        try {
            await updateName(firstNameInput.trim(), lastNameInput.trim());
            setProfile(prev => prev ? {
                ...prev,
                firstName: firstNameInput.trim() || null,
                lastName: lastNameInput.trim() || null,
            } : prev);
            setEditingRealName(false);
        } catch {
            Alert.alert('Fehler', 'Name konnte nicht gespeichert werden.');
        } finally {
            setSavingRealName(false);
        }
    };

    const handleSaveCity = async (name?: string, label?: string) => {
        setSavingCity(true);
        try {
            await saveCity(name ?? cityInput, label);
            setEditingCity(false);
        } finally {
            setSavingCity(false);
        }
    };

    const handleLocateMe = async () => {
        setLocating(true);
        try {
            let latitude: number;
            let longitude: number;

            if (Platform.OS === 'web') {
                // Web: native Browser Geolocation API
                const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
                );
                latitude = pos.coords.latitude;
                longitude = pos.coords.longitude;
            } else {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Kein Zugriff', 'Standortzugriff wurde nicht erlaubt.');
                    return;
                }
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                latitude = pos.coords.latitude;
                longitude = pos.coords.longitude;
            }

            const apiKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
            const res = await fetch(
                `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${apiKey}&language=de`
            );
            const data = await res.json();
            const cityFeature = data.features?.find((f: any) =>
                f.place_type?.some((t: string) => ['municipality', 'place', 'city'].includes(t))
            );

            let rawName = '';
            if (cityFeature) {
                rawName = cityFeature.text ?? '';
            } else {
                const firstFeature = data.features?.[0];
                const context: any[] = firstFeature?.context ?? [];
                const cityCtx = context.find((c: any) => c.id?.startsWith('county.'))
                    ?? context.find((c: any) => c.id?.startsWith('subregion.'))
                    ?? context.find((c: any) => c.id?.startsWith('municipality.'))
                    ?? context.find((c: any) => c.id?.startsWith('place.'))
                    ?? context.find((c: any) => c.id?.startsWith('locality.'));
                rawName = cityCtx?.text ?? '';
            }

            if (!rawName) return;
            const suggestions = await searchCities(rawName);
            const best = suggestions[0];
            if (best) {
                setCityInput(best.name);
                setEditingCity(true);
                await handleSaveCity(best.name, best.displayLabel);
            } else {
                setCityInput(rawName);
                setEditingCity(true);
            }
        } catch {
            Alert.alert('Fehler', 'Standort konnte nicht ermittelt werden.');
        } finally {
            setLocating(false);
        }
    };

    const handleUploadAvatar = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Berechtigung erforderlich', 'Wir benötigen Zugriff auf deine Fotos, um ein Profilbild hochzuladen.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (result.canceled) return;

            const imageUri = result.assets[0].uri;

            // Upload to Supabase
            const avatarUrl = await uploadProfilePicture(imageUri);

            // Update backend
            const token = await getSession();
            if (!token) throw new Error('Not authenticated');
            await api.updateAvatar(token, avatarUrl);

            // Update local state
            setProfile(prev => prev ? { ...prev, avatarUrl } : prev);

            Alert.alert('Erfolg', 'Profilbild wurde aktualisiert.');
        } catch (error) {
            console.error('Avatar upload failed:', error);
            Alert.alert('Fehler', 'Profilbild konnte nicht hochgeladen werden.');
        }
    };

    const handleLogout = async () => {
        const confirmed = Platform.OS === 'web'
            ? window.confirm('Möchtest du dich wirklich abmelden?')
            : await new Promise<boolean>(resolve =>
                Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
                    { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'Abmelden', style: 'destructive', onPress: () => resolve(true) },
                ])
            );
        if (!confirmed) return;
        try { await signOut(); } finally { router.replace('/login'); }
    };

    const handleDeleteAccount = async () => {
        const confirmed = Platform.OS === 'web'
            ? window.confirm('Konto löschen? Diese Aktion kann nicht rückgängig gemacht werden.')
            : await new Promise<boolean>(resolve =>
                Alert.alert(
                    'Konto löschen',
                    'Diese Aktion kann nicht rückgängig gemacht werden. Dein Konto und alle Daten werden dauerhaft gelöscht.',
                    [
                        { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
                        { text: 'Konto löschen', style: 'destructive', onPress: () => resolve(true) },
                    ]
                )
            );
        if (!confirmed) return;
        try {
            await deleteAccount();
            router.replace('/login');
        } catch {
            Alert.alert('Fehler', 'Konto konnte nicht gelöscht werden. Bitte versuche es später erneut.');
        }
    };

    if (loading) {
        return (
            <ScreenWithNav>
                <View style={[s.root, { backgroundColor: colors.background }]}>
                    <Navbar showCta={false} />
                    <ScrollView
                        contentContainerStyle={[s.scroll, Platform.OS === 'web' && s.scrollWeb]}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[s.innerContainer, Platform.OS === 'web' && { maxWidth: 700 }]}>
                            {/* Profil-Karte Skeleton */}
                            <View style={[s.profileCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                                <SkeletonBox width={88} height={88} borderRadius={44} />
                                <View style={{ flex: 1, gap: 10 }}>
                                    <SkeletonBox height={20} width="60%" borderRadius={7} />
                                    <SkeletonBox height={12} width="40%" borderRadius={5} />
                                    <SkeletonBox height={12} width="50%" borderRadius={5} />
                                    <SkeletonBox height={14} width="45%" borderRadius={5} style={{ marginTop: 4 }} />
                                </View>
                            </View>
                            {/* Übersicht Skeleton */}
                            <View style={s.section}>
                                <SkeletonBox height={18} width={80} borderRadius={6} style={{ marginBottom: 12 }} />
                                <View style={s.statRow}>
                                    <SkeletonBox height={72} borderRadius={16} style={{ flex: 1 }} />
                                    <View style={s.statGap} />
                                    <SkeletonBox height={72} borderRadius={16} style={{ flex: 1 }} />
                                </View>
                                <View style={[s.statRow, { marginTop: 8 }]}>
                                    <SkeletonBox height={72} borderRadius={16} style={{ flex: 1 }} />
                                    <View style={s.statGap} />
                                    <SkeletonBox height={72} borderRadius={16} style={{ flex: 1 }} />
                                </View>
                            </View>
                            {/* Einstellungen Skeleton */}
                            <View style={s.section}>
                                <SkeletonBox height={18} width={110} borderRadius={6} style={{ marginBottom: 12 }} />
                                <SkeletonBox height={90} borderRadius={16} />
                            </View>
                            {/* Konto Skeleton */}
                            <View style={s.section}>
                                <SkeletonBox height={18} width={60} borderRadius={6} style={{ marginBottom: 12 }} />
                                <SkeletonBox height={150} borderRadius={16} />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </ScreenWithNav>
        );
    }

    return (
        <ScreenWithNav>
            <Head><title>Konto – Happin</title></Head>
            <View style={[s.root, { backgroundColor: colors.background }]}>
                <Navbar showCta={false} />
                <ScrollView
                    contentContainerStyle={[s.scroll, Platform.OS === 'web' && s.scrollWeb]}
                    showsVerticalScrollIndicator={false}
                >
                <View style={[s.innerContainer, Platform.OS === 'web' && { maxWidth: 700 }]}>
                {/* ── Profilkopf ── */}
                <View style={[s.profileCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                    <AvatarPlaceholder
                        displayName={(profile?.displayName ?? `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()) || null}
                        avatarUrl={profile?.avatarUrl ?? null}
                        colors={colors}
                        onPress={handleUploadAvatar}
                    />

                    <View style={s.profileInfo}>
                        {/* Anzeigename */}
                        <View style={s.nameRow}>
                            {editingName ? (
                                <View style={s.nameEditRow}>
                                    <TextInput
                                        style={[s.nameInput, {
                                            color: colors.onSurface,
                                            borderColor: colors.primary,
                                            backgroundColor: colors.surfaceContainerLow,
                                        }]}
                                        value={nameInput}
                                        onChangeText={setNameInput}
                                        autoFocus
                                        returnKeyType="done"
                                        onSubmitEditing={handleSaveName}
                                        placeholder="Anzeigename"
                                        placeholderTextColor={colors.outline}
                                    />
                                    <TouchableOpacity
                                        style={[s.saveBtn, { backgroundColor: savingName ? colors.surfaceContainerHigh : colors.primary }]}
                                        onPress={handleSaveName}
                                        disabled={savingName}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[s.saveBtnText, { color: savingName ? colors.onSurfaceVariant : colors.onPrimary }]}>
                                            {savingName ? '…' : 'Speichern'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <Text style={[s.displayName, { color: colors.onSurface }]} numberOfLines={1}>
                                        {(profile?.displayName ?? `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()) || 'Kein Name gesetzt'}
                                    </Text>
                                    <TouchableOpacity onPress={() => setEditingName(true)} activeOpacity={0.7} style={s.editBtn}>
                                        <EditIcon size={16} color={colors.onSurfaceVariant} />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {/* E-Mail (nur Anzeige) */}
                        <Text style={[s.infoLabel, { color: colors.onSurfaceVariant }]}>E-Mail</Text>
                        <Text style={[s.infoValue, { color: colors.onSurface }]}>{profile?.email}</Text>

                        {/* Vor- und Nachname */}
                        <Text style={[s.infoLabel, { color: colors.onSurfaceVariant }]}>Vor- & Nachname</Text>
                        {editingRealName ? (
                            <View style={{ gap: 6, marginBottom: 10 }}>
                                <View style={s.nameEditRow}>
                                    <TextInput
                                        style={[s.nameInput, { flex: 1, color: colors.onSurface, borderColor: colors.primary, backgroundColor: colors.surfaceContainerLow }]}
                                        value={firstNameInput}
                                        onChangeText={setFirstNameInput}
                                        autoFocus
                                        placeholder="Vorname"
                                        placeholderTextColor={colors.outline}
                                        returnKeyType="next"
                                    />
                                    <TextInput
                                        style={[s.nameInput, { flex: 1, color: colors.onSurface, borderColor: colors.primary, backgroundColor: colors.surfaceContainerLow }]}
                                        value={lastNameInput}
                                        onChangeText={setLastNameInput}
                                        placeholder="Nachname"
                                        placeholderTextColor={colors.outline}
                                        returnKeyType="done"
                                        onSubmitEditing={handleSaveRealName}
                                    />
                                </View>
                                <View style={s.nameEditRow}>
                                    <TouchableOpacity
                                        style={[s.saveBtn, { backgroundColor: savingRealName ? colors.surfaceContainerHigh : colors.primary }]}
                                        onPress={handleSaveRealName}
                                        disabled={savingRealName}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[s.saveBtnText, { color: savingRealName ? colors.onSurfaceVariant : colors.onPrimary }]}>
                                            {savingRealName ? '…' : 'Speichern'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setEditingRealName(false)} style={s.editBtn}>
                                        <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>Abbrechen</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={[s.nameRow, { marginBottom: 10 }]}>
                                <Text style={[s.infoValue, { color: colors.onSurface, marginBottom: 0, flex: 1 }]}>
                                    {[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Nicht angegeben'}
                                </Text>
                                <TouchableOpacity onPress={() => setEditingRealName(true)} activeOpacity={0.7} style={s.editBtn}>
                                    <EditIcon size={16} color={colors.onSurfaceVariant} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Statistiken ── */}
                <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.onBackground }]}>Übersicht</Text>
                    <View style={s.statRow}>
                        <StatTile label="Events besucht" value={stats?.events_attended ?? 0} loading={stats === null} colors={colors} />
                        <View style={s.statGap} />
                        <StatTile label="Events erstellt" value={stats?.events_created ?? 0} loading={stats === null} colors={colors} />
                    </View>
                    <View style={[s.statRow, { marginTop: 8 }]}>
                        <StatTile label="Tickets" value={stats?.tickets_total ?? 0} loading={stats === null} colors={colors} />
                        <View style={s.statGap} />
                        <StatTile label="Teilnehmer" value={stats?.participants_total ?? 0} loading={stats === null} colors={colors} />
                    </View>
                </View>

                {/* ── Einstellungen ── */}
                <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.onBackground }]}>Einstellungen</Text>
                    <View style={[s.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                        <View style={[s.settingRow, { borderBottomColor: colors.outlineVariant }]}>
                            <Text style={[s.settingLabel, { color: colors.onSurfaceVariant }]}>Mein Standort</Text>
                            {editingCity ? (
                                <CityAutocomplete
                                    value={cityInput}
                                    onChange={setCityInput}
                                    onSelect={(suggestion) => {
                                        handleSaveCity(suggestion.name, suggestion.displayLabel);
                                    }}
                                    onCancel={() => setEditingCity(false)}
                                    onSubmit={() => handleSaveCity()}
                                    saving={savingCity}
                                />
                            ) : (
                                <View style={s.settingValueRow}>
                                    <Text style={[s.settingValue, { color: savedCity ? colors.onSurface : colors.outline }]}>
                                        {savedCityLabel || 'Nicht gesetzt'}
                                    </Text>
                                    <View style={s.settingActions}>
                                        <TouchableOpacity
                                            onPress={handleLocateMe}
                                            activeOpacity={0.7}
                                            style={s.editBtn}
                                            disabled={locating}
                                        >
                                            {locating
                                                ? <ActivityIndicator size="small" color={colors.primary} />
                                                : <GpsIcon size={20} color={colors.primary} />
                                            }
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => { setCityInput(savedCity); setEditingCity(true); }}
                                            activeOpacity={0.7}
                                            style={s.editBtn}
                                        >
                                            <EditIcon size={16} color={colors.onSurfaceVariant} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                        <ReminderSettingsSection />
                        <View style={[actionStyles.row, { borderBottomWidth: 0 }]}>
                            <View style={actionStyles.left}>
                                <Text style={[actionStyles.label, { color: colors.onSurface }]}>Design</Text>
                            </View>
                            <DarkLightToggle />
                        </View>
                    </View>
                </View>

                {/* ── Konto-Aktionen ── */}
                <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.onBackground }]}>Konto</Text>
                    <View style={[s.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                        {/* E-Mail ändern — demnächst verfügbar */}
                        <View style={[actionStyles.row, { borderBottomColor: colors.outlineVariant, opacity: 0.45 }]}>
                            <View style={actionStyles.left}>
                                <MailIcon size={20} color={colors.onSurface} />
                                <Text style={[actionStyles.label, { color: colors.onSurface }]}>E-Mail-Adresse ändern</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, fontStyle: 'italic' }}>Demnächst</Text>
                        </View>
                        <ActionRow
                            icon={<LogoutIcon size={20} color={colors.onSurface} />}
                            label="Abmelden"
                            onPress={handleLogout}
                            colors={colors}
                        />
                        <View style={[s.lastRow]}>
                            <ActionRow
                                icon={<TrashIcon size={20} color={colors.error} />}
                                label="Konto löschen"
                                onPress={handleDeleteAccount}
                                destructive
                                colors={colors}
                            />
                        </View>
                    </View>
                </View>

                <Footer />
                </View>
            </ScrollView>
        </View>
        </ScreenWithNav>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        paddingBottom: 48,
    },
    scrollWeb: {
        alignItems: 'center',
    },
    innerContainer: {
        width: '100%',
    },

    // Profil-Karte
    profileCard: {
        margin: 24,
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        flexDirection: 'row',
        gap: 16,
        alignItems: 'flex-start',
    },
    profileInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    displayName: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    editBtn: {
        padding: 4,
    },
    nameEditRow: {
        flex: 1,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    nameInput: {
        flex: 1,
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: Platform.OS === 'ios' ? 8 : 4,
        fontSize: 15,
        fontWeight: '600',
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    saveBtn: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    saveBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 10,
    },

    // Sektionen
    section: {
        marginHorizontal: 24,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },

    // Statistiken
    statRow: {
        flexDirection: 'row',
    },
    statGap: {
        width: 8,
    },

    // Karte für Aktionen
    card: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    lastRow: {
        // letzte Zeile ohne untere Trennlinie
    },

    // Einstellungs-Zeile
    settingRow: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        gap: 6,
    },
    settingLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    settingValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingValue: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    settingActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
});
