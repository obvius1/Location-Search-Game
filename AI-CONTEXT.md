# AI Context - Gent Location Game

Dit bestand is voor AI-assistenten, zodat ze het project snel begrijpen zonder de hele code te moeten doorzoeken.

---

## Project

**Naam**: Jet Lag Gent (Gent Location Game)
**Type**: Progressive Web App (PWA), gemaakt voor de gsm
**Doel**: Locatiespel voor 2 teams in Gent. Elk team verstopt een fiets, het andere team zoekt die via taken en vragen.
**Stack**: Vanilla JavaScript, HTML/CSS, Leaflet 1.9.4, polygon-clipping 0.15.7 (via unpkg), localStorage
**Deployment**: GitHub Pages (statische site, geen backend)
**Laatst bijgewerkt**: 9 oktober 2026

Er speelt op dit moment niemand een spel. Oude opgeslagen spellen hoeven niet compatibel te blijven.

---

## Spelverloop

### Speelveld
- Cirkel van 3,5 km rond de WEC. `GAME_RADIUS` in geoUtils.js is de enige bron: zones, kaart en teksten (`.game-radius-km`) volgen automatisch. Het middelpunt is `LOCATIONS.center` in geo-data.json.
- Alleen locaties binnen het speelveld zijn geldig.

### Flow
```
1. Beide teams kiezen DEZELFDE spelcode (seed) -> dezelfde kaarten in dezelfde volgorde
2. Wizard stap 1: spelcode + optionele regel (zoneLockEnabled), vast tijdens het spel
3. Wizard stap 2: fiets op de kaart zetten (GPS of tikken, versleepbare pin, moet binnen het speelveld)
4. Wizard stap 3: 6 foto's afvinken + notities (straatnaam, eenrichting Ja/Nee, boom Ja/Nee)
5. Beide teams zien dezelfde flop: 4 kaarten per fase
6. Wie een taak eerst doet, stelt de vraag. In de app duid je per kaart aan: "Wij" of "De tegenstander"
   - Wij: je vult het antwoord van de tegenstander in -> uitgesloten zone op de kaart
   - De tegenstander: de app toont wat JIJ moet antwoorden over je eigen fiets
7. De kaart verlaat de flop; de volgende kaart van dezelfde fase komt op DEZELFDE plek
```

### Geen server
Alles is lokaal. De teams communiceren via WhatsApp/Messenger (antwoorden, foto's, coördinaten).

### Antwoordtypes (`answerType` in cards.json)

| answerType | Vraag | Zone (Wij) / jouw antwoord (Tegenstander) |
|---|---|---|
| `r40` | Binnen/buiten R40? | Point-in-polygon op R40_POLYGON |
| `leie-schelde` | Noorden/zuiden van Leie-Schelde? | Kant van de lijn |
| `proximity` | Dichter bij Weba of IKEA? | Middelloodlijn |
| `dampoort` / `watersportbaan` | Oosten/westen van ...? | Longitude |
| `bufferLine` | Binnen 800 m van de spoorlijn? | Buffer rond de lijn |
| `distanceFromBike` | Fiets binnen X m van jouw positie? | Wij: positie meegeven (`answer.position`). Tegenstander: hun coördinaten plakken, app rekent de afstand |
| `FurthestDistance` | Welke [POI] is zeker NIET de dichtste? | Voronoi-cel van de genoemde POI (Sutherland-Hodgman) |
| `radiusProximity` | Is er een [POI] binnen X m? | Nee: unie van cirkels; Ja: speelveld min de unie (polygon-clipping) |
| `SameOrAdjacentNeighborhood` | Zelfde of aangrenzende wijk als het item? | Wij kiezen de wijk van het item (`answer.wijk`) |
| `eliminateNeighborhood` | 3 wijken, 1 wordt geëlimineerd | Wij kiezen 3 wijken (`answer.three`) en daarna welke geëlimineerd werd |
| `copyQuestion` | Museumkaart: kopieer een vraag | Zie hieronder |
| `requiresAnswer: false` | Foto's, straatnaam, eenrichting, boom | Taakkaart. Tegenstander-kant toont de foto/notitie uit de checklist |

### Kopieer een vraag (`copyQuestion`)
- **Wij**: kies een vraag die de tegenstander jullie al stelde (kaart opgelost door `them`) en beantwoord ze met de gewone knoppen van die kaart. De zone hoort bij de museumkaart: `solved` krijgt `{ answer: { copy: { cardId, ...antwoord } } }`.
- **Tegenstander**: kies welke van jullie vragen (opgelost door `us`) ze kopiëren; de app toont jouw antwoord.
- Elke vraag kan maar één keer gekopieerd worden (`Game.copyCandidates`). Is er niets te kopiëren, dan blijft de kaart in de flop.

---

## Architectuur

```
gent-location-game/
├── index.html          # Schil: kopbalk, #stage (kaart, overlay, paneel), tabs
├── styles.css          # Alle stijlen (tokens licht/donker, gsm eerst, >=900px paneel rechts)
├── version.js          # APP_VERSION: getoond onder Meer, ook de cachenaam (verhogen bij elke release)
├── storage.js          # localStorage: gameData + gameRules
├── geoUtils.js         # Geodata laden, afstanden, wijken, automatische antwoorden (performAllChecks)
├── cards.js            # Kaarten laden, seed-shuffle, CardManager (flop)
├── map.js              # Leaflet-kaart, uitgesloten zones, kaartcontext, live locatie
├── game.js             # Spelregels: flop, oplossen, zones, kopiëren, antwoorden over je fiets, undo
├── ui.js               # Schermen: wizard, tabs Kaart/Kaarten/Meer, onderbladen, toast
├── service-worker.js   # Offline cache (network-first), bump CACHE_NAME bij elke release
├── manifest.json
├── polygon-helper.html # Dev tool voor polygooncoördinaten
└── data/
    ├── cards.json      # hiderChecklist + kaarten (3 fases)
    ├── geo-data.json   # POI's, R40, Leie-Schelde, spoorlijn, ...
    ├── rules.json      # Vaste regels + optionele regels (key = gameRules-sleutel)
    └── stadswijken-gent.geojson
```

Laadvolgorde in index.html: leaflet, polygon-clipping, version, storage, geoUtils, cards, map, game, ui.
`map.js` roept `UI.refreshMapStatus()` aan als zones of de live positie veranderen.

### game.js (`Game`)
- `restore()`, `start({seed, location, checklist, zoneLock})`, `reset()`
- `flop()`, `card(id)`, `deckLeft(phase)`, `solved()`, `solvedOf(id)`
- `answerOptions(card)`, `asksQuestion(card)`, `applyZone(data, card, answer, ownerId)`
- `solve(card, by, answer)`: `by` = `'us'` of `'them'`. Eerste keer: kaart naar `discarded`, nieuwe kaart op dezelfde plek, geeft de nieuwe kaart terug. Opnieuw oplossen = antwoord wijzigen (zone wordt vervangen, geen nieuwe kaart).
- `unsolve(cardId)`: zet een opgeloste kaart terug in de flop (antwoord en zone weg). Neemt de plek in van de laatst getrokken kaart van die fase, die terug naar het deck gaat. Kan niet zolang een museumkaart die vraag kopieerde (`copiedBy`).
- `undo()`: zet een volledige momentopname terug (gameData + kaartstand) van vóór de laatste `solve`.
- `hideAnswer(card)`: wat je antwoordt over je eigen fiets (`kind`: big, valid, distance, wijk, elim, text)
- `showBike()` / `setShowBike(v)`: eigen fiets tonen, standaard verborgen, onthouden in localStorage (`showBike`)

### map.js
- `initializeMap()`, `fitToField(bottomPadding)`, `fitToContext(bottomPadding)`, `centerOn(latlng, zoom, bottomPadding)`
- `setBikeMarker(location, {visible, draggable, onDrag})`, `setPinMarker(location)`
- `showCardContext(card, {wijk, three, position})` / `clearCardContext()`: tekent waar een vraag over gaat (R40, lijnen, POI's, cirkels, wijken) en zet `contextFocus` om op in te zoomen (begrensd tot het speelveld)
- `updateExclusionZones()`: alle zones -> één unie, afgeknipt aan het speelveld (`mergeExclusionLayers`) -> `mergedExclusion`
- `remainingFieldPercent()`, `isPointExcluded(lat, lng)`
- `startLiveLocation()` / `stopLiveLocation()`; `currentLiveLat` / `currentLiveLng`

### ui.js
- Staat in `ui`: `screen` (wizard/game), `tab` (map/cards/more), `sheet`, `toast`, `mapCtx`, `pin`, `wizard`
- `render()` = kopbalk + tabs + paneel + kaart-overlay + onderblad/toast
- Onderblad per kaart (`cardSheet`): eerst "Wie deed de taak eerst?", dan `seekControls` (Wij) of `hideBlock` (Tegenstander)
- "Groot op de kaart" houdt de context vast op de Kaart-tab (chip met ×)
- Coördinaten-onderblad: eigen positie kopiëren, geplakte coördinaten nakijken (in het veld, afstand tot fiets en jou, uitgesloten zone, pin op de kaart)
- Toast bovenaan onder de kopbalk, 4,5 s, tik om te sluiten, "Ongedaan maken", balkje dat aftelt
- Bevestigingen gebeuren in de pagina zelf (geen `confirm()`/`alert()`)

---

## Opslag

### gameData (`jetlag_game_data`)
```javascript
{
  seed: "ABC123",
  location: { lat, lng, timestamp },
  checklist: { photos: {0: true, ...}, notes: { straat, eenrichting: "Ja"|"Nee", boom: "Ja"|"Nee" } },
  cardAnswers: [{ cardId, cardTask, opponentAnswer }],      // zones met een tekstantwoord (r40, ...)
  exclusionZones: [{ type, cardId, ... }],                  // radiusProximity, distanceFromBike, furthestDistance, neighborhood, eliminateNeighborhood
  solved: [{ cardId, by: "us"|"them", answer }],
  gameStarted: true,
  version: 2
}
```
Zones hangen aan de vaste kaart-ID (`${seed}_${index}`), nooit aan de plek in de flop.

### Andere sleutels
- `cardManagerState`: `{ flop, discarded, deckIndex }`
- `gameRules`: `{ zoneLockEnabled }`, gekozen in de wizard, daarna vergrendeld
- `showBike`, `liveLocation`: voorkeuren per toestel, blijven bij een nieuw spel

---

## Optionele regel: geen taken in uitgesloten zones
- `zoneLockEnabled`, standaard aan, gekozen bij de start, vast tijdens het spel (Meer toont de regel uitgeschakeld)
- Kaart-tab: chip linksonder "Open zone · taken mogen" / "Uitgesloten zone · geen taken hier" (via `isPointExcluded` op de live positie)
- Bij het openen van een kaart in een uitgesloten zone: waarschuwing. Er is geen harde blokkering.

---

## Bekende aandachtspunten
1. Het middelpunt is de WEC. Gebruik nergens nog "Belfort".
2. FurthestDistance: "zeker NIET de dichtste" (Voronoi-cel), niet "de verste".
3. Undo kan enkel de laatste actie terugdraaien, via de toast. Later: een opgeloste kaart openen en het antwoord aanpassen, of "Terug in de flop" (ook als Wij/De tegenstander verkeerd gekozen werd).
4. De ingebouwde browser van de editor onderdrukt `confirm()`; daarom alles in de pagina.
6. iPhone-app op het beginscherm: houd `apple-mobile-web-app-status-bar-style` op `default`. Met `black-translucent` maakt iOS 26 de app een statusbalk te kort (zwarte balk onderaan, WebKit-bug 301108); dat is niet met CSS op te lossen.
5. Bij elke release `APP_VERSION` in version.js verhogen: dat is de versie onder Meer én de cachenaam van de service worker. Nieuwe JS-bestanden ook toevoegen aan `urlsToCache` in service-worker.js.

## Later (besproken, nog niet gebouwd)
- "Hoe werkt het spel"-rondleiding
- Rand-van-speelveld vraag, meer optionele regels, andere steden
