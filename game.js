// Spelregels voor Gent Location Game: de gedeelde flop, wie eerst was, zones per antwoord,
// een vraag kopiëren, antwoorden over je eigen fiets en undo. Geen schermcode.

const CARD_MANAGER_KEY = 'cardManagerState';
const SHOW_BIKE_KEY = 'showBike';

const PHOTO_QUESTIONS = [
    [/links/i, 'naar links', 'links'],
    [/rechts/i, 'naar rechts', 'rechts'],
    [/voor|voren/i, 'naar voren', 'voren'],
    [/achter/i, 'naar achteren', 'achteren'],
    [/onder|beneden/i, 'naar beneden', 'beneden'],
    [/gebouw/i, 'van het dichtstbijzijnde gebouw', 'gebouw']
];

const Game = {
    cm: null,
    lastAction: null,

    /* ===== Opstart en opslag ===== */

    /** Herstel een lopend spel; geeft true als er een spel bezig is */
    restore() {
        const data = loadGameData();
        if (!data.gameStarted || !data.seed) return false;
        this.cm = new CardManager(data.seed);
        try {
            const saved = JSON.parse(localStorage.getItem(CARD_MANAGER_KEY));
            if (saved && saved.flop) {
                // Opgeslagen kaarten vervangen door die uit het deck (zelfde ID), zodat aangepaste teksten meteen gelden
                const fresh = (list) => (list || []).map(c => this.cm.deck.find(d => d.id === c.id) || c);
                this.cm.restoreFlop(fresh(saved.flop), fresh(saved.discarded), saved.deckIndex);
            }
        } catch (error) {
            console.warn('Kaartstand kon niet geladen worden:', error);
        }
        return true;
    },

    /** Start een nieuw spel na de wizard */
    start({ seed, location, checklist, zoneLock }) {
        resetGameData();
        saveGameRules({ ...loadGameRules(), zoneLockEnabled: zoneLock });
        const data = loadGameData();
        Object.assign(data, {
            seed, location, checklist,
            cardAnswers: [], exclusionZones: [], solved: [],
            gameStarted: true, version: 2
        });
        saveGameData(data);
        this.cm = new CardManager(seed);
        this.saveCards();
        this.lastAction = null;
    },

    saveCards() {
        localStorage.setItem(CARD_MANAGER_KEY, JSON.stringify(this.cm.getState()));
    },

    reset() {
        resetGameData();
        this.cm = null;
        this.lastAction = null;
    },

    data() { return loadGameData(); },
    bike() { return loadGameData().location; },
    checklist() { return loadGameData().checklist || { photos: {}, notes: {} }; },

    showBike() {
        try { return localStorage.getItem(SHOW_BIKE_KEY) === 'true'; } catch { return false; }
    },
    setShowBike(visible) {
        try { localStorage.setItem(SHOW_BIKE_KEY, String(visible)); } catch { /* geen opslag: enkel deze sessie */ }
    },

    /* ===== Flop ===== */

    flop() { return this.cm ? this.cm.getFlop() : []; },
    card(cardId) { return this.cm.deck.find(c => c.id === cardId); },
    deckLeft(phase) {
        return this.cm.deck.filter(c => c.phase === phase && !this.cm.isCardInFlop(c) && !this.cm.isCardDiscarded(c)).length;
    },

    solved() { return loadGameData().solved || []; },
    solvedOf(cardId) { return this.solved().find(s => s.cardId === cardId); },

    /* ===== Antwoorden als jullie eerst waren ===== */

    /**
     * Antwoordkeuzes voor een kaart (null = geen keuzes: taakkaart, wijk- of eliminatiekaart)
     */
    answerOptions(card) {
        switch (card.answerType) {
            case 'r40':
            case 'leie-schelde':
            case 'proximity':
            case 'dampoort':
            case 'watersportbaan':
            case 'bufferLine':
                return getAnswerButtonsForQuestion(card.question);
            case 'radiusProximity':
            case 'distanceFromBike':
            case 'SameOrAdjacentNeighborhood':
                return ['Ja', 'Nee'];
            case 'FurthestDistance':
                return getPOIsByType(card.poiType || 'colruyts').map(p => p.name);
            default:
                return null;
        }
    },

    /** Kaart die zones oplevert zodra de tegenstander antwoordt */
    asksQuestion(card) {
        return card.requiresAnswer !== false && card.answerType !== 'copyQuestion';
    },

    /**
     * Schrijf de zone van een antwoord weg (vervangt een eerdere zone van dezelfde kaart)
     * @param ownerId - kaart waaraan de zone hangt (bij kopiëren: de museumkaart)
     */
    applyZone(data, card, answer, ownerId) {
        data.cardAnswers = (data.cardAnswers || []).filter(a => a.cardId !== ownerId);
        data.exclusionZones = (data.exclusionZones || []).filter(z => z.cardId !== ownerId);
        const yesNo = answer.answer === 'Ja' ? 'yes' : 'no';

        switch (card.answerType) {
            case 'r40':
            case 'leie-schelde':
            case 'proximity':
            case 'dampoort':
            case 'watersportbaan':
            case 'bufferLine':
                data.cardAnswers.push({ cardId: ownerId, cardTask: card.task, opponentAnswer: answer.answer });
                break;
            case 'radiusProximity':
                data.exclusionZones.push({ type: 'radiusProximity', answer: yesNo, poiType: card.poiType, radius: card.radius, cardId: ownerId });
                break;
            case 'distanceFromBike':
                data.exclusionZones.push({ type: 'distanceFromBike', answer: yesNo, seekerLocation: answer.position, radius: card.radius, cardId: ownerId });
                break;
            case 'FurthestDistance': {
                const poi = getPOIsByType(card.poiType || 'colruyts').find(p => p.name === answer.answer);
                data.exclusionZones.push({ type: 'furthestDistance', answer: answer.answer, poiType: card.poiType || 'colruyts', selectedPOI: poi, cardId: ownerId });
                break;
            }
            case 'SameOrAdjacentNeighborhood':
                data.exclusionZones.push({
                    type: 'neighborhood', answer: yesNo, selectedNeighborhood: answer.wijk,
                    allowedNeighborhoods: [answer.wijk, ...getAdjacentNeighborhoods(answer.wijk)], cardId: ownerId
                });
                break;
            case 'eliminateNeighborhood':
                data.exclusionZones.push({
                    type: 'eliminateNeighborhood', answer: answer.answer,
                    neighborhoodData: CITY_NEIGHBORHOODS.find(n => n.name === answer.answer), cardId: ownerId
                });
                break;
        }
    },

    /**
     * Kaart oplossen (of een antwoord wijzigen)
     * @param by - "us" (jullie waren eerst) of "them" (de tegenstander was eerst)
     * @param answer - { answer, wijk, three, position } of { copy: { cardId, ...answer } } bij kopiëren
     * @returns de kaart die in de flop bijkwam, of null
     */
    solve(card, by, answer = {}) {
        const data = loadGameData();
        this.lastAction = { data: JSON.parse(JSON.stringify(data)), cards: JSON.parse(JSON.stringify(this.cm.getState())) };

        if (by === 'us') {
            if (card.answerType === 'copyQuestion' && answer.copy) {
                this.applyZone(data, this.card(answer.copy.cardId), answer.copy, card.id);
            } else if (this.asksQuestion(card)) {
                this.applyZone(data, card, answer, card.id);
            }
        }

        data.solved = data.solved || [];
        const existing = data.solved.find(s => s.cardId === card.id);
        let drawn = null;
        if (existing) {
            Object.assign(existing, { by, answer });
        } else {
            data.solved.push({ cardId: card.id, by, answer });
            const slot = this.cm.flop.findIndex(c => c.id === card.id);
            if (slot !== -1) {
                const before = new Set(this.cm.flop.map(c => c.id));
                this.cm.discardCard(slot);
                drawn = this.cm.flop.find(c => !before.has(c.id)) || null;
                this.saveCards();
            }
        }
        saveGameData(data);
        return drawn;
    },

    /** Een opgeloste kaart die gekopieerd werd, kan niet terug zolang de kopie bestaat */
    copiedBy(cardId) {
        const s = this.solved().find(x => x.answer && x.answer.copy && x.answer.copy.cardId === cardId);
        return s ? this.card(s.cardId) : null;
    },

    /**
     * Zet een opgeloste kaart terug in de flop (bv. per ongeluk "Wij" gekozen).
     * Antwoord en zone verdwijnen. De laatst getrokken kaart van die fase gaat terug naar het deck.
     */
    unsolve(cardId) {
        const card = this.card(cardId);
        if (!card || !this.solvedOf(cardId) || this.copiedBy(cardId)) return false;
        const data = loadGameData();
        this.lastAction = { data: JSON.parse(JSON.stringify(data)), cards: JSON.parse(JSON.stringify(this.cm.getState())) };

        data.solved = data.solved.filter(s => s.cardId !== cardId);
        data.cardAnswers = (data.cardAnswers || []).filter(a => a.cardId !== cardId);
        data.exclusionZones = (data.exclusionZones || []).filter(z => z.cardId !== cardId);
        saveGameData(data);

        const deckIndex = (c) => this.cm.deck.findIndex(d => d.id === c.id);
        this.cm.discarded = this.cm.discarded.filter(c => c.id !== cardId);
        const samePhase = this.cm.flop.filter(c => c.phase === card.phase);
        if (samePhase.length >= 4) {
            // De kaart die het laatst getrokken werd, maakt plaats en gaat terug in het deck
            const latest = samePhase.reduce((a, b) => deckIndex(b) > deckIndex(a) ? b : a);
            this.cm.flop[this.cm.flop.indexOf(latest)] = card;
        } else {
            this.cm.flop.push(card);
        }
        this.saveCards();
        return true;
    },

    undo() {
        if (!this.lastAction) return false;
        saveGameData(this.lastAction.data);
        const { flop, discarded, deckIndex } = this.lastAction.cards;
        this.cm.restoreFlop(flop, discarded, deckIndex);
        this.saveCards();
        this.lastAction = null;
        return true;
    },

    /** Vragen die je kan kopiëren: wat de tegenstander jullie vroeg (us) of wat jullie hen vroegen (them) */
    copyCandidates(by) {
        const solved = this.solved();
        const used = solved.filter(s => s.answer && s.answer.copy).map(s => s.answer.copy.cardId);
        return solved
            .filter(s => s.by === (by === 'us' ? 'them' : 'us') && !used.includes(s.cardId))
            .map(s => this.card(s.cardId))
            .filter(c => c && c.answerType !== 'copyQuestion');
    },

    /** Kort antwoord voor de lijst met opgeloste kaarten */
    answerText(card, answer) {
        if (!answer) return '';
        if (answer.copy) {
            const copied = this.card(answer.copy.cardId);
            return copied ? `gekopieerd: ${copied.question}${answer.copy.answer ? ` → ${this.answerText(copied, answer.copy)}` : ''}` : '';
        }
        if (card.answerType === 'SameOrAdjacentNeighborhood') return `${shortWijk(answer.wijk)}: ${answer.answer}`;
        if (card.answerType === 'eliminateNeighborhood') return `${shortWijk(answer.answer)} geëlimineerd`;
        return answer.answer || 'voltooid';
    },

    /* ===== Jij antwoordt (de tegenstander was eerst) ===== */

    /**
     * Wat jij moet antwoorden over je eigen fiets
     * @returns { kind, ... } voor de UI
     */
    hideAnswer(card) {
        const bike = this.bike();
        if (!bike) return { kind: 'text', text: 'Geen fietslocatie ingesteld.' };
        const checks = performAllChecks(bike.lat, bike.lng).checks || {};
        const near = (type) => getPOIsByType(type)
            .map(p => ({ name: p.name, d: calculateDistance(bike.lat, bike.lng, p.lat, p.lng) }))
            .sort((a, b) => a.d - b.d);

        switch (card.answerType) {
            case 'r40': return { kind: 'big', text: checks.r40.answer, why: checks.r40.inside ? 'Je fiets staat binnen de ring.' : 'Je fiets staat buiten de ring.' };
            case 'leie-schelde': return { kind: 'big', text: checks.leieSchelde.answer };
            case 'dampoort': return { kind: 'big', text: checks.dampoort.answer };
            case 'watersportbaan': return { kind: 'big', text: checks.watersportbaan.answer };
            case 'bufferLine': return { kind: 'big', text: checks.railwayBuffer.answer, tone: checks.railwayBuffer.inside ? 'yes' : 'no' };
            case 'proximity': {
                const w = checks.webaIkea;
                return { kind: 'big', text: w.answer, why: `Weba op ${formatMeters(w.distanceWeba)}, IKEA op ${formatMeters(w.distanceIkea)}.` };
            }
            case 'radiusProximity': {
                const [closest] = near(card.poiType);
                const yes = closest && closest.d <= card.radius;
                return { kind: 'big', text: yes ? 'Ja' : 'Nee', tone: yes ? 'yes' : 'no', why: closest ? `Dichtste: ${closest.name} op ${formatMeters(closest.d)}.` : '' };
            }
            case 'FurthestDistance': {
                const [closest, ...rest] = near(card.poiType || 'colruyts');
                return { kind: 'valid', label: 'Noem één van deze', valid: rest.map(p => [p.name, formatMeters(p.d)]), invalid: closest ? [[closest.name, `dichtste · ${formatMeters(closest.d)}`]] : [] };
            }
            case 'distanceFromBike': return { kind: 'distance', radius: card.radius };
            case 'SameOrAdjacentNeighborhood': return { kind: 'wijk' };
            case 'eliminateNeighborhood': return { kind: 'elim' };
            case 'copyQuestion': return { kind: 'copy' };
        }

        // Kaarten zonder vraag: antwoord uit de checklist
        const q = card.question || '';
        const notes = this.checklist().notes || {};
        if (/eenrichting/i.test(q)) return { kind: 'big', text: notes.eenrichting || '?', tone: notes.eenrichting === 'Ja' ? 'yes' : 'no', why: 'Zo ingevuld bij het verstoppen.' };
        if (/boom/i.test(q)) return { kind: 'big', text: notes.boom || '?', tone: notes.boom === 'Ja' ? 'yes' : 'no', why: 'Zo ingevuld bij het verstoppen.' };
        if (/straatnaam/i.test(q)) {
            const name = notes.straat || '';
            return { kind: 'big', text: `${name.length} tekens`, why: `“${name}”, spaties en leestekens meegeteld.` };
        }
        if (/foto/i.test(q)) {
            const photo = PHOTO_QUESTIONS.find(([re]) => re.test(q));
            return { kind: 'big', small: true, text: `Stuur je foto ${photo ? photo[1] : ''}`.trim(), why: 'Die nam je bij het verstoppen. Je vindt hem in je galerij.' };
        }
        return { kind: 'text', text: 'Stuur het bewijs van de taak door.' };
    },

    /** Afstandsvraag: staat je fiets binnen de straal van hun positie? */
    distanceAnswer(position, radius) {
        const bike = this.bike();
        const d = calculateDistance(position.lat, position.lng, bike.lat, bike.lng);
        return { yes: d <= radius, distance: d };
    },

    /** Wijkvraag: staat je fiets in die wijk of een buurwijk? */
    wijkAnswer(wijk) {
        const bike = this.bike();
        const own = getNeighborhoodAtLocation(bike.lat, bike.lng);
        const ownName = own ? own.name : null;
        return { yes: wijk === ownName || getAdjacentNeighborhoods(ownName || '').includes(wijk), own: ownName };
    },

    /** Eliminatievraag: welke van de 3 wijken mag je elimineren? */
    elimAnswer(three) {
        const own = this.wijkAnswer(three[0]).own;
        return { valid: three.filter(w => w !== own), own, ownInList: three.includes(own) };
    }
};

function formatMeters(m) {
    return m >= 1000 ? `${(m / 1000).toLocaleString('nl-BE', { maximumFractionDigits: 1 })} km` : `${Math.round(m)} m`;
}

function shortWijk(name) {
    return (name || '').split(' - ')[0];
}

/**
 * Antwoordknoppen voor vragen met twee vaste antwoorden
 */
function getAnswerButtonsForQuestion(question) {
    if (question.includes('Binnen of buiten R40')) return ['Binnen R40', 'Buiten R40'];
    if (question.includes('Noorden of zuiden')) return ['Noorden van Leie-Schelde', 'Zuiden van Leie-Schelde'];
    if (question.includes('Dichter bij Weba of IKEA')) return ['Dichter bij Weba', 'Dichter bij IKEA'];
    if (question.includes('Dampoort')) return ['Oosten van Dampoort', 'Westen van Dampoort'];
    if (question.includes('watersportbaan')) return ['Oosten van watersportbaan tip', 'Westen van watersportbaan tip'];
    if (question.includes('800m van het de spoorlijn') || question.includes('spoorlijn')) return ['Binnen 800m van spoorlijn', 'Buiten 800m van spoorlijn'];
    return ['Ja', 'Nee'];
}
