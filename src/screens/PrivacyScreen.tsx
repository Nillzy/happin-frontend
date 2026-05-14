import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';

export default function PrivacyScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    return (
        <ScreenWithNav>
            <Head><title>Datenschutz – Happin</title></Head>
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

                <Text style={[styles.h1, { color: colors.onSurface }]}>Datenschutzerklärung</Text>

                <Section title="1. Datenschutz auf einen Blick" colors={colors}>
                    <Paragraph colors={colors}>
                        Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
                        personenbezogenen Daten passiert, wenn Sie unsere Website besuchen. Personenbezogene Daten
                        sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                    </Paragraph>
                </Section>

                <Section title="2. Datenerfassung auf unserer Website" colors={colors}>
                    <SubTitle colors={colors}>Wer ist verantwortlich für die Datenerfassung?</SubTitle>
                    <Paragraph colors={colors}>
                        Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen
                        Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
                    </Paragraph>
                    <SubTitle colors={colors}>Wie erfassen wir Ihre Daten?</SubTitle>
                    <Paragraph colors={colors}>
                        Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen – etwa durch
                        die Registrierung oder das Erstellen von Events. Andere Daten werden automatisch beim
                        Besuch der Website durch unsere IT-Systeme erfasst (z.B. Browsertyp, Betriebssystem,
                        Uhrzeit des Seitenaufrufes).
                    </Paragraph>
                    <SubTitle colors={colors}>Wofür nutzen wir Ihre Daten?</SubTitle>
                    <Paragraph colors={colors}>
                        Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu
                        gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.
                    </Paragraph>
                </Section>

                <Section title="3. Ihre Rechte" colors={colors}>
                    <Paragraph colors={colors}>
                        Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck
                        Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht,
                        die Berichtigung oder Löschung dieser Daten zu verlangen. Hierzu sowie zu weiteren Fragen
                        zum Thema Datenschutz können Sie sich jederzeit an uns wenden.
                    </Paragraph>
                </Section>

                <Section title="4. Analyse-Tools und Tools von Drittanbietern" colors={colors}>
                    <Paragraph colors={colors}>
                        Beim Besuch dieser Website kann Ihr Surf-Verhalten statistisch ausgewertet werden.
                        Das geschieht vor allem mit Cookies und mit sogenannten Analyseprogrammen. Die Analyse
                        Ihres Surf-Verhaltens erfolgt in der Regel anonym; das Surf-Verhalten kann nicht zu
                        Ihnen zurückverfolgt werden.
                    </Paragraph>
                </Section>

                <Section title="5. Kontakt" colors={colors}>
                    <Paragraph colors={colors}>
                        Bei Fragen zum Datenschutz erreichst du uns über das Kontaktformular.
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

function SubTitle({ children, colors }: { children: React.ReactNode; colors: any }) {
    return <Text style={[styles.subtitle, { color: colors.onSurface }]}>{children}</Text>;
}

function Paragraph({ children, colors }: { children: React.ReactNode; colors: any }) {
    return <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>{children}</Text>;
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
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 4,
    },
    section: {
        marginBottom: 28,
    },
    body: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 8,
    },
});
