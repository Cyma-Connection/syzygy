/** Local leaderboard + best-effort global (scores.keithcirkel.co.uk). */
const GAME_ID = 'ssZMSzhQlPvi';
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
  const rows = data.scores || [];
  if (!rows.length) {
    // fallback: show local as soft global until remote persists
    return loadLocal().map((r, i) => ({ ...r, rank: i + 1, soft: true }));
  }
  return rows
    .map((r) => ({ name: r.name || '???', score: Number(r.score) || 0, rank: r.rank }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

export async function submitGlobal(name, score, playSeconds) {
  saveLocal(name, score);
  const tRes = await fetch(`${SCORES_BASE}/token`, { method: 'POST' });
  if (!tRes.ok) return { local: true };
  const { token } = await tRes.json();
  const wait = Math.max(0, 500 - (playSeconds || 0) * 1000);
  if (wait) await new Promise((r) => setTimeout(r, wait));
  const body = new URLSearchParams({
    token: String(token),
    name: String(name || 'ANON').slice(0, 15),
    score: String(Math.floor(score)),
  });
  const sRes = await fetch(SCORES_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'follow',
  });
  return { ok: sRes.ok || sRes.status === 303, status: sRes.status };
}
