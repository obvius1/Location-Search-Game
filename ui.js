// Schermen voor Gent Location Game (gsm eerst): wizard bij de start, tabs Kaart · Kaarten · Meer,
// onderbladen per kaart en een melding bovenaan. Spellogica zit in game.js, de kaart in map.js.

const PHASES = { 1: 'Fase 1 · vroeg', 2: 'Fase 2 · midden', 3: 'Fase 3 · laat' };
const LIVE_KEY = 'liveLocation';
const DESKTOP_WIDTH = 900;
let RULES_LIST = [];
let OPTIONAL_RULE_TEXTS = [];

const ui = {
    screen: 'loading',      // 'wizard' of 'game'
    tab: 'cards',           // 'map', 'cards' of 'more'
    sheet: null,            // { type: 'card', cardId, mode, copyId, wijk, three, position } of { type: 'coords' }
    toast: null,
    undoable: false,
    legend: false,
    mapCtx: null,           // context op de grote kaart: { cardId, extra, title }
    pin: null,
    confirmReset: false,
    wizard: null
};

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtCoord = (p) => `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
const ARROW = '<svg class="arrow" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const ICONS = {
    map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 3v15M15 6v15" stroke="currentColor" stroke-width="2"/>',
    cards: '<rect x="4" y="5" width="12" height="16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3h12v16" fill="none" stroke="currentColor" stroke-width="2"/>',
    more: '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2"/>',
    coords: '<path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
    bikeOn: '<circle cx="6" cy="16" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="16" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 16l4-7h5l3 7M10 9L8.5 6H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    bikeOff: '<circle cx="6" cy="16" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="16" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 16l4-7h5l3 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2.5"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6" stroke="currentColor" stroke-width="2.5"/><circle cx="12" cy="7.5" r="1.4" fill="currentColor"/>',
    pinOff: '<path d="M12 21c-4-5-7-8-7-12a7 7 0 0 1 14 0c0 4-3 7-7 12z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2.5"/>'
};

/* ===== Hulpfuncties ===== */

function parseCoords(text) {
    const parts = String(text || '').split(',').map(s => parseFloat(s.trim()));
    if (parts.length !== 2 || parts.some(n => !isFinite(n))) return null;
    return { lat: parts[0], lng: parts[1] };
}
function livePosition() {
    return currentLiveLat != null ? { lat: currentLiveLat, lng: currentLiveLng } : null;
}
function livePref() {
    try { return localStorage.getItem(LIVE_KEY) !== 'false'; } catch { return true; }
}
function zoneRuleOn() {
    return getGameRule('zoneLockEnabled') !== false;
}
function isDesktop() {
    return window.innerWidth >= DESKTOP_WIDTH;
}
function wijkSelect(id, value, cls = '') {
    const names = CITY_NEIGHBORHOODS.map(n => n.name).sort((a, b) => a.localeCompare(b, 'nl'));
    return `<select class="input ${cls}" id="${id}"><option value="">Kies een wijk</option>${names.map(n => `<option ${n === value ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
}
function validList(valid, invalid) {
    return `<div class="valid">${valid.map(([n, extra]) => `<div><span class="mark yes">✓</span><span class="name">${esc(n)}</span><span class="d mono">${esc(extra || '')}</span></div>`).join('')}
        ${invalid.map(([n, extra]) => `<div class="off"><span class="mark no">✗</span><span class="name">${esc(n)}</span><span class="d">${esc(extra || '')}</span></div>`).join('')}</div>`;
}
async function copyText(text, btn) {
    const label = btn.textContent;
    let ok = false;
    try {
        await navigator.clipboard.writeText(text);
        ok = true;
    } catch {
        // Terugval zonder toetsenbord: onzichtbaar tekstvak, kopiëren, weer weg
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.appendChild(area);
        area.select();
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        area.remove();
        btn.blur();
    }
    btn.textContent = ok ? 'Gekopieerd' : 'Lukt niet';
    setTimeout(() => { if (btn.isConnected) btn.textContent = label; }, 2000);
}
async function loadRulesData() {
    try {
        const data = await (await fetch('data/rules.json?t=' + Date.now())).json();
        RULES_LIST = data.rules || [];
        OPTIONAL_RULE_TEXTS = (data.optionalRules || []).filter(r => r.key === 'zoneLockEnabled').map(r => r.text);
    } catch (error) {
        console.error('Fout bij laden spelregels:', error);
    }
}
function newWizard() {
    return {
        step: 1, code: generateSeed(), zoneLock: true, location: null, accuracy: null, gpsBusy: false, gpsError: null,
        photos: {}, notes: { straat: '', eenrichting: null, boom: null }
    };
}

/* ===== Opstart ===== */

const UI = {
    /** Wordt aangeroepen door map.js als zones of live positie veranderen */
    refreshMapStatus() {
        if (ui.screen === 'game' && ui.tab === 'map' && !ui.sheet) renderMapOverlay();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadZones();
    await loadNeighborhoods();
    await loadRailwayData();
    await loadCards();
    await loadRulesData();

    initializeMap();
    if (Game.restore()) {
        ui.screen = 'game';
        ui.tab = 'map';
        updateExclusionZones();
        showBikeOnMap();
    } else {
        ui.screen = 'wizard';
        ui.wizard = newWizard();
        ui.wizard.zoneLock = zoneRuleOn();
    }
    if (livePref()) startLiveLocation();

    // Klik op de kaart tijdens het instellen van de locatie: fiets daar zetten
    map.on('click', (event) => {
        if (ui.screen === 'wizard' && ui.wizard.step === 2) setWizardLocation(event.latlng);
    });

    render();
    setTimeout(() => fitToField(), 60);
});

window.addEventListener('beforeunload', () => {
    if (liveWatchId !== null) navigator.geolocation.clearWatch(liveWatchId);
});

function showBikeOnMap() {
    setBikeMarker(Game.bike(), { visible: Game.showBike() });
}

/* ===== Weergave ===== */

function render() {
    renderHeader();
    renderTabs();
    renderPanel();
    renderMapOverlay();
    renderOverlay();
    if (map) map.invalidateSize();
}

function renderHeader() {
    if (ui.screen === 'wizard') {
        $('#top-title').textContent = 'Nieuw spel';
        $('#top-sub').textContent = `stap ${ui.wizard.step}/3`;
        return;
    }
    const titles = { map: 'Kaart', cards: 'Kaarten', more: 'Meer' };
    $('#top-title').textContent = titles[ui.tab];
    $('#top-sub').textContent = `${Game.data().seed} · ${Game.solved().length} opgelost`;
}

function renderTabs() {
    const tabs = $('#tabs');
    tabs.hidden = ui.screen !== 'game';
    if (tabs.hidden) return;
    const flopCount = Game.flop().length;
    tabs.innerHTML = [['map', 'Kaart'], ['cards', 'Kaarten'], ['more', 'Meer']].map(([key, label]) =>
        `<button class="tab" role="tab" aria-selected="${ui.tab === key}" data-tab="${key}">
            <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[key]}</svg>${label}${key === 'cards' && flopCount ? `<span class="count">${flopCount}</span>` : ''}
        </button>`).join('');
}

function renderPanel() {
    const panel = $('#panel');
    let html = '';
    if (ui.screen === 'wizard') {
        if (ui.wizard.step !== 2) html = renderWizard();
    } else if (!ui.sheet) {
        if (ui.tab === 'cards') html = renderCards();
        if (ui.tab === 'more') html = renderMore();
    } else if (isDesktop()) {
        // Op desktop ligt het onderblad rechts, dus het paneel mag blijven
        if (ui.tab === 'cards') html = renderCards();
        if (ui.tab === 'more') html = renderMore();
    }
    panel.hidden = !html;
    if (html) {
        const scroll = panel.scrollTop;
        panel.innerHTML = html;
        panel.scrollTop = scroll;
    }
}

/* ===== Kaart-overlay ===== */

function iconButton(attrs, icon, label, pressed = null) {
    return `<button class="map-btn" ${attrs} aria-label="${label}" title="${label}" ${pressed === null ? '' : `aria-pressed="${pressed}"`}><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></button>`;
}

function renderMapOverlay() {
    const overlay = $('#map-overlay');
    if (ui.screen !== 'game' || ui.tab !== 'map' || ui.sheet) { overlay.innerHTML = ''; return; }
    const showBike = Game.showBike();
    const ctxCard = ui.mapCtx && Game.card(ui.mapCtx.cardId);
    let zoneChip = '';
    if (zoneRuleOn()) {
        const pos = livePosition();
        if (!pos) zoneChip = '<div class="map-chip zone-chip">Wacht op je GPS-positie</div>';
        else if (isPointExcluded(pos.lat, pos.lng)) zoneChip = '<div class="map-chip zone-chip bad">Uitgesloten zone · geen taken hier</div>';
        else zoneChip = '<div class="map-chip zone-chip">Open zone · taken mogen</div>';
    }
    overlay.innerHTML = `
        <div class="map-tl">
            <div class="map-chip pct" title="Deel van het speelveld waar de fiets van de tegenstander nog kan liggen"><strong>${remainingFieldPercent()}%</strong> nog mogelijk</div>
            ${ctxCard ? `<div class="map-chip ctx-chip"><span>${esc(ui.mapCtx.title)}</span><button id="clear-ctx" aria-label="Context wissen">×</button></div>` : ''}
        </div>
        <div class="map-tr">
            ${iconButton('data-open="coords"', ICONS.coords, 'Coördinaten')}
            ${iconButton('id="toggle-bike"', showBike ? ICONS.bikeOn : ICONS.bikeOff, showBike ? 'Fiets verbergen' : 'Toon mijn fiets', showBike)}
            ${ui.pin ? iconButton('id="clear-pin"', ICONS.pinOff, 'Pin wissen') : ''}
            ${iconButton('id="toggle-legend"', ICONS.info, 'Legende', ui.legend)}
        </div>
        ${ui.legend ? `<div class="map-legend">
            <span><i class="sw" style="background:color-mix(in srgb, var(--zone) 45%, var(--surface))"></i>Uitgesloten</span>
            <span><i class="sw" style="background:var(--water);border-radius:50%"></i>Jij (live)</span>
            <span><i class="sw" style="background:var(--ok)"></i>Jouw fiets${showBike ? '' : ' (verborgen)'}</span>
            <span><i class="sw" style="background:#C48A00"></i>R40</span>
            <span><i class="sw" style="background:#2A6FAE"></i>Leie-Schelde</span>
        </div>` : ''}
        <div class="map-bl">${zoneChip}</div>`;
}

/* ===== Kaarten (de gedeelde flop) ===== */

function renderCards() {
    const flop = Game.flop();
    const group = (phase) => {
        const list = flop.filter(c => c.phase === phase);
        return `<section class="block"><h2 class="head"><i class="line-mark lm${phase}"></i><span style="white-space:nowrap">${PHASES[phase]}</span><span class="n">${list.length} in flop · ${Game.deckLeft(phase)} in deck</span></h2>
            ${list.length ? `<div class="list">${list.map(c => `<button class="row" data-card="${c.id}">
                <div class="txt"><div class="q">${esc(c.question)}</div><div class="meta">${esc(c.task)}</div></div>${ARROW}</button>`).join('')}</div>`
                : '<p class="why">Geen kaarten meer in deze fase.</p>'}</section>`;
    };
    const solved = [...Game.solved()].reverse();
    return `<div class="pad">
        <p class="lede">Beide teams hebben deze kaarten. Wie een taak eerst doet, stelt de vraag. Was de tegenstander eerst, dan zie je meteen wat jij moet antwoorden.</p>
        ${group(1)}${group(2)}${group(3)}
        ${solved.length ? `<section class="block"><h2 class="head">Opgelost<span class="n">${solved.length}</span></h2>
            <div class="list">${solved.map(s => {
                const card = Game.card(s.cardId);
                const meta = s.by === 'them' ? 'De tegenstander was eerst' : `Jullie · ${Game.answerText(card, s.answer)}`;
                return `<button class="row done" data-card="${s.cardId}"><div class="txt"><div class="q">${esc(card.question)}</div><div class="meta">${esc(meta)}</div></div>${ARROW}</button>`;
            }).join('')}</div></section>` : ''}
    </div>`;
}

/* ===== Kaartvenster ===== */

function openCard(cardId) {
    const s = Game.solvedOf(cardId);
    const answer = s ? (s.answer.copy || s.answer) : {};
    const pos = answer.position || livePosition();
    ui.sheet = {
        type: 'card', cardId, mode: s ? s.by : null,
        copyId: s && s.answer.copy ? s.answer.copy.cardId : null,
        wijk: answer.wijk || '',
        three: answer.three ? [...answer.three] : ['', '', ''],
        position: pos ? fmtCoord(pos) : '',
        error: null
    };
    showSheetContext();
}

function sheetTarget() {
    const sh = ui.sheet;
    return sh.copyId ? Game.card(sh.copyId) : Game.card(sh.cardId);
}

function sheetExtra() {
    const sh = ui.sheet;
    return { wijk: sh.wijk, three: sh.three, position: parseCoords(sh.position) };
}

/** Toon op de kaart waar de (gekopieerde) vraag over gaat, boven het onderblad */
function showSheetContext() {
    const target = sheetTarget();
    if (target.answerType === 'copyQuestion') { clearCardContext(); return; }
    // Aan de kant van de tegenstander tekenen we pas iets als jij hun gegevens invult
    showCardContext(target, ui.sheet.mode === 'them' ? { position: null } : sheetExtra());
}

function fitAboveSheet() {
    const sheet = $('.sheet');
    fitToContext(sheet && !isDesktop() ? sheet.offsetHeight : 0);
}

function closeSheet() {
    ui.sheet = null;
    if (ui.mapCtx) showCardContext(Game.card(ui.mapCtx.cardId), ui.mapCtx.extra);
    else clearCardContext();
    render();
}

/** Volgorde om door te bladeren: de flop zoals in de lijst, of de opgeloste kaarten */
function sheetNavList(cardId) {
    if (Game.solvedOf(cardId)) return [...Game.solved()].reverse().map(s => s.cardId);
    return [1, 2, 3].flatMap(phase => Game.flop().filter(c => c.phase === phase).map(c => c.id));
}

function cardSheet() {
    const sh = ui.sheet;
    const card = Game.card(sh.cardId);
    const s = Game.solvedOf(card.id);
    const list = sheetNavList(card.id);
    const pos = list.indexOf(card.id);
    const nav = list.length > 1 && pos !== -1 ? `<div class="sheet-nav">
            <button class="nav-btn" data-nav="${list[pos - 1] || ''}" ${pos === 0 ? 'disabled' : ''} aria-label="Vorige kaart">‹</button>
            <button class="nav-btn" data-nav="${list[pos + 1] || ''}" ${pos === list.length - 1 ? 'disabled' : ''} aria-label="Volgende kaart">›</button></div>` : '';
    const head = `<div class="sheet-head"><span class="phase"><i class="line-mark lm${card.phase}"></i>${PHASES[card.phase]}</span>${nav}<button class="close" data-close aria-label="Sluiten">×</button></div>
        ${sh.mode ? '' : `<h2 class="task">${esc(card.task)}</h2>`}
        <div class="ask"><div class="k">Vraag</div><div class="v">${esc(card.question)}</div></div>
        ${card.link ? `<a class="link" href="${esc(card.link)}" target="_blank" rel="noopener">Meer info</a>` : ''}`;
    const back = s ? '' : '<button class="link" data-mode="">← Andere keuze</button>';
    const error = sh.error ? `<div class="note bad">${esc(sh.error)}</div>` : '';
    const mapLink = sheetTarget().answerType !== 'copyQuestion' ? '<button class="link" id="ctx-big">Groot op de kaart</button>' : '';

    if (!sh.mode) {
        const pos = livePosition();
        const ruleNote = zoneRuleOn() && pos && isPointExcluded(pos.lat, pos.lng)
            ? '<div class="note bad"><strong>Je staat in een uitgesloten zone.</strong> Volgens de optionele regel doe je deze taak hier niet.</div>' : '';
        return head + mapLink + ruleNote + `<div class="field sheet-foot"><span class="label">Wie deed de taak eerst?</span>
            <div class="pair"><button class="btn btn-main" data-mode="us">Wij</button><button class="btn" data-mode="them">De tegenstander</button></div></div>`;
    }

    // Museumkaart: eerst kiezen welke vraag gekopieerd wordt
    if (card.answerType === 'copyQuestion') {
        if (!sh.copyId) {
            const list = Game.copyCandidates(sh.mode);
            if (!list.length) {
                return head + `<div class="note">${sh.mode === 'us' ? 'De tegenstander stelde jullie nog geen vraag die je kan kopiëren.' : 'Jullie stelden nog geen vraag die de tegenstander kan kopiëren.'} Deze kaart blijft in de flop tot er iets te kopiëren valt.</div>${back}`;
            }
            const intro = sh.mode === 'us' ? 'Welke vraag van de tegenstander kopiëren jullie?' : 'Welke van jullie vragen kopieert de tegenstander?';
            return head + `<div class="field"><span class="label">${intro}</span><div class="list">${list.map(c =>
                `<button class="row" data-copy-pick="${c.id}"><div class="txt"><div class="q">${esc(c.question)}</div></div>${ARROW}</button>`).join('')}</div></div>${back}`;
        }
        const copied = Game.card(sh.copyId);
        const chosen = `<div class="ask"><div class="k">Gekopieerde vraag</div><div class="v">${esc(copied.question)}</div></div>`;
        const reselect = s ? '' : '<button class="link" id="copy-reselect">← Andere vraag kopiëren</button>';
        if (sh.mode === 'us') {
            const current = s && s.by === 'us' && s.answer.copy ? s.answer.copy : null;
            return head + chosen + mapLink + error + seekControls(copied, current) + reselect;
        }
        return head + chosen + mapLink + `<div class="field"><span class="label">Jouw antwoord over je fiets</span>${hideBlock(copied)}</div>` +
            (s ? '<p class="why">Deze kaart is opgelost door de tegenstander.</p>' : `${reselect}<div class="sheet-foot"><button class="btn btn-main" data-them-done>Geantwoord, kaart uit de flop</button></div>`);
    }

    if (sh.mode === 'us') {
        const current = s && s.by === 'us' ? s.answer : null;
        return head + mapLink + error + seekControls(card, current) + back;
    }
    return head + mapLink + `<div class="field"><span class="label">Jouw antwoord over je fiets</span>${hideBlock(card)}</div>
        ${s ? '<p class="why">Deze kaart is opgelost door de tegenstander.</p>' : `${back}<div class="sheet-foot"><button class="btn btn-main" data-them-done>Geantwoord, kaart uit de flop</button></div>`}`;
}

/** Antwoordknoppen als jullie eerst waren */
function seekControls(card, current) {
    const sh = ui.sheet;
    const chosen = current ? current.answer : null;
    if (!Game.asksQuestion(card)) {
        return `<div class="field"><span class="label">${card.requiresAnswer === false ? 'Jullie deden de taak eerst' : 'Antwoord van de tegenstander'}</span>
            <button class="btn btn-main" data-answer="__task">${card.requiresAnswer === false ? 'Taak voltooid' : 'Ontvangen'}</button></div>`;
    }
    let extra = '';
    let options = Game.answerOptions(card);
    if (card.answerType === 'distanceFromBike') {
        extra = `<div class="field"><label for="seek-pos">Jouw positie (stuur door naar de tegenstander)</label>
            <div class="inline"><input class="input mono" id="seek-pos" value="${esc(sh.position)}" placeholder="51.0543, 3.7234" inputmode="decimal"><button class="btn" id="copy-seek-pos">Kopieer</button></div></div>`;
    }
    if (card.answerType === 'SameOrAdjacentNeighborhood') {
        const adjacent = sh.wijk ? getAdjacentNeighborhoods(sh.wijk) : [];
        extra = `<div class="field"><label for="seek-wijk">Wijk van jullie item</label>${wijkSelect('seek-wijk', sh.wijk)}
            ${adjacent.length ? `<p class="why">Buurwijken: ${adjacent.map(shortWijk).map(esc).join(', ')}</p>` : ''}</div>`;
    }
    if (card.answerType === 'eliminateNeighborhood') {
        extra = [0, 1, 2].map(i => `<div class="field"><label for="seek-elim-${i}">Wijk ${i + 1} die jullie noemen</label>${wijkSelect(`seek-elim-${i}`, sh.three[i], 'seek-elim')}</div>`).join('');
        const filled = sh.three.filter(Boolean);
        options = new Set(filled).size === 3 ? filled : null;
        if (!options) return extra + '<p class="why">Kies 3 verschillende wijken. Daarna duid je aan welke de tegenstander elimineerde.</p>';
        return extra + `<div class="field"><span class="label">Welke wijk elimineerde de tegenstander?</span><div class="options">${options.map(o =>
            `<button class="option" data-answer="${esc(o)}" aria-pressed="${chosen === o}"><i class="ring"></i>${esc(o)}</button>`).join('')}</div></div>`;
    }
    const choices = options.length === 2
        ? `<div class="pair">${options.map(o => `<button class="btn ${chosen === o ? 'btn-main' : ''}" data-answer="${esc(o)}">${esc(o)}</button>`).join('')}</div>`
        : `<div class="options">${options.map(o => `<button class="option" data-answer="${esc(o)}" aria-pressed="${chosen === o}"><i class="ring"></i>${esc(o)}</button>`).join('')}</div>`;
    return extra + `<div class="field"><span class="label">Antwoord van de tegenstander</span>${choices}</div>`;
}

/** Wat jij antwoordt over je fiets als de tegenstander eerst was */
function hideBlock(card) {
    const info = Game.hideAnswer(card);
    switch (info.kind) {
        case 'big': return `<div class="answer-big ${info.tone || ''} ${info.small ? 'small' : ''}">${esc(info.text)}</div>${info.why ? `<p class="why">${esc(info.why)}</p>` : ''}`;
        case 'valid': return `<div class="field"><span class="label">${esc(info.label)}</span>${validList(info.valid, info.invalid)}</div>`;
        case 'distance': return `<div class="field"><label for="opp-pos">Coördinaten die de tegenstander stuurt</label><input class="input mono" id="opp-pos" placeholder="51.0543, 3.7234" inputmode="decimal" data-radius="${info.radius}"></div><div id="dist-out" class="block"></div>`;
        case 'wijk': return `<div class="field"><label for="hide-wijk">Wijk die de tegenstander noemt</label>${wijkSelect('hide-wijk', '')}</div><div id="wijk-out" class="block"></div>`;
        case 'elim': return [0, 1, 2].map(i => `<div class="field"><label for="hide-elim-${i}">Wijk ${i + 1}</label>${wijkSelect(`hide-elim-${i}`, '', 'hide-elim')}</div>`).join('') + '<div id="elim-out" class="block"></div>';
        default: return `<p>${esc(info.text || '')}</p>`;
    }
}

function updateHideOutputs() {
    const dist = $('#dist-out');
    if (dist) {
        const input = $('#opp-pos'), p = parseCoords(input.value), radius = +input.dataset.radius;
        if (!p) dist.innerHTML = '<p class="why">Plak de coördinaten als “51.0543, 3.7234”.</p>';
        else {
            const r = Game.distanceAnswer(p, radius);
            dist.innerHTML = `<div class="answer-big ${r.yes ? 'yes' : 'no'}">${r.yes ? 'Ja' : 'Nee'}</div><p class="why">Je fiets staat op ${formatMeters(r.distance)} van hun positie. De grens is ${formatMeters(radius)}.</p>`;
        }
    }
    const wijkOut = $('#wijk-out');
    if (wijkOut) {
        const w = $('#hide-wijk').value;
        if (!w) wijkOut.innerHTML = '';
        else {
            const r = Game.wijkAnswer(w);
            wijkOut.innerHTML = `<div class="answer-big ${r.yes ? 'yes' : 'no'}">${r.yes ? 'Ja' : 'Nee'}</div><p class="why">Je fiets staat in ${esc(r.own || 'geen wijk')}. ${r.yes ? (w === r.own ? 'Dat is dezelfde wijk.' : `${esc(w)} grenst eraan.`) : `${esc(w)} grenst er niet aan.`}</p>`;
        }
    }
    const elimOut = $('#elim-out');
    if (elimOut) {
        const three = [...document.querySelectorAll('.hide-elim')].map(s => s.value);
        if (three.some(w => !w) || new Set(three).size < 3) elimOut.innerHTML = '<p class="why">Kies de 3 verschillende wijken die de tegenstander noemt.</p>';
        else {
            const r = Game.elimAnswer(three);
            elimOut.innerHTML = `<div class="field"><span class="label">Elimineer één van deze</span>${validList(r.valid.map(w => [w]), r.ownInList ? [[r.own, 'daar staat je fiets']] : [])}</div>`;
        }
    }
}

/* ===== Coördinaten ===== */

function coordsSheet() {
    const pos = livePosition();
    return `<div class="sheet-head"><span>Coördinaten</span><button class="close" data-close aria-label="Sluiten">×</button></div>
        <div class="field"><span class="label">Jouw positie nu</span>
            ${pos ? `<div class="inline"><input class="input mono" value="${fmtCoord(pos)}" readonly aria-label="Jouw positie"><button class="btn" data-copy-text="${fmtCoord(pos)}">Kopieer</button></div>
                <p class="why">Stuur dit door als de tegenstander om je positie vraagt.</p>`
                : '<p class="why">Nog geen GPS-positie. Zet live locatie aan onder Meer, of wacht even buiten.</p>'}
        </div>
        <div class="field"><label for="check-pos">Coördinaten nakijken</label>
            <input class="input mono" id="check-pos" placeholder="51.0543, 3.7234" inputmode="decimal">
            <p class="why">Bijvoorbeeld de positie die de tegenstander je stuurt.</p></div>
        <div id="check-out" class="block"></div>`;
}

function updateCheckOutput() {
    const out = $('#check-out');
    if (!out) return;
    const p = parseCoords($('#check-pos').value);
    if (!p) { out.innerHTML = ''; return; }
    const inField = isWithinGameZone(p.lat, p.lng).valid;
    const bike = Game.bike(), me = livePosition();
    const excluded = inField && isPointExcluded(p.lat, p.lng);
    const rows = [
        ['Speelveld', inField ? 'Binnen het speelveld' : 'Buiten het speelveld', inField ? 'yes' : 'no'],
        bike ? ['Tot jouw fiets', formatMeters(calculateDistance(p.lat, p.lng, bike.lat, bike.lng)), ''] : null,
        me ? ['Tot jou', formatMeters(calculateDistance(p.lat, p.lng, me.lat, me.lng)), ''] : null,
        inField ? ['Jouw kaart', excluded ? 'In een uitgesloten zone' : 'In een open zone', excluded ? 'no' : 'yes'] : null
    ].filter(Boolean);
    out.innerHTML = `<dl class="kv">${rows.map(([k, v, c]) => `<dt>${k}</dt><dd class="${c}">${v}</dd>`).join('')}</dl>
        <button class="btn" id="pin-to-map">Toon op de kaart</button>`;
}

/* ===== Meer ===== */

function ruleToggle(locked, checked) {
    return `<label class="toggle"><div class="txt"><div class="q" style="font-weight:700">Geen taken in uitgesloten zones</div>
        <div class="meta">${OPTIONAL_RULE_TEXTS.map(esc).join(' ')}</div></div>
        <input type="checkbox" class="switch" id="zone-rule" ${checked ? 'checked' : ''} ${locked ? 'disabled' : ''} aria-label="Geen taken in uitgesloten zones"></label>`;
}

function renderMore() {
    const data = Game.data();
    const showBike = Game.showBike();
    const bike = data.location;
    const notes = (data.checklist && data.checklist.notes) || {};
    const wijk = bike ? getNeighborhoodAtLocation(bike.lat, bike.lng) : null;
    return `<div class="pad">
        <section class="block"><h2 class="head">Spelcode</h2>
            <div class="inline"><input class="input code-in" style="font-size:24px;text-align:left" value="${esc(data.seed)}" readonly aria-label="Spelcode"><button class="btn" data-copy-text="${esc(data.seed)}">Kopieer</button></div>
            <p class="why">Beide teams gebruiken dezelfde code, dus jullie hebben dezelfde kaarten.</p></section>
        <section class="block"><h2 class="head">Optionele spelregels</h2>${ruleToggle(true, zoneRuleOn())}
            <p class="why">Vast tijdens het spel. Beide teams spreken dit af bij de start.</p></section>
        <section class="block"><h2 class="head">Locatie</h2>
            <button class="row" data-open="coords"><div class="txt"><div class="q">Positie delen of coördinaten nakijken</div></div>${ARROW}</button>
            <label class="toggle"><div class="txt"><div class="q" style="font-weight:700">Live locatie</div><div class="meta">Toont waar je bent en of je in een uitgesloten zone staat. Uitzetten spaart batterij.</div></div>
                <input type="checkbox" class="switch" id="live-toggle" ${liveTrackingEnabled ? 'checked' : ''} aria-label="Live locatie"></label></section>
        <section class="block"><h2 class="head">Jouw fiets</h2>
            ${showBike && bike
                ? `<dl class="kv"><dt>Wijk</dt><dd>${esc(wijk ? wijk.name : 'onbekend')}</dd><dt>Coördinaten</dt><dd class="mono">${fmtCoord(bike)}</dd>
                    <dt>Straatnaam</dt><dd>${esc(notes.straat || '')}</dd><dt>Eenrichting</dt><dd>${esc(notes.eenrichting || '')}</dd><dt>Boom (min. 2 m hoog) binnen 5 m</dt><dd>${esc(notes.boom || '')}</dd></dl>`
                : '<p class="why">Verborgen, zodat niemand de plek op je scherm ziet.</p>'}
            <button class="btn ${showBike ? '' : 'btn-quiet'}" id="toggle-bike">${showBike ? 'Fiets verbergen' : 'Toon mijn fiets'}</button></section>
        <section class="block"><h2 class="head">Spelregels</h2><ol class="rules">${RULES_LIST.map(r => `<li>${esc(r)}</li>`).join('')}</ol></section>
        <section class="block"><h2 class="head">Spel</h2>
            ${ui.confirmReset ? `<p><strong>Dit wist alle antwoorden, zones en je fietslocatie op dit toestel.</strong></p>
                <div class="pair"><button class="btn btn-danger" id="reset-yes">Nieuw spel</button><button class="btn" id="reset-no">Annuleer</button></div>`
                : '<button class="btn btn-quiet" id="reset">Nieuw spel starten</button>'}</section>
    </div>`;
}

/* ===== Wizard ===== */

function renderWizard() {
    const w = ui.wizard;
    const steps = `<div class="steps" aria-label="Stap ${w.step} van 3">${[1, 2, 3].map(i => `<i class="${i <= w.step ? 'on' : ''}"></i>`).join('')}</div>`;
    if (w.step === 1) {
        return `<div class="pad">${steps}
            <h2 class="step-title">Spelcode en regels</h2>
            <p class="lede">Spreek één code af met het andere team. Zo hebben jullie dezelfde kaarten.</p>
            <input class="input code-in" id="wiz-code" value="${esc(w.code)}" maxlength="8" autocomplete="off" aria-label="Spelcode">
            <button class="link" id="wiz-gen" style="align-self:center">Maak een nieuwe code</button>
            <section class="block"><h2 class="head">Optionele spelregels</h2>${ruleToggle(false, w.zoneLock)}
                <p class="why">Kies hetzelfde als het andere team. Tijdens het spel ligt dit vast.</p></section>
            <button class="btn btn-main" id="wiz-next">Verder</button>
        </div>`;
    }
    const photoItems = (GAME_CARDS.hiderChecklist || []).slice(0, 6);
    const done = photoItems.filter((_, i) => w.photos[i]).length;
    const notesDone = w.notes.straat.trim() && w.notes.eenrichting && w.notes.boom;
    const ready = done === photoItems.length && notesDone;
    const missing = done < photoItems.length ? `Nog ${photoItems.length - done} foto${photoItems.length - done === 1 ? '' : "'s"}` : 'Vul de notities in';
    return `<div class="pad">${steps}
        <h2 class="step-title">Leg je plek vast</h2>
        <p class="lede">De tegenstander vraagt hier later naar. De app onthoudt je antwoorden.</p>
        <section class="block"><h2 class="head">Foto's<span class="n">${done}/${photoItems.length}</span></h2><div>
            ${photoItems.map((item, i) => `<label class="check"><input type="checkbox" data-photo="${i}" ${w.photos[i] ? 'checked' : ''}>${esc(item)}</label>`).join('')}</div></section>
        <section class="block"><h2 class="head">Notities</h2>
            <div class="field"><label for="wiz-straat">Straatnaam (volledige officiële naam)</label><input class="input" id="wiz-straat" value="${esc(w.notes.straat)}"><span class="why" id="wiz-straat-n">${w.notes.straat.length} tekens</span></div>
            <div class="field"><span class="label">Eenrichtingsstraat?</span><div class="seg" data-note="eenrichting">${['Ja', 'Nee'].map(v => `<button aria-pressed="${w.notes.eenrichting === v}">${v}</button>`).join('')}</div></div>
            <div class="field"><span class="label">Boom (min. 2 m hoog) binnen 5 m?</span><div class="seg" data-note="boom">${['Ja', 'Nee'].map(v => `<button aria-pressed="${w.notes.boom === v}">${v}</button>`).join('')}</div></div>
        </section>
        <button class="btn btn-main" id="wiz-start" ${ready ? '' : 'disabled'}>${ready ? 'Start het spel' : missing}</button>
        <button class="btn btn-quiet" id="wiz-back">Terug</button>
    </div>`;
}

/** Stap 2 ligt als onderblad over de kaart, zodat je de pin kan zien en verslepen */
function wizardLocationSheet() {
    const w = ui.wizard;
    let status = '<div class="status-line">Sta bij je fiets en gebruik je GPS, of tik op de kaart.</div>';
    let details = '';
    if (w.gpsError) status = `<div class="status-line bad">${esc(w.gpsError)}</div>`;
    if (w.location) {
        const zone = isWithinGameZone(w.location.lat, w.location.lng);
        status = zone.valid
            ? `<div class="status-line ok"><strong>Binnen het speelveld.</strong> Versleep de pin als hij niet juist staat.</div>`
            : `<div class="status-line bad"><strong>Buiten het speelveld</strong> (${formatMeters(zone.distance)} van de WEC, max ${formatMeters(zone.maxDistance)}). Kies een plek binnen het speelveld.</div>`;
        details = `<dl class="kv"><dt>Tot de WEC</dt><dd>${formatMeters(zone.distance)}</dd><dt>Coördinaten</dt><dd class="mono">${fmtCoord(w.location)}</dd>${w.accuracy ? `<dt>GPS</dt><dd>tot op ${Math.round(w.accuracy)} m</dd>` : ''}</dl>`;
    }
    const valid = w.location && isWithinGameZone(w.location.lat, w.location.lng).valid;
    return `<div class="sheet" role="dialog" aria-label="Waar staat je fiets?">
        <div class="steps">${[1, 2, 3].map(i => `<i class="${i <= 2 ? 'on' : ''}"></i>`).join('')}</div>
        <h2 class="task">Waar staat je fiets?</h2>
        ${status}${details}
        <button class="btn ${w.location ? '' : 'btn-main'}" id="wiz-gps" ${w.gpsBusy ? 'disabled' : ''}>${w.gpsBusy ? 'GPS ophalen…' : w.location ? 'GPS opnieuw ophalen' : 'Gebruik mijn GPS'}</button>
        <div class="pair"><button class="btn btn-quiet" id="wiz-back">Terug</button><button class="btn btn-main" id="wiz-confirm" ${valid ? '' : 'disabled'}>Dit klopt</button></div>
    </div>`;
}

function setWizardLocation(latlng, accuracy = null) {
    const w = ui.wizard;
    w.location = { lat: latlng.lat, lng: latlng.lng, timestamp: new Date().toISOString() };
    w.accuracy = accuracy;
    w.gpsError = null;
    setBikeMarker(w.location, { visible: true, draggable: true, onDrag: (pos) => setWizardLocation(pos) });
    renderOverlay();
}

async function wizardGps() {
    const w = ui.wizard;
    w.gpsBusy = true; w.gpsError = null;
    renderOverlay();
    try {
        const location = await getCurrentLocation();
        w.gpsBusy = false;
        setWizardLocation(location, location.accuracy);
        const sheet = $('.sheet');
        centerOn([location.lat, location.lng], 17, sheet && !isDesktop() ? sheet.offsetHeight : 0);
    } catch (error) {
        w.gpsBusy = false;
        w.gpsError = 'GPS lukt niet. Tik op de kaart waar je fiets staat, of probeer opnieuw buiten.';
        renderOverlay();
    }
}

function startGame() {
    const w = ui.wizard;
    const photos = {};
    (GAME_CARDS.hiderChecklist || []).slice(0, 6).forEach((item, i) => { photos[i] = !!w.photos[i]; });
    Game.start({ seed: w.code, location: w.location, checklist: { photos, notes: { ...w.notes, straat: w.notes.straat.trim() } }, zoneLock: w.zoneLock });
    ui.screen = 'game';
    ui.tab = 'cards';
    ui.mapCtx = null;
    updateExclusionZones();
    showBikeOnMap();
    showToast('Spel gestart', false);
    render();
}

/* ===== Onderblad en melding ===== */

let lastSheetKey = null, lastToast = null;

function renderOverlay() {
    // Animeer enkel bij openen (niet bij elke wijziging) en behoud de scrollpositie
    const sheetKey = ui.screen === 'wizard' && ui.wizard.step === 2 ? 'wizard'
        : ui.sheet ? (ui.sheet.type === 'card' ? 'card:' + ui.sheet.cardId : ui.sheet.type) : null;
    const oldSheet = $('.sheet');
    const scroll = oldSheet && sheetKey === lastSheetKey ? oldSheet.scrollTop : 0;
    const sheetEnter = sheetKey !== lastSheetKey ? ' enter' : '';
    const toastEnter = ui.toast && ui.toastStart !== lastToast ? ' enter' : '';
    lastSheetKey = sheetKey; lastToast = ui.toast ? ui.toastStart : null;

    let html = '';
    if (ui.toast) {
        html += `<div class="toast${toastEnter}" role="status"><button class="toast-text" id="toast-close" aria-label="Melding sluiten">${esc(ui.toast)}</button>${ui.undoable ? '<button id="undo">Ongedaan maken</button>' : ''}
            <i class="toast-timer" style="animation-duration:${TOAST_MS}ms;animation-delay:-${Date.now() - ui.toastStart}ms" aria-hidden="true"></i></div>`;
    }
    if (ui.screen === 'wizard' && ui.wizard.step === 2) {
        html += wizardLocationSheet().replace('class="sheet"', `class="sheet${sheetEnter}"`);
    } else if (ui.sheet) {
        const inner = ui.sheet.type === 'card' ? cardSheet() : coordsSheet();
        html += `<div class="scrim" data-close></div><div class="sheet${sheetEnter}${ui.sheet.type === 'card' ? ' card-sheet' : ''}" role="dialog" aria-modal="true">${inner}</div>`;
    }
    $('#overlay').innerHTML = html;
    if ($('.sheet')) $('.sheet').scrollTop = scroll;
    updateHideOutputs();
    updateCheckOutput();
}

const TOAST_MS = 4500;
let toastTimer = null;
function showToast(text, undoable) {
    ui.toast = text;
    ui.undoable = undoable;
    ui.toastStart = Date.now();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { ui.toast = null; ui.undoable = false; renderOverlay(); }, TOAST_MS);
}

function afterSolve(text, drawn) {
    ui.sheet = null;
    if (ui.mapCtx) showCardContext(Game.card(ui.mapCtx.cardId), ui.mapCtx.extra);
    else clearCardContext();
    updateExclusionZones();
    showToast(text + (drawn ? ` · nieuw: ${drawn.question}` : ''), true);
    render();
}

function answerFromSheet(label) {
    const sh = ui.sheet;
    const card = Game.card(sh.cardId);
    const target = sheetTarget();
    const answer = label === '__task' ? {} : { answer: label };
    if (target.answerType === 'distanceFromBike') {
        const pos = parseCoords($('#seek-pos').value);
        if (!pos) { sh.error = 'Vul eerst je positie in, zoals “51.0543, 3.7234”.'; renderOverlay(); return; }
        answer.position = pos;
    }
    if (target.answerType === 'SameOrAdjacentNeighborhood') {
        if (!sh.wijk) { sh.error = 'Kies eerst de wijk van jullie item.'; renderOverlay(); return; }
        answer.wijk = sh.wijk;
    }
    if (target.answerType === 'eliminateNeighborhood') answer.three = [...sh.three];
    const payload = card.answerType === 'copyQuestion' ? { copy: { cardId: sh.copyId, ...answer } } : answer;
    const drawn = Game.solve(card, 'us', payload);
    const text = card.answerType === 'copyQuestion'
        ? `Gekopieerd: ${label === '__task' ? 'ontvangen' : Game.answerText(target, answer)}`
        : label === '__task' ? 'Taak voltooid' : `${Game.answerText(card, answer)} · kaart bijgewerkt`;
    afterSolve(text, drawn);
}

/* ===== Interactie ===== */

document.addEventListener('click', (event) => {
    const t = event.target.closest('button, [data-close]');
    if (!t) return;

    if (t.matches('[data-close]')) { closeSheet(); return; }
    if (t.id === 'toast-close') { ui.toast = null; ui.undoable = false; clearTimeout(toastTimer); renderOverlay(); return; }
    if (t.id === 'undo') {
        if (Game.undo()) { updateExclusionZones(); showToast('Ongedaan gemaakt', false); render(); }
        return;
    }
    if (t.dataset.tab) {
        ui.tab = t.dataset.tab; ui.sheet = null; ui.confirmReset = false;
        render();
        $('#panel').scrollTop = 0;
        if (ui.tab === 'map' && !ui.mapCtx) fitToField();
        return;
    }
    if (t.dataset.open === 'coords') { ui.sheet = { type: 'coords' }; render(); return; }
    if (t.dataset.copyText) { copyText(t.dataset.copyText, t); return; }
    if (t.id === 'copy-seek-pos') { copyText($('#seek-pos').value, t); return; }

    // Kaarten
    if (t.dataset.card) { openCard(t.dataset.card); render(); fitAboveSheet(); return; }
    if (t.dataset.nav) { openCard(t.dataset.nav); render(); $('.sheet').scrollTop = 0; fitAboveSheet(); return; }
    if (t.dataset.mode !== undefined) { ui.sheet.mode = t.dataset.mode || null; ui.sheet.copyId = null; ui.sheet.error = null; showSheetContext(); renderOverlay(); fitAboveSheet(); return; }
    if (t.dataset.copyPick) { ui.sheet.copyId = t.dataset.copyPick; showSheetContext(); renderOverlay(); fitAboveSheet(); return; }
    if (t.id === 'copy-reselect') { ui.sheet.copyId = null; showSheetContext(); renderOverlay(); fitAboveSheet(); return; }
    if (t.dataset.answer !== undefined) { answerFromSheet(t.dataset.answer); return; }
    if (t.matches('[data-them-done]')) {
        const sh = ui.sheet, card = Game.card(sh.cardId);
        const drawn = Game.solve(card, 'them', card.answerType === 'copyQuestion' ? { copy: { cardId: sh.copyId } } : {});
        afterSolve('Kaart uit de flop', drawn);
        return;
    }
    if (t.id === 'ctx-big') {
        const target = sheetTarget();
        ui.mapCtx = { cardId: target.id, extra: sheetExtra(), title: target.question };
        ui.sheet = null; ui.tab = 'map';
        render();
        fitToContext();
        return;
    }
    if (t.id === 'clear-ctx') { ui.mapCtx = null; clearCardContext(); render(); fitToField(); return; }

    // Kaart
    if (t.id === 'toggle-bike') { Game.setShowBike(!Game.showBike()); showBikeOnMap(); render(); return; }
    if (t.id === 'toggle-legend') { ui.legend = !ui.legend; renderMapOverlay(); return; }
    if (t.id === 'clear-pin') { ui.pin = null; setPinMarker(null); renderMapOverlay(); return; }
    if (t.id === 'pin-to-map') {
        ui.pin = parseCoords($('#check-pos').value);
        setPinMarker(ui.pin);
        ui.sheet = null; ui.tab = 'map';
        render();
        centerOn([ui.pin.lat, ui.pin.lng], 15);
        return;
    }

    // Meer
    if (t.id === 'reset') { ui.confirmReset = true; renderPanel(); return; }
    if (t.id === 'reset-no') { ui.confirmReset = false; renderPanel(); return; }
    if (t.id === 'reset-yes') {
        Game.reset();
        Object.assign(ui, { screen: 'wizard', tab: 'cards', sheet: null, mapCtx: null, pin: null, confirmReset: false, wizard: newWizard() });
        ui.wizard.zoneLock = zoneRuleOn();
        clearCardContext(); setPinMarker(null); setBikeMarker(null);
        updateExclusionZones();
        render(); fitToField();
        return;
    }

    // Wizard
    if (t.id === 'wiz-gen') { ui.wizard.code = generateSeed(); $('#wiz-code').value = ui.wizard.code; return; }
    if (t.id === 'wiz-next') {
        const code = $('#wiz-code').value.trim().toUpperCase();
        if (!code) { $('#wiz-code').focus(); return; }
        ui.wizard.code = code; ui.wizard.step = 2;
        render();
        if (ui.wizard.location) setWizardLocation(ui.wizard.location, ui.wizard.accuracy);
        fitToField($('.sheet') ? $('.sheet').offsetHeight : 0);
        return;
    }
    if (t.id === 'wiz-gps') { wizardGps(); return; }
    if (t.id === 'wiz-confirm') {
        setBikeMarker(null);
        ui.wizard.step = 3;
        render(); $('#panel').scrollTop = 0;
        return;
    }
    if (t.id === 'wiz-back') {
        ui.wizard.step -= 1;
        if (ui.wizard.step === 2 && ui.wizard.location) setWizardLocation(ui.wizard.location, ui.wizard.accuracy);
        else setBikeMarker(null);
        render();
        return;
    }
    if (t.id === 'wiz-start' && !t.disabled) { startGame(); return; }
    const seg = t.closest('[data-note]');
    if (seg) { ui.wizard.notes[seg.dataset.note] = t.textContent; renderPanel(); return; }
});

document.addEventListener('input', (event) => {
    const t = event.target;
    if (t.id === 'opp-pos' || t.id === 'hide-wijk' || t.classList.contains('hide-elim')) {
        updateHideOutputs();
        // Toon ook op de kaart wat de tegenstander noemt
        const extra = {
            position: $('#opp-pos') ? parseCoords($('#opp-pos').value) : null,
            wijk: $('#hide-wijk') ? $('#hide-wijk').value : '',
            three: [...document.querySelectorAll('.hide-elim')].map(x => x.value).filter(Boolean)
        };
        showCardContext(sheetTarget(), extra);
        if (t.id !== 'opp-pos' || extra.position) fitAboveSheet();
        return;
    }
    if (t.id === 'check-pos') { updateCheckOutput(); return; }
    if (t.id === 'seek-pos') { ui.sheet.position = t.value; ui.sheet.error = null; showSheetContext(); return; }
    if (t.id === 'seek-wijk') { ui.sheet.wijk = t.value; ui.sheet.error = null; showSheetContext(); renderOverlay(); fitAboveSheet(); return; }
    if (t.classList.contains('seek-elim')) {
        ui.sheet.three = [...document.querySelectorAll('.seek-elim')].map(s => s.value);
        showSheetContext();
        renderOverlay();
        fitAboveSheet();
        return;
    }
    if (t.id === 'wiz-straat') { ui.wizard.notes.straat = t.value; $('#wiz-straat-n').textContent = `${t.value.length} tekens`; refreshStartButton(); return; }
    if (t.dataset.photo !== undefined) { ui.wizard.photos[t.dataset.photo] = t.checked; renderPanel(); return; }
    if (t.id === 'zone-rule' && ui.screen === 'wizard') { ui.wizard.zoneLock = t.checked; return; }
    if (t.id === 'live-toggle') {
        try { localStorage.setItem(LIVE_KEY, String(t.checked)); } catch { /* enkel deze sessie */ }
        if (t.checked) startLiveLocation(); else stopLiveLocation();
        return;
    }
});

function refreshStartButton() {
    const btn = $('#wiz-start');
    if (!btn) return;
    const w = ui.wizard;
    const total = (GAME_CARDS.hiderChecklist || []).slice(0, 6).length;
    const done = Object.values(w.photos).filter(Boolean).length;
    const ready = done === total && w.notes.straat.trim() && w.notes.eenrichting && w.notes.boom;
    btn.disabled = !ready;
    btn.textContent = ready ? 'Start het spel' : done < total ? `Nog ${total - done} foto${total - done === 1 ? '' : "'s"}` : 'Vul de notities in';
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ui.sheet) closeSheet();
});

// Na het invullen van een positie: inzoomen op de afstandscirkel
document.addEventListener('change', (event) => {
    if (event.target.id === 'seek-pos' && ui.sheet) fitAboveSheet();
});
