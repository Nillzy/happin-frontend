import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import DarkLightToggle from '../components/atoms/DarkLightToggle';
import { PersonIcon, EditIcon, LogoutIcon, TrashIcon, CalendarIcon, TicketIcon, ChevronRightIcon, MailIcon } from '../components/atoms/icons';
import {
    getUserProfile,
    updateDisplayName,
    updateName,
    signOut,
    deleteAccount,
    getSession,
    UserProfile,
} from '../services/supabase';
import { api } from '../services/api';

// ── Profilbild-Platzhalter ────────────────────────────────────────────────────

function AvatarPlaceholder({
    displayName,
    colors,
    onPress,
}: {
    displayName: string | null;
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
            style={[avatarStyles.circle, { backgroundColor: colors.primaryContainer }]}
        >
            {initials ? (
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

function StatTile({ label, value, colors }: { label: string; value: string | number; colors: ReturnType<typeof useTheme>['colors'] }) {
    return (
        <View style={[statStyles.tile, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <Text style={[statStyles.value, { color: colors.onSurface }]}>{value}</Text>
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
                    <Navbar showBack />
                    <View style={s.centered}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                </View>
            </ScreenWithNav>
        );
    }

    return (
        <ScreenWithNav>
            <View style={[s.root, { backgroundColor: colors.background }]}>
                <Navbar showBack />
                <ScrollView
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                >
                {/* ── Profilkopf ── */}
                <View style={[s.profileCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                    <AvatarPlaceholder
                        displayName={(profile?.displayName ?? `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()) || null}
                        colors={colors}
                        onPress={() => {
                            Alert.alert('Profilbild', 'Profilbild-Upload wird in einer späteren Version verfügbar sein.');
                        }}
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
                        <StatTile label="Events besucht" value={stats?.events_attended ?? '—'} colors={colors} />
                        <View style={s.statGap} />
                        <StatTile label="Events erstellt" value={stats?.events_created ?? '—'} colors={colors} />
                    </View>
                    <View style={[s.statRow, { marginTop: 8 }]}>
                        <StatTile label="Tickets" value={stats?.tickets_total ?? '—'} colors={colors} />
                        <View style={s.statGap} />
                        <StatTile label="Teilnehmer" value={stats?.participants_total ?? '—'} colors={colors} />
                    </View>
                </View>

                {/* ── Events ── */}
                <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.onBackground }]}>Events</Text>
                    <View style={[s.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                        <ActionRow
                            icon={<CalendarIcon size={20} color={colors.primary} />}
                            label="Meine Events verwalten"
                            onPress={() => router.push('/my-events')}
                            colors={colors}
                        />
                    </View>
                </View>

                {/* ── Tickets ── */}
                <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.onBackground }]}>Meine Tickets</Text>
                    <View style={[s.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                        <ActionRow
                            icon={<TicketIcon size={20} color={colors.secondary} />}
                            label="Alle Tickets anzeigen"
                            onPress={async () => {
                                try {
                                    const token = await getSession();
                                    if (!token) { router.replace('/login'); return; }
                                    const { tickets, total } = await api.getUserTickets(token);
                                    if (total === 0) {
                                        Alert.alert('Meine Tickets', 'Du hast noch keine Tickets.');
                                        return;
                                    }
                                    const list = tickets.map(t =>
                                        `• ${t.event_title} — ${t.ticket_option_name} (${t.status})`
                                    ).join('\n');
                                    Alert.alert(`Meine Tickets (${total})`, list);
                                } catch {
                                    Alert.alert('Fehler', 'Tickets konnten nicht geladen werden.');
                                }
                            }}
                            colors={colors}
                        />
                    </View>
                </View>

                {/* ── Einstellungen ── */}
                <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.onBackground }]}>Einstellungen</Text>
                    <View style={[s.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
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
});
