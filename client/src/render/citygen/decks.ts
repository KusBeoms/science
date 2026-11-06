// 컴파일된 도로의 다리·램프 구간(kind bridge|ramp, 또는 layer>0)을 core/deck.ts 소유자 API 에 등록한다.
// 표본이 1m 간격이라 그대로 넣으면 deckAt(전체 선형 훑기)이 느려지므로, 같은 직선·같은 경사로 이어지는 표본을 한 데크로 합친다(오차 ≤ 0.12m, 최대 길이 40m).
import {removeDecksByOwner, replaceDecks, type Deck} from '../../core/deck.js';
import type {CompiledRoad} from '../../data/city-compiled.js';

const MAX_RUN = 40,
  TOL_XZ = 0.12,
  TOL_Y = 0.06;

/** 도로 한 구간의 표본(i0..i1)을 데크 목록으로. 반폭은 구간 평균 (hwL+hwR)/2 */
export function decksOfRun(road: CompiledRoad, i0: number, i1: number, idPrefix: string): Deck[] {
  const s = road.samples,
    out: Deck[] = [];
  let i = Math.max(0, i0);
  const end = Math.min(s.length - 1, i1);
  while (i < end) {
    let j = i + 1;
    // j 를 최대한 늘린다: 중간 표본이 현 i→j 현에서 TOL 이내이고 길이가 MAX_RUN 이내
    for (; j < end; j++) {
      const k = j + 1,
        dx = s[k].x - s[i].x,
        dz = s[k].z - s[i].z,
        len = Math.hypot(dx, dz);
      if (len > MAX_RUN || len < 1e-6) break;
      let ok = true;
      for (let m = i + 1; m <= j && ok; m++) {
        const t = ((s[m].x - s[i].x) * dx + (s[m].z - s[i].z) * dz) / (len * len),
          off = Math.abs((s[m].x - s[i].x) * dz - (s[m].z - s[i].z) * dx) / len,
          yy = s[i].y + (s[k].y - s[i].y) * t;
        ok = off <= TOL_XZ && Math.abs(s[m].y - yy) <= TOL_Y;
      }
      if (!ok) break;
    }
    let hw = 0;
    for (let m = i; m <= j; m++) hw += (s[m].hwL + s[m].hwR) / 2;
    hw /= j - i + 1;
    if (Math.hypot(s[j].x - s[i].x, s[j].z - s[i].z) > 1e-6)
      out.push({id: `${idPrefix}#${out.length}`, ax: s[i].x, az: s[i].z, bx: s[j].x, bz: s[j].z, hw, h0: s[i].y, h1: s[j].y});
    i = j;
  }
  return out;
}

export interface DeckReg {
  owners: string[];
  /** 등록한 데크 수 */
  decks: number;
  /** 입력 표본 수(다리·램프 구간) */
  samples: number;
  dispose(): void;
}
/** 도로마다 소유자 `${ns}deck:${roadId}` 로 replaceDecks. 같은 소유자가 이미 있으면 통째로 교체된다 */
export function registerDecks(roads: readonly CompiledRoad[], ns: string): DeckReg {
  const owners: string[] = [];
  let decks = 0,
    samples = 0;
  for (const road of roads) {
    const list: Deck[] = [];
    for (const seg of road.segments ?? []) {
      if (seg.kind !== 'bridge' && seg.kind !== 'ramp' && !(seg.layer > 0)) continue;
      samples += Math.max(0, seg.i1 - seg.i0 + 1);
      list.push(...decksOfRun(road, seg.i0, seg.i1, `${ns}${road.id}:${seg.id}`));
    }
    if (!list.length) continue;
    const owner = `${ns}deck:${road.id}`;
    replaceDecks(owner, list);
    owners.push(owner);
    decks += list.length;
  }
  return {
    owners,
    decks,
    samples,
    dispose() {
      for (const o of owners) removeDecksByOwner(o);
      owners.length = 0;
    },
  };
}
