// Opslag voor Jet Lag Gent (localStorage op dit toestel)

const STORAGE_KEY = 'jetlag_game_data';

/**
 * Spelgegevens: { seed, location, checklist, cardAnswers, exclusionZones, solved, gameStarted, version }
 */
const defaultGameData = {
    seed: null,
    location: null,
    cardAnswers: [],
    exclusionZones: [],
    solved: [],
    gameStarted: false,
    version: 2
};

function loadGameData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? { ...defaultGameData, ...JSON.parse(data) } : { ...defaultGameData };
    } catch (error) {
        console.error('Fout bij laden spelgegevens:', error);
        return { ...defaultGameData };
    }
}

function saveGameData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Fout bij opslaan spelgegevens:', error);
        return false;
    }
}

// ─── Spelregels ───────────────────────────────────────────────────────────────

const GAME_RULES_KEY = 'gameRules';

const defaultGameRules = {
    zoneLockEnabled: true   // Taken mogen niet uitgevoerd worden in uitgesloten zones
};

function loadGameRules() {
    try {
        const stored = localStorage.getItem(GAME_RULES_KEY);
        return stored ? { ...defaultGameRules, ...JSON.parse(stored) } : { ...defaultGameRules };
    } catch {
        return { ...defaultGameRules };
    }
}

function saveGameRules(rules) {
    try {
        localStorage.setItem(GAME_RULES_KEY, JSON.stringify(rules));
        return true;
    } catch {
        return false;
    }
}

function getGameRule(key) {
    return loadGameRules()[key];
}

// ──────────────────────────────────────────────────────────────────────────────

/**
 * Wis het spel (nieuw spel). De spelregels en de keuze om je fiets te tonen blijven staan.
 */
function resetGameData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('cardManagerState');
}

// ──────────────────────────────────────────────────────────────────────────────

/**
 * Stand als tekstcode (om via Messenger door te sturen) en terug.
 * Gewone base64 van de JSON met "JLG1" ervoor; tekst voor of na de code (gescheiden door een spatie) wordt genegeerd.
 */
const CODE_PREFIX = 'JLG1';

function packCode(state) {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return CODE_PREFIX + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unpackCode(text) {
    const match = String(text || '').match(new RegExp(CODE_PREFIX + '([A-Za-z0-9_-]+)'));
    if (!match) return null;
    try {
        const bin = atob(match[1].replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
    } catch {
        return null;
    }
}
