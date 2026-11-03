/* 효과 정의 ① 성장 계열 — 어느 단계에서나 걸리는, 물질이 모여드는 현상들(운석은 run/run.ts의 위험 요소).
   각 효과는 step(상태 갱신) / back(몸체 뒤) / front(몸체 앞) 세 갈래로 연출을 나눠 갖는다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const kit = Gp._fx;
  const TAU = kit.TAU;
  const clamp = G.clamp;
  const DEFS: EffectDef[] = (Gp._EFFECT_DEFS = Gp._EFFECT_DEFS || []);

  // ===== 원시 원반의 잔해 ==================================================
  // 기울어진 먼지 원반이 몸체를 휘돈다. 뒤쪽 절반은 몸체에 가려지고 앞쪽 절반은 몸체를 가로지른다.
  function drawDisk(inst: EffectInst, env: EffectEnv, behind: boolean) {
    const { ctx, b, k, vs } = env;
    const tilt = 0.26, d = inst.data;
    ctx.globalCompositeOperation = 'lighter';
    if (behind) {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.scale(1, tilt);
      const g = ctx.createRadialGradient(0, 0, b.r * 1.05, 0, 0, b.r * 4.4);
      g.addColorStop(0, kit.hsl(28, 90, 62, 0.34 * k));
      g.addColorStop(0.35, kit.hsl(260, 70, 60, 0.14 * k));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, b.r * 4.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // 안쪽 가장자리의 달궈진 테두리
    ctx.strokeStyle = kit.hsl(32, 95, 70, 0.55 * k);
    ctx.lineWidth = 2 * vs;
    ctx.beginPath();
    if (behind) ctx.ellipse(b.x, b.y, b.r * 1.2, b.r * 1.2 * tilt, 0, Math.PI, TAU);
    else ctx.ellipse(b.x, b.y, b.r * 1.2, b.r * 1.2 * tilt, 0, 0, Math.PI);
    ctx.stroke();
    for (const g of d.grains) {
      const sy = Math.sin(g.a);
      if ((sy < 0) !== behind) continue;
      const heat = clamp(1 - (g.f - 1.1) / 2.4, 0, 1);
      const x = b.x + Math.cos(g.a) * b.r * g.f;
      const y = b.y + sy * b.r * g.f * tilt + g.z * b.r * 0.06;
      ctx.fillStyle = kit.hsl(kit.hueLerp(250, 28, heat), 80, 52 + 28 * heat, (0.3 + 0.5 * heat) * k);
      ctx.beginPath(); ctx.arc(x, y, g.s * vs * (0.9 + 1.1 * heat), 0, TAU); ctx.fill();
    }
  }
  DEFS.push({
    id: 'disk', name: '원시 원반의 잔해', icon: '💫', kind: 'buff', duration: 12, weight: 1.8,
    desc: '흩어지지 않은 먼지 원반이 몸 주위를 휘돌며 물질을 안쪽으로 흘려보낸다.',
    mods: { absorb: 1.5 },
    condition: (s) => !s.hasFusion,
    start(inst) {
      const grains = [];
      for (let i = 0; i < 280; i++) grains.push({ a: inst.rnd() * TAU, f: 1.3 + Math.pow(inst.rnd(), 1.5) * 3.3, s: 0.6 + inst.rnd() * 1.7, z: inst.rnd() - 0.5 });
      inst.data = { grains, feed: 0 };
    },
    step(inst, env) {
      const d = inst.data;
      for (const g of d.grains) {
        g.a += (2.0 / Math.pow(g.f, 1.5)) * env.dt;      // 안쪽일수록 빠르다(케플러)
        g.f -= env.dt * 0.08;                            // 천천히 안쪽으로 나선
        if (g.f < 1.12) { g.f = 3.9 + inst.rnd() * 0.8; g.a = inst.rnd() * TAU; }
      }
      d.feed += env.dt;
      if (d.feed > 0.6) {
        d.feed = 0;
        const a = inst.rnd() * TAU, f = 2.4 + inst.rnd() * 1.8;
        G.Nebula.emit(env.b.x + Math.cos(a) * env.b.r * f, env.b.y + Math.sin(a) * env.b.r * f * 0.26, 4, 25 + inst.rnd() * 30, { speed: 30, tang: 1 });
      }
    },
    back(inst, env) { drawDisk(inst, env, true); },
    front(inst, env) { drawDisk(inst, env, false); },
    sound(A) { A.playSweep(180, 420, 1.1); A.playTone(330, 0.5, 'sine', 0.08, 0.2); },
  });

  // ===== 거대 분자운 통과 ==================================================
  // 화면 전체를 가로지르는 짙은 구름. 지나가는 동안 키 한 번에 훨씬 큰 성운이 생긴다.
  DEFS.push({
    id: 'molecular', name: '거대 분자운 통과', icon: '☁️', kind: 'buff', duration: 12, weight: 1.2,
    desc: '짙은 가스 구름 속을 지난다. 한 칸 나아갈 때마다 더 큰 성운이 모여든다.',
    mods: { cloud: 1.8, absorb: 1.1 },
    condition: () => true,
    start(inst) {
      const W = G.Render.W, H = G.Render.H, blobs = [], motes = [], fil = [], stars = [];
      for (let i = 0; i < 46; i++) blobs.push({ x: inst.rnd() * W * 1.6, y: inst.rnd() * H, r: (90 + inst.rnd() * 190), h: [320, 285, 190, 245][Math.floor(inst.rnd() * 4)] + inst.rnd() * 20, a: 0.08 + inst.rnd() * 0.1, sp: 0.7 + inst.rnd() * 0.6 });
      for (let i = 0; i < 16; i++) fil.push({ x: inst.rnd() * W * 1.6, y: inst.rnd() * H, len: 220 + inst.rnd() * 380, bend: (inst.rnd() - 0.5) * 220, w: 8 + inst.rnd() * 22, sp: 0.8 + inst.rnd() * 0.5 });
      for (let i = 0; i < 90; i++) motes.push({ x: inst.rnd() * W, y: inst.rnd() * H, s: 0.5 + inst.rnd() * 1.4, sp: 90 + inst.rnd() * 220 });
      for (let i = 0; i < 40; i++) stars.push({ x: inst.rnd() * W * 1.6, y: inst.rnd() * H, ph: inst.rnd() * TAU, sp: 0.8 + inst.rnd() * 0.5 });
      inst.data = { blobs, motes, fil, stars, W };
    },
    step(inst, env) {
      const d = inst.data, W = env.W, shift = W * 0.07 * env.dt;
      for (const o of d.blobs) { o.x -= shift * o.sp; if (o.x < -o.r) o.x += W * 1.6 + o.r; }
      for (const o of d.fil) { o.x -= shift * o.sp; if (o.x < -o.len) o.x += W * 1.6 + o.len; }
      for (const o of d.stars) { o.x -= shift * o.sp; if (o.x < -10) o.x += W * 1.6; }
      for (const m of d.motes) { m.x -= m.sp * env.dt; if (m.x < -5) { m.x = W + 5; m.y = inst.rnd() * env.H; } }
    },
    back(inst, env) {
      const { ctx, k, t } = env, d = inst.data;
      ctx.globalCompositeOperation = 'lighter';
      for (const o of d.blobs) kit.glow(ctx, o.x, o.y, o.r, kit.hsl(o.h, 70, 48, o.a * k), 'rgba(0,0,0,0)');
      for (const s of d.stars) kit.sparkle(ctx, s.x, s.y, 3 + 2 * Math.sin(t * 2 + s.ph), t * 0.3, 'rgba(255,255,255,' + (0.35 * k * (0.6 + 0.4 * Math.sin(t * 3 + s.ph))).toFixed(3) + ')');
      // 빛을 가리는 어두운 먼지 띠
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      for (const o of d.fil) {
        ctx.strokeStyle = 'rgba(2,3,12,' + (0.3 * k).toFixed(3) + ')';
        ctx.lineWidth = o.w;
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.quadraticCurveTo(o.x + o.len / 2, o.y + o.bend, o.x + o.len, o.y); ctx.stroke();
      }
    },
    front(inst, env) {
      const { ctx, k } = env, d = inst.data;
      ctx.globalCompositeOperation = 'lighter';
      for (const m of d.motes) {
        ctx.strokeStyle = 'rgba(210,190,255,' + (0.22 * k).toFixed(3) + ')';
        ctx.lineWidth = m.s;
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + m.sp * 0.07, m.y); ctx.stroke();
      }
    },
    sound(A) { A.playSweep(90, 200, 1.6); A.playTone(196, 0.9, 'sine', 0.07, 0.3); },
  });

  // ===== 쌍둥이 원시성 경쟁 ================================================
  // 오른쪽 위에 경쟁 천체가 나타나 같은 성운을 노린다. 거기 닿은 입자는 빼앗긴다.
  function rivalPos(inst: EffectInst, env: EffectEnv) {
    const t = env.age, vs = env.vs;
    return {
      x: clamp(env.b.x + 360 * vs + Math.sin(t * 0.7) * 40 * vs, 80, env.W - 80),
      y: clamp(env.b.y - 120 * vs + Math.cos(t * 0.9) * 34 * vs, 150, env.H - 80),
      r: 17 * vs * (0.5 + 0.5 * env.k),
    };
  }
  DEFS.push({
    id: 'rival', name: '쌍둥이 원시성 경쟁', icon: '⚔️', kind: 'debuff', duration: 11, weight: 1.2,
    desc: '같은 물질을 노리는 또 다른 원시체가 나타났다. 가까운 성운은 그쪽으로 끌려간다.',
    mods: { absorb: 0.85 },
    condition: (s) => !s.hasFusion,
    start(inst) { inst.data = { flash: 0, stolen: 0 }; },
    step(inst, env) {
      const d = inst.data, p = rivalPos(inst, env);
      d.pos = p; d.flash = Math.max(0, d.flash - env.dt * 3);
      G.Nebula.attractors.push({
        x: p.x, y: p.y, r: p.r, gm: G.Nebula.GM * 0.55 * env.k,
        hit() { d.flash = 1; d.stolen++; if (d.stolen % 3 === 1) G.Nebula.floatText(p.x, p.y - p.r - 10, '−', 0, 16); },
      });
    },
    front(inst, env) {
      const { ctx, k, t, b } = env, d = inst.data, p = d.pos;
      if (!p) return;
      ctx.globalCompositeOperation = 'lighter';
      // 중력 등고선과 몸체를 잇는 점선(흐르는 방향 = 빼앗기는 방향)
      for (let i = 1; i <= 3; i++) {
        ctx.strokeStyle = kit.hsl(8, 85, 62, (0.22 - i * 0.05) * k);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.8 + i * 1.3 + 0.3 * Math.sin(t * 3 + i)), 0, TAU); ctx.stroke();
      }
      ctx.setLineDash([5, 9]); ctx.lineDashOffset = -t * 30;
      ctx.strokeStyle = kit.hsl(5, 85, 62, 0.22 * k);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.setLineDash([]);
      kit.glow(ctx, p.x, p.y, p.r * 3.4, kit.hsl(12, 90, 55, (0.35 + 0.4 * d.flash) * k), 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
      g.addColorStop(0, '#ffd2a0'); g.addColorStop(0.55, '#d4572e'); g.addColorStop(1, '#4a1410');
      ctx.globalAlpha = k; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      // 삼킬 때마다 번쩍이는 링
      if (d.flash > 0) {
        ctx.globalAlpha = d.flash * k; ctx.strokeStyle = '#ff9a7a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.2 + (1 - d.flash) * 1.6), 0, TAU); ctx.stroke();
      }
    },
    sound(A) { A.playTone(150, 0.4, 'sawtooth', 0.07); A.playTone(112, 0.5, 'sawtooth', 0.07, 0.18); },
  });

  // ===== 자전 가속 =========================================================
  DEFS.push({
    id: 'spin', name: '자전 가속', icon: '🌪️', kind: 'buff', duration: 10, weight: 1.2,
    desc: '회전이 빨라지며 적도가 부푼다. 성운이 더 크게 휘돌아 들어온다.',
    mods: { spin: 3.2, absorb: 1.2, swirl: 2.4 },
    condition: () => true,
    start(inst) {
      const streaks = [];
      for (let i = 0; i < 14; i++) streaks.push({ a: inst.rnd() * TAU, w: 2.2 + inst.rnd() * 2.6, len: 0.7 + inst.rnd() * 0.9, f: 1.12 + inst.rnd() * 0.5, h: 190 + inst.rnd() * 60 });
      inst.data = { streaks, dust: [], acc: 0 };
    },
    step(inst, env) {
      const d = inst.data, b = env.b;
      for (const s of d.streaks) s.a += s.w * env.dt;
      d.acc += env.dt;
      while (d.acc > 0.035) {            // 적도에서 원심력으로 튕겨 나가는 먼지
        d.acc -= 0.035;
        const a = inst.rnd() < 0.5 ? 0 : Math.PI, off = (inst.rnd() - 0.5) * 0.3;
        const sp = 120 + inst.rnd() * 120;
        d.dust.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(off) * b.r * 0.2, vx: Math.cos(a) * sp, vy: (inst.rnd() - 0.5) * 60, t: 0 });
      }
      for (let i = d.dust.length - 1; i >= 0; i--) {
        const u = d.dust[i]; u.t += env.dt; u.x += u.vx * env.dt; u.y += u.vy * env.dt;
        if (u.t > 0.9) d.dust.splice(i, 1);
      }
    },
    back(inst, env) {
      const { ctx, b, k } = env;
      ctx.globalCompositeOperation = 'lighter';
      for (const s of inst.data.streaks) kit.arcTrail(ctx, b.x, b.y, b.r * s.f, b.r * s.f * 0.24, s.a, s.len, s.h, 0.55 * k, 2, -1);
    },
    front(inst, env) {
      const { ctx, b, k, t } = env, d = inst.data;
      ctx.globalCompositeOperation = 'lighter';
      for (const s of d.streaks) kit.arcTrail(ctx, b.x, b.y, b.r * s.f, b.r * s.f * 0.24, s.a, s.len, s.h, 0.7 * k, 2.2, 1);
      // 적도 띠 — 박동하는 빛
      ctx.strokeStyle = kit.hsl(200, 90, 82, (0.28 + 0.18 * Math.sin(t * 9)) * k);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.03, b.r * 0.2, 0, 0, Math.PI); ctx.stroke();
      for (const u of d.dust) {
        ctx.fillStyle = kit.hsl(205, 70, 80, (1 - u.t / 0.9) * 0.7 * k);
        ctx.beginPath(); ctx.arc(u.x, u.y, 1.6, 0, TAU); ctx.fill();
      }
    },
    sound(A) { A.playSweep(120, 640, 1.4); },
  });

  // ===== 암흑 물질 헤일로 ==================================================
  DEFS.push({
    id: 'halo', name: '암흑 물질 헤일로', icon: '🌑', kind: 'buff', duration: 12, weight: 1,
    desc: '보이지 않던 암흑 물질 구름이 드러난다. 중력이 두 배 가까이 강해진다.',
    mods: { gravity: 1.9 },
    condition: () => true,
    start(inst) {
      const motes = [], arcs = [];
      for (let i = 0; i < 110; i++) motes.push({ a: inst.rnd() * TAU, f: 2.5 + inst.rnd() * 6, w: 0.25 + inst.rnd() * 0.5, ph: inst.rnd() * TAU });
      for (let i = 0; i < 4; i++) arcs.push({ a: inst.rnd() * TAU, f: 3.6 + inst.rnd() * 2.2, w: (inst.rnd() - 0.5) * 0.5 });
      inst.data = { motes, arcs };
    },
    step(inst, env) {
      for (const m of inst.data.motes) m.a += m.w * env.dt / Math.sqrt(m.f);
      for (const a of inst.data.arcs) a.a += a.w * env.dt;
    },
    back(inst, env) {
      const { ctx, b, k, t } = env, d = inst.data;
      ctx.globalCompositeOperation = 'lighter';
      kit.glow(ctx, b.x, b.y, b.r * 9, kit.hsl(268, 70, 50, 0.2 * k), 'rgba(0,0,0,0)');
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.setLineDash([7, 11]); ctx.lineDashOffset = -t * (14 + i * 6) * (i % 2 ? -1 : 1);
        ctx.strokeStyle = kit.hsl(270, 75, 72, 0.22 * k);
        ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * (3 + i * 1.5), b.r * (3 + i * 1.5) * 0.82, 0.3, 0, TAU); ctx.stroke();
      }
      ctx.setLineDash([]);
      // 배경 빛이 휘어 보이는 아인슈타인 호
      for (const a of d.arcs) {
        const g = ctx.createLinearGradient(b.x - b.r * a.f, b.y, b.x + b.r * a.f, b.y);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, kit.hsl(285, 90, 82, 0.6 * k)); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * a.f, a.a, a.a + 0.55); ctx.stroke();
      }
      for (const m of d.motes) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + m.ph);
        ctx.fillStyle = kit.hsl(275, 70, 78, 0.45 * tw * k);
        ctx.beginPath(); ctx.arc(b.x + Math.cos(m.a) * b.r * m.f, b.y + Math.sin(m.a) * b.r * m.f * 0.82, 1.3, 0, TAU); ctx.fill();
      }
    },
    sound(A) { A.playTone(65, 1.6, 'sine', 0.14); A.playTone(98, 1.4, 'sine', 0.08, 0.2); },
  });

  // ===== 중력파 통과 =======================================================
  // 합쳐지는 쌍성이 보낸 파동. 간격이 점점 짧아지다(처프) 마지막에 가장 큰 파동이 온다.
  DEFS.push({
    id: 'gwave', name: '중력파 통과', icon: '〰️', kind: 'buff', duration: 9, weight: 1,
    desc: '시공간이 일렁인다. 파동이 몸체를 스칠 때마다 중력장이 크게 출렁이고 흡수가 늘어난다.',
    mods: { absorb: 1.3 },
    condition: () => true,
    start(inst) { inst.data = { rings: [], next: 0.2, gap: 1.3, big: false }; },
    step(inst, env) {
      const d = inst.data, W = env.W, H = env.H;
      const ox = W * 0.92, oy = H * 0.3;
      d.ox = ox; d.oy = oy;
      d.next -= env.dt;
      if (d.next <= 0 && env.p < 0.9) {
        d.rings.push({ r: 0, v: 560 * env.vs, hit: false, big: false });
        d.gap = Math.max(0.32, d.gap * 0.78); d.next = d.gap;
        G.Audio.playTone(300 + (1.3 - d.gap) * 700, 0.1, 'sine', 0.05);
      }
      if (!d.big && env.p > 0.9) { d.big = true; d.rings.push({ r: 0, v: 760 * env.vs, hit: false, big: true }); G.Audio.playSweep(200, 1200, 0.8); kit.shake(5); }
      const bd = Math.hypot(env.b.x - ox, env.b.y - oy);
      for (let i = d.rings.length - 1; i >= 0; i--) {
        const r = d.rings[i];
        r.r += r.v * env.dt;
        if (!r.hit && r.r >= bd) {          // 파동이 몸체를 지나는 순간
          r.hit = true; G.Nebula.pulse(r.big ? 1.1 : 0.5); kit.shake(r.big ? 7 : 2.5);
          G.Nebula.ring(env.b.x, env.b.y, env.b.r, env.b.r * (r.big ? 5 : 3), 0.8, 250, 2, 0.6);
        }
        if (r.r > W * 1.4) d.rings.splice(i, 1);
      }
    },
    front(inst, env) {
      const { ctx, k } = env, d = inst.data;
      if (d.ox == null) return;
      ctx.globalCompositeOperation = 'lighter';
      const maxR = env.W * 1.3;
      for (const r of d.rings) {
        const a = clamp(1 - r.r / maxR, 0, 1) * (r.big ? 0.7 : 0.38) * k;
        // 색수차처럼 붉은/푸른 윤곽을 살짝 어긋나게
        ctx.lineWidth = r.big ? 5 : 3;
        ctx.strokeStyle = 'rgba(255,90,110,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(d.ox, d.oy, r.r + 2.5, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(90,200,255,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(d.ox, d.oy, r.r - 2.5, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + (a * 0.5).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(d.ox, d.oy, r.r, 0, TAU); ctx.stroke();
      }
      // 파동의 근원: 합쳐지는 한 쌍
      const sp = env.age * (6 + env.p * 30);
      for (let i = 0; i < 2; i++) {
        const a = sp + i * Math.PI, rr = (22 - 14 * env.p) * env.vs;
        kit.glow(ctx, d.ox + Math.cos(a) * rr, d.oy + Math.sin(a) * rr * 0.6, 12 * env.vs, 'rgba(210,220,255,' + (0.7 * k).toFixed(3) + ')', 'rgba(0,0,0,0)');
      }
    },
    sound(A) { A.playSweep(60, 140, 1.4); },
  });
})();
