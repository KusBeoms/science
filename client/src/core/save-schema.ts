// 세이브 스키마: 필드 기본값 + 버전 마이그레이션 체인 (v3 → v4 → v5 → v6) + 버전과 무관한 섹터 id 병합
// 새 필드 추가: SaveState(core/types.ts) 에 선언 → defaults() 에 기본값 → 기존 필드 의미가 바뀌면 SAVE_VER 를 올리고 STEPS 에 변환 추가.
// 서버 PUT 은 256KB 상한 — 필드는 id → 작은 숫자 맵처럼 가볍게 둔다.
import {CAPS} from '../data/shop.js';
import {SECTORS} from '../data/sectors.js';
import {TARGET_CUM_SPEND} from '../data/pacing-sinks.js';
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
    cars: {garage: 0, list: []},
  };
}
/** 앞에서부터 연속으로 해금된 섹터 수 (= 구버전의 S.zone, 미션 "N단계 시험 통과" 기준) */
export function zoneFrom(unlocked: Record<string, 1>) {
  let n = 0;
  while (n < SECTORS.length && unlocked[SECTORS[n].id]) n++;
  return n;
}
type Raw = Record<string, any>;
/** 구버전의 섹터 순서 (v4 의 zone 숫자·notes 인덱스가 가리키던 배열, 폐기 id 포함) */
const LEGACY_SECTORS = [
  'solar', 'exo', 'gargantua', 'alpha', 'belt', 'kuiper',
  'reddwarf', 'supernova', 'nebula', 'pulsar', 'neutron', 'edmunds',
];
/** 월드 재편(WORLD.md W0)으로 폐기된 섹터 id → 흡수한 섹터 id (CONTENT_PLAN 2장) */
const MERGED_SECTORS: Record<string, string> = {pulsar: 'supernova', neutron: 'supernova', edmunds: 'gargantua'};
/** id 키 맵(unlocked·portals·notes)에서 폐기 id 의 값을 흡수 섹터로 합친다. 이미 있는 값은 덮지 않는다 (다시 잠그지 않음) */
function mergeSectorIds(d: Raw, key: string) {
  if (!d[key] || typeof d[key] !== 'object') return;
  const o: Raw = (d[key] = {...d[key]}); // 입력 객체를 건드리지 않는다
  Object.keys(MERGED_SECTORS).forEach(old => {
    if (!(old in o)) return;
    const to = MERGED_SECTORS[old];
    if (!o[to]) o[to] = o[old];
    delete o[old];
  });
}
/** STEPS[v] : v → v+1 변환 (없는 필드는 마지막에 defaults 로 채우므로 의미가 바뀌는 필드만 다룬다) */
const STEPS: Record<number, (d: Raw) => void> = {
  // v3 → v4: 오픈월드 필드 추가뿐 (기본값으로 채움)
  3: () => {},
  // v4 → v5: 단계 수(zone) → 섹터별 해금, 구역 안내문 키(인덱스) → 섹터 id
  4: d => {
    d.unlocked = {};
    LEGACY_SECTORS.slice(0, d.zone || 0).forEach(id => (d.unlocked[id] = 1));
    const notes: Raw = {};
    Object.keys(d.notes || {}).forEach(k => {
      const id = LEGACY_SECTORS[+k];
      notes[id || k] = d.notes[k];
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
    // 새 경제 곡선에서 옛 세이브의 과잉 보유 현금이 곡선을 무너뜨리지 않게 해금 구역의 누적 지출 목표로 1회 제한
    // (구역 수는 순서와 무관하게 센다 — 섹터 순서가 재편돼 연속 해금 수로는 옛 진행도를 알 수 없다)
    const z = Math.min(Object.keys(d.unlocked || {}).length, TARGET_CUM_SPEND.length);
    if (typeof d.cr === 'number') d.cr = Math.min(d.cr, TARGET_CUM_SPEND[Math.max(0, z - 1)]);
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
  ['unlocked', 'portals', 'notes'].forEach(k => mergeSectorIds(d, k));
  d.zone = zoneFrom(d.unlocked);
  d.ver = typeof d.ver === 'number' && d.ver > SAVE_VER ? d.ver : SAVE_VER; // 상위 버전 세이브는 버전을 낮추지 않는다(롤백 후 재마이그레이션 방지)
  return d as SaveState;
}
