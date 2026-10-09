# 🎯 Gent Location Game

Een locatiegebaseerd spel voor 2 teams in Gent, geïnspireerd door Jet Lag: The Game. Elk team verstopt een fiets — het andere team probeert die te vinden via kaarten, vragen en uitsluitingszones op de kaart.

## 🎮 Spelconcept

- **2 teams**, elk met een fiets die ze verstoppen in Gent
- **Hider**: verstopt de fiets, neemt 6 foto's en noteert straatnaam, eenrichting en boom, en beantwoordt vragen van het andere team
- **Seeker**: voert taken uit op kaarten, stelt vragen aan de hider via WhatsApp/Messenger, en probeert de fiets te lokaliseren via uitsluitingszones op de kaart
- **Doel**: als eerste de fiets van het andere team vinden

### Speelveld
- **Locatie**: Gent (België)
- **Radius**: 3,5 km rond de WEC
- Locaties buiten deze zone zijn ongeldig

## 🕹️ Hoe te spelen

1. **Nieuw spel**: beide teams kiezen **exact dezelfde** spelcode en dezelfde optionele regel
2. **Verstop de fiets**: zet de fiets op de kaart (GPS of tikken, versleep de pin) en vul de checklist in
3. **De flop**: beide teams zien dezelfde kaarten, 4 per fase (tab **Kaarten**)
4. **Wie was eerst?**: open een kaart en kies **Wij** of **De tegenstander**
   - **Wij**: vul het antwoord van de tegenstander in, de app tekent een uitgesloten zone op de kaart
   - **De tegenstander**: de app toont meteen wat jij moet antwoorden over je fiets
5. **Volgende kaart**: de kaart verlaat de flop en de volgende kaart van die fase komt op dezelfde plek
6. **Zoekgebied verkleint**: de tab **Kaart** toont hoeveel procent van het speelveld nog mogelijk is
7. **Fiets gevonden**: het team dat als eerste de fiets van de tegenstander vindt, wint

### Geen centrale server
Alles verloopt lokaal — communicatie via WhatsApp/Messenger. Antwoorden, bewijsfoto's en GPS-coördinaten worden via chat gedeeld.

## 🗺️ Vragen

Bij elke vraag toont de kaart waar ze over gaat. Was de tegenstander eerst, dan berekent de app jouw antwoord op basis van de locatie van je fiets:

| Type | Vraag |
|---|---|
| **R40** | Binnen of buiten de R40 binnenring? |
| **Leie-Schelde** | Noorden of zuiden van de Leie-Schelde lijn? |
| **Weba/IKEA** | Dichter bij Weba of IKEA? |
| **Dampoort** | Oosten of westen van Dampoort-station? |
| **Watersportbaan** | Oosten of westen van de watersportbaantip? |
| **Spoorlijn buffer** | Binnen 800m van de spoorlijn Oostende–Antwerpen? |
| **Afstand van fiets** | Is de fiets binnen X meter van een bepaalde positie? *(plak de coördinaten van de tegenstander)* |
| **Verste POI** | Welke [POI] is zeker NIET de dichtste? *(Voronoi-cel exclusion)* |
| **Radius POI** | Is er een [bibliotheek/ziekenhuis/watertoren] binnen X meter? |
| **Wijk** | In welke of aangrenzende wijk staat de fiets? |
| **Wijk elimineren** | Welke van deze 3 wijken kan je uitsluiten? |
| **Kopieer een vraag** | Museumkaart: stel een vraag opnieuw die al gesteld is *(elke vraag één keer)* |
| **Foto-hints** | Foto van links/rechts/voor/achter/beneden/gebouw *(hider stuurt via chat)* |

## ⚙️ Optionele spelregels

Kies je bij de start van een nieuw spel. Tijdens het spel liggen ze vast (zichtbaar onder **Meer**).

| Regel | Default | Beschrijving |
|---|---|---|
| **Geen taken in uitgesloten zones** | AAN | Taken mogen niet uitgevoerd worden in al-uitgesloten zones. De kaart toont of je in een open of uitgesloten zone staat |

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
├── ui.js                   # Schermen (wizard, Kaart/Kaarten/Meer, onderbladen)
├── game.js                 # Spelregels (flop, antwoorden, kopiëren, undo)
├── map.js                  # Kaart, uitgesloten zones, kaartcontext, live locatie
├── cards.js                # Kaartensysteem + seed-based shuffling
├── geoUtils.js             # Geografische berekeningen
├── storage.js              # LocalStorage
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
- ✅ **Undo** — laatste actie ongedaan maken via de melding bovenaan
- ✅ **Fiets verbergen** — je eigen fiets is standaard verborgen op je scherm
- ✅ **Coördinaten** — je positie kopiëren en coördinaten van de tegenstander nakijken

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
