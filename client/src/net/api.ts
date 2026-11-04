// 서버 연동 (선택적). 모든 실패는 조용히 무시하고 localStorage 만으로 동작한다.
const PID_KEY = 'science26.pid',
  FRESH_KEY = 'science26.fresh',
  MIN_GAP = 10000,
  TIMEOUT = 4000;

function newPid(): string {
  const cs = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
    n = 24;
  const a = new Uint8Array(n);
  try {
    crypto.getRandomValues(a);
  } catch (e) {
    for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
  }
  let s = '';
  for (let i = 0; i < n; i++) s += cs[a[i] % cs.length];
  return s;
}
let pidCache = '';
export function getPid(): string {
  if (pidCache) return pidCache;
  try {
    const v = localStorage.getItem(PID_KEY);
    if (v && /^[A-Za-z0-9_-]{20,32}$/.test(v)) return (pidCache = v);
    pidCache = newPid();
    localStorage.setItem(PID_KEY, pidCache);
  } catch (e) {
    if (!pidCache) pidCache = newPid();
  }
  return pidCache;
}

async function req(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    const ac = new AbortController(),
      t = setTimeout(() => ac.abort(), TIMEOUT);
    try {
      return await fetch(url, Object.assign({signal: ac.signal}, init));
    } finally {
      clearTimeout(t);
    }
  } catch (e) {
    return null;
  }
}

/** "새로 시작" 직후 새로고침에서 서버 복원이 진행을 되살리지 않게 1회 억제 플래그를 둔다 */
export function markFresh() {
  try {
    localStorage.setItem(FRESH_KEY, '1');
  } catch (e) {}
}

/** 로컬 세이브가 없을 때 부팅에서 1회 호출. 서버 세이브 객체 또는 null */
export async function fetchRemoteSave(): Promise<any | null> {
  try {
    if (localStorage.getItem(FRESH_KEY)) {
      localStorage.removeItem(FRESH_KEY);
      return null;
    }
  } catch (e) {}
  const r = await req('/api/save/' + getPid());
  if (!r || !r.ok) return null;
  try {
    const j = await r.json();
    return j && j.data && typeof j.data === 'object' ? j.data : null;
  } catch (e) {
    return null;
  }
}

let lastPut = 0,
  timer = 0,
  pending = '',
  off = false;
async function flush() {
  timer = 0;
  lastPut = Date.now();
  const body = pending;
  pending = '';
  if (!body || off) return;
  const r = await req('/api/save/' + getPid(), {method: 'PUT', headers: {'Content-Type': 'application/json'}, body});
  if (r && (r.status === 404 || r.status === 405 || r.status === 501)) off = true; // 서버 API 가 없는 정적 서빙이면 더 시도하지 않는다
}
/** save() 가 localStorage 에 쓸 때마다 호출. 10초 이상 간격으로 마지막 내용만 PUT */
export function queueRemoteSave(json: string) {
  if (off || json.length > 256 * 1024) return;
  pending = json;
  if (timer) return;
  timer = window.setTimeout(flush, Math.max(0, MIN_GAP - (Date.now() - lastPut)));
}

/** 리더보드 점수 제출 (UI 없음, 호출은 추후) */
export async function submitScore(name: string, score: number): Promise<boolean> {
  const r = await req('/api/score', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name, score}),
  });
  return !!(r && r.ok);
}
export async function fetchLeaderboard(limit = 10): Promise<{name: string; score: number}[]> {
  const r = await req('/api/leaderboard?limit=' + limit);
  if (!r || !r.ok) return [];
  try {
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch (e) {
    return [];
  }
}
