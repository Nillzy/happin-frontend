# 27 – Stockbild-Vorschläge im Titelbild-Auswahl-Modal

## Überblick

Die `ImageSelectionModal`-Komponente wurde um eine **thematische Stockbilder-Suche** erweitert. Wenn der Eventtitel bekannt ist, werden automatisch passende, kostenlose Bilder vorgeschlagen, die der Nutzer als Titelbild verwenden kann.

Die Reihenfolge der Optionen im Modal:

1. **Eigenes Bild hochladen** (primäre Option)
2. **Stockbild-Vorschläge** basierend auf dem Event-Namen (neu)
3. **Gradient-Vorlagen** als Fallback-Option

## Wie funktioniert die Suche?

### Keyword-Extraktion

Die Funktion `extractSearchTerms(title)` extrahiert relevante Suchbegriffe aus dem Eventtitel:

- Stoppwörter werden entfernt (deutsch + englisch: "mit", "und", "the", "for", ...)
- Nur Wörter mit mehr als 2 Buchstaben werden berücksichtigt
- Maximal 3 Keywords werden für die Suche verwendet

**Beispiel:** _"Techno Lasershow mit DJ Felix"_ → Suche: `"techno lasershow felix"`

### API: Unsplash

Die Bilder stammen von [Unsplash](https://unsplash.com), einer Plattform für kostenlose, lizenzfreie Stockbilder.

#### Unsplash API (Produktionsmodus)

- Benötigt einen **Access Key** (kostenlos registrierbar unter [unsplash.com/developers](https://unsplash.com/developers))
- Demo-Limit: **50 Requests/Stunde**
- Endpoint: `GET /search/photos?query=...&per_page=8&orientation=landscape`
- Gibt strukturierte Daten zurück (URL, Fotograf, Beschreibung)

#### Fallback-Modus (ohne API-Key)

Wenn kein API-Key konfiguriert ist (`UNSPLASH_ACCESS_KEY === 'PUT_YOUR_UNSPLASH_ACCESS_KEY_HERE'`), werden Fallback-Bilder über **Unsplash Source** generiert:

- URL-Pattern: `https://source.unsplash.com/400x300/?{keyword}`
- Kein API-Key nötig, aber keine strukturierten Metadaten
- 8 Bilder werden erzeugt: 1× extrahierte Keywords, dann generische Event-Begriffe (event, party, concert, celebration, festival, gathering, meetup)

### Backend-Proxy (TODO)

> **Wichtig für Produktion:** Die Unsplash-API-Calls sollten über das Backend proxied werden, um:
> - den Access-Key nicht im Frontend-Code zu exponieren
> - Rate-Limits zentral zu steuern und zu cachen
> - Nutzungsbedingungen (Attribution) serverseitig sicherzustellen

## Neue Props

| Prop | Typ | Beschreibung |
|------|-----|-------------|
| `eventTitle` | `string?` | Eventtitel für thematische Stockbild-Suche. Wenn leer/undefined, wird die Sektion nicht angezeigt. |
| `onSelectStockImage` | `(imageUrl: string, photographerName: string) => void` | Callback bei Auswahl eines Stockbilds. Gibt die hochauflösende URL und den Namen des Fotografen zurück. |
| `selectedImageUrl` | `string?` | Aktuell ausgewählte Bild-URL (für Selektion-Highlight). |

## UI-Verhalten

- Die Stockbild-Sektion wird nur angezeigt, wenn `eventTitle` vorhanden und nicht leer ist
- Beim Öffnen des Modals wird automatisch die Suche gestartet
- Während des Ladens wird ein `ActivityIndicator` angezeigt
- Die Bilder werden als **horizontal scrollbare Karten** (140×96px) dargestellt
- Unter den Bildern steht ein Credit-Hinweis: _„Kostenlose Bilder von Unsplash"_
- Bei Auswahl wird die hochauflösende `regular`-URL (1200×800) übergeben

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/atoms/ImageSelectionModal.tsx` | Neue Props, Unsplash-Integration, Stock-Foto-Sektion |
| `src/screens/EventEditScreen.tsx` | `eventTitle` + `onSelectStockImage` an Modal übergeben |
| `src/screens/EventCreateStepTwo.tsx` | `eventTitle` + `onSelectStockImage` an Modal übergeben |

## Lizenz / Attribution

Unsplash-Bilder sind unter der [Unsplash License](https://unsplash.com/license) kostenlos nutzbar:

- **Kostenlos** für kommerzielle und nicht-kommerzielle Nutzung
- **Keine Genehmigung** erforderlich
- **Attribution nicht erforderlich**, aber erwünscht → wir zeigen den Fotografen-Namen im Callback, damit er bei Bedarf angezeigt werden kann

## Nächste Schritte

- [ ] Unsplash Access Key registrieren und im Backend hinterlegen
- [ ] Backend-Proxy-Endpoint für Unsplash-Suche implementieren (`GET /api/v1/images/search?q=...`)
- [ ] Fotografen-Attribution im Event-Detail anzeigen (optional, aber empfohlen)
- [ ] Bild-Upload-Flow fertigstellen (erstes Feature im Modal)
- [ ] Caching der Suchergebnisse (Debounce bei Titeländerungen, lokaler Cache)
