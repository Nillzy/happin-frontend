import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import { useSavedEvents } from '../contexts/SavedEventsContext';
import type { EventListItem } from '../types/events';

const isWeb = Platform.OS === 'web';

const CONTAINER_MAX_WIDTH = 2560;
const GRID_PADDING = 24;
const GRID_GAP_H = 20;
const GRID_GAP_V = 16;

function getNumColumns(width: number): number {
    if (width >= 2560) return 5;
    if (width >= 1920) return 4;
    if (width >= 1200) return 3;
    if (width >= 768) return 2;
    return 1;
}

const GRADIENT_PAIRS = [
    ['#D4006B', '#8B3DC8'],
    ['#8B3DC8', '#42dae2'],
    ['#00677f', '#8B3DC8'],
    ['#FF6FA8', '#D4006B'],
];

function formatDateGerman(isoDate: string): string {
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat('de-DE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

export default function SavedEventsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { savedEvents, toggleSaveEvent } = useSavedEvents();
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));

    useEffect(() => {
        if (!isWeb) return;
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });
        return () => subscription?.remove();
    }, []);

    const numColumns = getNumColumns(dimensions.width);
    const containerWidth = Math.min(dimensions.width, CONTAINER_MAX_WIDTH);
    const availableWidth = containerWidth - GRID_PADDING * 2;
    const cardWidth = (availableWidth - GRID_GAP_H * (numColumns - 1)) / numColumns;

    const renderCard = ({ item, index }: { item: EventListItem; index: number }) => {
        const gradient = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={[
                    isWeb ? styles.cardWeb : styles.card,
                    {
                        backgroundColor: colors.surfaceContainer,
                        borderColor: colors.outlineVariant,
                    },
                ]}
                onPress={() => router.push(`/event/${item.event_id}`)}
            >
                <View style={styles.imageContainer}>
                    {item.image_url ? (
                        <Image
                            source={{ uri: item.image_url }}
                            style={styles.cardImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <LinearGradient
                            colors={gradient as [string, string]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardImage}
                        />
                    )}
                    <TouchableOpacity
                        style={styles.likeButton}
                        onPress={(e) => {
                            e.stopPropagation?.();
                            toggleSaveEvent(item);
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="heart" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    <View style={styles.cardMeta}>
                        <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                            {formatDateGerman(item.starts_at)}
                        </Text>
                        {item.location?.city && (
                            <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                                {item.location.city}
                            </Text>
                        )}
                    </View>

                    <View style={styles.cardFooter}>
                        {item.category && (
                            <View style={[styles.chip, { backgroundColor: colors.surfaceContainerHigh }]}>
                                <Text style={[styles.chipText, { color: colors.primary }]}>
                                    {item.category}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.attendees, { color: colors.onSurfaceVariant }]}>
                            {item.participant_count} Teilnehmer
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="bookmarks-outline" size={64} color={colors.onSurfaceVariant} />
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                Keine gespeicherten Events
            </Text>
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
                Speichere Events mit dem Herz-Button, um sie hier wiederzufinden.
            </Text>
            <TouchableOpacity
                style={[styles.exploreButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/events')}
            >
                <Text style={[styles.exploreButtonText, { color: colors.onPrimary }]}>
                    Events entdecken
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderWebGrid = () => (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
            {savedEvents.length === 0 ? (
                renderEmpty()
            ) : (
                <View style={[styles.gridContainer, { maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center', width: '100%' }]}>
                    {savedEvents.map((item, index) => (
                        <View
                            key={String(item.event_id)}
                            style={[
                                styles.gridItem,
                                {
                                    width: cardWidth,
                                    marginRight: (index + 1) % numColumns === 0 ? 0 : GRID_GAP_H,
                                    marginBottom: GRID_GAP_V,
                                }
                            ]}
                        >
                            {renderCard({ item, index })}
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );

    const renderMobileList = () => (
        <FlatList
            data={savedEvents}
            keyExtractor={(item) => String(item.event_id)}
            renderItem={renderCard}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
        />
    );

    return (
        <ScreenWithNav>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <Navbar showCta={false} showBack onBackPress={() => router.back()} />

                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.onBackground }]}>
                        Gespeicherte Events
                    </Text>
                    <Text style={[styles.headerSub, { color: colors.onSurfaceVariant }]}>
                        {savedEvents.length} {savedEvents.length === 1 ? 'Event' : 'Events'}
                    </Text>
                </View>

                {isWeb ? renderWebGrid() : renderMobileList()}
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    headerSub: {
        fontSize: 14,
        fontWeight: '500',
    },
    scrollContent: {
        paddingTop: 8,
        paddingBottom: 24,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: GRID_PADDING,
    },
    gridItem: {
        // Width and margins set dynamically
    },
    listContent: {
        paddingTop: 8,
        paddingBottom: 24,
    },
    card: {
        marginHorizontal: 24,
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardWeb: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        width: '100%',
    },
    imageContainer: {
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: 180,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    likeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBody: {
        padding: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        lineHeight: 24,
    },
    cardMeta: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    cardMetaText: {
        fontSize: 13,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    attendees: {
        fontSize: 12,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 48,
        paddingVertical: 80,
        gap: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    exploreButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 9999,
        marginTop: 8,
    },
    exploreButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
