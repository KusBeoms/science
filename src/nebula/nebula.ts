/* 성운 엔진: 키를 누르면 성운(입자 구름)이 생기고, 몸체의 중력에 끌려 낙하하다가
   표면에 닿는 순간 입자 하나하나가 흡수되어 질량·부피·중력이 늘어난다.

   - 입자는 각자 중력을 받으므로 구름이 가까워질수록 조석력으로 길게 늘어난다.
   - 흡수는 "입자가 표면에 닿는 순간"에만 일어난다 — 질량 숫자는 성운이 닿는 만큼
     드르륵 오르고, 접촉점마다 섬광·표면 파문이 생긴다.
   - 성운 하나를 다 삼키면 중력파 고리와 "+n%" 부유 텍스트가 뜬다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const kit = Gp._fx;
  const TAU = kit.TAU;
  const clamp = G.clamp;
  const A = G.Audio;

  const MAX_CLOUDS = 36;
  const MAX_GRAINS = 1100;
  const BASE_GM = 1.25e7;             // px³/s² — 화면 크기 배율 제곱을 곱해 쓴다
  const CLOUD_GRAINS = 24;            // 보통 성운 하나의 입자 수
  const GAIN_REF = 0.04 / CLOUD_GRAINS;   // 입자당 질량 비율 기준
  // 한 칸 전진할 때 생기는 성운 하나가 붙이는 질량 = 현재 질량의 약 4%(복사압 감쇠 전).
  // 값을 줄이면 한 칸의 보상이 작아진다.
  const CLOUD_MASS_SCALE = 1;
  const GAIN_PER_GRAIN = GAIN_REF * CLOUD_MASS_SCALE;
  // 크기(부피)와 중력은 따로 쌓지 않고 질량이 늘어난 비율에서 파생한다.
  // 부피 ∝ 질량^0.06, 중력 ∝ 질량^0.5 — 질량이 그대로면 크기도 중력도 그대로다.
  // 크기는 한 칸(차선) 폭 안에 머물도록 아주 완만하게만 변한다.
  const VOLUME_EXP = 0.06;
  const GRAVITY_EXP = 0.5;
  function growWithMass(ratio: number) {
    const st = G.state;
    if (!(ratio > 0) || ratio === 1) return;
    st.volume = clamp(st.volume * Math.pow(ratio, VOLUME_EXP), 4, 200);
    st.gravity = Math.max(1, st.gravity * Math.pow(ratio, GRAVITY_EXP));
  }

  interface Cloud {
    hue: number; label: string; n: number; alive: number;
    gx: number; gy: number; sx: number; sy: number;
    gainAcc: number; gravAcc: number; age: number; spread: number;
  }
  interface Grain {
    x: number; y: number; px: number; py: number; vx: number; vy: number;
    size: number; hue: number; sat: number; lit: number; gain: number; w: number;
    cloud: Cloud | null; age: number; haze: number;
  }
  interface Impact { ang: number; t: number; life: number; hue: number; power: number; }
  interface Ring { x: number; y: number; r0: number; r1: number; t: number; life: number; hue: number; lw: number; a: number; }
  interface FloatText { x: number; y: number; t: number; life: number; text: string; hue: number; size: number; }

  let clouds: Cloud[] = [];
  let grains: Grain[] = [];
  let impacts: Impact[] = [];
  let rings: Ring[] = [];
  let texts: FloatText[] = [];
  let fieldPulse = 0;
  let clock = 0;
  let toneBudget = 0;
  let body: StarActorPoint = { x: 300, y: 300, r: 30 };

  // 색조별로 미리 그려 둔 부드러운 먼지 스프라이트 — 입자마다 그라디언트를 새로 만들지 않는다
  const hazeCache: Record<string, HTMLCanvasElement> = {};
  function hazeSprite(hue: number): HTMLCanvasElement {
    const key = String(Math.round(hue));
    if (hazeCache[key]) return hazeCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, kit.hsl(hue, 30, 58, 1)); g.addColorStop(0.45, kit.hsl(hue, 28, 50, 0.45)); g.addColorStop(1, kit.hsl(hue, 25, 45, 0));
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return (hazeCache[key] = c);
  }
  function gauss(): number {
    return Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(TAU * Math.random());
  }

  function vscale(): number { return Gp._renderViewScale || 1; }

  // 실제 성운에서 보이는 색만 쓴다: 수소 알파의 붉은 기, 반사성운의 푸른 기, 먼지의 갈색, 산소의 청록
  const NEBULA_HUES = [352, 212, 30, 22, 172, 38];
  function dustHue(code: string): number {
    let h = 0;
    for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
    return NEBULA_HUES[h % NEBULA_HUES.length];
  }

  function computeGM(): number {
    const vs = vscale();
    return BASE_GM * vs * vs * Math.pow(G.state.gravity, 0.6) * G.Effects.mods.gravity;
  }

  function pushRing(x: number, y: number, r0: number, r1: number, life: number, hue: number, lw?: number, a?: number) {
    if (rings.length > 90) rings.shift();
    rings.push({ x, y, r0, r1, t: 0, life, hue, lw: lw || 1.5, a: a == null ? 0.7 : a });
  }

  function pushText(x: number, y: number, text: string, hue: number, size?: number) {
    if (texts.length > 40) texts.shift();
    texts.push({ x, y, t: 0, life: 1.5, text, hue, size: size || 15 });
  }

  function makeGrain(x: number, y: number, vx: number, vy: number, hue: number, gain: number, w: number, cloud: Cloud | null): Grain {
    const vs = vscale();
    return {
      x, y, px: x, py: y, vx, vy,
      size: (0.6 + Math.pow(Math.random(), 2) * 1.8) * Math.sqrt(vs),
      hue: hue + (Math.random() - 0.5) * 14,
      sat: 22 + Math.random() * 22, lit: 52 + Math.random() * 16,
      gain, w, cloud, age: 0,
      haze: Math.random() < 0.4 ? (9 + Math.random() * 13) * vs : 0,
    };
  }

  // 입자 하나가 표면에 닿아 흡수되는 순간 — 질량·부피·중력이 여기서만 늘어난다.
  function absorb(g: Grain, hitX: number, hitY: number) {
    const state = G.state;
    const mods = G.Effects.mods;
    const w = g.w;
    const m0 = state.mass;
    // 무거울수록 복사압이 물질을 밀어낸다(constants.ts의 ACCRETION_DAMP_MASS와 같은 논리)
    const damp = 1 / (1 + m0 / G.ACCRETION_DAMP_MASS);
    // 중력이 클수록 같은 입자도 더 단단히 붙잡힌다
    const gravBonus = 1 + Math.min(0.6, 0.06 * (state.gravity - 1));
    const frac = g.gain * mods.absorb * damp * gravBonus;
    state.mass = clamp(m0 * (1 + frac), 1e-9, 200);
    growWithMass(state.mass / m0);
    fieldPulse = Math.min(0.6, fieldPulse + 0.008 * w);
    N.hitsThisFrame += w;

    const ang = Math.atan2(hitY - body.y, hitX - body.x);
    if (impacts.length < 70) impacts.push({ ang, t: 0, life: 0.6, hue: g.hue, power: 0.5 });

    const c = g.cloud;
    if (c) {
      c.alive--; c.gainAcc += frac;
      if (c.alive <= 0) cloudDone(c);
    }
  }

  // 성운 하나를 다 삼켰을 때: 화면에는 아무 장식도 띄우지 않고 통계만 올린다
  function cloudDone(c: Cloud) {
    G.state.absorbedClouds++;
  }

  function removeGrain(i: number) {
    grains[i] = grains[grains.length - 1];
    grains.pop();
  }

  const N: NebulaAPI = {
    GM: BASE_GM,
    attractors: [],
    hitsThisFrame: 0,

    // 키 한 번 = 성운 하나. 몸체 주위 허공에 생겨나 접선 방향으로 비스듬히 낙하를 시작한다.
    spawn(code: string, label: string, opts?: { near?: boolean }): boolean {
      if (clouds.length >= MAX_CLOUDS || grains.length > MAX_GRAINS - 70) return false;
      const mods = G.Effects.mods;
      const vs = vscale();
      const W = G.Render.W, H = G.Render.H;
      const hue = dustHue(code);
      const n = Math.max(8, Math.round(CLOUD_GRAINS * mods.cloud * (0.9 + Math.random() * 0.25)));
      const spread = (26 + Math.random() * 20) * vs * Math.sqrt(mods.cloud);

      let cx = body.x, cy = body.y;
      if (opts && opts.near) {
        // 한 칸 전진한 보상: 진행 방향(오른쪽) 가까운 곳에서 성운이 모여 곧바로 끌려온다
        const ang = (Math.random() - 0.5) * 1.8;
        const dist = body.r + spread + (60 + Math.random() * 70) * vs;
        cx = body.x + Math.cos(ang) * dist; cy = body.y + Math.sin(ang) * dist;
      } else for (let tries = 0; tries < 10; tries++) {
        const ang = Math.random() * TAU;
        const dist = body.r + spread + (210 + Math.random() * 230) * vs;
        cx = body.x + Math.cos(ang) * dist;
        cy = body.y + Math.sin(ang) * dist * 0.85;
        if (cx > 40 && cx < W - 40 && cy > 40 && cy < H - 40) break;
      }
      cx = clamp(cx, 40, W - 40); cy = clamp(cy, 40, H - 40);

      const dx = body.x - cx, dy = body.y - cy;
      const d = Math.max(30, Math.hypot(dx, dy));
      const gm = computeGM();
      const sign = Math.random() < 0.5 ? -1 : 1;
      // 원궤도 속도의 일부만 접선 방향으로 — 곧장 떨어지지 않고 휘어 들어온다
      const vt = Math.sqrt(gm / d) * 0.3 * mods.swirl * (0.75 + Math.random() * 0.45);
      const tvx = (-dy / d) * sign * vt, tvy = (dx / d) * sign * vt;

      const cloud: Cloud = {
        hue, label, n, alive: n, gx: cx, gy: cy, sx: 0, sy: 0,
        gainAcc: 0, gravAcc: 0, age: 0, spread,
      };
      clouds.push(cloud);
      // 실제 분자운 조각처럼 길쭉하고 가장자리가 흐릿한 가우시안 덩어리 (장축은 무작위 방향)
      const axis = Math.random() * Math.PI, ca = Math.cos(axis), sa = Math.sin(axis);
      const elong = 1.6 + Math.random() * 1.2;
      const jit = 3 * vs;
      for (let i = 0; i < n; i++) {
        const u = gauss() * spread * 0.55 * elong, v = gauss() * spread * 0.55 / elong;
        grains.push(makeGrain(
          cx + u * ca - v * sa, cy + u * sa + v * ca,
          tvx + (Math.random() - 0.5) * jit, tvy + (Math.random() - 0.5) * jit,
          hue, GAIN_PER_GRAIN, 1, cloud));
      }
      return true;
    },

    // 효과가 직접 흘려보내는 입자 — 일반 성운 입자와 똑같이 낙하·흡수된다.
    // opts: gain(입자당 질량 비율), speed(초기 속도), aimX/aimY(없으면 몸체 쪽), spread
    emit(x: number, y: number, count: number, hue: number, opts?: any) {
      const o = opts || {};
      const vs = vscale();
      if (grains.length > MAX_GRAINS) return;
      const gain = o.gain != null ? o.gain : GAIN_PER_GRAIN * 0.6;
      const wt = o.gain != null ? o.gain / GAIN_REF : 0.6;
      const speed = (o.speed != null ? o.speed : 40) * vs;
      const tx = o.aimX != null ? o.aimX : body.x, ty = o.aimY != null ? o.aimY : body.y;
      const dx = tx - x, dy = ty - y, d = Math.max(1, Math.hypot(dx, dy));
      const tang = o.tang || 0;
      for (let i = 0; i < count; i++) {
        const sp = speed * (0.6 + Math.random() * 0.8);
        const vx = (dx / d) * sp + (-dy / d) * tang * sp * 0.6 + (Math.random() - 0.5) * (o.jitter != null ? o.jitter : 18) * vs;
        const vy = (dy / d) * sp + (dx / d) * tang * sp * 0.6 + (Math.random() - 0.5) * (o.jitter != null ? o.jitter : 18) * vs;
        const sp2 = (o.spread || 6) * vs;
        grains.push(makeGrain(x + (Math.random() - 0.5) * sp2, y + (Math.random() - 0.5) * sp2, vx, vy, hue, gain, wt, null));
      }
    },

    // 덩어리째 부딪힌 질량(소행성 등): 현재 질량의 frac만큼 즉시 흡수
    addMassFrac(frac: number, x?: number, y?: number, hue?: number) {
      const state = G.state;
      const damp = 1 / (1 + state.mass / G.ACCRETION_DAMP_MASS);
      const f = frac * G.Effects.mods.absorb * damp;
      const m0 = state.mass;
      state.mass = clamp(m0 * (1 + f), 1e-9, 200);
      growWithMass(state.mass / m0);
      fieldPulse = Math.min(0.6, fieldPulse + frac * 2);
      N.hitsThisFrame += frac * 20;
      if (x != null && y != null) {
        const ang = Math.atan2(y - body.y, x - body.x);
        impacts.push({ ang, t: 0, life: 0.8, hue: hue == null ? 30 : hue, power: 2.2 });
        pushText(body.x + Math.cos(ang) * (body.r + 20), body.y + Math.sin(ang) * (body.r + 20),
          '+' + (f * 100).toFixed(1) + '%', hue == null ? 30 : hue, 14);
      }
    },

    // 운석 충돌 등으로 질량이 줄 때: 크기·중력도 같은 비율에서 파생되어 함께 줄어든다
    scaleMass(ratio: number, x?: number, y?: number) {
      const state = G.state;
      const m0 = state.mass;
      state.mass = clamp(m0 * ratio, 1e-9, 200);
      growWithMass(state.mass / m0);
      if (x != null && y != null) {
        const ang = Math.atan2(y - body.y, x - body.x);
        pushText(body.x + Math.cos(ang) * (body.r + 18), body.y + Math.sin(ang) * (body.r + 18),
          '−' + Math.round((1 - ratio) * 100) + '%', 8, 15);
      }
    },

    ring(x, y, r0, r1, life, hue, lw, a) { pushRing(x, y, r0, r1, life, hue, lw, a); },
    pulse(v: number) { fieldPulse = Math.min(1.4, fieldPulse + v); },
    floatText(x, y, text, hue, size) { pushText(x, y, text, hue, size); },

    // 몸체가 (x,y)에 만드는 중력 가속도 — 소행성 같은 효과 객체가 입자와 같은 법칙으로 낙하하도록
    accel(x: number, y: number, k?: number) {
      const dx = body.x - x, dy = body.y - y;
      const d2 = dx * dx + dy * dy, d = Math.sqrt(d2) || 1;
      const a = (N.GM * (k == null ? 1 : k)) / (d2 + body.r * body.r * 1.44);
      return { ax: (dx / d) * a, ay: (dy / d) * a };
    },

    update(dt: number, b: StarActorPoint) {
      body = b;
      N.hitsThisFrame = 0;
      N.GM = computeGM();
      if (dt <= 0) return;
      clock += dt;
      toneBudget = 3;
      fieldPulse = Math.max(0, fieldPulse - dt * 1.4);
      const GM = N.GM;
      const R = body.r;
      const soft = R * R * 1.44;
      const absorbR = R + 1.5;
      const W = G.Render.W, H = G.Render.H;

      for (const c of clouds) { c.sx = 0; c.sy = 0; c.age += dt; }

      for (let i = grains.length - 1; i >= 0; i--) {
        const g = grains[i];
        g.age += dt;
        const dx = body.x - g.x, dy = body.y - g.y;
        const d2 = dx * dx + dy * dy, d = Math.sqrt(d2) || 1;
        // 오래 떠도는 입자는 가스 저항으로 결국 붙잡힌다(영영 안 닿는 입자 방지)
        const assist = g.age > 5 ? 1 + (g.age - 5) * 1.3 : 1;
        const a = (GM * assist) / (d2 + soft);
        g.vx += (dx / d) * a * dt; g.vy += (dy / d) * a * dt;

        let hitAttractor = false;
        for (const at of N.attractors) {
          const ax = at.x - g.x, ay = at.y - g.y, ad2 = ax * ax + ay * ay, ad = Math.sqrt(ad2) || 1;
          const aa = at.gm / (ad2 + at.r * at.r * 1.44);
          g.vx += (ax / ad) * aa * dt; g.vy += (ay / ad) * aa * dt;
          if (ad <= at.r) { at.hit(g); hitAttractor = true; break; }
        }
        if (hitAttractor) {
          if (g.cloud) { g.cloud.alive--; if (g.cloud.alive <= 0) cloudDone(g.cloud); }
          removeGrain(i); continue;
        }

        const drag = d < R * 4 ? 1.6 : 0.12;
        const damp = 1 / (1 + drag * dt);
        g.vx *= damp; g.vy *= damp;
        g.px = g.x; g.py = g.y;
        g.x += g.vx * dt; g.y += g.vy * dt;

        const nd = Math.hypot(body.x - g.x, body.y - g.y);
        if (nd <= absorbR) {
          // 접촉점은 입자가 표면을 가로지른 자리(몸체 중심→입자 방향의 표면 위)
          const ux = (g.x - body.x) / (nd || 1), uy = (g.y - body.y) / (nd || 1);
          absorb(g, body.x + ux * R, body.y + uy * R);
          removeGrain(i); continue;
        }
        if (g.age > 16 || g.x < -700 || g.x > W + 700 || g.y < -700 || g.y > H + 700) {
          if (g.cloud) { g.cloud.alive--; if (g.cloud.alive <= 0) cloudDone(g.cloud); }
          removeGrain(i); continue;
        }
        if (g.cloud) { g.cloud.sx += g.x; g.cloud.sy += g.y; }
      }

      for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        if (c.alive <= 0) { clouds[i] = clouds[clouds.length - 1]; clouds.pop(); continue; }
        c.gx = c.sx / c.alive; c.gy = c.sy / c.alive;
      }
      for (let i = impacts.length - 1; i >= 0; i--) { impacts[i].t += dt; if (impacts[i].t >= impacts[i].life) impacts.splice(i, 1); }
      for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t >= rings[i].life) rings.splice(i, 1); }
      for (let i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t >= texts[i].life) texts.splice(i, 1); }
    },

    // 몸체 뒤에 깔리는 중력장: 아주 옅은 빛무리와 천천히 수축하는 고리 몇 개. 중력이 클수록 조금 짙어진다.
    drawBack(ctx: CanvasRenderingContext2D, b: StarActorPoint) {
      const g = G.state.gravity;
      const s = clamp((g - 1) / 8, 0, 1);
      const vs = vscale();
      const R = b.r;
      const rMax = R * (2.4 + 1.6 * s) + 40 * vs;
      ctx.save();
      kit.glow(ctx, b.x, b.y, rMax, kit.hsl(225, 40, 60, 0.025 + 0.06 * s + 0.04 * fieldPulse), 'rgba(0,0,0,0)');
      const n = 2 + Math.min(3, Math.floor(g / 2));
      for (let i = 0; i < n; i++) {
        const ph = (clock * 0.12 + i / n) % 1;
        const rr = R * 1.1 + (rMax - R * 1.1) * (1 - ph);
        ctx.strokeStyle = kit.hsl(225, 35, 75, Math.sin(Math.PI * ph) * (0.025 + 0.05 * s + 0.05 * fieldPulse));
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    },

    drawFront(ctx: CanvasRenderingContext2D, b: StarActorPoint) {
      const vs = vscale();
      const R = b.r;
      ctx.save();

      // 성운 본체: 입자에 붙은 흐릿한 먼지 헤이즈가 모여 불규칙한 구름 모양을 만든다.
      // 조석력으로 입자가 늘어나면 구름도 함께 길게 찢어진다.
      for (const g of grains) {
        if (!g.haze) continue;
        const d = Math.hypot(g.x - b.x, g.y - b.y);
        const edge = clamp((d - R) / (R * 0.8 + 10 * vs), 0, 1);
        const al = 0.05 * clamp(g.age / 1.2, 0, 1) * edge;
        if (al < 0.003) continue;
        ctx.globalAlpha = al;
        const sp = hazeSprite(g.hue), r = g.haze;
        ctx.drawImage(sp, g.x - r, g.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;

      // 입자: 은은한 점 + 속도에 비례한 아주 짧은 꼬리. 서서히 나타나고, 표면 가까이서 서서히 잦아든다.
      ctx.lineCap = 'round';
      for (const g of grains) {
        const d = Math.hypot(g.x - b.x, g.y - b.y);
        const heat = clamp(1 - (d - R) / (R * 2.5 + 30 * vs), 0, 1);   // 표면 가까이서 살짝 따뜻해질 뿐
        const h = kit.hueLerp(g.hue, 30, heat * 0.5);
        const l = g.lit + heat * 14;
        const edge = 0.4 + 0.6 * clamp((d - R) / (12 * vs), 0, 1);
        const al = (0.16 + 0.28 * heat) * clamp(g.age / 0.8, 0, 1) * edge;
        const dx = g.x - g.px, dy = g.y - g.py;
        ctx.strokeStyle = kit.hsl(h, g.sat, l, al * 0.5);
        ctx.lineWidth = g.size * 0.7;
        ctx.beginPath(); ctx.moveTo(g.x - dx * 1.6, g.y - dy * 1.6); ctx.lineTo(g.x, g.y); ctx.stroke();
        ctx.fillStyle = kit.hsl(h, g.sat, l, al);
        ctx.beginPath(); ctx.arc(g.x, g.y, g.size * edge, 0, TAU); ctx.fill();
      }

      // 접촉점: 표면에 물질이 내려앉는 작고 따뜻한 빛 하나
      for (const im of impacts) {
        const u = im.t / im.life, fade = (1 - u) * (1 - u);
        const hx = b.x + Math.cos(im.ang) * R, hy = b.y + Math.sin(im.ang) * R;
        kit.glow(ctx, hx, hy, (5 + 7 * u) * vs * (0.8 + im.power * 0.4), kit.hsl(32, 60, 78, 0.28 * fade * im.power), 'rgba(0,0,0,0)');
      }

      // 효과(중력파·동반성 결속 등)가 요청한 고리와 문구
      for (const r of rings) {
        const u = r.t / r.life, e = 1 - Math.pow(1 - u, 3);
        ctx.strokeStyle = kit.hsl(r.hue, 70, 75, r.a * (1 - u));
        ctx.lineWidth = r.lw * (1 - u * 0.5);
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, TAU); ctx.stroke();
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of texts) {
        const u = t.t / t.life;
        const a = u < 0.12 ? u / 0.12 : 1 - Math.pow((u - 0.12) / 0.88, 2);
        ctx.font = '600 ' + Math.round(t.size * vs) + 'px "Apple SD Gothic Neo", sans-serif';
        ctx.fillStyle = kit.hsl(t.hue, 60, 84, clamp(a, 0, 1));
        ctx.fillText(t.text, t.x, t.y - u * 34 * vs);
      }
      ctx.restore();
    },

    reset() {
      clouds = []; grains = []; impacts = []; rings = []; texts = [];
      fieldPulse = 0; N.attractors.length = 0; N.hitsThisFrame = 0;
    },
  };

  G.Nebula = N;
})();
