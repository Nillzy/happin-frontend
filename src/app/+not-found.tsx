import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';

export default function NotFoundScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.onBackground }]}>Seite nicht gefunden</Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                Die angeforderte Seite existiert nicht.
            </Text>
            <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={() => router.replace('/')}
                activeOpacity={0.85}
            >
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Zur Startseite</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        marginBottom: 24,
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 9999,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
