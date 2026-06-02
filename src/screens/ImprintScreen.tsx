import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import Footer from '../components/atoms/Footer';

export default function ImprintScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    return (
        <ScreenWithNav showBottomNav={false}>
            <Head><title>Impressum – Happin</title></Head>
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
                    <Line colors={colors}>Happin UG (haftungsbeschränkt) (in Gründung)</Line>
                    <Line colors={colors}>Erzbergerstraße 121</Line>
                    <Line colors={colors}>76133 Karlsruhe</Line>
                    <Line colors={colors}>Deutschland</Line>
                </Section>

                <Section title="Kontakt" colors={colors}>
                    <Line colors={colors}>Telefon: +49 721 97355</Line>
                    <Line colors={colors}>E-Mail: kontakt@happin.app</Line>
                </Section>

                <Section title="Registereintrag" colors={colors}>
                    <Paragraph colors={colors}>
                        Die Gesellschaft befindet sich derzeit im Gründungsprozess; ein Handelsregistereintrag liegt noch nicht vor.
                        Nach Eintragung werden Registergericht und Registernummer an dieser Stelle ergänzt.
                    </Paragraph>
                </Section>

                <Section title="Umsatzsteuer-Identifikationsnummer" colors={colors}>
                    <Paragraph colors={colors}>
                        Gemäß § 27a Umsatzsteuergesetz (UStG): Die Umsatzsteuer-Identifikationsnummer wird nach
                        Erteilung durch das zuständige Finanzamt an dieser Stelle veröffentlicht.
                    </Paragraph>
                </Section>

                <Section title="EU-Streitschlichtung" colors={colors}>
                    <Paragraph colors={colors}>
                        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{'\n'}
                        https://ec.europa.eu/consumers/odr/{'\n\n'}
                        Unsere E-Mail-Adresse finden Sie oben im Impressum.
                    </Paragraph>
                </Section>

                <Section title="Verbraucherstreitbeilegung (§ 36 VSBG)" colors={colors}>
                    <Paragraph colors={colors}>
                        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
                        Verbraucherschlichtungsstelle teilzunehmen.
                    </Paragraph>
                </Section>

                <Section title="Haftung für Inhalte" colors={colors}>
                    <Paragraph colors={colors}>
                        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
                        allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch
                        nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach
                        Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                    </Paragraph>
                    <Paragraph colors={colors}>
                        Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen
                        Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt
                        der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden
                        Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                    </Paragraph>
                </Section>

                <Section title="Haftung für Links" colors={colors}>
                    <Paragraph colors={colors}>
                        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss
                        haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die
                        Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
                        verantwortlich.
                    </Paragraph>
                    <Paragraph colors={colors}>
                        Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
                        Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente
                        inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer
                        Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige
                        Links umgehend entfernen.
                    </Paragraph>
                </Section>

                <Section title="Urheberrecht" colors={colors}>
                    <Paragraph colors={colors}>
                        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
                        deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
                        Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
                        jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten,
                        nicht kommerziellen Gebrauch gestattet.
                    </Paragraph>
                    <Paragraph colors={colors}>
                        Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die
                        Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet.
                        Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
                        entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte
                        umgehend entfernen.
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
