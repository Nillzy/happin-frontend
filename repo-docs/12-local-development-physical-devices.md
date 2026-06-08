# Lokale Entwicklung auf physischen Geräten

## Problem

Wenn du die App auf einem **physischen iPhone oder Android-Gerät** über Expo Go testen willst, kann das Gerät nicht direkt auf `http://localhost:8001` deines Entwicklungs-Rechners (Mac/PC) zugreifen.

Die Standard-Lösung — die lokale IP-Adresse des Macs zu verwenden (z.B. `http://192.168.x.x:8001`) — funktioniert oft nicht, weil:
- **macOS Firewall** eingehende Verbindungen von anderen Geräten blockiert
- Windows Firewall ähnliche Einschränkungen hat
- Netzwerk-Konfigurationen (Firmen-VPNs, öffentliches WLAN) externe Verbindungen verhindern

## Lösung: ngrok Tunnel (Empfohlen)

Die zuverlässigste Lösung ist **ngrok**, das einen öffentlichen HTTPS-Tunnel zu deinem lokalen Backend erstellt und alle Firewall-/Netzwerk-Probleme umgeht.

### Automatische Plattform-Erkennung

Die App nutzt **automatisch die richtige Backend-URL** je nach Plattform:

- **Web (Mac Browser)**: Verwendet `http://localhost:8001` (schnell, direkt)
- **Native (iPhone/Android)**: Verwendet die ngrok-URL aus `.env.local` (wenn gesetzt)

Das bedeutet: **Du musst `.env.local` nicht ständig ändern!**

- Für lokales Testen im Browser auf dem Mac: `EXPO_PUBLIC_BACKEND_URL=http://localhost:8001`
- Für Testen auf dem iPhone: Ändere zu ngrok-URL, z.B. `EXPO_PUBLIC_BACKEND_URL=https://xyz.ngrok-free.dev`
- Die Web-Version nutzt trotzdem weiterhin localhost

### Schritt-für-Schritt Anleitung

#### 1. Backend starten (auf 0.0.0.0)

Das Backend muss auf `0.0.0.0` gebunden sein, um externe Verbindungen zu akzeptieren:

```bash
cd happin-backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

**Wichtig:** `--host 0.0.0.0` ist entscheidend (nicht nur `--port 8001`).

#### 2. ngrok Tunnel starten

In einem **separaten Terminal**:

```bash
ngrok http 8001
```

ngrok zeigt dann eine öffentliche URL an:

```
Forwarding  https://maritime-dealing-groove.ngrok-free.dev -> http://localhost:8001
```

**Diese URL ist von überall im Internet erreichbar** (auch von deinem iPhone).

#### 3. Frontend `.env.local` aktualisieren

Öffne `happin-frontend/.env.local` und setze die ngrok-URL:

```bash
# Backend API URL (ngrok tunnel)
EXPO_PUBLIC_BACKEND_URL=https://maritime-dealing-groove.ngrok-free.dev

# Supabase bleibt unverändert (direkte Verbindung funktioniert)
EXPO_PUBLIC_SUPABASE_URL=https://hylnqapjtkgqyxvmfqgy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_EE_Ih9vyxOh7cKAPySDLqg_a3ZdrnzA
```

#### 4. Frontend starten

```bash
cd happin-frontend
npm start
```

Expo zeigt einen QR-Code im Terminal.

#### 5. App auf dem Gerät öffnen

1. **Expo Go App installieren**:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **QR-Code scannen**:
   - iOS: Mit der Kamera-App scannen → auf Expo Go-Banner tippen
   - Android: QR-Code in der Expo Go App scannen

3. **Wichtig**: Mac und Gerät müssen **im gleichen WLAN** sein (für den Expo Metro Bundler, nicht für das Backend)

#### 6. Testen

Die App lädt jetzt und kommuniziert mit dem Backend über den ngrok-Tunnel. Events erstellen, listen, etc. sollte funktionieren.

## Wichtige Hinweise

### ngrok URL ändert sich bei jedem Neustart

Jedes Mal wenn du `ngrok http 8001` neu startest, bekommst du eine **neue URL**. Du musst dann:

1. `.env.local` mit der neuen URL aktualisieren
2. Expo neu starten (damit neue `.env.local` geladen wird)

**Lösung für feste URL:**
- ngrok Free Account: 1 feste Domain (z.B. `happin-dev.ngrok-free.dev`)
- [ngrok Dashboard](https://dashboard.ngrok.com/) → Domains

### Warum Supabase Auth trotzdem funktioniert

Supabase Auth läuft **direkt vom Gerät** zur **öffentlichen Supabase-URL** (`https://hylnqapjtkgqyxvmfqgy.supabase.co`). Das ist bereits eine öffentliche URL, die von überall erreichbar ist — kein Tunnel nötig.

Nur **dein lokales Backend** braucht den Tunnel.

### Performance

ngrok fügt **~100-300ms Latenz** hinzu (deine Anfrage geht erst zu ngrok-Servern, dann zu deinem Mac). Für lokale Entwicklung ist das akzeptabel, aber merkbar langsamer als eine direkte LAN-Verbindung.

## Alternative: Lokale IP (schneller, komplizierter)

Wenn du die ngrok-Latenz vermeiden willst:

### Voraussetzungen

- Mac und Gerät im **gleichen WLAN**
- macOS Firewall muss Python erlauben

### Schritte

#### 1. Firewall konfigurieren

**Systemeinstellungen → Netzwerk → Firewall → Optionen**

- **Python** zur Liste hinzufügen
- **Eingehende Verbindungen erlauben**

#### 2. Lokale IP finden

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Beispiel Output: `172.16.73.155`

#### 3. Backend starten

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

#### 4. Frontend `.env.local` aktualisieren

```bash
EXPO_PUBLIC_BACKEND_URL=http://172.16.73.155:8001
```

**Wichtig:** `http://` (nicht `https://`)

#### 5. Testen

Vom Gerät aus sollte das Backend jetzt erreichbar sein.

**Problem:** Wenn es nicht funktioniert, liegt es meist an:
- Firewall blockiert trotzdem (auch andere Sicherheitssoftware prüfen)
- Unterschiedliche VLANs im WLAN
- VPN aktiv auf Mac oder Gerät

→ In diesen Fällen ist ngrok zuverlässiger.

## Commands Cheat Sheet

### Backend starten (für physische Geräte)

```bash
# Terminal 1: Backend
cd happin-backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Terminal 2: ngrok (empfohlen)
ngrok http 8001
# → Kopiere die https://xyz.ngrok-free.dev URL

# Terminal 3: Frontend
cd happin-frontend
# .env.local aktualisieren mit ngrok URL
npm start
# → QR-Code mit Expo Go scannen
```

### Lokale IP finden (macOS)

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
```

### Expo ohne Cache starten

```bash
npm start -- --clear
```

## Troubleshooting

### "Network request failed" oder Timeouts

**Ursache:** Backend nicht erreichbar vom Gerät

**Lösung:**
1. Prüfe Backend läuft: `curl http://localhost:8001/health`
2. Prüfe ngrok läuft: Browser auf ngrok-URL öffnen
3. Prüfe `.env.local` hat die richtige ngrok-URL
4. Expo neu starten nach `.env.local`-Änderung

### "Incompatible React versions"

**Ursache:** Expo Go auf dem Gerät nutzt eine andere React/React Native Version als das Projekt

**Lösung:** Versions-Mismatch beheben (siehe `package.json`):
```bash
npx expo install react react-native react-dom
```

Expo SDK 54 nutzt:
- React `19.1.0`
- React Native `0.81.5`

### Backend erreichbar, aber Auth funktioniert nicht

**Ursache:** Supabase URL falsch oder Token-Speicherung fehlgeschlagen

**Lösung:**
1. Prüfe `EXPO_PUBLIC_SUPABASE_URL` in `.env.local`
2. Prüfe Token wird gespeichert (SecureStore auf iOS/Android, localStorage im Web)
3. Prüfe Backend-Logs: Token-Validierung schlägt fehl?

### ngrok "ERR_NGROK_108"

**Ursache:** ngrok rate limit erreicht (Free Tier: 40 req/min)

**Lösung:**
- Account erstellen für höhere Limits
- Oder lokale IP-Methode verwenden

## Weiterführende Links

- [Expo Go App (iOS)](https://apps.apple.com/app/expo-go/id982107779)
- [Expo Go App (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)
- [ngrok Dokumentation](https://ngrok.com/docs)
- [ngrok Dashboard (für feste Domains)](https://dashboard.ngrok.com/)
- [Expo CLI Dokumentation](https://docs.expo.dev/more/expo-cli/)
