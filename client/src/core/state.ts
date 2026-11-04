// 세이브 상태 S 와 상태 파생 함수 (스키마·마이그레이션은 save-schema.ts)
import {MUT, P} from '../data/planets.js';
import {GROW, MUT_CHANCE, SELL_RATE, STUDY_MUL, incomeOf} from '../data/pacing.js';
import {G} from './runtime.js';
import {queueRemoteSave, markFresh} from '../net/api.js';
import {defaults, migrate} from './save-schema.js';
import type {Owned, SaveState} from './types.js';

export const SAVE = 'stealPlanet4',
  SAVE_OLD = 'stealPlanet3'; // 키는 v4 이후 고정 (버전은 ver 필드). v3 키 세이브는 읽어서 이어받는다
export const S: SaveState = defaults();
/** 저장 직전 / 세이브 적용 직후 호출되는 훅 (systems/registry.ts 가 시스템의 onSave/onLoad 를 넣는다) */
export const saveHooks: ((s: SaveState) => void)[] = [],
  loadHooks: ((s: SaveState) => void)[] = [];

/** 세이브 객체를 마이그레이션해 S 에 병합. 유효하지 않으면 false */
export function applySave(l: Record<string, any> | null): boolean {
  const m = migrate(l);
  if (!m) return false;
  Object.assign(S, m);
  loadHooks.forEach(f => f(S));
  return true;
}
/** 부팅 시 로컬 세이브가 있었는지 (없을 때만 서버 복원을 시도한다) */
export let hadLocalSave = false;
try {
  const raw = localStorage.getItem(SAVE) || localStorage.getItem(SAVE_OLD); // v4 키가 없으면 v3 키를 이어받는다
  hadLocalSave = applySave(JSON.parse(raw as string));
} catch (e) {}

export const save = () => {
  try {
    saveHooks.forEach(f => f(S));
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

export const mul = (o: Owned) => MUT[o.mut][1] * (o.st ? STUDY_MUL : 1); // 문제를 맞혀 얻은 행성은 ×1.5
export const sellValue = (o: Owned) => P[o.id].price * SELL_RATE * mul(o);
export const dexN = () => Object.keys(S.dex).length;
export const income = () =>
  incomeOf(
    S.base.reduce((a, o) => a + (o && o.left <= 0 ? P[o.id].inc * mul(o) : 0), 0),
    dexN()
  );
export const newPlanet = (id: number, st: number): Owned => ({
  id,
  mut: Math.random() < MUT_CHANCE[0] ? 2 : Math.random() < MUT_CHANCE[1] ? 1 : 0,
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
