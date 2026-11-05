// 데크(고가 상판·램프) 계층: 지면 높이 격자는 한 칸에 높이 하나뿐이라 위아래 겹침을 못 담는다.
// 그래서 선분 띠(중심선 a→b, 반폭 hw, 양 끝 높이 h0→h1)를 등록해 두고, 몸의 발 높이 y 가 데크 높이 − DECK_TOL 이상이면 데크를 밟는 것으로 친다.
// 아니면(밑을 지나는 몸·옆으로 벗어난 몸) 아래 일반 지면. 램프 시작부는 높이≈지면이라 자연히 올라타고, 상판 옆으로 걸어 나가면 떨어진다.
export interface Deck {
  id: string;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  hw: number;
  h0: number;
  h1: number;
}
interface Cooked extends Deck {
  ux: number;
  uz: number;
  len: number;
  min: [number, number];
  max: [number, number];
}
/** 발이 데크 윗면보다 이만큼 아래까지는 데크를 밟는 것으로 본다 (램프 진입·저프레임 오차 여유) */
export const DECK_TOL = 1.4;
const decks: Cooked[] = [];

export function addDeck(d: Deck): Deck {
  const len = Math.hypot(d.bx - d.ax, d.bz - d.az) || 1,
    ux = (d.bx - d.ax) / len,
    uz = (d.bz - d.az) / len,
    ex = Math.abs(uz) * d.hw,
    ez = Math.abs(ux) * d.hw;
  decks.push({
    ...d,
    ux,
    uz,
    len,
    min: [Math.min(d.ax, d.bx) - ex, Math.min(d.az, d.bz) - ez],
    max: [Math.max(d.ax, d.bx) + ex, Math.max(d.az, d.bz) + ez],
  });
  return d;
}
export const clearDecks = () => (decks.length = 0);
export const deckList = (): readonly Deck[] => decks;

/** 한 데크의 (x,z) 위 상판 높이. 띠 밖이면 undefined */
function heightOn(d: Cooked, x: number, z: number): number | undefined {
  if (x < d.min[0] || x > d.max[0] || z < d.min[1] || z > d.max[1]) return undefined;
  const rx = x - d.ax,
    rz = z - d.az,
    t = rx * d.ux + rz * d.uz;
  if (t < 0 || t > d.len || Math.abs(-rx * d.uz + rz * d.ux) > d.hw) return undefined;
  return d.h0 + ((d.h1 - d.h0) * t) / d.len;
}
/** 발 높이 y 인 몸이 (x,z) 에서 밟을 데크 높이 (없으면 undefined). 여러 개면 y 에 가장 가까운(아래쪽) 것 */
export function deckAt(x: number, z: number, y: number): number | undefined {
  let best: number | undefined;
  for (const d of decks) {
    const h = heightOn(d, x, z);
    if (h === undefined || y < h - DECK_TOL) continue;
    if (best === undefined || h > best) best = h;
  }
  return best;
}
/** y 와 무관하게 (x,z) 위 데크 높이들 (렌더·테스트용) */
export function deckHeights(x: number, z: number): number[] {
  const out: number[] = [];
  for (const d of decks) {
    const h = heightOn(d, x, z);
    if (h !== undefined) out.push(h);
  }
  return out;
}
