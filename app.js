// Main application logic voor Gent Location Game

let cardManager = null;
let map = null;
let gameZoneCircle = null;
let inverseMask = null;
let r40Polygon = null;
let leieScheldeLine = null;
let railwayLine = null;
let railwayBuffer = null;
let dampoortLine = null; // Verticale lijn door Dampoort
let watersportbaanLine = null; // Verticale lijn door Watersportbaan
let proximityCircles = []; // Cirkels voor proximity vragen (Weba/IKEA)
let currentLocationMarker = null;
let poiMarkers = {}; // Object om POI markers bij te houden
let poiCollectionMarkers = []; // Array van POI collection markers (bibliotheken, etc.)
let accuracyCircle = null;
let exclusionLayers = []; // Array van uitgesloten zones op de kaart
let neighborhoodLayers = []; // Array van wijk polygonen op de kaart
let distanceCircle = null; // Cirkel voor distanceFromBike kaarten
let opponentMarker = null; // Marker voor opponent locatie bij distanceFromBike
let currentCardIndex = 0; // Index voor single card view

// DOM elements
const controlsContainer = document.getElementById('controls-container');
const controlsHandle = document.getElementById('controls-handle');
const setupSection = document.getElementById('setup-section');
const locationSection = document.getElementById('location-section');
const checklistSection = document.getElementById('checklist-section');
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

const checklistItemsContainer = document.getElementById('checklist-items');
const completeChecklistBtn = document.getElementById('complete-checklist-btn');

// Neighborhood modal elements
const confirmNeighborhoodBtn = document.getElementById('confirm-neighborhood-btn');

// Distance calculator elements
const shareLocationBtn = document.getElementById('share-location-btn');
const currentLocationDisplay = document.getElementById('current-location-display');
const shareCoordsText = document.getElementById('share-coords-text');
const opponentCoordsInput = document.getElementById('opponent-coords-input');
const calculateDistanceBtn = document.getElementById('calculate-distance-btn');
const distanceResult = document.getElementById('distance-result');

// Checklist state
let checklistCompleted = [];

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
completeChecklistBtn.addEventListener('click', handleCompleteChecklist);
confirmNeighborhoodBtn.addEventListener('click', confirmNeighborhoodAnswer);

// Distance calculator event listeners
shareLocationBtn.addEventListener('click', handleShareLocation);
calculateDistanceBtn.addEventListener('click', handleCalculateDistance);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Gent Location Game geladen!');
    
    // Laad zone data, wijken en kaarten
    await loadZones();
    await loadNeighborhoods();
    await loadRailwayData();
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
                });
                // Voeg alleen toe aan map als checkbox checked is
                if (shouldShowBikeMarker()) {
                    currentLocationMarker.addTo(map);
                }
            }
            
            // Zoom naar locatie
            map.setView([loc.lat, loc.lng], 15);
            
            // Simuleer bevestigde locatie
            const result = performAllChecks(loc.lat, loc.lng);
            if (result.valid) {
                // Bereken afstand
                const distanceToCenter = calculateDistance(
                    loc.lat, loc.lng,
                    LOCATIONS.belfort.lat, LOCATIONS.belfort.lng
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
                        <span class="detail-label">Afstand tot center:</span>
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
                
                // Check of checklist voltooid is
                if (!isChecklistCompleted()) {
                    // Toon checklist als deze nog niet voltooid is
                    loadHiderChecklist();
                } else {
                    // Toon vragen en kaarten als checklist al voltooid is
                    displayQuestions(result.checks);
                    cardsSection.classList.remove('hidden');
                }
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
    map = L.map('map').setView([LOCATIONS.belfort.lat, LOCATIONS.belfort.lng], 13);
    
    // Maak een custom pane voor exclusion zones met lage z-index
    map.createPane('exclusionPane');
    map.getPane('exclusionPane').style.zIndex = 350; // Onder overlayPane (400)
    
    // Voeg OpenStreetMap tiles toe
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Markeer het Belfort (centrum)
    L.marker([LOCATIONS.belfort.lat, LOCATIONS.belfort.lng], {
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
    gameZoneCircle = L.circle([LOCATIONS.belfort.lat, LOCATIONS.belfort.lng], {
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
        const lngOffset = (GAME_RADIUS / earthRadius) * (180 / Math.PI) * Math.sin(angle) / Math.cos(LOCATIONS.belfort.lat * Math.PI / 180);
        
        circlePoints.unshift([LOCATIONS.belfort.lat + latOffset, LOCATIONS.belfort.lng + lngOffset]);
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
        fillOpacity: 0.05,
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
    
    // Teken de spoorlijn Oostende-Antwerpen (standaard verborgen)
    if (RAILWAY_LINE.length > 0) {
        const railwayCoords = RAILWAY_LINE.map(point => [point.lat, point.lng]);
        railwayLine = L.polyline(railwayCoords, {
            color: '#dc2626',
            weight: 3,
            opacity: 0.8,
            dashArray: '15, 10'
        }).bindPopup('<b>Spoorlijn Oostende-Antwerpen</b><br>800m buffer zone');
        // Niet direct toevoegen aan kaart - wordt getoond bij bufferLine kaarten
    }
    
    // Teken de buffer zone (standaard verborgen)
    if (RAILWAY_BUFFER.length > 0) {
        const bufferCoords = RAILWAY_BUFFER.map(point => [point.lat, point.lng]);
        railwayBuffer = L.polygon(bufferCoords, {
            color: '#dc2626',
            fillColor: '#fca5a5',
            fillOpacity: 0.05,
            weight: 2,
            opacity: 0.5,
            dashArray: '5, 5'
        }).bindPopup('<b>800m Buffer Zone</b><br>Spoorlijn Oostende-Antwerpen');
        // Niet direct toevoegen aan kaart - wordt getoond bij bufferLine kaarten
    }
    
    // Voeg andere belangrijke locaties toe (opslaan maar niet direct tonen)
    addLocationMarker(LOCATIONS.dampoort, 'Dampoort Station', 'blue', 'dampoort');
    addLocationMarker(LOCATIONS.watersportbaan_tip, 'Watersportbaan', 'blue', 'watersportbaan');
    addLocationMarker(LOCATIONS.weba, 'Weba Shopping', 'blue', 'weba');
    addLocationMarker(LOCATIONS.ikea, 'IKEA Gent', 'blue', 'ikea');
    
    // Stadswijken worden alleen getoond bij neighborhood vragen
    // drawNeighborhoods() wordt aangeroepen vanuit updateCardDisplay()
    
    // Voeg schaal toe aan de kaart
    L.control.scale({ position: 'topleft' }).addTo(map);
    
    // Voeg een legenda toe
    addMapLegend();
}

/**
 * Voegt een locatie marker toe aan de kaart
 */
function addLocationMarker(location, name, color, key = null) {
    const colorMap = {
        'blue': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        'green': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        'orange': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        'violet': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png'
    };
    
    const marker = L.marker([location.lat, location.lng], {
        icon: L.icon({
            iconUrl: colorMap[color] || colorMap['blue'],
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).bindPopup(`<b>${name}</b>`);
    
    // Als er een key is, sla marker op maar voeg nog niet toe aan kaart
    if (key) {
        poiMarkers[key] = marker;
    } else {
        marker.addTo(map);
    }
    
    return marker;
}

/**
 * Tekent alle stadswijken op de kaart met labels
 */
function drawNeighborhoods() {
    // Verwijder bestaande wijk layers
    hideNeighborhoods();
    
    if (!CITY_NEIGHBORHOODS || CITY_NEIGHBORHOODS.length === 0) {
        console.warn('Geen wijken geladen om te tekenen');
        return;
    }
    
    CITY_NEIGHBORHOODS.forEach(neighborhood => {
        // Converteer polygon naar Leaflet formaat
        const coords = neighborhood.polygon.map(point => [point.lat, point.lng]);
        
        // Teken polygon met duidelijke styling (zichtbaar als actief)
        const polygon = L.polygon(coords, {
            color: '#3b82f6',
            fillColor: '#93c5fd',
            fillOpacity: 0.15,
            weight: 2.5,
            opacity: 0.8
        }).bindPopup(`<b>${neighborhood.name}</b><br>Wijk ${neighborhood.nummer}`);
        
        polygon.addTo(map);
        neighborhoodLayers.push(polygon);
        
        // Voeg label toe in het centrum van de polygon
        const bounds = polygon.getBounds();
        const center = bounds.getCenter();
        
        const label = L.marker(center, {
            icon: L.divIcon({
                className: 'neighborhood-label',
                html: `<div class="neighborhood-label-text">${neighborhood.name}</div>`,
                iconSize: [150, 24]
            })
        }).addTo(map);
        
        neighborhoodLayers.push(label);
    });
    
    console.log(`${CITY_NEIGHBORHOODS.length} wijken getekend op kaart`);
}

/**
 * Verbergt alle stadswijken van de kaart
 */
function hideNeighborhoods() {
    neighborhoodLayers.forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
    neighborhoodLayers = [];
}

/**
 * Toont of verbergt wijken op basis van de huidige kaart
 */
function updateNeighborhoodVisibility() {
    if (!cardManager) {
        hideNeighborhoods();
        return;
    }
    
    const currentCard = cardManager.getCard(currentCardIndex);
    
    // Toon wijken alleen als de huidige kaart een neighborhood vraag is
    if (currentCard && (currentCard.answerType === 'SameOrAdjacentNeighborhood' || currentCard.answerType === 'eliminateNeighborhood')) {
        drawNeighborhoods();
    } else {
        hideNeighborhoods();
    }
}

/**
 * Toont de spoorlijn en buffer zone
 */
function showRailway() {
    if (railwayLine && !map.hasLayer(railwayLine)) {
        railwayLine.addTo(map);
    }
    if (railwayBuffer && !map.hasLayer(railwayBuffer)) {
        railwayBuffer.addTo(map);
    }
}

/**
 * Verbergt de spoorlijn en buffer zone
 */
function hideRailway() {
    if (railwayLine && map.hasLayer(railwayLine)) {
        map.removeLayer(railwayLine);
    }
    if (railwayBuffer && map.hasLayer(railwayBuffer)) {
        map.removeLayer(railwayBuffer);
    }
}

/**
 * Toon verticale lijn door Dampoort (oost/west grens)
 */
function showDampoortLine() {
    if (!LOCATIONS.dampoort) return;
    
    hideDampoortLine();
    
    // Teken een verticale lijn (noord-zuid) door Dampoort
    const lng = LOCATIONS.dampoort.lng;
    dampoortLine = L.polyline([
        [51.12, lng],  // Noord (boven Gent)
        [50.98, lng]   // Zuid (onder Gent)
    ], {
        color: '#dc2626',
        weight: 3,
        opacity: 0.6,
        dashArray: '10, 10'
    }).bindPopup('<b>Oost/West grens</b><br>Station Dampoort').addTo(map);
}

/**
 * Verberg Dampoort lijn
 */
function hideDampoortLine() {
    if (dampoortLine && map.hasLayer(dampoortLine)) {
        map.removeLayer(dampoortLine);
        dampoortLine = null;
    }
}

/**
 * Toon verticale lijn door Watersportbaan (oost/west grens)
 */
function showWatersportbaanLine() {
    if (!LOCATIONS.watersportbaan_tip) return;
    
    hideWatersportbaanLine();
    
    // Teken een verticale lijn (noord-zuid) door Watersportbaan tip
    const lng = LOCATIONS.watersportbaan_tip.lng;
    watersportbaanLine = L.polyline([
        [51.12, lng],  // Noord (boven Gent)
        [50.98, lng]   // Zuid (onder Gent)
    ], {
        color: '#dc2626',
        weight: 3,
        opacity: 0.6,
        dashArray: '10, 10'
    }).bindPopup('<b>Oost/West grens</b><br>Watersportbaan tip').addTo(map);
}

/**
 * Verberg Watersportbaan lijn
 */
function hideWatersportbaanLine() {
    if (watersportbaanLine && map.hasLayer(watersportbaanLine)) {
        map.removeLayer(watersportbaanLine);
        watersportbaanLine = null;
    }
}

/**
 * Toon cirkels rond Weba en IKEA voor proximity vragen
 */
function showProximityCircles() {
    // Geen visualisatie nodig voor proximity vragen
    // Markers worden al getoond via updatePOIMarkers
}

/**
 * Verberg proximity cirkels
 */
function hideProximityCircles() {
    proximityCircles.forEach(circle => {
        if (map.hasLayer(circle)) {
            map.removeLayer(circle);
        }
    });
    proximityCircles = [];
}

/**
 * Toont of verbergt spoorlijn op basis van de huidige kaart
 */
function updateRailwayVisibility() {
    if (!cardManager) {
        hideRailway();
        return;
    }
    
    const currentCard = cardManager.getCard(currentCardIndex);
    
    // Toon spoorlijn alleen als de huidige kaart een bufferLine vraag is
    if (currentCard && currentCard.answerType === 'bufferLine') {
        showRailway();
    } else {
        hideRailway();
    }
}

/**
 * Voegt een legenda toe aan de kaart
 */
function addMapLegend() {
    const legend = L.control({ position: 'topright' });
    
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend');
        div.classList.add('legend-collapsed');
        
        div.innerHTML = `
            <div class="legend-header" onclick="toggleLegenda(event)">
                <span class="legend-title">📋 Legende</span>
                <span class="legend-toggle">▶</span>
            </div>
            <div class="legend-content hidden">
                <div><span class="legend-line" style="background: #fb923c;"></span> R40 Ring</div>
                <div><span class="legend-line" style="background: #1e40af;"></span> Leie-Schelde Lijn</div>
                <div><span class="legend-line" style="background: #dc2626;"></span> Spoorlijn Oostende-Antwerpen</div>
                <div><span class="legend-line" style="background: #9ca3af;"></span> Stadswijken</div>
                <div><span class="legend-marker" style="background: #dc2626;"></span> Belfort (centrum)</div>
                <div class="legend-item-with-checkbox">
                    <span class="legend-marker" style="background: #22c55e;"></span> Je locatie
                    <label class="legend-checkbox">
                        <input type="checkbox" id="toggleBikeMarker" checked onchange="toggleBikeMarkerVisibility()">
                        <span class="checkbox-label">Toon</span>
                    </label>
                </div>
            </div>
        `;
        
        // Klik ergens anders op de kaart om legenda in te klappen
        map.on('click', () => {
            if (!div.classList.contains('legend-collapsed')) {
                div.classList.add('legend-collapsed');
                div.querySelector('.legend-content').classList.add('hidden');
                div.querySelector('.legend-toggle').textContent = '▶';
            }
        });
        
        return div;
    };
    
    legend.addTo(map);
}

/**
 * Toggle legenda expand/collapse
 */
function toggleLegenda(event) {
    event.stopPropagation();
    const div = event.currentTarget.closest('.map-legend');
    const content = div.querySelector('.legend-content');
    const toggle = div.querySelector('.legend-toggle');
    
    if (div.classList.contains('legend-collapsed')) {
        div.classList.remove('legend-collapsed');
        content.classList.remove('hidden');
        toggle.textContent = '▼';
    } else {
        div.classList.add('legend-collapsed');
        content.classList.add('hidden');
        toggle.textContent = '▶';
    }
}

/**
 * Toggle fiets marker zichtbaarheid
 */
function toggleBikeMarkerVisibility() {
    const checkbox = document.getElementById('toggleBikeMarker');
    
    if (!currentLocationMarker) {
        return;
    }
    
    if (checkbox.checked) {
        // Toon de marker
        if (!map.hasLayer(currentLocationMarker)) {
            currentLocationMarker.addTo(map);
        }
    } else {
        // Verberg de marker
        if (map.hasLayer(currentLocationMarker)) {
            map.removeLayer(currentLocationMarker);
        }
    }
}

/**
 * Check of de fiets marker zichtbaar moet zijn
 */
function shouldShowBikeMarker() {
    const checkbox = document.getElementById('toggleBikeMarker');
    return checkbox ? checkbox.checked : true; // Standaard zichtbaar
}

/**
 * Update POI markers op basis van huidige enkele kaart
 */
/**
 * Update POI markers op basis van huidige kaart
 */
function updatePOIMarkers() {
    if (!cardManager || !cardManager.flop) {
        return;
    }
    
    // Verwijder alle oude proximity cirkels
    hideProximityCircles();
    
    // Haal de huidige kaart op (alleen de enkele kaart view)
    const currentCard = cardManager.getCard(currentCardIndex);
    const activePois = (currentCard && currentCard.pois) || [];
    
    // Toon/verberg elke POI marker
    Object.keys(poiMarkers).forEach(poiKey => {
        const marker = poiMarkers[poiKey];
        const shouldShow = activePois.includes(poiKey);
        
        if (marker) {
            if (shouldShow && !map.hasLayer(marker)) {
                marker.addTo(map);
            } else if (!shouldShow && map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        }
    });
    
    // Toon visualisaties op basis van answerType
    if (currentCard) {
        // Dampoort lijn
        if (currentCard.answerType === 'dampoort') {
            showDampoortLine();
        } else {
            hideDampoortLine();
        }
        
        // Watersportbaan lijn
        if (currentCard.answerType === 'watersportbaan') {
            showWatersportbaanLine();
        } else {
            hideWatersportbaanLine();
        }
    } else {
        hideDampoortLine();
        hideWatersportbaanLine();
    }
    
    // Toon POI collections (bijv. bibliotheken) als kaart radiusProximity is
    updatePOICollectionMarkers();
}

/**
 * Update markers voor POI collections (bibliotheken, etc.)
 */
function updatePOICollectionMarkers() {
    // Verwijder oude POI collection markers en cirkels
    poiCollectionMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    poiCollectionMarkers = [];
    
    if (!cardManager || !cardManager.flop) {
        return;
    }
    
    const currentCard = cardManager.getCard(currentCardIndex);
    if (!currentCard || (currentCard.answerType !== 'radiusProximity' && currentCard.answerType !== 'FurthestDistance')) {
        return;
    }
    
    // Haal POIs van het aangegeven type op
    const poiType = currentCard.poiType;
    const pois = getPOIsByType(poiType);
    
    if (pois.length === 0) {
        return;
    }
    
    // Haal radius op voor radiusProximity kaarten
    const radius = currentCard.radius;
    
    // Toon alle POIs met dezelfde marker stijl als andere POIs
    pois.forEach(poi => {
        const marker = L.marker([poi.lat, poi.lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).bindPopup(`<b>${poi.name}</b><br>${poi.address || ''}`).addTo(map);
        
        poiCollectionMarkers.push(marker);
        
        // Voor radiusProximity kaarten: voeg cirkel met stippellijn toe rondom POI
        if (currentCard.answerType === 'radiusProximity' && radius) {
            const circle = L.circle([poi.lat, poi.lng], {
                radius: radius,
                color: '#dc2626',
                fillColor: 'transparent',
                fillOpacity: 0,
                weight: 2,
                opacity: 0.6,
                dashArray: '10, 10'
            }).addTo(map);
            
            poiCollectionMarkers.push(circle);
        }
    });
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
    
    // Update POI markers op basis van flop
    updatePOIMarkers();
    
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
            });
            // Voeg alleen toe aan map als checkbox checked is
            if (shouldShowBikeMarker()) {
                currentLocationMarker.addTo(map);
            }
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
        
        // GPS knop blijft zichtbaar en enabled tot locatie bevestigd is
        getGpsBtn.disabled = false;
        getGpsBtn.textContent = 'Haal GPS Locatie Op';
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
            LOCATIONS.belfort.lat, LOCATIONS.belfort.lng
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
        
        // Bepaal wijk
        const neighborhood = getNeighborhoodAtLocation(position.lat, position.lng);
        const neighborhoodHtml = neighborhood 
            ? `<div class="location-detail-item">
                <span class="detail-icon">🏘️</span>
                <span class="detail-label">Wijk:</span>
                <span class="detail-value">${neighborhood.name}</span>
            </div>`
            : '';
        
        locationResult.innerHTML = `
            <div class="location-detail-item">
                <span class="detail-icon">🎯</span>
                <span class="detail-label">Afstand tot Belfort:</span>
                <span class="detail-value">${Math.round(distanceToCenter)}m</span>
            </div>
            ${neighborhoodHtml}
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
        
        // Toon checklist sectie in plaats van direct naar kaarten
        loadHiderChecklist();
        
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
    
    // Haal huidige locatie op
    const gameData = loadGameData();
    const currentLocation = gameData.location;
    
    // Bepaal huidige wijk en aangrenzende wijken
    let currentNeighborhood = 'Onbekend';
    if (currentLocation) {
        const neighborhood = getNeighborhoodAtLocation(currentLocation.lat, currentLocation.lng);
        if (neighborhood) {
            currentNeighborhood = neighborhood.name;
            
            // Haal aangrenzende wijken op
            const adjacentNeighborhoods = getAdjacentNeighborhoods(neighborhood.name);
            if (adjacentNeighborhoods && adjacentNeighborhoods.length > 0) {
                currentNeighborhood += ` (aangrenzend: ${adjacentNeighborhoods.join(', ')})`;
            }
        }
    }
    
    // Check of er een bibliotheek binnen 750m is
    let libraryWithin750m = 'Nee';
    if (currentLocation) {
        const libraries = getPOIsByType('libraries');
        for (const lib of libraries) {
            const distance = calculateDistance(currentLocation.lat, currentLocation.lng, lib.lat, lib.lng);
            if (distance <= 750) {
                libraryWithin750m = `Ja (${lib.name}, ${Math.round(distance)}m)`;
                break;
            }
        }
    }

    let hospitalWithin900m = 'Nee';
    if (currentLocation) {
        const hospitals = getPOIsByType('hospitals');
        for (const hospital of hospitals) {
            const distance = calculateDistance(currentLocation.lat, currentLocation.lng, hospital.lat, hospital.lng);
            if (distance <= 900) {
                hospitalWithin900m = `Ja (${hospital.name}, ${Math.round(distance)}m)`;
                break;
            }
        }
    }

    let watertowerWithin1250m = 'Nee';
    if (currentLocation) {
        const watertowers = getPOIsByType('watertowers');
        for (const tower of watertowers) {
            const distance = calculateDistance(currentLocation.lat, currentLocation.lng, tower.lat, tower.lng);
            if (distance <= 1250) {
                watertowerWithin1250m = `Ja (${tower.name}, ${Math.round(distance)}m)`;
                break;
            }
        }
     }
    
    const questions = [
        { label: 'Huidige Wijk', value: currentNeighborhood },
        { label: 'Bibliotheek binnen 750m', value: libraryWithin750m },
        { label: 'Ziekenhuis binnen 900m', value: hospitalWithin900m },
        { label: 'Watertoren binnen 1250m', value: watertowerWithin1250m },
        { label: 'R40', value: checks.r40.answer },
        { label: 'Leie-Schelde', value: checks.leieSchelde.answer },
        { label: 'Weba/IKEA', value: `${checks.webaIkea.answer} (Weba: ${checks.webaIkea.distanceWeba}m / IKEA: ${checks.webaIkea.distanceIkea}m)` },
        { label: 'Dampoort', value: checks.dampoort.answer },
        { label: 'Watersportbaan', value: checks.watersportbaan.answer },
        { label: 'Spoorlijn Oostende-Antwerpen', value: checks.railwayBuffer.answer },
        { label: 'Verste Colruyt', value: checks.furthestColruyt.answer ? `${checks.furthestColruyt.name} (${checks.furthestColruyt.distance}m)` : 'Nee' },
        { label: 'Verste Kattenopvang/Asiel', value: checks.furthestCatlocation.answer ? `${checks.furthestCatlocation.name} (${checks.furthestCatlocation.distance}m)` : 'Nee' }
    ];
    
    questionsResult.innerHTML = questions.map(q => `
        <div class="question-item">
            <strong>${q.label}:</strong>
            <span>${q.value}</span>
        </div>
    `).join('');
}

/**
 * Laad en toon de hider checklist
 */
function loadHiderChecklist() {
    // Check of checklist al voltooid is (knop is geklikt)
    if (isChecklistCompleted()) {
        console.log('Checklist already completed, skipping...');
        handleCompleteChecklist();
        return;
    }
    
    console.log('Loading hider checklist...');
    console.log('GAME_CARDS:', GAME_CARDS);
    console.log('GAME_CARDS.hiderChecklist:', GAME_CARDS.hiderChecklist);
    console.log('GAME_CARDS.cards:', GAME_CARDS.cards);
    
    checklistSection.classList.remove('hidden');
    
    // Haal checklist items op uit GAME_CARDS data
    const checklist = GAME_CARDS.hiderChecklist || [];
    console.log('Checklist items:', checklist);
    
    // Als er geen checklist is, toon een foutmelding
    if (checklist.length === 0) {
        console.error('Geen checklist items gevonden! Check cards.json');
        // Sla checklist over en ga direct naar kaarten
        handleCompleteChecklist();
        return;
    }
    
    // Laad opgeslagen state of maak nieuwe
    const savedState = loadChecklistState();
    if (savedState && savedState.length === checklist.length) {
        checklistCompleted = savedState;
        console.log('Restored checklist state:', checklistCompleted);
    } else {
        checklistCompleted = new Array(checklist.length).fill(false);
    }
    
    // Render checklist items
    checklistItemsContainer.innerHTML = checklist.map((item, index) => `
        <div class="checklist-item ${checklistCompleted[index] ? 'completed' : ''}" data-index="${index}" onclick="toggleChecklistItem(${index})">
            <div class="checklist-checkbox"></div>
            <div class="checklist-text">${item}</div>
        </div>
    `).join('');
    
    updateChecklistButton();
}

/**
 * Toggle checklist item
 */
function toggleChecklistItem(index) {
    checklistCompleted[index] = !checklistCompleted[index];
    
    // Update UI
    const item = checklistItemsContainer.children[index];
    if (checklistCompleted[index]) {
        item.classList.add('completed');
    } else {
        item.classList.remove('completed');
    }
    
    // Sla state op
    saveChecklistState(checklistCompleted);
    
    updateChecklistButton();
}

/**
 * Update checklist complete button state
 */
function updateChecklistButton() {
    const allCompleted = checklistCompleted.every(completed => completed);
    completeChecklistBtn.disabled = !allCompleted;
}

/**
 * Handle checklist completion
 */
function handleCompleteChecklist() {
    // Sla op dat checklist voltooid is
    saveChecklistCompleted();
    
    checklistSection.classList.add('hidden');
    
    // Toon vragen sectie en kaarten sectie
    const position = currentLocationMarker.getLatLng();
    const result = performAllChecks(position.lat, position.lng);
    displayQuestions(result.checks);
    
    cardsSection.classList.remove('hidden');
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
    
    // Haal bestaand antwoord op (indien aanwezig) - gebruik card.id
    const opponentAnswer = card && card.id ? getOpponentAnswer(card.id) : null;
    
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
        // Check of dit een distanceFromBike kaart is
        if (card.answerType === 'distanceFromBike') {
            // Speciale UI voor distanceFromBike kaarten
            answerSection.innerHTML = `
                <div class="answer-input">
                    <div class="answer-label">💡 Vraag aan de seeker: "Ben ik binnen ${card.radius}m van de fiets?"</div>
                    <div class="distance-from-bike-input">
                        <label for="opponent-location-input">Mijn coördinaten (lat, lng):</label>
                        <input 
                            type="text" 
                            id="opponent-location-input" 
                            placeholder="51.0543, 3.7234"
                            class="coords-input"
                        >
                        <button onclick="previewDistanceCircle(${currentCardIndex})" class="btn btn-secondary">🔍 Preview Cirkel</button>
                    </div>
                    <div class="answer-label" style="margin-top: 16px;">Antwoord:</div>
                    <div class="answer-buttons" id="answer-buttons-${currentCardIndex}">
                        <!-- Buttons worden dynamisch gegenereerd -->
                    </div>
                    <p class="answer-hint">→ Na het invoeren wordt de kaart automatisch opgelost</p>
                </div>
            `;
        } else {
            // Normale antwoord sectie
            answerSection.innerHTML = `
                <div class="answer-input">
                    <div class="answer-label">💡 Voltooi de task, stel de vraag aan je tegenstander en voer het antwoord in:</div>
                    <div class="answer-buttons" id="answer-buttons-${currentCardIndex}">
                        <!-- Buttons worden dynamisch gegenereerd op basis van vraag type -->
                    </div>
                    <p class="answer-hint">→ Na het invoeren wordt de kaart automatisch opgelost</p>
                </div>
            `;
        }
        
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
    
    // Update POI markers voor huidige kaart
    updatePOIMarkers();
    
    // Update neighborhood visibility (toon alleen bij neighborhood vragen)
    updateNeighborhoodVisibility();
    
    // Update railway visibility (toon alleen bij bufferLine vragen)
    updateRailwayVisibility();
}

/**
 * Genereer antwoord knoppen op basis van vraag type
 */
function generateAnswerButtons(cardIndex, question) {
    const container = document.getElementById(`answer-buttons-${cardIndex}`);
    if (!container) return;
    
    const card = cardManager.getCard(cardIndex);
    
    // Check of dit een radiusProximity vraag is
    if (card && card.answerType === 'radiusProximity') {
        // Voor radiusProximity: Ja/Nee buttons met speciale handler
        const buttons = ['Ja', 'Nee'];
        buttons.forEach(answer => {
            const btn = document.createElement('button');
            btn.className = 'btn-answer';
            btn.textContent = answer;
            btn.onclick = () => handleRadiusProximityAnswer(cardIndex, answer);
            container.appendChild(btn);
        });
    } else if (card && card.answerType === 'distanceFromBike') {
        // Voor distanceFromBike: Ja/Nee buttons
        const buttons = ['Ja', 'Nee'];
        buttons.forEach(answer => {
            const btn = document.createElement('button');
            btn.className = 'btn-answer';
            btn.textContent = answer;
            btn.onclick = () => handleDistanceFromBikeAnswer(cardIndex, answer);
            container.appendChild(btn);
        });
    } else if (card && card.answerType === 'FurthestDistance') {
        // Voor FurthestDistance: Dropdown met Colruyts
        const poiType = card.poiType || 'colruyts';
        const pois = getPOIsByType(poiType);
        
        if (pois.length > 0) {
            const select = document.createElement('select');
            select.className = 'poi-select';
            select.id = `poi-select-${cardIndex}`;
            
            // Default optie
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = `Selecteer ${poiType}...`;
            select.appendChild(defaultOption);
            
            // Voeg alle POIs toe
            pois.forEach(poi => {
                const option = document.createElement('option');
                option.value = poi.name;
                option.textContent = poi.name;
                select.appendChild(option);
            });
            
            container.appendChild(select);
            
            // Bevestig knop
            const btn = document.createElement('button');
            btn.className = 'btn-answer';
            btn.textContent = 'Bevestig';
            btn.onclick = () => {
                const selectedPOI = select.value;
                if (selectedPOI) {
                    handleFurthestDistanceAnswer(cardIndex, selectedPOI);
                } else {
                    alert(`Selecteer eerst een ${poiType}`);
                }
            };
            container.appendChild(btn);
        }
    } else if (card && card.answerType === 'eliminateNeighborhood') {
        // Voor eliminateNeighborhood: Dropdown met wijken
        if (CITY_NEIGHBORHOODS && CITY_NEIGHBORHOODS.length > 0) {
            const select = document.createElement('select');
            select.className = 'poi-select';
            select.id = `neighborhood-eliminate-select-${cardIndex}`;
            
            // Default optie
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Selecteer te elimineren wijk...';
            select.appendChild(defaultOption);
            
            // Voeg alle wijken toe
            CITY_NEIGHBORHOODS.forEach(neighborhood => {
                const option = document.createElement('option');
                option.value = neighborhood.name;
                option.textContent = neighborhood.name;
                select.appendChild(option);
            });
            
            container.appendChild(select);
            
            // Bevestig knop
            const btn = document.createElement('button');
            btn.className = 'btn-answer';
            btn.textContent = 'Elimineer Wijk';
            btn.onclick = () => {
                const selectedNeighborhood = select.value;
                if (selectedNeighborhood) {
                    handleEliminateNeighborhoodAnswer(cardIndex, selectedNeighborhood);
                } else {
                    alert('Selecteer eerst een wijk om te elimineren');
                }
            };
            container.appendChild(btn);
        }
    } else {
        // Normale antwoord knoppen
        const buttons = getAnswerButtonsForQuestion(question);
        buttons.forEach(answer => {
            const btn = document.createElement('button');
            btn.className = 'btn-answer';
            btn.textContent = answer;
            btn.onclick = () => handleOpponentAnswer(cardIndex, answer);
            container.appendChild(btn);
        });
    }
}

/**
 * Verwerk antwoord van tegenstander
 */
function handleOpponentAnswer(cardIndex, answer) {
    const card = cardManager.getCard(cardIndex);
    
    if (!card || !card.id) {
        console.error('Kaart heeft geen ID:', card);
        return;
    }
    
    // Check of dit een SameOrAdjacentNeighborhood vraag is
    if (card.answerType === 'SameOrAdjacentNeighborhood') {
        // Open neighborhood modal met het antwoord al ingevuld
        openNeighborhoodModalWithAnswer(cardIndex, answer);
        return;
    }
    
    saveOpponentAnswer(card.id, answer, card.task, cardIndex);
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
 * Verwerk Ja/Nee antwoord voor radiusProximity kaarten
 */
function handleRadiusProximityAnswer(cardIndex, answer) {
    const card = cardManager.getCard(cardIndex);
    if (!card || !card.poiType || !card.radius) return;
    
    const answerMap = { 'Ja': 'yes', 'Nee': 'no' };
    const answerValue = answerMap[answer];
    
    // Sla exclusion zone op
    const gameData = loadGameData();
    const currentDiscardedCount = cardManager.discarded.length;
    
    gameData.exclusionZones = gameData.exclusionZones || [];
    gameData.exclusionZones.push({
        type: 'radiusProximity',
        answer: answerValue,
        poiType: card.poiType,
        radius: card.radius,
        cardIndex: cardIndex
    });
    
    saveGameData(gameData);
    
    // Discard de kaart
    cardManager.discardCard(cardIndex);
    saveDiscardedAnswer(currentDiscardedCount, answer, card.task, cardIndex);
    
    // Update state
    saveCardManagerState();
    
    // Update visualisatie
    updateExclusionZones();
    updateCardDisplay();
}

/**
 * Verwerk Ja/Nee antwoord voor distanceFromBike kaarten
 */
function handleDistanceFromBikeAnswer(cardIndex, answer) {
    const card = cardManager.getCard(cardIndex);
    if (!card || !card.radius) return;
    
    // Haal de ingevoerde coördinaten op
    const input = document.getElementById('opponent-location-input');
    const coordsInput = input ? input.value.trim() : '';
    
    if (!coordsInput) {
        alert('Voer eerst de coördinaten van de seeker in!');
        return;
    }
    
    // Parse coördinaten
    const parts = coordsInput.split(',').map(p => p.trim());
    if (parts.length !== 2) {
        alert('Ongeldig formaat. Gebruik: 51.0543, 3.7234');
        return;
    }
    
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    
    if (isNaN(lat) || isNaN(lng)) {
        alert('Ongeldige coördinaten. Controleer het formaat.');
        return;
    }
    
    // Sla exclusion zone op
    const gameData = loadGameData();
    const currentDiscardedCount = cardManager.discarded.length;
    
    gameData.exclusionZones = gameData.exclusionZones || [];
    
    // Map antwoord: Ja = binnen radius, Nee = buiten radius
    const answerMap = { 'Ja': 'yes', 'Nee': 'no' };
    const answerValue = answerMap[answer] || 'no';
    
    gameData.exclusionZones.push({
        type: 'distanceFromBike',
        answer: answerValue,
        seekerLocation: { lat, lng },
        radius: card.radius,
        cardIndex: cardIndex
    });
    
    saveGameData(gameData);
    
    // Discard de kaart
    cardManager.discardCard(cardIndex);
    saveDiscardedAnswer(currentDiscardedCount, answer, card.task, cardIndex);
    
    // Sla het antwoord ook op als opponent answer
    if (card.id) {
        saveOpponentAnswer(card.id, answer, card.task, cardIndex);
    }
    
    // Save state
    saveCardManagerState();
    
    // Verwijder preview cirkel en marker
    if (distanceCircle) {
        map.removeLayer(distanceCircle);
        distanceCircle = null;
    }
    if (opponentMarker) {
        map.removeLayer(opponentMarker);
        opponentMarker = null;
    }
    
    // Update visualisatie met exclusion zones
    updateExclusionZones();
    updateCardDisplay();
}

/**
 * Verwerk FurthestDistance antwoord (verste Colruyt/POI)
 */
function handleFurthestDistanceAnswer(cardIndex, selectedPOI) {
    const card = cardManager.getCard(cardIndex);
    if (!card) return;
    
    const poiType = card.poiType || 'colruyts';
    const pois = getPOIsByType(poiType);
    const selectedPOIData = pois.find(p => p.name === selectedPOI);
    
    if (!selectedPOIData) {
        console.error('POI niet gevonden:', selectedPOI);
        return;
    }
    
    // Voeg exclusion zone toe
    const gameData = loadGameData();
    if (!gameData.exclusionZones) {
        gameData.exclusionZones = [];
    }
    
    gameData.exclusionZones.push({
        type: 'furthestDistance',
        answer: selectedPOI,
        poiType: poiType,
        selectedPOI: selectedPOIData,
        cardIndex: cardIndex
    });
    
    saveGameData(gameData);
    
    // Bewaar het antwoord voor deze discarded kaart (voordat we discard)
    const currentDiscardedCount = cardManager.discarded.length;
    
    // Discard de kaart
    cardManager.discardCard(cardIndex);
    saveDiscardedAnswer(currentDiscardedCount, selectedPOI, card.task, cardIndex);
    
    // Sla het antwoord ook op als opponent answer
    if (card.id) {
        saveOpponentAnswer(card.id, selectedPOI, card.task, cardIndex);
    }
    
    // Save state
    saveCardManagerState();
    
    // Update visualisatie met exclusion zones
    updateExclusionZones();
    updateCardDisplay();
}

/**
 * Verwerk antwoord voor eliminateNeighborhood kaarten
 */
function handleEliminateNeighborhoodAnswer(cardIndex, selectedNeighborhood) {
    const card = cardManager.getCard(cardIndex);
    if (!card) return;
    
    // Vind de geselecteerde wijk data
    const neighborhoodData = CITY_NEIGHBORHOODS.find(n => n.name === selectedNeighborhood);
    
    if (!neighborhoodData) {
        console.error('Wijk niet gevonden:', selectedNeighborhood);
        return;
    }
    
    // Voeg exclusion zone toe
    const gameData = loadGameData();
    if (!gameData.exclusionZones) {
        gameData.exclusionZones = [];
    }
    
    gameData.exclusionZones.push({
        type: 'eliminateNeighborhood',
        answer: selectedNeighborhood,
        neighborhoodData: neighborhoodData,
        cardIndex: cardIndex
    });
    
    saveGameData(gameData);
    
    // Bewaar het antwoord voor deze discarded kaart (voordat we discard)
    const currentDiscardedCount = cardManager.discarded.length;
    
    // Discard de kaart
    cardManager.discardCard(cardIndex);
    saveDiscardedAnswer(currentDiscardedCount, selectedNeighborhood, card.task, cardIndex);
    
    // Sla het antwoord ook op als opponent answer
    if (card.id) {
        saveOpponentAnswer(card.id, selectedNeighborhood, card.task, cardIndex);
    }
    
    // Save state
    saveCardManagerState();
    
    // Update visualisatie met exclusion zones
    updateExclusionZones();
    updateCardDisplay();
}

/**
 * Wijzig antwoord van tegenstander
 */
function changeOpponentAnswer(cardIndex) {
    const card = cardManager.getCard(cardIndex);
    
    if (!card || !card.id) {
        console.error('Kaart heeft geen ID:', card);
        return;
    }
    
    if (confirm('Wil je het antwoord van de tegenstander wijzigen?')) {
        // Verwijder het antwoord uit opponentAnswers
        saveOpponentAnswer(card.id, null, card.task, cardIndex);
        
        // Voor kaarten met exclusion zones, verwijder ook de exclusion zone
        const gameData = loadGameData();
        if (gameData.exclusionZones) {
            // Verwijder exclusion zones voor deze cardIndex
            gameData.exclusionZones = gameData.exclusionZones.filter(ez => 
                ez.cardIndex !== cardIndex
            );
            saveGameData(gameData);
        }
        
        // Update visualisatie en display
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
    
    // Laad cardAnswers (oude methode)
    if (gameData.cardAnswers && gameData.cardAnswers.length > 0) {
        gameData.cardAnswers.forEach(answerData => {
            const layer = createExclusionLayer(answerData.opponentAnswer);
            if (layer) {
                layer.addTo(map);
                exclusionLayers.push(layer);
            }
        });
    }
    
    // Laad exclusionZones (nieuwe methode, inclusief neighborhoods)
    if (gameData.exclusionZones && gameData.exclusionZones.length > 0) {
        gameData.exclusionZones.forEach(exclusionData => {
            const layer = createExclusionLayerFromData(exclusionData);
            if (layer) {
                layer.addTo(map);
                exclusionLayers.push(layer);
            }
        });
    }
    
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
    
    // Binnen 800m van spoorlijn -> je bent binnen buffer, sluit alles BUITEN buffer uit
    if (answer === 'Binnen 800m van spoorlijn') {
        const outerBox = [
            [largeBounds.north, largeBounds.west],
            [largeBounds.north, largeBounds.east],
            [largeBounds.south, largeBounds.east],
            [largeBounds.south, largeBounds.west]
        ];
        const bufferCoords = RAILWAY_BUFFER.map(point => [point.lat, point.lng]);
        return L.polygon([outerBox, bufferCoords], exclusionStyle).bindPopup('❌ Uitgesloten: Buiten 800m buffer spoorlijn');
    }
    
    // Buiten 800m van spoorlijn -> je bent buiten buffer, sluit alles BINNEN buffer uit
    if (answer === 'Buiten 800m van spoorlijn') {
        const bufferCoords = RAILWAY_BUFFER.map(point => [point.lat, point.lng]);
        return L.polygon(bufferCoords, exclusionStyle).bindPopup('❌ Uitgesloten: Binnen 800m buffer spoorlijn');
    }
    
    return null;
}

/**
 * Maak een exclusion layer op basis van exclusion data (nieuwe methode)
 */
function createExclusionLayerFromData(exclusionData) {
    if (!exclusionData) return null;
    
    const exclusionStyle = {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.5,
        weight: 2,
        dashArray: '5, 5',
        interactive: false,
        pane: 'exclusionPane'
    };
    
    // Neighborhood exclusions
    if (exclusionData.type === 'neighborhood') {
        const { answer, allowedNeighborhoods, selectedNeighborhood } = exclusionData;
        
        // Bepaal welke wijken uit te sluiten
        let excludedNeighborhoods = [];
        
        if (answer === 'yes') {
            // "Ja" antwoord: alle wijken BEHALVE de allowed ones zijn uitgesloten
            excludedNeighborhoods = CITY_NEIGHBORHOODS.filter(
                n => !allowedNeighborhoods.includes(n.name)
            );
        } else if (answer === 'no') {
            // "Nee" antwoord: de allowed wijken zijn uitgesloten
            excludedNeighborhoods = CITY_NEIGHBORHOODS.filter(
                n => allowedNeighborhoods.includes(n.name)
            );
        }
        
        // Teken alle uitgesloten wijken
        const layers = excludedNeighborhoods.map(neighborhood => {
            const coords = neighborhood.polygon.map(point => [point.lat, point.lng]);
            return L.polygon(coords, exclusionStyle).bindPopup(
                `❌ Uitgesloten wijk: ${neighborhood.name}`
            );
        });
        
        // Return een FeatureGroup van alle layers
        if (layers.length > 0) {
            return L.featureGroup(layers);
        }
    }
    
    // Eliminate Neighborhood exclusions
    if (exclusionData.type === 'eliminateNeighborhood') {
        const { answer, neighborhoodData } = exclusionData;
        
        if (!neighborhoodData) {
            console.warn('No neighborhood data provided for eliminateNeighborhood');
            return null;
        }
        
        // Teken de geëlimineerde wijk in het rood
        const coords = neighborhoodData.polygon.map(point => [point.lat, point.lng]);
        return L.polygon(coords, exclusionStyle).bindPopup(
            `❌ Geëlimineerde wijk: ${neighborhoodData.name}`
        );
    }
    
    // Radius Proximity exclusions (bijv. bibliotheken binnen 1km)
    if (exclusionData.type === 'radiusProximity') {
        const { answer, poiType, radius } = exclusionData;
        const pois = getPOIsByType(poiType);
        
        console.log(`Creating exclusion zones: type=radiusProximity, answer=${answer}, poiType=${poiType}, radius=${radius}, pois=${pois.length}`);
        
        if (pois.length === 0) {
            console.warn(`No POIs found for type: ${poiType}`);
            return null;
        }
        
        if (answer === 'no') {
            // "Nee" = er is GEEN POI binnen radius
            // Sluit alle zones BINNEN de radius uit (rode circles)
            const earthRadius = 6371000;
            const layers = pois.map(poi => {
                const circlePoints = [];
                for (let angle = 0; angle <= 360; angle += 5) {
                    const rad = (angle * Math.PI) / 180;
                    const latOffset = (radius / earthRadius) * (180 / Math.PI) * Math.cos(rad);
                    const lngOffset = 
                        ((radius / earthRadius) * (180 / Math.PI) * Math.sin(rad)) /
                        Math.cos((poi.lat * Math.PI) / 180);
                    
                    circlePoints.push([poi.lat + latOffset, poi.lng + lngOffset]);
                }
                
                return L.polygon(circlePoints, exclusionStyle).bindPopup(`❌ Uitgesloten: Binnen ${radius / 1000}km van ${poi.name || poiType}`);
            });
            
            console.log(`Created ${layers.length} exclusion circles for radiusProximity (no)`);
            if (layers.length > 0) {
                return L.featureGroup(layers);
            }
        } else {
            // "Ja" = er IS een POI binnen radius
            // Doel: kleur ALLES BUITEN de unie van alle cirkels rood,
            // zodat overlappende cirkels NIET rood worden.
            
            // Voor hospitals: maak grote rode polygon met gaten voor de cirkels
            if (poiType === 'hospitals' || poiType === 'watertowers') {
                const earthRadius = 6371000;
                const belfort = LOCATIONS.belfort;
                const gameRadius = GAME_RADIUS;
                
                // Maak een grote rechthoek rond het speelveld
                const degPerMeterLat = 1 / 111320;
                const degPerMeterLng = (lat) => 1 / (111320 * Math.cos((lat * Math.PI) / 180));
                
                const latDelta = gameRadius * degPerMeterLat;
                const lngDelta = gameRadius * degPerMeterLng(belfort.lat);
                
                const outerBounds = [
                    [belfort.lat + latDelta, belfort.lng - lngDelta],
                    [belfort.lat + latDelta, belfort.lng + lngDelta],
                    [belfort.lat - latDelta, belfort.lng + lngDelta],
                    [belfort.lat - latDelta, belfort.lng - lngDelta],
                    [belfort.lat + latDelta, belfort.lng - lngDelta]
                ];
                
                // Maak gaten (holes) voor elke hospital cirkel
                const holes = pois.map(poi => {
                    const hole = [];
                    for (let angle = 360; angle >= 0; angle -= 5) {
                        const rad = (angle * Math.PI) / 180;
                        const latOffset = (radius / earthRadius) * (180 / Math.PI) * Math.cos(rad);
                        const lngOffset = 
                            ((radius / earthRadius) * (180 / Math.PI) * Math.sin(rad)) /
                            Math.cos((poi.lat * Math.PI) / 180);
                        
                        hole.push([poi.lat + latOffset, poi.lng + lngOffset]);
                    }
                    return hole;
                });
                
                // Polygon met outer ring en holes
                const polygonWithHoles = L.polygon([outerBounds, ...holes], exclusionStyle)
                    .bindPopup(`❌ Uitgesloten: Buiten ${radius / 1000}km van alle ${poiType}`);
                
                console.log(`Created exclusion polygon with ${holes.length} holes for hospitals (yes)`);
                return polygonWithHoles;
            }
            
            // Voor andere POI types (bijv. libraries): gebruik raster
            // Implementatie: raster van kleine rechthoeken; cellen buiten de
            // (radius rond eender welke POI) krijgen een rood vak.

            const earthRadius = 6371000;
            const belfort = LOCATIONS.belfort;
            const gameRadius = GAME_RADIUS; // beperk tot speelveld

            // Bepaal bounds rond Belfort
            const degPerMeterLat = 1 / 111320; // ~ meters per graad breedte
            const degPerMeterLng = (lat) => 1 / (111320 * Math.cos((lat * Math.PI) / 180));

            const latDelta = gameRadius * degPerMeterLat;
            const lngDelta = gameRadius * degPerMeterLng(belfort.lat);
            const minLat = belfort.lat - latDelta;
            const maxLat = belfort.lat + latDelta;
            const minLng = belfort.lng - lngDelta;
            const maxLng = belfort.lng + lngDelta;

            // Raster resolutie (meters). Lager = fijner, maar zwaarder.
            const cellSizeM = 60; // 150m balans tussen performance en kwaliteit

            // Stapgroottes in graden voor huidige breedtegraad
            const dLat = cellSizeM * degPerMeterLat;
            const dLng = cellSizeM * degPerMeterLng(belfort.lat);

            const layers = [];

            for (let lat = minLat; lat < maxLat; lat += dLat) {
                for (let lng = minLng; lng < maxLng; lng += dLng) {
                    // Cel centrum
                    const cLat = lat + dLat / 2;
                    const cLng = lng + dLng / 2;

                    // Sla cellen buiten het SPEELVELD (GAME_RADIUS) over
                    const centerDistToBelfort = calculateDistance(cLat, cLng, belfort.lat, belfort.lng);
                    if (centerDistToBelfort > gameRadius) {
                        continue;
                    }

                    // Is het centrum binnen radius van een van de POIs?
                    let insideAny = false;
                    for (let i = 0; i < pois.length; i++) {
                        const p = pois[i];
                        const dist = calculateDistance(cLat, cLng, p.lat, p.lng);
                        if (dist <= radius) {
                            insideAny = true;
                            break;
                        }
                    }

                    // Alles BUITEN de unie van cirkels kleuren we rood
                    if (!insideAny) {
                        const bounds = [[lat, lng], [lat + dLat, lng + dLng]];
                        layers.push(L.rectangle(bounds, exclusionStyle));
                    }
                }
            }

            console.log(`Created grid outside-union mask with ${layers.length} cells`);
            return L.featureGroup(layers);
        }
    }
    
    // FurthestDistance exclusions (verste Colruyt/POI)
    if (exclusionData.type === 'furthestDistance') {
        const { poiType, selectedPOI } = exclusionData;
        const pois = getPOIsByType(poiType);
        
        console.log(`Creating exclusion zones: type=furthestDistance, poiType=${poiType}, selectedPOI=${selectedPOI.name}`);
        
        if (pois.length === 0) {
            console.warn(`No POIs found for type: ${poiType}`);
            return null;
        }
        
        // Het gebied dat het DICHTST bij de geselecteerde POI ligt moet rood worden
        // (want als deze POI het verste is, kan de hider daar niet zijn)
        
        const earthRadius = 6371000;
        const belfort = LOCATIONS.belfort;
        const gameRadius = GAME_RADIUS;
        
        // Bepaal bounds rond Belfort
        const degPerMeterLat = 1 / 111320;
        const degPerMeterLng = (lat) => 1 / (111320 * Math.cos((lat * Math.PI) / 180));
        
        const latDelta = gameRadius * degPerMeterLat;
        const lngDelta = gameRadius * degPerMeterLng(belfort.lat);
        const minLat = belfort.lat - latDelta;
        const maxLat = belfort.lat + latDelta;
        const minLng = belfort.lng - lngDelta;
        const maxLng = belfort.lng + lngDelta;
        
        // Raster resolutie
        const cellSizeM = 50;
        const dLat = cellSizeM * degPerMeterLat;
        const dLng = cellSizeM * degPerMeterLng(belfort.lat);
        
        const layers = [];
        
        for (let lat = minLat; lat < maxLat; lat += dLat) {
            for (let lng = minLng; lng < maxLng; lng += dLng) {
                const cLat = lat + dLat / 2;
                const cLng = lng + dLng / 2;
                
                // Sla cellen buiten het speelveld over
                const centerDistToBelfort = calculateDistance(cLat, cLng, belfort.lat, belfort.lng);
                if (centerDistToBelfort > gameRadius) {
                    continue;
                }
                
                // Bereken afstand naar de geselecteerde POI
                const distToSelected = calculateDistance(cLat, cLng, selectedPOI.lat, selectedPOI.lng);
                
                // Bereken afstand naar alle andere POIs
                let isClosestToSelected = true;
                for (let i = 0; i < pois.length; i++) {
                    const otherPOI = pois[i];
                    if (otherPOI.name === selectedPOI.name) continue;
                    
                    const distToOther = calculateDistance(cLat, cLng, otherPOI.lat, otherPOI.lng);
                    if (distToOther <= distToSelected) {
                        isClosestToSelected = false;
                        break;
                    }
                }
                
                // Als dit punt het dichtst bij de geselecteerde POI ligt, kleur het rood
                if (isClosestToSelected) {
                    const bounds = [[lat, lng], [lat + dLat, lng + dLng]];
                    layers.push(L.rectangle(bounds, exclusionStyle));
                }
            }
        }
        
        console.log(`Created ${layers.length} exclusion cells for furthestDistance (${selectedPOI.name})`);
        if (layers.length > 0) {
            return L.featureGroup(layers);
        }
    }
    
    // Distance From Bike exclusions
    if (exclusionData.type === 'distanceFromBike') {
        const { answer, seekerLocation, radius } = exclusionData;
        
        console.log(`Creating exclusion zones: type=distanceFromBike, answer=${answer}, radius=${radius}`);
        
        if (!seekerLocation || !seekerLocation.lat || !seekerLocation.lng) {
            console.warn('No seeker location provided for distanceFromBike');
            return null;
        }
        
        if (answer === 'yes') {
            // "Ja" = seeker is BINNEN radius van de fiets
            // Sluit alles BUITEN de cirkel uit (rood)
            // Gebruik een grote bounding box met een gat in het midden
            
            const largeBounds = {
                north: 51.15,
                south: 50.95,
                east: 3.90,
                west: 3.55
            };
            
            // Bereken cirkel punten
            const numPoints = 64;
            const circlePoints = [];
            const earthRadius = 6371000; // meters
            
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * 2 * Math.PI;
                const latOffset = (radius / earthRadius) * (180 / Math.PI);
                const lngOffset = (radius / (earthRadius * Math.cos(seekerLocation.lat * Math.PI / 180))) * (180 / Math.PI);
                
                const pointLat = seekerLocation.lat + latOffset * Math.cos(angle);
                const pointLng = seekerLocation.lng + lngOffset * Math.sin(angle);
                circlePoints.push([pointLat, pointLng]);
            }
            
            // Outer box met cirkel gat
            const outerBox = [
                [largeBounds.north, largeBounds.west],
                [largeBounds.north, largeBounds.east],
                [largeBounds.south, largeBounds.east],
                [largeBounds.south, largeBounds.west]
            ];
            
            return L.polygon([outerBox, circlePoints], exclusionStyle).bindPopup(
                `❌ Uitgesloten: Buiten ${radius}m van seeker`
            );
        } else {
            // "Nee" = seeker is BUITEN radius van de fiets
            // Sluit alles BINNEN de cirkel uit (rood)
            
            const circle = L.circle([seekerLocation.lat, seekerLocation.lng], {
                color: exclusionStyle.color,
                fillColor: exclusionStyle.fillColor,
                fillOpacity: exclusionStyle.fillOpacity,
                radius: radius,
                weight: exclusionStyle.weight,
                dashArray: exclusionStyle.dashArray,
                interactive: false,
                pane: 'exclusionPane'
            }).bindPopup(`❌ Uitgesloten: Binnen ${radius}m van seeker`);
            
            return circle;
        }
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
    
    // Force reload zonder cache en redirect naar root
    window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
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
        // Verberg wijken en spoorlijn in flop view
        hideNeighborhoods();
        hideRailway();
    } else if (view === 'discarded') {
        singleViewBtn.classList.remove('active');
        flopViewBtn.classList.remove('active');
        singleCardView.classList.add('hidden');
        flopView.classList.add('hidden');
        discardedView.classList.remove('hidden');
        renderDiscardedView();
        // Verberg wijken en spoorlijn in discarded view
        hideNeighborhoods();
        hideRailway();
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
            const hasAnswer = card && card.id ? getOpponentAnswer(card.id) : null;
            const requiresAnswer = card.requiresAnswer !== false; // Default true
            
            const cardEl = document.createElement('div');
            cardEl.className = 'flop-card';
            cardEl.style.cursor = 'pointer';
            
            // Maak hele kaart clickable om te openen
            cardEl.onclick = () => {
                viewCardDetail(globalIndex);
            };
            
            // Toon verschillende UI afhankelijk van of er een antwoord is
            if (hasAnswer) {
                cardEl.innerHTML = `
                    <div class="card-task">${card.task}</div>
                    <div class="card-question">${card.question || ''}</div>
                    <div class="answer-indicator">✅ Antwoord: ${hasAnswer}</div>
                `;
            } else if (!requiresAnswer) {
                // Kaart vereist geen antwoord
                cardEl.innerHTML = `
                    <div class="card-task">${card.task}</div>
                    <div class="card-question">${card.question || ''}</div>
                    <div class="answer-indicator">⏳ Wacht op voltooiing</div>
                `;
            } else {
                cardEl.innerHTML = `
                    <div class="card-task">${card.task}</div>
                    <div class="card-question">${card.question}</div>
                    <div class="answer-indicator">⏳ Wacht op antwoord</div>
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
    
    // Check of dit een SameOrAdjacentNeighborhood vraag is
    if (card.answerType === 'SameOrAdjacentNeighborhood') {
        // Voor neighborhood vragen, gebruik de speciale modal
        editNeighborhoodDiscardedAnswer(discardedIndex);
        return;
    }
    
    // Check of dit een FurthestDistance vraag is
    if (card.answerType === 'FurthestDistance') {
        // Voor FurthestDistance vragen, gebruik een speciale modal met dropdown
        editFurthestDistanceDiscardedAnswer(discardedIndex);
        return;
    }
    
    // Check of dit een eliminateNeighborhood vraag is
    if (card.answerType === 'eliminateNeighborhood') {
        // Voor eliminateNeighborhood vragen, gebruik een speciale modal met dropdown
        editEliminateNeighborhoodDiscardedAnswer(discardedIndex);
        return;
    }
    
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
            
            // Laad gameData ÉÉN KEER voor alle updates
            const gameData = loadGameData();
            
            // Update voor radiusProximity kaarten: update exclusionZones entry
            if (card.answerType === 'radiusProximity') {
                gameData.exclusionZones = gameData.exclusionZones || [];
                
                // Verwijder bestaande zone voor deze kaart
                gameData.exclusionZones = gameData.exclusionZones.filter(ez => 
                    !(ez.type === 'radiusProximity' && ez.cardIndex === originalCardIndex)
                );
                
                // Map tekst naar waarde
                const answerMap = { 'Ja': 'yes', 'Nee': 'no' };
                const answerValue = answerMap[answer] || 'no';
                
                // Voeg nieuwe zone toe met huidige kaartparams
                gameData.exclusionZones.push({
                    type: 'radiusProximity',
                    answer: answerValue,
                    poiType: card.poiType,
                    radius: card.radius,
                    cardIndex: originalCardIndex
                });
            }
            
            // Voor kaarten die NIET exclusionOnly zijn: update opponent answer
            const exclusionOnlyTypes = ['radiusProximity', 'eliminateNeighborhood', 'SameOrAdjacentNeighborhood'];
            
            if (!exclusionOnlyTypes.includes(card.answerType)) {
                // Update de opponent answer (in dezelfde gameData!)
                let updated = false;
                
                // Methode 1: Via card.id (meest betrouwbaar)
                if (card.id) {
                    const answerEntry = gameData.cardAnswers.find(a => a.cardId === card.id);
                    if (answerEntry) {
                        answerEntry.opponentAnswer = answer;
                        updated = true;
                    }
                }
                
                // Methode 2: Via originele cardIndex
                if (!updated && originalCardIndex !== null && originalCardIndex !== undefined) {
                    const answerEntry = gameData.cardAnswers.find(a => a.cardIndex === originalCardIndex);
                    if (answerEntry) {
                        answerEntry.opponentAnswer = answer;
                        updated = true;
                    }
                }
                
                // Methode 3: Via cardTask
                if (!updated) {
                    const answerEntry = gameData.cardAnswers.find(a => a.cardTask === card.task);
                    if (answerEntry) {
                        answerEntry.opponentAnswer = answer;
                        updated = true;
                    }
                }
                
                if (!updated) {
                    console.warn('Could not update opponent answer for card:', card.task);
                }
            }
            
            // Sla gameData ÉÉN KEER op
            saveGameData(gameData);
            
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
 * Bewerk het antwoord van een opgeloste neighborhood kaart
 */
function editNeighborhoodDiscardedAnswer(discardedIndex) {
    if (!cardManager) return;
    
    const card = cardManager.discarded[discardedIndex];
    if (!card) return;
    
    // Haal de originele cardIndex op
    const discardedData = getDiscardedAnswerData(discardedIndex);
    let originalCardIndex = discardedData?.originalCardIndex;
    
    // Als originalCardIndex niet bestaat, zoek dan de exclusion zone voor deze kaart
    // en gebruik die cardIndex (voor backwards compatibility)
    if (originalCardIndex === undefined || originalCardIndex === null) {
        const gameData = loadGameData();
        const existingZone = gameData.exclusionZones?.find(
            ez => ez.type === 'neighborhood'
        );
        if (existingZone) {
            originalCardIndex = existingZone.cardIndex;
        }
    }
    
    // Open neighborhood modal met speciale handler voor discarded cards
    const modal = document.getElementById('neighborhood-answer-modal');
    const neighborhoodSelect = document.getElementById('neighborhood-select');
    const answerSelect = document.getElementById('neighborhood-answer');
    const currentNeighborhoodDisplay = document.getElementById('current-neighborhood-display');
    const neighborhoodInfo = document.getElementById('neighborhood-info');
    const confirmBtn = document.getElementById('confirm-neighborhood-btn');
    
    // Haal huidige locatie op
    const gameData = loadGameData();
    const currentLocation = gameData.location;
    
    // Bepaal huidige wijk
    let currentNeighborhood = null;
    if (currentLocation) {
        currentNeighborhood = getNeighborhoodAtLocation(currentLocation.lat, currentLocation.lng);
    }
    
    if (currentNeighborhood) {
        currentNeighborhoodDisplay.textContent = currentNeighborhood.name;
    } else if (!currentLocation) {
        currentNeighborhoodDisplay.textContent = 'Geen locatie ingesteld - Selecteer hieronder';
    } else {
        currentNeighborhoodDisplay.textContent = 'Onbekend (niet in een wijk)';
    }
    
    // Vul de dropdown met alle wijken
    neighborhoodSelect.innerHTML = '<option value="">-- Kies een wijk --</option>';
    CITY_NEIGHBORHOODS.forEach((neighborhood, index) => {
        const option = document.createElement('option');
        option.value = neighborhood.name;
        option.textContent = neighborhood.name;
        
        if (currentNeighborhood && neighborhood.name === currentNeighborhood.name) {
            option.selected = true;
        } else if (!currentLocation && index === 0) {
            option.selected = true;
        }
        
        neighborhoodSelect.appendChild(option);
    });
    
    // Reset velden
    answerSelect.value = '';
    neighborhoodInfo.classList.add('hidden');
    
    // Sla discarded index op voor later gebruik
    modal.dataset.discardedIndex = discardedIndex;
    modal.dataset.editMode = 'true';
    delete modal.dataset.cardIndex;
    
    // Verwijder oude event listener en voeg nieuwe toe
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', () => {
        const selectedNeighborhood = neighborhoodSelect.value;
        const answer = answerSelect.value;
        
        if (!selectedNeighborhood || !answer) {
            alert('Selecteer zowel een wijk als een antwoord!');
            return;
        }
        
        // Vind buurwijken
        const adjacentNeighborhoods = getAdjacentNeighborhoods(selectedNeighborhood);
        const allowedNeighborhoods = [selectedNeighborhood, ...adjacentNeighborhoods];
        
        // Update exclusion zones
        const gameData = loadGameData();
        if (!gameData.exclusionZones) {
            gameData.exclusionZones = [];
        }
        
        // Verwijder ALLE oude neighborhood exclusions voor deze kaart (indien aanwezig)
        // Filter op type EN cardIndex om ervoor te zorgen dat alle neighborhood zones worden verwijderd
        gameData.exclusionZones = gameData.exclusionZones.filter(ez => 
            !(ez.type === 'neighborhood' && ez.cardIndex === originalCardIndex)
        );
        
        // Voeg nieuwe toe
        gameData.exclusionZones.push({
            type: 'neighborhood',
            answer: answer,
            selectedNeighborhood: selectedNeighborhood,
            allowedNeighborhoods: allowedNeighborhoods,
            cardIndex: originalCardIndex
        });
        
        saveGameData(gameData);
        
        // Update discarded answer
        saveDiscardedAnswer(discardedIndex, answer === 'yes' ? 'Ja' : 'Nee', card.task, originalCardIndex);
        
        // Update visualisatie
        updateExclusionZones();
        closeNeighborhoodModal();
        renderDiscardedView();
        
        // Reset modal state
        delete modal.dataset.discardedIndex;
        delete modal.dataset.editMode;
    });
    
    // Toon modal
    modal.classList.remove('hidden');
}

/**
 * Bewerk het antwoord van een opgeloste FurthestDistance kaart
 */
function editFurthestDistanceDiscardedAnswer(discardedIndex) {
    if (!cardManager) return;
    
    const card = cardManager.discarded[discardedIndex];
    if (!card) return;
    
    // Haal de originele cardIndex op
    const discardedData = getDiscardedAnswerData(discardedIndex);
    const originalCardIndex = discardedData?.originalCardIndex;
    
    // Toon modal met kaart en POI dropdown
    const modal = document.getElementById('edit-answer-modal');
    const taskEl = document.getElementById('edit-card-task');
    const questionEl = document.getElementById('edit-card-question');
    const buttonsContainer = document.getElementById('edit-answer-buttons');
    
    taskEl.textContent = card.task;
    questionEl.textContent = card.question;
    
    // Haal POIs op
    const poiType = card.poiType || 'colruyts';
    const pois = getPOIsByType(poiType);
    
    // Genereer dropdown + bevestig knop
    buttonsContainer.innerHTML = '';
    
    if (pois.length > 0) {
        const select = document.createElement('select');
        select.className = 'poi-select';
        select.id = `edit-poi-select-${discardedIndex}`;
        
        // Default optie
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `Selecteer ${poiType}...`;
        select.appendChild(defaultOption);
        
        // Voeg alle POIs toe
        pois.forEach(poi => {
            const option = document.createElement('option');
            option.value = poi.name;
            option.textContent = poi.name;
            
            // Selecteer de huidige waarde indien beschikbaar
            const currentAnswer = getDiscardedAnswer(discardedIndex);
            if (currentAnswer === poi.name) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        buttonsContainer.appendChild(select);
        
        // Bevestig knop
        const btn = document.createElement('button');
        btn.className = 'btn-answer';
        btn.textContent = 'Bevestig';
        btn.onclick = () => {
            const selectedPOI = select.value;
            if (!selectedPOI) {
                alert(`Selecteer eerst een ${poiType}`);
                return;
            }
            
            const selectedPOIData = pois.find(p => p.name === selectedPOI);
            if (!selectedPOIData) {
                console.error('POI niet gevonden:', selectedPOI);
                return;
            }
            
            // Laad gameData ÉÉN KEER
            const gameData = loadGameData();
            if (!gameData.exclusionZones) {
                gameData.exclusionZones = [];
            }
            
            // Verwijder oude furthestDistance exclusion voor deze kaart
            gameData.exclusionZones = gameData.exclusionZones.filter(ez => 
                !(ez.type === 'furthestDistance' && ez.cardIndex === originalCardIndex)
            );
            
            // Voeg nieuwe zone toe
            gameData.exclusionZones.push({
                type: 'furthestDistance',
                answer: selectedPOI,
                poiType: poiType,
                selectedPOI: selectedPOIData,
                cardIndex: originalCardIndex
            });
            
            // Update de opponent answer (in dezelfde gameData!)
            if (card.id) {
                const answerEntry = gameData.cardAnswers.find(a => a.cardId === card.id);
                if (answerEntry) {
                    answerEntry.opponentAnswer = selectedPOI;
                } else if (originalCardIndex !== null && originalCardIndex !== undefined) {
                    const answerEntry2 = gameData.cardAnswers.find(a => a.cardIndex === originalCardIndex);
                    if (answerEntry2) {
                        answerEntry2.opponentAnswer = selectedPOI;
                    }
                }
            }
            
            // Sla gameData ÉÉN KEER op
            saveGameData(gameData);
            
            // Update discarded answer
            saveDiscardedAnswer(discardedIndex, selectedPOI, card.task, originalCardIndex);
            
            // Update visualisatie
            updateExclusionZones();
            closeEditModal();
            renderDiscardedView();
            renderFlopView();
        };
        buttonsContainer.appendChild(btn);
    } else {
        buttonsContainer.innerHTML = '<p>Geen POIs beschikbaar</p>';
    }
    
    // Toon modal
    modal.classList.remove('hidden');
}

/**
 * Bewerk antwoord van een discarded eliminateNeighborhood kaart
 */
function editEliminateNeighborhoodDiscardedAnswer(discardedIndex) {
    if (!cardManager) return;
    
    const card = cardManager.discarded[discardedIndex];
    if (!card) return;
    
    // Haal de originele cardIndex op
    const discardedData = getDiscardedAnswerData(discardedIndex);
    const originalCardIndex = discardedData?.originalCardIndex;
    
    // Toon modal met kaart en wijk dropdown
    const modal = document.getElementById('edit-answer-modal');
    const taskEl = document.getElementById('edit-card-task');
    const questionEl = document.getElementById('edit-card-question');
    const buttonsContainer = document.getElementById('edit-answer-buttons');
    
    taskEl.textContent = card.task;
    questionEl.textContent = card.question;
    
    // Genereer dropdown + bevestig knop
    buttonsContainer.innerHTML = '';
    
    if (CITY_NEIGHBORHOODS && CITY_NEIGHBORHOODS.length > 0) {
        const select = document.createElement('select');
        select.className = 'poi-select';
        select.id = `edit-neighborhood-select-${discardedIndex}`;
        
        // Default optie
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecteer te elimineren wijk...';
        select.appendChild(defaultOption);
        
        // Voeg alle wijken toe
        CITY_NEIGHBORHOODS.forEach(neighborhood => {
            const option = document.createElement('option');
            option.value = neighborhood.name;
            option.textContent = neighborhood.name;
            
            // Selecteer de huidige waarde indien beschikbaar
            const currentAnswer = getDiscardedAnswer(discardedIndex);
            if (currentAnswer === neighborhood.name) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        buttonsContainer.appendChild(select);
        
        // Bevestig knop
        const btn = document.createElement('button');
        btn.className = 'btn-answer';
        btn.textContent = 'Elimineer Wijk';
        btn.onclick = () => {
            const selectedNeighborhood = select.value;
            if (!selectedNeighborhood) {
                alert('Selecteer eerst een wijk om te elimineren');
                return;
            }
            
            const neighborhoodData = CITY_NEIGHBORHOODS.find(n => n.name === selectedNeighborhood);
            if (!neighborhoodData) {
                console.error('Wijk niet gevonden:', selectedNeighborhood);
                return;
            }
            
            // Update exclusion zones
            const gameData = loadGameData();
            if (!gameData.exclusionZones) {
                gameData.exclusionZones = [];
            }
            
            // Verwijder oude eliminateNeighborhood exclusion voor deze kaart
            gameData.exclusionZones = gameData.exclusionZones.filter(ez => 
                !(ez.type === 'eliminateNeighborhood' && ez.cardIndex === originalCardIndex)
            );
            
            // Voeg nieuwe zone toe
            gameData.exclusionZones.push({
                type: 'eliminateNeighborhood',
                answer: selectedNeighborhood,
                neighborhoodData: neighborhoodData,
                cardIndex: originalCardIndex
            });
            
            // Sla gameData ÉÉN KEER op
            saveGameData(gameData);
            
            // Update discarded answer
            saveDiscardedAnswer(discardedIndex, selectedNeighborhood, card.task, originalCardIndex);
            
            // Update visualisatie
            updateExclusionZones();
            closeEditModal();
            renderDiscardedView();
            renderFlopView();
        };
        buttonsContainer.appendChild(btn);
    } else {
        buttonsContainer.innerHTML = '<p>Geen wijken beschikbaar</p>';
    }
    
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
 * Opent de neighborhood answer modal voor SameOrAdjacentNeighborhood vragen
 */
function openNeighborhoodModal(cardIndex) {
    const modal = document.getElementById('neighborhood-answer-modal');
    const neighborhoodSelect = document.getElementById('neighborhood-select');
    const currentNeighborhoodDisplay = document.getElementById('current-neighborhood-display');
    const neighborhoodInfo = document.getElementById('neighborhood-info');
    
    // Haal huidige locatie op
    const gameData = loadGameData();
    const currentLocation = gameData.location;
    
    // Bepaal huidige wijk (indien locatie beschikbaar)
    let currentNeighborhood = null;
    if (currentLocation) {
        currentNeighborhood = getNeighborhoodAtLocation(currentLocation.lat, currentLocation.lng);
    }
    
    if (currentNeighborhood) {
        currentNeighborhoodDisplay.textContent = currentNeighborhood.name;
    } else if (!currentLocation) {
        currentNeighborhoodDisplay.textContent = 'Geen locatie ingesteld - Selecteer hieronder';
    } else {
        currentNeighborhoodDisplay.textContent = 'Onbekend (niet in een wijk)';
    }
    
    // Vul de dropdown met alle wijken
    neighborhoodSelect.innerHTML = '<option value="">-- Kies een wijk --</option>';
    CITY_NEIGHBORHOODS.forEach((neighborhood, index) => {
        const option = document.createElement('option');
        option.value = neighborhood.name;
        option.textContent = neighborhood.name;
        
        // Selecteer huidige wijk, of eerste wijk als geen locatie
        if (currentNeighborhood && neighborhood.name === currentNeighborhood.name) {
            option.selected = true;
        } else if (!currentLocation && index === 0) {
            option.selected = true;
        }
        
        neighborhoodSelect.appendChild(option);
    });
    
    // Reset andere velden
    document.getElementById('neighborhood-answer').value = '';
    neighborhoodInfo.classList.add('hidden');
    
    // Sla card index op voor later gebruik
    modal.dataset.cardIndex = cardIndex;
    
    // Toon modal
    modal.classList.remove('hidden');
}

/**
 * Sluit de neighborhood modal
 */
function closeNeighborhoodModal() {
    const modal = document.getElementById('neighborhood-answer-modal');
    const confirmBtn = document.getElementById('confirm-neighborhood-btn');
    
    // Reset knop
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Bevestig antwoord';
    
    modal.classList.add('hidden');
}

/**
 * Opent de neighborhood modal met een vooraf ingevuld antwoord (Ja/Nee)
 * Wordt aangeroepen wanneer speler op "Ja" of "Nee" klikt
 */
function openNeighborhoodModalWithAnswer(cardIndex, answer) {
    const modal = document.getElementById('neighborhood-answer-modal');
    const neighborhoodSelect = document.getElementById('neighborhood-select');
    const answerSelect = document.getElementById('neighborhood-answer');
    const currentNeighborhoodDisplay = document.getElementById('current-neighborhood-display');
    const neighborhoodInfo = document.getElementById('neighborhood-info');
    
    // Haal huidige locatie op
    const gameData = loadGameData();
    const currentLocation = gameData.location;
    
    // Bepaal huidige wijk (indien locatie beschikbaar)
    let currentNeighborhood = null;
    if (currentLocation) {
        currentNeighborhood = getNeighborhoodAtLocation(currentLocation.lat, currentLocation.lng);
    }
    
    if (currentNeighborhood) {
        currentNeighborhoodDisplay.textContent = currentNeighborhood.name;
    } else if (!currentLocation) {
        currentNeighborhoodDisplay.textContent = 'Geen locatie ingesteld - Selecteer hieronder';
    } else {
        currentNeighborhoodDisplay.textContent = 'Onbekend (niet in een wijk)';
    }
    
    // Vul de dropdown met alle wijken
    neighborhoodSelect.innerHTML = '<option value="">-- Kies een wijk --</option>';
    CITY_NEIGHBORHOODS.forEach((neighborhood, index) => {
        const option = document.createElement('option');
        option.value = neighborhood.name;
        option.textContent = neighborhood.name;
        
        // Selecteer huidige wijk, of eerste wijk als geen locatie
        if (currentNeighborhood && neighborhood.name === currentNeighborhood.name) {
            option.selected = true;
        } else if (!currentLocation && index === 0) {
            option.selected = true;
        }
        
        neighborhoodSelect.appendChild(option);
    });
    
    // Zet het antwoord (Ja of Nee) vooraf in
    const answerValue = answer === 'Ja' ? 'yes' : 'no';
    answerSelect.value = answerValue;
    
    neighborhoodInfo.classList.add('hidden');
    
    // Sla card index op voor later gebruik
    modal.dataset.cardIndex = cardIndex;
    modal.dataset.prefilledAnswer = 'true';
    
    // Toon modal
    modal.classList.remove('hidden');
}

/**
 * Bevestig neighborhood antwoord en update exclusion zones
 */
function confirmNeighborhoodAnswer() {
    const modal = document.getElementById('neighborhood-answer-modal');
    const neighborhoodSelect = document.getElementById('neighborhood-select');
    const answerSelect = document.getElementById('neighborhood-answer');
    const neighborhoodInfo = document.getElementById('neighborhood-info');
    const confirmBtn = document.getElementById('confirm-neighborhood-btn');
    const cardIndex = parseInt(modal.dataset.cardIndex);
    
    const selectedNeighborhood = neighborhoodSelect.value;
    const answer = answerSelect.value;
    
    if (!selectedNeighborhood || !answer) {
        alert('Selecteer zowel een wijk als een antwoord!');
        return;
    }
    
    // Disable knop onmiddellijk om dubbele clicks te voorkomen
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Verwerken...';
    
    // Vind buurwijken
    const adjacentNeighborhoods = getAdjacentNeighborhoods(selectedNeighborhood);
    const allowedNeighborhoods = [selectedNeighborhood, ...adjacentNeighborhoods];
    
    // Toon info
    neighborhoodInfo.classList.remove('hidden');
    neighborhoodInfo.innerHTML = `
        <strong>Geselecteerde wijk:</strong> ${selectedNeighborhood}<br>
        <strong>Buurwijken:</strong> ${adjacentNeighborhoods.join(', ') || 'Geen'}<br>
        <strong>Antwoord:</strong> ${answer === 'yes' ? 'In een van die wijken' : 'Niet in die wijken'}
    `;
    
    // Sla antwoord op
    const gameData = loadGameData();
    if (!gameData.exclusionZones) {
        gameData.exclusionZones = [];
    }
    
    gameData.exclusionZones.push({
        type: 'neighborhood',
        answer: answer,
        selectedNeighborhood: selectedNeighborhood,
        allowedNeighborhoods: allowedNeighborhoods,
        cardIndex: cardIndex
    });
    
    saveGameData(gameData);
    
    // Discard de kaart
    if (cardManager) {
        const currentDiscardedCount = cardManager.discarded.length;
        const card = cardManager.getCard(cardIndex);
        
        cardManager.discardCard(cardIndex);
        
        // Sla discarded answer op met originalCardIndex
        const answerText = answer === 'yes' ? 'Ja' : 'Nee';
        saveDiscardedAnswer(currentDiscardedCount, answerText, card?.task, cardIndex);
        
        const updatedGameData = loadGameData();
        updatedGameData.discardedCards = cardManager.discardedCards;
        saveGameData(updatedGameData);
    }
    
    // Update visualisatie
    updateExclusionZones();
    updateCardDisplay();
    
    // Sluit modal na 2 seconden
    setTimeout(() => {
        closeNeighborhoodModal();
    }, 2000);
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
    } else if (question.includes('spoorlijn Oostende-Antwerpen')) {
        return ['Binnen 800m van spoorlijn', 'Buiten 800m van spoorlijn'];
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
        const answer = card && card.id ? getOpponentAnswer(card.id) : null;
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
        const answer = card && card.id ? getOpponentAnswer(card.id) : null;
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

/**
 * Haal huidige GPS locatie op en toon voor delen
 */
async function handleShareLocation() {
    shareLocationBtn.disabled = true;
    shareLocationBtn.textContent = '📍 Locatie ophalen...';
    
    try {
        // Haal LIVE GPS positie op (niet de opgeslagen fiets locatie!)
        const location = await getCurrentLocation();
        
        // Format coördinaten: lat, lng met 4 decimalen
        const coordsText = `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
        
        shareCoordsText.textContent = coordsText;
        currentLocationDisplay.classList.remove('hidden');
        
        shareLocationBtn.textContent = '✅ Locatie opgehaald';
        
        // Reset knop na 3 seconden
        setTimeout(() => {
            shareLocationBtn.textContent = '📍 Deel Mijn Locatie';
            shareLocationBtn.disabled = false;
        }, 3000);
        
    } catch (error) {
        alert('Fout bij ophalen locatie: ' + error.message);
        shareLocationBtn.textContent = '📍 Deel Mijn Locatie';
        shareLocationBtn.disabled = false;
    }
}

/**
 * Bereken afstand van ingevoerde coördinaten tot de fiets
 */
function handleCalculateDistance() {
    const coordsInput = opponentCoordsInput.value.trim();
    
    if (!coordsInput) {
        alert('Voer eerst coördinaten in');
        return;
    }
    
    // Parse coördinaten (formaat: "lat, lng" of "lat,lng")
    const parts = coordsInput.split(',').map(p => p.trim());
    if (parts.length !== 2) {
        alert('Ongeldig formaat. Gebruik: 51.0543, 3.7234');
        return;
    }
    
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    
    if (isNaN(lat) || isNaN(lng)) {
        alert('Ongeldige coördinaten. Controleer het formaat.');
        return;
    }
    
    // Haal fiets locatie op (bevestigde locatie)
    const gameData = loadGameData();
    if (!gameData.location) {
        alert('Geen fiets locatie ingesteld. Bevestig eerst je locatie!');
        return;
    }
    
    const bikeLat = gameData.location.lat;
    const bikeLng = gameData.location.lng;
    
    // Bereken afstand
    const distance = calculateDistance(lat, lng, bikeLat, bikeLng);
    const distanceRounded = Math.round(distance);
    
    // Toon resultaat
    distanceResult.innerHTML = `
        <strong>📏 Afstand: ${distanceRounded}m</strong>
        <p>Van ingevoerde locatie tot de fiets</p>
        <p style="font-size: 0.85rem; margin-top: 8px;">
            <strong>Tegenstander:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}<br>
            <strong>Fiets:</strong> ${bikeLat.toFixed(4)}, ${bikeLng.toFixed(4)}
        </p>
    `;
    
    // Voeg kleur toe op basis van afstand
    if (distanceRounded > 1000) {
        distanceResult.classList.add('far');
    } else {
        distanceResult.classList.remove('far');
    }
    
    distanceResult.classList.remove('hidden');
}

/**
 * Teken een preview cirkel op de kaart op basis van ingevoerde coördinaten (seeker locatie)
 */
function previewDistanceCircle(cardIndex) {
    const card = cardManager.getCard(cardIndex);
    if (!card || !card.radius) return;
    
    const input = document.getElementById('opponent-location-input');
    const coordsInput = input.value.trim();
    
    if (!coordsInput) {
        alert('Voer eerst coördinaten in!');
        return;
    }
    
    // Parse coördinaten (formaat: "lat, lng" of "lat,lng")
    const parts = coordsInput.split(',').map(p => p.trim());
    if (parts.length !== 2) {
        alert('Ongeldig formaat. Gebruik: 51.0543, 3.7234');
        return;
    }
    
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    
    if (isNaN(lat) || isNaN(lng)) {
        alert('Ongeldige coördinaten. Controleer het formaat.');
        return;
    }
    
    // Verwijder oude cirkel indien aanwezig
    if (distanceCircle) {
        map.removeLayer(distanceCircle);
    }
    
    // Teken nieuwe cirkel
    distanceCircle = L.circle([lat, lng], {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        radius: card.radius,
        weight: 2
    }).addTo(map);
    
    // Voeg popup toe
    distanceCircle.bindPopup(`� Preview: Seeker locatie<br>Radius: ${card.radius}m<br><small>Dit is alleen een preview. Klik Ja/Nee om exclusion zone te maken.</small>`);
    
    // Zoom naar de cirkel
    map.fitBounds(distanceCircle.getBounds(), { padding: [50, 50] });
    
    // Verwijder oude opponent marker indien aanwezig
    if (opponentMarker) {
        map.removeLayer(opponentMarker);
    }
    
    // Voeg marker toe op de exacte locatie
    opponentMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'opponent-marker',
            html: '<div style="background: #3b82f6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white;">🔍</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map).bindPopup('Seeker locatie (preview)').openPopup();
}

// Maak functies globaal beschikbaar voor onclick handlers
window.viewCardDetail = viewCardDetail;
window.discardCardFromFlop = discardCardFromFlop;
window.previewDistanceCircle = previewDistanceCircle;
