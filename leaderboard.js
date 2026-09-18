/** Local leaderboard — honest global placeholder until a real worker exists. */
const LOCAL_KEY = 'syzygy_snap_local_v1';

function normalizeEntry(r) {
  return {
    name: String(r?.name || 'ANON').slice(0, 12).toUpperCase(),
    score: Math.floor(Number(r?.score) || 0),
    wave: Math.floor(Number(r?.wave) || 1),
    at: Number(r?.at) || Date.now(),
  };
}

/** Drop exact duplicates (same name + score); keep highest wave/at. Then keep best score per name. */
export function dedupeRanks(list) {
  const byKey = new Map();
  for (const raw of list || []) {
    const r = normalizeEntry(raw);
    const key = `${r.name}|${r.score}`;
    const prev = byKey.get(key);
    if (!prev || (r.wave > prev.wave) || (r.wave === prev.wave && r.at > prev.at)) {
      byKey.set(key, r);
    }
  }
  // Collapse to one row per name: best score wins
  const byName = new Map();
  for (const r of byKey.values()) {
    const prev = byName.get(r.name);
    if (!prev || r.score > prev.score || (r.score === prev.score && r.wave > prev.wave)) {
      byName.set(r.name, r);
    }
  }
  return [...byName.values()].sort((a, b) => b.score - a.score || b.wave - a.wave);
}

export function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    const cleaned = dedupeRanks(Array.isArray(raw) ? raw : []);
    // Persist cleanup so duplicates disappear on next open
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(cleaned.slice(0, 15)));
    } catch (_) {}
    return cleaned;
  } catch {
    return [];
  }
}

export function saveLocal(name, score, wave) {
  const list = loadLocal();
  list.push(normalizeEntry({ name, score, wave, at: Date.now() }));
  const top = dedupeRanks(list).slice(0, 15);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(top));
  return top;
}

/** Global tab: same local top 15 with honest soft label. */
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
