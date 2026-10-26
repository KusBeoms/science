/* 효과 정의 ② 항성 계열 — 핵융합이 시작된 뒤에만 걸리는 현상들 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const kit = Gp._fx;
  const TAU = kit.TAU;
  const clamp = G.clamp;
  const DEFS: EffectDef[] = (Gp._EFFECT_DEFS = Gp._EFFECT_DEFS || []);

  // 점화 후 2광년(=20초) 이상 지나야 열리는 후반 효과의 공통 조건
  const late = (s: GameState) => s.hasFusion && s.postIgnitionDistanceLy >= 2.0;

  // ===== 핵융합 폭주 =======================================================
  DEFS.push({
    id: 'runaway', name: '핵융합 폭주', icon: '🔥', kind: 'event', duration: 9, weight: 1.3,
    desc: '중심부 반응이 걷잡을 수 없이 빨라진다. 연료는 두 배로 타지만 더 세게 끌어당긴다.',
    mods: { fuelBurn: 2.1, absorb: 1.4 },
    condition: (s) => s.hasFusion,
    start(inst) { inst.data = { rings: [], next: 0, arcSeed: 0, arcs: [], sparks: [] }; },
    step(inst, env) {
      const d = inst.data, b = env.b;
      d.next -= env.dt;
      if (d.next <= 0) { d.next = 1.0; d.rings.push({ t: 0 }); G.Audio.playTone(70, 0.4, 'sine', 0.1); kit.shake(1.6); }
      for (let i = d.rings.length - 1; i >= 0; i--) { d.rings[i].t += env.dt; if (d.rings[i].t > 1.4) d.rings.splice(i, 1); }
      d.arcSeed -= env.dt;
      if (d.arcSeed <= 0) {                    // 플라즈마 방전 호를 0.12초마다 새로 뽑는다
        d.arcSeed = 0.12; d.arcs = [];
        for (let i = 0; i < 6; i++) {
          const a = inst.rnd() * TAU, len = b.r * (0.5 + inst.rnd() * 0.9), pts = [];
          let x = b.x + Math.cos(a) * b.r, y = b.y + Math.sin(a) * b.r, ang = a;
          pts.push([x, y]);
          for (let s = 0; s < 6; s++) { ang += (inst.rnd() - 0.5) * 1.1; x += Math.cos(ang) * len / 6; y += Math.sin(ang) * len / 6; pts.push([x, y]); }
          d.arcs.push(pts);
        }
      }
      if (inst.rnd() < env.dt * 40) {
        const a = inst.rnd() * TAU, sp = 90 + inst.rnd() * 160;
        d.sparks.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0 });
      }
      for (let i = d.sparks.length - 1; i >= 0; i--) {
        const s = d.sparks[i]; s.t += env.dt; s.x += s.vx * env.dt; s.y += s.vy * env.dt;
        if (s.t > 0.9) d.sparks.splice(i, 1);
      }
    },
    front(inst, env) {
      const { ctx, b, k, t } = env, d = inst.data;
      ctx.globalCompositeOperation = 'lighter';
      // 몸체 전체가 박동하며 달아오른다
      kit.glow(ctx, b.x, b.y, b.r * 1.35, 'rgba(255,200,120,' + (0.22 * k * (0.6 + 0.4 * Math.sin(t * 13))).toFixed(3) + ')', 'rgba(0,0,0,0)');
      // 열기 때문에 일렁이는 대기층
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = kit.hsl(30, 90, 75, 0.2 * k);
        ctx.lineWidth = 1.4; ctx.beginPath();
        for (let s = 0; s <= 60; s++) {
          const a = (s / 60) * TAU, rr = b.r * (1.3 + i * 0.11) + Math.sin(a * 9 + t * 7 + i * 2) * 3;
          const x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr;
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (const r of d.rings) {                 // 바깥으로 퍼지는 충격파
        const u = r.t / 1.4;
        ctx.strokeStyle = kit.hsl(36, 95, 80, (1 - u) * 0.6 * k);
        ctx.lineWidth = 3 * (1 - u) + 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1 + u * 2.4), 0, TAU); ctx.stroke();
      }
      for (const pts of d.arcs) {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.strokeStyle = 'rgba(255,150,60,' + (0.35 * k).toFixed(3) + ')'; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,245,220,' + (0.9 * k).toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      for (const s of d.sparks) {
        ctx.fillStyle = kit.hsl(40, 95, 75, (1 - s.t / 0.9) * k);
        ctx.beginPath(); ctx.arc(s.x, s.y, 1.5, 0, TAU); ctx.fill();
      }
    },
    sound(A) { A.playSweep(80, 500, 1.2); A.playNoiseBurst(0.3, 0.08); },
  });

  // ===== 항성풍 분출 =======================================================
  DEFS.push({
    id: 'wind', name: '항성풍 분출', icon: '💨', kind: 'debuff', duration: 9, weight: 1.2,
    desc: '표면에서 물질이 뿜어져 나간다. 질량이 서서히 깎이고 성운을 덜 끌어당긴다.',
    mods: { massDrain: 0.012, gravity: 0.6 },
    condition: (s) => s.hasFusion,
    start(inst) { inst.data = { p: [], bow: [], loops: [], nb: 0, nl: 0 }; },
    step(inst, env) {
      const d = inst.data, b = env.b;
      for (let i = 0; i < 3; i++) {
        const a = inst.rnd() * TAU;
        d.p.push({ a, r: b.r * 1.02, v: 40 + inst.rnd() * 60, t: 0, w: 0.6 + inst.rnd() * 1.4 });
      }
      for (let i = d.p.length - 1; i >= 0; i--) {
        const q = d.p[i]; q.t += env.dt; q.v += 260 * env.dt; q.r += q.v * env.dt;
        if (q.t > 1.4) d.p.splice(i, 1);
      }
      d.nb -= env.dt; if (d.nb <= 0) { d.nb = 0.7; d.bow.push({ t: 0 }); }
      for (let i = d.bow.length - 1; i >= 0; i--) { d.bow[i].t += env.dt; if (d.bow[i].t > 1.6) d.bow.splice(i, 1); }
      d.nl -= env.dt; if (d.nl <= 0) { d.nl = 0.5; d.loops.push({ a: inst.rnd() * TAU, span: 0.3 + inst.rnd() * 0.3, h: 0.35 + inst.rnd() * 0.5, t: 0 }); }
      for (let i = d.loops.length - 1; i >= 0; i--) { d.loops[i].t += env.dt; if (d.loops[i].t > 1.5) d.loops.splice(i, 1); }
    },
    front(inst, env) {
      const { ctx, b, k } = env, d = inst.data;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const q of d.p) {                    // 방사형으로 가속하는 입자 줄무늬
        const u = q.t / 1.4, c = Math.cos(q.a), s = Math.sin(q.a);
        ctx.strokeStyle = kit.hsl(205, 80, 80, (1 - u) * 0.6 * k);
        ctx.lineWidth = q.w;
        ctx.beginPath(); ctx.moveTo(b.x + c * q.r, b.y + s * q.r); ctx.lineTo(b.x + c * (q.r + q.v * 0.07), b.y + s * (q.r + q.v * 0.07)); ctx.stroke();
      }
      for (const w of d.bow) {                  // 팽창하는 충격면
        const u = w.t / 1.6;
        ctx.strokeStyle = kit.hsl(215, 85, 78, (1 - u) * 0.38 * k);
        ctx.lineWidth = 2.2 * (1 - u) + 0.6;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.15 + u * 3.4), 0, TAU); ctx.stroke();
      }
      for (const l of d.loops) {                // 자기장 고리
        const u = l.t / 1.5, fade = Math.sin(Math.PI * u);
        const a0 = l.a, a1 = l.a + l.span;
        const x0 = b.x + Math.cos(a0) * b.r, y0 = b.y + Math.sin(a0) * b.r;
        const x1 = b.x + Math.cos(a1) * b.r, y1 = b.y + Math.sin(a1) * b.r;
        const am = (a0 + a1) / 2, hr = b.r * (1 + l.h * (0.4 + 0.6 * u));
        ctx.strokeStyle = kit.hsl(195, 90, 72, fade * 0.7 * k);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(b.x + Math.cos(am) * hr * 1.45 - (b.r * 0.0), b.y + Math.sin(am) * hr * 1.45, x1, y1); ctx.stroke();
      }
    },
    sound(A) { A.playNoiseBurst(0.9, 0.07); A.playSweep(500, 140, 1.4); },
  });

  // ===== 가스 자이언트 흡수 ================================================
  // 거대 행성이 나선을 그리며 다가와 조석력에 찢기고, 그 물질이 실제 성운 입자로 흘러들어 흡수된다.
  const BANDS = ['#e8c89a', '#c99a62', '#f0dcb8', '#b07c4c', '#e3be86', '#9c6a3c'];
  DEFS.push({
    id: 'gasgiant', name: '가스 자이언트 흡수', icon: '🪐', kind: 'buff', duration: 11, weight: 1.2,
    desc: '거대한 가스 행성이 궤도 안으로 들어와 조석력에 찢긴다. 그 물질이 전부 흘러든다.',
    condition: (s) => s.hasFusion,
    start(inst) { inst.data = { shed: 0, x: 0, y: 0, rad: 0, stretch: 1, ang: 0 }; },
    step(inst, env) {
      const d = inst.data, b = env.b, vs = env.vs, p = env.p;
      const D0 = 560 * vs, D1 = b.r * 1.05;
      const e = kit.smooth(p / 0.88);
      const dist = D0 + (D1 - D0) * e;
      const th = -0.55 + e * 2.3;                                  // 나선으로 감겨 들어온다
      d.x = b.x + Math.cos(th) * dist; d.y = b.y + Math.sin(th) * dist * 0.8;
      d.ang = Math.atan2(b.y - d.y, b.x - d.x);
      const R0 = 34 * vs;
      const shedFrac = clamp((p - 0.3) / 0.58, 0, 1);              // 조석 파괴가 시작되는 시점부터
      d.rad = R0 * (1 - 0.92 * shedFrac) * (p < 0.12 ? p / 0.12 : 1);
      d.stretch = 1 + 1.6 * shedFrac;
      if (shedFrac > 0 && shedFrac < 1) {
        const n = Math.round(env.dt * 190);                         // 약 11초 × … 합쳐 약 +80% 질량
        if (n > 0) G.Nebula.emit(d.x, d.y, n, 36 + inst.rnd() * 14, { gain: 0.8 / 200, speed: 70, jitter: 40, spread: d.rad, tang: 0.5 });
      }
    },
    front(inst, env) {
      const { ctx, b, k } = env, d = inst.data;
      if (d.rad < 1) return;
      ctx.globalCompositeOperation = 'lighter';
      // 행성과 몸체를 잇는 물질의 강
      const g = ctx.createLinearGradient(d.x, d.y, b.x, b.y);
      g.addColorStop(0, 'rgba(240,200,140,' + (0.28 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = g; ctx.lineWidth = d.rad * 0.7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      kit.glow(ctx, d.x, d.y, d.rad * 2.4, 'rgba(255,220,160,' + (0.2 * k).toFixed(3) + ')', 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.translate(d.x, d.y); ctx.rotate(d.ang); ctx.scale(d.stretch, 1 / Math.sqrt(d.stretch));
      ctx.beginPath(); ctx.arc(0, 0, d.rad, 0, TAU); ctx.clip();
      ctx.fillStyle = BANDS[0]; ctx.fillRect(-d.rad, -d.rad, d.rad * 2, d.rad * 2);
      for (let i = 0; i < 6; i++) {           // 위도 띠
        ctx.fillStyle = BANDS[i % BANDS.length]; ctx.globalAlpha = 0.85;
        ctx.fillRect(-d.rad, -d.rad + (i / 6) * d.rad * 2, d.rad * 2, d.rad * 2 / 6 * (0.55 + 0.3 * Math.sin(i * 2.3)));
      }
      ctx.globalAlpha = 1;
      const sh = ctx.createRadialGradient(-d.rad * 0.4, -d.rad * 0.3, d.rad * 0.1, 0, 0, d.rad * 1.1);
      sh.addColorStop(0, 'rgba(255,255,255,0.28)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(10,5,0,0.65)');
      ctx.fillStyle = sh; ctx.fillRect(-d.rad, -d.rad, d.rad * 2, d.rad * 2);
      ctx.restore();
    },
    sound(A) { A.playSweep(220, 70, 1.6); A.playTone(131, 1.0, 'triangle', 0.08, 0.3); },
  });

  // ===== 초신성 잔해 구름 통과 =============================================
  DEFS.push({
    id: 'snremnant', name: '초신성 잔해 구름', icon: '✨', kind: 'buff', duration: 12, weight: 1.1,
    desc: '오래전 죽은 별이 남긴 무거운 원소의 껍질을 가로지른다. 성운이 훨씬 잘 붙는다.',
    mods: { absorb: 1.6, cloud: 1.25 },
    condition: (s) => s.hasFusion,
    start(inst) {
      const fil = [], sp = [];
      for (let i = 0; i < 90; i++) fil.push({ a: Math.PI + (inst.rnd() - 0.5) * 2.1, len: 0.05 + inst.rnd() * 0.14, off: (inst.rnd() - 0.5) * 0.11, lw: 1 + inst.rnd() * 3.2, h: [190, 335, 24, 150][Math.floor(inst.rnd() * 4)], ph: inst.rnd() * TAU });
      for (let i = 0; i < 40; i++) sp.push({ a: Math.PI + (inst.rnd() - 0.5) * 2.4, off: (inst.rnd() - 0.5) * 0.18, ph: inst.rnd() * TAU, s: 3 + inst.rnd() * 6 });
      inst.data = { fil, sp };
    },
    back(inst, env) {
      const { ctx, W, H, k, t, p } = env, d = inst.data;
      const cx = W * 1.05, cy = H * 0.5, R = W * (0.25 + 0.72 * p);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, Math.max(1, R - W * 0.12), cx, cy, R + W * 0.12);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(120,200,255,' + (0.1 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + W * 0.12, 0, TAU); ctx.fill();
      ctx.lineCap = 'round';
      for (const f of d.fil) {
        ctx.strokeStyle = kit.hsl(f.h, 85, 62, 0.5 * k * (0.55 + 0.45 * Math.sin(t * 2 + f.ph)));
        ctx.lineWidth = f.lw;
        ctx.beginPath(); ctx.arc(cx, cy, R + f.off * W, f.a - f.len / 2, f.a + f.len / 2); ctx.stroke();
      }
    },
    front(inst, env) {
      const { ctx, W, H, k, t, p } = env, d = inst.data;
      const cx = W * 1.05, cy = H * 0.5, R = W * (0.25 + 0.72 * p);
      ctx.globalCompositeOperation = 'lighter';
      for (const s of d.sp) {                 // 무거운 원소의 반짝임
        const rr = R + s.off * W, x = cx + Math.cos(s.a) * rr, y = cy + Math.sin(s.a) * rr;
        const tw = 0.5 + 0.5 * Math.sin(t * 4 + s.ph);
        kit.sparkle(ctx, x, y, s.s * (0.5 + tw), t * 0.4, 'rgba(255,240,210,' + (0.55 * tw * k).toFixed(3) + ')');
      }
    },
    sound(A) { A.playTone(880, 0.7, 'sine', 0.06); A.playTone(1319, 0.8, 'sine', 0.04, 0.12); A.playTone(1760, 0.8, 'sine', 0.03, 0.26); },
  });

  // ===== 중심핵 불안정 =====================================================
  DEFS.push({
    id: 'corepre', name: '중심핵 불안정', icon: '⚠️', kind: 'debuff', duration: 10, weight: 1.2,
    desc: '핵이 위태롭게 요동친다. 연료가 빠르게 타고 성운 흡수는 둔해진다.',
    mods: { fuelBurn: 1.7, absorb: 0.85 },
    condition: late,
    start(inst) {
      const cracks = [];
      for (let i = 0; i < 9; i++) {
        const a = inst.rnd() * TAU, pts = [[0, 0]]; let x = 0, y = 0, ang = a;
        const n = 4 + Math.floor(inst.rnd() * 3);
        for (let s = 0; s < n; s++) { ang += (inst.rnd() - 0.5) * 0.9; x += Math.cos(ang) * 0.24; y += Math.sin(ang) * 0.24; pts.push([x, y]); }
        cracks.push(pts);
      }
      inst.data = { cracks, embers: [] };
    },
    step(inst, env) {
      const d = inst.data, b = env.b;
      kit.shake(0.8 + 1.4 * env.k * (0.5 + 0.5 * Math.sin(env.age * 11)));
      if (inst.rnd() < env.dt * 25) {
        const a = inst.rnd() * TAU;
        d.embers.push({ x: b.x + Math.cos(a) * b.r * inst.rnd(), y: b.y + Math.sin(a) * b.r * inst.rnd(), vy: 30 + inst.rnd() * 50, t: 0 });
      }
      for (let i = d.embers.length - 1; i >= 0; i--) { const e = d.embers[i]; e.t += env.dt; e.y += e.vy * env.dt; if (e.t > 1.2) d.embers.splice(i, 1); }
    },
    front(inst, env) {
      const { ctx, b, k, t, W, H } = env, d = inst.data;
      const fl = 0.55 + 0.45 * Math.sin(t * 14) * Math.sin(t * 5.3);
      ctx.save();                              // 몸체 안쪽으로 번지는 균열
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.clip();
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const pts of d.cracks) {
        ctx.beginPath(); ctx.moveTo(b.x, b.y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(b.x + pts[i][0] * b.r * 1.9, b.y + pts[i][1] * b.r * 1.9);
        ctx.strokeStyle = 'rgba(255,70,30,' + (0.4 * k * fl).toFixed(3) + ')'; ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,230,180,' + (0.85 * k * fl).toFixed(3) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      kit.glow(ctx, b.x, b.y, b.r * 0.7, 'rgba(255,90,40,' + (0.45 * k * fl).toFixed(3) + ')', 'rgba(0,0,0,0)');
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      for (const e of d.embers) {
        ctx.fillStyle = kit.hsl(18, 95, 62, (1 - e.t / 1.2) * k);
        ctx.beginPath(); ctx.arc(e.x, e.y, 1.7, 0, TAU); ctx.fill();
      }
      // 화면 가장자리가 붉게 맥박친다
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(255,40,20,' + (0.3 * k * (0.5 + 0.5 * Math.sin(t * 4))).toFixed(3) + ')');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    },
    sound(A) { A.playTone(98, 0.5, 'sawtooth', 0.09); A.playTone(104, 0.5, 'sawtooth', 0.09, 0.05); A.playNoiseBurst(0.4, 0.06); },
  });

  // ===== 은하 중심 접근 ====================================================
  DEFS.push({
    id: 'galactic', name: '은하 중심 접근', icon: '🌀', kind: 'event', duration: 11, weight: 1.1,
    desc: '초거대 블랙홀의 조석력이 느껴진다. 중력과 흡수가 폭증하지만 연료도 더 탄다.',
    mods: { gravity: 2.0, absorb: 1.7, fuelBurn: 1.35 },
    condition: late,
    start(inst) {
      const streaks = [], spots = [];
      for (let i = 0; i < 44; i++) streaks.push({ a: inst.rnd() * TAU, l0: 0.12 + inst.rnd() * 0.5, l1: 0.2 + inst.rnd() * 0.4, ph: inst.rnd() });
      for (let i = 0; i < 9; i++) spots.push({ a: inst.rnd() * TAU, f: 0.3 + inst.rnd() * 0.7, w: 1.2 + inst.rnd() * 1.4 });
      inst.data = { streaks, spots };
    },
    step(inst, env) {
      for (const s of inst.data.spots) s.a += s.w / (0.4 + s.f) * env.dt;
      kit.shake(0.4 + 0.9 * env.k * (0.5 + 0.5 * Math.sin(env.age * 3)));
    },
    back(inst, env) {
      const { ctx, W, H, k, t, vs } = env, d = inst.data;
      const cx = W * 0.9, cy = H * 0.82, R = Math.min(W, H) * 0.2;
      ctx.globalCompositeOperation = 'lighter';
      kit.glow(ctx, cx, cy, R * 3.4, 'rgba(255,170,90,' + (0.28 * k).toFixed(3) + ')', 'rgba(0,0,0,0)');
      for (const s of d.streaks) {            // 중력 렌즈로 늘어난 별빛
        const c = Math.cos(s.a), sn = Math.sin(s.a), u = (s.ph + t * 0.05) % 1;
        const r0 = R * (1.1 + s.l0 * 4 * u), r1 = r0 + R * s.l1;
        ctx.strokeStyle = 'rgba(255,225,190,' + (0.35 * k * Math.sin(Math.PI * u)).toFixed(3) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx + c * r0, cy + sn * r0); ctx.lineTo(cx + c * r1, cy + sn * r1); ctx.stroke();
      }
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(-0.35); ctx.scale(1, 0.26);
      const g = ctx.createRadialGradient(0, 0, R * 0.35, 0, 0, R * 2);
      g.addColorStop(0, 'rgba(255,250,230,' + (0.9 * k).toFixed(3) + ')'); g.addColorStop(0.3, 'rgba(255,170,70,' + (0.55 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(120,40,160,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 2, 0, TAU); ctx.fill();
      for (const s of d.spots) {              // 원반을 도는 뜨거운 덩어리
        kit.glow(ctx, Math.cos(s.a) * R * (0.5 + s.f * 1.3), Math.sin(s.a) * R * (0.5 + s.f * 1.3), R * 0.22, 'rgba(255,255,255,' + (0.7 * k).toFixed(3) + ')', 'rgba(0,0,0,0)');
      }
      ctx.restore();
      ctx.save();                             // 원반에 수직인 제트
      ctx.translate(cx, cy); ctx.rotate(-0.35 - Math.PI / 2);
      const j = ctx.createLinearGradient(-R * 3, 0, R * 3, 0);
      j.addColorStop(0, 'rgba(150,190,255,0)'); j.addColorStop(0.5, 'rgba(210,230,255,' + (0.5 * k).toFixed(3) + ')'); j.addColorStop(1, 'rgba(150,190,255,0)');
      ctx.fillStyle = j; ctx.fillRect(-R * 3, -2 * vs, R * 6, 4 * vs);
      ctx.restore();
      kit.glow(ctx, cx, cy, R * 0.45, 'rgba(255,255,255,' + (0.9 * k).toFixed(3) + ')', 'rgba(0,0,0,0)');
    },
    front(inst, env) {
      const { ctx, b, k, W, H, t } = env;
      // 조석력이 몸체를 은하 중심 쪽으로 길게 잡아당긴다
      const ang = Math.atan2(H * 0.82 - b.y, W * 0.9 - b.x);
      ctx.globalCompositeOperation = 'lighter';
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(ang); ctx.scale(1 + 0.9 * k, 1);
      kit.glow(ctx, 0, 0, b.r * 1.5, 'rgba(255,190,120,' + (0.22 * k).toFixed(3) + ')', 'rgba(0,0,0,0)');
      ctx.restore();
      for (let i = 0; i < 2; i++) {
        ctx.strokeStyle = 'rgba(255,200,140,' + (0.3 * k * (0.6 + 0.4 * Math.sin(t * 3 + i))).toFixed(3) + ')'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.2 + i * 0.25), ang - 0.45, ang + 0.45); ctx.stroke();
      }
    },
    sound(A) { A.playSweep(40, 120, 2.0); A.playTone(55, 1.8, 'sine', 0.14); },
  });

  // ===== 마지막 숨 =========================================================
  DEFS.push({
    id: 'lastbreath', name: '마지막 숨', icon: '🌅', kind: 'event', duration: 9, once: true, weight: 3,
    desc: '연료가 얼마 남지 않았다. 꺼져가는 불꽃이 마지막으로 크게 타오르며 물질을 거세게 끌어당긴다.',
    mods: { absorb: 2.2, fuelBurn: 1.4 },
    condition: (s) => late(s) && s.fuel / G.FUEL_MAX < 0.22,
    start(inst) { inst.data = { embers: [], flick: 0 }; },
    step(inst, env) {
      const d = inst.data, b = env.b;
      if (inst.rnd() < env.dt * 30) {
        const a = inst.rnd() * TAU;
        d.embers.push({ x: b.x + Math.cos(a) * b.r * (1 + inst.rnd() * 0.5), y: b.y + Math.sin(a) * b.r, vx: (inst.rnd() - 0.5) * 30, vy: -(30 + inst.rnd() * 60), t: 0 });
      }
      for (let i = d.embers.length - 1; i >= 0; i--) { const e = d.embers[i]; e.t += env.dt; e.x += e.vx * env.dt; e.y += e.vy * env.dt; if (e.t > 1.8) d.embers.splice(i, 1); }
    },
    front(inst, env) {
      const { ctx, b, k, t, p } = env, d = inst.data;
      ctx.globalCompositeOperation = 'lighter';
      const flick = 0.7 + 0.3 * Math.sin(t * 17) * Math.sin(t * 6.1);
      const swell = Math.sin(Math.PI * p);       // 가운데 시점에 가장 크게 타오른다
      kit.glow(ctx, b.x, b.y, b.r * (2.2 + 1.8 * swell), 'rgba(255,200,90,' + (0.4 * k * flick).toFixed(3) + ')', 'rgba(0,0,0,0)');
      const rays = 22;                            // 회전하는 광선
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * TAU + t * 0.25, len = b.r * (1.6 + 1.2 * swell) * (0.6 + 0.4 * Math.sin(i * 3.1 + t * 5));
        const g = ctx.createLinearGradient(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r, b.x + Math.cos(a) * (b.r + len), b.y + Math.sin(a) * (b.r + len));
        g.addColorStop(0, 'rgba(255,220,130,' + (0.5 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r); ctx.lineTo(b.x + Math.cos(a) * (b.r + len), b.y + Math.sin(a) * (b.r + len)); ctx.stroke();
      }
      for (const e of d.embers) {
        ctx.fillStyle = kit.hsl(38, 95, 70, (1 - e.t / 1.8) * k);
        ctx.beginPath(); ctx.arc(e.x, e.y, 1.8, 0, TAU); ctx.fill();
      }
    },
    sound(A) { A.playTone(392, 0.9, 'sine', 0.08); A.playTone(523, 1.1, 'sine', 0.07, 0.2); A.playTone(659, 1.4, 'sine', 0.06, 0.4); },
  });
})();
