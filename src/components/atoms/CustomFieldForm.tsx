import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import type { CustomField, CustomFieldResponseItem } from '@/src/types/events';

interface TicketInfo {
    ticket_id: string;
    label: string;
}

interface Props {
    fields: CustomField[];
    tickets: TicketInfo[];
    initialValues?: Record<string, CustomFieldResponseItem[]>;
    onSubmit: (responses: Record<string, CustomFieldResponseItem[]>) => void;
    onCancel: () => void;
    submitting?: boolean;
    hideCancelButton?: boolean;
    hideTitle?: boolean;
    onScrollEndDrag?: (e: any) => void;
}

export default function CustomFieldForm({ fields, tickets, initialValues, onSubmit, onCancel, submitting, hideCancelButton, hideTitle, onScrollEndDrag }: Props) {
    const { colors } = useTheme();
    const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order);
    const multiTicket = tickets.length > 1;

    const [activeTab, setActiveTab] = useState(0);

    const [allValues, setAllValues] = useState<Record<string, Record<string, string | string[]>>>(() => {
        const state: Record<string, Record<string, string | string[]>> = {};
        for (const ticket of tickets) {
            const ticketInitial = (initialValues || {})[ticket.ticket_id] || [];
            const values: Record<string, string | string[]> = {};
            for (const f of sortedFields) {
                if (!f.custom_field_id) continue;
                const existing = ticketInitial.find(r => r.custom_field_id === f.custom_field_id);
                values[f.custom_field_id] = existing?.value ?? (f.field_type === 'multi_select' ? [] : '');
            }
            state[ticket.ticket_id] = values;
        }
        return state;
    });
    const [allErrors, setAllErrors] = useState<Record<string, Record<string, string>>>({});

    const currentTicket = tickets[activeTab];
    const values = allValues[currentTicket.ticket_id] || {};
    const errors = allErrors[currentTicket.ticket_id] || {};

    const updateValue = (fieldId: string, value: string | string[]) => {
        setAllValues(prev => ({
            ...prev,
            [currentTicket.ticket_id]: { ...prev[currentTicket.ticket_id], [fieldId]: value },
        }));
        setAllErrors(prev => ({
            ...prev,
            [currentTicket.ticket_id]: { ...prev[currentTicket.ticket_id], [fieldId]: '' },
        }));
    };

    const toggleMultiSelect = (fieldId: string, option: string) => {
        const current = (values[fieldId] as string[]) || [];
        const updated = current.includes(option)
            ? current.filter(o => o !== option)
            : [...current, option];
        updateValue(fieldId, updated);
    };

    const validate = (): boolean => {
        const newAllErrors: Record<string, Record<string, string>> = {};
        let firstErrorTab = -1;
        for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            const ticketValues = allValues[ticket.ticket_id] || {};
            const ticketErrors: Record<string, string> = {};
            for (const field of sortedFields) {
                if (!field.is_required || !field.custom_field_id) continue;
                const val = ticketValues[field.custom_field_id];
                if (!val || (Array.isArray(val) && val.length === 0) || val === '') {
                    ticketErrors[field.custom_field_id] = 'Pflichtfeld';
                    if (firstErrorTab === -1) firstErrorTab = i;
                }
            }
            if (Object.keys(ticketErrors).length > 0) {
                newAllErrors[ticket.ticket_id] = ticketErrors;
            }
        }
        setAllErrors(newAllErrors);
        if (firstErrorTab >= 0) setActiveTab(firstErrorTab);
        return Object.keys(newAllErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const result: Record<string, CustomFieldResponseItem[]> = {};
        for (const ticket of tickets) {
            const ticketValues = allValues[ticket.ticket_id] || {};
            result[ticket.ticket_id] = sortedFields
                .filter(f => f.custom_field_id && ticketValues[f.custom_field_id] !== '' &&
                    !(Array.isArray(ticketValues[f.custom_field_id]) && (ticketValues[f.custom_field_id] as string[]).length === 0))
                .map(f => ({
                    custom_field_id: f.custom_field_id!,
                    value: ticketValues[f.custom_field_id!],
                }));
        }
        onSubmit(result);
    };

    const renderField = (field: CustomField) => {
        const fieldId = field.custom_field_id!;
        const hasError = !!errors[fieldId];

        switch (field.field_type) {
            case 'text':
                return (
                    <TextInput
                        style={[
                            styles.textInput,
                            {
                                backgroundColor: colors.surfaceContainerHigh,
                                color: colors.onSurface,
                                borderColor: hasError ? colors.error : colors.outline,
                            },
                        ]}
                        placeholder={field.label}
                        placeholderTextColor={colors.onSurfaceVariant}
                        value={values[fieldId] as string}
                        onChangeText={v => updateValue(fieldId, v)}
                    />
                );

            case 'textarea':
                return (
                    <TextInput
                        style={[
                            styles.textInput,
                            styles.textArea,
                            {
                                backgroundColor: colors.surfaceContainerHigh,
                                color: colors.onSurface,
                                borderColor: hasError ? colors.error : colors.outline,
                            },
                        ]}
                        placeholder={field.label}
                        placeholderTextColor={colors.onSurfaceVariant}
                        value={values[fieldId] as string}
                        onChangeText={v => updateValue(fieldId, v)}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                );

            case 'single_select':
                return (
                    <View style={styles.chipContainer}>
                        {(field.options || []).map(option => {
                            const selected = values[fieldId] === option;
                            return (
                                <TouchableOpacity
                                    key={option}
                                    style={[
                                        styles.chip,
                                        {
                                            backgroundColor: selected ? colors.primary : colors.surfaceContainerHigh,
                                            borderColor: hasError ? colors.error : selected ? colors.primary : colors.outline,
                                        },
                                    ]}
                                    onPress={() => updateValue(fieldId, option)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        { color: selected ? colors.onPrimary : colors.onSurface },
                                    ]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );

            case 'multi_select':
                return (
                    <View style={styles.chipContainer}>
                        {(field.options || []).map(option => {
                            const selected = ((values[fieldId] as string[]) || []).includes(option);
                            return (
                                <TouchableOpacity
                                    key={option}
                                    style={[
                                        styles.chip,
                                        {
                                            backgroundColor: selected ? colors.primary : colors.surfaceContainerHigh,
                                            borderColor: hasError ? colors.error : selected ? colors.primary : colors.outline,
                                        },
                                    ]}
                                    onPress={() => toggleMultiSelect(fieldId, option)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        { color: selected ? colors.onPrimary : colors.onSurface },
                                    ]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );
        }
    };

    return (
        <View style={styles.container}>
            {!hideTitle && (
                <Text style={[styles.title, { color: colors.onSurface }]}>
                    Zusätzliche Angaben
                </Text>
            )}

            {multiTicket && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
                    {tickets.map((ticket, idx) => {
                        const isActive = idx === activeTab;
                        const hasTabError = !!(allErrors[ticket.ticket_id] && Object.keys(allErrors[ticket.ticket_id]).length > 0);
                        return (
                            <TouchableOpacity
                                key={ticket.ticket_id}
                                style={[
                                    styles.tab,
                                    {
                                        backgroundColor: isActive ? colors.primary : colors.surfaceContainerHigh,
                                        borderColor: hasTabError ? colors.error : isActive ? colors.primary : colors.outline,
                                    },
                                ]}
                                onPress={() => setActiveTab(idx)}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: isActive ? colors.onPrimary : colors.onSurface },
                                ]}>
                                    {ticket.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            <ScrollView
                style={styles.fieldList}
                showsVerticalScrollIndicator={false}
                onScrollEndDrag={onScrollEndDrag}
                scrollEventThrottle={16}
            >
                {sortedFields.map((field, idx) => (
                    <View
                        key={field.custom_field_id}
                        style={[
                            styles.fieldCard,
                            { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant },
                            idx === sortedFields.length - 1 && { marginBottom: 0 },
                        ]}
                    >
                        <View style={styles.labelRow}>
                            <Text style={[styles.label, { color: colors.onSurface }]}>
                                {field.label}
                            </Text>
                            {field.is_required && (
                                <Text style={[styles.required, { color: colors.error }]}> *</Text>
                            )}
                        </View>
                        {renderField(field)}
                        {errors[field.custom_field_id!] && (
                            <Text style={[styles.errorText, { color: colors.error }]}>
                                {errors[field.custom_field_id!]}
                            </Text>
                        )}
                    </View>
                ))}
            </ScrollView>

            <View style={styles.buttonRow}>
                {!hideCancelButton && (
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton, { borderColor: colors.outline }]}
                        onPress={onCancel}
                        disabled={submitting}
                    >
                        <Text style={[styles.buttonText, { color: colors.onSurface }]}>Abbrechen</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                        {submitting ? 'Wird gesendet...' : 'Absenden'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    tabBar: {
        flexDirection: 'row',
        marginBottom: 16,
        maxHeight: 40,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
        marginRight: 8,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    fieldList: {
        flex: 1,
    },
    fieldCard: {
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    labelRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
    },
    required: {
        fontSize: 15,
        fontWeight: '600',
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
    },
    textArea: {
        minHeight: 100,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 9999,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    button: {
        flex: 1,
        borderRadius: 9999,
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
