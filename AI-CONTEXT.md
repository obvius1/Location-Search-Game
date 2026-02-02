# 🤖 AI Context - Gent Location Game

Dit bestand is speciaal voor AI-assistenten (zoals GitHub Copilot) om het project volledig te begrijpen.

---

## 📋 Project Overzicht

**Naam**: Gent Location Game (Jet Lag Game ripoff variant)  
**Type**: Mobile-first Progressive Web App (PWA)  
**Doel**: Een locatie-gebaseerd spel voor vrienden om gezamenlijk te spelen in Gent  
**Stack**: Vanilla JavaScript, HTML/CSS, Leaflet Maps, LocalStorage  
**Deployment**: GitHub Pages (statische site, geen backend)  
**Status**: Functioneel met feature/qa-updates branch

---

## 🎮 Game Mechanica

### Speelveld
- **Locatie**: Gent (België)
- **Radius**: 4km rond het Belfort van Gent
- **Regel**: Alleen locaties binnen deze zone zijn geldig

### Game Flow
```
1. Seed genereren/delen → beide spelers krijgen dezelfde kaarten
2. Hider checklist → 4 foto's nemen (voor/achter/links/rechts)
3. Locatie bepalen → GPS of handmatig marker plaatsen
4. Kaarten bekijken → per fase (1 → 2 → 3)
5. Tasks uitvoeren → vragen stellen aan tegenstander
6. Exclusion zones → kaarten gedeeltelijk uit-grijs-en op basis van antwoorden
```

### Automatische Antwoorden (Geografische Vragen)
Bij bepaalde vragen kan de game automatisch het juiste antwoord bepalen:

| Vraag | Type | Hoe het werkt |
|-------|------|---------------|
| Binnen/buiten R40? | `r40` | Point-in-polygon test met R40_POLYGON |
| Noorden/zuiden Leie-Schelde? | `leie-schelde` | Point-to-line side test met LEIE_SCHELDE_LINE |
| Dichter bij Weba of IKEA? | `proximity` | Berekent afstand tot beide POIs, kiest dichtstbijzijnde |
| Oosten/westen Dampoort? | `dampoort` | Vergelijkt longitude met station Dampoort |
| Oosten/westen Watersportbaan? | `watersportbaan` | Vergelijkt longitude met watersportbaan tip |
| Zelfde/aangrenzende wijk? | `SameOrAdjacentNeighborhood` | Point-in-polygon test + buurwijk detectie |

---

## 🏗️ Architectuur

### Bestanden Structuur
```
gent-location-game/
├── index.html              # PWA entry point, map + controls
├── styles.css              # Mobile-first CSS
├── app.js                  # Hoofd logica (1694 lijnen)
├── cards.js                # Kaarten + seed-based shuffling (297 lijnen)
├── geoUtils.js             # Geografische berekeningen (302 lijnen)
├── storage.js              # LocalStorage management
├── service-worker.js       # Offline PWA support
├── manifest.json           # PWA manifest
├── README.md               # User-facing documentatie
├── AI-CONTEXT.md           # Dit bestand!
├── data/
│   ├── cards.json          # Hider checklist + speelkaarten (3 fases)
│   ├── geo-data.json       # GeoJSON zones + POI locations
│   └── stadswijken-gent.geojson  # GeoJSON met alle Gentse wijken (25 wijken)
└── icons/                  # PWA app icons
```

### Core Modules

#### **app.js** - Hoofdapplicatie
- Map initialisatie (Leaflet)
- Event listeners (buttons, location, controls)
- Game state management (seedInput, gameData, cardIndex)
- UI flow (setup → location → checklist → cards)
- Exclusion zones visualisatie
- Flop view (alle kaarten tegelijk)
- Single card view (één kaart tegelijk)

**Key functionen**:
- `handleStartGame()` - Start spel met seed
- `handleGetGPS()` - Haal locatie op via Geolocation API
- `handleConfirmLocation()` - Bevestig locatie en voer geografische tests uit (inclusief wijk detectie)
- `drawNeighborhoods()` - Teken alle 25 stadswijken op kaart met labels
- `openNeighborhoodModal()` - Open modal voor wijk antwoord selectie
- `confirmNeighborhoodAnswer()` - Verwerk wijk antwoord en update exclusions
- `updateExclusionZones()` - Teken uitgesloten zones op kaart (inclusief wijken)
- `createExclusionLayerFromData()` - Creëer exclusion layers voor wijken
- `switchView()` - Wissel tussen single/flop/discarded view
- `handleDiscardCard()` - Markeer kaart als opgelost (detecteert SameOrAdjacentNeighborhood)

#### **cards.js** - Kaarten Systeem
- **SeededRandom klasse**: Mulberry32 RNG met string-to-seed hashing
- **Shuffle per fase**: Phase 1 → Phase 2 → Phase 3 worden apart geshufeld
- **Deterministische ordering**: Dezelfde seed = dezelfde kaartenvolgorde

**Key functionen**:
- `generateSeed()` - Genereert 6-char random seed (ABCD1234 format)
- `createDeck(seed)` - Maakt shuffled deck op basis van seed
- `shuffleArray(array, rng)` - Fisher-Yates shuffle met seeded RNG
- `loadCards()` - Laadt cards.json

**Belangrijk**: De seed zorgt ervoor dat beide spelers exact dezelfde kaarten in dezelfde volgorde krijgen!

#### **geoUtils.js** - Geografische Berekeningen
- Laadt GeoJSON zones (R40, Leie-Schelde)
- Laadt stadswijken (25 wijken van Gent)
- Voert geografische tests uit
- Detecteert aangrenzende wijken via polygon touch detection

**Key functionen**:
- `pointInPolygon(point, polygon)` - Ray casting algorithm
- `pointOnLeftOfLine(point, lineStart, lineEnd)` - Cross product
- `distanceTo(lat1, lng1, lat2, lng2)` - Haversine formule
- `isWithinGameZone(lat, lng)` - Check 4km radius
- `getAutoAnswer(lat, lng, questionType)` - Bepaalt automatisch antwoord
- `getNeighborhoodAtLocation(lat, lng)` - Bepaalt wijk op basis van GPS
- `getAdjacentNeighborhoods(neighborhoodName)` - Vindt buurwijken
- `polygonsTouch(polygon1, polygon2)` - Check of wijken elkaar raken
- `loadNeighborhoods()` - Laadt stadswijken-gent.geojson
- `getAutoAnswer(lat, lng, questionType)` - Bepaalt automatisch antwoord

#### **storage.js** - LocalStorage
- `saveGameData(gameData)` - Slaat spel op in localStorage
- `loadGameData()` - Laadt spel uit localStorage
- `hasActiveGame()` - Check of er een actief spel is

### Data Structuur

#### **cards.json** Formaat
```javascript
{
  "hiderChecklist": [
    "Taak 1",
    "Taak 2"
  ],
  "cards": [
    {
      "task": "Beschrijving van de taak",
      "question": "De vraag aan tegenstander",
      "phase": 1,  // 1, 2, of 3
      "answerType": "r40",  // of "leie-schelde", "proximity", "dampoort", etc.
      "pois": ["weba", "ikea"],  // Optioneel, voor proximity questions
      "requiresAnswer": true  // Optioneel
    }
  ]
}
```

#### **geo-data.json** Formaat
```javascript
{
  "locations": {
    "ikea": { "lat": 51.0123, "lng": 3.7456 },
    "weba": { "lat": 51.0234, "lng": 3.7567 },
    // ... meer POIs
  },
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "R40 Binnenring Gent" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng, lat], [lng, lat], ...]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Leie-Scheldelijn" },
      "geometry": {
        "type": "LineString",
        "coordinates": [[lng, lat], [lng, lat], ...]
      }
    }
  ]
}
```

---

## 🔑 Belangrijke Concepten

### 1. Seed-Based Randomization
- **Doel**: Zorgen dat beide spelers exact dezelfde kaarten krijgen
- **Hoe**: String-seed wordt omgezet naar getal via hashing, dan Mulberry32 RNG
- **Voorbeeld**:
  - Speler A: seed "ABCD12" → deck [kaart 5, 3, 8, 1, ...]
  - Speler B: seed "ABCD12" → deck [kaart 5, 3, 8, 1, ...] (identiek!)
  - Speler C: seed "XYZDEF" → deck [kaart 2, 7, 4, 9, ...] (anders)

### 2. Exclusion Zones (Grijze Gebieden)
- Als opponent "Binnen R40" zegt en ze zijn buiten → heel kaart grijst uit
- Als opponent "IKEA dichter" zegt en ze zijn dichter bij Weba → halve kaart grijst uit
- Meerdere antwoorden = meerdere exclusion zones tekenen

### 3. Point-in-Polygon (R40)
- Gebruikt ray casting algorithm
- Test of speler binnen R40 ring is
- Belangrijk voor automatische antwoorden


### 6. Stadswijken Feature (Nieuw!)
- 25 wijken van Gent geladen vanuit GeoJSON
- Wijken getekend op kaart met subtiele styling + labels
- Automatische detectie van huidige wijk via GPS
- Dropdown om wijk te selecteren (als speler verplaatst is)
- Buurwijken worden automatisch gedetecteerd via polygon touch
- "Ja/Nee" antwoord bepaalt welke wijken worden uitgesloten:
  - **"Ja"**: Alle wijken BEHALVE geselecteerde + buren worden rood
  - **"Nee"**: Geselecteerde wijk + buren worden rood
- Modal UI voor wijk antwoord selectie
### 4. Line Side Detection (Leie-Schelde)
- Gebruikt cross product (determinant)
- Test welke kant van lijn speler is
- Bepaalt noorden/zuiden

### 5. PWA Features
- Installeerbaar als native app (iOS/Android)
- Service Worker voor offline support
- Manifest.json voor meta-info
- Icons voor verschillende devices

---

## 📱 UI Flow

```
START
  ↓
[Setup Section] → Genereer/voer seed in
  ↓ Start Game
[Location Section] → GPS ophalen of handmatig plaatsen
  ↓ Confirm Location
[Checklist Section] → 4 foto's nemen (hider)
  ↓ Alles voltooid
[Cards Section] ← Speel kaarten!
  ├─ Single View: één kaart tegelijk
  ├─ Flop View: alle kaarten tegelijk
  └─ Discarded View: statistieken
```

---

## 💾 Game State in LocalStorage

```javascript
{
  "gent-location-game": {
    "seed": "ABCD12",
    "deck": [{ card object }, { card object }, ...],
    "discardedCards": [2, 5, 8],  // indices
    "location": { "lat": 51.1234, "lng": 3.7890, "accuracy": 15 },
    "exclusionZones": [
      { "type": "r40-outside", "answer": "buiten" },
      { "type": "ikea-closer", "answer": "weba" }
    ],
    "checklistCompleted": [true, false, true, true]
  }
}
```

---

## 🗺️ Kaart Features (Leaflet)

- **Base layer**: OpenStreetMap
- **Game zone**: Groene cirkel (4km radius)
- **R40 polygon**: Getekend als grijze polygon
- **Leie-Schelde line**: Getekend als lijn
- **POI markers**: Blauwe markers voor Weba, IKEA, Dampoort, Watersportbaan
- **Current location**: Groene marker met accuracy circle
- **Exclusion zones**: Grijze polygonen/zones (afhankelijk van antwoorden)

---

## 🚀 Deploy & PWA

- **Platform**: GitHub Pages
- **URL**: https://JOUW-USERNAME.github.io/gent-location-game/
- **HTTPS**: Automatisch (vereist voor Geolocation API)
- **Installatie**: "Add to Home Screen" op mobiel of "Install" in Chrome menu

---

## ⚠️ Beperkingen & Notes

1. **Offline**: Werkt offline ALS het eerst online geladen is (service worker cacht assets)
2. **GPS Accuracy**: Hangt af van device en ontvangst (ideaal <15m)
3. **Geolocation permission**: Browser vraagt om toestemming, HTTPS vereist
4. **Mobile-only**: Ontworpen voor mobiel, niet optimaal op desktop
5. **Seed collision**: Theoretisch mogelijk (6 char alphanumeric = ~2 miljard combinaties) maar zeer onwaarschijnlijk
6. **No real-time**: Geen live updates tussen spelers, alles is lokaal

---

## 🔄 Workflow voor Development

### Kaarten toevoegen/wijzigen
- Edit `data/cards.json`
- Voeg object toe met `task`, `question`, `phase`, `answerType`
- Optioneel: `pois` array voor proximity questions

### Geografische data updaten
- Edit `data/geo-data.json`
- GeoJSON format (lng, lat)
- Update R40 polygon of Leie-Schelde line
- Update POI locations

### UI wijzigingen
- Edit `index.html` (structure)
- Edit `styles.css` (styling)
- Update event listeners in `app.js` indien nodig

### Logica wijzigingen
- `cards.js`: Seed/shuffle logica
- `geoUtils.js`: Geografische berekeningen
- `app.js`: Game flow & UI logic
- `storage.js`: Data persistence

---

## 🎯 Huidige Branch Info

- **Main branch**: Production ready
- **Feature branch**: feature/qa-updates (latest changes)
- Recent commits zijn gericht op QA en updates

---

## 🔮 Mogelijke Toekomstige Features

- [ ] Real-time multiplayer (WebSockets)
- [ ] Leaderboards
- [ ] Custom card sets
- [ ] Difficulty levels
- [ ] Achievements/badges
- [ ] Sound effects
- [ ] Animated transitions
- [ ] Multi-language support
- [ ] Dark mode

---

## 📝 Debugging Tips

- **Console logs**: Veel logging in loadZones(), loadCards(), handleGetGPS(), etc.
- **LocalStorage viewer**: F12 → Application → LocalStorage → zie game data
- **Map debugging**: Zoom out om zones te zien, markers moeten zichtbaar zijn
- **Geolocation issues**: Check HTTPS + permission + GPS signal
- **Seed issues**: Controleer SeededRandom hash functie en shuffle order per phase

---

**Laatst geupdate**: 2 Februari 2026  
**Project status**: Actief in development (QA branch)
