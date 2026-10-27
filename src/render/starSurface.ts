/* 별 표면 시뮬레이션: 스펙트럼형 색/행동 프로파일 + 과립·흑점·항성풍·플레어 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const clamp = G.clamp;
  const ctx: CanvasRenderingContext2D = Gp._renderCtx;

  // 실제 항성 스펙트럼형(M~O) 분류의 질량 경계(태양질량 단위, 통용되는
  // 근사표 기준): M<0.45, K 0.45–0.8, G 0.8–1.04(태양=G2V), F 1.04–1.4,
  // A 1.4–2.1, B 2.1–16, O>16. 색상은 실제 항성의 흑체색 순서(적색→주황→
  // 노랑빛 흰색→흰색→청백색)를 그대로 따른다.
  const STAR_TIERS: StarTier[] = [
    { spectral: 'M', max: 0.45, color: [255, 178, 102], granules: 2, granuleSpeed: 0.40, spots: 2, spotOpacity: 0.40, flareEvery: [5, 9], flareSize: 0.50, wind: 0, windSpeed: 0, oblate: 0, pulse: 1.0 },
    { spectral: 'K', max: 0.8, color: [255, 206, 140], granules: 3, granuleSpeed: 0.55, spots: 1, spotOpacity: 0.28, flareEvery: [9, 14], flareSize: 0.55, wind: 0, windSpeed: 0, oblate: 0, pulse: 1.0 },
    { spectral: 'G', max: 1.04, color: [255, 238, 204], granules: 5, granuleSpeed: 0.75, spots: 1, spotOpacity: 0.18, flareEvery: [14, 22], flareSize: 0.60, wind: 6, windSpeed: 18, oblate: 0, pulse: 1.0 },
    { spectral: 'F', max: 1.4, color: [255, 248, 235], granules: 6, granuleSpeed: 0.90, spots: 0, spotOpacity: 0, flareEvery: [18, 26], flareSize: 0.65, wind: 10, windSpeed: 24, oblate: 0.02, pulse: 1.05 },
    { spectral: 'A', max: 2.1, color: [226, 232, 255], granules: 6, granuleSpeed: 1.05, spots: 0, spotOpacity: 0, flareEvery: [16, 24], flareSize: 0.75, wind: 16, windSpeed: 32, oblate: 0.06, pulse: 1.10 },
    { spectral: 'B', max: 16, color: [190, 206, 255], granules: 7, granuleSpeed: 1.30, spots: 0, spotOpacity: 0, flareEvery: [10, 16], flareSize: 0.90, wind: 28, windSpeed: 48, oblate: 0.11, pulse: 1.30 },
    { spectral: 'O', max: 100, color: [160, 182, 255], granules: 8, granuleSpeed: 1.60, spots: 0, spotOpacity: 0, flareEvery: [5, 9], flareSize: 1.10, wind: 42, windSpeed: 70, oblate: 0.17, pulse: 1.60 },
  ];

  // 플레이어/동반성별로 유지되는 표면 애니메이션 상태(과립·흑점·항성풍 풀).
  // 매 프레임 새로 만들지 않고 위상만 누적해, 질량 구간이 바뀌어도 팝업 없이
  // 부드럽게 전환되게 한다.
  const surfaces: Record<string, any> = {};
  function makeSurface() {
    const granules = [];
    for (let i = 0; i < 8; i++) granules.push({
      angle: Math.random() * Math.PI * 2, rOff: 0.25 + Math.random() * 0.35,
      sizeSeed: 0.6 + Math.random() * 0.8, speedSeed: 0.6 + Math.random() * 0.8, phase: Math.random() * 10,
    });
    const spots = [];
    for (let i = 0; i < 2; i++) spots.push({ angle: Math.random() * Math.PI * 2, sizeSeed: 0.6 + Math.random() * 0.8 });
    return {
      granules, spots, visibleGranules: 0, visibleSpots: 0, visibleWind: 0,
      visibleOblate: 0, visiblePulse: 1,
      wind: [] as any[], flareTimer: 2 + Math.random() * 4, flares: [] as any[],
    };
  }

  Gp._renderMassColor = function (m: number): string {
    const mm = Number.isFinite(m) ? clamp(m, 0.08, 100) : 0.08;
    const nodes: [number, [number, number, number]][] = [[0.08, [255, 120, 80]]];
    for (const t of STAR_TIERS) nodes.push([t.max, t.color]);
    let i = 0;
    while (i < nodes.length - 2 && mm > nodes[i + 1][0]) i++;
    const [m0, c0] = nodes[i], [m1, c1] = nodes[i + 1];
    const f = (mm - m0) / ((m1 - m0) || 1);
    const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
    const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
    const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
    return `rgb(${r},${g},${b})`;
  };

  Gp._renderStarClass = function (m: number): StarTier {
    const mm = Number.isFinite(m) ? clamp(m, 0.08, 100) : 0.08;
    for (const t of STAR_TIERS) if (mm <= t.max) return t;
    return STAR_TIERS[STAR_TIERS.length - 1];
  };

  // 부피(volume) → 화면 반지름(px). 순수 시각적 크기 스탯이라 상한을 두지 않고
  // 그대로 비례하게 둔다 — 거대해진 별은 화면 밖으로 튀어나갈 수 있으며,
  // 그 보정(왼쪽으로 밀어내기)은 starActors.ts의 앵커 위치 계산에서 처리한다.
  Gp._renderStarRadius = function (volume: number): number {
    return (14 + Math.max(volume, 6) * 0.55) * (Gp._renderViewScale || 1);
  };

  Gp._renderGetSurface = function (id: string) {
    if (!surfaces[id]) surfaces[id] = makeSurface();
    return surfaces[id];
  };

  // 재시작 시 이전 판의 항성풍/플레어/과립 상태가 새 별에 남지 않도록 초기화.
  Gp._renderResetSurfaces = function () {
    for (const k in surfaces) delete surfaces[k];
    Gp._renderResetBodyTextures();
    setTimeout(Gp._renderWarmBodyTextures, 30);
  };


  // 원시체(가스행성)에서 별로 넘어가는 점화 블렌드용 기준색 — 블렌드가 낮을수록
  // 별의 색이 이 색에 가깝게 섞여, 빛이 서서히 차오르는 것처럼 보인다.
  const PROTO_COLOR: [number, number, number] = [201, 161, 112];
  function rgbOf(col: string): [number, number, number] {
    const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(col);
    return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
  }
  function mixRgb(a: number[], b: number[], t: number): [number, number, number] {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function rgba(c: number[], a: number): string {
    return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  }

  // 광구 쌀알무늬(granulation): 대류 셀의 뜨거운 중심(밝음)과 식어 가라앉는
  // 경계(어두운 그물)를 보로노이(Worley) 노이즈로 한 번 만들어 두고, 별 위에
  // 곱하기(multiply)로 얹는다. 가장자리가 이어지는(tileable) 텍스처라 회전해도
  // 이음매가 없다.
  const GRAN = (function () {
    const S = 256, CELLS = 26;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const c = cv.getContext('2d')!;
    const img = c.createImageData(S, S);
    const pts: number[][] = [];
    for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) pts.push([i + Math.random(), j + Math.random()]);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const fx = x / S * CELLS, fy = y / S * CELLS;
        const ci = Math.floor(fx), cj = Math.floor(fy);
        let f1 = 9, f2 = 9;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = (ci + di + CELLS) % CELLS, jj = (cj + dj + CELLS) % CELLS;
          const p = pts[jj * CELLS + ii];
          const px = p[0] + (ci + di - ii), py = p[1] + (cj + dj - jj);
          const d = Math.hypot(fx - px, fy - py);
          if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
        }
        // 경계를 부드럽게 — 선명한 그물이 아니라 끓어오르는 얼룩으로 보이게
        const edge = clamp((f2 - f1) * 1.6, 0, 1);
        const v = 150 + 105 * Math.pow(edge, 0.9) * (1 - f1 * 0.4);
        const o = (y * S + x) * 4;
        img.data[o] = v; img.data[o + 1] = v * 0.97; img.data[o + 2] = v * 0.93; img.data[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    return cv;
  })();

  Gp._renderDrawStarBody = function (
    x: number, y: number, mass: number, volume: number, fuelFrac: number,
    angle: number, id?: string, dt?: number, ignitionBlend?: number
  ): StarActorPoint {
    id = id || 'anonymous';
    dt = (dt == null) ? 0.016 : dt;
    const blend = ignitionBlend == null ? 1 : clamp(ignitionBlend, 0, 1);
    const tier = Gp._renderStarClass(mass);
    const surf = Gp._renderGetSurface(id);
    // 점화 직전 원시체는 별 반지름의 PROTO_BODY_SCALE배로 그려진다(starActors.ts). 블렌드
    // 동안 그 크기에서 별 크기로 함께 부풀어야 점화 순간 크기가 툭 튀지 않는다.
    // 연료가 30% 아래로 내려간 0.5 M☉ 이상의 별은 거성으로 부풀고 붉어진다. 라벨만
    // "적색거성"이고 모습은 주계열 그대로이던 불일치를 없앤다(0.5 M☉ 미만은 거성이 못 된다).
    // 초거성(8 M☉~)은 더 크게 부푼다.
    const giant = mass >= G.HELIUM_IGNITION_MIN ? clamp((0.3 - fuelFrac) / 0.3, 0, 1) : 0;
    const giantSize = 1 + giant * (mass >= G.WHITE_DWARF_MAX ? 0.9 : 0.6);
    const r = Gp._renderStarRadius(volume) * (G.PROTO_BODY_SCALE + (1 - G.PROTO_BODY_SCALE) * blend) * giantSize;
    const ease = 1 - Math.exp(-3 * dt);
    // 스펙트럼형 경계를 넘을 때 편평도/맥동 강도가 순간적으로 바뀌지 않도록
    // 목표값으로 부드럽게 접근시킨다.
    surf.visibleOblate += (tier.oblate - surf.visibleOblate) * ease;
    surf.visiblePulse += (tier.pulse - surf.visiblePulse) * ease;
    surf.visibleGranules += (tier.granules - surf.visibleGranules) * ease;
    surf.visibleSpots += (tier.spots - surf.visibleSpots) * ease;
    // fuel이 낮을 때(말기) 불안정도 계수 — 맥동/플레어/항성풍을 함께 끌어올린다.
    const instab = fuelFrac < 0.2 ? 1 - fuelFrac / 0.2 : 0;
    const now = performance.now() / 1000;
    const pulse = 1 + Math.sin(now * 8.3) * 0.06 * instab * surf.visiblePulse;
    const rp = r * pulse;
    const squashY = 1 - surf.visibleOblate;

    const base = mixRgb(mixRgb(PROTO_COLOR, rgbOf(Gp._renderMassColor(mass)), blend), [255, 112, 72], giant * 0.7);
    const white = [255, 255, 255];
    const core = mixRgb(base, white, 0.62);
    // 가장자리는 같은 색조를 유지한 채 어둡게만 — 색을 따뜻하게 틀면 뜨거운
    // 청백색 O/B형 별에 탁한 갈색 테두리가 생긴다.
    const limb = [base[0] * 0.74, base[1] * 0.72, base[2] * 0.72];

    // 점화 직후엔 가스행성 원시체를 먼저 그려 두고 그 위에 별을 blend만큼
    // 겹쳐, 줄무늬 대기가 빛에 서서히 뒤덮이는 것처럼 보이게 한다.
    if (blend < 1) Gp._renderDrawTexturedSphere(ctx, 'gasGiant', x, y, rp, angle * 0.3, 0.08, 1);

    ctx.save();
    ctx.translate(x, y);

    // 1) 광륜(corona glow) — 가산 합성으로 여러 겹 쌓아 부드럽게 번지는 빛
    ctx.globalCompositeOperation = 'lighter';
    const glowR = rp * (3.2 + surf.visiblePulse * 0.4);
    const glow = ctx.createRadialGradient(0, 0, rp * 0.85, 0, 0, glowR);
    glow.addColorStop(0, rgba(base, 0.55 * blend));
    glow.addColorStop(0.18, rgba(base, 0.2 * blend));
    glow.addColorStop(0.5, rgba(base, 0.05 * blend));
    glow.addColorStop(1, rgba(base, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();

    // 2) 코로나 스트리머 — 자기장을 따라 길게 뻗은 옅은 빛줄기가 천천히 돈다.
    //    끝이 뾰족한 삼각형 대신 길쭉하게 눌린 부드러운 빛덩이로 그린다.
    const streamers = 6;
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    sg.addColorStop(0, rgba(core, 0.16 * blend));
    sg.addColorStop(0.5, rgba(base, 0.05 * blend));
    sg.addColorStop(1, rgba(base, 0));
    ctx.fillStyle = sg;
    for (let i = 0; i < streamers; i++) {
      const a = i * (Math.PI * 2 / streamers) + now * 0.03 + Math.sin(i * 12.9) * 0.4;
      const len = rp * (2.1 + 0.4 * Math.sin(now * 0.4 + i * 3.1) + surf.visiblePulse * 0.3);
      ctx.save();
      ctx.rotate(a);
      ctx.scale(len, rp * (0.55 + 0.15 * Math.sin(i * 7.7)));
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';

    // 3) 광구 — 주변감광(limb darkening): 가장자리로 갈수록 더 차갑고 얕은
    //    층이 보이므로 중심보다 어둡고 붉다. 자전이 빠른 별은 편평하게.
    ctx.save();
    ctx.rotate(angle);
    ctx.scale(1, squashY);
    ctx.globalAlpha = blend;
    const ph = ctx.createRadialGradient(0, 0, 0, 0, 0, rp);
    ph.addColorStop(0, rgba(core, 1));
    ph.addColorStop(0.55, rgba(mixRgb(base, white, 0.28), 1));
    ph.addColorStop(0.86, rgba(base, 1));
    ph.addColorStop(1, rgba(limb, 1));
    ctx.fillStyle = ph;
    ctx.beginPath(); ctx.arc(0, 0, rp, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, rp, 0, Math.PI * 2); ctx.clip();

    // 4) 쌀알무늬 — 두 겹을 서로 다른 속도로 돌려 셀이 끓어오르듯 변하게.
    //    저온 별일수록 셀이 크고 대비가 강하다(tier.granules가 작을수록 크게).
    const gFrac = clamp(surf.visibleGranules / 8, 0, 1);
    const cell = rp * (3.6 - gFrac * 1.2);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = (0.26 + 0.14 * gFrac) * blend;
    ctx.save(); ctx.rotate(now * 0.05 * tier.granuleSpeed); ctx.drawImage(GRAN, -cell / 2, -cell / 2, cell, cell); ctx.restore();
    ctx.globalAlpha = (0.14 + 0.08 * gFrac) * blend;
    ctx.save(); ctx.rotate(-now * 0.035 * tier.granuleSpeed + 1.3); ctx.drawImage(GRAN, -cell * 0.6, -cell * 0.6, cell * 1.2, cell * 1.2); ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    // 5) 흑점 — 어두운 본영(umbra) + 옅은 반영(penumbra). 저온 항성(M/K/G)에서만.
    const sCount = Math.ceil(surf.visibleSpots);
    for (let i = 0; i < sCount; i++) {
      const sp = surf.spots[i];
      sp.angle += dt * 0.05;
      const sx = Math.cos(sp.angle) * rp * 0.55, sy = Math.sin(sp.angle) * rp * 0.55;
      const boundaryAlpha = (i < sCount - 1) ? 1 : clamp(surf.visibleSpots - (sCount - 1), 0, 1);
      const op = clamp(tier.spotOpacity * 2.2, 0, 1) * boundaryAlpha * blend;
      const sr = rp * 0.17 * sp.sizeSeed;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, `rgba(40,14,2,${0.9 * op})`);
      sg.addColorStop(0.42, `rgba(70,28,6,${0.75 * op})`);
      sg.addColorStop(0.62, `rgba(120,60,20,${0.35 * op})`);
      sg.addColorStop(1, 'rgba(120,60,20,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); // clip
    ctx.restore(); // rotate/scale

    // 6) 항성풍 — 광구의 회전·편평 변환 밖에서, 바깥으로 흘러나가는 별개의
    //    현상으로 그린다. 격렬한 O/B형과 잔잔한 M/K형의 실루엣이 확연히 갈린다.
    ctx.globalCompositeOperation = 'lighter';
    surf.visibleWind += (tier.wind - surf.visibleWind) * (1 - Math.exp(-2 * dt));
    const windCount = Math.ceil(surf.visibleWind);
    const maxDist = rp * 4.5;
    ctx.fillStyle = rgba(core, 1);
    for (let i = 0; i < windCount; i++) {
      const p = surf.wind[i] || (surf.wind[i] = {
        a: Math.random() * Math.PI * 2, dist: Math.random() * maxDist,
        speed: 0.7 + Math.random() * 0.6, size: 0.6 + Math.random() * 0.8,
      });
      p.dist += tier.windSpeed * p.speed * dt * (1 + instab * 0.5);
      p.dist %= maxDist; // 순간 리셋 대신 나머지 연산으로 끊김 없이 이어지는 흐름
      const fade = clamp(1 - p.dist / maxDist, 0, 1);
      const boundaryAlpha = (i < windCount - 1) ? 1 : clamp(surf.visibleWind - (windCount - 1), 0, 1);
      ctx.globalAlpha = 0.45 * fade * boundaryAlpha * blend;
      const d0 = rp + p.dist, d1 = d0 + 4 + p.size * 3;
      ctx.strokeStyle = rgba(core, 1);
      ctx.lineWidth = 0.6 + p.size * 0.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(p.a) * d0, Math.sin(p.a) * d0);
      ctx.lineTo(Math.cos(p.a) * d1, Math.sin(p.a) * d1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 7) 홍염(prominence) — 자기력선을 따라 가장자리에서 솟았다 가라앉는 고리.
    surf.flareTimer -= dt;
    if (surf.flareTimer <= 0) {
      const [lo, hi] = tier.flareEvery;
      surf.flareTimer = (lo + Math.random() * (hi - lo)) / (1 + instab * 2);
      surf.flares.push({ a: Math.random() * Math.PI * 2, t: 0, dur: 1.1 + Math.random() * 0.8, size: tier.flareSize, span: 0.12 + Math.random() * 0.14 });
    }
    for (let i = surf.flares.length - 1; i >= 0; i--) {
      const f = surf.flares[i];
      f.t += dt;
      if (f.t >= f.dur) { surf.flares.splice(i, 1); continue; }
      const p = f.t / f.dur;
      const rise = Math.sin(p * Math.PI);
      const span = f.span || 0.18;
      const h = rp * (1 + f.size * 0.55 * Math.sqrt(p) + 0.05);
      const a0 = f.a - span, a1 = f.a + span;
      ctx.globalAlpha = rise * 0.85 * blend;
      ctx.strokeStyle = rgba(mixRgb(base, [255, 150, 110], 0.45), 1);
      ctx.lineWidth = Math.max(1.2, rp * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * rp * 0.98, Math.sin(a0) * rp * 0.98);
      ctx.bezierCurveTo(Math.cos(a0) * h * 1.15, Math.sin(a0) * h * 1.15, Math.cos(a1) * h * 1.15, Math.sin(a1) * h * 1.15, Math.cos(a1) * rp * 0.98, Math.sin(a1) * rp * 0.98);
      ctx.stroke();
      // 분출 순간의 밝은 섬광
      const fl = clamp(1 - p * 3, 0, 1);
      if (fl > 0) {
        const fx = Math.cos(f.a) * rp, fy = Math.sin(f.a) * rp;
        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, rp * 0.4 * f.size);
        fg.addColorStop(0, `rgba(255,255,255,${0.9 * fl * blend})`);
        fg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(fx, fy, rp * 0.4 * f.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    return { x, y, r: rp };
  };
})();
