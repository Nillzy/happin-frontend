import React, { useEffect, useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';
import { authorize } from '@/src/services/supabase';
import { PersonIcon } from '@/src/components/atoms/icons';

export default function AccountButton() {
    const { colors } = useTheme();
    const router = useRouter();
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        authorize().then(setLoggedIn);
    }, []);

    const handlePress = () => {
        if (loggedIn) {
            router.push('/account');
        } else {
            router.push('/login');
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.8}
            style={[styles.btn, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
        >
            <PersonIcon size={18} color={colors.onSurface} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
