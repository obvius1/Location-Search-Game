// Main application logic voor Gent Location Game

let cardManager = null;
let map = null;
let gameZoneCircle = null;
let inverseMask = null;
let r40Polygon = null;
let leieScheldeLine = null;
let currentLocationMarker = null;
let accuracyCircle = null;

// DOM elements
const controlsContainer = document.getElementById('controls-container');
const controlsHandle = document.getElementById('controls-handle');
const setupSection = document.getElementById('setup-section');
const locationSection = document.getElementById('location-section');
const questionsSection = document.getElementById('questions-section');
const cardsSection = document.getElementById('cards-section');

const seedInput = document.getElementById('seed-input');
const generateSeedBtn = document.getElementById('generate-seed-btn');
const startGameBtn = document.getElementById('start-game-btn');

const getGpsBtn = document.getElementById('get-gps-btn');
const confirmLocationBtn = document.getElementById('confirm-location-btn');
const adjustLocationContainer = document.getElementById('adjust-location-container');
const locationStatus = document.getElementById('location-status');
const locationResult = document.getElementById('location-result');
const questionsResult = document.getElementById('questions-result');

const currentCardNumber = document.getElementById('current-card-number');
const totalCards = document.getElementById('total-cards');
const currentCardElement = document.getElementById('current-card');
const prevCardBtn = document.getElementById('prev-card-btn');
const nextCardBtn = document.getElementById('next-card-btn');

const currentSeedDisplay = document.getElementById('current-seed');
const copySeedBtn = document.getElementById('copy-seed-btn');
const resetGameBtn = document.getElementById('reset-game-btn');

// Event Listeners
generateSeedBtn.addEventListener('click', handleGenerateSeed);
startGameBtn.addEventListener('click', handleStartGame);
getGpsBtn.addEventListener('click', handleGetGPS);
confirmLocationBtn.addEventListener('click', handleConfirmLocation);
prevCardBtn.addEventListener('click', handlePreviousCard);
nextCardBtn.addEventListener('click', handleNextCard);
copySeedBtn.addEventListener('click', handleCopySeed);
resetGameBtn.addEventListener('click', handleResetGame);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Gent Location Game geladen!');
    
    // Laad zone data
    await loadZones();
    
    initializeMap();
    initializeControls();
    loadSavedGameData();
});

/**
 * Laad opgeslagen game data
 */
function loadSavedGameData() {
    const gameData = loadGameData();
    
    // Check of er een actief spel is
    if (hasActiveGame()) {
        console.log('Actief spel gevonden:', gameData);
        
        // Herstel seed
        if (gameData.seed) {
            seedInput.value = gameData.seed;
            // Auto-start game
            handleStartGame();
        }
        
        // Herstel locatie
        if (gameData.location) {
            const loc = gameData.location;
            console.log('Locatie hersteld:', loc);
            
            // Plaats marker op opgeslagen locatie
            if (!currentLocationMarker) {
                currentLocationMarker = L.marker([loc.lat, loc.lng], {
                    draggable: false,
                    icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                }).addTo(map);
            }
            
            // Zoom naar locatie
            map.setView([loc.lat, loc.lng], 15);
            
            // Simuleer bevestigde locatie
            const result = performAllChecks(loc.lat, loc.lng);
            if (result.valid) {
                // Bereken afstand
                const distanceToCenter = calculateDistance(
                    loc.lat, loc.lng,
                    BELFORT_GENT.lat, BELFORT_GENT.lng
                );
                
                // Verberg locatie sectie en plaats onderaan
                locationSection.classList.add('location-confirmed');
                const controlsContent = document.getElementById('controls-content');
                controlsContent.appendChild(locationSection);
                
                // Update status
                locationStatus.querySelector('.status-icon').textContent = '✅';
                locationStatus.querySelector('.status-text').textContent = 'Locatie vastgelegd (hersteld)';
                locationStatus.classList.add('valid');
                
                // Toon details
                locationResult.classList.remove('hidden');
                locationResult.classList.add('valid');
                locationResult.innerHTML = `
                    <div class="location-detail-item">
                        <span class="detail-icon">🎯</span>
                        <span class="detail-label">Afstand tot Belfort:</span>
                        <span class="detail-value">${Math.round(distanceToCenter)}m</span>
                    </div>
                    <div class="location-detail-item">
                        <span class="detail-icon">📍</span>
                        <span class="detail-label">Coördinaten:</span>
                        <span class="detail-value" id="coords-display">${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}</span>
                        <button id="copy-coords-btn" class="btn-icon" title="Kopieer coördinaten">📋</button>
                    </div>
                `;
                
                // Copy functionaliteit
                document.getElementById('copy-coords-btn').addEventListener('click', async () => {
                    const coords = `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
                    try {
                        await navigator.clipboard.writeText(coords);
                        const btn = document.getElementById('copy-coords-btn');
                        btn.textContent = '✅';
                        setTimeout(() => btn.textContent = '📋', 2000);
                    } catch (error) {
                        alert('Coördinaten: ' + coords);
                    }
                });
                
                // Update marker popup
                currentLocationMarker.bindPopup(`
                    <b>✅ Jouw Locatie</b><br>
                    ${Math.round(distanceToCenter)}m van Belfort<br>
                    ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}
                `);
                
                // Toon vragen
                displayQuestions(result.checks);
            }
        }
    }
}

/**
 * Initialiseert de controls bottom sheet
 */
function initializeControls() {
    // Toon controls container met setup sectie
    controlsContainer.classList.remove('hidden');
    
    // Toggle controls visibility
    if (controlsHandle) {
        controlsHandle.addEventListener('click', () => {
            controlsContainer.classList.toggle('minimized');
        });
    }
}

/**
 * Initialiseert de Leaflet kaart met speelveld
 */
function initializeMap() {
    // Initialiseer kaart gecentreerd op Belfort Gent
    map = L.map('map').setView([BELFORT_GENT.lat, BELFORT_GENT.lng], 13);
    
    // Voeg OpenStreetMap tiles toe
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Markeer het Belfort (centrum)
    L.marker([BELFORT_GENT.lat, BELFORT_GENT.lng], {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(map).bindPopup('<b>Belfort van Gent</b><br>Centrum van het speelveld');
    
    // Teken de speelzone grens (dunne lijn)
    gameZoneCircle = L.circle([BELFORT_GENT.lat, BELFORT_GENT.lng], {
        color: '#2563eb',
        fillColor: 'transparent',
        fillOpacity: 0,
        radius: GAME_RADIUS,
        weight: 2
    }).addTo(map).bindPopup('<b>Speelveld</b><br>3km rondom het Belfort');
    
    // Maak inverse mask - alles buiten de zone wordt grijs
    // Grote outer rectangle (ruim buiten Gent)
    const outerRing = [
        [52, 2],
        [52, 5],
        [50, 5],
        [50, 2]
    ];
    
    // Genereer punten voor de cirkel (inner ring - REVERSED voor gat)
    const circlePoints = [];
    const numPoints = 64;
    const earthRadius = 6371000; // meters
    
    for (let i = 0; i < numPoints; i++) {
        const angle = (i * 2 * Math.PI / numPoints);
        
        // Bereken offset in graden
        const latOffset = (GAME_RADIUS / earthRadius) * (180 / Math.PI) * Math.cos(angle);
        const lngOffset = (GAME_RADIUS / earthRadius) * (180 / Math.PI) * Math.sin(angle) / Math.cos(BELFORT_GENT.lat * Math.PI / 180);
        
        circlePoints.unshift([BELFORT_GENT.lat + latOffset, BELFORT_GENT.lng + lngOffset]);
    }
    
    // Maak polygon met gat (outer counterclockwise, inner clockwise)
    inverseMask = L.polygon([outerRing, circlePoints], {
        color: 'transparent',
        fillColor: '#000000',
        fillOpacity: 0.4,
        weight: 0,
        interactive: false
    }).addTo(map);
    
    // Teken de R40 ring
    const r40Coords = R40_POLYGON.map(point => [point.lat, point.lng]);
    r40Polygon = L.polygon(r40Coords, {
        color: '#ea580c',
        fillColor: '#fb923c',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 10'
    }).addTo(map).bindPopup('<b>R40 Ring</b><br>Gentse binnenring');
    
    // Teken de Leie-Schelde lijn
    if (LEIE_SCHELDE_LINE.length > 0) {
        const leieScheldeCoords = LEIE_SCHELDE_LINE.map(point => [point.lat, point.lng]);
        leieScheldeLine = L.polyline(leieScheldeCoords, {
            color: '#1e40af',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 5'
        }).addTo(map).bindPopup('<b>Leie-Schelde Lijn</b><br>Scheiding Noord-Zuid Gent');
    }
    
    // Voeg andere belangrijke locaties toe
    addLocationMarker(LOCATIONS.dampoort, 'Dampoort Station', 'blue');
    addLocationMarker(LOCATIONS.watersportbaan_tip, 'Watersportbaan', 'green');
    addLocationMarker(LOCATIONS.weba, 'Weba Shopping', 'orange');
    addLocationMarker(LOCATIONS.ikea, 'IKEA Gent', 'orange');
    
    // Voeg een legenda toe
    addMapLegend();
}

/**
 * Voegt een locatie marker toe aan de kaart
 */
function addLocationMarker(location, name, color) {
    const colorMap = {
        'blue': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        'green': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        'orange': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        'violet': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png'
    };
    
    L.marker([location.lat, location.lng], {
        icon: L.icon({
            iconUrl: colorMap[color] || colorMap['blue'],
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(map).bindPopup(`<b>${name}</b>`);
}

/**
 * Voegt een legenda toe aan de kaart
 */
function addMapLegend() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <h4>Legenda</h4>
            <div><span class="legend-circle" style="background: #3b82f6;"></span> Speelveld (3km)</div>
            <div><span class="legend-line" style="background: #fb923c;"></span> R40 Ring</div>
            <div><span class="legend-line" style="background: #1e40af;"></span> Leie-Schelde Lijn</div>
            <div><span class="legend-marker" style="background: #dc2626;"></span> Belfort (centrum)</div>
            <div><span class="legend-marker" style="background: #22c55e;"></span> Je locatie</div>
        `;
        return div;
    };
    
    legend.addTo(map);
}

/**
 * Genereert een nieuwe seed
 */
function handleGenerateSeed() {
    const seed = generateSeed();
    seedInput.value = seed;
}

/**
 * Start het spel met de opgegeven seed
 */
function handleStartGame() {
    const seed = seedInput.value.trim();
    
    if (!seed) {
        alert('Voer een spel code in of genereer er een!');
        return;
    }
    
    // Initialiseer card manager
    cardManager = new CardManager(seed);
    
    // Sla seed op in storage
    saveSeed(seed);
    
    // Update UI
    currentSeedDisplay.textContent = seed;
    copySeedBtn.classList.remove('hidden');
    resetGameBtn.classList.remove('hidden');
    
    // Toon game secties
    setupSection.classList.add('hidden');
    locationSection.classList.remove('hidden');
    cardsSection.classList.remove('hidden');
    
    // Update kaart display
    updateCardDisplay();
    
    console.log(`Spel gestart met seed: ${seed}`);
}

/**
 * Stap 1: Haal GPS locatie op en toon draggable marker
 */
async function handleGetGPS() {
    getGpsBtn.disabled = true;
    getGpsBtn.textContent = 'GPS ophalen...';
    
    // Update status
    locationStatus.querySelector('.status-icon').textContent = '📡';
    locationStatus.querySelector('.status-text').textContent = 'GPS locatie ophalen...';
    locationStatus.classList.remove('valid', 'invalid');
    
    try {
        const location = await getCurrentLocation();
        console.log('GPS locatie ontvangen:', location);
        
        // Update of voeg DRAGGABLE marker toe op kaart
        if (currentLocationMarker) {
            currentLocationMarker.setLatLng([location.lat, location.lng]);
        } else {
            currentLocationMarker = L.marker([location.lat, location.lng], {
                draggable: true,
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
        }
        
        // Voeg een nauwkeurigheids-cirkel toe
        accuracyCircle = L.circle([location.lat, location.lng], {
            color: '#22c55e',
            fillColor: '#86efac',
            fillOpacity: 0.2,
            radius: location.accuracy,
            weight: 1
        }).addTo(map);
        
        // Centreer kaart op locatie
        map.setView([location.lat, location.lng], 17);
        
        // Bind popup aan marker
        currentLocationMarker.bindPopup(`
            <b>📍 Jouw Locatie</b><br>
            GPS nauwkeurigheid: ±${Math.round(location.accuracy)}m<br>
            <em>Versleep voor exacte locatie</em>
        `).openPopup();
        
        // Update status en toon bevestig knop
        locationStatus.querySelector('.status-icon').textContent = '👆';
        locationStatus.querySelector('.status-text').textContent = 'Versleep marker naar exacte locatie';
        
        getGpsBtn.style.display = 'none';
        adjustLocationContainer.classList.remove('hidden');
        
    } catch (error) {
        console.error('Fout bij ophalen GPS:', error);
        locationStatus.querySelector('.status-icon').textContent = '⚠️';
        locationStatus.querySelector('.status-text').textContent = 'Fout bij ophalen GPS';
        locationStatus.classList.add('invalid');
        
        alert(error.message);
        getGpsBtn.disabled = false;
        getGpsBtn.textContent = 'Haal GPS Locatie Op';
    }
}

/**
 * Stap 2: Bevestig de exacte locatie en voer checks uit
 */
function handleConfirmLocation() {
    if (!currentLocationMarker) {
        alert('Geen locatie beschikbaar');
        return;
    }
    
    confirmLocationBtn.disabled = true;
    confirmLocationBtn.textContent = 'Locatie controleren...';
    
    // Haal de huidige marker positie op
    const position = currentLocationMarker.getLatLng();
    console.log('Locatie bevestigd:', position);
    
    // Maak marker niet meer draggable
    currentLocationMarker.dragging.disable();
    
    // Verwijder GPS nauwkeurigheidscirkel (niet meer relevant)
    if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
        accuracyCircle = null;
    }
    
    // Voer checks uit
    const result = performAllChecks(position.lat, position.lng);
    
    // Update status indicator
    if (result.valid) {
        // Sla locatie op in storage
        saveLocation(position.lat, position.lng);
        
        // Bereken afstand tot Belfort
        const distanceToCenter = calculateDistance(
            position.lat, position.lng,
            BELFORT_GENT.lat, BELFORT_GENT.lng
        );
        
        // Minimaliseer locatie sectie en verplaats naar beneden
        locationSection.classList.add('location-confirmed');
        
        // Verplaats locatie sectie naar onder in de controls
        const controlsContent = document.getElementById('controls-content');
        controlsContent.appendChild(locationSection);
        
        // Update status
        locationStatus.querySelector('.status-icon').textContent = '✅';
        locationStatus.querySelector('.status-text').textContent = 'Locatie vastgelegd';
        locationStatus.classList.add('valid');
        
        // Verberg adjust container
        adjustLocationContainer.style.display = 'none';
        
        // Toon locatie details
        locationResult.classList.remove('hidden');
        locationResult.classList.add('valid');
        locationResult.innerHTML = `
            <div class="location-detail-item">
                <span class="detail-icon">🎯</span>
                <span class="detail-label">Afstand tot Belfort:</span>
                <span class="detail-value">${Math.round(distanceToCenter)}m</span>
            </div>
            <div class="location-detail-item">
                <span class="detail-icon">📍</span>
                <span class="detail-label">Coördinaten:</span>
                <span class="detail-value" id="coords-display">${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}</span>
                <button id="copy-coords-btn" class="btn-icon" title="Kopieer coördinaten">📋</button>
            </div>
        `;
        
        // Voeg copy functionaliteit toe
        document.getElementById('copy-coords-btn').addEventListener('click', async () => {
            const coords = `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
            try {
                await navigator.clipboard.writeText(coords);
                const btn = document.getElementById('copy-coords-btn');
                btn.textContent = '✅';
                setTimeout(() => {
                    btn.textContent = '📋';
                }, 2000);
            } catch (error) {
                alert('Coördinaten: ' + coords);
            }
        });
        
        // Update marker popup
        currentLocationMarker.bindPopup(`
            <b>✅ Jouw Locatie</b><br>
            ${Math.round(distanceToCenter)}m van Belfort<br>
            ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}
        `);
        
        // Toon vragen sectie
        displayQuestions(result.checks);
        
    } else {
        locationStatus.querySelector('.status-icon').textContent = '❌';
        locationStatus.querySelector('.status-text').textContent = 'Locatie ongeldig - pas aan';
        locationStatus.classList.add('invalid');
        
        // Toon foutmelding
        displayLocationError(result.message);
        
        // Marker blijft draggable voor nieuwe poging
        confirmLocationBtn.disabled = false;
        confirmLocationBtn.textContent = 'Bevestig Locatie';
    }
}

/**
 * Toont een foutmelding voor ongeldige locatie
 */
function displayLocationError(message) {
    locationResult.classList.remove('hidden');
    locationResult.classList.add('invalid');
    locationResult.innerHTML = `
        <h3>❌ Ongeldige Locatie</h3>
        <p>${message}</p>
    `;
    questionsResult.innerHTML = '';
    questionsSection.classList.add('hidden');
}

/**
 * Toont de automatische antwoorden op vragen
 */
function displayQuestions(checks) {
    questionsSection.classList.remove('hidden');
    
    const questions = [
        { label: 'R40', value: checks.r40.answer },
        { label: 'Leie-Schelde', value: checks.leieSchelde.answer },
        { label: 'Weba/IKEA', value: `${checks.webaIkea.answer} (${checks.webaIkea.distanceWeba}m / ${checks.webaIkea.distanceIkea}m)` },
        { label: 'Dampoort', value: checks.dampoort.answer },
        { label: 'Watersportbaan', value: checks.watersportbaan.answer }
    ];
    
    questionsResult.innerHTML = questions.map(q => `
        <div class="question-item">
            <strong>${q.label}:</strong>
            <span>${q.value}</span>
        </div>
    `).join('');
}

/**
 * Update de kaart display
 */
function updateCardDisplay() {
    if (!cardManager) return;
    
    const card = cardManager.getCurrentCard();
    if (!card) return;
    
    // Update content
    currentCardElement.querySelector('.card-task').textContent = card.task;
    currentCardElement.querySelector('.card-question').textContent = `Vraag: ${card.question}`;
    
    // Update counter
    currentCardNumber.textContent = cardManager.getCurrentIndex() + 1;
    totalCards.textContent = cardManager.getTotalCards();
    
    // Update button states
    prevCardBtn.disabled = !cardManager.hasPrevious();
    nextCardBtn.disabled = !cardManager.hasNext();
}

/**
 * Ga naar vorige kaart
 */
function handlePreviousCard() {
    if (cardManager && cardManager.previousCard()) {
        updateCardDisplay();
    }
}

/**
 * Ga naar volgende kaart
 */
function handleNextCard() {
    if (cardManager && cardManager.nextCard()) {
        updateCardDisplay();
    }
}

/**
 * Kopieer seed naar clipboard
 */
async function handleCopySeed() {
    const seed = currentSeedDisplay.textContent;
    
    try {
        await navigator.clipboard.writeText(seed);
        
        const originalText = copySeedBtn.textContent;
        copySeedBtn.textContent = '✅ Gekopieerd!';
        
        setTimeout(() => {
            copySeedBtn.textContent = originalText;
        }, 2000);
    } catch (error) {
        console.error('Kon seed niet kopiëren:', error);
        alert('Kon de code niet kopiëren. Code: ' + seed);
    }
}

/**
 * Reset spel - wis alle opgeslagen data met dubbele bevestiging
 */
function handleResetGame() {
    // Eerste bevestiging
    if (!confirm('Ben je zeker dat je dit spel wilt verwijderen?')) {
        return;
    }
    
    // Tweede bevestiging
    if (!confirm('Nog eens, ben je echt zeker?!')) {
        return;
    }
    
    // Reset storage
    resetGameData();
    
    // Reload pagina voor verse start
    window.location.reload();
}
