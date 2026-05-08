import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { CustomField, CustomFieldResponseItem } from '@/src/types/events';

interface Props {
    fields: CustomField[];
    onSubmit: (responses: CustomFieldResponseItem[]) => void;
    onCancel: () => void;
    submitting?: boolean;
}

export default function CustomFieldForm({ fields, onSubmit, onCancel, submitting }: Props) {
    const { colors } = useTheme();
    const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order);

    const [values, setValues] = useState<Record<string, string | string[]>>(() => {
        const initial: Record<string, string | string[]> = {};
        for (const f of sortedFields) {
            if (f.custom_field_id) {
                initial[f.custom_field_id] = f.field_type === 'multi_select' ? [] : '';
            }
        }
        return initial;
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateValue = (fieldId: string, value: string | string[]) => {
        setValues(prev => ({ ...prev, [fieldId]: value }));
        setErrors(prev => ({ ...prev, [fieldId]: '' }));
    };

    const toggleMultiSelect = (fieldId: string, option: string) => {
        const current = (values[fieldId] as string[]) || [];
        const updated = current.includes(option)
            ? current.filter(o => o !== option)
            : [...current, option];
        updateValue(fieldId, updated);
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        for (const field of sortedFields) {
            if (!field.is_required || !field.custom_field_id) continue;
            const val = values[field.custom_field_id];
            if (!val || (Array.isArray(val) && val.length === 0) || val === '') {
                newErrors[field.custom_field_id] = 'Pflichtfeld';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const responses: CustomFieldResponseItem[] = sortedFields
            .filter(f => f.custom_field_id && values[f.custom_field_id] !== '' &&
                !(Array.isArray(values[f.custom_field_id]) && (values[f.custom_field_id] as string[]).length === 0))
            .map(f => ({
                custom_field_id: f.custom_field_id!,
                value: values[f.custom_field_id!],
            }));
        onSubmit(responses);
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
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.onSurface }]}>
                Zusätzliche Angaben
            </Text>

            <ScrollView style={styles.fieldList} showsVerticalScrollIndicator={false}>
                {sortedFields.map(field => (
                    <View key={field.custom_field_id} style={styles.fieldWrapper}>
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
                <TouchableOpacity
                    style={[styles.button, styles.cancelButton, { borderColor: colors.outline }]}
                    onPress={onCancel}
                    disabled={submitting}
                >
                    <Text style={[styles.buttonText, { color: colors.onSurface }]}>Abbrechen</Text>
                </TouchableOpacity>
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
        padding: 20,
        borderRadius: 20,
        maxHeight: '80%',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    fieldList: {
        maxHeight: 400,
    },
    fieldWrapper: {
        marginBottom: 20,
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
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
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
        paddingHorizontal: 16,
        paddingVertical: 8,
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
        marginTop: 20,
    },
    button: {
        flex: 1,
        borderRadius: 9999,
        paddingVertical: 14,
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
