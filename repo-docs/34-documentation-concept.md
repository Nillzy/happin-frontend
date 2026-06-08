# Dokumentationskonzept

Im Happin-Projekt existieren **zwei getrennte Dokumentationen im Frontend** mit unterschiedlichen Zielgruppen und Zwecken (das Backend hat zusätzlich noch eine API-Doku via Swagger). Diese Seite erklärt, welche Doku wofür da ist, wo sie zu finden ist und wann sie aktualisiert werden muss.

## Übersicht

| Doku | Zielgruppe | Inhalt | Zugriff |
|---|---|---|---|
| `repo-docs/` | Entwicklungsteam, KI-Agenten | Implementierungsdetails, Feature-Historie, UI-Entscheidungen | Direkt im Repository (Markdown) |
| `docs/` | Alle Stakeholder | Architektur-Übersicht, Vergleich Entwurf↔Implementierung, ViewModels & Komponenten | MkDocs-Site unter `/docs` (nur bei `EXPO_PUBLIC_DEBUG=true`) |
| `api-docs/` (Backend) | Frontend-Entwickler, externe Konsumenten | REST-Endpunkte des Backends | Swagger-UI des Backends unter [`http://localhost:8001/api/docs`](http://localhost:8001/api/docs) |

> **Hinweis:** `api-docs/` lebt im **Backend**, nicht im Frontend – wird hier aber als dritter Bestandteil des Gesamt-Dokumentationskonzepts erwähnt, weil das Frontend die dort dokumentierten Endpunkte konsumiert.

---

## 1. `repo-docs/` – Entwickler- & Agenten-Doku

**Wer:** Mitglieder der Entwicklungsteams und KI-Agenten (Claude Code, Codex etc.).

**Was:** Detaillierte Dokumentation jeder größeren UI- oder Logik-Änderung. Jedes neue Feature wird hier in einer eigenen Datei dokumentiert (z. B. `28-android-bottom-sheet-gestures.md`, `30-explore-filter.md`, `33-erinnerungen-k4.md`).

**Wo:** Markdown-Dateien direkt im Repository unter `repo-docs/`. Sie werden nicht gerendert, sondern in der IDE oder in GitLab gelesen.

**Konvention:**

- Dateien werden mit nummeriertem Präfix angelegt (`<NN>-<feature-slug>.md`).
- Jede neue Datei wird in [`00-index.md`](00-index.md) eingetragen.
- Gut geeignet für: UI-Entscheidungen, Component-Architektur, Auth-Flows, Hintergrund zu Designwahl, Migrationspfade, Workarounds.
- `DESIGN.md` ist die zentrale Design-System-Referenz und muss vor jeder UI-Änderung konsultiert werden.

**Nicht zu verwechseln mit:** der Stakeholder-Doku unter `docs/` – die ist **Übersicht**, `repo-docs/` ist **Tiefenwissen**.

---

## 2. `docs/` – Stakeholder-Doku (MkDocs)

**Wer:** Alle Stakeholder (Product Owner, Tutoren, Reviewer, neue Entwickler).

**Was:**

- Allgemeine Übersicht des Frontends (Tech-Stack, Projektstruktur, Schnellstart).
- **Architekturentwurf vs. Implementierung**: jede Entwurfskomponente (GUI-Frontends, ViewModels, Dialogkomponenten, BackendAdapter) wird auf ihre tatsächliche Umsetzung im Code abgebildet, inklusive Abweichungen (z. B. "Dialogkern → React State").
- Eine Seite pro Komponente unter `docs/components/` (`viewmodel-login.md`, `gui-web.md`, `backend-adapter.md`, …) mit Beschreibung, Schnittstellen und Implementierungsdetails.

**Wo:**

- Quelldateien: `docs/` im Repository (`docs/index.md`, `docs/architecture.md`, `docs/components/*.md`).
- Konfiguration: [`mkdocs.yml`](../mkdocs.yml).
- Gerendert: erreichbar unter [`http://localhost:8081/docs`](http://localhost:8081/docs) – **nur, wenn `EXPO_PUBLIC_DEBUG=true` in der `.env.local` gesetzt ist**.

**Build:**

Die MkDocs-Site wird in das Verzeichnis `public/docs/` (siehe `site_dir` in `mkdocs.yml`) gebaut. Der Expo-Web-Dev-Server liefert das `public/`-Verzeichnis unter `/`, sodass die Doku unter `/docs` erreichbar ist.

**Build manuell auslösen:**

```bash
mkdocs build
```

**Konvention:**

- Eine neue ViewModel- oder Architektur-Komponente bekommt eine eigene Datei unter `docs/components/`.
- Sie wird in `mkdocs.yml` unter `nav:` registriert.
- Der zugehörige Eintrag in `docs/architecture.md` (Tabelle "ViewModels" bzw. "Ergänzungen") wird ergänzt – inklusive Rückreferenz auf den Architekturentwurf (siehe [Traceability-Konzept](34-traceability.md)).

---

## 3. `api-docs/` – API-Referenz (Backend, Swagger)

**Wer:** Frontend-Entwickler, die einen Backend-Aufruf in `src/services/api.ts` ergänzen oder anpassen.

**Was:** Interaktive Swagger-UI mit allen REST-Endpunkten des Backends – Request-Parameter, Response-Schemas, Auth-Anforderungen, Beispiel-Calls.

**Wo:**

- Erreichbar unter [`http://localhost:8001/api/docs`](http://localhost:8001/api/docs) – nur, wenn das Backend mit `DEBUG=true` läuft.
- Auch über die Backend-Stakeholder-Doku unter `http://localhost:8001/docs` erreichbar: in der oberen Navigationsleiste auf **„API-Referenz"** klicken.

**Konvention im Frontend:**

- Wenn ein neuer Backend-Endpoint im Frontend angebunden wird, **erst die Swagger-Doku prüfen**, dann die Methode in `src/services/api.ts` ergänzen.
- Die Frontend-Komponentenseite (`docs/components/backend-adapter.md`) listet die wichtigsten `api`-Methoden – diese Tabelle muss bei neuen Methoden ergänzt werden.

---

## Wann welche Doku?

| Aufgabe | Doku |
|---|---|
| Neues Screen/Feature implementieren | `repo-docs/<NN>-<feature>.md` anlegen + in `00-index.md` eintragen |
| Neues ViewModel oder Architektur-Komponente | Eintrag in `docs/architecture.md` + Datei unter `docs/components/` + `mkdocs.yml` |
| Neuer Backend-Aufruf im Frontend | Swagger des Backends checken, Methode in `src/services/api.ts` ergänzen, ggf. `docs/components/backend-adapter.md` aktualisieren |
| Stakeholder fragt "Wie ist das Frontend aufgebaut?" | Verweis auf [`http://localhost:8081/docs`](http://localhost:8081/docs) |
| Frontend-Entwickler braucht Endpoint-Details | Verweis auf [`http://localhost:8001/api/docs`](http://localhost:8001/api/docs) |
| UI-Änderung geplant | `repo-docs/DESIGN.md` lesen, Tokens nutzen |

## Zugriff & Voraussetzungen

In der `.env.local` muss `EXPO_PUBLIC_DEBUG=true` gesetzt sein, damit `/docs` ausgeliefert wird. Im Production-Build ist die Doku nicht enthalten – sie ist ausschließlich für Entwickler und Stakeholder im Dev-Setup gedacht.