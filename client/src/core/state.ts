// 세이브 상태 S 와 상태 파생 함수
import {SLOTMAX} from '../data/zones.js';
import {GROW, MUT, P} from '../data/planets.js';
import {G} from './runtime.js';
import {queueRemoteSave, markFresh} from '../net/api.js';
import type {Owned, SaveState} from './types.js';

export const SAVE = 'stealPlanet4',
  SAVE_OLD = 'stealPlanet3'; // v4: 오픈월드 확장용 필드 추가 (v3 세이브는 읽어서 이어받는다)
export const S: SaveState = {
  cr: 0,
  slots: 6,
  spd: 0,
  base: Array(SLOTMAX).fill(null),
  dex: {},
  mi: 0,
  stolen: 0,
  correct: 0,
  bought: 0,
  zone: 0,
  springs: [0],
  eq: 0,
  bag: 0,
  deco: {floor: 0, ped: 0, fence: 0, flag: 0, prop: 0, light: 0},
  look: {hat: 0, face: 0, shirt: 0, pants: 0, skin: 0},
  own: {},
  notes: {},
  // v4 신규 필드 (구버전 세이브엔 없으므로 기본값을 여기에 둔다)
  ver: 4,
  chapter: 0,
  wanted: 0,
  vehicle: 0,
  ach: {},
  coins: {},
  playSec: 0,
};

/** 세이브 객체를 S 에 병합. 유효하지 않으면 false */
export function applySave(l: Partial<SaveState> | null): boolean {
  if (l && l.base) {
    const d = S.deco,
      lk = S.look;
    Object.assign(S, l);
    S.deco = Object.assign(d, l.deco);
    S.look = Object.assign(lk, l.look);
    S.ver = 4;
    return true;
  }
  return false;
}
/** 부팅 시 로컬 세이브가 있었는지 (없을 때만 서버 복원을 시도한다) */
export let hadLocalSave = false;
try {
  const raw = localStorage.getItem(SAVE) || localStorage.getItem(SAVE_OLD); // v4가 없으면 v3를 이어받는다
  hadLocalSave = applySave(JSON.parse(raw as string));
} catch (e) {}

export const save = () => {
  try {
    let d = S; // 라이벌이 훔쳐 도망치는 중인 행성은 아직 되찾을 수 있으므로 저장본에는 제자리에 둔다
    const rival = G.rival;
    if (rival && rival.stolen) {
      d = Object.assign({}, S, {base: S.base.slice()});
      const i = S.base[rival.slot] ? d.base.findIndex((o, k) => !o && k < S.slots) : rival.slot;
      if (i >= 0) d.base[i] = rival.stolen;
    }
    const json = JSON.stringify(d);
    localStorage.setItem(SAVE, json);
    queueRemoteSave(json);
  } catch (e) {}
};
/** "새로 시작": 로컬 세이브를 지우고 다음 부팅의 서버 복원을 1회 막는다 */
export function clearSave() {
  try {
    localStorage.removeItem(SAVE);
    localStorage.removeItem(SAVE_OLD);
  } catch (e) {}
  markFresh();
}

export const mul = (o: Owned) => MUT[o.mut][1] * (o.st ? 1.5 : 1); // 문제를 맞혀 얻은 행성은 ×1.5
export const dexN = () => Object.keys(S.dex).length;
export const income = () =>
  (1 + S.base.reduce((a, o) => a + (o && o.left <= 0 ? P[o.id].inc * mul(o) : 0), 0)) * (1 + 0.02 * dexN());
export const newPlanet = (id: number, st: number): Owned => ({
  id,
  mut: Math.random() < 0.03 ? 2 : Math.random() < 0.12 ? 1 : 0,
  left: GROW[P[id].t],
  st: st ? 1 : 0,
});
export const freeCount = () => {
  let n = 0;
  for (let i = 0; i < S.slots; i++) if (!S.base[i]) n++;
  return n;
};
export const freeSlot = () => {
  for (let i = 0; i < S.slots; i++) if (!S.base[i]) return i;
  return -1;
};
export const cap = () => 1 + S.bag;
