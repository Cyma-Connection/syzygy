/** EN default + FR toggle. Persist: localStorage syzygy_lang */
const STR = {
  en: {
    loadmsg: 'calibrating ORBIT…',
    startTitle: 'ORBIT SNAP',
    startBody: 'Your craft orbits alone. <b style="color:var(--amber)">Feel</b> sun→object alignment, then <b style="color:var(--amber)">SNAP</b>. Debris = danger. 3 PERFECT unlock <b style="color:var(--cold)">LOCK</b>. Pinch = zoom.',
    play: 'PLAY',
    leaderboard: 'LEADERBOARD',
    ranks: 'RANKS',
    lbNote: 'Local ranks — global soon',
    lbEmpty: 'No scores yet — play a run',
    lbLoading: 'loading…',
    back: 'BACK',
    runOver: 'RUN OVER',
    namePh: 'YOUR TAG',
    save: 'SAVE',
    again: 'AGAIN',
    saving: 'SAVING…',
    saved: 'SAVED ✓',
    localSaved: 'LOCAL SAVED',
    hintFeel: 'Feel the alignment · SNAP',
    hintAlign: 'ALIGN & SNAP',
    meter: 'ALIGNMENT',
    heat: 'HEAT x2',
    coachTap: 'TAP',
    coach1t: 'ORBIT',
    coach1b: 'Your craft orbits on its own. Watch the rings — sun at the center.',
    coach2t: 'FEEL ALIGN',
    coach2b: 'Feel alignment: button pulse, meter rise, rising tone.',
    coach3t: 'SNAP',
    coach3b: 'SNAP at the sweet spot. Debris = danger. 3 PERFECT → LOCK.',
    lockUnlocked: 'LOCK UNLOCKED',
    lockReady: 'LOCK ready — sync 2.5s',
    lockDone: 'LOCK ended',
    lock: 'LOCK',
    sync: 'SYNC',
    mute: 'Mute',
    overSub: (score, wave, best) => `Score ${score} · Wave ${wave} · Best combo x${best}`,
    wave: (n) => `WAVE ${n}`,
    snapsLeft: (n) => `→ ${n} SNAP${n === 1 ? '' : 'S'}`,
    langBtn: 'FR',
    overRankNote: 'YOUR RUN · LOCAL RANKS',
    hull: 'HULL',
  },
  fr: {
    loadmsg: 'calibration ORBIT…',
    startTitle: 'ORBIT SNAP',
    startBody: 'Ton craft orbite. <b style="color:var(--amber)">Sens</b> l’alignement soleil→objet, puis <b style="color:var(--amber)">SNAP</b>. Débris = danger. 3 PARFAIT débloquent <b style="color:var(--cold)">LOCK</b>. Pinch = zoom.',
    play: 'JOUER',
    leaderboard: 'CLASSEMENT',
    ranks: 'RANGS',
    lbNote: 'Classement local — global bientôt',
    lbEmpty: 'Aucun score encore — joue une run',
    lbLoading: 'chargement…',
    back: 'RETOUR',
    runOver: 'FIN DE RUN',
    namePh: 'TON NOM',
    save: 'SAUVER',
    again: 'ENCORE',
    saving: 'SAUVEGARDE…',
    saved: 'SAUVÉ ✓',
    localSaved: 'SAUVÉ LOCAL',
    hintFeel: 'Sens l’alignement · SNAP',
    hintAlign: 'ALIGNE & SNAP',
    meter: 'ALIGNEMENT',
    heat: 'HEAT x2',
    coachTap: 'TAP',
    coach1t: 'ORBIT',
    coach1b: 'Ton craft orbite seul. Observe les anneaux — le soleil au centre.',
    coach2t: 'SENS L’ALIGN.',
    coach2b: 'Sens l’alignement : bouton qui pulse, mètre qui monte, ton qui monte.',
    coach3t: 'SNAP',
    coach3b: 'SNAP au sweet spot. Débris = danger. 3 PARFAIT → LOCK.',
    lockUnlocked: 'LOCK DÉBLOQUÉ',
    lockReady: 'LOCK prêt — sync 2.5s',
    lockDone: 'LOCK fini',
    lock: 'LOCK',
    sync: 'SYNC',
    mute: 'Muet',
    overSub: (score, wave, best) => `Score ${score} · Vague ${wave} · Meilleur combo x${best}`,
    wave: (n) => `VAGUE ${n}`,
    snapsLeft: (n) => `→ ${n} SNAP${n === 1 ? '' : 'S'}`,
    langBtn: 'EN',
    overRankNote: 'TA RUN · CLASSEMENT LOCAL',
    hull: 'COQUE',
  },
};

let lang = 'en';
try {
  const saved = localStorage.getItem('syzygy_lang');
  if (saved === 'fr' || saved === 'en') lang = saved;
} catch (_) {}

export function getLang() { return lang; }

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
  ];
}

function $(id) { return document.getElementById(id); }

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
  set('overRankNote', t('overRankNote'));
  set('meterLabel', t('meter'));
  set('heatBadge', t('heat'));
  set('livesLabel', t('hull'));
  set('btnCoachNext', t('coachTap'));
  set('hint', t('hintFeel'));
  const nameIn = $('nameIn');
  if (nameIn) nameIn.placeholder = t('namePh');
  const langBtn = $('btnLang');
  if (langBtn) langBtn.textContent = t('langBtn');
  // refresh coach if visible
  const flow = $('coachFlow');
  if (flow?.classList.contains('on') && typeof window.__syzygyPaintCoach === 'function') {
    window.__syzygyPaintCoach();
  }
}

export function setLang(next) {
  lang = next === 'fr' ? 'fr' : 'en';
  try { localStorage.setItem('syzygy_lang', lang); } catch (_) {}
  applyDom();
  return lang;
}

export function toggleLang() {
  return setLang(lang === 'en' ? 'fr' : 'en');
}
