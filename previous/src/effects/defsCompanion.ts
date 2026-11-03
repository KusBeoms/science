/* 효과 정의 ③ 동반성 3부작 — 조우 → 위기 → 충돌 코스.
   예전엔 선택지가 갈랐던 분기(결속/스침, 근접/거리, 충돌/회피)를 이제는 무작위 결과가 정한다.
   그래서 동반성이 얽힌 엔딩(영원한 친구·스파이더별·병합·동반 타살)에는 그대로 닿을 수 있다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const kit = Gp._fx;
  const TAU = kit.TAU;
  const DEFS: EffectDef[] = (Gp._EFFECT_DEFS = Gp._EFFECT_DEFS || []);

  // drawCompanionStar와 같은 식으로 동반성의 궤도 위치를 구한다(도착 지점을 정확히 맞추기 위해)
  function orbitPoint(env: EffectEnv) {
    const R = G.Render, st = env.st;
    const m1 = G.clamp(st.mass, 0.1, 60);
    const orbitR = (90 + m1 * 1.2) * env.vs;
    // 궤도 중심은 플레이어 몸체 자신이다(starActors.ts의 동반성과 같은 기준)
    const px = env.b.x, py = env.b.y;
    return { x: px + Math.cos(R.companionOrbitAngle) * orbitR, y: py + Math.sin(R.companionOrbitAngle) * orbitR * 0.4, px, py, orbitR };
  }

  // ===== 동반성 조우 =======================================================
  DEFS.push({
    id: 'companion', name: '동반성 조우', icon: '💞', kind: 'event', duration: 9, once: true, weight: 4,
    desc: '떠돌던 원시성이 다가온다. 중력에 붙잡혀 안정 궤도에 묶일 것이다.',
    mods: { absorb: 1.2 },
    condition: (s) => s.hasFusion && s.companionOffered && !s.hasCompanion && !s.companionEventShown,
    start(inst, s) { s.companionEventShown = true; inst.data = { captured: false, flash: 0, trail: [], x: 0, y: 0, sx: 0, sy: 0, init: false }; },
    step(inst, env) {
      const d = inst.data, o = orbitPoint(env), st = env.st;
      if (!d.init) { d.init = true; d.sx = env.W + 40; d.sy = env.b.y - 230 * env.vs; }
      const u = kit.smooth(env.p / 0.55);
      // 곡선 진입: 시작점→궤도 위 도착점, 중간에 위로 불룩한 제어점
      const cx = (d.sx + o.x) / 2, cy = Math.min(d.sy, o.y) - 90 * env.vs;
      const iu = 1 - u;
      d.x = iu * iu * d.sx + 2 * iu * u * cx + u * u * o.x;
      d.y = iu * iu * d.sy + 2 * iu * u * cy + u * u * o.y;
      d.o = o;
      if (!d.captured) { d.trail.push({ x: d.x, y: d.y }); if (d.trail.length > 18) d.trail.shift(); }
      if (!d.captured && env.p >= 0.55) {
        d.captured = true; d.flash = 1;
        st.hasCompanion = true; st.companionAlive = true; st.companionFuel = G.FUEL_MAX;
        const r = Math.random();
        if (r < 0.34) { st.companionTier = 'low'; st.companionMass = 0.3 + Math.random() * 7.2; }
        else if (r < 0.67) { st.companionTier = 'mid'; st.companionMass = 8.5 + Math.random() * 11; }
        else { st.companionTier = 'high'; st.companionMass = 21 + Math.random() * 30; }
        G.Nebula.ring(o.x, o.y, 6, 120 * env.vs, 1.1, 200, 2.5, 0.8);
        G.Nebula.ring(o.x, o.y, 4, 70 * env.vs, 0.8, 320, 1.5, 0.7);
        G.Nebula.floatText(o.x, o.y - 40 * env.vs, '궤도에 결속!', 200, 16);
        kit.shake(4); G.Audio.playChord([392, 523, 659, 784], 2.4, 0.06, 'triangle'); G.Audio.playTone(784, 0.5, 'sine', 0.1); G.Audio.playTone(1047, 0.7, 'sine', 0.08, 0.1);
      }
      d.flash = Math.max(0, d.flash - env.dt * 1.4);
    },
    front(inst, env) {
      const { ctx, k, t } = env, d = inst.data, o = d.o;
      if (!o) return;
      ctx.globalCompositeOperation = 'lighter';
      // 앞으로 놓일 궤도의 예고선
      ctx.setLineDash([4, 8]); ctx.lineDashOffset = -t * 20;
      ctx.strokeStyle = kit.hsl(210, 80, 75, (d.captured ? 0.12 : 0.3) * k);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(o.px, o.py, o.orbitR, o.orbitR * 0.4, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      if (!d.captured) {                       // 날아오는 원시성: 꼬리 + 빛무리
        for (let i = 0; i < d.trail.length; i++) {
          const u = i / d.trail.length;
          ctx.fillStyle = kit.hsl(210, 80, 80, 0.4 * u * k);
          ctx.beginPath(); ctx.arc(d.trail[i].x, d.trail[i].y, 5 * u * env.vs, 0, TAU); ctx.fill();
        }
        kit.glow(ctx, d.x, d.y, 26 * env.vs, 'rgba(190,215,255,' + (0.5 * k).toFixed(3) + ')', 'rgba(0,0,0,0)');
        kit.glow(ctx, d.x, d.y, 8 * env.vs, 'rgba(255,255,255,' + (0.95 * k).toFixed(3) + ')', 'rgba(0,0,0,0)');
      }
      if (d.flash > 0) kit.glow(ctx, o.x, o.y, 90 * env.vs * (1.2 - d.flash * 0.4), 'rgba(200,225,255,' + (0.6 * d.flash).toFixed(3) + ')', 'rgba(0,0,0,0)');
    },
    sound(A) { A.playSweep(900, 300, 1.4); },
  });

  // ===== 동반성의 위기 =====================================================
  DEFS.push({
    id: 'crisis', name: '동반성의 위기', icon: '🔗', kind: 'event', duration: 9, once: true, weight: 4,
    desc: '동반성이 불안정해진다. 서로의 궤도가 어떻게 될지는 중력만이 안다.',
    detail: (inst) => inst.data.bound === true ? '궤도가 좁혀진다 — 두 별은 서로를 놓지 않기로 했다.'
      : inst.data.bound === false ? '궤도가 벌어진다 — 두 별은 각자의 길을 가기로 했다.' : '',
    condition: (s) => s.hasFusion && s.postIgnitionDistanceLy >= 2.0 && s.hasCompanion && s.companionAlive && !s.crisisShown,
    start(inst, s) {
      s.crisisShown = true;
      s.staysBound = Math.random() < 0.5;
      inst.data = { bound: s.staysBound };
    },
    front(inst, env) {
      const { ctx, k, t, p } = env, c = G.Effects.companionPos, b = env.b, d = inst.data;
      if (!c) return;
      ctx.globalCompositeOperation = 'lighter';
      if (d.bound) {
        // 가스 다리가 점점 굵어지고, 점들이 두 별을 오가며 궤도가 조여든다
        kit.bridge(ctx, b.x, b.y, c.x, c.y, t, 205, k * (0.5 + 0.5 * p), 0.18, 22, 1);
        kit.bridge(ctx, c.x, c.y, b.x, b.y, t + 0.4, 280, k * 0.5, -0.14, 14, 1);
        for (let i = 0; i < 3; i++) {
          const r = Math.hypot(c.x - b.x, c.y - b.y) * (0.9 - 0.25 * p) * (0.4 + i * 0.3);
          ctx.strokeStyle = kit.hsl(210, 85, 78, 0.2 * k); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc((b.x + c.x) / 2, (b.y + c.y) / 2, r, 0, TAU); ctx.stroke();
        }
      } else {
        // 다리가 가늘어지다 끊어지고 불꽃이 흩어진다
        const snap = Math.max(0, 1 - p * 1.4);
        if (snap > 0) kit.bridge(ctx, b.x, b.y, c.x, c.y, t, 20, k * snap, 0.2 * (1 - snap), 16, -1);
        else {
          ctx.fillStyle = kit.hsl(30, 90, 78, 0.5 * k * (1 - p));
          for (let i = 0; i < 12; i++) {
            const u = (i / 12 + t * 0.2) % 1, x = b.x + (c.x - b.x) * u, y = b.y + (c.y - b.y) * u + Math.sin(t * 5 + i) * 10;
            ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill();
          }
        }
      }
      kit.glow(ctx, c.x, c.y, c.r * 1.9, kit.hsl(d.bound ? 205 : 25, 85, 65, 0.22 * k * (0.6 + 0.4 * Math.sin(t * 8))), 'rgba(0,0,0,0)');
    },
    sound(A) { A.playTone(330, 0.6, 'triangle', 0.08); A.playTone(311, 0.7, 'triangle', 0.08, 0.15); },
  });

  // ===== 충돌 코스 =========================================================
  // 결과는 끝나는 순간까지 숨겨진다: 정면 충돌(엔딩) 또는 아슬아슬한 회피(질량 +30%).
  DEFS.push({
    id: 'collision', name: '충돌 코스', icon: '💥', kind: 'debuff', duration: 8, once: true, weight: 5,
    desc: '두 별의 궤도가 위험할 만큼 좁혀졌다. 어떻게 끝날지는 마지막 순간에야 알 수 있다.',
    condition: (s) => s.hasFusion && s.postIgnitionDistanceLy >= 2.0 && s.hasCompanion && s.staysBound && s.companionAlive && !s.collisionEventShown,
    start(inst, s) { s.collisionEventShown = true; inst.data = { collide: Math.random() < 0.5, flash: 0, ticks: 0 }; },
    step(inst, env) {
      const d = inst.data;
      kit.shake(env.p * env.p * 7 + 0.5);
      const tick = Math.floor(env.age * (1.5 + env.p * 6));       // 점점 빨라지는 경고음
      if (tick !== d.ticks) { d.ticks = tick; G.Audio.playTone(440 + env.p * 500, 0.06, 'square', 0.05); }
      if (env.p > 0.93) d.flash = clampF((env.p - 0.93) / 0.07);
    },
    end(inst, s) {
      // 8초 사이에 동반성이 이미 죽었다면 부딪힐 상대가 없다
      if (inst.data.collide && !s.companionAlive) return;
      if (inst.data.collide) s.collisionFlag = true;
      else {
        G.Nebula.addMassFrac(0.3, G.Effects.companionPos ? G.Effects.companionPos.x : undefined, G.Effects.companionPos ? G.Effects.companionPos.y : undefined, 40);
        G.Nebula.floatText(G.Render.W * 0.28, G.Render.H * 0.3, '마지막 순간 궤도를 틀었다!', 180, 18);
      }
    },
    front(inst, env) {
      const { ctx, k, t, p, W, H } = env, c = G.Effects.companionPos, b = env.b, d = inst.data;
      ctx.globalCompositeOperation = 'lighter';
      if (c) {
        const pulse = 0.5 + 0.5 * Math.sin(t * (4 + p * 16));
        // 두 별을 감싸며 조여드는 경고 고리
        const mx = (b.x + c.x) / 2, my = (b.y + c.y) / 2, span = Math.hypot(c.x - b.x, c.y - b.y);
        for (let i = 0; i < 3; i++) {
          const u = (t * 0.8 + i / 3) % 1;
          ctx.strokeStyle = kit.hsl(5, 90, 62, (1 - u) * 0.5 * k);
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(mx, my, (span * 1.1 + 80) * (1 - u * 0.8), 0, TAU); ctx.stroke();
        }
        kit.bridge(ctx, b.x, b.y, c.x, c.y, t * 2, 8, k * (0.4 + 0.6 * pulse), 0.05, 26, 1);
        kit.glow(ctx, c.x, c.y, c.r * 2.2, 'rgba(255,70,50,' + (0.3 * pulse * k).toFixed(3) + ')', 'rgba(0,0,0,0)');
        kit.glow(ctx, b.x, b.y, b.r * 1.8, 'rgba(255,70,50,' + (0.22 * pulse * k).toFixed(3) + ')', 'rgba(0,0,0,0)');
      }
      // 가장자리 경고 비네트
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(255,30,20,' + (0.18 + 0.3 * p).toFixed(3) + ')');
      ctx.fillStyle = v; ctx.globalAlpha = k * (0.5 + 0.5 * Math.sin(t * (3 + p * 10))); ctx.fillRect(0, 0, W, H);
      // 충돌이든 회피든 마지막 순간에 번쩍인다
      if (d.flash > 0) { ctx.globalAlpha = d.flash * (d.collide ? 1 : 0.5); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
    },
    sound(A) { A.playTone(220, 0.3, 'sawtooth', 0.09); A.playTone(233, 0.3, 'sawtooth', 0.09, 0.3); A.playTone(220, 0.3, 'sawtooth', 0.09, 0.6); },
  });

  function clampF(v: number) { return Math.max(0, Math.min(1, v)); }
})();
