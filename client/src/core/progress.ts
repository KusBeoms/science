// 섹터 진행: 해금 여부·해금 조건·해금 처리 (S.unlocked 가 기준, S.zone 은 호환용 파생값)
import {SECTORS, sectorIndex} from '../data/sectors.js';
import {S, dexN} from './state.js';
import {zoneFrom} from './save-schema.js';

export const sectorUnlocked = (id: string) => !!S.unlocked[id];
export const locked = (i: number) => !S.unlocked[SECTORS[i].id];
export function unlockSector(i: number) {
  S.unlocked[SECTORS[i].id] = 1;
  S.zone = zoneFrom(S.unlocked);
}
/**
 * 아직 못 채운 해금 조건 문구 (빈 배열이면 입장 시험을 볼 수 있다).
 * requires.vehicle(이동 수단 단계)·requires.beat(스토리 비트)는 해당 시스템이 아직 S.vehicle·S.story.beat 를
 * 올리지 않아 조건으로 검사하면 도달 불가가 되므로 임시로 무시한다. 시스템이 붙으면 이 함수에 두 줄을 더한다.
 */
export function reqMissing(i: number): string[] {
  const r = SECTORS[i].requires,
    out: string[] = [];
  if (r.prev && !S.unlocked[r.prev]) {
    const p = sectorIndex(r.prev);
    out.push(`${p + 1}단계 ${SECTORS[p].name} 통과`);
  }
  if (r.dex && dexN() < r.dex) out.push(`도감 ${r.dex}종`);
  if (r.spd && S.spd < r.spd) out.push(`신발 Lv${r.spd}`);
  return out;
}
/** 잠겨 있고 바로 앞 섹터가 열려 있어 문이 "다음 차례"로 보이는 섹터 */
export const isNext = (i: number) => {
  const p = SECTORS[i].requires.prev;
  return locked(i) && (!p || !!S.unlocked[p]);
};
/** 해금 조건 상세 (포탈 지도의 검토 UI 용): 아이콘·현재/필요·충족 여부 */
export interface ReqRow {
  icon: string;
  have: number;
  need: number;
  ok: boolean;
}
export function reqStatus(i: number): ReqRow[] {
  const r = SECTORS[i].requires,
    out: ReqRow[] = [];
  if (r.prev) out.push({icon: SECTORS[sectorIndex(r.prev)].icon, have: S.unlocked[r.prev] ? 1 : 0, need: 1, ok: !!S.unlocked[r.prev]});
  if (r.dex) out.push({icon: '📖', have: Math.min(dexN(), r.dex), need: r.dex, ok: dexN() >= r.dex});
  if (r.spd) out.push({icon: '👟', have: Math.min(S.spd, r.spd), need: r.spd, ok: S.spd >= r.spd});
  return out;
}
