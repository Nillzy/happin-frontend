# 23. Event-Erstellung - Gradient-Auswahl

## Übersicht

Vordefinierte Gradient-Vorlagen für Event-Titelbilder als Alternative zum Bild-Upload.

## Problem

User mussten immer ein eigenes Bild hochladen, auch wenn sie keins hatten. Gradients bieten eine schnelle Alternative.

## Lösung

### Gradient-Palette

**Datei**: `src/constants/gradients.ts`

```typescript
export const GRADIENT_PAIRS: [string, string][] = [
    ['#b32053', '#6645c7'], // Pink → Lila
    ['#6645c7', '#42dae2'], // Lila → Cyan
    ['#00677f', '#6645c7'], // Teal → Lila
    ['#ff5c8a', '#b32053'], // Hell-Pink → Pink
];

export type GradientId = 0 | 1 | 2 | 3;

export function getGradient(id: GradientId): [string, string] {
    return GRADIENT_PAIRS[id];
}
```

### ImageSelectionModal

**Datei**: `src/components/atoms/ImageSelectionModal.tsx`

**Features**:
- Bottom Sheet Modal (swipe-to-dismiss mit PanResponder)
- Zwei Sektionen: "Vordefinierte Vorlagen" & "Eigenes Bild"
- 2x2 Grid für Gradients
- Selected State: Primary Border + Checkmark
- Transparent Background (rgba(0, 0, 0, 0.5))

**Props**:
```typescript
interface ImageSelectionModalProps {
    visible: boolean;
    selectedGradientId?: GradientId;
    onSelectGradient: (id: GradientId) => void;
    onSelectImage: () => void; // TODO: Implementierung
    onClose: () => void;
}
```

**Swipe-to-Dismiss**:
```typescript
const panResponder = PanResponder.create({
    onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
            handleClose();
        } else {
            Animated.spring(translateY, { toValue: 0 }).start();
        }
    },
});
```

### Integration in EventCreateStepTwo

**State Management**:
```typescript
const [selectedGradientId, setSelectedGradientId] = useState<GradientId | undefined>(undefined);
const [showImageModal, setShowImageModal] = useState(false);
```

**Preview-Anzeige**:
```typescript
<TouchableOpacity onPress={() => setShowImageModal(true)}>
    {selectedGradientId !== undefined ? (
        <LinearGradient
            colors={getGradient(selectedGradientId)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.imagePreview}
        />
    ) : (
        <View style={styles.imagePlaceholder}>
            <Text>Tippen zum Auswählen</Text>
        </View>
    )}
</TouchableOpacity>
```

**Validierung**:
```typescript
const isFormValid = (selectedGradientId !== undefined || imageUri) && city.trim();
```

**API-Integration**:
```typescript
const payload = {
    ...otherFields,
    gradient_id: selectedGradientId,
    // imageUri wird separat hochgeladen
};
```

## Design

### Gradient Cards (Modal)

- **Grid**: 2x2
- **Size**: (SCREEN_WIDTH - 96) / 2 (16px gap, 32px padding)
- **Aspect Ratio**: 16:9
- **Border Radius**: 12px
- **Selected Border**: 3px, Primary Color
- **Checkmark**: Top-right, Primary Background Circle

### Preview (EventCreateStepTwo)

- **Height**: 200px
- **Border Radius**: 16px
- **Gradient Direction**: `start: {x: 0, y: 0}, end: {x: 1, y: 1}` (diagonal)

## Backend-Integration

### Gradient-ID Feld

**Schema** (Backend):
```python
gradient_id: Optional[int] = None  # 0-3
```

**Priorität**:
1. Falls `image_url` vorhanden → Bild anzeigen
2. Sonst falls `gradient_id` vorhanden → Gradient anzeigen
3. Sonst → Fallback Gradient (GRADIENT_FALLBACK)

### Event-Cards Display-Logik

**EventListScreen** & **MyEventsScreen**:
```typescript
{item.image_url ? (
    <Image source={{ uri: item.image_url }} />
) : item.gradient_id !== undefined ? (
    <LinearGradient colors={getGradient(item.gradient_id as GradientId)} />
) : (
    <LinearGradient colors={GRADIENT_FALLBACK} />
)}
```

## Barrierefreiheit

- **Alt-Text**: Gradient hat keine semantische Bedeutung (dekorativ)
- **Kontrast**: Alle Gradients haben ausreichenden Kontrast für Text-Overlay
- **Tastatur-Navigation**: Modal-Close mit Escape-Key (Web)

## Betroffene Dateien

### Neu erstellt
- `src/constants/gradients.ts` - Gradient-Definitionen
- `src/components/atoms/ImageSelectionModal.tsx` - Modal-Komponente

### Modifiziert
- `src/screens/EventCreateStepTwo.tsx` - Integration & State Management
- `src/screens/EventListScreen.tsx` - Gradient-Display-Logik
- `src/screens/MyEventsScreen.tsx` - Gradient-Display-Logik

## Migration Notes

### Bestehende Events

Events ohne `image_url` und ohne `gradient_id` zeigen den GRADIENT_FALLBACK (`['#b32053', '#6645c7']`).

### Image Upload (Zukunft)

Die Modal-Sektion "Eigenes Bild" ist bereits vorbereitet:
```typescript
onSelectImage={() => {
    onClose();
    // TODO: ImagePicker öffnen
}}
```

## Zukünftige Erweiterungen

1. **Mehr Gradients**: 8-12 Vorlagen
2. **Custom Gradients**: User kann eigene Farbkombinationen wählen
3. **Animierte Gradients**: Subtile Bewegung
4. **Texture-Overlays**: Noise/Grain für mehr Tiefe
5. **Gradient-Kategorien**: "Warm", "Cool", "Pastel", etc.
