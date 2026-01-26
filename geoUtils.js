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
    { lat: 51.0493, lng: 3.7071 },
    { lat: 51.0494, lng: 3.7067 },
    { lat: 51.0494, lng: 3.7061 },
    { lat: 51.0493, lng: 3.7056 },
    { lat: 51.0494, lng: 3.7051 },
    { lat: 51.0495, lng: 3.7048 },
    { lat: 51.0497, lng: 3.7043 },
    { lat: 51.0499, lng: 3.7038 },
    { lat: 51.0500, lng: 3.7035 },
    { lat: 51.0500, lng: 3.7032 },
    { lat: 51.0501, lng: 3.7030 },
    { lat: 51.0504, lng: 3.7026 },
    { lat: 51.0524, lng: 3.7000 },
    { lat: 51.0537, lng: 3.6982 },
    { lat: 51.0560, lng: 3.6953 },
    { lat: 51.0565, lng: 3.6947 },
    { lat: 51.0571, lng: 3.6938 },
    { lat: 51.0575, lng: 3.6933 },
    { lat: 51.0578, lng: 3.6932 },
    { lat: 51.0580, lng: 3.6931 },
    { lat: 51.0587, lng: 3.6930 },
    { lat: 51.0594, lng: 3.6930 },
    { lat: 51.0597, lng: 3.6931 },
    { lat: 51.0607, lng: 3.6933 },
    { lat: 51.0613, lng: 3.6937 },
    { lat: 51.0621, lng: 3.6942 },
    { lat: 51.0632, lng: 3.6951 },
    { lat: 51.0641, lng: 3.6959 },
    { lat: 51.0644, lng: 3.6962 },
    { lat: 51.0647, lng: 3.6967 },
    { lat: 51.0653, lng: 3.6980 },
    { lat: 51.0658, lng: 3.6991 },
    { lat: 51.0663, lng: 3.6997 },
    { lat: 51.0656, lng: 3.7005 },
    { lat: 51.0651, lng: 3.7009 },
    { lat: 51.0650, lng: 3.7015 },
    { lat: 51.0648, lng: 3.7020 },
    { lat: 51.0647, lng: 3.7022 },
    { lat: 51.0645, lng: 3.7023 },
    { lat: 51.0643, lng: 3.7025 },
    { lat: 51.0643, lng: 3.7028 },
    { lat: 51.0646, lng: 3.7046 },
    { lat: 51.0652, lng: 3.7081 },
    { lat: 51.0658, lng: 3.7124 },
    { lat: 51.0669, lng: 3.7197 },
    { lat: 51.0678, lng: 3.7256 },
    { lat: 51.0679, lng: 3.7270 },
    { lat: 51.0676, lng: 3.7270 },
    { lat: 51.0674, lng: 3.7270 },
    { lat: 51.0673, lng: 3.7270 },
    { lat: 51.0676, lng: 3.7281 },
    { lat: 51.0677, lng: 3.7286 },
    { lat: 51.0678, lng: 3.7295 },
    { lat: 51.0676, lng: 3.7319 },
    { lat: 51.0677, lng: 3.7327 },
    { lat: 51.0681, lng: 3.7352 },
    { lat: 51.0682, lng: 3.7355 },
    { lat: 51.0683, lng: 3.7369 },
    { lat: 51.0684, lng: 3.7376 },
    { lat: 51.0683, lng: 3.7380 },
    { lat: 51.0682, lng: 3.7382 },
    { lat: 51.0680, lng: 3.7383 },
    { lat: 51.0678, lng: 3.7384 },
    { lat: 51.0673, lng: 3.7385 },
    { lat: 51.0671, lng: 3.7386 },
    { lat: 51.0668, lng: 3.7387 },
    { lat: 51.0650, lng: 3.7390 },
    { lat: 51.0642, lng: 3.7392 },
    { lat: 51.0640, lng: 3.7392 },
    { lat: 51.0639, lng: 3.7392 },
    { lat: 51.0637, lng: 3.7392 },
    { lat: 51.0635, lng: 3.7391 },
    { lat: 51.0632, lng: 3.7390 },
    { lat: 51.0629, lng: 3.7389 },
    { lat: 51.0625, lng: 3.7387 },
    { lat: 51.0621, lng: 3.7386 },
    { lat: 51.0618, lng: 3.7385 },
    { lat: 51.0615, lng: 3.7384 },
    { lat: 51.0611, lng: 3.7384 },
    { lat: 51.0607, lng: 3.7385 },
    { lat: 51.0599, lng: 3.7389 },
    { lat: 51.0591, lng: 3.7393 },
    { lat: 51.0580, lng: 3.7398 },
    { lat: 51.0577, lng: 3.7399 },
    { lat: 51.0575, lng: 3.7400 },
    { lat: 51.0573, lng: 3.7399 },
    { lat: 51.0573, lng: 3.7397 },
    { lat: 51.0572, lng: 3.7390 },
    { lat: 51.0571, lng: 3.7386 },
    { lat: 51.0570, lng: 3.7383 },
    { lat: 51.0569, lng: 3.7383 },
    { lat: 51.0568, lng: 3.7383 },
    { lat: 51.0565, lng: 3.7385 },
    { lat: 51.0563, lng: 3.7386 },
    { lat: 51.0562, lng: 3.7387 },
    { lat: 51.0559, lng: 3.7388 },
    { lat: 51.0557, lng: 3.7388 },
    { lat: 51.0554, lng: 3.7390 },
    { lat: 51.0531, lng: 3.7400 },
    { lat: 51.0523, lng: 3.7403 },
    { lat: 51.0519, lng: 3.7408 },
    { lat: 51.0509, lng: 3.7419 },
    { lat: 51.0502, lng: 3.7427 },
    { lat: 51.0486, lng: 3.7446 },
    { lat: 51.0482, lng: 3.7450 },
    { lat: 51.0479, lng: 3.7454 },
    { lat: 51.0475, lng: 3.7457 },
    { lat: 51.0472, lng: 3.7457 },
    { lat: 51.0470, lng: 3.7457 },
    { lat: 51.0468, lng: 3.7455 },
    { lat: 51.0462, lng: 3.7449 },
    { lat: 51.0456, lng: 3.7441 },
    { lat: 51.0452, lng: 3.7436 },
    { lat: 51.0447, lng: 3.7428 },
    { lat: 51.0443, lng: 3.7422 },
    { lat: 51.0438, lng: 3.7416 },
    { lat: 51.0436, lng: 3.7413 },
    { lat: 51.0435, lng: 3.7412 },
    { lat: 51.0433, lng: 3.7409 },
    { lat: 51.0431, lng: 3.7407 },
    { lat: 51.0427, lng: 3.7403 },
    { lat: 51.0424, lng: 3.7401 },
    { lat: 51.0422, lng: 3.7398 },
    { lat: 51.0417, lng: 3.7394 },
    { lat: 51.0414, lng: 3.7391 },
    { lat: 51.0411, lng: 3.7387 },
    { lat: 51.0409, lng: 3.7386 },
    { lat: 51.0407, lng: 3.7385 },
    { lat: 51.0402, lng: 3.7383 },
    { lat: 51.0401, lng: 3.7382 },
    { lat: 51.0400, lng: 3.7382 },
    { lat: 51.0396, lng: 3.7381 },
    { lat: 51.0395, lng: 3.7380 },
    { lat: 51.0394, lng: 3.7379 },
    { lat: 51.0392, lng: 3.7378 },
    { lat: 51.0391, lng: 3.7376 },
    { lat: 51.0390, lng: 3.7374 },
    { lat: 51.0389, lng: 3.7371 },
    { lat: 51.0388, lng: 3.7366 },
    { lat: 51.0386, lng: 3.7357 },
    { lat: 51.0385, lng: 3.7348 },
    { lat: 51.0384, lng: 3.7341 },
    { lat: 51.0385, lng: 3.7328 },
    { lat: 51.0385, lng: 3.7308 },
    { lat: 51.0385, lng: 3.7292 },
    { lat: 51.0386, lng: 3.7277 },
    { lat: 51.0386, lng: 3.7274 },
    { lat: 51.0386, lng: 3.7269 },
    { lat: 51.0387, lng: 3.7260 },
    { lat: 51.0387, lng: 3.7256 },
    { lat: 51.0388, lng: 3.7253 },
    { lat: 51.0390, lng: 3.7249 },
    { lat: 51.0393, lng: 3.7243 },
    { lat: 51.0399, lng: 3.7232 },
    { lat: 51.0408, lng: 3.7215 },
    { lat: 51.0413, lng: 3.7207 },
    { lat: 51.0415, lng: 3.7204 },
    { lat: 51.0418, lng: 3.7198 },
    { lat: 51.0426, lng: 3.7181 },
    { lat: 51.0429, lng: 3.7175 },
    { lat: 51.0433, lng: 3.7168 },
    { lat: 51.0440, lng: 3.7155 },
    { lat: 51.0444, lng: 3.7147 },
    { lat: 51.0448, lng: 3.7144 },
    { lat: 51.0451, lng: 3.7143 },
    { lat: 51.0455, lng: 3.7143 },
    { lat: 51.0457, lng: 3.7143 },
    { lat: 51.0460, lng: 3.7140 },
    { lat: 51.0461, lng: 3.7136 },
    { lat: 51.0468, lng: 3.7117 },
    { lat: 51.0474, lng: 3.7106 },
    { lat: 51.0476, lng: 3.7103 },
    { lat: 51.0484, lng: 3.7094 },
    { lat: 51.0488, lng: 3.7087 },
    { lat: 51.0490, lng: 3.7082 },
    { lat: 51.0492, lng: 3.7076 }
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
