// Speelkaarten voor Gent Location Game

// Alle beschikbare kaarten - worden geladen vanuit cards.json
let GAME_CARDS = {
    hiderChecklist: [],
    cards: []
};

/**
 * Laadt alle kaarten vanuit het externe cards.json bestand
 */
async function loadCards() {
    try {
        const response = await fetch('./data/cards.json?t=' + Date.now());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        GAME_CARDS = data;
        console.log(`Kaarten geladen: ${GAME_CARDS.cards.length} kaarten, ${GAME_CARDS.hiderChecklist?.length || 0} checklist items`);
        return data;
    } catch (error) {
        console.error('Fout bij laden kaarten:', error);
        GAME_CARDS = { hiderChecklist: [], cards: [] };
        throw error;
    }
}

/**
 * Simple seeded random number generator (Mulberry32)
 */
class SeededRandom {
    constructor(seed) {
        this.seed = this.hashString(seed);
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
    
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

/**
 * Shuffle array using Fisher-Yates algorithm with seeded random
 */
function shuffleArray(array, rng) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Genereert een random seed string
 */
function generateSeed() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let seed = '';
    for (let i = 0; i < 6; i++) {
        seed += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return seed;
}

/**
 * Maakt een shuffled deck van kaarten op basis van een seed
 * Kaarten worden geshufeld per fase (1 -> 2 -> 3)
 */
function createDeck(seed) {
    const rng = new SeededRandom(seed);
    
    // Splits kaarten op fase
    const phase1Cards = GAME_CARDS.cards.filter(card => card.phase === 1);
    const phase2Cards = GAME_CARDS.cards.filter(card => card.phase === 2);
    const phase3Cards = GAME_CARDS.cards.filter(card => card.phase === 3);
    
    // Shuffle elke fase apart
    const shuffledPhase1 = shuffleArray(phase1Cards, rng);
    const shuffledPhase2 = shuffleArray(phase2Cards, rng);
    const shuffledPhase3 = shuffleArray(phase3Cards, rng);
    
    // Combineer: fase 1 -> fase 2 -> fase 3
    return [...shuffledPhase1, ...shuffledPhase2, ...shuffledPhase3];
}

/**
 * CardManager class voor het beheren van de kaarten met flop systeem
 */
class CardManager {
    constructor(seed) {
        this.seed = seed;
        this.deck = createDeck(seed);
        this.flop = []; // 12 kaarten: 4 per fase
        this.discarded = []; // Kaarten die uit het spel zijn
        this.deckIndex = 0; // Huidige positie in deck voor nieuwe kaarten
        
        // Initialiseer de flop met 4 kaarten per fase
        this.initializeFlop();
    }
    
    /**
     * Initialiseer de flop met 4 kaarten per fase
     */
    initializeFlop() {
        // Tel kaarten per fase in het deck
        const phase1Cards = this.deck.filter(c => c.phase === 1);
        const phase2Cards = this.deck.filter(c => c.phase === 2);
        const phase3Cards = this.deck.filter(c => c.phase === 3);
        
        // Trek 4 kaarten van elke fase
        this.flop = [
            ...phase1Cards.slice(0, 4),
            ...phase2Cards.slice(0, 4),
            ...phase3Cards.slice(0, 4)
        ];
        
        // Update deck index (we hebben nu 12 kaarten getrokken)
        this.deckIndex = 12;
    }
    
    /**
     * Herstel flop uit opgeslagen state
     */
    restoreFlop(flopState, discardedState, deckIndex) {
        if (flopState && Array.isArray(flopState)) {
            this.flop = flopState;
        }
        if (discardedState && Array.isArray(discardedState)) {
            this.discarded = discardedState;
        }
        if (typeof deckIndex === 'number') {
            this.deckIndex = deckIndex;
        }
    }
    
    /**
     * Verkrijg alle kaarten in de flop
     */
    getFlop() {
        return this.flop;
    }
    
    /**
     * Verkrijg kaarten per fase
     */
    getFlopByPhase(phase) {
        return this.flop.filter(card => card.phase === phase);
    }
    
    /**
     * Verwijder een kaart uit de flop en trek een nieuwe
     */
    discardCard(cardIndex) {
        if (cardIndex < 0 || cardIndex >= this.flop.length) {
            console.error('Ongeldige kaart index:', cardIndex);
            return false;
        }
        
        const card = this.flop[cardIndex];
        const phase = card.phase;
        
        // Verplaats naar discarded
        this.discarded.push(card);
        
        // Trek nieuwe kaart van dezelfde fase
        const newCard = this.drawCard(phase);
        
        if (newCard) {
            // Vervang de kaart in de flop
            this.flop[cardIndex] = newCard;
        } else {
            // Geen kaarten meer beschikbaar, verwijder uit flop
            this.flop.splice(cardIndex, 1);
        }
        
        return true;
    }
    
    /**
     * Trek een nieuwe kaart van een specifieke fase
     */
    drawCard(phase) {
        // Zoek volgende kaart in deck met de juiste fase
        for (let i = this.deckIndex; i < this.deck.length; i++) {
            const card = this.deck[i];
            if (card.phase === phase && !this.isCardInFlop(card) && !this.isCardDiscarded(card)) {
                this.deckIndex = i + 1;
                return card;
            }
        }
        
        // Geen kaarten meer beschikbaar
        return null;
    }
    
    /**
     * Check of een kaart al in de flop zit
     */
    isCardInFlop(card) {
        return this.flop.some(c => c.task === card.task && c.question === card.question);
    }
    
    /**
     * Check of een kaart al gediscard is
     */
    isCardDiscarded(card) {
        return this.discarded.some(c => c.task === card.task && c.question === card.question);
    }
    
    /**
     * Verkrijg een specifieke kaart uit de flop
     */
    getCard(index) {
        if (index < 0 || index >= this.flop.length) {
            return null;
        }
        return this.flop[index];
    }
    
    /**
     * Verkrijg het totaal aantal kaarten in de flop
     */
    getTotalCards() {
        return this.flop.length;
    }
    
    /**
     * Verkrijg het aantal resterende kaarten in het deck
     */
    getRemainingCards() {
        return this.deck.length - this.deckIndex;
    }
    
    /**
     * Verkrijg de seed
     */
    getSeed() {
        return this.seed;
    }
    
    /**
     * Verkrijg state voor opslag
     */
    getState() {
        return {
            flop: this.flop,
            discarded: this.discarded,
            deckIndex: this.deckIndex
        };
    }
    
    // Legacy methoden voor backward compatibility
    getCurrentCard() {
        return this.flop[0] || null;
    }
    
    getCurrentIndex() {
        return 0;
    }
    
    nextCard() {
        return this.flop[1] || null;
    }
    
    previousCard() {
        return this.flop[0] || null;
    }
    
    hasNext() {
        return this.flop.length > 1;
    }
    
    hasPrevious() {
        return false;
    }
}
