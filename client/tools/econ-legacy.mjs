// V0 보정용: 재설계 이전(커밋 c4cccff 시점) 경제 상수·데이터 스냅샷.
// 현행 코드가 바뀌어도 "예전 값으로 실측 약 10분이 재현되는가"를 계속 확인할 수 있도록 값을 복사해 둔다.
import {mulberry32} from './econ-model.mjs';

// [이름, 등급, 가격, 분류(0 실제 / 1 인터스텔라 / 2 아바타)] — data/planets.ts DB_BASE 25행 (id 순서)
const DB = [
  ['명왕성', 0, 25, 0],
  ['수성', 0, 50, 0],
  ['화성', 0, 100, 0],
  ['금성', 1, 260, 0],
  ['지구', 1, 500, 0],
  ['프록시마 b', 1, 800, 0],
  ['트라피스트-1e', 1, 1000, 0],
  ['천왕성', 2, 2500, 0],
  ['해왕성', 2, 3000, 0],
  ['게자리 55e', 2, 4000, 0],
  ['케플러-452b', 2, 5000, 0],
  ['만의 행성', 2, 6000, 1],
  ['토성', 3, 15000, 0],
  ['목성', 3, 25000, 0],
  ['HD 189733b', 3, 30000, 0],
  ['WASP-76b', 3, 40000, 0],
  ['케플러-16b', 3, 50000, 0],
  ['페가수스자리 51b', 3, 70000, 0],
  ['에드먼즈 행성', 3, 60000, 1],
  ['WASP-12b', 4, 150000, 0],
  ['판도라', 4, 200000, 2],
  ['밀러의 행성', 4, 300000, 1],
  ['폴리페무스', 5, 1000000, 2],
  ['태양', 5, 3000000, 0],
  ['프록시마 센타우리', 4, 400000, 0],
];
const sum = a => a.reduce((x, y) => x + y, 0);
const range = n => Array.from({length: n}, (_, i) => i);
const SOLAR = ['태양', '명왕성', '수성', '화성', '금성', '지구', '천왕성', '해왕성', '토성', '목성'];
const byName = (...names) => names.map(n => DB.findIndex(d => d[0] === n));
const planet = id => ({id, t: DB[id][1], price: DB[id][2]});
// [풀 id 목록, 중심 x, z, 한 변, 도감 조건, 신발 조건] — data/sectors.ts 앞 6개 (7번째부터는 이동 수단이 필요해 정상 플레이로 못 간다)
const SECTORS = [
  [DB.map((d, i) => i).filter(i => SOLAR.includes(DB[i][0])), 0, -66, 88, 0, 0],
  [DB.map((d, i) => i).filter(i => DB[i][3] === 0 && !SOLAR.includes(DB[i][0])), 0, -154, 88, 0, 0],
  [DB.map((d, i) => i).filter(i => DB[i][3] === 1), 0, -242, 88, 0, 0],
  [DB.map((d, i) => i).filter(i => DB[i][3] === 2), 0, -330, 88, 0, 0],
  [byName('명왕성', '수성', '화성', '금성'), 88, -66, 88, 10, 0],
  [byName('명왕성', '천왕성', '해왕성'), 187, -66, 110, 12, 3],
];
// 상점 sink 전체 (스프링 9종 + 가방 3단계 + 신발 Lv10 + 칸 10 + 꾸미기 82k)
const SPRINGS = [300, 1200, 5000, 20000, 80000, 300000, 1e6, 5e6, 3e7];
const SPR_BONUS = [0, 1, 2, 3, 4, 5, 7, 9, 12];
// 미션: [조건 종류, 목표, 보상] — data/missions.ts
export const MISSIONS = [
  ['stolen', 1, 100],
  ['bought', 1, 300],
  ['zone', 1, 500],
  ['stolen', 3, 800],
  ['dex', 8, 5000],
  ['zone', 2, 3000],
  ['springs', 3, 8000],
  ['zone', 3, 20000],
  ['dex', 15, 80000],
  ['zone', 4, 200000],
  ['dex', 25, 1000000],
];

export const legacyConfig = () => ({
  name: '현행(INC_DIV 25)',
  rw: [50, 28, 14, 6, 1.6, 0.4],
  grow: [8, 15, 30, 60, 120, 240],
  incDiv: 25,
  studyMul: 1.5,
  sellRate: 0.5,
  dexDiv: 10,
  mutChance: [0.03, 0.12],
  baseInc: 1,
  dexBonus: 0.02,
  startZone: -1,
  planetsTotal: 25,
  zones: SECTORS.map(([pool, x, z, size, dex, spd]) => ({
    pool: pool.map(planet),
    dist: Math.max(20, Math.hypot(x, z - 17) - size / 4),
    gate: {dex, spd, vehicle: null, minStay: 0},
  })),
  speed: {base: 14, perLv: 1.5},
  shop: {
    spd: {max: 10, cost: l => Math.floor(80 * 1.8 ** l)},
    slots: {start: 6, max: 10, cost: n => 1000 * 2 ** (n - 6)},
    bags: [500, 8000, 100000],
    springs: SPRINGS.map((cost, i) => ({cost, bonus: SPR_BONUS[i]})),
    cosmetics: Array.from({length: 8}, () => ({zone: 0, cost: 82000 / 8})),
    extras: [],
  },
  missions: MISSIONS,
  missionMul: 1,
  spendGate: null,
  examRetry: 0,
  sinkTotal: sum(SPRINGS) + sum([500, 8000, 100000]) + 82000 + sum(range(10).map(l => Math.floor(80 * 1.8 ** l))) + sum(range(4).map(k => 1000 * 2 ** k)),
  done: st => st.zone >= 5 && st.dex.size >= 24 && st.slots >= 10 && st.spd >= 10 && st.bag >= 3 && st.springN >= 8,
  rng: mulberry32,
});
