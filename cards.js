// Speelkaarten voor Gent Location Game

// Alle beschikbare kaarten
const GAME_CARDS = [
    {
        task: "🕊️ Voeder een duif",
        question: "Binnen of buiten R40?"
    },
    {
        task: "📸 Maak een selfie bij een standbeeld",
        question: "Noorden of zuiden van lijn Leie-Schelde?"
    },
    {
        task: "☕ Bestel een koffie",
        question: "Dichter bij Weba of IKEA?"
    },
    {
        task: "🚶 Loop 100 meter achteruit",
        question: "Oosten of westen van station Gent Dampoort?"
    },
    {
        task: "🎵 Zing een liedje in het openbaar",
        question: "Oosten of westen van de tip van de watersportbaan?"
    },
    {
        task: "🌳 Raak 5 verschillende bomen aan",
        question: "Binnen of buiten R40?"
    },
    {
        task: "👋 Zwaai naar 10 mensen",
        question: "Noorden of zuiden van lijn Leie-Schelde?"
    },
    {
        task: "🏃 Ren een minuut lang",
        question: "Dichter bij Weba of IKEA?"
    },
    {
        task: "🤸 Doe 10 jumping jacks",
        question: "Oosten of westen van station Gent Dampoort?"
    },
    {
        task: "📱 Maak een TikTok/Reel",
        question: "Oosten of westen van de tip van de watersportbaan?"
    },
    {
        task: "🍦 Koop iets te eten/drinken",
        question: "Binnen of buiten R40?"
    },
    {
        task: "🚲 Vind een fiets en raak hem aan",
        question: "Noorden of zuiden van lijn Leie-Schelde?"
    },
    {
        task: "💬 Vraag de weg aan een vreemdeling",
        question: "Dichter bij Weba of IKEA?"
    },
    {
        task: "🎨 Vind iets kunst en maak een foto",
        question: "Oosten of westen van station Gent Dampoort?"
    },
    {
        task: "🌉 Steek een brug over",
        question: "Oosten of westen van de tip van de watersportbaan?"
    }
];

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
 */
function createDeck(seed) {
    const rng = new SeededRandom(seed);
    return shuffleArray(GAME_CARDS, rng);
}

/**
 * CardManager class voor het beheren van de kaarten
 */
class CardManager {
    constructor(seed) {
        this.seed = seed;
        this.deck = createDeck(seed);
        this.currentIndex = 0;
    }
    
    getCurrentCard() {
        if (this.currentIndex < 0 || this.currentIndex >= this.deck.length) {
            return null;
        }
        return this.deck[this.currentIndex];
    }
    
    nextCard() {
        if (this.currentIndex < this.deck.length - 1) {
            this.currentIndex++;
            return this.getCurrentCard();
        }
        return null;
    }
    
    previousCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.getCurrentCard();
        }
        return null;
    }
    
    hasNext() {
        return this.currentIndex < this.deck.length - 1;
    }
    
    hasPrevious() {
        return this.currentIndex > 0;
    }
    
    getTotalCards() {
        return this.deck.length;
    }
    
    getCurrentIndex() {
        return this.currentIndex;
    }
    
    getSeed() {
        return this.seed;
    }
}
