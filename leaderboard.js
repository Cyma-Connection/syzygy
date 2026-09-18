/** Local leaderboard — honest global placeholder until a real worker exists. */
const LOCAL_KEY = 'syzygy_snap_local_v1';
/** Keep a wide local top so weaker runs still appear under the record. */
export const TOP_N = 30;

function normalizeEntry(r) {
  return {
    name: String(r?.name || 'ANON').slice(0, 12).toUpperCase(),
    score: Math.floor(Number(r?.score) || 0),
    wave: Math.floor(Number(r?.wave) || 1),
    at: Number(r?.at) || Date.now(),
  };
}

/**
 * Sort by score (then wave, then newer). Keep multiple runs per name.
 * Only drop near-identical accidental doubles (same name+score+wave within 2s).
 */
export function rankList(list) {
  const sorted = (list || []).map(normalizeEntry)
    .sort((a, b) => b.score - a.score || b.wave - a.wave || b.at - a.at);
  const out = [];
  for (const r of sorted) {
    const dup = out.find((x) =>
      x.name === r.name && x.score === r.score && x.wave === r.wave && Math.abs(x.at - r.at) < 2000
    );
    if (!dup) out.push(r);
  }
  return out;
}

export function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    return rankList(Array.isArray(raw) ? raw : []).slice(0, TOP_N);
  } catch {
    return [];
  }
}

export function saveLocal(name, score, wave) {
  let list = [];
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    list = Array.isArray(raw) ? raw.map(normalizeEntry) : [];
  } catch (_) {
    list = [];
  }
  // Always append this run (even below personal / global best)
  list.push(normalizeEntry({ name, score, wave, at: Date.now() }));
  const top = rankList(list).slice(0, TOP_N);
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(top));
  } catch (_) {}
  return top;
}

/** Global tab: same local top with honest soft label. */
export async function fetchGlobal() {
  return loadLocal().map((r, i) => ({
    ...r,
    rank: i + 1,
    soft: true,
  }));
}

export async function submitGlobal(name, score, playSeconds, wave) {
  const top = saveLocal(name, score, wave);
  return { ok: true, local: true, top };
}
