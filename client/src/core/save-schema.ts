// 세이브 스키마: 필드 기본값 + 버전 마이그레이션 체인 (v3 → v4 → v5 → v6)
// 새 필드 추가: SaveState(core/types.ts) 에 선언 → defaults() 에 기본값 → 기존 필드 의미가 바뀌면 SAVE_VER 를 올리고 STEPS 에 변환 추가.
// 서버 PUT 은 256KB 상한 — 필드는 id → 작은 숫자 맵처럼 가볍게 둔다.
import {CAPS} from '../data/shop.js';
import {SECTORS} from '../data/sectors.js';
import {STORY_CUTS} from '../data/cutscene-types.js';
import type {SaveState, StoryState} from './types.js';

export const SAVE_VER = 6;
export const defaultStory = (): StoryState => ({
  beat: 0,
  mid: 0,
  seen: Object.fromEntries(STORY_CUTS.map(k => [k, 0])),
  ended: 0,
  hints: {},
});
export function defaults(): SaveState {
  return {
    cr: 0,
    slots: CAPS.slots.start,
    spd: 0,
    base: Array(CAPS.slots.max).fill(null),
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
    ver: SAVE_VER,
    // v4
    chapter: 0,
    wanted: 0,
    vehicle: 0,
    ach: {},
    coins: {},
    playSec: 0,
    // v5
    unlocked: {},
    portals: {},
    quests: {},
    vehicles: {},
    heists: {},
    collectibles: {},
    // v6
    story: defaultStory(),
  };
}
/** 앞에서부터 연속으로 해금된 섹터 수 (= 구버전의 S.zone, 미션 "N단계 시험 통과" 기준) */
export function zoneFrom(unlocked: Record<string, 1>) {
  let n = 0;
  while (n < SECTORS.length && unlocked[SECTORS[n].id]) n++;
  return n;
}
type Raw = Record<string, any>;
/** STEPS[v] : v → v+1 변환 (없는 필드는 마지막에 defaults 로 채우므로 의미가 바뀌는 필드만 다룬다) */
const STEPS: Record<number, (d: Raw) => void> = {
  // v3 → v4: 오픈월드 필드 추가뿐 (기본값으로 채움)
  3: () => {},
  // v4 → v5: 단계 수(zone) → 섹터별 해금, 구역 안내문 키(인덱스) → 섹터 id
  4: d => {
    d.unlocked = {};
    SECTORS.slice(0, d.zone || 0).forEach(s => (d.unlocked[s.id] = 1));
    const notes: Raw = {};
    Object.keys(d.notes || {}).forEach(k => {
      const s = SECTORS[+k];
      notes[s ? s.id : k] = d.notes[k];
    });
    d.notes = notes;
  },
  // v5 → v6: story 만 (다른 v6 필드는 각 기능이 자기 줄을 추가). 이미 진행한 세이브는 첫 만남(C01)을 본 것으로 친다
  5: d => {
    const st = defaultStory(),
      old = d.story && typeof d.story === 'object' ? d.story : {};
    Object.assign(st, old, {seen: Object.assign(st.seen, old.seen)});
    if (d.stolen || d.zone || d.bought || d.cr > 10) {
      st.seen.c01_love = 1;
      st.beat = Math.max(st.beat, 1);
    }
    if (st.beat !== 4) st.mid = 0; // mid≠0 이면 beat===4
    d.story = st;
  },
};
/** 임의 버전 세이브 → 현재 버전. base 가 없으면 세이브가 아니므로 null */
export function migrate(raw: Raw | null): SaveState | null {
  if (!raw || !Array.isArray(raw.base)) return null;
  const d: Raw = {...raw},
    def = defaults() as unknown as Raw;
  for (let v = typeof d.ver === 'number' ? d.ver : 3; v < SAVE_VER; v++) if (STEPS[v]) STEPS[v](d);
  Object.keys(def).forEach(k => {
    if (d[k] === undefined || d[k] === null) d[k] = def[k];
  });
  d.deco = Object.assign(def.deco, d.deco);
  d.look = Object.assign(def.look, d.look);
  while (d.base.length < CAPS.slots.max) d.base.push(null);
  d.zone = zoneFrom(d.unlocked);
  d.ver = typeof d.ver === 'number' && d.ver > SAVE_VER ? d.ver : SAVE_VER; // 상위 버전 세이브는 버전을 낮추지 않는다(롤백 후 재마이그레이션 방지)
  return d as SaveState;
}
