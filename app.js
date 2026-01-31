// Main application logic voor Gent Location Game

let cardManager = null;
let map = null;
let gameZoneCircle = null;
let inverseMask = null;
let r40Polygon = null;
let leieScheldeLine = null;
let currentLocationMarker = null;
let accuracyCircle = null;
let exclusionLayers = []; // Array van uitgesloten zones op de kaart
let currentCardIndex = 0; // Index voor single card view

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

const singleViewBtn = document.getElementById('single-view-btn');
const flopViewBtn = document.getElementById('flop-view-btn');
const singleCardView = document.getElementById('single-card-view');
const flopView = document.getElementById('flop-view');
const discardedView = document.getElementById('discarded-view');
const discardedStats = document.getElementById('discarded-stats');
const backToFlopBtn = document.getElementById('back-to-flop-btn');

const currentCardNumber = document.getElementById('current-card-number');
const totalCards = document.getElementById('total-cards');
const currentCardElement = document.getElementById('current-card');
const prevCardBtn = document.getElementById('prev-card-btn');
const nextCardBtn = document.getElementById('next-card-btn');
const discardCardBtn = document.getElementById('discard-card-btn');

const currentSeedDisplay = document.getElementById('current-seed');
const copySeedBtn = document.getElementById('copy-seed-btn');
const resetGameBtn = document.getElementById('reset-game-btn');

// Event Listeners
generateSeedBtn.addEventListener('click', handleGenerateSeed);
startGameBtn.addEventListener('click', handleStartGame);
getGpsBtn.addEventListener('click', handleGetGPS);
confirmLocationBtn.addEventListener('click', handleConfirmLocation);
singleViewBtn.addEventListener('click', () => switchView('single'));
flopViewBtn.addEventListener('click', () => switchView('flop'));
discardedStats.addEventListener('click', () => switchView('discarded'));
backToFlopBtn.addEventListener('click', () => switchView('flop'));
prevCardBtn.addEventListener('click', handlePreviousCard);
nextCardBtn.addEventListener('click', handleNextCard);
discardCardBtn.addEventListener('click', handleDiscardCard);
copySeedBtn.addEventListener('click', handleCopySeed);
resetGameBtn.addEventListener('click', handleResetGame);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Gent Location Game geladen!');
    
    // Laad zone data en kaarten
    await loadZones();
    await loadCards();
    
    initializeMap();
    initializeControls();
    loadSavedGameData();
    
    // Laad exclusion zones na initialisatie
    updateExclusionZones();
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
                
                // Verberg GPS-knop en adjust container
                getGpsBtn.style.display = 'none';
                adjustLocationContainer.style.display = 'none';
                
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
    
    // Maak een custom pane voor exclusion zones met lage z-index
    map.createPane('exclusionPane');
    map.getPane('exclusionPane').style.zIndex = 350; // Onder overlayPane (400)
    
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
        interactive: false,
        pane: 'overlayPane' // Zorg dat inverseMask bovenop exclusion zones komt
    }).addTo(map);
    
    // Breng inverseMask naar de voorgrond zodat het over exclusion zones heen ligt
    if (inverseMask) {
        inverseMask.bringToFront();
    }
    
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
    const seed = seedInput.value.trim().toUpperCase();
    
    if (!seed) {
        alert('Voer een spel code in of genereer er een!');
        return;
    }
    
    // Update input veld met hoofdletters
    seedInput.value = seed;
    
    // Check of dit een NIEUWE seed is (verschillend van opgeslagen seed)
    const gameData = loadGameData();
    const isNewSeed = !gameData.seed || gameData.seed !== seed;
    
    if (isNewSeed) {
        console.log('Nieuwe seed gedetecteerd - reset card manager state');
        // Wis oude card manager state en antwoorden voor nieuw spel
        localStorage.removeItem('cardManagerState');
        localStorage.removeItem('opponentAnswers');
    }
    
    // Initialiseer card manager
    cardManager = new CardManager(seed);
    
    // Laad opgeslagen state alleen als het DEZELFDE seed is
    if (!isNewSeed) {
        const savedState = loadCardManagerState();
        if (savedState && savedState.flop) {
            cardManager.restoreFlop(savedState.flop, savedState.discarded, savedState.deckIndex);
            console.log('Card manager state hersteld voor bestaande seed');
        }
    }
    
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
    currentCardIndex = 0;
    updateCardDisplay();
    
    console.log(`Spel gestart met seed: ${seed}, ${cardManager.getFlop().length} kaarten in flop`);
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
        
        // Uitgebreide error messaging
        let errorMsg = error.message;
        
        // iOS-specifieke check
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isHTTPS = window.location.protocol === 'https:';
        
        if (isIOS && !isHTTPS) {
            errorMsg = '⚠️ iOS vereist HTTPS voor GPS\n\n' +
                      'Localhost werkt niet op iPhone.\n\n' +
                      'Oplossingen:\n' +
                      '1. Deploy naar GitHub Pages (HTTPS)\n' +
                      '2. Gebruik ngrok voor tijdelijke HTTPS URL\n' +
                      '3. Test op desktop browser';
        }
        
        alert(errorMsg);
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
        
        // Verberg GPS-knop en adjust container
        getGpsBtn.style.display = 'none';
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
        { label: 'Weba/IKEA', value: `${checks.webaIkea.answer} (Weba: ${checks.webaIkea.distanceWeba}m / IKEA: ${checks.webaIkea.distanceIkea}m)` },
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
    
    const flop = cardManager.getFlop();
    if (flop.length === 0) {
        currentCardElement.innerHTML = '<p>Geen kaarten meer beschikbaar!</p>';
        return;
    }
    
    // Zorg dat index binnen bereik blijft
    if (currentCardIndex >= flop.length) {
        currentCardIndex = flop.length - 1;
    }
    if (currentCardIndex < 0) {
        currentCardIndex = 0;
    }
    
    const card = flop[currentCardIndex];
    if (!card) return;
    
    // Update content
    currentCardElement.querySelector('.card-task').textContent = card.task;
    currentCardElement.querySelector('.card-question').textContent = `Vraag: ${card.question}`;
    
    // Voeg of update phase badge toe
    let phaseBadge = currentCardElement.querySelector('.phase-badge');
    if (!phaseBadge) {
        phaseBadge = document.createElement('div');
        phaseBadge.className = 'phase-badge';
        currentCardElement.insertBefore(phaseBadge, currentCardElement.firstChild);
    }
    
    // Update phase badge
    const phaseNames = { 1: 'Early', 2: 'Mid', 3: 'Late' };
    phaseBadge.textContent = phaseNames[card.phase] || 'Phase ' + card.phase;
    phaseBadge.className = `phase-badge phase-${card.phase}`;
    
    // Check of deze kaart een antwoord vereist
    const requiresAnswer = card.requiresAnswer !== false; // Default true
    
    // Haal bestaand antwoord op (indien aanwezig)
    const opponentAnswer = getOpponentAnswer(currentCardIndex);
    
    // Voeg antwoord sectie toe (of update)
    let answerSection = currentCardElement.querySelector('.card-answer-section');
    if (!answerSection) {
        answerSection = document.createElement('div');
        answerSection.className = 'card-answer-section';
        currentCardElement.appendChild(answerSection);
    }
    
    if (!requiresAnswer) {
        // Kaart vereist geen antwoord - toon gewoon opgelost knop
        answerSection.innerHTML = `
            <div class="answer-input">
                <div class="answer-label">💡 Voltooi de task en markeer als opgelost</div>
                <button class="btn btn-success" onclick="handleDirectDiscard(${currentCardIndex})">✓ Opgelost</button>
            </div>
        `;
    } else if (opponentAnswer) {
        // Toon het opgeslagen antwoord - kaart is al opgelost
        answerSection.innerHTML = `
            <div class="answer-received">
                <div class="answer-label">✅ Kaart opgelost - Antwoord tegenstander:</div>
                <div class="answer-value">${opponentAnswer}</div>
                <button class="btn-change-answer" onclick="changeOpponentAnswer(${currentCardIndex})">Wijzig</button>
            </div>
        `;
    } else {
        // Toon knoppen om antwoord in te voeren
        answerSection.innerHTML = `
            <div class="answer-input">
                <div class="answer-label">💡 Voltooi de task, stel de vraag aan je tegenstander en voer het antwoord in:</div>
                <div class="answer-buttons" id="answer-buttons-${currentCardIndex}">
                    <!-- Buttons worden dynamisch gegenereerd op basis van vraag type -->
                </div>
                <p class="answer-hint">→ Na het invoeren wordt de kaart automatisch opgelost</p>
            </div>
        `;
        
        // Genereer de juiste antwoord knoppen op basis van de vraag
        generateAnswerButtons(currentCardIndex, card.question);
    }
    
    // Update counter
    currentCardNumber.textContent = currentCardIndex + 1;
    totalCards.textContent = flop.length;
    
    // Update button states
    prevCardBtn.disabled = currentCardIndex === 0;
    nextCardBtn.disabled = currentCardIndex >= flop.length - 1;
    
    // Toon discard knop alleen als er GEEN antwoord is EN antwoord vereist is (voor wanneer tegenstander kaart eerst speelt)
    if (opponentAnswer || !requiresAnswer) {
        discardCardBtn.style.display = 'none';
    } else {
        discardCardBtn.style.display = 'block';
        discardCardBtn.textContent = '🗑️ Tegenstander speelde dit eerst';
    }
}

/**
 * Genereer antwoord knoppen op basis van vraag type
 */
function generateAnswerButtons(cardIndex, question) {
    const container = document.getElementById(`answer-buttons-${cardIndex}`);
    if (!container) return;
    
    const buttons = getAnswerButtonsForQuestion(question);
    
    // Maak knoppen aan
    buttons.forEach(answer => {
        const btn = document.createElement('button');
        btn.className = 'btn-answer';
        btn.textContent = answer;
        btn.onclick = () => handleOpponentAnswer(cardIndex, answer);
        container.appendChild(btn);
    });
}

/**
 * Verwerk antwoord van tegenstander
 */
function handleOpponentAnswer(cardIndex, answer) {
    const card = cardManager.getCard(cardIndex);
    saveOpponentAnswer(cardIndex, answer, card?.task);
    updateExclusionZones();
    
    // Automatisch discard de kaart wanneer antwoord is gegeven
    if (cardManager && cardIndex < cardManager.getFlop().length) {
        // Bewaar het antwoord voor deze discarded kaart (voordat we discard)
        const currentDiscardedCount = cardManager.discarded.length;
        saveDiscardedAnswer(currentDiscardedCount, answer, card?.task, cardIndex);
        
        cardManager.discardCard(cardIndex);
        saveCardManagerState();
        
        // Update current index als deze kaart wordt verwijderd
        if (currentCardIndex === cardIndex && currentCardIndex >= cardManager.getFlop().length) {
            currentCardIndex = Math.max(0, cardManager.getFlop().length - 1);
        }
    }
    
    updateCardDisplay();
}

/**
 * Wijzig antwoord van tegenstander
 */
function changeOpponentAnswer(cardIndex) {
    if (confirm('Wil je het antwoord van de tegenstander wijzigen?')) {
        // Verwijder het antwoord en update display
        saveOpponentAnswer(cardIndex, null);
        updateExclusionZones();
        updateCardDisplay();
    }
}

/**
 * Update exclusion zones op de kaart op basis van alle antwoorden
 */
function updateExclusionZones() {
    // Verwijder alle bestaande exclusion layers
    exclusionLayers.forEach(layer => map.removeLayer(layer));
    exclusionLayers = [];
    
    // Laad alle antwoorden
    const gameData = loadGameData();
    if (!gameData.cardAnswers || gameData.cardAnswers.length === 0) {
        return;
    }
    
    // Voor elk antwoord, voeg exclusion zone toe
    gameData.cardAnswers.forEach(answerData => {
        const layer = createExclusionLayer(answerData.opponentAnswer);
        if (layer) {
            layer.addTo(map);
            exclusionLayers.push(layer);
        }
    });
    
    // Breng inverseMask naar voren zodat het over de exclusion zones ligt
    if (inverseMask) {
        inverseMask.bringToFront();
    }
}

/**
 * Maak een exclusion layer op basis van het antwoord
 */
function createExclusionLayer(answer) {
    if (!answer) return null;
    
    const exclusionStyle = {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '5, 5',
        interactive: false,
        pane: 'exclusionPane' // Gebruik custom pane met lage z-index
    };
    
    // Grotere bounding box die heel Gent bedekt
    const largeBounds = {
        north: 51.15,
        south: 50.95,
        east: 3.90,
        west: 3.55
    };
    
    // Binnen R40 -> je bent binnen, sluit alles BUITEN R40 uit
    if (answer === 'Binnen R40') {
        const outerBox = [
            [largeBounds.north, largeBounds.west],
            [largeBounds.north, largeBounds.east],
            [largeBounds.south, largeBounds.east],
            [largeBounds.south, largeBounds.west]
        ];
        const r40Coords = R40_POLYGON.map(point => [point.lat, point.lng]);
        return L.polygon([outerBox, r40Coords], exclusionStyle).bindPopup('❌ Uitgesloten: Buiten R40');
    }
    
    // Buiten R40 -> je bent buiten, sluit alles BINNEN R40 uit
    if (answer === 'Buiten R40') {
        const r40Coords = R40_POLYGON.map(point => [point.lat, point.lng]);
        return L.polygon(r40Coords, exclusionStyle).bindPopup('❌ Uitgesloten: Binnen R40');
    }
    
    // Noorden van Leie-Schelde -> je bent in noorden, sluit ZUIDEN uit
    if (answer === 'Noorden van Leie-Schelde') {
        const lineCoords = LEIE_SCHELDE_LINE.map(point => [point.lat, point.lng]);
        
        const southBox = [
            [largeBounds.south, largeBounds.west],
            [largeBounds.south, largeBounds.east],
            [lineCoords[lineCoords.length - 1][0], largeBounds.east],
            ...lineCoords.slice().reverse(),
            [lineCoords[0][0], largeBounds.west]
        ];
        return L.polygon(southBox, exclusionStyle).bindPopup('❌ Uitgesloten: Zuiden Leie-Schelde');
    }
    
    // Zuiden van Leie-Schelde -> je bent in zuiden, sluit NOORDEN uit
    if (answer === 'Zuiden van Leie-Schelde') {
        const lineCoords = LEIE_SCHELDE_LINE.map(point => [point.lat, point.lng]);
        
        const northBox = [
            [largeBounds.north, largeBounds.west],
            [largeBounds.north, largeBounds.east],
            [lineCoords[lineCoords.length - 1][0], largeBounds.east],
            ...lineCoords.slice().reverse(),
            [lineCoords[0][0], largeBounds.west]
        ];
        return L.polygon(northBox, exclusionStyle).bindPopup('❌ Uitgesloten: Noorden Leie-Schelde');
    }
    
    // Dichter bij Weba -> je bent dichter bij Weba, sluit gebied dat dichter bij IKEA is uit
    if (answer === 'Dichter bij Weba') {
        const ikea = LOCATIONS.ikea;
        const weba = LOCATIONS.weba;
        
        // Middelpunt en gecorrigeerde richting
        const midLat = (ikea.lat + weba.lat) / 2;
        const midLng = (ikea.lng + weba.lng) / 2;
        const dx = weba.lng - ikea.lng;
        const dy = weba.lat - ikea.lat;
        const cosLat = Math.cos(midLat * Math.PI / 180);
        const cos2 = cosLat * cosLat;
        const A = dy;                  // coefficient for (lat - midLat)
        const B = dx * cos2;           // coefficient for (lng - midLng)

        // Signed side functie: A*(lat-midLat) + B*(lng-midLng)
        // Let op: S(ikea) < 0, S(weba) > 0
        const sideSign = (lat, lng) => A * (lat - midLat) + B * (lng - midLng);
        const targetSign = Math.sign(sideSign(ikea.lat, ikea.lng)); // we willen IKEA-zijde uitsluiten

        // Snijpunten met de bounding box randen
        const eps = 1e-12;
        const ints = [];
        if (Math.abs(B) > eps) {
            // lat vaste waarde -> los lng op
            const topLng = midLng - (A / B) * (largeBounds.north - midLat);
            if (topLng >= largeBounds.west && topLng <= largeBounds.east) ints.push([largeBounds.north, topLng]);
            const botLng = midLng - (A / B) * (largeBounds.south - midLat);
            if (botLng >= largeBounds.west && botLng <= largeBounds.east) ints.push([largeBounds.south, botLng]);
        } else {
            // B ~ 0 => verticale lijn op lng = midLng
            ints.push([largeBounds.north, midLng]);
            ints.push([largeBounds.south, midLng]);
        }
        if (Math.abs(A) > eps) {
            // lng vaste waarde -> los lat op
            const rightLat = midLat - (B / A) * (largeBounds.east - midLng);
            if (rightLat >= largeBounds.south && rightLat <= largeBounds.north) ints.push([rightLat, largeBounds.east]);
            const leftLat = midLat - (B / A) * (largeBounds.west - midLng);
            if (leftLat >= largeBounds.south && leftLat <= largeBounds.north) ints.push([leftLat, largeBounds.west]);
        } else {
            // A ~ 0 => horizontale lijn op lat = midLat
            ints.push([midLat, largeBounds.west]);
            ints.push([midLat, largeBounds.east]);
        }
        
        // Dedupe snijpunten (lijn kan hoek exact raken)
        const uniqueInts = [];
        for (const p of ints) {
            if (!uniqueInts.some(q => Math.abs(q[0] - p[0]) < 1e-10 && Math.abs(q[1] - p[1]) < 1e-10)) uniqueInts.push(p);
        }
        
        // Hoeken op de IKEA-zijde (te excluderen)
        const corners = [
            { lat: largeBounds.north, lng: largeBounds.west },
            { lat: largeBounds.north, lng: largeBounds.east },
            { lat: largeBounds.south, lng: largeBounds.east },
            { lat: largeBounds.south, lng: largeBounds.west }
        ];
        let sideCorners = corners.filter(c => sideSign(c.lat, c.lng) * targetSign >= 0);
        
        // Fallback: kies 2 beste hoeken als filter geen exact 2 oplevert
        if (sideCorners.length !== 2) {
            sideCorners = corners
                .map(c => ({...c, score: sideSign(c.lat, c.lng) * targetSign}))
                .sort((a, b) => b.score - a.score)
                .slice(0, 2);
        }
        
        // Bouw convex polygon (2 snijpunten + 2 hoeken) en sorteer op hoek rond middelpunt
        const points = [
            ...uniqueInts.map(p => ({ lat: p[0], lng: p[1] })),
            ...sideCorners
        ];
        const cx = points.reduce((s, p) => s + p.lat, 0) / points.length;
        const cy = points.reduce((s, p) => s + p.lng, 0) / points.length;
        points.sort((a, b) => Math.atan2(a.lat - cx, a.lng - cy) - Math.atan2(b.lat - cx, b.lng - cy));
        
        return L.polygon(points.map(p => [p.lat, p.lng]), exclusionStyle).bindPopup('❌ Uitgesloten: Dichter bij IKEA');
    }
    
    // Dichter bij IKEA -> je bent dichter bij IKEA, sluit gebied dat dichter bij Weba is uit
    if (answer === 'Dichter bij IKEA') {
        const ikea = LOCATIONS.ikea;
        const weba = LOCATIONS.weba;
        
        const midLat = (ikea.lat + weba.lat) / 2;
        const midLng = (ikea.lng + weba.lng) / 2;
        const dx = weba.lng - ikea.lng;
        const dy = weba.lat - ikea.lat;
        const cosLat = Math.cos(midLat * Math.PI / 180);
        const cos2 = cosLat * cosLat;
        const A = dy;
        const B = dx * cos2;
        const sideSign = (lat, lng) => A * (lat - midLat) + B * (lng - midLng);
        const targetSign = Math.sign(sideSign(weba.lat, weba.lng)); // we willen Weba-zijde uitsluiten

        const eps = 1e-12;
        const ints = [];
        if (Math.abs(B) > eps) {
            const topLng = midLng - (A / B) * (largeBounds.north - midLat);
            if (topLng >= largeBounds.west && topLng <= largeBounds.east) ints.push([largeBounds.north, topLng]);
            const botLng = midLng - (A / B) * (largeBounds.south - midLat);
            if (botLng >= largeBounds.west && botLng <= largeBounds.east) ints.push([largeBounds.south, botLng]);
        } else {
            ints.push([largeBounds.north, midLng]);
            ints.push([largeBounds.south, midLng]);
        }
        if (Math.abs(A) > eps) {
            const rightLat = midLat - (B / A) * (largeBounds.east - midLng);
            if (rightLat >= largeBounds.south && rightLat <= largeBounds.north) ints.push([rightLat, largeBounds.east]);
            const leftLat = midLat - (B / A) * (largeBounds.west - midLng);
            if (leftLat >= largeBounds.south && leftLat <= largeBounds.north) ints.push([leftLat, largeBounds.west]);
        } else {
            ints.push([midLat, largeBounds.west]);
            ints.push([midLat, largeBounds.east]);
        }
        const uniqueInts = [];
        for (const p of ints) {
            if (!uniqueInts.some(q => Math.abs(q[0] - p[0]) < 1e-10 && Math.abs(q[1] - p[1]) < 1e-10)) uniqueInts.push(p);
        }
        
        const corners = [
            { lat: largeBounds.north, lng: largeBounds.west },
            { lat: largeBounds.north, lng: largeBounds.east },
            { lat: largeBounds.south, lng: largeBounds.east },
            { lat: largeBounds.south, lng: largeBounds.west }
        ];
        let sideCorners = corners.filter(c => sideSign(c.lat, c.lng) * targetSign >= 0);
        if (sideCorners.length !== 2) {
            sideCorners = corners
                .map(c => ({...c, score: sideSign(c.lat, c.lng) * targetSign}))
                .sort((a, b) => b.score - a.score)
                .slice(0, 2);
        }
        
        const points = [
            ...uniqueInts.map(p => ({ lat: p[0], lng: p[1] })),
            ...sideCorners
        ];
        const cx = points.reduce((s, p) => s + p.lat, 0) / points.length;
        const cy = points.reduce((s, p) => s + p.lng, 0) / points.length;
        points.sort((a, b) => Math.atan2(a.lat - cx, a.lng - cy) - Math.atan2(b.lat - cx, b.lng - cy));
        
        return L.polygon(points.map(p => [p.lat, p.lng]), exclusionStyle).bindPopup('❌ Uitgesloten: Dichter bij Weba');
    }
    
    // Oosten van Dampoort -> je bent in oosten, sluit WESTEN uit
    if (answer === 'Oosten van Dampoort') {
        const westBox = [
            [largeBounds.north, largeBounds.west],
            [largeBounds.north, LOCATIONS.dampoort.lng],
            [largeBounds.south, LOCATIONS.dampoort.lng],
            [largeBounds.south, largeBounds.west]
        ];
        return L.polygon(westBox, exclusionStyle).bindPopup('❌ Uitgesloten: Westen Dampoort');
    }
    
    // Westen van Dampoort -> je bent in westen, sluit OOSTEN uit
    if (answer === 'Westen van Dampoort') {
        const eastBox = [
            [largeBounds.north, LOCATIONS.dampoort.lng],
            [largeBounds.north, largeBounds.east],
            [largeBounds.south, largeBounds.east],
            [largeBounds.south, LOCATIONS.dampoort.lng]
        ];
        return L.polygon(eastBox, exclusionStyle).bindPopup('❌ Uitgesloten: Oosten Dampoort');
    }
    
    // Oosten van watersportbaan tip -> je bent in oosten, sluit WESTEN uit
    if (answer === 'Oosten van watersportbaan tip') {
        const westBox = [
            [largeBounds.north, largeBounds.west],
            [largeBounds.north, LOCATIONS.watersportbaan_tip.lng],
            [largeBounds.south, LOCATIONS.watersportbaan_tip.lng],
            [largeBounds.south, largeBounds.west]
        ];
        return L.polygon(westBox, exclusionStyle).bindPopup('❌ Uitgesloten: Westen Watersportbaan');
    }
    
    // Westen van watersportbaan tip -> je bent in westen, sluit OOSTEN uit
    if (answer === 'Westen van watersportbaan tip') {
        const eastBox = [
            [largeBounds.north, LOCATIONS.watersportbaan_tip.lng],
            [largeBounds.north, largeBounds.east],
            [largeBounds.south, largeBounds.east],
            [largeBounds.south, LOCATIONS.watersportbaan_tip.lng]
        ];
        return L.polygon(eastBox, exclusionStyle).bindPopup('❌ Uitgesloten: Oosten Watersportbaan');
    }
    
    return null;
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

/**
 * Switch tussen single card, flop view en discarded view
 */
function switchView(view) {
    if (view === 'single') {
        singleViewBtn.classList.add('active');
        flopViewBtn.classList.remove('active');
        singleCardView.classList.remove('hidden');
        flopView.classList.add('hidden');
        discardedView.classList.add('hidden');
    } else if (view === 'flop') {
        singleViewBtn.classList.remove('active');
        flopViewBtn.classList.add('active');
        singleCardView.classList.add('hidden');
        flopView.classList.remove('hidden');
        discardedView.classList.add('hidden');
        renderFlopView();
    } else if (view === 'discarded') {
        singleViewBtn.classList.remove('active');
        flopViewBtn.classList.remove('active');
        singleCardView.classList.add('hidden');
        flopView.classList.add('hidden');
        discardedView.classList.remove('hidden');
        renderDiscardedView();
    }
}

/**
 * Render de volledige flop view
 */
function renderFlopView() {
    if (!cardManager) return;
    
    const flop = cardManager.getFlop();
    const remaining = cardManager.getRemainingCards();
    const discarded = cardManager.discarded.length;
    
    // Update stats
    document.getElementById('flop-count').textContent = flop.length;
    document.getElementById('remaining-count').textContent = remaining;
    document.getElementById('discarded-count').textContent = discarded;
    
    // Render kaarten per fase
    for (let phase = 1; phase <= 3; phase++) {
        const phaseCards = flop.filter(card => card.phase === phase);
        const container = document.getElementById(`flop-phase-${phase}`);
        container.innerHTML = '';
        
        phaseCards.forEach((card, phaseIndex) => {
            // Vind de globale index in de flop
            const globalIndex = flop.findIndex(c => c === card);
            const hasAnswer = getOpponentAnswer(globalIndex);
            const requiresAnswer = card.requiresAnswer !== false; // Default true
            
            const cardEl = document.createElement('div');
            cardEl.className = 'flop-card';
            
            // Toon verschillende UI afhankelijk van of er een antwoord is
            if (hasAnswer) {
                cardEl.innerHTML = `
                    <div class="card-task">${card.task}</div>
                    <div class="card-question">${card.question || ''}</div>
                    <div class="answer-indicator">✅ Antwoord: ${hasAnswer}</div>
                    <div class="flop-card-actions">
                        <button class="btn-flop-view-primary" onclick="viewCardDetail(${globalIndex})">👁️ Bekijk</button>
                        <button class="btn-flop-edit" onclick="changeOpponentAnswer(${globalIndex})">✏️</button>
                    </div>
                `;
            } else if (!requiresAnswer) {
                // Kaart vereist geen antwoord
                cardEl.innerHTML = `
                    <div class="card-task">${card.task}</div>
                    <div class="card-question">${card.question || ''}</div>
                    <div class="answer-indicator">⏳ Wacht op voltooiing</div>
                    <div class="flop-card-actions">
                        <button class="btn-flop-view-primary" onclick="viewCardDetail(${globalIndex})">👁️ Speel Kaart</button>
                        <button class="btn-flop-discard-small" onclick="handleDirectDiscard(${globalIndex})">✓</button>
                    </div>
                `;
            } else {
                cardEl.innerHTML = `
                    <div class="card-task">${card.task}</div>
                    <div class="card-question">${card.question}</div>
                    <div class="answer-indicator">⏳ Wacht op antwoord</div>
                    <div class="flop-card-actions">
                        <button class="btn-flop-view-primary" onclick="viewCardDetail(${globalIndex})">👁️ Speel Kaart</button>
                        <button class="btn-flop-discard-small" onclick="discardCardFromFlop(${globalIndex})">🗑️</button>
                    </div>
                `;
            }
            
            container.appendChild(cardEl);
        });
    }
}

/**
 * Render de opgeloste kaarten view
 */
function renderDiscardedView() {
    if (!cardManager) return;
    
    const discarded = cardManager.discarded;
    const container = document.getElementById('discarded-grid');
    container.innerHTML = '';
    
    if (discarded.length === 0) {
        container.innerHTML = '<p class="no-cards">Nog geen opgeloste kaarten.</p>';
        return;
    }
    
    // Toon alle opgeloste kaarten
    discarded.forEach((card, discardedIndex) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'flop-card discarded-card';
        
        // Haal het opgeslagen antwoord op
        const answer = getDiscardedAnswer(discardedIndex);
        const requiresAnswer = card.requiresAnswer !== false;
        
        if (!requiresAnswer) {
            // Kaart zonder antwoord
            cardEl.innerHTML = `
                <div class="card-task">${card.task}</div>
                <div class="card-question">${card.question || ''}</div>
                <div class="answer-indicator success">✓ Voltooid</div>
            `;
        } else {
            // Kaart met antwoord
            cardEl.innerHTML = `
                <div class="card-task">${card.task}</div>
                <div class="card-question">${card.question}</div>
                <div class="answer-indicator success">✓ Opgelost: ${answer || 'Geen antwoord'}</div>
                <div class="flop-card-actions">
                    <button class="btn-flop-edit" onclick="editDiscardedAnswer(${discardedIndex})">✏️ Wijzig Antwoord</button>
                </div>
            `;
        }
        
        container.appendChild(cardEl);
    });
}

/**
 * Bewerk het antwoord van een opgeloste kaart
 */
function editDiscardedAnswer(discardedIndex) {
    if (!cardManager) return;
    
    const card = cardManager.discarded[discardedIndex];
    if (!card) return;
    
    // Toon modal met kaart en antwoordknoppen
    const modal = document.getElementById('edit-answer-modal');
    const taskEl = document.getElementById('edit-card-task');
    const questionEl = document.getElementById('edit-card-question');
    const buttonsContainer = document.getElementById('edit-answer-buttons');
    
    taskEl.textContent = card.task;
    questionEl.textContent = card.question;
    
    // Genereer antwoordknoppen op basis van vraag
    buttonsContainer.innerHTML = '';
    const buttons = getAnswerButtonsForQuestion(card.question);
    
    buttons.forEach(answer => {
        const btn = document.createElement('button');
        btn.className = 'btn-answer';
        btn.textContent = answer;
        btn.onclick = () => {
            // Haal de originele cardIndex op
            const discardedData = getDiscardedAnswerData(discardedIndex);
            const originalCardIndex = discardedData?.originalCardIndex;
            
            saveDiscardedAnswer(discardedIndex, answer, card.task, originalCardIndex);
            
            // Update de opponent answer via originele cardIndex
            let updated = false;
            if (originalCardIndex !== null && originalCardIndex !== undefined) {
                updated = updateOpponentAnswerByIndex(originalCardIndex, answer);
            }
            
            // Fallback: probeer via cardTask
            if (!updated) {
                updated = updateOpponentAnswerByTask(card.task, answer);
            }
            
            // Fallback 2: Als er maar 1 opponent answer is, update die
            if (!updated) {
                const gameData = loadGameData();
                if (gameData.cardAnswers && gameData.cardAnswers.length === 1) {
                    gameData.cardAnswers[0].opponentAnswer = answer;
                    saveGameData(gameData);
                    updated = true;
                }
            }
            
            updateExclusionZones(); // Update kaart zones
            closeEditModal();
            renderDiscardedView(); // Refresh discarded view
            renderFlopView(); // Refresh flop view als die zichtbaar is
        };
        buttonsContainer.appendChild(btn);
    });
    
    // Toon modal
    modal.classList.remove('hidden');
}

/**
 * Sluit de edit modal
 */
function closeEditModal() {
    const modal = document.getElementById('edit-answer-modal');
    modal.classList.add('hidden');
}

/**
 * Bepaal welke antwoordknoppen nodig zijn op basis van de vraag
 */
function getAnswerButtonsForQuestion(question) {
    if (question.includes('Binnen of buiten R40')) {
        return ['Binnen R40', 'Buiten R40'];
    } else if (question.includes('Noorden of zuiden')) {
        return ['Noorden van Leie-Schelde', 'Zuiden van Leie-Schelde'];
    } else if (question.includes('Dichter bij Weba of IKEA')) {
        return ['Dichter bij Weba', 'Dichter bij IKEA'];
    } else if (question.includes('Oosten of westen van station Gent Dampoort')) {
        return ['Oosten van Dampoort', 'Westen van Dampoort'];
    } else if (question.includes('Oosten of westen van de tip van de watersportbaan')) {
        return ['Oosten van watersportbaan tip', 'Westen van watersportbaan tip'];
    } else {
        return ['Ja', 'Nee'];
    }
}

/**
 * Bekijk een specifieke kaart in detail
 */
function viewCardDetail(index) {
    currentCardIndex = index;
    switchView('single');
    updateCardDisplay();
}

/**
 * Discard een kaart direct zonder antwoord (voor kaarten die geen antwoord vereisen)
 */
function handleDirectDiscard(cardIndex) {
    if (!cardManager) return;
    
    const card = cardManager.getCard(cardIndex);
    if (!card) return;
    
    // Bewaar geen antwoord, gewoon discarden
    cardManager.discardCard(cardIndex);
    saveCardManagerState();
    
    // Update current index als deze kaart wordt verwijderd
    if (currentCardIndex === cardIndex && currentCardIndex >= cardManager.getFlop().length) {
        currentCardIndex = Math.max(0, cardManager.getFlop().length - 1);
    }
    
    updateCardDisplay();
    renderFlopView();
}

/**
 * Verwijder een kaart uit de flop (vanuit flop view)
 */
function discardCardFromFlop(index) {
    if (!cardManager) return;
    
    const card = cardManager.getCard(index);
    if (!card) return;
    
    if (confirm(`Kaart "${card.task}" markeren als opgelost?\nEen nieuwe kaart wordt getrokken.`)) {
        // Bewaar het antwoord voor deze discarded kaart (voordat we discard)
        const answer = getOpponentAnswer(index);
        const currentDiscardedCount = cardManager.discarded.length;
        if (answer) {
            saveDiscardedAnswer(currentDiscardedCount, answer, card.task, index);
        }
        
        cardManager.discardCard(index);
        
        // Save state
        saveCardManagerState();
        
        // Update views
        renderFlopView();
        if (currentCardIndex >= cardManager.getFlop().length) {
            currentCardIndex = Math.max(0, cardManager.getFlop().length - 1);
        }
        updateCardDisplay();
    }
}

/**
 * Handle discard van huidige kaart (vanuit single view)
 */
function handleDiscardCard() {
    if (!cardManager) return;
    
    const card = cardManager.getCard(currentCardIndex);
    if (!card) return;
    
    if (confirm(`Kaart "${card.task}" markeren als opgelost?\nEen nieuwe kaart wordt getrokken.`)) {
        // Bewaar het antwoord voor deze discarded kaart (voordat we discard)
        const answer = getOpponentAnswer(currentCardIndex);
        const currentDiscardedCount = cardManager.discarded.length;
        if (answer) {
            saveDiscardedAnswer(currentDiscardedCount, answer, card.task, currentCardIndex);
        }
        
        cardManager.discardCard(currentCardIndex);
        
        // Save state
        saveCardManagerState();
        
        // Update index als nodig
        if (currentCardIndex >= cardManager.getFlop().length) {
            currentCardIndex = Math.max(0, cardManager.getFlop().length - 1);
        }
        
        updateCardDisplay();
    }
}

/**
 * Navigate naar vorige kaart
 */
function handlePreviousCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        updateCardDisplay();
    }
}

/**
 * Navigate naar volgende kaart  
 */
function handleNextCard() {
    if (currentCardIndex < cardManager.getFlop().length - 1) {
        currentCardIndex++;
        updateCardDisplay();
    }
}

/**
 * Save card manager state naar storage
 */
function saveCardManagerState() {
    if (!cardManager) return;
    
    const state = cardManager.getState();
    localStorage.setItem('cardManagerState', JSON.stringify(state));
}

/**
 * Load card manager state vanuit storage
 */
function loadCardManagerState() {
    try {
        const stateJson = localStorage.getItem('cardManagerState');
        if (stateJson) {
            return JSON.parse(stateJson);
        }
    } catch (error) {
        console.error('Fout bij laden card manager state:', error);
    }
    return null;
}

// Maak functies globaal beschikbaar voor onclick handlers
window.viewCardDetail = viewCardDetail;
window.discardCardFromFlop = discardCardFromFlop;
