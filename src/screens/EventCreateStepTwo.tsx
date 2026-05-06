import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import ImageGalleryUploader from '../components/atoms/ImageGalleryUploader';
import ImageSelectionModal from '../components/atoms/ImageSelectionModal';
import CategorySelector from '../components/atoms/CategorySelector';
import DatePicker from '../components/atoms/DatePicker';
import TimePicker from '../components/atoms/TimePicker';
import { api } from '../services/api';
import { getSession } from '../services/supabase';
import { getGradient, type GradientId } from '../constants/gradients';
import type { EventCreateRequest } from '../types/events';

export default function EventCreateStepTwo() {
    const { colors } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{
        title?: string;
        date?: string;
        time?: string;
        isPublic?: string;
    }>();

    const [selectedGradientId, setSelectedGradientId] = useState<GradientId | undefined>(undefined);
    const [imageUri, setImageUri] = useState('');
    const [showImageModal, setShowImageModal] = useState(false);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [description, setDescription] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [city, setCity] = useState('');
    const [street, setStreet] = useState('');
    const [houseNumber, setHouseNumber] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('Deutschland');
    const [maxCapacity, setMaxCapacity] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Builds an ISO string with the device's local UTC offset
    const localIso = (date: string, time: string): string => {
        const d = new Date(`${date}T${time}:00`);
        const tzOffset = -d.getTimezoneOffset();
        const sign = tzOffset >= 0 ? '+' : '-';
        const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
        return `${date}T${time}:00${sign}${pad(Math.floor(Math.abs(tzOffset) / 60))}:${pad(
            Math.abs(tzOffset) % 60
        )}`;
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);

        // Validation
        const errors: string[] = [];

        if (selectedGradientId === undefined && !imageUri) {
            errors.push('Titelbild ist erforderlich (Vorlage oder Upload)');
        }

        if (!city.trim()) {
            errors.push('Stadt ist ein Pflichtfeld');
        }

        if (errors.length > 0) {
            setSubmitError(errors.join('\n'));
            setSubmitting(false);
            return;
        }

        const payload: EventCreateRequest = {
            title: params.title!.trim(),
            starts_at: localIso(params.date!.trim(), params.time!.trim()),
            ends_at:
                endDate.trim() && endTime.trim()
                    ? localIso(endDate.trim(), endTime.trim())
                    : undefined,
            description: description.trim() || undefined,
            category: categories.length > 0 ? categories.join(',') : undefined,
            max_capacity: maxCapacity ? Number(maxCapacity) : undefined,
            is_public: params.isPublic === 'true',
            image_url: imageUri || undefined,
            gradient_id: selectedGradientId ?? undefined,
            location: {
                city: city.trim(),
                street: street.trim() || undefined,
                house_number: houseNumber.trim() || undefined,
                postal_code: postalCode.trim() || undefined,
                country: country.trim() || undefined,
            },
        };

        try {
            const token = await getSession();
            if (!token) {
                router.push('/login');
                setSubmitting(false);
                return;
            }

            const result = await api.createEvent(payload, token);
            router.replace(`/event/${result.event_id}`);
        } catch (e) {
            console.error('Event creation failed:', e);
            setSubmitError('Fehler beim Erstellen. Bitte versuche es erneut.');
        } finally {
            setSubmitting(false);
        }
    };

    const isFormValid = (selectedGradientId !== undefined || imageUri) && city.trim();

    const handleBack = () => {
        router.back();
    };

    return (
        <ScreenWithNav>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <Navbar showCta={false} showBack onBackPress={handleBack} />
                {Platform.OS !== 'web' && (
                    <TouchableOpacity onPress={handleBack} style={styles.mobileBack} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
                        <Text style={[styles.mobileBackText, { color: colors.onSurface }]}>Zurück</Text>
                    </TouchableOpacity>
                )}

                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
                                Fast fertig!
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
                                Schritt 2 von 2
                            </Text>
                        </View>

                        {/* Titelbild */}
                        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
                            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                                Titelbild *
                            </Text>
                            <TouchableOpacity
                                style={[
                                    styles.imageSelector,
                                    {
                                        borderColor: colors.outlineVariant,
                                        backgroundColor: colors.surfaceContainerLow,
                                    },
                                ]}
                                onPress={() => setShowImageModal(true)}
                                activeOpacity={0.7}
                            >
                                {imageUri ? (
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={styles.imagePreview}
                                        resizeMode="cover"
                                    />
                                ) : selectedGradientId !== undefined ? (
                                    <LinearGradient
                                        colors={getGradient(selectedGradientId) as [string, string]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.imagePreview}
                                    />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Text style={[styles.imagePlaceholderText, { color: colors.onSurfaceVariant }]}>
                                            Tippen zum Auswählen
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Image Selection Modal */}
                        <ImageSelectionModal
                            visible={showImageModal}
                            onClose={() => setShowImageModal(false)}
                            onSelectGradient={(id) => {
                                setSelectedGradientId(id);
                                setImageUri('');
                            }}
                            onSelectStockImage={(url) => {
                                setImageUri(url);
                                setSelectedGradientId(undefined);
                            }}
                            selectedGradientId={selectedGradientId}
                            selectedImageUrl={imageUri}
                            eventTitle={params.title}
                        />

                        {/* Beschreibung */}
                        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
                            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                                Beschreibung
                            </Text>
                            <TextInput
                                style={[
                                    styles.textarea,
                                    {
                                        color: colors.onSurface,
                                        borderColor: colors.outlineVariant,
                                    },
                                ]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Beschreibe dein Event..."
                                placeholderTextColor={colors.onSurfaceVariant}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Kategorien */}
                        <View style={styles.categorySection}>
                            <CategorySelector value={categories} onChange={setCategories} />
                        </View>

                        {/* Location */}
                        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
                            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                                Ort *
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        color: colors.onSurface,
                                        borderColor: colors.outlineVariant,
                                    },
                                ]}
                                value={city}
                                onChangeText={setCity}
                                placeholder="Stadt"
                                placeholderTextColor={colors.onSurfaceVariant}
                            />
                            <View style={styles.row}>
                                <View style={styles.inputFlex2}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.inputNoMargin,
                                            {
                                                color: colors.onSurface,
                                                borderColor: colors.outlineVariant,
                                            },
                                        ]}
                                        value={street}
                                        onChangeText={setStreet}
                                        placeholder="Straße"
                                        placeholderTextColor={colors.onSurfaceVariant}
                                    />
                                </View>
                                <View style={styles.inputFlex1}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.inputNoMargin,
                                            {
                                                color: colors.onSurface,
                                                borderColor: colors.outlineVariant,
                                            },
                                        ]}
                                        value={houseNumber}
                                        onChangeText={setHouseNumber}
                                        placeholder="Nr."
                                        placeholderTextColor={colors.onSurfaceVariant}
                                    />
                                </View>
                            </View>
                            <View style={styles.row}>
                                <View style={styles.halfField}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.inputNoMargin,
                                            {
                                                color: colors.onSurface,
                                                borderColor: colors.outlineVariant,
                                            },
                                        ]}
                                        value={postalCode}
                                        onChangeText={setPostalCode}
                                        placeholder="PLZ"
                                        placeholderTextColor={colors.onSurfaceVariant}
                                        keyboardType="number-pad"
                                    />
                                </View>
                                <View style={styles.halfField}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.inputNoMargin,
                                            {
                                                color: colors.onSurface,
                                                borderColor: colors.outlineVariant,
                                            },
                                        ]}
                                        value={country}
                                        onChangeText={setCountry}
                                        placeholder="Land"
                                        placeholderTextColor={colors.onSurfaceVariant}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Details (optional) */}
                        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
                            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                                Details (optional)
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        color: colors.onSurface,
                                        borderColor: colors.outlineVariant,
                                    },
                                ]}
                                value={maxCapacity}
                                onChangeText={setMaxCapacity}
                                placeholder="Max. Teilnehmer"
                                placeholderTextColor={colors.onSurfaceVariant}
                                keyboardType="number-pad"
                            />
                            <Text style={[styles.sublabel, { color: colors.onSurfaceVariant }]}>
                                Endet am (optional)
                            </Text>
                            <View style={[styles.row, { zIndex: 50 }]}>
                                <View style={styles.halfField}>
                                    <DatePicker
                                        value={endDate}
                                        onChange={setEndDate}
                                        placeholder="TT.MM.JJJJ"
                                        minDate={new Date()}
                                    />
                                </View>
                                <View style={styles.halfField}>
                                    <TimePicker
                                        value={endTime}
                                        onChange={setEndTime}
                                        placeholder="HH:MM"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Bildergalerie (Bumble/Tinder Style) */}
                        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
                            <ImageGalleryUploader
                                images={galleryImages}
                                onChange={setGalleryImages}
                                maxImages={10}
                            />
                        </View>

                        {/* Error Message */}
                        {submitError && (
                            <View style={styles.errorContainer}>
                                <Text style={[styles.errorText, { color: colors.error }]}>
                                    {submitError}
                                </Text>
                            </View>
                        )}

                        {/* Erstellen Button */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={handleSubmit}
                            disabled={!isFormValid || submitting}
                            style={[
                                styles.button,
                                { backgroundColor: (!isFormValid || submitting) ? colors.surfaceContainer : colors.primary }
                            ]}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color={colors.onPrimary} />
                            ) : (
                                <Text style={[styles.buttonText, { color: (!isFormValid || submitting) ? colors.onSurfaceVariant : colors.onPrimary }]}>
                                    Erstellen
                                </Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.bottomSpacer} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    card: {
        marginHorizontal: 16,
        marginBottom: 24,
        padding: 20,
        borderRadius: 16,
    },
    categorySection: {
        marginHorizontal: 24,
        marginBottom: 32,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        letterSpacing: 0.2,
    },
    imageSelector: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        borderWidth: 2,
        overflow: 'hidden',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        fontSize: 15,
        fontWeight: '500',
    },
    sublabel: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    input: {
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 12,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    inputNoMargin: {
        marginBottom: 0,
    },
    textarea: {
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderRadius: 12,
        minHeight: 100,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },
    inputFlex1: {
        flex: 1,
    },
    inputFlex2: {
        flex: 2,
    },
    errorContainer: {
        marginHorizontal: 24,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    button: {
        marginHorizontal: 16,
        marginTop: 32,
        paddingVertical: 16,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    bottomSpacer: {
        height: 24,
    },
    mobileBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 54 : 16,
        paddingBottom: 8,
    },
    mobileBackText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
