import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useReminderSettings } from '@/src/contexts/ReminderSettingsContext';
import { REMINDER_LEAD_TIME_PRESETS } from '@/src/types/reminders';
import {
    getPermissionStatus,
    requestPermission,
    type PermissionStatus,
} from '@/src/services/reminders';

/**
 * Sektion „Erinnerungen" (Anforderung K4) im AccountScreen.
 *
 * Toggle + Vorlaufzeit-Presets + Benutzerdefiniert-Eingabe.
 */
export default function ReminderSettingsSection() {
    const { colors } = useTheme();
    const { settings, loaded, setEnabled, setLeadTimeMinutes } = useReminderSettings();
    const [perm, setPerm] = useState<PermissionStatus>('undetermined');
    const [customMode, setCustomMode] = useState(false);
    const [customValue, setCustomValue] = useState(String(settings.leadTimeMinutes));

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const status = await getPermissionStatus();
            if (!cancelled) setPerm(status);
        })();
        return () => {
            cancelled = true;
        };
    }, [settings.enabled]);

    const isPreset = useMemo(
        () => REMINDER_LEAD_TIME_PRESETS.some((p) => p.minutes === settings.leadTimeMinutes),
        [settings.leadTimeMinutes],
    );

    useEffect(() => {
        if (!isPreset) {
            setCustomMode(true);
            setCustomValue(String(settings.leadTimeMinutes));
        }
    }, [isPreset, settings.leadTimeMinutes]);

    const handleToggle = async (next: boolean) => {
        if (next) {
            const status = await requestPermission();
            setPerm(status);
            if (status !== 'granted') {
                return;
            }
        }
        await setEnabled(next);
    };

    const handlePreset = async (minutes: number) => {
        setCustomMode(false);
        setCustomValue(String(minutes));
        await setLeadTimeMinutes(minutes);
    };

    const handleCustomCommit = async () => {
        const parsed = parseInt(customValue, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            await setLeadTimeMinutes(parsed);
        } else {
            setCustomValue(String(settings.leadTimeMinutes));
        }
    };

    const disabled = !loaded || (perm === 'denied' && !settings.enabled);

    return (
        <View style={[s.container, { borderBottomColor: colors.outlineVariant }]}>
            <View style={s.headerRow}>
                <View style={s.headerText}>
                    <Text style={[s.label, { color: colors.onSurface }]}>Erinnerungen</Text>
                    <Text style={[s.hint, { color: colors.onSurfaceVariant }]}>
                        Benachrichtigung vor Eventbeginn
                    </Text>
                </View>
                <Switch
                    value={settings.enabled}
                    onValueChange={handleToggle}
                    disabled={disabled}
                    trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
                    thumbColor={Platform.OS === 'android' ? colors.onPrimary : undefined}
                />
            </View>

            {perm === 'denied' && (
                <Text style={[s.warning, { color: colors.error }]}>
                    Benachrichtigungen sind in den Systemeinstellungen deaktiviert.
                </Text>
            )}
            {perm === 'unsupported' && (
                <Text style={[s.warning, { color: colors.onSurfaceVariant }]}>
                    Dieser Browser unterstützt keine Benachrichtigungen.
                </Text>
            )}

            {settings.enabled && (
                <>
                    <Text style={[s.subLabel, { color: colors.onSurfaceVariant }]}>Vorlaufzeit</Text>
                    <View style={s.chipRow}>
                        {REMINDER_LEAD_TIME_PRESETS.map((p) => {
                            const active = !customMode && settings.leadTimeMinutes === p.minutes;
                            return (
                                <TouchableOpacity
                                    key={p.minutes}
                                    onPress={() => handlePreset(p.minutes)}
                                    style={[
                                        s.chip,
                                        {
                                            backgroundColor: active ? colors.primary : colors.surfaceContainerHigh,
                                            borderColor: active ? colors.primary : colors.outlineVariant,
                                        },
                                    ]}
                                    activeOpacity={0.75}
                                >
                                    <Text
                                        style={[
                                            s.chipLabel,
                                            { color: active ? colors.onPrimary : colors.onSurface },
                                        ]}
                                    >
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            onPress={() => setCustomMode(true)}
                            style={[
                                s.chip,
                                {
                                    backgroundColor: customMode ? colors.primary : colors.surfaceContainerHigh,
                                    borderColor: customMode ? colors.primary : colors.outlineVariant,
                                },
                            ]}
                            activeOpacity={0.75}
                        >
                            <Text
                                style={[
                                    s.chipLabel,
                                    { color: customMode ? colors.onPrimary : colors.onSurface },
                                ]}
                            >
                                Benutzerdefiniert
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {customMode && (
                        <View style={s.customRow}>
                            <TextInput
                                value={customValue}
                                onChangeText={setCustomValue}
                                onBlur={handleCustomCommit}
                                onSubmitEditing={handleCustomCommit}
                                keyboardType="number-pad"
                                inputMode="numeric"
                                style={[
                                    s.customInput,
                                    {
                                        borderColor: colors.outlineVariant,
                                        backgroundColor: colors.surfaceContainerHigh,
                                        color: colors.onSurface,
                                    },
                                ]}
                                placeholder="60"
                                placeholderTextColor={colors.outline}
                                accessibilityLabel="Vorlaufzeit in Minuten"
                            />
                            <Text style={[s.customSuffix, { color: colors.onSurfaceVariant }]}>Minuten</Text>
                        </View>
                    )}

                    {Platform.OS === 'web' && (
                        <Text style={[s.hint, { color: colors.onSurfaceVariant, marginTop: 8 }]}>
                            Web-Benachrichtigungen kommen vom Server und funktionieren auch bei
                            geschlossenem Browser.
                        </Text>
                    )}
                </>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    headerText: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
    },
    hint: {
        fontSize: 12,
        marginTop: 2,
    },
    subLabel: {
        fontSize: 12,
        marginTop: 16,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
    },
    chipLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    customRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    customInput: {
        flex: 0,
        width: 96,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 14,
    },
    customSuffix: {
        fontSize: 13,
    },
    warning: {
        fontSize: 12,
        marginTop: 6,
    },
});
