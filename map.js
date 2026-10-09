// Kaartmodule voor Gent Location Game: Leaflet-kaart, uitgesloten zones,
// context per kaart, eigen fiets en live locatie

let map = null;
let gameZoneCircle = null;
let inverseMask = null;
let r40Polygon = null;
let leieScheldeLine = null;
let railwayLine = null;
let railwayBuffer = null;
let dampoortLine = null;
let watersportbaanLine = null;
let poiMarkers = {};             // vaste POI-markers (Dampoort, Weba, ...), enkel zichtbaar als context
let contextLayers = [];          // lagen die de geopende kaart uitleggen
let neighborhoodLayers = [];
let exclusionLayers = [];
let mergedExclusion = null;      // polygon-clipping MultiPolygon van alle uitgesloten zones (voor het %)
let bikeMarker = null;           // eigen fiets
let pinMarker = null;            // nagekeken coördinaten
let liveMarker = null;
let liveAccuracyCircle = null;
let liveWatchId = null;
let liveTrackingEnabled = false;
let currentLiveLat = null;
let currentLiveLng = null;

// De UI luistert hiernaar om de status op de kaart bij te werken
function onMapStateChanged() {
    if (typeof UI !== 'undefined') UI.refreshMapStatus();
}

const MARKER_ICON = (color) => L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

/**
 * Initialiseert de Leaflet kaart met speelveld
 */
function initializeMap() {
    map = L.map('map', { zoomControl: false }).setView([LOCATIONS.center.lat, LOCATIONS.center.lng], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Custom pane voor exclusion zones met lage z-index
    map.createPane('exclusionPane');
    map.getPane('exclusionPane').style.zIndex = 350; // Onder overlayPane (400)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Markeer de WEC (centrum)
    L.marker([LOCATIONS.center.lat, LOCATIONS.center.lng], { icon: MARKER_ICON('red') })
        .addTo(map).bindPopup('<b>WEC</b><br>Centrum van het speelveld');

    // Speelveldgrootte in teksten, afgeleid van GAME_RADIUS (bv. 3500 → "3,5")
    const gameRadiusKm = (GAME_RADIUS / 1000).toLocaleString('nl-BE');
    document.querySelectorAll('.game-radius-km').forEach(el => { el.textContent = gameRadiusKm; });

    // Speelveldgrens
    gameZoneCircle = L.circle([LOCATIONS.center.lat, LOCATIONS.center.lng], {
        color: '#111417',
        fillColor: 'transparent',
        fillOpacity: 0,
        radius: GAME_RADIUS,
        weight: 2,
        interactive: false
    }).addTo(map);

    // Inverse mask: alles buiten het speelveld wordt grijs
    const outerRing = [[52, 2], [52, 5], [50, 5], [50, 2]];
    const circlePoints = getCirclePoints(LOCATIONS.center.lat, LOCATIONS.center.lng, GAME_RADIUS, 360 / 64);
    inverseMask = L.polygon([outerRing, circlePoints], {
        color: 'transparent',
        fillColor: '#000000',
        fillOpacity: 0.35,
        weight: 0,
        interactive: false,
        pane: 'overlayPane'
    }).addTo(map);

    // R40 ring en Leie-Schelde lijn (altijd zichtbaar, rustig)
    r40Polygon = L.polygon(R40_POLYGON.map(p => [p.lat, p.lng]), {
        color: '#C48A00', fill: false, weight: 2, opacity: 0.8, interactive: false
    }).addTo(map);
    if (LEIE_SCHELDE_LINE.length > 0) {
        leieScheldeLine = L.polyline(LEIE_SCHELDE_LINE.map(p => [p.lat, p.lng]), {
            color: '#2A6FAE', weight: 3, opacity: 0.7, interactive: false
        }).addTo(map);
    }

    // Spoorlijn + buffer: enkel als context
    if (RAILWAY_LINE.length > 0) {
        railwayLine = L.polyline(RAILWAY_LINE.map(p => [p.lat, p.lng]), {
            color: '#111417', weight: 4, opacity: 0.85, interactive: false
        });
    }
    if (RAILWAY_BUFFER.length > 0) {
        railwayBuffer = L.polygon(RAILWAY_BUFFER.map(p => [p.lat, p.lng]), {
            color: '#2A6FAE', fillColor: '#2A6FAE', fillOpacity: 0.15, weight: 1, interactive: false
        });
    }

    // Vaste POI's (enkel zichtbaar als context bij een kaart)
    poiMarkers.dampoort = L.marker([LOCATIONS.dampoort.lat, LOCATIONS.dampoort.lng], { icon: MARKER_ICON('blue') }).bindTooltip('Station Dampoort', { permanent: true, direction: 'top', offset: [0, -36] });
    poiMarkers.watersportbaan = L.marker([LOCATIONS.watersportbaan_tip.lat, LOCATIONS.watersportbaan_tip.lng], { icon: MARKER_ICON('blue') }).bindTooltip('Tip watersportbaan', { permanent: true, direction: 'top', offset: [0, -36] });
    poiMarkers.weba = L.marker([LOCATIONS.weba.lat, LOCATIONS.weba.lng], { icon: MARKER_ICON('blue') }).bindTooltip('Weba', { permanent: true, direction: 'top', offset: [0, -36] });
    poiMarkers.ikea = L.marker([LOCATIONS.ikea.lat, LOCATIONS.ikea.lng], { icon: MARKER_ICON('blue') }).bindTooltip('IKEA', { permanent: true, direction: 'top', offset: [0, -36] });

    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
}

/**
 * Zoom zodat het speelveld past in het zichtbare deel (boven een eventueel onderblad)
 */
function fitToField(bottomPadding = 0) {
    if (!map || !gameZoneCircle) return;
    map.invalidateSize();
    map.fitBounds(gameZoneCircle.getBounds(), { paddingTopLeft: [12, 12], paddingBottomRight: [12, 12 + bottomPadding], animate: false });
}

/**
 * Centreer op een punt in het zichtbare deel (boven een eventueel onderblad)
 */
function centerOn(latlng, zoom, bottomPadding = 0) {
    map.invalidateSize();
    map.setView(latlng, zoom, { animate: false });
    map.panBy([0, bottomPadding / 2], { animate: false });
}

/* ===== Eigen fiets en pin ===== */

/**
 * Toon de eigen fiets (of verberg ze); draggable tijdens het instellen van de locatie
 */
function setBikeMarker(location, { visible, draggable = false, onDrag = null } = {}) {
    if (bikeMarker) { map.removeLayer(bikeMarker); bikeMarker = null; }
    if (!location || !visible) return null;
    bikeMarker = L.marker([location.lat, location.lng], { icon: MARKER_ICON('green'), draggable }).addTo(map);
    if (onDrag) bikeMarker.on('dragend', () => onDrag(bikeMarker.getLatLng()));
    return bikeMarker;
}

/**
 * Zet (of wis) een pin op nagekeken coördinaten
 */
function setPinMarker(location) {
    if (pinMarker) { map.removeLayer(pinMarker); pinMarker = null; }
    if (!location) return;
    pinMarker = L.marker([location.lat, location.lng], { icon: MARKER_ICON('black') }).addTo(map);
}

/* ===== Context per kaart ===== */

function sideLabel(lat, lng, text) {
    return L.marker([lat, lng], {
        interactive: false,
        icon: L.divIcon({ className: 'map-side-label', html: `<span>${text}</span>`, iconSize: [120, 30], iconAnchor: [60, 15] })
    });
}

/**
 * Verwijder de context van de vorige kaart
 */
function clearCardContext() {
    contextLayers.forEach(layer => map.removeLayer(layer));
    contextLayers = [];
    hideNeighborhoods();
}

/**
 * Toon op de kaart waar een vraag over gaat
 * @param {Object} card - de kaart (of de gekopieerde kaart)
 * @param {Object} extra - { wijk, three, position } voor wijk- en afstandsvragen
 */
function showCardContext(card, extra = {}) {
    clearCardContext();
    if (!card || !map) return;
    const add = (layer) => { layer.addTo(map); contextLayers.push(layer); return layer; };
    const c = LOCATIONS.center;
    const lngOffset = 0.025;

    switch (card.answerType) {
        case 'r40':
            add(L.polygon(R40_POLYGON.map(p => [p.lat, p.lng]), { color: '#111417', weight: 5, fill: false, interactive: false }));
            add(sideLabel(c.lat + 0.004, c.lng, 'binnen'));
            add(sideLabel(c.lat + 0.026, c.lng, 'buiten'));
            break;
        case 'leie-schelde':
            add(L.polyline(LEIE_SCHELDE_LINE.map(p => [p.lat, p.lng]), { color: '#2A6FAE', weight: 7, interactive: false }));
            add(sideLabel(c.lat + 0.02, c.lng - 0.02, 'noorden'));
            add(sideLabel(c.lat - 0.02, c.lng + 0.02, 'zuiden'));
            break;
        case 'dampoort':
        case 'watersportbaan': {
            const loc = card.answerType === 'dampoort' ? LOCATIONS.dampoort : LOCATIONS.watersportbaan_tip;
            add(L.polyline([[51.12, loc.lng], [50.98, loc.lng]], { color: '#111417', weight: 4, dashArray: '12, 8', interactive: false }));
            add(poiMarkers[card.answerType]);
            add(sideLabel(c.lat, loc.lng - lngOffset, 'westen'));
            add(sideLabel(c.lat, loc.lng + lngOffset, 'oosten'));
            break;
        }
        case 'proximity': {
            const w = LOCATIONS.weba, i = LOCATIONS.ikea;
            add(poiMarkers.weba); add(poiMarkers.ikea);
            // Middelloodlijn tussen Weba en IKEA: punten die even ver van beide liggen
            const mid = [(w.lat + i.lat) / 2, (w.lng + i.lng) / 2];
            const dx = (i.lng - w.lng) * Math.cos(c.lat * Math.PI / 180), dy = i.lat - w.lat;
            const len = 0.06;
            const perp = [dx / Math.hypot(dx, dy) * len, -dy / Math.hypot(dx, dy) * len / Math.cos(c.lat * Math.PI / 180)];
            add(L.polyline([[mid[0] - perp[0], mid[1] - perp[1]], [mid[0] + perp[0], mid[1] + perp[1]]], { color: '#111417', weight: 4, dashArray: '12, 8', interactive: false }));
            break;
        }
        case 'bufferLine':
            if (railwayBuffer) add(railwayBuffer);
            if (railwayLine) add(railwayLine);
            break;
        case 'radiusProximity':
        case 'FurthestDistance':
            getPOIsByType(card.poiType).forEach(poi => {
                add(L.circleMarker([poi.lat, poi.lng], { radius: 6, color: '#ffffff', weight: 2, fillColor: '#111417', fillOpacity: 1 })
                    .bindTooltip(poi.name, { permanent: card.answerType === 'FurthestDistance', direction: 'top' }));
                if (card.answerType === 'radiusProximity' && card.radius) {
                    add(L.circle([poi.lat, poi.lng], { radius: card.radius, color: '#111417', weight: 2, fill: false, dashArray: '8, 6', interactive: false }));
                }
            });
            break;
        case 'distanceFromBike': {
            const pos = extra.position || (currentLiveLat ? { lat: currentLiveLat, lng: currentLiveLng } : null);
            if (pos && card.radius) {
                add(L.circle([pos.lat, pos.lng], { radius: card.radius, color: '#2A6FAE', weight: 3, fillColor: '#2A6FAE', fillOpacity: 0.08, dashArray: '10, 6', interactive: false }));
            }
            break;
        }
        case 'SameOrAdjacentNeighborhood': {
            const wijk = extra.wijk;
            drawNeighborhoods({ main: wijk ? [wijk] : [], adjacent: wijk ? getAdjacentNeighborhoods(wijk) : [] });
            break;
        }
        case 'eliminateNeighborhood':
            drawNeighborhoods({ main: extra.three || [], adjacent: [] });
            break;
    }
}

/**
 * Tekent alle stadswijken; de gekozen wijken (main) en buurwijken (adjacent) vallen op
 */
function drawNeighborhoods({ main = [], adjacent = [] } = {}) {
    hideNeighborhoods();
    CITY_NEIGHBORHOODS.forEach(neighborhood => {
        const isMain = main.includes(neighborhood.name);
        const isAdjacent = adjacent.includes(neighborhood.name);
        const polygon = L.polygon(neighborhood.polygon.map(p => [p.lat, p.lng]), {
            color: '#111417',
            weight: isMain ? 4 : 1.5,
            opacity: isMain || isAdjacent ? 0.9 : 0.5,
            fillColor: isMain ? '#111417' : '#2A6FAE',
            fillOpacity: isMain ? 0.25 : isAdjacent ? 0.15 : 0,
            interactive: false
        }).addTo(map);
        neighborhoodLayers.push(polygon);
        if (isMain || isAdjacent || main.length === 0) {
            const label = L.marker(polygon.getBounds().getCenter(), {
                interactive: false,
                icon: L.divIcon({ className: 'neighborhood-label', html: `<div class="neighborhood-label-text">${neighborhood.name.split(' - ')[0]}</div>`, iconSize: [120, 20] })
            }).addTo(map);
            neighborhoodLayers.push(label);
        }
    });
}

function hideNeighborhoods() {
    neighborhoodLayers.forEach(layer => map.removeLayer(layer));
    neighborhoodLayers = [];
}

/* ===== Uitgesloten gebied ===== */

/**
 * Teken alle uitsluitingen als één rode vlak binnen het speelveld
 */
function updateExclusionZones() {
    exclusionLayers.forEach(layer => map.removeLayer(layer));
    exclusionLayers = [];
    mergedExclusion = null;

    const gameData = loadGameData();
    const zoneLayers = [];
    (gameData.cardAnswers || []).forEach(answerData => {
        const layer = createExclusionLayer(answerData.opponentAnswer);
        if (layer) zoneLayers.push(layer);
    });
    (gameData.exclusionZones || []).forEach(exclusionData => {
        const layer = createExclusionLayerFromData(exclusionData);
        if (layer) zoneLayers.push(layer);
    });

    // Lukt samenvoegen niet, dan worden de zones apart getekend zodat er nooit een zone ontbreekt
    const mergedLayer = mergeExclusionLayers(zoneLayers);
    (mergedLayer ? [mergedLayer] : zoneLayers).forEach(layer => {
        layer.addTo(map);
        exclusionLayers.push(layer);
    });

    if (inverseMask) inverseMask.bringToFront();
    onMapStateChanged();
}

/**
 * Oppervlakte (m²) van een polygon-clipping MultiPolygon in [lat, lng]
 */
function multiPolygonArea(multi) {
    const lat0 = LOCATIONS.center.lat * Math.PI / 180;
    const ringArea = (ring) => {
        let sum = 0;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][1] * 111320 * Math.cos(lat0), yi = ring[i][0] * 111320;
            const xj = ring[j][1] * 111320 * Math.cos(lat0), yj = ring[j][0] * 111320;
            sum += xj * yi - xi * yj;
        }
        return Math.abs(sum) / 2;
    };
    return (multi || []).reduce((total, polygon) =>
        total + ringArea(polygon[0]) - polygon.slice(1).reduce((h, ring) => h + ringArea(ring), 0), 0);
}

/**
 * Welk deel (%) van het speelveld is nog niet uitgesloten
 */
function remainingFieldPercent() {
    const fieldArea = Math.PI * GAME_RADIUS * GAME_RADIUS;
    const excluded = mergedExclusion ? multiPolygonArea(mergedExclusion) : 0;
    return Math.max(0, Math.min(100, Math.round(100 * (1 - excluded / fieldArea))));
}

/* ===== Live locatie ===== */

function stopLiveLocation() {
    if (liveWatchId !== null) {
        navigator.geolocation.clearWatch(liveWatchId);
        liveWatchId = null;
    }
    liveTrackingEnabled = false;
    if (liveMarker) { map.removeLayer(liveMarker); liveMarker = null; }
    if (liveAccuracyCircle) { map.removeLayer(liveAccuracyCircle); liveAccuracyCircle = null; }
    onMapStateChanged();
}

// Stijl van de samengevoegde uitgesloten zone
const EXCLUSION_AREA_STYLE = {
    color: '#ef4444',
    fillColor: '#ef4444',
    fillOpacity: 0.35,
    weight: 2,
    dashArray: '5, 5',
    interactive: false,
    pane: 'exclusionPane'
};

/**
 * Zet een exclusion layer om naar polygonen voor polygon-clipping
 * (per polygoon een lijst ringen van [lat, lng]; de eerste ring is de buitenrand)
 * @returns {Array|null} null als de laag een onbekend type heeft
 */
function layerToPolygons(layer) {
    if (layer instanceof L.LayerGroup) {
        const parts = layer.getLayers().map(layerToPolygons);
        return parts.includes(null) ? null : parts.flat();
    }
    if (layer instanceof L.Circle) {
        const center = layer.getLatLng();
        return [[getCirclePoints(center.lat, center.lng, layer.getRadius())]];
    }
    if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs();
        const polygons = Array.isArray(latlngs[0][0]) ? latlngs : [latlngs];
        return polygons.map(rings => rings.map(ring => ring.map(point => [point.lat, point.lng])));
    }
    return null;
}

/**
 * Voeg alle exclusion layers samen tot één laag, afgeknipt aan het speelveld
 * (overlappende zones worden zo niet dubbel rood en niets steekt buiten het speelveld)
 * @returns {L.Layer|null} null als samenvoegen niet lukt
 */
function mergeExclusionLayers(layers) {
    if (layers.length === 0) return null;

    try {
        const parts = layers.map(layerToPolygons);
        if (parts.includes(null)) return null;

        const polygons = parts.flat().filter(rings => rings.length > 0 && rings[0].length >= 3);
        if (polygons.length === 0) return null;

        const center = LOCATIONS.center;
        const gameArea = [getCirclePoints(center.lat, center.lng, GAME_RADIUS, 1)];
        const excluded = polygonClipping.intersection(gameArea, polygonClipping.union(...polygons));
        mergedExclusion = excluded;

        return excluded.length > 0 ? L.polygon(excluded, EXCLUSION_AREA_STYLE) : L.featureGroup([]);
    } catch (error) {
        console.warn('Samenvoegen van uitgesloten zones mislukt, zones worden apart getekend:', error);
        return null;
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
        
        if (pois.length === 0) {
            console.warn(`No POIs found for type: ${poiType}`);
            return null;
        }
        
        // Speelveld en cirkels als polygonen, voor polygon-clipping.
        // Alles wordt afgeknipt aan het speelveld (LOCATIONS.center + GAME_RADIUS).
        const center = LOCATIONS.center;
        // Speelveldrand met 1° stappen: blijft ook bij een groot speelveld nauwkeurig
        const gameArea = [getCirclePoints(center.lat, center.lng, GAME_RADIUS, 1)];
        const circles = pois.map(poi => [getCirclePoints(poi.lat, poi.lng, radius)]);

        if (answer === 'no') {
            // "Nee" = er is GEEN POI binnen radius
            // Rood = unie van alle cirkels BINNEN het speelveld,
            // zodat overlappende cirkels niet dubbel rood worden.
            const excluded = polygonClipping.intersection(gameArea, polygonClipping.union(...circles));

            if (excluded.length === 0) {
                return null;
            }
            return L.polygon(excluded, exclusionStyle)
                .bindPopup(`❌ Uitgesloten: Binnen ${radius / 1000}km van een ${poiType}`);
        } else {
            // "Ja" = er IS een POI binnen radius
            // Rood = speelveld MIN de unie van alle cirkels,
            // zodat overlappende cirkels NIET rood worden en de randen echte rondes zijn.
            const excluded = polygonClipping.difference(gameArea, ...circles);

            if (excluded.length === 0) {
                return null;
            }
            return L.polygon(excluded, exclusionStyle)
                .bindPopup(`❌ Uitgesloten: Buiten ${radius / 1000}km van alle ${poiType}`);
        }
    }
    
    // FurthestDistance exclusions
    // Vraag: "Welke locatie is zeker NIET de dichtste bij de fiets?"
    // Logica: sluit de exacte Voronoi-cel van de geselecteerde POI uit
    // (= de zone waar die POI het dichtst is). Berekend via Sutherland-Hodgman.
    if (exclusionData.type === 'furthestDistance') {
        const { poiType, selectedPOI } = exclusionData;
        const pois = getPOIsByType(poiType);
        if (pois.length === 0) return null;

        const center = LOCATIONS.center;
        const gameRadius = GAME_RADIUS;
        const cosLat = Math.cos(center.lat * Math.PI / 180);

        const toXY = (lat, lng) => ({
            x: (lng - center.lng) * 111320 * cosLat,
            y: (lat - center.lat) * 111320
        });
        const fromXY = (xy) => [
            center.lat + xy.y / 111320,
            center.lng + xy.x / (111320 * cosLat)
        ];

        // Start met spelcirkel als polygoon (64 punten)
        const N = 64;
        let voronoiCell = [];
        for (let i = 0; i < N; i++) {
            const angle = (2 * Math.PI * i) / N;
            voronoiCell.push({ x: gameRadius * Math.cos(angle), y: gameRadius * Math.sin(angle) });
        }

        const sel = toXY(selectedPOI.lat, selectedPOI.lng);

        // Knip de polygoon: behoud alleen de helft dichter bij selectedPOI dan bij elke andere POI
        for (const otherPOI of pois) {
            if (otherPOI.name === selectedPOI.name) continue;
            const oth = toXY(otherPOI.lat, otherPOI.lng);

            // Dichter bij sel dan bij oth: (oth-sel)·P < (|oth|²-|sel|²)/2
            const A = oth.x - sel.x;
            const B = oth.y - sel.y;
            const C = (oth.x * oth.x + oth.y * oth.y - sel.x * sel.x - sel.y * sel.y) / 2;

            const inside = (p) => A * p.x + B * p.y < C;
            const intersect = (p1, p2) => {
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const denom = A * dx + B * dy;
                if (Math.abs(denom) < 1e-10) return null;
                const t = (C - A * p1.x - B * p1.y) / denom;
                return { x: p1.x + t * dx, y: p1.y + t * dy };
            };

            const clipped = [];
            for (let i = 0; i < voronoiCell.length; i++) {
                const curr = voronoiCell[i];
                const next = voronoiCell[(i + 1) % voronoiCell.length];
                const cIn = inside(curr), nIn = inside(next);
                if (cIn) clipped.push(curr);
                if (cIn !== nIn) { const pt = intersect(curr, next); if (pt) clipped.push(pt); }
            }
            voronoiCell = clipped;
            if (voronoiCell.length === 0) break;
        }

        if (voronoiCell.length < 3) return null;

        // Teken de Voronoi-cel direct als exclusion zone (geen raster, exacte polygoon)
        return L.polygon([voronoiCell.map(p => fromXY(p))], exclusionStyle);
    }
    
    // Distance From Bike exclusions
    if (exclusionData.type === 'distanceFromBike') {
        const { answer, seekerLocation, radius } = exclusionData;
        
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
            
            // Bereken cirkel punten (64 punten)
            const circlePoints = getCirclePoints(seekerLocation.lat, seekerLocation.lng, radius, 360 / 64);
            
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
 * Ligt een punt in het uitgesloten gebied? (gebruikt de samengevoegde zone, dus alle vraagtypes)
 */
function isPointExcluded(lat, lng) {
    if (!mergedExclusion || lat == null || lng == null) return false;
    let inside = false;
    for (const polygon of mergedExclusion) {
        for (const ring of polygon) {
            for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
                const [ya, xa] = ring[a], [yb, xb] = ring[b];
                if (((ya > lat) !== (yb > lat)) && (lng < (xb - xa) * (lat - ya) / (yb - ya) + xa)) inside = !inside;
            }
        }
    }
    return inside;
}

/**
 * Start live locatie tracking met blauw bolletje
 */
function startLiveLocation() {
    if (!navigator.geolocation) return;
    if (liveWatchId !== null) return; // Al bezig

    liveTrackingEnabled = true;

    liveWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude: lat, longitude: lng, accuracy } = position.coords;

            // Sla huidige positie op voor zone-check
            currentLiveLat = lat;
            currentLiveLng = lng;
            onMapStateChanged();

            if (liveMarker) {
                liveMarker.setLatLng([lat, lng]);
            } else {
                liveMarker = L.circleMarker([lat, lng], {
                    radius: 8,
                    color: '#ffffff',
                    weight: 2,
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                    className: 'live-location-dot'
                }).addTo(map);
            }

            if (liveAccuracyCircle) {
                liveAccuracyCircle.setLatLng([lat, lng]);
                liveAccuracyCircle.setRadius(accuracy);
            } else {
                liveAccuracyCircle = L.circle([lat, lng], {
                    radius: accuracy,
                    color: '#2563eb',
                    fillColor: '#93c5fd',
                    fillOpacity: 0.15,
                    weight: 1
                }).addTo(map);
            }
        },
        (error) => {
            console.warn('Live locatie fout:', error);
        },
        {
            enableHighAccuracy: false,
            maximumAge: 10000,
            timeout: 15000
        }
    );
}
