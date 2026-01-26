# 🎯 Gent Location Game

Een locatie-gebaseerd spel voor Gent, geïnspireerd door Jet Lag: The Game. Speel met vrienden in een zone van 3km rond het Belfort van Gent!

## 🎮 Hoe te spelen

1. **Start het spel**: Open de website en genereer een spel code (seed), of voer een gedeelde code in
2. **Deel de code**: Stuur de seed naar je vrienden via WhatsApp/Messenger zodat jullie dezelfde kaarten hebben
3. **Check je locatie**: Gebruik de "Check Mijn Locatie" knop om te zien of je binnen de speelzone bent
4. **Bekijk antwoorden**: De website geeft automatisch antwoorden op geografische vragen over je locatie
5. **Speel kaarten**: Voer de task op de kaart uit en stel de vraag aan je tegenstander via chat

## 📍 Spelregels

### Speelveld
- 3km radius rond het Belfort van Gent
- Locaties buiten deze zone zijn ongeldig

### Vragen die automatisch beantwoord worden
- **R40**: Binnen of buiten de binnenring?
- **Leie-Schelde**: Noorden of zuiden van de lijn?
- **Weba/IKEA**: Dichter bij welke locatie?
- **Dampoort**: Oosten of westen van het station?
- **Watersportbaan**: Oosten of westen van de tip?

### Speelkaarten
- Elke kaart heeft een **task** (bijv. "Voeder een duif")
- Als je de task voltooit, stel je de bijhorende **vraag** aan je tegenstander
- De tegenstander antwoordt, en afhankelijk van hun antwoord wordt een deel van de kaart uitgesloten
- Beide spelers hebben dezelfde kaarten in dezelfde volgorde (dankzij de seed)

## 🚀 Deployment op GitHub Pages

### Stap 1: Push naar GitHub
```bash
cd C:\Users\LaurenSchouppe\source\repos\gent-location-game
git init
git add .
git commit -m "Initial commit: Gent Location Game"
git branch -M main
git remote add origin https://github.com/JOUW-USERNAME/gent-location-game.git
git push -u origin main
```

### Stap 2: Activeer GitHub Pages
1. Ga naar je repository op GitHub
2. Klik op **Settings**
3. Scroll naar **Pages** (in het zijmenu)
4. Bij **Source**, selecteer **main** branch en **/ (root)**
5. Klik op **Save**
6. Na een paar minuten is je site live op: `https://JOUW-USERNAME.github.io/gent-location-game/`

## 🛠️ Technische Details

### Structuur
```
gent-location-game/
├── index.html          # Hoofd HTML bestand
├── styles.css          # CSS styling (mobile-first)
├── app.js             # Hoofd applicatie logica
├── geoUtils.js        # Geografische berekeningen
├── cards.js           # Kaarten systeem met seed-based shuffling
└── README.md          # Deze documentatie
```

### Features
- ✅ **Geen server nodig**: Volledig client-side met JavaScript
- ✅ **Mobile-first**: Geoptimaliseerd voor smartphones
- ✅ **Geolocation API**: Gebruikt de ingebouwde GPS van je telefoon
- ✅ **Seed-based randomization**: Beide spelers hebben dezelfde kaarten
- ✅ **GitHub Pages ready**: Deploy zonder backend
- ✅ **Offline vriendelijk**: Na eerste load werkt het grotendeels offline

### Browser vereisten
- Moderne browser (Chrome, Safari, Firefox, Edge)
- Geolocation API support
- JavaScript enabled
- HTTPS (vereist voor geolocation - GitHub Pages gebruikt automatisch HTTPS)

## 📱 Gebruik

### Locatie toestemming
Bij eerste gebruik zal je browser vragen om toestemming voor locatie toegang. Dit is noodzakelijk voor het spel om te werken.

### Seed delen
Kopieer de 6-karakter code en deel deze met je medespelers. Iedereen die dezelfde code gebruikt krijgt dezelfde kaarten in dezelfde volgorde.

### Nauwkeurigheid
De GPS nauwkeurigheid wordt getoond bij elke locatie check. Voor beste resultaten:
- Zorg voor goede GPS ontvangst (buiten, open lucht)
- Wacht tot je telefoon een nauwkeurige fix heeft
- Check opnieuw als de nauwkeurigheid >50m is

## 🔧 Aanpassingen maken

### Kaarten toevoegen
Bewerk `cards.js` en voeg items toe aan de `GAME_CARDS` array:
```javascript
{
    task: "🎯 Jouw task hier",
    question: "Jouw vraag hier?"
}
```

### Speelveld aanpassen
Wijzig de `GAME_RADIUS` constante in `geoUtils.js`:
```javascript
const GAME_RADIUS = 3000; // in meters
```

### Nieuwe vragen toevoegen
Voeg functies toe in `geoUtils.js` voor nieuwe geografische checks en update `performAllChecks()`.

## 📄 Licentie

Dit is een persoonlijk project voor vriendschappelijk gebruik. Veel plezier! 🎉

## 🐛 Problemen?

- **Locatie werkt niet**: Controleer browser permissies
- **Kaarten niet hetzelfde**: Zorg dat beide spelers exact dezelfde seed gebruiken
- **Site niet bereikbaar**: Wacht een paar minuten na activeren GitHub Pages

---

Made with ❤️ for playing in Gent! Veel plezier!
