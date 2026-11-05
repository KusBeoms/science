// 경제 시뮬레이터 실행기: `cd client && npx tsc; node tools/econ-sim.mjs` (또는 저장소 루트에서 node client/tools/econ-sim.mjs)
// 1) V0  현행(재설계 전) 상수로 실측 약 10분이 재현되는지 — 플레이어 가정(훔치기 1회 시간)을 보정한다
// 2) V1~V13  컴파일된 public/js 의 새 상수로 12구역 곡선을 평가한다 (기준: docs/design/ECONOMY.md 7장)
import {simulate} from './econ-model.mjs';
import {legacyConfig} from './econ-legacy.mjs';
import {newConfig, pacing, planets, sinks} from './econ-config.mjs';

const pct = (a, q) => {
  const s = a.filter(x => x !== null && x !== undefined && !Number.isNaN(x)).sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN;
};
const med = a => pct(a, 0.5);
const min = s => (s / 60).toFixed(1);
const hr = s => (s / 3600).toFixed(2);
const fmtK = n => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n.toFixed(0));
const runs = (make, beh, n, opt) => Array.from({length: n}, (_, i) => simulate(make(), beh, 1000 + i, opt));

// 플레이어 가정 (V0 로 tAct 를 보정한다)
const BEH = {
  look: 3, // 한 번에 눈여겨보는 둥지 수 (그중 비싼/새 행성을 고른다)
  tBase: 5, // 한 번 나갈 때 고정 시간 (출발·입고·정리)
  tAct: 14, // 행성 하나당 접근+퀴즈+훔치기 초 (보정 대상)
  tExam: 45,
  uiSec: 3,
  pQuiz: 0.9,
  pExam: 0.93,
  pCatch: 0.04,
  pace: 1,
  cosFactor: 1.5,
  cometCatch: 0.5,
  sellToBuy: true,
  stayFrac: 0,
  completionist: false,
  hunt: 0.4, // 도감을 채우러 앞 구역으로 돌아가는 확률(훔치기 1회당)
};

// ───────── V0: 현행 상수 ─────────
console.log('═══ V0 보정: 재설계 전 상수로 시뮬이 실측 약 10분을 재현하는가 ═══');
console.log(
  '끝 정의 = 상점 소진(신발 Lv10·칸 10·가방 3·스프링 9·꾸미기 전부, 합 약 36.6M) — ROADMAP 의 "상점 소진까지" 시뮬 정의와 같다'
);
const v0 = tAct => {
  const rs = runs(legacyConfig, {...BEH, tAct}, 60, {maxT: 7200});
  return {
    tAct,
    end: med(rs.map(r => r.endT)),
    p10: pct(
      rs.map(r => r.endT),
      0.1
    ),
    p90: pct(
      rs.map(r => r.endT),
      0.9
    ),
  };
};
console.log('tAct(초/행성)  종료 중앙값(분)  P10~P90   오차');
const cal = [5, 8, 12, 16, 24, 40].map(v0);
cal.forEach(c =>
  console.log(
    `${String(c.tAct).padStart(6)}  ${min(c.end).padStart(10)}  ${min(c.p10)}~${min(c.p90)}  ${(((c.end - 600) / 600) * 100).toFixed(0)}%`
  )
);
// V0 는 tAct 를 한 점으로 정하지 못한다(상점 소진은 희귀 행성 운과 시험 시간에 좌우). ±15% 안에 드는 값 중 가장 느린(보수적인) 값을 쓴다
const ok = cal.filter(c => Math.abs(c.end - 600) / 600 <= 0.15);
const pick = ok.length
  ? ok[ok.length - 1]
  : cal.reduce((a, b) => (Math.abs(a.end - 600) < Math.abs(b.end - 600) ? a : b));
const v0pass = ok.length > 0;
console.log(
  `보정 tAct = ${pick.tAct}초 → 종료 ${min(pick.end)}분 (오차 ${(((pick.end - 600) / 600) * 100).toFixed(0)}%) — V0 ${v0pass ? '합격' : '불합격'}`
);
BEH.tAct = pick.tAct;

// ───────── 평가 ─────────
const GENERAL = {...BEH, completionist: true, stayFrac: sinks.ZONE_MIN_STAY_FRAC};
const EFFICIENT = {
  ...BEH,
  pQuiz: 1,
  pExam: 1,
  pace: 1.3,
  look: 5,
  completionist: false,
  stayFrac: sinks.ZONE_MIN_STAY_FRAC,
};
const RELAXED = {...BEH, pQuiz: 0.7, pExam: 0.8, pace: 0.5, completionist: true, stayFrac: sinks.ZONE_MIN_STAY_FRAC};
const N = Number(process.env.N || 80);
const WHATIF = {
  zoneScale: process.env.ZONE_SCALE ? Number(process.env.ZONE_SCALE) : undefined,
  tierMul: process.env.TIER_MUL ? process.env.TIER_MUL.split(',').map(Number) : undefined,
};
const mk = () => () => newConfig(WHATIF);
console.log(
  `\n═══ 새 곡선 (TIER_MUL=${pacing.TIER_MUL.join(',')} · INC_DIV=${pacing.INC_DIV} · 최소 체류 ${sinks.ZONE_MIN_STAY_FRAC}) — 프로필당 ${N}회 ═══`
);
const gen = runs(mk(), GENERAL, N);
const eff = runs(mk(), EFFICIENT, N);
const rel = runs(mk(), RELAXED, N);
const cfg0 = newConfig(WHATIF);
console.log(`필수 sink 합계 ${fmtK(cfg0.sinkTotal)} (ECONOMY 4.91M + 집 제외)`);

console.log('\n[V2] 구역 진입 시각 vs 목표 (일반 프로필, 중앙값 · P10~P90 분)');
console.log('구역  목표(분)  진입(분)  P10~P90      오차   누적수입(목표→실)         판정');
let v2ok = true;
for (let z = 0; z < 12; z++) {
  const tgt = z ? sinks.TARGET_CUM_SEC[z - 1] : 0,
    at = gen.map(r => r.zoneEnter[z]),
    m = med(at),
    inc = med(gen.map(r => r.enterIncome[z])),
    tInc = z ? sinks.TARGET_CUM_INCOME[z - 1] : 0,
    err = tgt ? (m - tgt) / tgt : 0,
    ok = !tgt || Math.abs(err) <= 0.15;
  if (!ok) v2ok = false;
  console.log(
    `S${String(z + 1).padEnd(2)}  ${min(tgt).padStart(7)}  ${min(m).padStart(8)}  ${min(pct(at, 0.1))}~${min(pct(at, 0.9))}`.padEnd(
      52
    ) +
      `${(err * 100).toFixed(0).padStart(4)}%  ${fmtK(tInc).padStart(7)} → ${fmtK(inc).padStart(7)}   ${ok ? 'OK' : 'X'}`
  );
}
const endG = gen.map(r => r.endT);
const rep = (id, name, ok, text) => console.log(`${id.padEnd(4)} ${ok ? '합격' : '불합격'}  ${name}: ${text}`);
console.log('\n[판정]');
rep(
  'V1',
  '총 시간(일반) 9.5~11.5h',
  med(endG) / 3600 >= 9.5 && med(endG) / 3600 <= 11.5 && pct(endG, 0.1) / 3600 >= 9 && pct(endG, 0.9) / 3600 <= 12.5,
  `중앙 ${hr(med(endG))}h (P10 ${hr(pct(endG, 0.1))} ~ P90 ${hr(pct(endG, 0.9))})`
);
rep('V2', '구역 진입 ±15%', v2ok, '위 표');
const inc10 = med(gen.map(r => r.income10)),
  fb = med(gen.map(r => r.firstBuyT));
rep(
  'V3',
  '첫 구매 ≤3분, 10분 수입 1.2k~3k',
  fb <= 180 && inc10 >= 1200 && inc10 <= 3000,
  `첫 구매 ${min(fb)}분, 10분 누적 수입 ${fmtK(inc10)}`
);
const sinkT = med(gen.map(r => r.sinkT));
rep(
  'V4',
  '필수 sink 소진 85~100% (≥9h)',
  sinkT / med(endG) >= 0.85 && sinkT <= med(endG) * 1.0 && sinkT >= 9 * 3600,
  `소진 ${hr(sinkT)}h = 총시간의 ${((sinkT / med(endG)) * 100).toFixed(0)}%`
);
const rate = z => {
  const v = gen.map(r => (r.snap[z].passive + r.snap[z].sell + r.snap[z].other) / Math.max(1, r.snap[z].sec));
  return med(v);
};
const rates = Array.from({length: 12}, (_, z) => rate(z));
const ratios = rates.slice(1).map((v, i) => v / rates[i]);
rep(
  'V5',
  '인접 구역 수입 비 1.2~2.2',
  ratios.every(x => x >= 1.2 && x <= 2.2),
  `수입/초 ${rates.map(x => x.toFixed(1)).join(' ')} · 비 ${ratios.map(x => x.toFixed(2)).join(' ')}`
);
const sellShare = z =>
  med(gen.map(r => r.snap[z].sell / Math.max(1, r.snap[z].passive + r.snap[z].sell + r.snap[z].other)));
const s1 = sellShare(0),
  s6 = sellShare(5),
  s12 = sellShare(11);
rep(
  'V6',
  '판매 비중 S1 15~25 / S6 5~12 / S12 ≤5 %',
  s1 >= 0.15 && s1 <= 0.25 && s6 >= 0.05 && s6 <= 0.12 && s12 <= 0.05,
  `S1 ${(s1 * 100).toFixed(0)}% S6 ${(s6 * 100).toFixed(0)}% S12 ${(s12 * 100).toFixed(0)}%`
);
const wait = n => med(eff.map(r => (r.vehWait[n] || 0) / 60));
const w = [
  ['ship', 60000],
  ['warp', 250000],
  ['glider', 400000],
].map(([n]) => [n, wait(n)]);
rep(
  'V7',
  '이동 수단 돈 대기 5~20분(효율 프로필)',
  w.every(([, m]) => m >= 5 && m <= 20),
  w.map(([n, m]) => `${n} ${m.toFixed(1)}분`).join(' · ')
);
const e = med(eff.map(r => r.endT)),
  l = med(rel.map(r => r.endT));
rep(
  'V8',
  '효율 ≥8.0h · 느긋 ≤14h',
  e / 3600 >= 8 && l / 3600 <= 14,
  `효율 ${hr(e)}h (P10 ${hr(
    pct(
      eff.map(r => r.endT),
      0.1
    )
  )}), 느긋 ${hr(l)}h (P90 ${hr(
    pct(
      rel.map(r => r.endT),
      0.9
    )
  )})`
);
const slow = runs(mk(), {...GENERAL, pace: 0.7}, Math.min(N, 40)),
  fast = runs(mk(), {...GENERAL, pace: 1.3}, Math.min(N, 40));
const dv = [med(slow.map(r => r.endT)), med(fast.map(r => r.endT))].map(x => (x - med(endG)) / med(endG));
rep(
  'V8b',
  '훔치기 속도 ±30% → 총시간 ±20% 이내',
  dv.every(x => Math.abs(x) <= 0.2),
  `느리게 ${(dv[0] * 100).toFixed(0)}% / 빠르게 ${(dv[1] * 100).toFixed(0)}%`
);
const sp = med(gen.map(r => r.spdMaxT)),
  sl = med(gen.map(r => r.slotMaxT));
rep(
  'V9',
  '신발 Lv30 8.5~10h · 칸 30 9~10.5h',
  sp / 3600 >= 8.5 && sp / 3600 <= 10 && sl / 3600 >= 9 && sl / 3600 <= 10.5,
  `신발 ${hr(sp)}h, 칸 ${hr(sl)}h`
);
const ts = med(gen.map(r => r.topShare));
rep('V10', '최고 행성 1개 수익 비중 ≤15%', ts <= 0.15, `${(ts * 100).toFixed(1)}%`);
const P = planets.P;
const v11 =
  P.every(p => p.price >= 5 && Number.isInteger(p.price)) &&
  P.every(a => P.every(b => !(a.t < b.t && planets_zone(a) === planets_zone(b) && a.price >= b.price)));
function planets_zone(p) {
  return pacing.ZONE_MUL.indexOf(p.price / pacing.TIER_MUL[p.t]);
}
rep(
  'V11',
  '가격 정수·≥5·구역 내 단조',
  v11,
  `행성 ${P.length}종 가격 ${Math.min(...P.map(p => p.price))}~${Math.max(...P.map(p => p.price))}`
);
const hz = [0, 1, 2, 3].map(i => med(gen.map(r => r.houseT[i] ?? NaN)));
const hAll = med(gen.map(r => r.houseT[3] ?? NaN));
rep(
  'V12',
  '집 4종 8~12h',
  hAll / 3600 >= 8 && hAll / 3600 <= 12,
  `엔딩 후 ${hr(hAll)}h (텐트 ${hr(hz[0])} 오두막 ${hr(hz[1])} 주택 ${hr(hz[2])}h)`
);
const dw = [4, 7, 10].map(z => med(gen.map(r => r.dexWait[z] / Math.max(1, r.zoneEnter[z] - r.zoneEnter[z - 1]))));
rep(
  'V13',
  '도감 게이트 대기 ≤ 구역 체류 60%',
  dw.every(x => x <= 0.6 || Number.isNaN(x)),
  `S4→S5 ${(dw[0] * 100).toFixed(0)}% · S7→S8 ${(dw[1] * 100).toFixed(0)}% · S10→S11 ${(dw[2] * 100).toFixed(0)}%`
);
console.log('\n[민감도] 일반 프로필의 총 시간(중앙값 h) — 플레이어 가정을 바꿨을 때');
const sens = [
  ['기준(보정값)', GENERAL],
  ['느린 손(tBase 8·tAct 14)', {...GENERAL, tBase: 8, tAct: 14}],
  ['아주 느린 손(tBase 12·tAct 25)', {...GENERAL, tBase: 12, tAct: 25}],
  ['자주 잡힘(pCatch 8%)', {...GENERAL, pCatch: 0.08}],
  ['둥지를 고르지 않음(look 1)', {...GENERAL, look: 1}],
  ['도감 사냥 없음(hunt 0)', {...GENERAL, hunt: 0}],
];
sens.forEach(([name, b]) => {
  const e = runs(mk(), b, 30).map(r => r.endT);
  console.log(`  ${name.padEnd(28)} ${hr(med(e))}h  (P10 ${hr(pct(e, 0.1))} ~ P90 ${hr(pct(e, 0.9))})`);
});
console.log(`\n(참고) 최고 단일 행성 t5 가격 ${pacing.priceOf(11, 5)} · 일반 프로필 tAct=${BEH.tAct}s`);
