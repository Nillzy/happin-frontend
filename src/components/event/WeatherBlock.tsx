import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface WeatherForecast {
    temp_c: number;
    condition: string;
    icon: string;
    humidity: number;
    wind_kph: number;
    chance_of_rain: number;
}

interface WeatherBlockProps {
    forecast: WeatherForecast;
    location?: string;
}

export function WeatherBlock({ forecast, location }: WeatherBlockProps) {
    const { colors } = useTheme();
    // WeatherAPI returns protocol-relative URLs, add https:
    const iconUrl = forecast.icon.startsWith('//')
        ? `https:${forecast.icon}`
        : forecast.icon;

    return (
        <View style={[styles.container, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={styles.titleRow}>
                <Text style={[styles.title, { color: colors.onSurface }]}>
                    Wettervorhersage
                </Text>
                {location && (
                    <View style={styles.locationBadge}>
                        <Ionicons name="location-outline" size={14} color={colors.onSurfaceVariant} />
                        <Text style={[styles.locationText, { color: colors.onSurfaceVariant }]}>
                            {location}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.row}>
                <Image source={{ uri: iconUrl }} style={styles.icon} />
                <View style={styles.mainInfo}>
                    <Text style={[styles.temp, { color: colors.onSurface }]}>
                        {Math.round(forecast.temp_c)}°C
                    </Text>
                    <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
                        {forecast.condition}
                    </Text>
                </View>
            </View>

            <View style={styles.details}>
                <DetailRow
                    iconName="water-outline"
                    label="Regen"
                    value={`${forecast.chance_of_rain}%`}
                    colors={colors}
                />
                <DetailRow
                    iconName="leaf-outline"
                    label="Wind"
                    value={`${forecast.wind_kph.toFixed(1)} km/h`}
                    colors={colors}
                />
                <DetailRow
                    iconName="water-outline"
                    label="Luftfeuchtigkeit"
                    value={`${forecast.humidity}%`}
                    colors={colors}
                />
            </View>
        </View>
    );
}

interface DetailRowProps {
    iconName: string;
    label: string;
    value: string;
    colors: any;
}

function DetailRow({ iconName, label, value, colors }: DetailRowProps) {
    return (
        <View style={styles.detailRow}>
            <Ionicons name={iconName as any} size={18} color={colors.onSurfaceVariant} style={styles.detailIcon} />
            <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
                {label}
            </Text>
            <Text style={[styles.detailValue, { color: colors.onSurface }]}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 12,
        marginVertical: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    locationText: {
        fontSize: 12,
        fontWeight: '500',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    icon: {
        width: 64,
        height: 64,
        marginRight: 12,
    },
    mainInfo: {
        flex: 1,
    },
    temp: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    description: {
        fontSize: 14,
        textTransform: 'capitalize',
    },
    details: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    detailIcon: {
        width: 24,
        marginRight: 4,
    },
    detailLabel: {
        fontSize: 14,
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
    },
});
