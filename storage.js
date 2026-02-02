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
 * Sla checklist completed status op
 */
function saveChecklistCompleted() {
    localStorage.setItem('checklistCompleted', 'true');
}

/**
 * Check of checklist al voltooid is
 */
function isChecklistCompleted() {
    return localStorage.getItem('checklistCompleted') === 'true';
}

/**
 * Sla de checklist state op (welke items zijn afgevinkt)
 */
function saveChecklistState(checklistState) {
    localStorage.setItem('checklistState', JSON.stringify(checklistState));
}

/**
 * Laad de checklist state
 */
function loadChecklistState() {
    const state = localStorage.getItem('checklistState');
    return state ? JSON.parse(state) : null;
}

/**
 * Sla antwoord van tegenstander op voor een specifieke kaart
 */
function saveOpponentAnswer(cardIndex, opponentAnswer, cardTask = null) {
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
        cardTask, // Sla task op voor latere referentie
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
 * Sla antwoord op voor een opgeloste (discarded) kaart
 */
function saveDiscardedAnswer(discardedIndex, answer, cardTask = null, originalCardIndex = null) {
    const key = `discardedAnswer_${discardedIndex}`;
    const data = { answer, cardTask, originalCardIndex };
    localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Haal antwoord op voor een opgeloste (discarded) kaart
 */
function getDiscardedAnswer(discardedIndex) {
    const key = `discardedAnswer_${discardedIndex}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    try {
        const data = JSON.parse(stored);
        return data.answer || stored; // Fallback voor oude format
    } catch {
        return stored; // Oude string format
    }
}

/**
 * Haal volledige discarded answer data op
 */
function getDiscardedAnswerData(discardedIndex) {
    const key = `discardedAnswer_${discardedIndex}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    try {
        return JSON.parse(stored);
    } catch {
        return { answer: stored }; // Oude string format
    }
}

/**
 * Update opponent answer op basis van card task
 */
function updateOpponentAnswerByTask(cardTask, newAnswer) {
    const data = loadGameData();
    
    // Zoek de opponent answer met deze card task
    const answerEntry = data.cardAnswers.find(a => a.cardTask === cardTask);
    
    if (answerEntry) {
        answerEntry.opponentAnswer = newAnswer;
        saveGameData(data);
        return true;
    }
    
    return false;
}

/**
 * Update opponent answer op basis van originele cardIndex
 */
function updateOpponentAnswerByIndex(originalCardIndex, newAnswer) {
    const data = loadGameData();
    
    // Zoek de opponent answer met deze cardIndex
    const answerEntry = data.cardAnswers.find(a => a.cardIndex === originalCardIndex);
    
    if (answerEntry) {
        answerEntry.opponentAnswer = newAnswer;
        saveGameData(data);
        return true;
    }
    
    return false;
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
    // Verwijder hoofdgame data
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('cardManagerState');
    localStorage.removeItem('opponentAnswers');
    localStorage.removeItem('checklistCompleted');
    localStorage.removeItem('checklistState');
    
    // Verwijder alle discarded answers
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('discardedAnswer_')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('Game data reset (inclusief card manager state, antwoorden, checklist en discarded answers)');
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
