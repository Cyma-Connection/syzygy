/** EN default + FR + ES. Persist: localStorage syzygy_lang */
const LANGS = ['en', 'fr', 'es'];

const STR = {
  en: {
    loadmsg: 'calibrating ORBIT…',
    startTitle: 'ORBIT SNAP',
    startBody: 'Your craft orbits alone. <b style="color:var(--amber)">Feel</b> sun→object alignment, then <b style="color:var(--amber)">SNAP</b>. Debris = danger. 3 "Perfect" charge <b style="color:var(--cold)">LOCK</b> (brief align freeze). 7 relic SNAPs → <b style="color:var(--amber)">SNAP portal</b> bonus. Pinch / wheel = zoom.',
    play: 'PLAY',
    leaderboard: 'LEADERBOARD',
    ranks: 'RANKS',
    lbNote: 'Local top 30 — global soon',
    lbEmpty: 'No scores yet — play a run',
    lbLoading: 'loading…',
    back: 'BACK',
    runOver: 'RUN OVER',
    namePh: 'YOUR TAG',
    save: 'SAVE',
    again: 'AGAIN',
    menu: 'MENU',
    saving: 'SAVING…',
    saved: 'SAVED ✓',
    localSaved: 'LOCAL SAVED',
    hintFeel: 'Feel the alignment · SNAP',
    hintAlign: 'ALIGN & SNAP',
    meter: 'ALIGNMENT',
    heat: 'HEAT x2',
    gradePerfect: '"Perfect"',
    coachTap: 'TAP',
    coach1t: 'ORBIT',
    coach1b: 'Your craft orbits on its own. Watch the rings — sun at the center.',
    coach2t: 'FEEL ALIGN',
    coach2b: 'Feel alignment: button pulse, meter rise, soft tone.',
    coach3t: 'SNAP',
    coach3b: 'SNAP at the sweet spot. Debris = danger. Miss / debris = lose a life.',
    coach4t: 'LOCK',
    coach4b: '3 "Perfect" in a row charge LOCK. Tap once (desktop: Space) for a brief alignment freeze (~0.6s) — craft soft-locks toward the best non-debris syzygy. One charge only. Bonus still opens via SNAP on the portal.',
    lockUnlocked: 'LOCK CHARGED',
    lockReady: 'LOCK ready — align freeze',
    lockDone: 'LOCK spent',
    lock: 'LOCK',
    sync: 'HOLD',
    mute: 'Mute',
    overSub: (score, wave, best) => `Score ${score} · Wave ${wave} · Best combo x${best}`,
    wave: (n) => `WAVE ${n}`,
    snapsLeft: (n) => `→ ${n} SNAP${n === 1 ? '' : 'S'}`,
    langBtn: 'EN',
    langLabel: 'LANGUAGE',
    overRankNote: 'YOUR RUN · LOCAL RANKS',
    hull: 'HULL',
    hintPortal: 'PORTAL open · SNAP to enter bonus',
    hintBonus: (mult) => `BONUS · orbs ×${Number(mult).toFixed(2)} · 3+ = +1 life · 30s`,
    bonusTimer: (s) => `BONUS ${s}s`,
    bonusEnter: (tier, mult) => `BONUS T${tier || 1} · ×${Number(mult ?? 1.5).toFixed(2)}`,
    bonusClear: 'BONUS CLEAR',
    bonusLife: '+1 HULL',
    bonusEnd: 'BACK TO ORBIT',
  },
  fr: {
    loadmsg: 'calibration ORBIT…',
    startTitle: 'ORBIT SNAP',
    startBody: 'Votre vaisseau orbite seul. <b style="color:var(--amber)">Sentez</b> l’alignement Soleil–Objet puis <b style="color:var(--amber)">SNAP</b>. Débris = danger. 3 "perfect" → <b style="color:var(--cold)">LOCK</b> (gel d’alignement). 7 SNAPs relic → <b style="color:var(--amber)">SNAP portail</b> bonus. Pinch / molette = zoom.',
    play: 'JOUER',
    leaderboard: 'CLASSEMENT',
    ranks: 'RANGS',
    lbNote: 'Top 30 local — global bientôt',
    lbEmpty: 'Aucun score encore — joue une run',
    lbLoading: 'chargement…',
    back: 'RETOUR',
    runOver: 'FIN DE RUN',
    namePh: 'TON NOM',
    save: 'SAUVER',
    again: 'ENCORE',
    menu: 'MENU',
    saving: 'SAUVEGARDE…',
    saved: 'SAUVÉ ✓',
    localSaved: 'SAUVÉ LOCAL',
    hintFeel: 'Sens l’alignement · SNAP',
    hintAlign: 'ALIGNE & SNAP',
    meter: 'ALIGNEMENT',
    heat: 'HEAT x2',
    gradePerfect: '"Perfect"',
    coachTap: 'TAP',
    coach1t: 'ORBIT',
    coach1b: 'Ton craft orbite seul. Observe les anneaux — le soleil au centre.',
    coach2t: 'SENS L’ALIGN.',
    coach2b: 'Sens l’alignement : bouton qui pulse, mètre qui monte, ton doux.',
    coach3t: 'SNAP',
    coach3b: 'SNAP au sweet spot. Débris = danger. Raté / débris = une vie en moins.',
    coach4t: 'LOCK',
    coach4b: '3 "Perfect" d’affilée chargent LOCK. Un appui (ordi : Espace) = gel d’alignement (~0,6 s) — le craft se soft-locke vers la meilleure syzygie non-débris. Une seule charge. Le bonus s’ouvre toujours via SNAP sur le portail.',
    lockUnlocked: 'LOCK CHARGÉ',
    lockReady: 'LOCK prêt — gel d’alignement',
    lockDone: 'LOCK consommé',
    lock: 'LOCK',
    sync: 'HOLD',
    mute: 'Muet',
    overSub: (score, wave, best) => `Score ${score} · Vague ${wave} · Meilleur combo x${best}`,
    wave: (n) => `VAGUE ${n}`,
    snapsLeft: (n) => `→ ${n} SNAP${n === 1 ? '' : 'S'}`,
    langBtn: 'FR',
    langLabel: 'LANGUE',
    overRankNote: 'TA RUN · CLASSEMENT LOCAL',
    hull: 'COQUE',
    hintPortal: 'PORTAIL ouvert · SNAP pour le bonus',
    hintBonus: (mult) => `BONUS · orbes ×${Number(mult).toFixed(2)} · 3+ = +1 vie · 30s`,
    bonusTimer: (s) => `BONUS ${s}s`,
    bonusEnter: (tier, mult) => `BONUS T${tier || 1} · ×${Number(mult ?? 1.5).toFixed(2)}`,
    bonusClear: 'BONUS RÉUSSI',
    bonusLife: '+1 COQUE',
    bonusEnd: 'RETOUR EN ORBITE',
  },
  es: {
    loadmsg: 'calibrando ÓRBITA…',
    startTitle: 'ORBIT SNAP',
    startBody: 'Tu nave orbita sola. <b style="color:var(--amber)">Siente</b> la alineación sol→objeto, luego <b style="color:var(--amber)">SNAP</b>. Escombros = peligro. 3 "Perfect" → <b style="color:var(--cold)">LOCK</b> (congelación de alineación). 7 SNAPs relic → <b style="color:var(--amber)">SNAP portal</b> bonus. Pellizca / rueda = zoom.',
    play: 'JUGAR',
    leaderboard: 'CLASIFICACIÓN',
    ranks: 'RANGOS',
    lbNote: 'Top 30 local — global pronto',
    lbEmpty: 'Sin puntuaciones aún — juega una run',
    lbLoading: 'cargando…',
    back: 'ATRÁS',
    runOver: 'FIN DE RUN',
    namePh: 'TU TAG',
    save: 'GUARDAR',
    again: 'OTRA',
    menu: 'MENÚ',
    saving: 'GUARDANDO…',
    saved: 'GUARDADO ✓',
    localSaved: 'LOCAL OK',
    hintFeel: 'Siente la alineación · SNAP',
    hintAlign: 'ALINEA & SNAP',
    meter: 'ALINEACIÓN',
    heat: 'HEAT x2',
    gradePerfect: '"Perfect"',
    coachTap: 'TAP',
    coach1t: 'ÓRBITA',
    coach1b: 'Tu nave orbita sola. Mira los anillos — el sol en el centro.',
    coach2t: 'SIENTE',
    coach2b: 'Siente la alineación: pulso del botón, medidor y tono suave.',
    coach3t: 'SNAP',
    coach3b: 'SNAP en el punto dulce. Escombros = peligro. Fallo / escombros = pierdes una vida.',
    coach4t: 'LOCK',
    coach4b: '3 "Perfect" seguidos cargan LOCK. Un toque (PC: Espacio) = congelación de alineación (~0,6 s) — soft-lock hacia la mejor syzygy no-escombros. Una sola carga. El bonus sigue abriéndose con SNAP en el portal.',
    lockUnlocked: 'LOCK CARGADO',
    lockReady: 'LOCK listo — freeze de alineación',
    lockDone: 'LOCK gastado',
    lock: 'LOCK',
    sync: 'HOLD',
    mute: 'Mudo',
    overSub: (score, wave, best) => `Score ${score} · Oleada ${wave} · Mejor combo x${best}`,
    wave: (n) => `OLEADA ${n}`,
    snapsLeft: (n) => `→ ${n} SNAP${n === 1 ? '' : 'S'}`,
    langBtn: 'ES',
    langLabel: 'IDIOMA',
    overRankNote: 'TU RUN · RANKING LOCAL',
    hull: 'CASCO',
    hintPortal: 'PORTAL abierto · SNAP para entrar',
    hintBonus: (mult) => `BONUS · orbes ×${Number(mult).toFixed(2)} · 3+ = +1 vida · 30s`,
    bonusTimer: (s) => `BONUS ${s}s`,
    bonusEnter: (tier, mult) => `BONUS T${tier || 1} · ×${Number(mult ?? 1.5).toFixed(2)}`,
    bonusClear: 'BONUS COMPLETO',
    bonusLife: '+1 CASCO',
    bonusEnd: 'VUELTA A ÓRBITA',
  },
};

let lang = 'en';
try {
  const saved = localStorage.getItem('syzygy_lang');
  if (LANGS.includes(saved)) lang = saved;
} catch (_) {}

export function getLang() { return lang; }
export function listLangs() { return LANGS.slice(); }

export function t(key, ...args) {
  const pack = STR[lang] || STR.en;
  const v = pack[key] ?? STR.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

export function coachScreens() {
  return [
    { title: t('coach1t'), body: t('coach1b'), visual: '◎' },
    { title: t('coach2t'), body: t('coach2b'), visual: '⟶◎' },
    { title: t('coach3t'), body: t('coach3b'), visual: '⚡' },
    { title: t('coach4t'), body: t('coach4b'), visual: '⏸' },
  ];
}

function $(id) { return document.getElementById(id); }

function syncLangChips() {
  for (const code of LANGS) {
    const el = $(`lang_${code}`);
    if (!el) continue;
    el.classList.toggle('on', code === lang);
    el.setAttribute('aria-pressed', code === lang ? 'true' : 'false');
  }
  const corner = $('btnLang');
  if (corner) corner.textContent = (STR[lang] || STR.en).langBtn;
  const lab = $('langLabel');
  if (lab) lab.textContent = t('langLabel');
}

/** Re-apply static DOM strings for current lang. */
export function applyDom() {
  document.documentElement.lang = lang;
  const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
  const html = (id, h) => { const el = $(id); if (el) el.innerHTML = h; };

  set('loadmsg', t('loadmsg'));
  set('startTitle', t('startTitle'));
  html('startBody', t('startBody'));
  set('btnStart', t('play'));
  set('btnLb', t('leaderboard'));
  set('boardTitle', t('ranks'));
  set('lbNote', t('lbNote'));
  set('btnBack', t('back'));
  set('overTitle', t('runOver'));
  set('btnSubmit', t('save'));
  set('btnRetry', t('again'));
  set('btnMenu', t('menu'));
  set('overRankNote', t('overRankNote'));
  set('meterLabel', t('meter'));
  set('heatBadge', t('heat'));
  set('livesLabel', t('hull'));
  set('btnCoachNext', t('coachTap'));
  set('hint', t('hintFeel'));
  const nameIn = $('nameIn');
  if (nameIn) nameIn.placeholder = t('namePh');
  syncLangChips();
  const flow = $('coachFlow');
  if (flow?.classList.contains('on') && typeof window.__syzygyPaintCoach === 'function') {
    window.__syzygyPaintCoach();
  }
}

export function setLang(next) {
  lang = LANGS.includes(next) ? next : 'en';
  try { localStorage.setItem('syzygy_lang', lang); } catch (_) {}
  applyDom();
  return lang;
}

/** Cycle EN → FR → ES → EN (corner button). */
export function toggleLang() {
  const i = LANGS.indexOf(lang);
  return setLang(LANGS[(i + 1) % LANGS.length]);
}
