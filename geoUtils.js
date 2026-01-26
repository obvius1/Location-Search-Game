// Geografische utilities voor Gent Location Game

// Constanten voor Gent
const BELFORT_GENT = { lat: 51.0538, lng: 3.7251 }; // Centrum van Gent
const GAME_RADIUS = 16000; // 16km in meters

// Belangrijke locaties in Gent
const LOCATIONS = {
    belfort: { lat: 51.0536844, lng: 3.72476097 }, // Belfort Gent
    dampoort: { lat: 51.056221, lng: 3.740287984 }, // Station Dampoort
    watersportbaan_tip: { lat: 51.0463306, lng: 3.705969308 }, // Noordelijke tip
    weba: { lat: 51.07385946620895, lng: 3.7407081136252547 }, // Weba Shopping Center
    ikea: { lat: 51.02356223132743, lng: 3.6878854133255237 }, // IKEA Gent
};

// R40 binnenring (vereenvoudigde polygoon)
// Dit is een benadering van de R40 ring rond Gent centrum
const R40_POLYGON = [
    { lat: 51.0627, lng: 3.7103 },
    { lat: 51.0647, lng: 3.7183 },
    { lat: 51.0658, lng: 3.7283 },
    { lat: 51.0628, lng: 3.7383 },
    { lat: 51.0568, lng: 3.7443 },
    { lat: 51.0488, lng: 3.7433 },
    { lat: 51.0428, lng: 3.7373 },
    { lat: 51.0398, lng: 3.7283 },
    { lat: 51.0398, lng: 3.7183 },
    { lat: 51.0428, lng: 3.7093 },
    { lat: 51.0488, lng: 3.7033 },
    { lat: 51.0568, lng: 3.7033 },
];

// Leie-Schelde lijn (vereenvoudigd als rechte lijn tussen twee punten)
const LEIE_SCHELDE_LINE = {
    start: { lat: 51.0450, lng: 3.6900 }, // Leie (west)
    end: { lat: 51.0520, lng: 3.7600 }    // Schelde (oost)
};

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
    const distance = calculateDistance(lat, lng, BELFORT_GENT.lat, BELFORT_GENT.lng);
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
 */
function checkLeieSchelde(lat, lng) {
    // Gebruik cross product om te bepalen aan welke kant van de lijn het punt ligt
    const { start, end } = LEIE_SCHELDE_LINE;
    
    const cross = (end.lng - start.lng) * (lat - start.lat) - 
                  (end.lat - start.lat) * (lng - start.lng);
    
    return {
        answer: cross > 0 ? "Noorden van Leie-Schelde" : "Zuiden van Leie-Schelde",
        north: cross > 0
    };
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
    
    return {
        valid: true,
        message: `Locatie is geldig! (${zoneCheck.distance}m van Belfort)`,
        checks: {
            r40: checkR40(lat, lng),
            leieSchelde: checkLeieSchelde(lat, lng),
            webaIkea: checkWebaIkea(lat, lng),
            dampoort: checkDampoort(lat, lng),
            watersportbaan: checkWatersportbaan(lat, lng)
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
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
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
                maximumAge: 30000
            }
        );
    });
}
