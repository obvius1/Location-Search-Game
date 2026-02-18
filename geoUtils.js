// Geografische utilities voor Gent Location Game

// Constanten voor Gent
const GAME_RADIUS = 3500; // 3km in meters

// Belangrijke locaties in Gent - wordt geladen vanuit geo-data.json
let LOCATIONS = {};

// R40 binnenring - wordt geladen vanuit zones.json
let R40_POLYGON = [];
// Leie-Schelde lijn - wordt geladen vanuit zones.json
let LEIE_SCHELDE_LINE = [];
// Spoorlijn Oostende-Antwerpen - wordt geladen vanuit Oostende-Antwerpen-Spoorlijn.geojson
let RAILWAY_LINE = [];
// Spoorlijn buffer zone (1.5km) - wordt geladen vanuit Oostende-Antwerpen-Spoorlijn-Buffer.geojson
let RAILWAY_BUFFER = [];
// Stadswijken - wordt geladen vanuit stadswijken-gent.geojson
let CITY_NEIGHBORHOODS = [];
// POI Collections (bijv. bibliotheken) - wordt geladen vanuit geo-data.json
let POI_COLLECTIONS = {};

/**
 * Laadt alle geografische data vanuit geo-data.json
 */
async function loadZones() {
    try {
        const response = await fetch('./data/geo-data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Laad locations
        if (data.locations) {
            LOCATIONS = data.locations;
            console.log(`Locations geladen: ${Object.keys(LOCATIONS).length} POIs`);
        }
        
        // Converteer GeoJSON coordinaten naar ons formaat
        // GeoJSON gebruikt [lng, lat], wij gebruiken {lat, lng}
        
        // Laad R40 Polygon
        const r40Feature = data.features.find(f => f.properties.name === 'R40 Binnenring Gent');
        if (r40Feature && r40Feature.geometry.coordinates[0]) {
            R40_POLYGON = r40Feature.geometry.coordinates[0].map(coord => ({
                lng: coord[0],
                lat: coord[1]
            }));
            console.log(`R40 polygon geladen: ${R40_POLYGON.length} punten`);
        }
        
        // Laad Leie-Schelde LineString
        const leieScheldeFeature = data.features.find(f => f.properties.name === 'Leie-Scheldelijn');
        if (leieScheldeFeature && leieScheldeFeature.geometry.coordinates) {
            LEIE_SCHELDE_LINE = leieScheldeFeature.geometry.coordinates.map(coord => ({
                lng: coord[0],
                lat: coord[1]
            }));
            console.log(`Leie-Schelde lijn geladen: ${LEIE_SCHELDE_LINE.length} punten`);
        }
        
        // Laad POI Collections (bijv. libraries)
        if (data.poi_collections) {
            POI_COLLECTIONS = data.poi_collections;
            console.log(`POI Collections geladen:`, Object.keys(POI_COLLECTIONS));
        }
        
        return data;
    } catch (error) {
        console.error('Fout bij laden geografische data:', error);
        LOCATIONS = {};
        R40_POLYGON = [];
        LEIE_SCHELDE_LINE = [];
        throw error;
    }
}

/**
 * Laadt de spoorlijn Oostende-Antwerpen data
 */
async function loadRailwayData() {
    try {
        // Laad de spoorlijn (lijn)
        const lineResponse = await fetch('./data/Oostende-Antwerpen-Spoorlijn.geojson');
        if (lineResponse.ok) {
            const lineData = await lineResponse.json();
            const lineFeature = lineData.features[0];
            if (lineFeature && lineFeature.geometry.coordinates) {
                RAILWAY_LINE = lineFeature.geometry.coordinates.map(coord => ({
                    lng: coord[0],
                    lat: coord[1]
                }));
                console.log(`Spoorlijn Oostende-Antwerpen geladen: ${RAILWAY_LINE.length} punten`);
            }
        }
        
        // Laad de buffer zone (1.5km rondom de lijn)
        const bufferResponse = await fetch('./data/Oostende-Antwerpen-Spoorlijn-Buffer.geojson');
        if (bufferResponse.ok) {
            const bufferData = await bufferResponse.json();
            const bufferFeature = bufferData.features.find(f => f.properties.name === 'Track Buffer Zone');
            if (bufferFeature && bufferFeature.geometry.coordinates[0]) {
                RAILWAY_BUFFER = bufferFeature.geometry.coordinates[0].map(coord => ({
                    lng: coord[0],
                    lat: coord[1]
                }));
                console.log(`Spoorlijn buffer zone geladen: ${RAILWAY_BUFFER.length} punten`);
            }
        }
        
        return { line: RAILWAY_LINE, buffer: RAILWAY_BUFFER };
    } catch (error) {
        console.error('Fout bij laden spoorlijn data:', error);
        RAILWAY_LINE = [];
        RAILWAY_BUFFER = [];
        throw error;
    }
}

/**
 * Laadt alle stadswijken vanuit stadswijken-gent.geojson
 */
async function loadNeighborhoods() {
    try {
        const response = await fetch('./data/stadswijken-gent.geojson');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Converteer GeoJSON features naar ons formaat
        CITY_NEIGHBORHOODS = data.features.map(feature => ({
            name: feature.properties.wijk,
            nummer: feature.properties.wijknr,
            polygon: feature.geometry.coordinates[0].map(coord => ({
                lng: coord[0],
                lat: coord[1]
            })),
            geojson: feature  // Bewaar origineel voor Leaflet
        }));
        
        console.log(`Stadswijken geladen: ${CITY_NEIGHBORHOODS.length} wijken`);
        return CITY_NEIGHBORHOODS;
    } catch (error) {
        console.error('Fout bij laden stadswijken:', error);
        CITY_NEIGHBORHOODS = [];
        throw error;
    }
}

/**
 * Berekent de afstand tussen twee punten in meters (Haversine formule)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Aarde radius in meters
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Controleert of een locatie binnen de speelzone ligt (3km van Belfort)
 */
function isWithinGameZone(lat, lng) {
    if (!LOCATIONS.belfort) {
        console.error('Belfort locatie niet geladen');
        return { valid: false, distance: 0, maxDistance: GAME_RADIUS };
    }
    
    const distance = calculateDistance(lat, lng, LOCATIONS.belfort.lat, LOCATIONS.belfort.lng);
    return {
        valid: distance <= GAME_RADIUS,
        distance: Math.round(distance),
        maxDistance: GAME_RADIUS
    };
}

/**
 * Controleert of een punt binnen een polygoon ligt (Ray casting algorithm)
 */
function isPointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;
        
        const intersect = ((yi > lat) !== (yj > lat)) &&
            (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Controleert of een locatie binnen of buiten de R40 ligt
 */
function checkR40(lat, lng) {
    const inside = isPointInPolygon(lat, lng, R40_POLYGON);
    return {
        answer: inside ? "Binnen R40" : "Buiten R40",
        inside: inside
    };
}

/**
 * Controleert aan welke kant van de Leie-Schelde lijn een punt ligt
 * Vindt het dichtstbijzijnde lijnsegment en gebruikt het cross product daarvan
 */
function checkLeieSchelde(lat, lng) {
    if (LEIE_SCHELDE_LINE.length < 2) {
        console.warn('Leie-Schelde lijn niet geladen');
        return { answer: "Onbekend", north: null };
    }
    
    let minDistance = Infinity;
    let closestCross = 0;
    
    // Vind het dichtstbijzijnde segment
    for (let i = 0; i < LEIE_SCHELDE_LINE.length - 1; i++) {
        const start = LEIE_SCHELDE_LINE[i];
        const end = LEIE_SCHELDE_LINE[i + 1];
        
        // Bereken afstand van punt tot lijnsegment
        const distance = pointToSegmentDistance(lat, lng, start, end);
        
        if (distance < minDistance) {
            minDistance = distance;
            
            // Bereken cross product voor dit segment
            // Positief = links van de lijn (noorden), negatief = rechts (zuiden)
            closestCross = (end.lng - start.lng) * (lat - start.lat) - 
                          (end.lat - start.lat) * (lng - start.lng);
        }
    }
    
    return {
        answer: closestCross > 0 ? "Noorden van Leie-Schelde" : "Zuiden van Leie-Schelde",
        north: closestCross > 0
    };
}

/**
 * Berekent de afstand van een punt tot een lijnsegment
 */
function pointToSegmentDistance(lat, lng, segStart, segEnd) {
    // Vector van segment start naar punt
    const px = lng - segStart.lng;
    const py = lat - segStart.lat;
    
    // Vector van segment
    const sx = segEnd.lng - segStart.lng;
    const sy = segEnd.lat - segStart.lat;
    
    // Lengte van segment (squared)
    const segmentLengthSq = sx * sx + sy * sy;
    
    if (segmentLengthSq === 0) {
        // Segment is een punt
        return calculateDistance(lat, lng, segStart.lat, segStart.lng);
    }
    
    // Projectie van punt op segment (0 = start, 1 = end)
    let t = (px * sx + py * sy) / segmentLengthSq;
    t = Math.max(0, Math.min(1, t)); // Clamp tussen 0 en 1
    
    // Dichtstbijzijnde punt op segment
    const closestLat = segStart.lat + t * sy;
    const closestLng = segStart.lng + t * sx;
    
    // Afstand van punt tot dichtstbijzijnde punt op segment
    return calculateDistance(lat, lng, closestLat, closestLng);
}

/**
 * Controleert of een locatie dichter bij Weba of IKEA ligt
 */
function checkWebaIkea(lat, lng) {
    const distanceWeba = calculateDistance(lat, lng, LOCATIONS.weba.lat, LOCATIONS.weba.lng);
    const distanceIkea = calculateDistance(lat, lng, LOCATIONS.ikea.lat, LOCATIONS.ikea.lng);
    
    return {
        answer: distanceWeba < distanceIkea ? "Dichter bij Weba" : "Dichter bij IKEA",
        closerToWeba: distanceWeba < distanceIkea,
        distanceWeba: Math.round(distanceWeba),
        distanceIkea: Math.round(distanceIkea)
    };
}

/**
 * Controleert oosten/westen van Station Dampoort
 */
function checkDampoort(lat, lng) {
    const isEast = lng > LOCATIONS.dampoort.lng;
    return {
        answer: isEast ? "Oosten van Dampoort" : "Westen van Dampoort",
        east: isEast
    };
}

/**
 * Controleert oosten/westen van de tip van de watersportbaan
 */
function checkWatersportbaan(lat, lng) {
    const isEast = lng > LOCATIONS.watersportbaan_tip.lng;
    return {
        answer: isEast ? "Oosten van watersportbaan tip" : "Westen van watersportbaan tip",
        east: isEast
    };
}

/**
 * Controleert of een locatie binnen 800m van de spoorlijn Oostende-Antwerpen ligt
 */
function checkRailwayBuffer(lat, lng) {
    const inside = isPointInPolygon(lat, lng, RAILWAY_BUFFER);
    return {
        answer: inside ? "Binnen 800m van spoorlijn" : "Buiten 800m van spoorlijn",
        inside: inside
    };
}

/**
 * Controleert welke Colruyt het verste is van huidige locatie
 */
function checkFurthestColruyt(lat, lng) {
    const colruyts = getPOIsByType('colruyts');
    
    if (colruyts.length === 0) {
        return {
            answer: null,
            name: null,
            distance: null
        };
    }
    
    // Bereken afstand naar elke Colruyt
    const distances = colruyts.map(colruyt => ({
        name: colruyt.name,
        distance: calculateDistance(lat, lng, colruyt.lat, colruyt.lng)
    }));
    
    // Vind de verste Colruyt
    const furthest = distances.reduce((max, current) => 
        current.distance > max.distance ? current : max
    );
    
    return {
        answer: furthest.name,
        name: furthest.name,
        distance: Math.round(furthest.distance)
    };
}

/**
 * Controleert welke kattenopvang/asiel het verste is
 */
function checkFurthestCatlocation(lat, lng) {
    const catlocations = getPOIsByType('catlocations');
    
    if (catlocations.length === 0) {
        return {
            answer: null,
            name: null,
            distance: null
        };
    }
    
    // Bereken afstand naar elke kattenopvang
    const distances = catlocations.map(catlocation => ({
        name: catlocation.name,
        distance: calculateDistance(lat, lng, catlocation.lat, catlocation.lng)
    }));
    
    // Vind de verste kattenopvang
    const furthest = distances.reduce((max, current) => 
        current.distance > max.distance ? current : max
    );
    
    return {
        answer: furthest.name,
        name: furthest.name,
        distance: Math.round(furthest.distance)
    };
}

/**
 * Voert alle checks uit voor een gegeven locatie
 */
function performAllChecks(lat, lng) {
    const zoneCheck = isWithinGameZone(lat, lng);
    
    if (!zoneCheck.valid) {
        return {
            valid: false,
            message: `Locatie is buiten de speelzone! (${zoneCheck.distance}m van centrum, max ${zoneCheck.maxDistance}m)`,
            checks: null
        };
    }
    
    // Bepaal huidige wijk
    const neighborhood = getNeighborhoodAtLocation(lat, lng);
    
    return {
        valid: true,
        message: `Locatie is geldig! (${zoneCheck.distance}m van Belfort)`,
        checks: {
            r40: checkR40(lat, lng),
            leieSchelde: checkLeieSchelde(lat, lng),
            webaIkea: checkWebaIkea(lat, lng),
            dampoort: checkDampoort(lat, lng),
            watersportbaan: checkWatersportbaan(lat, lng),
            railwayBuffer: checkRailwayBuffer(lat, lng),
            furthestColruyt: checkFurthestColruyt(lat, lng),
            furthestCatlocation: checkFurthestCatlocation(lat, lng),
            neighborhood: neighborhood
        }
    };
}

/**
 * Vraagt de huidige locatie van de gebruiker op
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocatie wordt niet ondersteund door je browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            error => {
                let message = 'Kon locatie niet ophalen';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Toegang tot locatie geweigerd. Geef toestemming in je browser instellingen.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Locatie informatie is niet beschikbaar.';
                        break;
                    case error.TIMEOUT:
                        message = 'Timeout bij ophalen locatie.';
                        break;
                }
                reject(new Error(message));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

/**
 * Bepaalt in welke wijk een locatie zich bevindt
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {object|null} Wijk object of null indien niet in een wijk
 */
function getNeighborhoodAtLocation(lat, lng) {
    for (const neighborhood of CITY_NEIGHBORHOODS) {
        if (isPointInPolygon(lat, lng, neighborhood.polygon)) {
            return {
                name: neighborhood.name,
                nummer: neighborhood.nummer
            };
        }
    }
    
    return null;
}

/**
 * Vindt alle aangrenzende wijken voor een gegeven wijk
 * Gebruikt polygon touch detection
 * @param {string} neighborhoodName - Naam van de wijk
 * @returns {Array<string>} Array van aangrenzende wijknamen
 */
function getAdjacentNeighborhoods(neighborhoodName) {
    const targetNeighborhood = CITY_NEIGHBORHOODS.find(n => n.name === neighborhoodName);
    if (!targetNeighborhood) {
        console.warn(`Wijk "${neighborhoodName}" niet gevonden`);
        return [];
    }
    
    const adjacentNames = [];
    
    // Check elke andere wijk of deze grenst aan de target wijk
    for (const otherNeighborhood of CITY_NEIGHBORHOODS) {
        if (otherNeighborhood.name === neighborhoodName) continue;
        
        // Twee polygonen grenzen aan elkaar als ze minstens 1 gemeenschappelijk punt hebben
        if (polygonsTouch(targetNeighborhood.polygon, otherNeighborhood.polygon)) {
            adjacentNames.push(otherNeighborhood.name);
        }
    }
    
    return adjacentNames;
}

/**
 * Controleert of twee polygonen elkaar raken (delen een rand)
 * @param {Array} polygon1 - Eerste polygon
 * @param {Array} polygon2 - Tweede polygon
 * @returns {boolean} True als polygonen elkaar raken
 */
function polygonsTouch(polygon1, polygon2) {
    const TOLERANCE = 0.00001; // ~1 meter tolerantie
    
    // Check of punten van polygon1 op de rand van polygon2 liggen
    for (const point1 of polygon1) {
        for (let i = 0; i < polygon2.length; i++) {
            const point2a = polygon2[i];
            const point2b = polygon2[(i + 1) % polygon2.length];
            
            // Check of point1 op lijn segment (point2a, point2b) ligt
            if (pointOnLineSegment(point1, point2a, point2b, TOLERANCE)) {
                return true;
            }
        }
    }
    
    // Check omgekeerd: punten van polygon2 op rand van polygon1
    for (const point2 of polygon2) {
        for (let i = 0; i < polygon1.length; i++) {
            const point1a = polygon1[i];
            const point1b = polygon1[(i + 1) % polygon1.length];
            
            if (pointOnLineSegment(point2, point1a, point1b, TOLERANCE)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Controleert of een punt op een lijn segment ligt
 * @param {object} point - Punt om te checken {lat, lng}
 * @param {object} lineStart - Start van lijn segment {lat, lng}
 * @param {object} lineEnd - Einde van lijn segment {lat, lng}
 * @param {number} tolerance - Tolerantie in graden
 * @returns {boolean} True als punt op lijn segment ligt
 */
function pointOnLineSegment(point, lineStart, lineEnd, tolerance) {
    // Bereken cross product om te zien of punt collineair is met lijn
    const crossProduct = Math.abs(
        (point.lng - lineStart.lng) * (lineEnd.lat - lineStart.lat) -
        (point.lat - lineStart.lat) * (lineEnd.lng - lineStart.lng)
    );
    
    if (crossProduct > tolerance) return false;
    
    // Check of punt binnen de bounds van lijn segment ligt
    const withinBoundsLng = (point.lng >= Math.min(lineStart.lng, lineEnd.lng) - tolerance) &&
                            (point.lng <= Math.max(lineStart.lng, lineEnd.lng) + tolerance);
    const withinBoundsLat = (point.lat >= Math.min(lineStart.lat, lineEnd.lat) - tolerance) &&
                            (point.lat <= Math.max(lineStart.lat, lineEnd.lat) + tolerance);
    
    return withinBoundsLng && withinBoundsLat;
}
/**
 * Haal POI's van een bepaald type op (bijv. 'libraries')
 * @param {string} poiType - Type POI (bijv. 'libraries')
 * @returns {Array} Array van POI objecten met lat/lng
 */
function getPOIsByType(poiType) {
    if (!POI_COLLECTIONS || !POI_COLLECTIONS[poiType]) {
        return [];
    }
    return POI_COLLECTIONS[poiType];
}

/**
 * Bereken afstand naar dichtste POI van bepaald type
 * @param {number} lat - Huidige latitude
 * @param {number} lng - Huidige longitude
 * @param {string} poiType - Type POI
 * @param {Array} excludePoiIds - Array van POI IDs om uit te sluiten
 * @returns {number} Afstand in meters naar dichtste POI, of Infinity als geen gevonden
 */
function getDistanceToNearestPOI(lat, lng, poiType, excludePoiIds = []) {
    const pois = getPOIsByType(poiType);
    if (pois.length === 0) return Infinity;
    
    let minDistance = Infinity;
    pois.forEach(poi => {
        if (excludePoiIds.includes(poi.id)) return;
        
        const distance = getDistanceInMeters(lat, lng, poi.lat, poi.lng);
        minDistance = Math.min(minDistance, distance);
    });
    
    return minDistance;
}

/**
 * Check of er een POI van bepaald type binnen radius is
 * @param {number} lat - Huidige latitude
 * @param {number} lng - Huidige longitude
 * @param {string} poiType - Type POI
 * @param {number} radius - Radius in meters
 * @returns {boolean} True als POI binnen radius is
 */
function hasNearbyPOI(lat, lng, poiType, radius) {
    const distance = getDistanceToNearestPOI(lat, lng, poiType);
    return distance <= radius;
}

/**
 * Genereer punten op een cirkel rond meerdere POIs (voor exclusion zones)
 * @param {Array} pois - Array van POI objecten
 * @param {number} radius - Radius in meters
 * @param {number} angleStep - Hoekstap in graden (default 5)
 * @returns {Array} Array van arrays [lat, lng] punten die een cirkel vormen
 */
function getPointsByRadiusFromPOIs(pois, radius, angleStep = 5) {
    const allPoints = [];
    const earthRadius = 6371000; // meters
    
    pois.forEach(poi => {
        for (let angle = 0; angle <= 360; angle += angleStep) {
            const rad = (angle * Math.PI) / 180;
            const latOffset = (radius / earthRadius) * (180 / Math.PI) * Math.cos(rad);
            const lngOffset = 
                ((radius / earthRadius) * (180 / Math.PI) * Math.sin(rad)) /
                Math.cos((poi.lat * Math.PI) / 180);
            
            allPoints.push([poi.lat + latOffset, poi.lng + lngOffset]);
        }
    });
    
    return allPoints;
}