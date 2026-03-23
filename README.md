# 🎯 Gent Location Game

Een locatiegebaseerd spel voor 2 teams in Gent, geïnspireerd door Jet Lag: The Game. Elk team verstopt een fiets — het andere team probeert die te vinden via kaarten, vragen en uitsluitingszones op de kaart.

## 🎮 Spelconcept

- **2 teams**, elk met een fiets die ze verstoppen in Gent
- **Hider**: verstopt de fiets, vult een 9-item checklist in (foto's, notities), en beantwoordt vragen van het andere team
- **Seeker**: voert taken uit op kaarten, stelt vragen aan de hider via WhatsApp/Messenger, en probeert de fiets te lokaliseren via uitsluitingszones op de kaart
- **Doel**: als eerste de fiets van het andere team vinden

### Speelveld
- **Locatie**: Gent (België)
- **Radius**: 3,5 km rond de WEC
- Locaties buiten deze zone zijn ongeldig

## 🕹️ Hoe te spelen

1. **Voer een seed in**: Beide teams gebruiken **exact dezelfde** 6-karakter code → identieke kaartvolgorde
2. **Verstop de fiets**: De hider vult de 9-item checklist in (foto's, omschrijvingen) en bevestigt de GPS-locatie
3. **Speel kaarten**: Beide teams zien dezelfde 12 kaarten (de "flop" — 4 per fase)
4. **Voer tasks uit**: Voer de task op de kaart uit, stel daarna de bijhorende vraag aan je tegenstander via chat
5. **Antwoord berekend**: De app berekent het antwoord automatisch op basis van GPS → een uitsluitingszone verschijnt op de kaart
6. **Zoekgebied verkleint**: Hoe meer kaarten gespeeld, hoe kleiner het gebied waar de fiets kan zijn
7. **Fiets gevonden**: Het team dat als eerste de fiets van de tegenstander vindt, wint

### Geen centrale server
Alles verloopt lokaal — communicatie via WhatsApp/Messenger. Antwoorden, bewijsfoto's en GPS-coördinaten worden via chat gedeeld.

## 🗺️ Automatische antwoorden

De app berekent automatisch het antwoord op basis van de GPS-locatie van de hider:

| Type | Vraag |
|---|---|
| **R40** | Binnen of buiten de R40 binnenring? |
| **Leie-Schelde** | Noorden of zuiden van de Leie-Schelde lijn? |
| **Weba/IKEA** | Dichter bij Weba of IKEA? |
| **Dampoort** | Oosten of westen van Dampoort-station? |
| **Watersportbaan** | Oosten of westen van de watersportbaantip? |
| **Spoorlijn buffer** | Binnen 800m van de spoorlijn Oostende–Antwerpen? |
| **Afstand van fiets** | Is de fiets binnen X meter van een bepaalde positie? *(hider checkt manueel)* |
| **Verste POI** | Welke [POI] is zeker NIET de dichtste? *(Voronoi-cel exclusion)* |
| **Radius POI** | Is er een [bibliotheek/ziekenhuis/watertoren] binnen X meter? |
| **Wijk** | In welke of aangrenzende wijk staat de fiets? |
| **Wijk elimineren** | Welke van deze 3 wijken kan je uitsluiten? |
| **Foto-hints** | Foto van links/rechts/voor/achter/beneden/gebouw *(hider stuurt via chat)* |

## ⚙️ Optionele spelregels

Bereikbaar via de **⚙️ Optionele Spelregels** knop. Regels kunnen alleen aangepast worden **voor** de start van het spel.

| Regel | Default | Beschrijving |
|---|---|---|
| **Zone vergrendeling** | AAN | Taken mogen niet uitgevoerd worden in al-uitgesloten zones |

## 🚀 Deployment

### GitHub Pages
1. Push de repository naar GitHub
2. Ga naar **Settings → Pages**
3. Selecteer branch **main** en root **/**
4. De app is live op: `https://JOUW-USERNAME.github.io/gent-location-game/`

## 🛠️ Technische details

### Bestandsstructuur
```
gent-location-game/
├── index.html              # PWA entry point
├── styles.css              # Mobile-first CSS
├── app.js                  # Hoofdlogica
├── cards.js                # Kaartensysteem + seed-based shuffling
├── geoUtils.js             # Geografische berekeningen
├── storage.js              # LocalStorage management
├── service-worker.js       # Offline PWA support
├── manifest.json           # PWA manifest
├── data/
│   ├── cards.json          # Kaartdefinities (hider checklist + speelkaarten)
│   ├── geo-data.json       # POI-locaties (colruyts, bibliotheken, etc.)
│   ├── rules.json          # Vaste + optionele spelregels
│   └── stadswijken-gent.geojson  # GeoJSON met Gentse wijken
└── icons/                  # PWA app icons
```

### Features
- ✅ **Geen server nodig** — volledig client-side
- ✅ **Mobile-first** — geoptimaliseerd voor smartphones
- ✅ **PWA** — installeerbaar, werkt offline na eerste load
- ✅ **Live locatie** — blauw pulserende dot toont je huidige positie
- ✅ **Seed-based randomization** — identieke kaartvolgorde voor beide teams
- ✅ **Exacte uitsluitingszones** — wiskundig berekende polygonen (Voronoi, Sutherland-Hodgman)
- ✅ **Undo** — laatste actie ongedaan maken
- ✅ **Tutorial** — in-app uitleg via de 📖 knop

### Kaarten aanpassen
Bewerk `data/cards.json` om kaarten toe te voegen of aan te passen:
```json
{
  "task": "Beschrijving van de task",
  "question": "Vraag aan de tegenstander?",
  "phase": 1,
  "answerType": "r40"
}
```

### Browser vereisten
- Moderne browser (Chrome, Safari, Firefox, Edge)
- Geolocation API support
- JavaScript enabled
- HTTPS (vereist voor geolocation — GitHub Pages gebruikt automatisch HTTPS)

## 🐛 Problemen?

- **Locatie werkt niet**: Controleer browser-permissies voor locatietoegang
- **Kaarten niet hetzelfde**: Zorg dat beide spelers exact dezelfde seed gebruiken
- **Site niet bereikbaar**: Wacht een paar minuten na het activeren van GitHub Pages

---

Made with ❤️ for playing in Gent! Veel plezier! 🎉
