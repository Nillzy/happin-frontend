# Android Bottom Sheet & Gesture Patterns

Dokumentation der korrekten Implementierung von Bottom Sheets mit Swipe-to-Dismiss auf Android (und iOS). Das native `Modal` + `Alert.alert()` Pattern funktioniert auf Android visuell schlecht — stattdessen verwenden wir `Animated.View` mit `PanResponder`.

## Grundprinzip

Kein `<Modal>` für animierte Sheets verwenden. Stattdessen:
- **Absolute View** über dem Screen-Content (mit `StyleSheet.absoluteFill`)
- **Animated.View** für das Sheet selbst
- **PanResponder** für die Swipe-Geste
- **Animated backdrop** für den halbtransparenten Hintergrund

## Architektur

```
┌─────────────────────────────┐
│ Screen Content              │
├─────────────────────────────┤
│ {sheetOpen && (             │
│   <View absoluteFill>       │
│     <Animated backdrop />   │  ← Animated opacity 0→1
│     <Animated.View sheet>   │  ← translateY: HEIGHT→0
│       <Handle area>         │  ← PanResponder hier
│       <ScrollView content>  │  ← onScrollEndDrag
│     </Animated.View>        │
│   </View>                   │
│ )}                          │
└─────────────────────────────┘
```

## Setup

### Konstanten & Refs

```typescript
import { Animated, PanResponder, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.9; // 90% Bildschirmhöhe

const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
const backdropOpacity = useRef(new Animated.Value(0)).current;
```

### Öffnen (mit Animation-Reset)

Wichtig: Vor jeder Öffnung `setValue()` aufrufen, damit die Animation beim zweiten Öffnen korrekt startet.

```typescript
useEffect(() => {
    if (sheetOpen) {
        translateY.setValue(SHEET_HEIGHT); // Reset!
        backdropOpacity.setValue(0);       // Reset!
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 200,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }
}, [sheetOpen]);
```

### Schließen

```typescript
const dismissSheet = useCallback(() => {
    Animated.parallel([
        Animated.timing(translateY, {
            toValue: SHEET_HEIGHT,
            duration: 250,
            useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
        }),
    ]).start(() => setSheetOpen(false));
}, [translateY, backdropOpacity]);
```

## PanResponder (nur auf Handle)

PanResponder wird **nur auf den Drag-Handle** gelegt, nicht auf das gesamte Sheet. Das vermeidet Konflikte mit dem ScrollView-Content.

```typescript
const panResponder = useRef(
    PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_: any, gs: any) => gs.dy > 5,
        onPanResponderMove: (_: any, gs: any) => {
            if (gs.dy > 0) translateY.setValue(gs.dy);
        },
        onPanResponderRelease: (_: any, gs: any) => {
            if (gs.dy > 80 || gs.vy > 0.5) {
                dismissSheet();
            } else {
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 4,
                }).start();
            }
        },
    })
).current;
```

## ScrollView-Dismiss (Content-Bereich)

Für Dismiss aus dem Content-Bereich: `onScrollEndDrag` auf dem ScrollView. Schließt nur, wenn ganz oben gescrollt UND weiter nach unten gezogen wird.

```typescript
const handleScrollEndDrag = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const velocityY = e.nativeEvent.velocity?.y ?? 0;
    if (offsetY <= 0 && velocityY > 0.5) {
        dismissSheet(); // oder tryDismiss() mit Bestätigung
    }
}, [dismissSheet]);
```

ScrollView-Props:
```tsx
<ScrollView
    onScrollEndDrag={handleScrollEndDrag}
    scrollEventThrottle={16}
    showsVerticalScrollIndicator={false}
>
```

## Render-Struktur

```tsx
{sheetOpen && (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Backdrop */}
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropOpacity },
            ]}
        >
            <Pressable style={{ flex: 1 }} onPress={dismissSheet} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
            style={[
                styles.sheet,
                { transform: [{ translateY }] },
            ]}
        >
            {/* Handle mit PanResponder */}
            <View {...panResponder.panHandlers} style={styles.handleArea}>
                <View style={styles.handleIndicator} />
            </View>

            {/* Content */}
            <ScrollView onScrollEndDrag={handleScrollEndDrag} scrollEventThrottle={16}>
                {children}
            </ScrollView>
        </Animated.View>
    </View>
)}
```

## Sheet Styles

```typescript
const styles = StyleSheet.create({
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SHEET_HEIGHT,
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    handleArea: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    handleIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.outlineVariant,
    },
});
```

## Bestätigungsmodal statt Alert.alert

Auf Android sieht `Alert.alert()` wie ein System-Dialog aus (Material 2 style, hässlich). Stattdessen `ConfirmModal` verwenden.

### Wann ConfirmModal einsetzen

- Destruktive Aktionen (Absagen, Löschen, Abbrechen mit Datenverlust)
- Besonders wenn Pflichtfelder nicht ausgefüllt wurden und die Aktion irreversibel ist

### Verwendung

```tsx
import ConfirmModal from '@/src/components/atoms/ConfirmModal';

const [confirmVisible, setConfirmVisible] = useState(false);

// Im tryDismiss:
const tryDismiss = useCallback(() => {
    if (needsConfirmation) {
        // Sheet zurückfedern lassen
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
        }).start();
        setConfirmVisible(true);
    } else {
        dismissSheet();
    }
}, [needsConfirmation, dismissSheet]);

// Im Render:
<ConfirmModal
    visible={confirmVisible}
    title="Teilnahme absagen?"
    message="Wenn du jetzt abbrichst, wird deine Zusage zurückgezogen."
    confirmLabel="Teilnahme absagen"
    cancelLabel="Weiter ausfüllen"
    onConfirm={() => {
        setConfirmVisible(false);
        cancelAction();
    }}
    onCancel={() => setConfirmVisible(false)}
/>
```

### ConfirmModal Props

| Prop | Typ | Beschreibung |
|------|-----|-------------|
| `visible` | `boolean` | Modal sichtbar |
| `title` | `string` | Titel (zentriert, 19px bold) |
| `message` | `string` | Erklärungstext |
| `confirmLabel` | `string` | Text des roten Bestätigungs-Buttons |
| `cancelLabel` | `string` | Text des Abbrechen-Buttons (default: "Abbrechen") |
| `onConfirm` | `() => void` | Destruktive Aktion bestätigt |
| `onCancel` | `() => void` | Modal schließen, nichts tun |

Das ConfirmModal ist selbst ein `<Modal>` mit Bottom-Sheet-Design (Drag-Handle, Icon-Circle, Pill-Buttons).

## Refs für PanResponder-Closures

PanResponder wird nur einmal erstellt (`useRef`). Wenn sich State-Werte ändern, die der PanResponder braucht, müssen diese über Refs zugänglich sein:

```typescript
const needsConfirmRef = useRef(false);
// Update bei State-Änderung:
needsConfirmRef.current = someCondition;

// Im PanResponder:
onPanResponderRelease: (_, gs) => {
    if (gs.dy > 80) {
        if (needsConfirmRef.current) {
            // Bestätigung zeigen
        } else {
            // Direkt schließen
        }
    }
}
```

## Referenz-Implementierungen

| Datei | Pattern |
|-------|---------|
| `src/screens/TicketDetailScreen.tsx` | Einfaches Sheet ohne Bestätigung |
| `src/screens/EventScreen.tsx` (Custom Fields) | Sheet mit bedingter Bestätigung |
| `src/components/atoms/ConfirmModal.tsx` | Wiederverwendbares Bestätigungs-Modal |
| `src/components/atoms/EditDrawer.tsx` | Drawer mit PanResponder nur auf Handle |

## Checkliste für neue Bottom Sheets

- [ ] `Animated.Value` für translateY und backdropOpacity
- [ ] `setValue()` Reset vor jeder Öffnung
- [ ] PanResponder nur auf Handle-Area
- [ ] `onScrollEndDrag` für Content-Dismiss (wenn ScrollView vorhanden)
- [ ] `scrollEventThrottle={16}` auf ScrollView
- [ ] Feste Höhe (`SCREEN_HEIGHT * 0.8–0.9`)
- [ ] Kein `<Modal>` für das Sheet selbst
- [ ] `ConfirmModal` statt `Alert.alert()` für Bestätigungen
- [ ] Refs für Werte, die der PanResponder braucht
