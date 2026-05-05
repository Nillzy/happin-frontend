# Event Creation UX Analysis & Feature Coverage

**Datum:** 2026-05-05  
**Zweck:** Evaluierung des bestehenden Event-Creation Flows und Feature-Abdeckung gegen Pflichtenheft

---

## 1. Bestehende Implementierung

### Aktueller Flow (2-Step Process)

#### **Step 1: EventCreateStepOne** (`/events/create`)
**Route:** `/events/create`  
**Felder:**
- ✅ Titel (Pflicht, max 255 Zeichen)
- ✅ Datum (Pflicht, mit DatePicker)
- ✅ Uhrzeit (Pflicht, mit TimePicker)

**Navigation:** Weiter → Step 2 (Preview) mit URL-Params

#### **Step 2: EventCreatePreview** (`/events/create/preview`)
**Route:** `/events/create/preview`  
**Felder (alle optional, bearbeitbar via Modals):**
- ✅ Titel (Pre-filled aus Step 1)
- ✅ Datum/Uhrzeit (Pre-filled aus Step 1)
- ✅ Enddatum/Endzeit (Optional)
- ✅ Beschreibung (Multiline Text)
- ✅ Location (Stadt, Straße, Hausnummer, PLZ, Land)
- ✅ Kategorie (Comma-separated)
- ✅ Kapazität (Max. Teilnehmer, optional)
- ✅ Sichtbarkeit (Public/Private Toggle)

**Preview-Komponenten:**
- EventHero (Titel, Kategorien)
- EventInfoBlock (Datum/Zeit, Location)
- EventDescription
- Einstellungen (Kapazität, Sichtbarkeit)

**Submission:** API Call → `POST /api/v1/events`  
**Nach Erfolg:** Redirect zu `/event/{event_id}/manage` (Host Dashboard)

---

## 2. Feature Coverage: Pflichtenheft vs. Implementierung

### ✅ VOLLSTÄNDIG IMPLEMENTIERT

#### M2 - Event-Erstellung (Pflichtfelder)
- ✅ Titel (`title`)
- ✅ Startdatum & -zeit (`starts_at`)
- ✅ Location (`location`: city, street, house_number, postal_code, country)
- ✅ Sichtbarkeit (`is_public`)
- ✅ Kapazität (`max_capacity`)
- ✅ Beschreibung (`description`)

#### M3 - Eventdetails bearbeiten
- ✅ Alle Felder nachträglich bearbeitbar (via Modals in Preview)
- ✅ Validierung (Titel nicht leer, Datum in Zukunft, Kapazität > 0)

#### M10 - Sichtbarkeit
- ✅ Public/Private Toggle
- ✅ Default: Public

---

### ⚠️ TEILWEISE IMPLEMENTIERT

#### S7 - Event-Kategorien
- ✅ Kategorie-Feld vorhanden (Textfeld mit Comma-Separation)
- ❌ **FEHLT:** Vordefinierte Kategorie-Liste zum Suchen
- ❌ **FEHLT:** Kategorie-Autocomplete/Dropdown
- **Ist:** Freitext-Eingabe "z.B. Musik, Sport, Kultur"
- **Soll:** Vordefinierte Tags mit Suchfunktion

#### M2 - Titelbild (KRITISCH FEHLEND)
- ❌ **FEHLT KOMPLETT:** Image Upload
- ❌ **FEHLT KOMPLETT:** Mediathek-Integration
- **Backend:** `image_url` existiert in `event_media` Tabelle
- **Frontend:** Kein Upload-UI, EventHero zeigt nur Platzhalter

---

### ❌ NICHT IMPLEMENTIERT

#### S2 - Kostenpflichtige Events / Ticketing
**Backend:** ✅ Vollständig implementiert
- ✅ `ticket_option` Tabelle existiert
- ✅ API Endpoint: `PUT /api/v1/events/{event_id}/ticket-options`
- ✅ Schema: `TicketOptionItem` (name, description, price, quantity_limit, sort_order)
- ✅ Service: `ticket_option_service.sync_ticket_options()`

**Frontend:** ❌ Komplett fehlend
- ❌ `is_free` Toggle fehlt
- ❌ Ticket-Option Builder UI fehlt
- ❌ Preis-Eingabe fehlt
- ❌ Quantity-Limit Eingabe fehlt

**Benötigt:**
- Toggle: "Kostenloses Event" vs "Kostenpflichtiges Event"
- Ticket-Options Manager:
  - Add/Remove Ticket-Types (z.B. "Frühbucher", "VIP", "Normalpreis")
  - Preis pro Ticket-Type (Euro, 2 Dezimalstellen)
  - Beschreibung pro Type
  - Quantity-Limit pro Type
  - Sortierung (Drag & Drop oder Sort-Order)

#### M6 - Custom RSVP-Formulare
- ❌ **KOMPLETT FEHLEND:** RSVP Form Builder
- ❌ Keine Custom-Field Definition im Event-Creation Flow
- **Benötigt:**
  - Add/Remove Custom Fields
  - Field Types: Text, Textarea, Yes/No, Single-Choice, Multi-Choice
  - Pflicht/Optional Toggle
  - Beispiel-Felder: "Allergien?", "Vegetarisch?", "Essenswahl?"

#### K1 - Terminfinder
- ❌ Nicht implementiert
- **Benötigt:** Multiple Datum-Slots zur Auswahl, Voting-Mechanismus

#### K2 - Event-Design
- ❌ Nicht implementiert
- **Benötigt:** Farb-Picker, Schriftart-Auswahl, Hintergrund-Upload

#### K3 - Bild-/GIF-Explorer
- ❌ Nicht implementiert (wird durch M2 Titelbild-Feature abgedeckt)
- **Benötigt:** Mediathek mit lizenzfreien Bildern (Unsplash/Pexels Integration)

#### S4 - Erweitertes RSVP-Formular
- ❌ Nicht implementiert (Erweiterung von M6)
- **Benötigt:** Abstimmungen, Mehrfachantworten

#### S12 - Plus-Eins Funktion
- ❌ Nicht implementiert
- **Benötigt:** Toggle "Begleitpersonen erlauben" + Max. Anzahl

---

## 3. UX-Flow Evaluierung

### ✅ **STÄRKEN des aktuellen Flows**

1. **Progressive Disclosure:** Nur 3 Pflichtfelder im ersten Schritt → niedrige Einstiegshürde
2. **Live Preview:** Step 2 zeigt Event-Vorschau → besseres mentales Modell
3. **Edit-in-Place:** Modal-basierte Bearbeitung in Preview → kein Zurücknavigieren nötig
4. **Validation:** Inline-Fehler (rote Border + Error-Text)
5. **Mobile-First:** KeyboardAvoidingView, ScrollView, Touch-optimiert

### ⚠️ **SCHWÄCHEN / VERBESSERUNGSPOTENZIAL**

1. **Fehlende Pflichtfelder:** Location ist eigentlich PFLICHT (Pflichtenheft M2), wird aber erst in Step 2 abgefragt
2. **Kein Fortschrittsindikator:** User weiß nicht, wie viele Steps noch kommen
3. **Titelbild FEHLT:** Kritisches Pflichtfeld aus M2 nicht implementiert
4. **Keine Bild-Upload-Hinweise:** User weiß nicht, dass Titelbild kommt
5. **Kategorie-Eingabe unintuitiv:** Freitext statt Auswahl-Tags
6. **Fehlende Advanced-Features:** Ticketing, RSVP-Builder, Event-Design komplett unsichtbar

### 🎯 **UX-EMPFEHLUNGEN**

#### **Option A: 3-Step Flow (Empfohlen für MVP+)**
```
Step 1: Basics (Titel, Datum, Zeit)
  → Weiter

Step 2: Details (Location, Titelbild, Beschreibung, Kategorie)
  → Weiter

Step 3: Advanced (Kapazität, Sichtbarkeit, Ticketing, RSVP-Builder)
  → Preview → Erstellen
```

**Pro:**
- Klare Trennung: Pflicht → Optional → Advanced
- Fortschrittsbalken möglich (1/3, 2/3, 3/3)
- Titelbild im richtigen Kontext (Step 2 mit anderen Details)

**Contra:**
- Ein Step mehr (kann abschrecken)

---

#### **Option B: 2-Step Flow mit erweitertem Step 2 (Aktuell, mit Ergänzungen)**
```
Step 1: Kerndaten (Titel, Datum, Zeit)
  → Weiter

Step 2: Preview + Edit (ALL anderen Felder via Modals)
  + NEU: Titelbild-Upload prominent als erste Aktion
  + NEU: "Advanced Settings" ausklappbar
    - Ticketing-Section (nur bei is_free=false)
    - RSVP-Builder
    - Event-Design
```

**Pro:**
- Weniger Steps = schneller
- Live Preview bleibt zentral
- Advanced-Features versteckt, aber erreichbar

**Contra:**
- Step 2 könnte überladen wirken
- Modals können bei vielen Features unübersichtlich werden

---

#### **Option C: Single-Page mit Sections (Modern, aber komplex)**
```
Single Page mit ScrollSpy:
  1. Titelbild & Basics
  2. Datum & Location
  3. Beschreibung & Kategorien
  4. Kapazität & Sichtbarkeit
  5. Ticketing (Optional)
  6. RSVP-Builder (Optional)
  7. Event-Design (Optional)
  → Preview Floating-Button → Modal-Preview → Erstellen
```

**Pro:**
- Alles auf einen Blick (für Power-User)
- Keine Navigation zwischen Steps

**Contra:**
- Kann overwhelmend wirken für First-Time-User
- Mobile: Sehr viel Scrolling

---

## 4. Priorisierte Implementierungs-Roadmap

### 🔴 **P0 - KRITISCH (Pflichtenheft-Lücken)**

1. **Titelbild-Upload (M2)**
   - Image Picker (Camera + Gallery)
   - Preview im Hero
   - API: `POST /api/v1/events/{event_id}/media` (vermutlich)

2. **Location als Pflichtfeld (M2)**
   - Mindestens `city` muss ausgefüllt sein
   - Validation in Step 1 oder als Pflicht-Modal in Step 2

### 🟡 **P1 - WICHTIG (Soll-Features)**

3. **Ticketing-UI (S2)**
   - `is_free` Toggle
   - Ticket-Option Builder (Name, Preis, Beschreibung, Quantity)
   - Integration mit bestehendem Backend-Endpoint

4. **Custom RSVP-Builder (M6)**
   - Add/Remove Custom Fields
   - Field Types: Text, Yes/No, Single-Choice
   - Preview der Custom-Fields im RSVP-Formular

5. **Kategorie-Auswahl (S7)**
   - Vordefinierte Kategorien als Chips
   - Multi-Select mit visueller Bestätigung
   - Backend: Kategorie-Liste als Konstante oder DB-Table

### 🟢 **P2 - OPTIONAL (Kann-Features)**

6. **Event-Design (K2)**
   - Farb-Picker (Primary/Accent)
   - Font-Auswahl (2-3 Options)
   - Hintergrund-Upload oder Gradient

7. **Bild-Explorer (K3)**
   - Unsplash API Integration
   - Search + Select lizenzfreier Bilder
   - Alternative zu manuellem Upload

8. **Terminfinder (K1)**
   - Multiple Datum-Slots hinzufügen
   - Voting-Mechanismus (erst bei RSVP)

---

## 5. Technische Dependencies

### Backend-APIs (bereits vorhanden)
- ✅ `POST /api/v1/events` - Event erstellen
- ✅ `PUT /api/v1/events/{event_id}` - Event bearbeiten
- ✅ `PUT /api/v1/events/{event_id}/ticket-options` - Ticket-Options sync
- ❓ `POST /api/v1/events/{event_id}/media` - Image-Upload (zu prüfen)

### Frontend-Komponenten (neu benötigt)
- [ ] `ImageUploader` - Image Picker + Preview
- [ ] `CategorySelector` - Multi-Select Chips
- [ ] `TicketOptionBuilder` - CRUD für Ticket-Options
- [ ] `RsvpFieldBuilder` - CRUD für Custom RSVP-Fields
- [ ] `ColorPicker` - Farb-Auswahl (K2)
- [ ] `MediaLibrary` - Unsplash Browser (K3)

### Fehlende Backend-Endpoints
- [ ] RSVP Custom Fields API (vermutlich in `rsvp_form_field` Tabelle)
- [ ] Media Upload API (falls nicht vorhanden)
- [ ] Kategorie-Liste Endpoint (falls vordefiniert)

---

## 6. Empfohlene Nächste Schritte

### **Phase 1: Critical Fixes (1-2 Tage)**
1. Titelbild-Upload implementieren (M2)
2. Location-Validation verschärfen (min. city required)
3. Kategorie-Chips statt Freitext (S7)

### **Phase 2: Ticketing (2-3 Tage)**
4. `is_free` Toggle in Preview hinzufügen
5. Ticket-Option Builder UI (Modal mit Add/Remove)
6. Integration mit Backend `/ticket-options` Endpoint

### **Phase 3: RSVP-Builder (3-4 Tage)**
7. Custom-Field-Builder UI (Drag & Drop optional)
8. Backend-Endpoint für RSVP-Fields (falls fehlend)
9. Preview der Custom-Fields im Event-Screen

### **Phase 4: Polish (2-3 Tage)**
10. Event-Design Feature (K2)
11. Bild-Explorer (K3)
12. Fortschrittsanzeige in Steps

---

## 7. Zusammenfassung

| Feature | Backend | Frontend | Priorität | Aufwand |
|---------|---------|----------|-----------|---------|
| **Titelbild-Upload** | ❓ | ❌ | 🔴 P0 | 0.5-1d |
| **Location Pflicht** | ✅ | ⚠️ | 🔴 P0 | 0.5d |
| **Ticketing-UI** | ✅ | ❌ | 🟡 P1 | 2-3d |
| **RSVP-Builder** | ❓ | ❌ | 🟡 P1 | 3-4d |
| **Kategorie-Chips** | ✅ | ⚠️ | 🟡 P1 | 1d |
| **Event-Design** | ✅ | ❌ | 🟢 P2 | 2d |
| **Bild-Explorer** | ❌ | ❌ | 🟢 P2 | 2-3d |

**Gesamtaufwand für MVP-Completion (P0 + P1):** ~8-12 Tage

---

## Appendix: Pflichtenheft Quick-Reference

**Muss-Features (M):**
- M1: Auth ✅
- M2: Event-Erstellung ⚠️ (Titelbild fehlt)
- M3: Event-Bearbeitung ✅
- M4: Einladungslinks (Backend-Only) ✅
- M5: RSVP (Gast-Seite, hier nicht relevant)
- M6: Custom RSVP-Formulare ❌
- M7: Host-Übersicht (Separate Screen) ✅
- M8: Ticketversand (Backend-Only)
- M9: Ticket-Scanning (Separate Screen)
- M10: Sichtbarkeit ✅
- M11: Öffentliche Eventliste (Separate Screen) ✅
- M12: Kalender-Integration (Gast-Seite)

**Soll-Features (S):**
- S1: Kartenintegration (Event-Detail-Seite)
- S2: Zahlungen/Ticketing ❌
- S3: Wetteranzeige (Event-Detail-Seite)
- S4: Erweitertes RSVP ❌
- S5: Datenschutz (Backend-Logik)
- S6: Kartensuche (Separate Screen)
- S7: Event-Kategorien ⚠️
- S8: RSVP-Export (Host-Screen)
- S9: Fotoalbum (Event-Detail-Seite)
- S10: Warteliste (Backend-Logik)
- S11: Event-Meldungen (Event-Detail-Seite)
- S12: Plus-Eins ❌

**Kann-Features (K):**
- K1: Terminfinder ❌
- K2: Event-Design ❌
- K3: Bild-/GIF-Explorer ❌
- K4: Erinnerungen (Settings)
- K5: Co-Host (Backend-Logik)
