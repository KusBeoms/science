// 경제 시뮬레이터 엔진: 1초 틱으로 "훔치기 → 입고 → 수익/판매 → 구매 → 시험" 루프를 돌린다.
// 설정(cfg)은 상수·데이터, 행동(beh)은 플레이어 가정. 사용법은 econ-sim.mjs.

export const mulberry32 = a => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const RUN_MUL = 1.25; // 스태미나 달리기의 평균 속도 배율 (달리기 ×1.7, 5초 달리고 회복)
const CARRY_SLOW = 0.9; // 행성을 들고 돌아올 때 평균 속도 배율
const isNight = t => t % 312 >= 300; // 낮 300초 + 밤 12초(성장 ×30)

export function simulate(cfg, beh, seed, opt = {}) {
  const rnd = cfg.rng(seed),
    Z = cfg.zones,
    sh = cfg.shop,
    st = {
      t: 0, cash: 0, zone: cfg.startZone, enterT: 0, spd: 0, slots: sh.slots.start, bag: 0, springN: 0, cosN: 0,
      base: [], dex: new Set(), stolen: 0, bought: 0, spent: 0, earned: 0, mi: 0, own: new Set(),
    },
    r = {
      zoneEnter: [], enterIncome: [], enterSpend: [], endT: null, firstBuyT: null, income10: null,
      spdMaxT: null, slotMaxT: null, sinkT: null, dexWait: Z.map(() => 0), vehWait: {}, vehReady: {},
      topShare: null, snap: null, houseT: [], zoneInc: Z.map(() => ({passive: 0, sell: 0, other: 0, sec: 0})),
    };
  let busy = 0, job = null, baseSec = 0, cometAt = 60 + rnd() * 30, ended = false, lastEnter = 0, examAt = 0;
  const pickFrom = pool => {
    let s = 0;
    for (const p of pool) s += cfg.rw[p.t];
    let x = rnd() * s;
    for (const p of pool) if ((x -= cfg.rw[p.t]) <= 0) return p;
    return pool[0];
  };
  const mulOf = o => o.mut * cfg.studyMul;
  const sellVal = o => o.p.price * cfg.sellRate * mulOf(o);
  const cap = () => 1 + st.bag;
  const sprBonus = () => (st.springN ? sh.springs[st.springN - 1].bonus : 0);
  const speed = () => (cfg.speed.base + cfg.speed.perLv * st.spd + sprBonus()) * RUN_MUL;
  const filled = () => st.base.filter(Boolean).length;
  const income = () => {
    let sum = 0;
    for (const o of st.base) if (o && o.left <= 0) sum += (o.p.price / cfg.incDiv) * mulOf(o);
    return (cfg.baseInc + sum) * (1 + cfg.dexBonus * st.dex.size);
  };
  const gain = (n, kind) => {
    st.cash += n;
    st.earned += n;
    r.zoneInc[Math.max(0, st.zone)][kind] += n;
  };
  const nextGate = () => {
    const z = st.zone + 1;
    return z < Z.length ? Z[z].gate : null;
  };

  // 구매 가능한 다음 품목 목록 (가격이 낮은 순으로 고르는 정책을 위해 이름·가격·실행)
  const candidates = () => {
    const out = [];
    if (st.spd < sh.spd.max) out.push({k: 'spd', cost: sh.spd.cost(st.spd), buy: () => st.spd++});
    if (st.slots < sh.slots.max) out.push({k: 'slot', cost: sh.slots.cost(st.slots), buy: () => st.slots++});
    if (st.bag < sh.bags.length) out.push({k: 'bag', cost: sh.bags[st.bag], buy: () => st.bag++});
    if (st.springN < sh.springs.length)
      out.push({k: 'spr', cost: sh.springs[st.springN].cost, buy: () => st.springN++});
    for (const e of sh.extras)
      if (!st.own.has(e.name) && e.minZone <= st.zone && (!e.after || st.own.has(e.after)))
        out.push({k: e.name, cost: e.cost, buy: () => st.own.add(e.name)});
    return out;
  };
  const cosmetic = () => {
    const c = sh.cosmetics[st.cosN];
    return c && c.zone <= st.zone ? {k: 'cos', cost: c.cost, buy: () => st.cosN++} : null;
  };
  const spend = c => {
    st.cash -= c.cost;
    st.spent += c.cost;
    st.bought++;
    c.buy();
    if (r.firstBuyT === null) r.firstBuyT = st.t;
    if (st.spd >= sh.spd.max && r.spdMaxT === null) r.spdMaxT = st.t;
    if (st.slots >= sh.slots.max && r.slotMaxT === null) r.slotMaxT = st.t;
  };

  // 다음 구역 시험을 볼 수 있는가: 부족한 조건을 문자열로 (빈 문자열이면 가능)
  const gateMiss = () => {
    const g = nextGate();
    if (!g) return 'end';
    const z = st.zone + 1,
      miss = [];
    if (g.dex && st.dex.size < g.dex) miss.push('dex');
    if (g.spd && st.spd < g.spd) miss.push('spd');
    if (g.vehicle && !st.own.has(g.vehicle)) miss.push('veh');
    if (z > 0 && st.t - lastEnter < g.minStay * beh.stayFrac) miss.push('stay');
    if (beh.completionist && cfg.spendGate && st.spent < cfg.spendGate[z]) miss.push('spend');
    return miss.join(',');
  };

  const stealZone = () => {
    const g = nextGate();
    if (g && g.dex && st.dex.size < g.dex)
      for (let z = st.zone; z >= 0; z--) if (Z[z].pool.some(p => !st.dex.has(p.id))) return z;
    if (beh.hunt && rnd() < beh.hunt)
      for (let z = st.zone; z >= 0; z--) if (Z[z].pool.some(p => !st.dex.has(p.id))) return z;
    return Math.max(0, st.zone);
  };
  const choose = (pool, needNew) => {
    let best = null, bs = -1;
    for (let k = 0; k < beh.look; k++) {
      const p = pickFrom(pool),
        isNew = !st.dex.has(p.id),
        s = p.price * (isNew ? (needNew ? 4 : 2) : 1);
      if (s > bs) (bs = s), (best = p);
    }
    return best;
  };
  const rollMut = () => (rnd() < cfg.mutChance[0] ? 3 : rnd() < cfg.mutChance[1] ? 2 : 1);

  const startSteal = () => {
    const z = stealZone(),
      pool = Z[z].pool,
      g = nextGate(),
      needNew = !!(g && g.dex && st.dex.size < g.dex) || !!beh.hunt,
      n = Math.min(cap(), st.slots - filled()),
      v = speed();
    let sec = (Z[z].dist / v) * (1 + 1 / CARRY_SLOW) / beh.pace + beh.tBase;
    const got = [];
    for (let i = 0; i < n; i++) {
      let tries = 0;
      while (rnd() > beh.pQuiz && tries++ < 6) sec += (beh.tAct + 15) / beh.pace;
      sec += beh.tAct / beh.pace;
      got.push(choose(pool, needNew));
    }
    job = () => {
      if (rnd() < beh.pCatch * (1 + z * 0.1)) {
        st.cash -= Math.floor(st.cash * 0.15);
        return;
      }
      for (const p of got) {
        const i = st.base.findIndex((o, k) => k < st.slots && !o);
        const o = {p, mut: rollMut(), left: cfg.grow[p.t]};
        if (i < 0) st.base.push(o);
        else st.base[i] = o;
        st.stolen++;
        if (!st.dex.has(p.id)) {
          st.dex.add(p.id);
          gain(p.price / cfg.dexDiv, 'other');
        }
      }
    };
    busy = Math.max(1, Math.round(sec));
    baseSec += 6;
  };
  const sellLowest = () => {
    let bi = -1, bv = Infinity;
    st.base.forEach((o, i) => {
      if (o && sellVal(o) < bv) (bv = sellVal(o)), (bi = i);
    });
    if (bi < 0) return false;
    gain(bv, 'sell');
    st.base[bi] = null;
    busy = 2;
    baseSec += 2;
    return true;
  };
  // 부족한 돈을 가장 싼 행성 한두 개를 팔아 채울 수 있으면 판다 (첫 신발 등)
  const sellToBuy = want => {
    if (!beh.sellToBuy || !want) return false;
    const vals = st.base.filter(Boolean).map(sellVal).sort((a, b) => a - b);
    return vals.length && st.cash + vals[0] + (vals[1] || 0) >= want && st.cash < want && vals[0] <= want && sellLowest();
  };

  const decide = () => {
    // 1) 구매: 싼 것부터. 시험 조건이 돈(이동 수단)만 남았으면 그 품목을 위해 저축한다
    const miss = gateMiss(), g = nextGate();
    const saveFor = g && g.vehicle && miss === 'veh' ? sh.extras.find(e => e.name === g.vehicle) : null;
    for (let n = 0; n < 8; n++) {
      let c = candidates().filter(x => !saveFor || x.k === saveFor.name).sort((a, b) => a.cost - b.cost)[0];
      if (!c || c.cost > st.cash) c = saveFor ? null : cosmetic();
      if (c && c.cost <= st.cash && (c.k !== 'cos' || st.cash >= c.cost * beh.cosFactor)) {
        spend(c);
        busy += beh.uiSec;
        baseSec += beh.uiSec;
        continue;
      }
      break;
    }
    if (busy > 0) return;
    // 2) 시험
    if (miss === '' && st.t >= examAt) {
      busy = beh.tExam;
      job = () => {
        if (rnd() < beh.pExam) enter(st.zone + 1);
        else examAt = st.t + cfg.examRetry;
      };
      return;
    }
    if (miss === 'dex') r.dexWait[Math.max(0, st.zone + 1)]++;
    if (saveFor) {
      r.vehWait[saveFor.name] = (r.vehWait[saveFor.name] || 0) + 1;
      if (r.vehReady[saveFor.name] === undefined) r.vehReady[saveFor.name] = st.t;
    }
    // 3) 훔치기 / 판매
    const cheap = candidates().sort((a, b) => a.cost - b.cost)[0];
    if (sellToBuy(saveFor ? saveFor.cost : cheap && cheap.cost)) return;
    if (st.slots - filled() <= 0) {
      if (!sellLowest()) busy = 1;
      return;
    }
    startSteal();
  };

  const enter = z => {
    st.zone = z;
    lastEnter = st.t;
    st.enterT = st.t;
    r.zoneEnter[z] = st.t;
    r.enterIncome[z] = st.earned;
    r.enterSpend[z] = st.spent;
  };
  const missionTick = () => {
    const m = cfg.missions[st.mi];
    if (!m) return;
    const cur = {stolen: st.stolen, bought: st.bought, zone: st.zone + 1, dex: st.dex.size, springs: st.springN + 1}[m[0]];
    if (cur >= m[1]) {
      gain(m[2] * cfg.missionMul, 'other');
      st.mi++;
    }
  };

  if (st.zone >= 0) enter(st.zone);
  const maxT = opt.maxT || 3600 * 40;
  while (st.t < maxT) {
    const inc = income(),
      growth = isNight(st.t) ? 30 : 1;
    gain(inc, 'passive');
    r.zoneInc[Math.max(0, st.zone)].sec++;
    for (const o of st.base) if (o && o.left > 0) o.left -= growth;
    st.t++;
    if (r.income10 === null && st.t === 600) r.income10 = st.earned;
    if (baseSec >= cometAt) {
      baseSec = 0;
      cometAt = 60 + rnd() * 30;
      if (rnd() < beh.cometCatch) gain(income() * 40, 'other');
    }
    missionTick();
    if (opt.probe && st.t % opt.probeEvery === 0) opt.probe(st, income());
    if (busy > 0 && --busy === 0 && job) {
      const j = job;
      job = null;
      j();
    }
    if (busy === 0) decide();
    if (r.sinkT === null && st.spent >= cfg.sinkTotal * 0.99) r.sinkT = st.t;
    if (!ended && cfg.done(st, beh)) {
      ended = true;
      r.endT = st.t;
      r.snap = r.zoneInc.map(z => ({...z}));
      const base = st.base.filter(Boolean).map(o => (o.p.price / cfg.incDiv) * mulOf(o));
      if (base.length) r.topShare = Math.max(...base) / base.reduce((a, b) => a + b);
      if (!cfg.post) break;
      gain(cfg.post.lump, 'other');
      cfg.post.houses.forEach((c, i) =>
        sh.extras.push({name: 'house' + i, cost: c, minZone: 0, after: i ? 'house' + (i - 1) : null})
      );
    }
    if (ended && cfg.post && r.houseT.length < cfg.post.houses.length)
      cfg.post.houses.forEach((c, i) => {
        if (st.own.has('house' + i) && r.houseT[i] === undefined) r.houseT[i] = st.t - r.endT;
      });
    else if (ended && cfg.post) break;
  }
  return r;
}
