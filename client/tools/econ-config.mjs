// 새 상수(컴파일된 public/js)로 시뮬레이터 설정을 만든다. 구역·등급 분포는 PLANET_CATALOG 2.3, 지출 일정은 ECONOMY 4장.
import {existsSync} from 'node:fs';
import {mulberry32} from './econ-model.mjs';
import {MISSIONS} from './econ-legacy.mjs';

const JS = new URL('../public/js/', import.meta.url);
if (!existsSync(new URL('data/pacing.js', JS))) {
  console.error('public/js 가 없다 — 먼저 `cd client && npx tsc` 로 컴파일하라');
  process.exit(1);
}
const load = f => import(new URL(f, JS).href);
export const pacing = await load('data/pacing.js');
export const sinks = await load('data/pacing-sinks.js');
export const shop = await load('data/shop.js');
export const planets = await load('data/planets.js');

const ZONE_TIERS = [
  [5, 2, 0, 0, 0, 0],
  [2, 2, 2, 0, 0, 0],
  [1, 1, 3, 1, 0, 0],
  [0, 1, 4, 2, 0, 0],
  [1, 3, 2, 0, 0, 0],
  [0, 4, 3, 0, 1, 0],
  [0, 0, 4, 3, 0, 0],
  [0, 0, 1, 5, 1, 0],
  [0, 3, 1, 2, 0, 0],
  [0, 0, 0, 5, 3, 0],
  [0, 0, 1, 1, 3, 1],
  [0, 0, 0, 0, 4, 2],
]; // PLANET_CATALOG 2.3 구역 × 등급 (합 80)
const COS_ZONE = [3.3, 6.6, 13.1, 19.7, 23.0, 32.8, 39.4, 39.4, 39.4, 39.4, 39.4, 32.8]; // ECONOMY 4.7 꾸미기 열 비율
const VEH = [
  ['jump', 1],
  ['hover', 3],
  ['ship', 4],
  ['warp', 9],
  ['glider', 10],
]; // [이름, 살 수 있는 구역]
const VEH_GATE = {4: 'hover', 5: 'ship', 10: 'warp', 11: 'glider'}; // 구역 진입에 필요한 수단
const GEAR = [
  // [이름, 구역, 가격]
  ['protect2', 4, 6000],
  ['protect3', 7, 18000],
  ['cold1', 3, 4000],
  ['cold2', 5, 12000],
  ['cold3', 8, 36000],
  ['heat2', 8, 60000],
  ['heat3', 10, 180000],
  ['helmet1', 9, 30000],
  ['helmet2', 10, 90000],
  ['helmet3', 11, 270000],
];
const BUILD = [
  ['observe', [3, 5, 7]],
  ['lab', [4, 6, 8]],
  ['vault', [6, 8, 10]],
  ['hangar', [5, 7, 9]],
];
const cosTotal = () => {
  const d = Object.values(shop.DECO).flatMap(g => g.v.map(v => v[v.length - 1])),
    l = Object.values(shop.LOOK).flatMap(g => g.v.map(v => v[2]));
  return [...d, ...l].reduce((a, b) => a + b, 0) * pacing.COSMETIC_MUL;
};
const extrasOf = () => {
  const out = [];
  VEH.forEach(([name, zone], i) => {
    const P = sinks.VEHICLE_PRICE[i];
    out.push({name, cost: P, minZone: zone});
    for (const tr of 'sfc')
      sinks.VEHICLE_UPG.forEach((u, k) =>
        out.push({
          name: `${name}-${tr}${k}`,
          cost: Math.round(P * u),
          minZone: Math.min(11, zone + 1 + k),
          after: k ? `${name}-${tr}${k - 1}` : name,
        })
      );
  });
  GEAR.forEach(([name, zone, cost]) => out.push({name, cost, minZone: zone}));
  const base = {
    observe: sinks.BUILD_BASE.observe,
    lab: sinks.BUILD_BASE.lab,
    vault: sinks.BUILD_BASE.vault,
    hangar: sinks.BUILD_BASE.hangar,
  };
  BUILD.forEach(([name, zs]) =>
    zs.forEach((zone, k) =>
      out.push({
        name: `${name}${k}`,
        cost: base[name] * sinks.BUILD_STEP ** k,
        minZone: zone,
        after: k ? `${name}${k - 1}` : null,
      })
    )
  );
  return out;
};
export const newConfig = (o = {}) => {
  const zoneMul = (o.zoneMul ?? pacing.ZONE_MUL).map(m => m * (o.zoneScale ?? 1)),
    tierMul = o.tierMul ?? pacing.TIER_MUL,
    priceOf = (z, t) => Math.round(zoneMul[z] * tierMul[t] * pacing.PRICE_MUL);
  const zones = ZONE_TIERS.map((row, z) => {
    const pool = [];
    row.forEach((n, t) => {
      for (let k = 0; k < n; k++) pool.push({id: z * 100 + pool.length, t, price: priceOf(z, t)});
    });
    return {
      pool,
      dist: 90 + 12 * z,
      gate: {
        dex: sinks.GATE_DEX[z + 1] || 0,
        spd: sinks.GATE_SPD[z + 1] || 0,
        vehicle: VEH_GATE[z] || null,
        minStay: z ? sinks.ZONE_DWELL_MIN[z - 1] * 60 : 0,
      },
    };
  });
  const cosSum = COS_ZONE.reduce((a, b) => a + b),
    cos = [];
  COS_ZONE.forEach((w, z) => {
    const c = (cosTotal() * w) / cosSum;
    for (let k = 0; k < 3; k++) cos.push({zone: z, cost: c / 3});
  });
  const sh = {
    spd: {max: shop.CAPS.spd, cost: pacing.spdCost},
    slots: {start: shop.CAPS.slots.start, max: shop.CAPS.slots.max, cost: pacing.slotCost},
    bags: shop.BAGS.map(b => b[1]),
    springs: shop.SPR.slice(1).map(s => ({cost: s[2], bonus: s[4]})),
    cosmetics: cos,
    extras: extrasOf(),
  };
  const sinkTotal =
    Array.from({length: sh.spd.max}, (_, l) => sh.spd.cost(l)).reduce((a, b) => a + b) +
    Array.from({length: sh.slots.max - sh.slots.start}, (_, k) => sh.slots.cost(sh.slots.start + k)).reduce(
      (a, b) => a + b
    ) +
    sh.bags.reduce((a, b) => a + b) +
    sh.springs.reduce((a, s) => a + s.cost, 0) +
    cosTotal() +
    sh.extras.reduce((a, e) => a + e.cost, 0);
  return {
    rw: pacing.RW,
    grow: pacing.GROW,
    incDiv: pacing.INC_DIV,
    studyMul: pacing.STUDY_MUL,
    sellRate: pacing.SELL_RATE,
    dexDiv: pacing.DEX_REWARD_DIV,
    mutChance: pacing.MUT_CHANCE,
    baseInc: pacing.BASE_INC,
    dexBonus: pacing.DEX_BONUS,
    startZone: 0,
    zones,
    speed: {base: pacing.SPD_BASE, perLv: pacing.SPD_PER_LV},
    shop: sh,
    sinkTotal,
    missions: MISSIONS.map(m => (m[0] === 'dex' && m[1] === 25 ? ['dex', 80, m[2]] : m)),
    missionMul: o.missionMul ?? 0.05,
    spendGate: sinks.TARGET_CUM_SPEND.map((_, z, a) => (z ? (o.spendFrac ?? 1) * a[z - 1] : 0)),
    examRetry: sinks.EXAM_RETRY_SEC,
    post: {lump: 2656000, houses: sinks.HOUSE_PRICE},
    done: (st, beh) =>
      st.zone >= 11 &&
      st.t - st.enterT >= sinks.ZONE_DWELL_MIN[11] * 60 * beh.stayFrac &&
      (!beh.completionist || st.spent >= 0.95 * sinkTotal),
    rng: mulberry32,
  };
};
