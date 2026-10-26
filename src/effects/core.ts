/* 효과 엔진: 선택지 대신 일정한 주기(약 10초)마다 효과가 자동으로 걸린다.
   - 걸린 효과는 오른쪽 위 패널에 남은 시간·수치 변화와 함께 정리된다.
   - 효과마다 전용 연출(back=몸체 뒤, front=몸체 앞)과 시작 배너·효과음이 있다.
   - 수치 보정(mods)은 효과의 페이드 강도에 비례해 서서히 걸렸다 풀린다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const kit = Gp._fx;
  const clamp = G.clamp;
  const A = G.Audio;

  const EFFECT_GAP: [number, number] = [9.5, 11.5]; // 효과 사이 간격(초)
  const FADE_IN = 0.9, FADE_OUT = 1.1;

  const defs: EffectDef[] = Gp._EFFECT_DEFS || [];
  const active: EffectInst[] = [];

  function neutral(): EffectMods {
    return { absorb: 1, gravity: 1, fuelBurn: 1, cloud: 1, massDrain: 0, spin: 1, swirl: 1 };
  }
  const mods: EffectMods = neutral();

  const listEl = document.getElementById('fxList') as HTMLElement;
  const emptyEl = document.getElementById('fxEmpty') as HTMLElement;
  const countEl = document.getElementById('fxCount') as HTMLElement;
  const nextEl = document.getElementById('fxNext') as HTMLElement;
  const nextBar = document.getElementById('fxNextBar') as HTMLElement;
  const bannerEl = document.getElementById('fxBanner') as HTMLElement;
  const canvasEl = document.getElementById('scene') as HTMLElement;
  let bannerTimer = 0;
  let lastGap = EFFECT_GAP[1];

  // ---- 패널 -------------------------------------------------------------

  // 수치 변화를 "흡수량 ×1.5" 같은 칩으로. up=플레이어에게 이로운 변화
  function chipsFor(m?: Partial<EffectMods>): string {
    if (!m) return '';
    const out: string[] = [];
    const fmt = (v: number) => '×' + (Math.round(v * 100) / 100).toString();
    const add = (label: string, v: number | undefined, goodWhenHigh: boolean) => {
      if (v == null || v === 1) return;
      const good = goodWhenHigh ? v > 1 : v < 1;
      out.push('<span class="chip ' + (good ? 'up' : 'down') + '">' + label + ' ' + fmt(v) + '</span>');
    };
    add('흡수량', m.absorb, true);
    add('중력', m.gravity, true);
    add('성운 크기', m.cloud, true);
    add('자전', m.spin, true);
    add('연료 소모', m.fuelBurn, false);
    if (m.massDrain) out.push('<span class="chip down">질량 −' + (m.massDrain * 100).toFixed(1) + '%/초</span>');
    return out.join('');
  }

  function addItem(inst: EffectInst) {
    const d = inst.def;
    const el = document.createElement('div');
    el.className = 'fxItem ' + d.kind;
    el.innerHTML =
      '<div class="fxIcon"><span>' + d.icon + '</span></div>' +
      '<div class="fxBody">' +
      '<div class="fxName">' + d.name + '<span class="fxTime"></span></div>' +
      '<div class="fxDesc"></div>' +
      '<div class="fxChips">' + chipsFor(d.mods) + '</div>' +
      '</div>';
    (el.querySelector('.fxDesc') as HTMLElement).textContent = d.detail ? d.detail(inst) : d.desc;
    listEl.insertBefore(el, listEl.firstChild);
    inst.el = el;
    // 다음 프레임에 .in을 붙여 오른쪽에서 미끄러져 들어오는 트랜지션을 태운다
    requestAnimationFrame(() => el.classList.add('in'));
  }

  function removeItem(inst: EffectInst) {
    const el = inst.el;
    if (!el) return;
    el.classList.add('out');
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
    inst.el = null;
  }

  function showBanner(d: EffectDef) {
    bannerEl.className = d.kind;
    bannerEl.innerHTML = '<div class="bIcon">' + d.icon + '</div><div><div class="bName">' + d.name +
      '</div><div class="bDesc">' + d.desc + '</div></div>';
    // 같은 클래스를 다시 붙여도 애니메이션이 처음부터 다시 돌도록 강제 리플로우
    void bannerEl.offsetWidth;
    bannerEl.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => bannerEl.classList.remove('show'), 3100);
  }

  function updatePanel() {
    for (const inst of active) {
      const el = inst.el;
      if (!el) continue;
      const left = Math.max(0, inst.dur - inst.age);
      el.style.setProperty('--p', String(clamp(left / inst.dur, 0, 1)));
      (el.querySelector('.fxTime') as HTMLElement).textContent = Math.ceil(left) + '초';
    }
    emptyEl.style.display = active.length ? 'none' : 'block';
    countEl.textContent = String(active.length);
    const st = G.state;
    const wait = Math.max(0, st.nextEffectAt - st.playTime);
    nextEl.textContent = Math.ceil(wait) + '초 뒤 새 효과';
    nextBar.style.transform = 'scaleX(' + clamp(1 - wait / lastGap, 0, 1) + ')';
  }

  // ---- 시작/종료 ---------------------------------------------------------

  function startEffect(d: EffectDef) {
    const st = G.state;
    const dur = Array.isArray(d.duration) ? d.duration[0] + Math.random() * (d.duration[1] - d.duration[0]) : d.duration;
    const inst: EffectInst = {
      def: d, age: 0, dur, k: 0, rnd: kit.rng((Math.random() * 4294967296) >>> 0), data: {}, el: null,
    };
    if (d.once) st.usedEffects.add(d.id);
    st.lastEffectId = d.id;
    st.effectLog.push({ id: d.id, name: d.name, icon: d.icon });
    if (d.start) d.start(inst, st);
    active.push(inst);
    addItem(inst);
    showBanner(d);
    if (d.sound) d.sound(A);
    else A.playTone(520, 0.2, 'triangle', 0.1);
  }

  function endEffect(inst: EffectInst) {
    if (inst.def.end) inst.def.end(inst, G.state);
    removeItem(inst);
  }

  function pick(): EffectDef | null {
    const st = G.state;
    const pool: EffectDef[] = [];
    let total = 0;
    for (const d of defs) {
      if (d.once && st.usedEffects.has(d.id)) continue;
      if (d.id === st.lastEffectId) continue;
      if (active.some((a) => a.def.id === d.id)) continue;
      if (!d.condition(st)) continue;
      pool.push(d); total += d.weight || 1;
    }
    if (!pool.length) return null;
    let r = Math.random() * total;
    for (const d of pool) { r -= d.weight || 1; if (r <= 0) return d; }
    return pool[pool.length - 1];
  }

  // ---- 프레임 갱신/그리기 -------------------------------------------------

  const env: EffectEnv = {
    ctx: null as any, W: 0, H: 0, vs: 1, b: { x: 0, y: 0, r: 20 },
    age: 0, dur: 1, p: 0, k: 0, dt: 0, t: 0, st: null as any,
  };

  function fillEnv(inst: EffectInst, ctx: CanvasRenderingContext2D, body: StarActorPoint, dt: number) {
    env.ctx = ctx; env.W = G.Render.W; env.H = G.Render.H; env.vs = Gp._renderViewScale || 1;
    env.b = body; env.dt = dt; env.t = performance.now() / 1000; env.st = G.state;
    env.age = inst.age; env.dur = inst.dur; env.p = inst.age / inst.dur; env.k = inst.k;
  }

  function recomputeMods() {
    const n = neutral();
    for (const inst of active) {
      const m = inst.def.mods;
      if (!m) continue;
      const k = inst.k;
      // 페이드 강도만큼만 적용 — 효과가 들어올 때/나갈 때 수치가 툭 튀지 않는다
      if (m.absorb != null) n.absorb *= 1 + (m.absorb - 1) * k;
      if (m.gravity != null) n.gravity *= 1 + (m.gravity - 1) * k;
      if (m.fuelBurn != null) n.fuelBurn *= 1 + (m.fuelBurn - 1) * k;
      if (m.cloud != null) n.cloud *= 1 + (m.cloud - 1) * k;
      if (m.spin != null) n.spin *= 1 + (m.spin - 1) * k;
      if (m.swirl != null) n.swirl *= 1 + (m.swirl - 1) * k;
      if (m.massDrain != null) n.massDrain += m.massDrain * k;
    }
    Object.assign(mods, n);
  }

  const E: EffectsAPI = {
    mods,
    active,
    companionPos: null,

    update(dt: number, body: StarActorPoint) {
      const st = G.state;
      const ctx = Gp._renderCtx as CanvasRenderingContext2D;

      // 화면 흔들림: 효과가 요청한 만큼 캔버스를 떨고 매 프레임 감쇠
      const sh = Gp._shake || 0;
      if (sh > 0.15) {
        canvasEl.style.transform = 'translate(' + ((Math.random() - 0.5) * 2 * sh).toFixed(2) + 'px,' + ((Math.random() - 0.5) * 2 * sh).toFixed(2) + 'px)';
        Gp._shake = sh * Math.pow(0.02, dt || 0.016);
      } else if (canvasEl.style.transform) { canvasEl.style.transform = ''; Gp._shake = 0; }

      G.Nebula.attractors.length = 0;
      if (dt > 0) {
        for (let i = active.length - 1; i >= 0; i--) {
          const inst = active[i];
          inst.age += dt;
          inst.k = clamp(Math.min(inst.age / FADE_IN, (inst.dur - inst.age) / FADE_OUT), 0, 1);
          if (inst.def.step) { fillEnv(inst, ctx, body, dt); inst.def.step(inst, env); }
          if (inst.age >= inst.dur) { active.splice(i, 1); endEffect(inst); }
        }
        recomputeMods();

        // 주기 발동: 시뮬레이션이 흐르는 동안만 시계가 간다. 말기 연소 질주 중엔 새로 걸지 않는다.
        if (!st.collapseRush && !st.gameOver) {
          st.playTime += dt;
          if (st.playTime >= st.nextEffectAt) {
            const d = pick();
            lastGap = EFFECT_GAP[0] + Math.random() * (EFFECT_GAP[1] - EFFECT_GAP[0]);
            st.nextEffectAt = st.playTime + (d ? lastGap : 2);
            if (d) startEffect(d);
          }
        }
      }
      updatePanel();
    },

    drawBack(ctx: CanvasRenderingContext2D, body: StarActorPoint, dt: number) {
      for (const inst of active) {
        if (!inst.def.back) continue;
        ctx.save(); fillEnv(inst, ctx, body, dt); inst.def.back(inst, env); ctx.restore();
      }
    },

    drawFront(ctx: CanvasRenderingContext2D, body: StarActorPoint, dt: number) {
      for (const inst of active) {
        if (!inst.def.front) continue;
        ctx.save(); fillEnv(inst, ctx, body, dt); inst.def.front(inst, env); ctx.restore();
      }
    },

    // 디버그/QA: 조건과 무관하게 특정 효과를 바로 건다 — Game.Effects.force('disk')
    force(id: string) {
      const d = defs.find((x) => x.id === id);
      if (d) startEffect(d);
      else console.warn('효과 목록:', defs.map((x) => x.id).join(', '));
    },

    reset() {
      for (const inst of active) removeItem(inst);
      active.length = 0;
      Object.assign(mods, neutral());
      Gp._shake = 0; canvasEl.style.transform = '';
      bannerEl.classList.remove('show');
      E.companionPos = null;
      listEl.innerHTML = '';
    },
  };

  G.Effects = E;
})();
