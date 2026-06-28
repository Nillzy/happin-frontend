import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Modal,
    PanResponder,
    Animated,
    Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/src/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import { parseTicketPayload, type TicketPayload } from '../utils/ticketToken';
import type { ScanTicketResponse } from '../types/host';

const blurActiveElement = () => {
    if (Platform.OS === 'web') {
        (document.activeElement as HTMLElement | null)?.blur();
    }
};

type ScanState = 'idle' | 'preview' | 'confirmed' | 'invalid';

interface ScanDisplay {
    state: ScanState;
    payload: TicketPayload | null;
    backendResult: ScanTicketResponse | null;
    syncedWithBackend: boolean;
}

interface ScanHistoryEntry {
    name: string;
    opt: string | null;
    nr: number;
    time: string;
}

export default function ScanTicketScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();

    const [permission, requestPermission] = useCameraPermissions();
    const [display, setDisplay] = useState<ScanDisplay>({ state: 'idle', payload: null, backendResult: null, syncedWithBackend: true });
    const [scanCount, setScanCount] = useState(0);
    const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [offline, setOffline] = useState(false);
    const [showOfflineInfo, setShowOfflineInfo] = useState(false);
    const processingRef = useRef(false);
    const scannedTokens = useRef(new Set<string>());
    const autoResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resumedTokenRef = useRef<{ token: string; at: number } | null>(null);

    useEffect(() => {
        return () => {
            if (autoResumeTimer.current) clearTimeout(autoResumeTimer.current);
        };
    }, []);

    const scheduleResume = (delay = 2500, completedToken?: string) => {
        autoResumeTimer.current = setTimeout(() => {
            processingRef.current = false;
            if (completedToken) {
                resumedTokenRef.current = { token: completedToken, at: Date.now() };
            }
            setDisplay({ state: 'idle', payload: null, backendResult: null, syncedWithBackend: true });
        }, delay);
    };

    const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
        if (processingRef.current) return;
        processingRef.current = true;
        if (autoResumeTimer.current) clearTimeout(autoResumeTimer.current);

        if (scannedTokens.current.has(data)) {
            const resumed = resumedTokenRef.current;
            const justResumed = resumed?.token === data && Date.now() - resumed.at < 1500;
            if (justResumed) {
                autoResumeTimer.current = setTimeout(() => {
                    processingRef.current = false;
                }, 500);
            } else {
                setDisplay({
                    state: 'invalid',
                    payload: parseTicketPayload(data),
                    backendResult: { valid: false, reason: 'already_used' },
                    syncedWithBackend: true,
                });
                scheduleResume(2500, data);
            }
            return;
        }

        const payload = parseTicketPayload(data);

        if (!payload || (eventId && payload.eid !== eventId)) {
            setDisplay({ state: 'invalid', payload: null, backendResult: { valid: false, reason: 'not_found' }, syncedWithBackend: true });
            scheduleResume();
            return;
        }

        setDisplay({ state: 'preview', payload, backendResult: null, syncedWithBackend: true });

        try {
            const token = await getSession();
            if (!token || !eventId) {
                scheduleResume();
                return;
            }

            const response = await api.scanTicket(eventId, data, token);
            setOffline(false);

            let resumeDelay = 2500;
            let completedToken: string | undefined;

            if (response.valid) {
                resumeDelay = 4000;
                completedToken = data;
                setScanCount(c => c + 1);
                scannedTokens.current.add(data);
                const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setHistory(h => [{ name: payload.name, opt: payload.opt, nr: payload.nr, time: timeStr }, ...h]);
                setDisplay({ state: 'confirmed', payload, backendResult: response, syncedWithBackend: true });
            } else {
                setDisplay({ state: 'invalid', payload, backendResult: response, syncedWithBackend: true });
            }

            scheduleResume(resumeDelay, completedToken);
        } catch (err) {
            const isNetworkError = err instanceof TypeError;
            console.error('[ScanTicket] Backend-Call fehlgeschlagen:', { isNetworkError, error: err });

            if (isNetworkError) {
                if (!offline) {
                    setShowOfflineInfo(true);
                }
                setOffline(true);
                scannedTokens.current.add(data);
                setScanCount(c => c + 1);
                const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setHistory(h => [{ name: payload.name, opt: payload.opt, nr: payload.nr, time: timeStr }, ...h]);
                setDisplay({ state: 'confirmed', payload, backendResult: null, syncedWithBackend: false });
                scheduleResume(4000, data);
            } else {
                setDisplay({
                    state: 'invalid',
                    payload,
                    backendResult: { valid: false, reason: 'not_found' },
                    syncedWithBackend: true,
                });
                scheduleResume(2500);
            }
        }
    }, [eventId, offline]);

    const historyTranslateY = useRef(new Animated.Value(0)).current;
    const historyPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    historyTranslateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 80) {
                    Animated.timing(historyTranslateY, {
                        toValue: 600,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        blurActiveElement();
                        setShowHistory(false);
                        historyTranslateY.setValue(0);
                    });
                } else {
                    Animated.spring(historyTranslateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    if (!permission) {
        return (
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <View style={styles.permissionContainer}>
                    <Text style={[styles.permissionTitle, { color: colors.onSurface }]}>
                        Kamera-Zugriff benötigt
                    </Text>
                    <Text style={[styles.permissionText, { color: colors.onSurfaceVariant }]}>
                        Um Tickets zu scannen, wird Zugriff auf die Kamera benötigt.
                    </Text>
                    <TouchableOpacity
                        style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
                        onPress={requestPermission}
                    >
                        <Text style={[styles.permissionBtnText, { color: colors.onPrimary }]}>
                            Kamera freigeben
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                        <Text style={[styles.backLinkText, { color: colors.outline }]}>Zurück</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const getColor = () => {
        switch (display.state) {
            case 'confirmed': return '#16a34a';
            case 'invalid': return '#dc2626';
            case 'preview': return '#3b82f6';
            default: return 'transparent';
        }
    };

    const getIcon = () => {
        switch (display.state) {
            case 'confirmed': return '✓';
            case 'invalid': return '✕';
            case 'preview': return '...';
            default: return '';
        }
    };

    const getMessage = () => {
        const { state, payload, backendResult } = display;
        if (state === 'preview') return payload?.name || 'Wird geprüft...';
        if (state === 'confirmed') return payload?.name || 'Gültiges Ticket';
        if (state === 'invalid') {
            if (backendResult?.reason === 'already_used') {
                const time = backendResult.used_at
                    ? new Date(backendResult.used_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    : '';
                return `Ungültig — bereits gescannt${time ? ` (${time})` : ''}`;
            }
            return 'Ungültiges Ticket';
        }
        return '';
    };

    const getSubtext = () => {
        const { state, payload, backendResult, syncedWithBackend } = display;
        const parts: string[] = [];

        if (payload?.opt) parts.push(payload.opt);
        if (payload && payload.nr > 1) parts.push(`Ticket ${payload.nr}`);

        if (state === 'confirmed' && !syncedWithBackend) parts.push('Nicht synchronisiert');
        if (state === 'invalid' && backendResult?.guest_name && !payload) {
            parts.unshift(backendResult.guest_name);
        }

        return parts.join(' · ');
    };

    return (
        <View style={[styles.root, { backgroundColor: '#000' }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
                    <Text style={styles.headerBackText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Ticket-Scanner</Text>
                <TouchableOpacity style={styles.headerCounter} onPress={() => setShowHistory(true)}>
                    <Text style={styles.headerCounterText}>{scanCount} gescannt</Text>
                </TouchableOpacity>
            </View>

            {/* Offline Banner */}
            {offline && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineBannerText}>
                        Offline — Scans können nicht verifiziert werden. Doppelte Scans möglich.
                    </Text>
                </View>
            )}

            {/* Camera */}
            <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={!processingRef.current && !showOfflineInfo ? handleBarCodeScanned : undefined}
            />

            {/* Scan Frame Overlay */}
            <View style={styles.frameOverlay} pointerEvents="none">
                <View style={[styles.scanFrame, { borderColor: display.state !== 'idle' ? getColor() : 'rgba(255,255,255,0.6)' }]} />
            </View>

            {/* Result Overlay */}
            {display.state !== 'idle' && (
                <View style={styles.resultOverlay}>
                    <View style={[styles.resultCard, { backgroundColor: getColor() }]}>
                        <Text style={styles.resultIcon}>{getIcon()}</Text>
                        <Text style={styles.resultMessage}>{getMessage()}</Text>
                        {getSubtext() ? (
                            <Text style={styles.resultSubtext}>{getSubtext()}</Text>
                        ) : null}
                    </View>
                </View>
            )}
            {/* History Modal */}
            <Modal visible={showHistory} animationType="slide" transparent>
                <View style={styles.historyOverlay}>
                    <Animated.View
                        style={[styles.historySheet, { backgroundColor: colors.background, transform: [{ translateY: historyTranslateY }] }]}
                        {...historyPanResponder.panHandlers}
                    >
                        <View style={styles.historyHandle} />
                        <View style={styles.historyHeader}>
                            <Text style={[styles.historyTitle, { color: colors.onSurface }]}>
                                Scan-Verlauf ({history.length})
                            </Text>
                            <TouchableOpacity onPress={() => { blurActiveElement(); setShowHistory(false); }} style={styles.historyCloseBtn}>
                                <Text style={[styles.historyCloseText, { color: colors.onSurfaceVariant }]}>Schließen</Text>
                            </TouchableOpacity>
                        </View>
                        {history.length === 0 ? (
                            <View style={styles.historyEmpty}>
                                <Text style={[styles.historyEmptyText, { color: colors.onSurfaceVariant }]}>
                                    Noch keine Tickets gescannt
                                </Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.historyList}>
                                {history.map((entry, i) => (
                                    <View key={i} style={[styles.historyRow, { borderBottomColor: colors.outlineVariant }]}>
                                        <View style={styles.historyRowLeft}>
                                            <Text style={[styles.historyName, { color: colors.onSurface }]}>
                                                {entry.name}
                                            </Text>
                                            {(entry.opt || entry.nr > 1) && (
                                                <Text style={[styles.historyMeta, { color: colors.onSurfaceVariant }]}>
                                                    {[entry.opt, entry.nr > 1 ? `Ticket ${entry.nr}` : null].filter(Boolean).join(' · ')}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={[styles.historyTime, { color: colors.onSurfaceVariant }]}>
                                            {entry.time}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </Animated.View>
                </View>
            </Modal>

            {/* Offline Info Modal — appears before first scan */}
            <Modal visible={showOfflineInfo} animationType="fade" transparent>
                <View style={styles.infoOverlay}>
                    <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.infoTitle, { color: colors.onSurface }]}>
                            Hinweis zum Offline-Scannen
                        </Text>
                        <Text style={[styles.infoText, { color: colors.onSurfaceVariant }]}>
                            Wenn du offline bist, können Tickets nicht beim Server verifiziert werden:
                        </Text>
                        <View style={styles.infoBullets}>
                            <Text style={[styles.infoBullet, { color: colors.onSurfaceVariant }]}>
                                • Tickets werden lokal anhand der Signatur geprüft
                            </Text>
                            <Text style={[styles.infoBullet, { color: colors.onSurfaceVariant }]}>
                                • Doppel-Scans erkennt nur dieses Gerät
                            </Text>
                            <Text style={[styles.infoBullet, { color: colors.onSurfaceVariant }]}>
                                • Auf einem zweiten Gerät könnte dasselbe Ticket erneut akzeptiert werden
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.infoBtn, { backgroundColor: colors.primary }]}
                            onPress={() => { blurActiveElement(); setShowOfflineInfo(false); }}
                        >
                            <Text style={[styles.infoBtnText, { color: colors.onPrimary }]}>
                                Verstanden
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    camera: { flex: 1 },

    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 56,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    headerBackBtn: { padding: 8, marginRight: 8 },
    headerBackText: { color: '#fff', fontSize: 22, fontWeight: '700' },
    headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700' },
    headerCounter: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    headerCounterText: { color: '#fff', fontSize: 13, fontWeight: '600' },

    offlineBanner: {
        position: 'absolute',
        top: 100,
        left: 16,
        right: 16,
        zIndex: 10,
        backgroundColor: '#ea580c',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    offlineBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },

    frameOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 240,
        height: 240,
        borderWidth: 3,
        borderRadius: 20,
    },

    resultOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 50,
        alignItems: 'center',
    },
    resultCard: {
        width: '100%',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
    },
    resultIcon: { fontSize: 40, color: '#fff', marginBottom: 8 },
    resultMessage: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
    resultSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    permissionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
    permissionText: { fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    permissionBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
    permissionBtnText: { fontSize: 16, fontWeight: '700' },
    backLink: { marginTop: 16 },
    backLinkText: { fontSize: 14 },

    historyOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    historySheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        paddingBottom: 34,
    },
    historyHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(128,128,128,0.4)',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    historyTitle: { fontSize: 18, fontWeight: '700' },
    historyCloseBtn: { padding: 8 },
    historyCloseText: { fontSize: 15, fontWeight: '600' },
    historyList: { paddingHorizontal: 20 },
    historyEmpty: { padding: 40, alignItems: 'center' },
    historyEmptyText: { fontSize: 15 },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    historyRowLeft: { flex: 1, marginRight: 12 },
    historyName: { fontSize: 16, fontWeight: '600' },
    historyMeta: { fontSize: 13, marginTop: 2 },
    historyTime: { fontSize: 14, fontWeight: '500' },

    infoOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    infoCard: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    infoTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    infoText: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 12 },
    infoBullets: { alignSelf: 'stretch', marginBottom: 20 },
    infoBullet: { fontSize: 14, lineHeight: 22, marginTop: 4 },
    infoBtn: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 14,
        minWidth: 180,
        alignItems: 'center',
    },
    infoBtnText: { fontSize: 16, fontWeight: '700' },
});
