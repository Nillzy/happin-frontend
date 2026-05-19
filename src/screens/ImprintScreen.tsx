import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';

export default function ImprintScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    return (
        <ScreenWithNav>
            <Head><title>Impressum – Happin</title></Head>
            <Navbar showCta={false} />
            <ScrollView
                style={{ backgroundColor: colors.background }}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color={colors.onSurfaceVariant} />
                    <Text style={[styles.backText, { color: colors.onSurfaceVariant }]}>Zurück</Text>
                </TouchableOpacity>

                <Text style={[styles.h1, { color: colors.onSurface }]}>Impressum</Text>

                <Section title="Angaben gemäß § 5 TMG" colors={colors}>
                    <Line colors={colors}>Happin (in Gründung)</Line>
                    <Line colors={colors}>Adresse wird noch bekanntgegeben</Line>
                </Section>

                <Section title="Vertreten durch" colors={colors}>
                    <Line colors={colors}>Wird noch bekanntgegeben</Line>
                </Section>

                <Section title="Kontakt" colors={colors}>
                    <Line colors={colors}>Über das Kontaktformular erreichbar</Line>
                </Section>

                <Section title="Haftungsausschluss" colors={colors}>
                    <Paragraph colors={colors}>
                        Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit,
                        Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
                    </Paragraph>
                </Section>

                <Section title="Urheberrecht" colors={colors}>
                    <Paragraph colors={colors}>
                        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
                        deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
                        Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
                        jeweiligen Autors bzw. Erstellers.
                    </Paragraph>
                </Section>

                <Footer />
            </ScrollView>
        </ScreenWithNav>
    );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
    return (
        <View style={styles.section}>
            <Text style={[styles.h2, { color: colors.onSurface }]}>{title}</Text>
            {children}
        </View>
    );
}

function Line({ children, colors }: { children: React.ReactNode; colors: any }) {
    return <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>{children}</Text>;
}

function Paragraph({ children, colors }: { children: React.ReactNode; colors: any }) {
    return <Text style={[styles.body, styles.paragraph, { color: colors.onSurfaceVariant }]}>{children}</Text>;
}

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 0,
        maxWidth: 720,
        width: '100%',
        alignSelf: 'center',
    },
    back: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 24,
    },
    backText: {
        fontSize: 14,
        fontWeight: '500',
    },
    h1: {
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: -0.5,
        marginBottom: 32,
    },
    h2: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    section: {
        marginBottom: 28,
    },
    body: {
        fontSize: 15,
        lineHeight: 24,
    },
    paragraph: {
        marginBottom: 8,
    },
});
