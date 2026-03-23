# 🤖 AI Context - Gent Location Game

Dit bestand is speciaal voor AI-assistenten om het project volledig te begrijpen zonder de volledige codebase te moeten exploreren.

---

## 📋 Project Overzicht

**Naam**: Gent Location Game (Jet Lag: The Knock-Off)
**Type**: Mobile-first Progressive Web App (PWA)
**Doel**: Locatiegebaseerd spel voor 2 teams in Gent — elk team verstopt een fiets, het andere team probeert die te vinden via kaarten/vragen
**Stack**: Vanilla JavaScript, HTML/CSS, Leaflet Maps, LocalStorage
**Deployment**: GitHub Pages (statische site, geen backend)
**Laatst bijgewerkt**: 23 maart 2026

---

## 🎮 Game Mechanica

### Speelveld
- **Locatie**: Gent (België)
- **Radius**: 3,5km rond de WEC (niet het Belfort — let op, README is verouderd)
- **Regel**: Alleen locaties binnen deze zone zijn geldig

### Rollen
- **2 teams**, elk met een fiets die ze verstoppen
- **Hider**: verstopt de fiets, vult checklist in (9 foto's/notities), beantwoordt vragen
- **Seeker**: voert taken uit, stelt vragen aan de hider, probeert de fiets te lokaliseren via exclusion zones
- **Doel**: als eerste de fiets van het andere team vinden

### Game Flow
```
1. Beide spelers voeren DEZELFDE seed in → identieke kaartenvolgorde
2. Hider verstopt fiets → vult 9-item checklist in (foto's, straatnaam, boom, etc.)
3. Hider bevestigt GPS-locatie van de fiets in app
4. Beide spelers zien dezelfde flop (12 kaarten: 4 per fase)
5. Om de beurt: voer taak uit → stel vraag aan tegenstander via chat (WhatsApp/Messenger)
6. App berekent antwoord automatisch op basis van GPS → exclusion zone verschijnt op kaart
7. Hoe meer vragen → hoe kleiner het zoekgebied
```

### Geen centrale server
- **Alles is lokaal** — de app berekent antwoorden op basis van GPS
- Communicatie via WhatsApp/Messenger: antwoorden, bewijsfoto's, GPS-coördinaten
- Als tegenstander een kaart speelt, moet je die ook markeren als "tegenstander speelde dit eerst"

### Automatische Antwoorden
Bij bepaalde answerTypes berekent de app automatisch het antwoord op basis van GPS:

| answerType | Vraag | Logica |
|---|---|---|
| `r40` | Binnen/buiten R40 binnenring? | Point-in-polygon op R40_POLYGON |
| `leie-schelde` | Noorden/zuiden van Leie-Schelde? | Cross product op lijn |
| `proximity` | Dichter bij Weba of IKEA? | Vergelijk afstand tot beide POIs |
| `dampoort` | Oosten/westen van Dampoort? | Vergelijk longitude |
| `watersportbaan` | Oosten/westen van watersportbaantip? | Vergelijk longitude |
| `bufferLine` | Binnen 800m van spoorlijn Oostende-Antwerpen? | Buffer zone check |
| `distanceFromBike` | Is fiets binnen Xm van jouw positie? | Hider checkt seeker-coördinaten |
| `FurthestDistance` | Welke [POI] is zeker NIET de dichtste? | Voronoi-cel van genoemde POI (exact polygon via Sutherland-Hodgman) |
| `radiusProximity` | Is er een [bibliotheek/ziekenhuis/watertoren] binnen Xm? | Radius check op POI collections |
| `SameOrAdjacentNeighborhood` | Huidige/aangrenzende wijk van het item? | Point-in-polygon + buurwijk detectie |
| `eliminateNeighborhood` | 3 wijken gegeven, 1 elimineren | Wijk-polygoon uitsluiten |
| `requiresAnswer: false` | Foto-hints (Links/Rechts/Voor/Achter/Beneden/Gebouw) | Hider stuurt foto via chat |

---

## 🏗️ Architectuur

### Bestandsstructuur
```
gent-location-game/
├── index.html              # PWA entry point, kaart + controls
├── styles.css              # Mobile-first CSS (~1500+ lijnen)
├── app.js                  # Hoofdlogica (~3900+ lijnen)
├── cards.js                # Kaarten + seed-based shuffling
├── geoUtils.js             # Geografische berekeningen
├── storage.js              # LocalStorage management + gameRules
├── service-worker.js       # Offline PWA support
├── manifest.json           # PWA manifest
├── polygon-helper.html     # Dev tool voor polygon coördinaten
├── README.md               # Gebruikersdocumentatie
├── AI-CONTEXT.md           # Dit bestand
├── data/
│   ├── cards.json          # Hider checklist (9 items) + speelkaarten (3 fases)
│   ├── geo-data.json       # POI locations (colruyts, catlocations, libraries, hospitals, watertowers, etc.)
│   ├── rules.json          # Vaste spelregels + optionele regels (met key voor gameRules systeem)
│   └── stadswijken-gent.geojson  # GeoJSON met alle Gentse wijken
└── icons/                  # PWA app icons
```

### Belangrijke Globale Variabelen (app.js)
```javascript
let cardManager = null;         // CardManager instantie
let currentCardIndex = 0;       // Index voor single card view
let exclusionLayers = [];       // Array van Leaflet layers op kaart
let lastUndoAction = null;      // Snapshot voor undo van laatste kaartactie
let liveMarker = null;          // Blauw bolletje (live GPS)
let liveAccuracyCircle = null;  // Nauwkeurigheidscirkel
let liveWatchId = null;         // watchPosition ID
let liveTrackingEnabled = false;
let currentLiveLat = null;      // Meest recente GPS lat (voor zone lock check)
let currentLiveLng = null;
let rulesData = [];             // Vaste spelregels (uit rules.json)
let optionalRulesData = [];     // Optionele regels met key + text
```

---

## 🃏 Kaartensysteem

### CardManager (cards.js)
```javascript
class CardManager {
    seed          // Gebruikte seed
    deck[]        // Volledig shuffled deck (alle kaarten)
    flop[]        // 12 zichtbare kaarten (4 per fase)
    discarded[]   // Opgeloste kaarten
    deckIndex     // Huidige positie in deck
}
```
- **Flop**: altijd 12 kaarten zichtbaar (4 fase 1, 4 fase 2, 4 fase 3)
- Als een kaart opgelost wordt → nieuwe kaart van dezelfde fase getrokken
- **Seed**: zorgt voor identieke volgorde bij beide spelers
- Kaart-ID: `${seed}_${index}` (gebruikt voor opslaan antwoorden)

### cards.json structuur
```json
{
  "hiderChecklist": ["item1", "item2", ...],  // 9 items
  "cards": [
    {
      "task": "Beschrijving taak",
      "question": "Vraag aan tegenstander",
      "phase": 1,
      "answerType": "r40",
      "pois": [],
      "radius": 750,        // Optioneel, voor radiusProximity/distanceFromBike
      "poiType": "libraries", // Optioneel, voor radiusProximity/FurthestDistance
      "requiresAnswer": false  // Optioneel, voor foto-kaarten
    }
  ]
}
```

### Fase indeling
- **🟢 Fase 1 (Early Game)**: Brede geografische vragen (R40, Leie-Schelde, Dampoort, etc.)
- **🟡 Fase 2 (Mid Game)**: Wijkvragen, radius-vragen, meer specifiek
- **🔴 Fase 3 (Late Game)**: Foto-hints van de hider checklist, directe locatie-aanwijzingen

---

## 💾 Storage (storage.js)

### gameData (localStorage key: `jetlag_game_data`)
```javascript
{
  seed: "ABC123",
  location: { lat, lng, timestamp },
  cardAnswers: [{ cardId, opponentAnswer, cardTask, cardIndex, timestamp }],
  exclusionZones: [{ type, answer, ... }],  // voor complexe zones
  gameStarted: true,
  version: 1
}
```

### cardManager state (apart opgeslagen)
```javascript
{ flop: [...], discarded: [...], deckIndex: 12 }
```

### gameRules (localStorage key: `gameRules`)
```javascript
{ zoneLockEnabled: true }  // uitbreidbaar met meer regels
```

### Functies
- `loadGameData()` / `saveGameData(data)`
- `saveSeed(seed)` → zet ook `gameStarted: true`
- `saveOpponentAnswer(cardId, answer, task, index)` → pass `null` als answer om te verwijderen
- `loadGameRules()` / `saveGameRules(rules)` / `getGameRule(key)` / `toggleGameRule(key)`

---

## 🗺️ Exclusion Zones

### Hoe het werkt
Na elk antwoord wordt een rode zone op de kaart getekend waar de fiets NIET kan zijn.

### updateExclusionZones() flow
1. Verwijder alle bestaande Leaflet layers
2. Laad `gameData.cardAnswers` → `createExclusionLayer(answer)` (string-gebaseerd)
3. Laad `gameData.exclusionZones` → `createExclusionLayerFromData(data)` (object-gebaseerd)
4. `inverseMask.bringToFront()`
5. `updateZoneLockIndicator()`

### FurthestDistance: exacte Voronoi-cel
Gebruikt **Sutherland-Hodgman halvevlak-knippen** (geen raster!):
- Start met spelcirkel (64 punten)
- Knip met elk halvevlak: "dichter bij selectedPOI dan bij elke andere POI"
- Resultaat = exacte Voronoi-cel polygon van de genoemde POI
- Getekend als één strakke rode polygoon

---

## ⚙️ Optionele Spelregels

### Systeem
- Toegankelijk via "⚙️ Optionele Spelregels" knop (onder "📖 Hoe werkt het spel?" knop)
- Regels kunnen ALLEEN aangepast worden **voor** de start van het spel
- Na start: modal toont geel waarschuwingsbanner, toggles zijn disabled
- Opgeslagen in localStorage onder `gameRules`

### Huidige regels
| Key | Label | Default | Beschrijving |
|---|---|---|---|
| `zoneLockEnabled` | Zone vergrendeling | AAN | Taken kunnen niet uitgevoerd worden in al-uitgesloten zones |

### Zone Lock Indicator
- Persistent bolletje op de kaart (naast de live tracking knop)
- 🟢 "Zone OK" = speler staat in actieve zone
- 🔴 "Zone geblokkeerd" = speler staat in uitgesloten zone
- Klikken toont tooltip met uitleg
- Kaart SLUITEN blijft altijd mogelijk (geen harde blokkering)

### rules.json structuur
```json
{
  "rules": ["Vaste spelregel 1", "Vaste spelregel 2", ...],
  "optionalRules": [
    { "key": "zoneLockEnabled", "text": "Tekst die in spelregels modal verschijnt" }
  ]
}
```

---

## ↩️ Undo Systeem

### Wanneer
- Na elk antwoord geven (handleOpponentAnswer, handleDistanceFromBikeAnswer, handleFurthestDistanceAnswer, handleEliminateNeighborhoodAnswer)
- Na elke handmatige discard (handleDiscardCard, handleDirectDiscard, discardCardFromFlop)

### Hoe
```javascript
lastUndoAction = {
    cardTask: string,
    cardManagerState: { flop, discarded, deckIndex },  // deep clone
    cardAnswersSnapshot: [...],  // deep clone
    exclusionZonesSnapshot: [...]  // deep clone
}
```

### UI
- Knop `↩️ "[kaartnaam]" terugzetten` verschijnt in de **Opgeloste Kaarten** view
- Alleen zichtbaar als `lastUndoAction !== null`
- Overschreven bij elke nieuwe actie (altijd alleen laatste actie)
- Na undo: volledig herstel van CardManager + storage + kaart/map update

---

## 📍 Live Locatie Tracking

- Start automatisch bij app-load (niet pas na checklist)
- **Blauw pulserende cirkel** = huidige positie (liveMarker)
- **Lichtblauwe cirkel** = GPS-nauwkeurigheidsradius (liveAccuracyCircle)
- Toggle knop "🔵 Live" / "⚫ Live uit" (linksboven op kaart)
- `currentLiveLat` / `currentLiveLng` worden bijgehouden voor zone lock check
- `enableHighAccuracy: false` voor batterijbesparing

---

## 📖 Demo/Tutorial Modal

- Triggered via **"📖 Hoe werkt het spel?"** knop (altijd toegankelijk, ook tijdens spel)
- Sluit het spel **niet** af — volledig non-destructief
- 7 stappen met navigatie (dots + Vorige/Volgende knoppen)
- Inhoud: welkom, geen server uitleg, spelverloop, kaarten & fases, locatie delen, exclusion zones, tips
- Knop op laatste stap: "Sluiten" (was vroeger "Start een echt spel" — NIET terugzetten)

---

## 🎮 UI Structuur

### Secties (index.html)
1. `#setup-section` — seed invoer
2. `#location-section` — GPS bevestiging
3. `#checklist-section` — 9-item hider checklist
4. `#cards-section` — kaarten (3 views)
   - `#single-card-view` — één kaart met antwoordknoppen
   - `#flop-view` — 12 kaarten in grid per fase
   - `#discarded-view` — opgeloste kaarten + undo knop

### Knoppen volgorde (in controls)
1. 📋 Bekijk Spelregels
2. ⚙️ Optionele Spelregels
3. 📖 Hoe werkt het spel? (demo)

### Modals
- `#rules-modal` — spelregels (vaste + actieve optionele)
- `#game-rules-modal` — optionele spelregels toggles
- `#demo-modal` — tutorial stap-voor-stap
- `#neighborhood-modal` — wijk selectie voor SameOrAdjacentNeighborhood

---

## 📱 Responsiveness

| Breakpoint | Layout |
|---|---|
| < 1100px (mobiel) | Controls schuiven omhoog vanuit onderkant (bottom sheet) |
| ≥ 1100px (desktop) | Controls als rechterzijbalk (35%), kaart links (65%) |

---

## ⚠️ Bekende Quirks & Aandachtspunten

1. **Radius**: Het is 3,5km rond de WEC
2. **FurthestDistance vraagstelling**: "Welke [POI] is zeker NIET de dichtste?" (Voronoi-cel exclusion) — NIET "welke is het verste?" (dat geeft wiskundig een veel grotere exclusion via Sutherland-Hodgman)
3. **Zone lock**: Kaart SLUITEN is altijd mogelijk ondanks zone lock — alleen de tooltip/indicator verschijnt
4. **Undo**: Alleen de allerlaatste actie kan ongedaan gemaakt worden
5. **gameStarted flag**: Wordt gezet zodra `saveSeed()` aangeroepen wordt — optionele spelregels zijn daarna vergrendeld
6. **distanceFromBike**: Wordt beantwoord door de HIDER (die de seeker-coördinaten ingeeft en de afstand berekent) — niet automatisch
7. **DEMOMODE als seed**: Was vroeger een trigger, nu vervangen door de demo-knop — DEMOMODE als seed werkt niet meer als speciale modus
8. **Geen live multiplayer**: Alles lokaal, communicatie via WhatsApp/Messenger

---

## 🔮 Mogelijke Toekomstige Features (besproken maar niet geïmplementeerd)

- [ ] Rand-van-speelveld vraag: "Is fiets minder dan Xm van de rand?" — X = `radius * 0.146` afgerond op mooie stappen (≤250m: stap 50, 250-1000m: stap 100, >1000m: stap 500)
- [ ] Meerdere optionele spelregels (systeem is al uitbreidbaar)
- [ ] Andere steden (Brugge, Antwerpen, Brussel) — spelcirkel en POIs aanpassen
- [ ] Real-time multiplayer
- [ ] Dark mode
