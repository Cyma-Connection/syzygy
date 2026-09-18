/** EN default + FR + ES. Persist: localStorage syzygy_lang */
const LANGS = ['en', 'fr', 'es'];

const STR = {
  en: {
    loadmsg: 'calibrating ORBIT…',
    startTitle: 'ORBIT SNAP',
    startBody: 'Your craft orbits alone. <b style="color:var(--amber)">Feel</b> sun→object alignment, then <b style="color:var(--amber)">SNAP</b>. Debris = danger. 3 "Perfect" charge <b style="color:var(--cold)">LOCK</b> (short reverse). Pinch = zoom.',
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
    coach4b: '3 "Perfect" in a row charge LOCK. Tap once for a short reverse on your orbit — one charge only.',
    lockUnlocked: 'LOCK CHARGED',
    lockReady: 'LOCK ready — short reverse',
    lockDone: 'LOCK spent',
    lock: 'LOCK',
    sync: 'REV',
    mute: 'Mute',
    overSub: (score, wave, best) => `Score ${score} · Wave ${wave} · Best combo x${best}`,
    wave: (n) => `WAVE ${n}`,
    snapsLeft: (n) => `→ ${n} SNAP${n === 1 ? '' : 'S'}`,
    langBtn: 'EN',
    langLabel: 'LANGUAGE',
    overRankNote: 'YOUR RUN · LOCAL RANKS',
    hull: 'HULL',
  },
  fr: {
    loadmsg: 'calibration ORBIT…',
    startTitle: 'ORBIT SNAP',
    startBody: 'Votre vaisseau orbite seul. <b style="color:var(--amber)">Sentez</b> l’alignement Soleil–Objet puis <b style="color:var(--amber)">SNAP</b>. Débris = danger. 3 "perfect" débloquent <b style="color:var(--cold)">LOCK</b>. Pinch = zoom.',
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
    coach4b: '3 "Perfect" d’affilée chargent LOCK. Un appui = marche arrière courte sur l’orbite — une seule charge.',
    lockUnlocked: 'LOCK CHARGÉ',
    lockReady: 'LOCK prêt — marche arrière courte',
    lockDone: 'LOCK consommé',
    lock: 'LOCK',
    sync: 'REV',
    mute: 'Muet',
    overSub: (score, wave, best) => `Score ${score} · Vague ${wave} · Meilleur combo x${best}`,
    wave: (n) => `VAGUE ${n}`,
    snapsLeft: (n) => `→ ${n} SNAP${n === 1 ? '' : 'S'}`,
    langBtn: 'FR',
    langLabel: 'LANGUE',
    overRankNote: 'TA RUN · CLASSEMENT LOCAL',
    hull: 'COQUE',
  },
  es: {
    loadmsg: 'calibrando ÓRBITA…',
    startTitle: 'ORBIT SNAP',
    startBody: 'Tu nave orbita sola. <b style="color:var(--amber)">Siente</b> la alineación sol→objeto, luego <b style="color:var(--amber)">SNAP</b>. Escombros = peligro. 3 "Perfect" cargan <b style="color:var(--cold)">LOCK</b> (marcha atrás corta). Pellizca = zoom.',
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
    coach4b: '3 "Perfect" seguidos cargan LOCK. Un toque = marcha atrás corta en la órbita — una sola carga.',
    lockUnlocked: 'LOCK CARGADO',
    lockReady: 'LOCK listo — marcha atrás corta',
    lockDone: 'LOCK gastado',
    lock: 'LOCK',
    sync: 'REV',
    mute: 'Mudo',
    overSub: (score, wave, best) => `Score ${score} · Oleada ${wave} · Mejor combo x${best}`,
    wave: (n) => `OLEADA ${n}`,
    snapsLeft: (n) => `→ ${n} SNAP${n === 1 ? '' : 'S'}`,
    langBtn: 'ES',
    langLabel: 'IDIOMA',
    overRankNote: 'TU RUN · RANKING LOCAL',
    hull: 'CASCO',
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
    { title: t('coach4t'), body: t('coach4b'), visual: '↩' },
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
