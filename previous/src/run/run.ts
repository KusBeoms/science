/* 길 건너 친구들 방식의 진행 규칙.
   - 키를 누르면 한 칸(= 차선 하나) 앞으로 나아가고, 한 칸마다 앞쪽에 성운이 생겨 질량이 오른다.
     누르는 속도에는 제한이 없다.
   - 화면(카메라)은 항상 앞으로 흘러간다. 빨리 나아가면 화면도 그만큼 빨라지고,
     멈추면 몸체가 왼쪽으로 밀려나 화면 밖으로 나가 소멸한다.
   - 세로 차선마다 운석이 일정한 간격·속도로 지나간다. 차선과 진행 방향이 화면에 표시된다.
     부딪히면 질량이 줄어든다.
   - 최고 걸음 수와 최대 질량은 localStorage에 남는다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const kit = Gp._fx;
  const TAU = kit.TAU;
  const clamp = G.clamp;
  const A = G.Audio;

  const BEST_KEY = 'star-life:best:v1';
  const HOP_ARC = 0.14;                 // 한 칸 뛰는 연출 시간(다음 입력을 막지 않는다)
  const CELL_PX = 64;                   // 한 칸(차선 폭)의 화면 크기(화면 배율 곱)
  const BASE_SECONDS_PER_CELL = 0.75;   // 가만히 있을 때 화면이 한 칸 흘러가는 시간
  const FRONT_LIMIT = 0.85;            // 몸체가 머무는 가장 앞 화면 위치(폭 비율) — 넘으면 카메라가 따라붙는다
  const PACE_WINDOW = 0.8;              // 걸음 속도를 재는 시간 창(초)
  const STEP_GAIN = 0.04;               // 직접 붙여 줄 때의 한 칸 질량 보상(성운 생성이 막힌 경우)
  const METEOR_LOSS = 0.2;              // 운석 한 번에 잃는 질량 비율
  const HIT_KNOCKBACK_CELLS = 2;        // 맞으면 몸체가 뒤로 물러나는 칸 수(정수)
  const HIT_STUN = 0.45;                // 맞은 직후 입력이 먹통인 시간(초)
  const HIT_INVULN = 0.9;               // 맞은 뒤 연속 피격을 막는 시간(초)
  const HEAT_FREE_RATIO = 2.2;          // 이 배율(최소 속도 대비)까지는 열이 쌓이지 않는다
  const HEAT_RISE = 0.6;                // 초과분 1배당 초당 상승량(앞쪽 끝에 붙어 있을 때 기준)
  const HEAT_COOL = 0.5;                // 평소 초당 식는 양
  const OVERHEAT_STUN = 1.4;            // 과열로 멈추는 시간(초)
  const OVERHEAT_FUEL_FRAC = 0.04;      // 과열 시 깎이는 연료 비율(점화 후)
  const HIT_FUEL_FRAC = 0.08;           // 맞으면 깎이는 연료 비율(점화 후)

  interface Lane { k: number; hazard: boolean; dir: number; speed: number; period: number; r: number; t: number; }
  interface Meteor { X: number; y: number; vy: number; r: number; rot: number; spin: number; seed: number[]; trail: number[]; }
  interface Spark { x: number; y: number; vx: number; vy: number; t: number; }

  function loadBest(): RunBest {
    try {
      const j = JSON.parse(localStorage.getItem(BEST_KEY) || 'null');
      if (j && isFinite(j.steps) && isFinite(j.mass)) return { steps: Math.max(0, +j.steps), mass: Math.max(0, +j.mass) };
    } catch (e) { /* 저장소를 못 쓰는 환경(시크릿 모드 등)에서는 이번 판 기록만 유지 */ }
    return { steps: 0, mass: 0 };
  }
  // 서버(server.js)로 열었을 때는 기록을 서버에도 남긴다 — 브라우저 저장소를 지워도 유지된다.
  // 서버가 없으면(파일로 직접 열기 등) localStorage만 쓴다.
  const hasServer = /^https?:$/.test(location.protocol);
  function saveBest(b: RunBest) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* 무시 */ }
    if (hasServer) {
      fetch('/api/best', { method: 'POST', body: JSON.stringify(b), keepalive: true }).catch(() => { /* 서버 저장 실패는 조용히 */ });
    }
  }
  function syncFromServer() {
    if (!hasServer) return;
    fetch('/api/best', { cache: 'no-store' }).then((r) => r.json()).then((s) => {
      if (!s || !isFinite(s.steps) || !isFinite(s.mass)) return;
      // 서버·브라우저 기록 중 높은 쪽을 따른다
      R_.best.steps = Math.max(R_.best.steps, s.steps);
      R_.best.mass = Math.max(R_.best.mass, s.mass);
      try { localStorage.setItem(BEST_KEY, JSON.stringify(R_.best)); } catch (e) { /* 무시 */ }
      R_.refreshBestUI();
    }).catch(() => { /* 서버가 없으면 localStorage 기록 그대로 */ });
  }

  let camX = 0;            // 카메라가 월드에서 얼마나 나아갔나(px)
  let leadVis = 0;         // 평소 자리 대비 몸체의 화면 이동량(부드럽게 따라가는 값)
  let hopT = 1;
  let paceCount = 0;       // 최근 걸음 수(지수 감쇠) → 걸음 속도 = paceCount / PACE_WINDOW
  let camSpeed = 0;        // 지금 카메라 속도(px/s)
  let hitFlash = 0;
  let heat = 0;            // 과열 게이지(0~1): 지속 가능한 속도를 넘겨 달리면 쌓이고, 가득 차면 멈춘다
  let stunT = 0;           // 피격 직후 입력 불가 시간
  let invT = 0;            // 피격 직후 무적 시간
  let seed = 1;
  let lanes: Record<number, Lane> = {};
  let hazardMemo: Record<number, boolean> = {};
  let meteors: Meteor[] = [];
  let sparks: Spark[] = [];
  let body: StarActorPoint = { x: 300, y: 300, r: 30 };

  function vs(): number { return Gp._renderViewScale || 1; }
  function cell(): number { return CELL_PX * vs(); }
  function origin(): number { return G.Render.W * G.STAR_REST_X_FRACTION; } // 0번 차선(출발 칸)의 중심 화면 x
  function baseSpeed(): number { return cell() / BASE_SECONDS_PER_CELL; }
  // 걸음이 쌓일수록 운석의 속도·빈도가 오른다(최대 2.4배). 카메라 속도는 일정하다 —
  // 같이 올리면 후반 화면이 비현실적으로 빨라진다.
  function stageMul(): number { return 1 + Math.min(1.4, G.state.steps * 0.007); }

  function laneRnd(k: number, salt: number): number {
    return kit.rng(((k + 1000) * 2654435761 + salt * 40503 + seed) >>> 0)();
  }
  // 위험 차선 여부: 출발 직후 두 칸은 안전, 위험 차선이 세 칸 넘게 이어지지 않는다
  function isHazard(k: number): boolean {
    if (k < 2) return false;
    if (hazardMemo[k] != null) return hazardMemo[k];
    let h = laneRnd(k, 1) < 0.5 + Math.min(0.2, k * 0.003);   // 멀리 갈수록 위험 차선이 늘어난다
    if (h && isHazard(k - 1) && isHazard(k - 2) && isHazard(k - 3)) h = false;
    return (hazardMemo[k] = h);
  }
  function laneAt(k: number): Lane {
    let L = lanes[k];
    if (L) return L;
    const v = vs();
    const period = 2.2 + laneRnd(k, 3) * 1.4;   // 차선마다 일정한 간격(2.2~3.6초)
    L = {
      k, hazard: isHazard(k), dir: laneRnd(k, 2) < 0.5 ? 1 : -1,
      speed: (170 + laneRnd(k, 4) * 110) * v, period,
      r: (11 + laneRnd(k, 5) * 3 + Math.min(5, Math.max(0, k) * 0.04)) * v, t: laneRnd(k, 6) * period,
    };
    return (lanes[k] = L);
  }
  function laneX(k: number): number { return origin() + k * cell() - camX; }  // 차선 중심의 화면 x

  function rockPoly(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, seedArr: number[]) {
    ctx.beginPath();
    for (let i = 0; i < seedArr.length; i++) {
      const a = rot + (i / seedArr.length) * TAU, rr = r * seedArr[i];
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function massLabel(m: number): string {
    if (m >= G.IGNITION_MASS) return m.toFixed(2) + ' × 태양';
    if (m < G.GAS_GIANT_MIN_MASS) return (m / G.EARTH_MASS).toFixed(2) + ' × 지구';
    return (m / G.JUPITER_MASS).toFixed(2) + ' × 목성';
  }

  function spawnMeteor(L: Lane) {
    const H = G.Render.H;
    const seedArr: number[] = []; const n = 8;
    for (let i = 0; i < n; i++) seedArr.push(0.8 + Math.random() * 0.35);
    meteors.push({
      X: origin() + L.k * cell(), y: L.dir > 0 ? -30 : H + 30, vy: L.dir * L.speed * stageMul(),
      r: L.r, rot: Math.random() * TAU, spin: (L.k % 2 ? 1 : -1) * 0.8, seed: seedArr, trail: [],
    });
  }

  const R_: RunAPI = {
    best: loadBest(),
    newRecord: false,
    scrollRatio: 1,
    burnMul: 1,
    paceRatio: 1,
    gainScale: 1,

    // 한 칸 전진. 속도 제한은 없다.
    hop(code: string, label: string): boolean {
      const st = G.state;
      if (stunT > 0) return false;   // 맞은 직후엔 한 박자 쉰다
      st.steps++;
      hopT = 0;
      paceCount += 1;
      // 저장은 판이 끝날 때(finish)와 페이지를 떠날 때만 한다 — 걸음마다 쓰면 기록 경신 중
      // localStorage 쓰기와 서버 POST가 키 입력마다 나간다.
      if (st.steps > R_.best.steps) { R_.best.steps = st.steps; R_.newRecord = true; }
      // 성운이 모여 흡수될 때 질량이 오른다. 성운 수 한도에 걸리면 같은 양을 바로 붙여 준다.
      if (!G.Nebula.spawn(code, label, { near: true })) G.Nebula.addMassFrac(STEP_GAIN * R_.gainScale);
      if (A.actx) A.playTone(300 + Math.min(st.steps, 80) * 5, 0.06, 'triangle', 0.045);
      // 25걸음마다 웅장한 울림으로 이정표를 알린다
      if (st.steps % 25 === 0) { A.playChord([131, 196, 262, 392], 2.0, 0.06); A.playBoom(0.3, 1.2); }
      return true;
    },

    update(dt: number, b: StarActorPoint) {
      body = b;
      const st = G.state;
      if (dt <= 0) return;
      const v = vs(), cl = cell();

      // 카메라: 기본 속도와 "최근 걸음 속도" 중 빠른 쪽을 따른다 — 빨리 갈수록 화면도 빨라진다.
      paceCount *= Math.exp(-dt / PACE_WINDOW);
      const pace = paceCount / PACE_WINDOW;                 // 초당 걸음 수
      const base = baseSpeed();   // 카메라 기본 속도는 일정하다(난이도는 운석 쪽에서 올린다)
      const want = Math.max(base, pace * cl * 1.05);
      // 맞은 직후엔 걸음 속도 기록이 0이 돼도 카메라 속도를 그대로 유지한다
      // (그렇지 않으면 화면이 갑자기 느려져 카메라가 뒤로 가는 것처럼 보인다)
      if (stunT <= 0) camSpeed += (want - camSpeed) * Math.min(1, dt * 6);  // 가속·감속은 부드럽게
      camX += camSpeed * dt;
      // 몸체가 앞쪽 한계를 넘어 앞서 나가면 카메라가 따라붙는다(몸체는 늘 화면 안)
      const maxLead = G.Render.W * FRONT_LIMIT - origin();
      let lead = st.steps * cl - camX;
      if (lead > maxLead) { camX += (lead - maxLead) * Math.min(1, dt * 12); lead = st.steps * cl - camX; }
      R_.scrollRatio = clamp(camSpeed / baseSpeed(), 1, 8);
      // 빨리 갈수록 시간을 번다: 카메라가 요구하는 최소 걸음 속도 대비 내 속도로 연료(=수명)
      // 소모 배율을 정한다. 겨우 따라가면 1배, 두 배 빠르면 0.5배, 느리면 최대 1.3배.
      const need = 1 / BASE_SECONDS_PER_CELL;
      R_.paceRatio = pace / need;
      // 시간 보너스는 1.6배 속도에서 포화한다(0.7배 소모) — 그 이상 달려도 수명은 더 늘지 않는다
      R_.burnMul = clamp(1.5 - 0.5 * R_.paceRatio, 0.7, 1.3);
      // 성운을 앞질러 달리면 한 걸음에 모이는 물질이 묽어진다. 속도가 빨라질수록
      // 걸음당 질량은 줄어 초당 질량 증가는 거의 늘지 않는다(질량 목적의 질주를 막는다)
      R_.gainScale = R_.paceRatio <= 1 ? 1 : clamp(Math.pow(R_.paceRatio, -0.7), 0.35, 1);
      stunT = Math.max(0, stunT - dt); invT = Math.max(0, invT - dt);
      // 달리기에도 대가가 있다: 최소 속도의 2.2배를 넘겨 몰아치면 열이 쌓이고, 가득 차면
      // 과열로 멈춰 서서 속도·연료를 잃는다. 카메라 속도도 함께 본다 — 카메라는 내 속도를
      // 따라 빨라지므로, 열은 카메라가 못 따라올 만큼 앞서 달려 몸체가 화면 앞쪽 끝에
      // 붙어 있을 때만 쌓인다(중간 이하에서는 카메라가 따라잡는 중이라 쌓이지 않는다).
      const front = clamp((lead / maxLead - 0.5) / 0.4, 0, 1);
      if (R_.paceRatio > HEAT_FREE_RATIO && front > 0) heat += dt * (R_.paceRatio - HEAT_FREE_RATIO) * HEAT_RISE * front;
      else heat = Math.max(0, heat - dt * HEAT_COOL);
      if (heat >= 1 && stunT <= 0) {
        heat = 0.35; stunT = OVERHEAT_STUN; paceCount = 0; hitFlash = 0.6;
        if (st.hasFusion) st.fuel = Math.max(0, st.fuel - G.FUEL_MAX * OVERHEAT_FUEL_FRAC);
        kit.shake(3);
        G.Nebula.floatText(b.x, b.y - b.r - 24 * v, '과열!', 20, 20);
        G.Nebula.ring(b.x, b.y, b.r, b.r * 3, 0.9, 20, 2.5, 0.7);
        if (A.actx) { A.playNoiseBurst(0.3, 0.1); A.playTone(140, 0.4, 'sawtooth', 0.08); }
      }

      leadVis += (lead - leadVis) * Math.min(1, dt * 18);
      if (hopT < 1) hopT = Math.min(1, hopT + dt / HOP_ARC);
      hitFlash = Math.max(0, hitFlash - dt * 1.8);
      // 몸체를 칸 중심에 맞추고(크기로 평소 자리가 밀려도 보정), 뛰는 동안엔 위로 호를 그린다
      const restX = Gp._renderRestingX(G.Render, st.volume);
      Gp._runOffX = leadVis + (origin() - restX);
      Gp._runOffY = -Math.sin(Math.PI * hopT) * 0.28 * cl;
      st.peakMass = Math.max(st.peakMass, st.mass);

      // 화면에 보이는 차선만 운석을 만든다: 차선마다 일정한 간격
      const kMin = Math.floor((camX - origin()) / cl) - 1;
      const kMax = Math.ceil((camX + G.Render.W - origin()) / cl) + 1;
      for (let k = kMin; k <= kMax; k++) {
        const L = laneAt(k);
        if (!L.hazard) continue;
        L.t -= dt;
        if (L.t <= 0) { spawnMeteor(L); L.t += L.period / stageMul(); }
      }
      for (const key in lanes) if (+key < kMin - 3) delete lanes[key];
      // isHazard는 앞선 세 칸만 참조하므로 한참 지나간 칸의 메모는 버려도 된다
      for (const key in hazardMemo) if (+key < kMin - 10) delete hazardMemo[key];

      const H = G.Render.H;
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.rot += m.spin * dt; m.y += m.vy * dt;
        m.trail.push(m.y); if (m.trail.length > 10) m.trail.shift();
        const sx = m.X - camX;
        // 같은 차선의 몸체와만 부딪힌다(차선 폭을 넘어 옆 칸까지 치지 않는다)
        const hitR = Math.min(b.r, cl * 0.38) + m.r * 0.7;
        if (invT <= 0 && Math.hypot(b.x - sx, b.y - m.y) <= hitR) {
          G.Nebula.scaleMass(1 - METEOR_LOSS, sx, m.y);
          st.meteorHits++; hitFlash = 1;
          // 맞는 건 질량만 잃는 게 아니다: 뒤로 밀려나고, 잠깐 굳고, 속도(시간 보너스)를 잃고, 연료도 깎인다
          stunT = HIT_STUN; invT = HIT_INVULN; paceCount = 0;
          // 카메라를 건드리지 않고 몸체만 뒤 칸으로 물러난다(걸음 수가 줄어 leadVis가 부드럽게 따라간다)
          st.steps = Math.max(0, st.steps - HIT_KNOCKBACK_CELLS);
          if (st.hasFusion) st.fuel = Math.max(0, st.fuel - G.FUEL_MAX * HIT_FUEL_FRAC);
          kit.shake(4);
          const ang = Math.atan2(m.y - b.y, sx - b.x);
          for (let k = 0; k < 12; k++) {
            const a = ang + (Math.random() - 0.5) * 1.6, sp = 60 + Math.random() * 140;
            sparks.push({ x: sx, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0 });
          }
          if (A.actx) { A.playNoiseBurst(0.22, 0.14); A.playTone(90, 0.3, 'sine', 0.12); }
          meteors.splice(i, 1); continue;
        }
        if (m.y < -80 || m.y > H + 80 || sx < -cl * 2) meteors.splice(i, 1);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]; s.t += dt; s.x += (s.vx - camSpeed * 0.5) * dt; s.y += s.vy * dt;
        s.vx *= 1 - dt * 1.5; s.vy *= 1 - dt * 1.5;
        if (s.t > 0.8) sparks.splice(i, 1);
      }

      // 화면 왼쪽 끝으로 완전히 밀려나면 소멸
      if (!st.gameOver && b.x + b.r < 0) Gp._triggerEnding('vanish');
    },

    // 차선 표시(몸체 뒤): 칸 경계선, 위험 차선의 띠, 흐르는 방향 화살표, 내가 서 있는 칸
    drawBack(ctx: CanvasRenderingContext2D, b: StarActorPoint) {
      const W = G.Render.W, H = G.Render.H, cl = cell(), v = vs();
      const t = performance.now() / 1000;
      const kMin = Math.floor((camX - origin()) / cl) - 1;
      const kMax = Math.ceil((camX + W - origin()) / cl) + 1;
      const myLane = G.state.steps;
      ctx.save();
      for (let k = kMin; k <= kMax; k++) {
        const L = laneAt(k), x = laneX(k), x0 = x - cl / 2;
        if (x0 > W || x0 + cl < 0) continue;
        if (L.hazard) {
          ctx.fillStyle = 'rgba(170,70,50,0.04)'; ctx.fillRect(x0, 0, cl, H);
          // 운석이 흐르는 방향으로 움직이는 화살표
          const gap = 96 * v, off = (t * L.speed * L.dir) % gap;
          ctx.strokeStyle = 'rgba(255,170,140,0.09)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (let y = -gap + (off < 0 ? off + gap : off); y < H + gap; y += gap) {
            const s = 7 * v * L.dir;
            ctx.beginPath(); ctx.moveTo(x - 7 * v, y - s); ctx.lineTo(x, y); ctx.lineTo(x + 7 * v, y - s); ctx.stroke();
          }
          // 운석이 들어오는 쪽 끝의 표시 — 곧 나올 차례면 깜빡인다
          const soon = L.t < 0.7 ? 0.5 + 0.5 * Math.sin(t * 20) : 0;
          const ey = L.dir > 0 ? 10 * v : H - 10 * v;
          ctx.fillStyle = 'rgba(255,150,120,' + (0.16 + 0.6 * soon).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(x - 8 * v, ey - 5 * v * L.dir); ctx.lineTo(x + 8 * v, ey - 5 * v * L.dir); ctx.lineTo(x, ey + 7 * v * L.dir); ctx.closePath(); ctx.fill();
        } else if (k % 2 === 0) {
          ctx.fillStyle = 'rgba(160,190,255,0.012)'; ctx.fillRect(x0, 0, cl, H);
        }
        if (k === myLane) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(x0, 0, cl, H); }
        // 칸 경계선(한 칸의 기준)
        ctx.strokeStyle = L.hazard ? 'rgba(255,190,170,0.07)' : 'rgba(190,205,255,0.04)';
        ctx.lineWidth = 1; ctx.setLineDash(L.hazard ? [] : [4, 8]);
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, H); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    },

    drawFront(ctx: CanvasRenderingContext2D, b: StarActorPoint) {
      const W = G.Render.W, H = G.Render.H, v = vs();
      ctx.save();
      for (const m of meteors) {
        const sx = m.X - camX;
        const d = Math.hypot(b.x - sx, b.y - m.y);
        const heat = clamp(1 - (d - b.r) / (b.r * 3 + 80), 0, 1);
        for (let i = 0; i < m.trail.length; i++) {
          const u = i / m.trail.length;
          ctx.fillStyle = kit.hsl(26, 60, 62, 0.2 * u);
          ctx.beginPath(); ctx.arc(sx, m.trail[i], m.r * 0.6 * u, 0, TAU); ctx.fill();
        }
        rockPoly(ctx, sx, m.y, m.r, m.rot, m.seed);
        ctx.fillStyle = heat > 0.5 ? '#9a6e4e' : '#6f6055'; ctx.fill();
        ctx.strokeStyle = 'rgba(25,18,14,0.85)'; ctx.lineWidth = 1; ctx.stroke();
        rockPoly(ctx, sx - m.r * 0.15, m.y - m.r * 0.15, m.r * 0.55, m.rot, m.seed);
        ctx.fillStyle = 'rgba(255,235,210,0.16)'; ctx.fill();
      }
      for (const s of sparks) {
        ctx.fillStyle = kit.hsl(28, 80, 72, (1 - s.t / 0.8) * 0.8);
        ctx.beginPath(); ctx.arc(s.x, s.y, 1.5, 0, TAU); ctx.fill();
      }
      if (hitFlash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        kit.glow(ctx, b.x, b.y, b.r * 1.5, 'rgba(255,90,60,' + (0.3 * hitFlash).toFixed(3) + ')', 'rgba(0,0,0,0)');
      }
      // 밀려나는 위험: 몸체가 왼쪽 끝에 가까울수록 가장자리가 붉게 맥박친다
      const danger = clamp(1 - (b.x + b.r) / (W * 0.2), 0, 1);
      if (danger > 0) {
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createLinearGradient(0, 0, W * 0.2, 0);
        const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 1000 * (4 + danger * 8));
        g.addColorStop(0, 'rgba(255,50,40,' + (0.45 * danger * pulse).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,50,40,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.2, H);
      }
      // 과열 게이지: 몸체를 두르는 고리가 차오르고, 가득 차기 직전엔 붉게 깜빡인다
      if (heat > 0.02) {
        const rr = b.r * 1.3 + 6 * v;
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 3 * v; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, TAU); ctx.stroke();
        const blink = heat > 0.8 ? 0.6 + 0.4 * Math.sin(performance.now() / 60) : 1;
        ctx.strokeStyle = kit.hsl(55 - 55 * heat, 95, 62, 0.9 * blink);
        ctx.beginPath(); ctx.arc(b.x, b.y, rr, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(heat, 0, 1)); ctx.stroke();
      }
      ctx.restore();
      void v;
    },

    // 판이 끝날 때: 최대 질량 갱신 + 저장
    finish() {
      const st = G.state;
      if (st.steps > R_.best.steps) { R_.best.steps = st.steps; R_.newRecord = true; }
      if (st.peakMass > R_.best.mass) R_.best.mass = st.peakMass;
      saveBest(R_.best);
      R_.refreshBestUI();
    },

    reset() {
      camX = 0; leadVis = 0; hopT = 1; paceCount = 0; camSpeed = baseSpeed(); hitFlash = 0; stunT = 0; invT = 0; heat = 0; R_.burnMul = 1; R_.paceRatio = 1; R_.gainScale = 1;
      seed = (Math.random() * 1e9) >>> 0;
      lanes = {}; hazardMemo = {}; meteors = []; sparks = [];
      Gp._runOffX = 0; Gp._runOffY = 0; Gp._bodyCache = null;
      R_.newRecord = false; R_.scrollRatio = 1;
    },

    massLabel,

    refreshBestUI() {
      const el = document.getElementById('bestInfo');
      if (!el) return;
      el.textContent = R_.best.steps > 0
        ? '최고 기록 — ' + R_.best.steps + '걸음 · 최대 질량 ' + massLabel(R_.best.mass)
        : '아직 기록이 없습니다';
    },
  };

  // 판 도중 탭을 닫아도 방금까지의 걸음 기록은 남긴다
  window.addEventListener('pagehide', () => {
    const st = G.state;
    if (st.started && st.peakMass > R_.best.mass) R_.best.mass = st.peakMass;
    saveBest(R_.best);
  });

  Gp._runOffX = 0; Gp._runOffY = 0;
  G.Run = R_;
  R_.refreshBestUI();
  syncFromServer();
})();
