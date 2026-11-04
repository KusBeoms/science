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
/** 아직 못 채운 해금 조건 문구 (빈 배열이면 입장 시험을 볼 수 있다) */
export function reqMissing(i: number): string[] {
  const r = SECTORS[i].requires,
    out: string[] = [];
  if (r.prev && !S.unlocked[r.prev]) {
    const p = sectorIndex(r.prev);
    out.push(`${p + 1}단계 ${SECTORS[p].name} 통과`);
  }
  if (r.dex && dexN() < r.dex) out.push(`도감 ${r.dex}종`);
  if (r.spd && S.spd < r.spd) out.push(`신발 Lv${r.spd}`);
  if (r.vehicle && S.vehicle < r.vehicle) out.push(`이동 수단 ${r.vehicle}단계`);
  if (r.chapter && S.chapter < r.chapter) out.push(`챕터 ${r.chapter}`);
  return out;
}
/** 잠겨 있고 바로 앞 섹터가 열려 있어 문이 "다음 차례"로 보이는 섹터 */
export const isNext = (i: number) => {
  const p = SECTORS[i].requires.prev;
  return locked(i) && (!p || !!S.unlocked[p]);
};
