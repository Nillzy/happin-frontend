# Was macht gute Tests aus? - Test Quality Guidelines

## Übersicht

Dieses Dokument definiert **messbare Kriterien** für Test-Qualität, die über reine Coverage-Zahlen hinausgehen. Es dient als Checkliste für Agent 2 (Quality Review) und als Referenz für manuelle Test-Reviews.

---

## 🎯 Die Test-Pyramide

```
        ┌─────────────┐
        │   E2E (5%)  │  Wenige, kritische User-Flows
        ├─────────────┤
        │Integration  │  API-Calls, Context-Provider
        │   (25%)     │  Component + Service zusammen
        ├─────────────┤
        │   Unit      │  Einzelne Funktionen/Komponenten
        │   (70%)     │  Schnell, isoliert, zahlreich
        └─────────────┘
```

**Ziel für Happin Frontend**:
- **70% Unit Tests**: `utils/`, einzelne Hooks, reine Funktionen
- **25% Integration Tests**: Screens + API-Calls, Context + Components
- **5% E2E Tests**: Login → Event-Suche → RSVP (optional, nicht in Phase 1)

---

## ✅ Kriterium 1: Realistische Test-Doubles

### ❌ Anti-Pattern: Fake Mocks
```typescript
// SCHLECHT: Mock gibt immer Success zurück, keine Realität
jest.mock('@/src/services/api', () => ({
  getEvents: jest.fn().mockResolvedValue([{ id: 1 }])
}));

it('renders events', () => {
  render(<EventList />);
  // Test sieht nie, wie App bei Errors reagiert
});
```

### ✅ Best Practice: Realistic Stubs
```typescript
// GUT: MSW simuliert echten HTTP-Server
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/v1/events', (req, res, ctx) => {
    // Kann Success UND Error simulieren
    return res(ctx.json({ items: [...] }));
  })
);

it('shows error when API fails', async () => {
  server.use(
    rest.get('/api/v1/events', (req, res, ctx) => 
      res(ctx.status(500))
    )
  );
  
  render(<EventList />);
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

**Warum besser?**
- Mock verhält sich wie echter Server (Headers, Status Codes, Timeouts)
- Test fängt Bugs in Fetch-Logic, Error-Parsing, Retry-Logic
- Kann leicht zwischen Success/Error umschalten

**Messbar**: % der API-Calls die MSW statt `jest.mock()` nutzen
- ❌ < 50%: Viele Fake-Mocks
- ⚠️ 50-80%: OK
- ✅ > 80%: Gut
- 🏆 100%: Exzellent

---

## ✅ Kriterium 2: Error-Path Coverage

### ❌ Anti-Pattern: Nur Happy-Path
```typescript
// SCHLECHT: Nur Success getestet
describe('login', () => {
  it('logs user in', async () => {
    // nur dieser eine Fall
  });
});
```

### ✅ Best Practice: Happy + Sad Paths
```typescript
// GUT: Alle relevanten Fehler getestet
describe('login', () => {
  it('succeeds with valid credentials', async () => { ... });
  
  it('shows error for invalid email format', async () => { ... });
  
  it('shows error for wrong OTP code', async () => { ... });
  
  it('shows error when rate-limited (429)', async () => { ... });
  
  it('shows error when server down (500)', async () => { ... });
  
  it('shows error on network timeout', async () => { ... });
  
  it('retries on transient error (503)', async () => { ... });
});
```

**Warum besser?**
- Users erleben Errors häufiger als man denkt (langsames Netz, Server-Probleme)
- Error-Handling ist oft der buggiest Teil (vergessene try/catch, falsche Messages)

**Messbar**: Error-Case-Ratio
```
Ratio = (Anzahl Error-Tests) / (Anzahl Success-Tests)
```
- ❌ < 0.5: Zu wenig Error-Tests (1 Error pro 2 Success)
- ⚠️ 0.5-1.0: OK
- ✅ 1.0-2.0: Gut (gleich viele oder mehr Error-Tests)
- 🏆 > 2.0: Sehr defensiv (für kritische Flows wie Payment)

**Standard-Error-Cases für jeden API-Call**:
1. ✅ 401 Unauthorized (abgelaufenes Token)
2. ✅ 403 Forbidden (fehlende Permission)
3. ✅ 404 Not Found (Ressource gelöscht)
4. ✅ 500 Server Error
5. ✅ Network Timeout / Offline
6. ✅ Malformed Response (z.B. HTML statt JSON)

---

## ✅ Kriterium 3: Async-Handling

### ❌ Anti-Pattern: Race Conditions
```typescript
// SCHLECHT: Test ist flaky (mal grün, mal rot)
it('loads events', () => {
  render(<EventList />);
  
  // Component lädt noch, aber Test prüft schon
  expect(screen.getByText('Event Title')).toBeInTheDocument(); // ❌ Fails random
});
```

### ✅ Best Practice: Explicit Waiting
```typescript
// GUT: Wartet bis Data geladen
it('loads events', async () => {
  render(<EventList />);
  
  // Wartet bis Element erscheint (max 5s)
  await waitFor(() => {
    expect(screen.getByText('Event Title')).toBeInTheDocument();
  });
});

// NOCH BESSER: findBy* wartet automatisch
it('loads events', async () => {
  render(<EventList />);
  
  const title = await screen.findByText('Event Title'); // wartet automatisch
  expect(title).toBeInTheDocument();
});
```

**Warum besser?**
- Test wartet auf echte async Operations (API-Calls, State-Updates)
- Verhindert flaky Tests (Tests die manchmal passen, manchmal nicht)
- Testet realistisches Timing (User sieht auch Loading-State)

**Messbar**: Async-Test-Ratio
```
Ratio = (Tests mit await waitFor/findBy) / (Tests die async Components rendern)
```
- ❌ < 50%: Viele flaky Tests wahrscheinlich
- ⚠️ 50-80%: Verbesserungsbedarf
- ✅ > 80%: Gut
- 🏆 100%: Alle async Tests warten korrekt

**Regel**: Jeder Test der einen Screen/Component mit `useEffect` oder API-Call rendert, MUSS `await waitFor()` oder `findBy*` nutzen.

---

## ✅ Kriterium 4: Test Independence

### ❌ Anti-Pattern: Tests beeinflussen sich gegenseitig
```typescript
// SCHLECHT: Test 2 hängt von Test 1 ab
let globalUser;

it('logs user in', () => {
  globalUser = { id: 1 }; // setzt global state
});

it('shows user profile', () => {
  expect(globalUser.id).toBe(1); // ❌ Fails wenn Test 1 nicht läuft
});
```

### ✅ Best Practice: Isolated Tests
```typescript
// GUT: Jeder Test ist unabhängig
beforeEach(() => {
  // Jeder Test bekommt fresh state
  server.resetHandlers();
  localStorage.clear();
});

it('logs user in', () => {
  const user = { id: 1 };
  // Test setzt eigenen state
});

it('shows user profile', () => {
  const user = { id: 2 }; // Eigener user, unabhängig
  // Test funktioniert alleine
});
```

**Warum besser?**
- Tests können in beliebiger Reihenfolge laufen
- Ein failing Test bricht nicht alle anderen
- Tests können parallel laufen (schneller)

**Messbar**: Test kann alleine laufen?
```bash
# Jeder Test muss alleine funktionieren
jest path/to/test.test.ts --testNamePattern="specific test"
```

**Checklist**:
- [ ] `beforeEach` / `afterEach` räumt state auf
- [ ] Keine globalen Variablen zwischen Tests
- [ ] MSW-Server wird nach jedem Test resettet
- [ ] LocalStorage/AsyncStorage wird geleert

---

## ✅ Kriterium 5: Klare Test-Namen

### ❌ Anti-Pattern: Vage Beschreibungen
```typescript
// SCHLECHT
it('works', () => { ... });
it('renders correctly', () => { ... });
it('handles events', () => { ... });
it('test login', () => { ... });
```

### ✅ Best Practice: Behavior-Driven Names
```typescript
// GUT: Name beschreibt exaktes Verhalten
it('displays loading spinner while fetching events', () => { ... });
it('shows error message when API returns 500', () => { ... });
it('disables RSVP button when event is full', () => { ... });
it('redirects to login when user is not authenticated', () => { ... });
```

**Pattern**: `it('should [expected behavior] when [condition]')`

**Warum besser?**
- Test-Name ist Dokumentation (kein Code lesen nötig)
- Failing Test zeigt sofort, WELCHES Verhalten kaputt ist
- Code-Review: Man sieht sofort, ob Test sinnvoll ist

**Messbar**: Name-Quality-Score
- ❌ Enthält "works", "correctly", "test": 0 Punkte
- ⚠️ Generisch aber nicht schlecht ("renders button"): 1 Punkt
- ✅ Beschreibt Behavior ("shows X when Y"): 2 Punkte
- 🏆 Beschreibt Edge-Case ("retries 3 times then fails"): 3 Punkte

**Target**: Durchschnitt ≥ 2 Punkte

---

## ✅ Kriterium 6: Test Coverage != Test Quality

### Coverage-Falle
```typescript
// 100% Coverage, aber schlechter Test!
function divide(a, b) {
  if (b === 0) throw Error('Division by zero');
  return a / b;
}

// ❌ Schlecht: Deckt alle Zeilen ab, aber testet nicht das Wichtige
it('divides numbers', () => {
  expect(divide(10, 2)).toBe(5); // ✅ Line coverage: 100%
});
// Test übersieht: Was passiert bei divide(10, 0)?
```

### Besserer Ansatz: Mutation Testing
```typescript
// ✅ Gut: Testet alle Branches
it('divides numbers correctly', () => {
  expect(divide(10, 2)).toBe(5);
});

it('throws error when dividing by zero', () => {
  expect(() => divide(10, 0)).toThrow('Division by zero');
});

it('handles negative numbers', () => {
  expect(divide(-10, 2)).toBe(-5);
});
```

**Mutation Testing Konzept**:
- Tool ändert Code automatisch (z.B. `if (b === 0)` → `if (b === 1)`)
- Gute Tests sollten dann **fehlschlagen** (Mutation wurde erkannt)
- Wenn Tests grün bleiben → Test fängt diesen Bug nicht

**Messbar**: Mutation Score (optional, für Phase 2)
```bash
npm install --save-dev stryker-mutator
npx stryker run
```
- Mutation Score = (Killed Mutations) / (Total Mutations)
- ✅ > 80%: Exzellent
- ⚠️ 60-80%: OK
- ❌ < 60%: Tests fangen viele Bugs nicht

**Für Phase 1**: Mutation Testing ist optional. Fokus auf Line Coverage + Error-Cases.

---

## ✅ Kriterium 7: Test Maintainability

### ❌ Anti-Pattern: Copy-Paste-Tests
```typescript
// SCHLECHT: 20 fast identische Tests
it('validates email 1', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
});
it('validates email 2', () => {
  expect(isValidEmail('a@b.co')).toBe(true);
});
it('validates email 3', () => {
  expect(isValidEmail('user+tag@domain.org')).toBe(true);
});
// ... 17 mehr
```

### ✅ Best Practice: Parameterized Tests
```typescript
// GUT: Eine Test-Logik, viele Cases
const validEmails = [
  'test@example.com',
  'a@b.co',
  'user+tag@domain.org',
  'name.surname@company.co.uk',
];

test.each(validEmails)('accepts valid email: %s', (email) => {
  expect(isValidEmail(email)).toBe(true);
});

const invalidEmails = [
  ['missing-at.com', 'no @ symbol'],
  ['@no-local.com', 'missing local part'],
  ['no-domain@', 'missing domain'],
  ['spaces in@email.com', 'contains spaces'],
];

test.each(invalidEmails)('rejects invalid email: %s (%s)', (email, reason) => {
  expect(isValidEmail(email)).toBe(false);
});
```

**Warum besser?**
- Neuer Test-Case = eine Zeile hinzufügen
- Bug-Fix in Test-Logik muss nur einmal geändert werden
- Test-Output zeigt welcher Case failed: `"rejects invalid email: spaces in@email.com (contains spaces)"`

**Messbar**: Test-DRY-Score
```
DRY = 1 - (Duplicate Code Lines / Total Test Code Lines)
```
- ❌ < 0.7: Viel Copy-Paste
- ⚠️ 0.7-0.85: OK
- ✅ > 0.85: Gut

---

## ✅ Kriterium 8: Test Speed

### Performance-Targets
```
Unit Test:     < 50ms   (isolierte Funktion)
Integration:   < 500ms  (Component + API mock)
E2E:           < 5s     (kompletter User-Flow)
```

### ❌ Anti-Pattern: Langsame Tests
```typescript
// SCHLECHT: Test wartet unnötig lange
it('debounces search input', async () => {
  render(<SearchBar />);
  
  userEvent.type(screen.getByRole('textbox'), 'query');
  
  await new Promise(r => setTimeout(r, 2000)); // ❌ 2 Sekunden warten!
  
  expect(mockSearch).toHaveBeenCalledTimes(1);
});
```

### ✅ Best Practice: Mock Timers
```typescript
// GUT: Test läuft sofort
it('debounces search input', async () => {
  jest.useFakeTimers();
  
  render(<SearchBar />);
  userEvent.type(screen.getByRole('textbox'), 'query');
  
  jest.advanceTimersByTime(500); // ⚡ Instant
  
  expect(mockSearch).toHaveBeenCalledTimes(1);
  
  jest.useRealTimers();
});
```

**Warum wichtig?**
- 168 Tests × 2s = **5.6 Minuten** (zu langsam für CI)
- 168 Tests × 50ms = **8 Sekunden** (akzeptabel)
- Schnelle Tests → Entwickler lassen sie häufiger laufen

**Messbar**: Test-Suite-Geschwindigkeit
```bash
npm test -- --verbose
# Am Ende: "Tests: 168 passed, 168 total, Time: 8.234s"
```

**Target**:
- ✅ < 10s für alle 168 Tests
- ⚠️ 10-30s: OK, aber optimierbar
- ❌ > 30s: Zu langsam, niemand wird sie laufen lassen

---

## 📊 Zusammenfassung: Test Quality Score

### Scoring-Matrix

| Kriterium | Gewicht | Messung | Target |
|-----------|---------|---------|--------|
| **Realistic Mocks** | 25% | % API-Calls mit MSW | > 80% |
| **Error Coverage** | 20% | Error-Tests / Success-Tests | > 1.0 |
| **Async Handling** | 15% | Tests mit `await` / Async-Tests | > 80% |
| **Independence** | 10% | Tests laufen einzeln? | 100% |
| **Clear Names** | 10% | Avg Name-Quality-Score | ≥ 2.0 |
| **Line Coverage** | 10% | % Line Coverage | > 70% |
| **Maintainability** | 5% | DRY-Score | > 0.85 |
| **Speed** | 5% | Test-Suite-Dauer | < 10s |

### Gesamtbewertung

```
Score = (Realistic Mocks × 0.25) + 
        (Error Coverage × 0.20) + 
        (Async Handling × 0.15) + 
        (Independence × 0.10) + 
        (Clear Names × 0.10) + 
        (Line Coverage × 0.10) + 
        (Maintainability × 0.05) + 
        (Speed × 0.05)
```

**Interpretation**:
- 🏆 **90-100%**: Exzellente Tests (Production-Ready)
- ✅ **70-90%**: Gute Tests (akzeptabel für Merge)
- ⚠️ **50-70%**: Verbesserungsbedarf (zurück an Agent 1)
- ❌ **< 50%**: Schlechte Tests (Rewrite nötig)

---

## 🛠️ Tools zur Test-Quality-Messung

### 1. Coverage-Report (bereits vorhanden)
```bash
npm test -- --coverage
```
→ Zeigt Line/Branch Coverage

### 2. Test-Speed-Report
```bash
npm test -- --verbose --maxWorkers=1
```
→ Zeigt Dauer pro Test

### 3. Flaky-Test-Detector (manuell)
```bash
# Test 10× laufen lassen
for i in {1..10}; do npm test; done
```
→ Alle 10× grün? → Stabil. Manchmal rot? → Flaky.

### 4. Mutation Testing (optional, Phase 2)
```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
npx stryker run
```

---

## 📝 Checklist für Agent 2 (Quality Review)

Kopiere diese Checklist in `REVIEW.md`:

```markdown
## Test Quality Checklist

### Critical (MUST FIX)
- [ ] Alle API-Calls nutzen MSW (nicht jest.mock())
- [ ] Jeder API-Endpoint hat ≥ 3 Error-Tests (401, 500, Network)
- [ ] Alle async Tests nutzen `await waitFor()` oder `findBy*`
- [ ] Line Coverage ≥ 70%

### Important (SHOULD FIX)
- [ ] Error-Test-Ratio ≥ 1.0
- [ ] Test-Namen beschreiben Behavior ("shows X when Y")
- [ ] Tests laufen unabhängig (einzeln ausführbar)
- [ ] Test-Suite läuft in < 10s

### Nice-to-Have (COULD FIX)
- [ ] DRY-Score > 0.85 (wenig Copy-Paste)
- [ ] Parameterized Tests für ähnliche Cases
- [ ] Mutation Score > 80% (optional)

### Blocker
- [ ] Keine flaky Tests (Tests müssen 10× hintereinander grün sein)
- [ ] Keine Test-Timeouts
- [ ] Alle Tests müssen einzeln lauffähig sein
```

---

## 🎯 Beispiel: Guter vs. Schlechter Test

### ❌ Schlechter Test (Score: 30%)

```typescript
it('test event list', () => {
  jest.mock('@/src/services/api');
  render(<EventList />);
  expect(screen.getByText('Event 1')).toBeInTheDocument();
});
```

**Probleme**:
- ❌ Fake Mock (`jest.mock`)
- ❌ Kein Error-Test
- ❌ Kein `await` (flaky)
- ❌ Vage Beschreibung ("test")
- ❌ Nur Happy-Path

---

### ✅ Guter Test (Score: 95%)

```typescript
const server = setupServer(
  rest.get('/api/v1/events', (req, res, ctx) => 
    res(ctx.json({ items: [{ event_id: '1', title: 'Event 1', ... }] }))
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('EventList', () => {
  it('displays event titles when API returns events successfully', async () => {
    render(<EventList />);
    
    const title = await screen.findByText('Event 1');
    expect(title).toBeInTheDocument();
  });

  it('shows error message when API returns 500 server error', async () => {
    server.use(
      rest.get('/api/v1/events', (req, res, ctx) => 
        res(ctx.status(500), ctx.json({ detail: 'Server error' }))
      )
    );
    
    render(<EventList />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading events/i)).toBeInTheDocument();
    });
  });

  it('shows error message when network request times out', async () => {
    server.use(
      rest.get('/api/v1/events', (req, res) => 
        res.networkError('Failed to connect')
      )
    );
    
    render(<EventList />);
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
```

**Vorteile**:
- ✅ MSW (realistischer Server)
- ✅ 2 Error-Tests (500, Network)
- ✅ `findBy` / `waitFor` (stabil)
- ✅ Klare Namen (Behavior + Condition)
- ✅ Happy + Sad Paths
- ✅ Unabhängig (cleanup in hooks)

---

## 🎓 Zusammenfassung

**Gute Tests sind**:
1. ✅ **Realistic**: Nutzen MSW statt fake mocks
2. ✅ **Defensive**: Testen mehr Errors als Success
3. ✅ **Stable**: Warten auf async Operations
4. ✅ **Independent**: Laufen in beliebiger Reihenfolge
5. ✅ **Clear**: Name beschreibt exaktes Verhalten
6. ✅ **Fast**: Laufen in Sekunden, nicht Minuten
7. ✅ **Maintainable**: DRY, parameterized
8. ✅ **Comprehensive**: > 70% Coverage

**Schlechte Tests sind**:
1. ❌ Fake Mocks die immer Success zurückgeben
2. ❌ Nur Happy-Path, keine Errors
3. ❌ Flaky (manchmal grün, manchmal rot)
4. ❌ Abhängig voneinander (globaler State)
5. ❌ Vage Namen ("works", "correct")
6. ❌ Langsam (> 30s für alle Tests)
7. ❌ Copy-Paste-Code
8. ❌ Geringe Coverage (< 70%)

**Nutze dieses Dokument als Grundlage für Agent 2's Review!**
