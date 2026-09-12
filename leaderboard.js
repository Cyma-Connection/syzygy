/** Local leaderboard — honest global placeholder until a real worker exists. */
const LOCAL_KEY = 'syzygy_snap_local_v1';

export function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocal(name, score, wave) {
  const list = loadLocal();
  list.push({
    name: String(name || 'ANON').slice(0, 12).toUpperCase(),
    score: Math.floor(score),
    wave,
    at: Date.now(),
  });
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 15);
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
