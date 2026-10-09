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
