/** Local + global leaderboard (scores.keithcirkel.co.uk). */
const GAME_ID = '33fwOVKzDg7Z';
const LOCAL_KEY = 'syzygy_snap_local_v1';
const SCORES_BASE = `https://scores.keithcirkel.co.uk/g/${GAME_ID}`;

export function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocal(name, score, wave) {
  const list = loadLocal();
  list.push({ name: String(name || 'ANON').slice(0, 12), score, wave, at: Date.now() });
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 15);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(top));
  return top;
}

export async function fetchGlobal() {
  const res = await fetch(`${SCORES_BASE}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('global fetch failed');
  const data = await res.json();
  // API shape may be { scores: [...] } or array
  const rows = Array.isArray(data) ? data : data.scores || data.entries || [];
  return rows
    .map((r) => ({
      name: r.name || r.player || '???',
      score: Number(r.score) || 0,
      rank: r.rank,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

export async function submitGlobal(name, score, playSeconds) {
  // token flow
  const tRes = await fetch(`${SCORES_BASE}/token`, { method: 'POST' });
  if (!tRes.ok) throw new Error('token failed');
  const tokenBody = await tRes.json();
  const token = tokenBody.token || tokenBody.id || tokenBody;
  const body = {
    token: typeof token === 'string' ? token : token.token,
    name: String(name || 'ANON').slice(0, 15),
    score: Math.floor(score),
  };
  // Wait min play time if needed
  const wait = Math.max(0, 3200 - playSeconds * 1000);
  if (wait) await new Promise((r) => setTimeout(r, wait));
  const sRes = await fetch(SCORES_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!sRes.ok) {
    const err = await sRes.text();
    throw new Error(err || 'submit failed');
  }
  return sRes.json().catch(() => ({}));
}
