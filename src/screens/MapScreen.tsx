import React from 'react';
import { View, StyleSheet } from 'react-native';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import MapView from '../components/map/MapView';

/**
 * MapScreen - Einfache Kartenansicht
 *
 * Zeigt eine interaktive MapTiler Karte (Berlin zentriert).
 * Keine Event-Marker - nur die Basis-Karte zum Zoomen und Bewegen.
 *
 * Features:
 * - ✅ Zoom (+ / - Buttons)
 * - ✅ Pan (Karte verschieben mit Maus)
 * - ✅ Light/Dark Mode
 * - ✅ Fixierte Navbar
 * - ✅ Responsive Layout
 */
export default function MapScreen() {
    return (
        <ScreenWithNav>
            <View style={styles.fullScreen}>
                {/* Navbar (fixiert oben) */}
                <View style={styles.navbarContainer}>
                    <Navbar showCta={false} />
                </View>

                {/* Map (füllt ganzen Screen) */}
                <View style={styles.mapContainer}>
                    <MapView
                        center={[13.4050, 52.5200]} // Berlin
                        zoom={12}
                    />
                </View>
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    fullScreen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    navbarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    mapContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
});
