// Storage utilities voor Jet Lag Game
// Gebruikt localStorage voor persistente opslag

const STORAGE_KEY = 'jetlag_game_data';

/**
 * Game data structure
 */
const defaultGameData = {
    seed: null,
    location: null, // { lat, lng, timestamp }
    questions: [], // { question: string, answer: string, timestamp }
    cardAnswers: [], // { cardIndex: number, opponentAnswer: string, timestamp: string }
    gameStarted: false,
    version: 1
};

/**
 * Laad game data uit localStorage
 */
function loadGameData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            return { ...defaultGameData };
        }
        
        const parsed = JSON.parse(data);
        
        // Migratie voor oude versies
        if (!parsed.version) {
            parsed.version = 1;
        }
        
        // Zorg ervoor dat cardAnswers array bestaat (voor oude game data)
        if (!parsed.cardAnswers) {
            parsed.cardAnswers = [];
        }
        
        return parsed;
    } catch (error) {
        console.error('Error loading game data:', error);
        return { ...defaultGameData };
    }
}

/**
 * Sla game data op in localStorage
 */
function saveGameData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('Game data saved:', data);
        return true;
    } catch (error) {
        console.error('Error saving game data:', error);
        return false;
    }
}

/**
 * Update seed in storage
 */
function saveSeed(seed) {
    const data = loadGameData();
    data.seed = seed;
    data.gameStarted = true;
    return saveGameData(data);
}

/**
 * Update locatie in storage
 */
function saveLocation(lat, lng) {
    const data = loadGameData();
    data.location = {
        lat,
        lng,
        timestamp: new Date().toISOString()
    };
    return saveGameData(data);
}

/**
 * Voeg vraag en antwoord toe
 */
function saveQuestion(question, answer) {
    const data = loadGameData();
    data.questions.push({
        question,
        answer,
        timestamp: new Date().toISOString()
    });
    return saveGameData(data);
}

/**
 * Check of er een actief spel is
 */
function hasActiveGame() {
    const data = loadGameData();
    return data.gameStarted && data.seed !== null;
}

/**
 * Sla antwoord van tegenstander op voor een specifieke kaart
 */
function saveOpponentAnswer(cardIndex, opponentAnswer) {
    const data = loadGameData();
    
    // Check of er al een antwoord is voor deze kaart
    const existingIndex = data.cardAnswers.findIndex(a => a.cardIndex === cardIndex);
    
    // Als opponentAnswer null is, verwijder het antwoord
    if (opponentAnswer === null) {
        if (existingIndex >= 0) {
            data.cardAnswers.splice(existingIndex, 1);
        }
        return saveGameData(data);
    }
    
    const answerData = {
        cardIndex,
        opponentAnswer,
        timestamp: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
        // Update bestaand antwoord
        data.cardAnswers[existingIndex] = answerData;
    } else {
        // Voeg nieuw antwoord toe
        data.cardAnswers.push(answerData);
    }
    
    return saveGameData(data);
}

/**
 * Haal antwoord van tegenstander op voor een specifieke kaart
 */
function getOpponentAnswer(cardIndex) {
    const data = loadGameData();
    const answer = data.cardAnswers.find(a => a.cardIndex === cardIndex);
    return answer ? answer.opponentAnswer : null;
}

/**
 * Check of kaart een antwoord van tegenstander heeft
 */
function hasOpponentAnswer(cardIndex) {
    return getOpponentAnswer(cardIndex) !== null;
}

/**
 * Check of locatie is ingesteld
 */
function hasLocation() {
    const data = loadGameData();
    return data.location !== null;
}

/**
 * Reset alle game data (nieuw spel)
 */
function resetGameData() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Game data reset');
    return true;
}

/**
 * Export game data als JSON (voor delen/backup)
 */
function exportGameData() {
    const data = loadGameData();
    return JSON.stringify(data, null, 2);
}

/**
 * Import game data van JSON
 */
function importGameData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        return saveGameData(data);
    } catch (error) {
        console.error('Error importing game data:', error);
        return false;
    }
}
