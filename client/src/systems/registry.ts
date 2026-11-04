// 시스템 레지스트리: loop.ts 는 등록된 시스템을 등록 순서대로 호출만 한다. 등록은 systems/index.ts 한 곳에서
import {S, loadHooks, saveHooks} from '../core/state.js';
import {SECTORS} from '../data/sectors.js';
import {addHudLine, addHudWidget} from '../game/hud.js';
import type {GameSystem} from '../core/types.js';

const LIST: GameSystem[] = [];
export function registerSystem(sys: GameSystem) {
  if (LIST.some(o => o.id === sys.id)) throw new Error(`system id 중복: ${sys.id}`);
  LIST.push(sys);
  if (sys.hud) addHudLine(sys.hud);
  if (sys.widget) addHudWidget(sys.widget);
  if (sys.onSave) saveHooks.push(sys.onSave);
  if (sys.onLoad) {
    loadHooks.push(sys.onLoad);
    sys.onLoad(S); // 로컬 세이브는 이미 적용돼 있으므로 바로 1회
  }
}
export const systems: readonly GameSystem[] = LIST;
export function updateSystems(dt: number, raw: number) {
  LIST.forEach(s => s.update && s.update(dt, raw));
}
/** 섹터 이동 알림 (prev/cur = 섹터 인덱스, -1 = 허브·허공) */
export function sectorChanged(prev: number, cur: number) {
  if (prev >= 0) LIST.forEach(s => s.onSectorLeave && s.onSectorLeave(SECTORS[prev], prev));
  if (cur >= 0) LIST.forEach(s => s.onSectorEnter && s.onSectorEnter(SECTORS[cur], cur));
}
export const speedMul = () => LIST.reduce((a, s) => a * (s.speedMul ? s.speedMul() : 1), 1);
export const hovering = () => LIST.some(s => s.hover && s.hover());
