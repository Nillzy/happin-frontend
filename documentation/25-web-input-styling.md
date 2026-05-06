# 25. Web Input Styling

## Problem

Browser rendern bei fokussierten `<TextInput>`-Feldern einen blauen Fokusrahmen (`outline`), der nicht ins Happin-Farbschema passt. Betroffen waren u.a. die Suchleiste in Explore und das Titelfeld beim Event erstellen.

## Lösung

Alle `TextInput`-Styles erhalten auf Web `outlineStyle: 'none'`:

```typescript
...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})
```

Das `as any` ist nötig, weil `outlineStyle` kein offizieller React Native StyleSheet-Key ist, auf Web aber korrekt angewendet wird.

## Betroffene Dateien

| Datei | Style-Key |
|---|---|
| `src/screens/EventListScreen.tsx` | `searchInput` |
| `src/screens/EventCreateStepOneNew.tsx` | `input` |
| `src/screens/EventCreateStepTwo.tsx` | `input`, `textarea` |
| `src/screens/AccountScreen.tsx` | `nameInput` |
| `src/screens/LoginScreen.tsx` | `emailInput`, `otpHiddenInput` |
| `src/components/atoms/CityAutocomplete.tsx` | `input` |
| `src/components/atoms/DatePicker.tsx` | `input` (bereits vorhanden) |
| `src/components/atoms/TimePicker.tsx` | `input` (bereits vorhanden) |

## Regel

Jeder neue `TextInput` auf Web muss `outlineStyle: 'none'` im Style erhalten. Der eigene Fokus-State wird stattdessen über `borderColor` gesteuert (z.B. `open ? colors.primary : colors.outlineVariant` in DatePicker/TimePicker).
