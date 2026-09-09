/* 플레이어 별 / 동반성 별 그리기 (starSurface의 drawStarBody를 실제 좌표에 적용) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const clamp = G.clamp;
  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

  // 별의 "평소 자리"는 더 이상 고정된 한 점이 아니다 — 부피(반지름)가 기준치를
  // 넘어서면 우측 가장자리가 화면의 한 지점(rightEdgeTarget)에 고정되도록 중심을
  // 왼쪽으로 밀어낸다. 그래서 별이 커질수록 화면 왼쪽으로 계속 밀려나 결국
  // 화면 밖까지 나가고, 화면에는 커브(가장자리) 일부만 보이게 된다.
  function restingX(R: RenderAPI, volume: number): number {
    const normalX = R.W * G.STAR_REST_X_FRACTION;
    const oversizeThresholdR = 45;
    const rightEdgeTarget = normalX + oversizeThresholdR;
    const r = Gp._renderStarRadius(volume);
    return Math.min(normalX, rightEdgeTarget - r);
  }

  // centerT: 사망 연출 중 별이 평소 자리에서 화면 중앙(0.5, 0.5)으로 이동하는
  // 진행도(0~1). panT: 성운 응축 인트로에서 화면 중앙(0.5, 0.55)에 형성된 별이
  // 카메라 팬을 따라 평소 자리로 이동하는 진행도(0~1, 기본값 1=이미 도착).
  // 평소 플레이 중엔 둘 다 생략되어 크기에 따른 평소 자리를 그대로 쓴다.
  // 핵융합이 붙기 전(운석~갈색왜성급 원시체)에는 항성 표면 시뮬레이션
  // 대신 광채 없는 어두운 암석질 구체를 그린다 — 아직 "빛나는 별"이 아니라는
  // 것을 시각적으로도 분명히 한다. 점화 순간 drawStarBody로 자연스럽게 전환된다.
  // 암석형(지구형) 몸체: 고체 표면이라 충돌 크레이터가 남고, 자전하면 그
  // 지형이 통째로 함께 돈다. 무광 규산염 지각 색.
  function drawRockyBody(x: number, y: number, r: number, angle: number): void {
    const ctx: CanvasRenderingContext2D = Gp._renderCtx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#5a5147';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // 크레이터처럼 보이는 어두운 반점 몇 개(고정된 각도라 자전하며 함께 돈다)
    ctx.fillStyle = 'rgba(30,26,22,0.55)';
    const spots = [[0.35, 0.1, 0.32], [-0.4, -0.25, 0.22], [0.05, -0.5, 0.18]];
    for (const [sx, sy, sr] of spots) {
      ctx.beginPath(); ctx.arc(sx * r, sy * r, sr * r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // 명암 경계(터미네이터) — 고체 구가 한쪽에서만 빛을 받는 느낌을 줘
    // "단단한 표면"이라는 인상을 강화한다. 자전과 무관하게 광원은 고정.
    ctx.save();
    ctx.translate(x, y);
    const shade = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    shade.addColorStop(0, 'rgba(190,180,160,0.20)');
    shade.addColorStop(0.55, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(10,8,6,0.55)');
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // 아주 옅은 테두리 하이라이트 — 완전히 새까맣지만은 않게(근처 별빛 반사 느낌)
    ctx.strokeStyle = 'rgba(180,170,150,0.25)';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // 목성형(가스형) 몸체: 고체 표면이 없어 크레이터가 남지 않는다. 대신
  //  - 빠른 자전 + 코리올리 효과로 위도별 제트류가 생겨 적도와 나란한
  //    밝은 대(zone)/어두운 띠(belt)의 가로 줄무늬가 된다,
  //  - 그 자전 때문에 적도가 부풀어 눈에 띄게 편평해진다(목성 편평도 ≈ 6.5%,
  //    토성 ≈ 9.8% — 여기선 그 사이인 8%를 쓴다),
  //  - 띠 사이에 대적점 같은 거대 폭풍 소용돌이가 얹혀 자전을 따라 흐른다.
  // 줄무늬는 위도에 묶여 있으므로 몸체를 통째로 회전시키지 않고, 폭풍이
  // 가로로 흘러가는 것으로 자전을 표현한다.
  const GAS_BANDS: [number, number, string][] = [
    // [띠 중심(적도=0, 극=±1), 반높이, 색]
    [-0.86, 0.16, '#9d7546'], // 북극 후드(어두움)
    [-0.58, 0.14, '#e2c69c'], // 온대 zone
    [-0.33, 0.11, '#a5763f'], // 북적도 belt
    [-0.04, 0.17, '#f0dcb4'], // 적도 zone(가장 밝음)
    [0.24, 0.11, '#a5763f'],  // 남적도 belt
    [0.50, 0.13, '#dcbb8d'],  // 온대 zone
    [0.80, 0.18, '#9d7546'],  // 남극 후드
  ];

  function drawGasGiantBody(x: number, y: number, r: number, angle: number): void {
    const ctx: CanvasRenderingContext2D = Gp._renderCtx;
    const flattening = 0.08;
    const ry = r * (1 - flattening);
    ctx.save();
    ctx.translate(x, y);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    // 기본 대기(암모니아 구름) 바탕
    ctx.fillStyle = '#c9a170';
    ctx.fillRect(-r, -ry, r * 2, ry * 2);

    // 위도별 줄무늬
    for (const [center, half, color] of GAS_BANDS) {
      ctx.fillStyle = color;
      ctx.fillRect(-r, (center - half) * ry, r * 2, half * 2 * ry);
    }

    // 대적점 — 자전을 따라 가로로 흐르고, 가장자리(가려지는 쪽)에서 흐려진다
    const wrap = ((angle * 0.16) % 2 + 2) % 2 - 1; // -1..1 순환
    const sx = wrap * r;
    const edgeFade = clamp(1 - Math.abs(wrap) * 1.15, 0, 1);
    if (edgeFade > 0.01) {
      ctx.globalAlpha = edgeFade;
      ctx.fillStyle = '#c05a34';
      ctx.beginPath();
      ctx.ellipse(sx, ry * 0.26, r * 0.24, ry * 0.10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(240,150,110,0.55)';
      ctx.beginPath();
      ctx.ellipse(sx, ry * 0.26, r * 0.13, ry * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 주변부 감광(limb darkening) + 반사 하이라이트 — 두꺼운 대기의 입체감
    const g = ctx.createRadialGradient(-r * 0.28, -ry * 0.32, r * 0.1, 0, 0, r * 1.02);
    g.addColorStop(0, 'rgba(255,244,220,0.20)');
    g.addColorStop(0.58, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(24,14,6,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -ry, r * 2, ry * 2);
    ctx.restore();

    // 대기 가장자리의 옅은 산란 테두리 — 고체 표면이 아니라 기체라는 신호
    ctx.strokeStyle = 'rgba(255,225,180,0.28)';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.98, ry * 0.98, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawProtoBody(x: number, y: number, volume: number, angle: number, isGasGiant: boolean): StarActorPoint {
    const r = Math.max(6, Gp._renderStarRadius(volume) * 0.55);
    if (isGasGiant) drawGasGiantBody(x, y, r, angle);
    else drawRockyBody(x, y, r, angle);
    return { x, y, r };
  }

  Gp._renderDrawPlayerStar = function (this: RenderAPI, dt?: number, centerT?: number, panT?: number): StarActorPoint {
    const state = G.state;
    const ct = centerT == null ? 0 : centerT;
    const pt = panT == null ? 1 : panT;
    const restX = restingX(this, state.volume);
    const baseX = lerp(this.W * 0.5, restX, pt);
    const x = lerp(baseX, this.W * 0.5, ct);
    const y = lerp(this.H * 0.55, this.H * 0.5, ct);
    if (!state.hasFusion) {
      // 암석형이냐 가스형이냐는 단면도(vitalsPanel)와 같은 판정을 그대로 쓴다.
      const isGasGiant = G.Stage.bodyStageKey(state) === 'gasGiant';
      return drawProtoBody(x, y, state.volume, this.starAngle, isGasGiant);
    }
    const fuelFrac = clamp(state.fuel / G.FUEL_MAX, 0, 1);
    // 점화 직후엔 0에서 1로 서서히 오르는 값 — drawStarBody가 이 값만큼
    // 원시체 질감을 겹쳐 그리고 색/글로우를 밝혀 "빛이 차오르는" 느낌을 낸다.
    const ignitionBlend = Gp._ignitionBlend ? Gp._ignitionBlend.v : 1;
    return Gp._renderDrawStarBody(x, y, state.mass, state.volume, fuelFrac, this.starAngle, 'player', dt, ignitionBlend);
  };

  // 케플러 제3법칙의 정성적 반영: 두 별의 합산 질량(=중력)이 클수록, 그리고
  // 스펙트럼형이 뜨겁고 격렬한 단계(starClass의 pulse)일수록 더 빠르게 공전한다.
  // 질량이 태양질량 단위(대략 0.1~50)로 축소된 만큼, 시각적 스케일 상수도
  // 함께 재조정한다 — 실제 값 자체(0.1~50)는 그대로 물리 계산(스펙트럼형,
  // 케플러 질량합)에 쓰고, 화면상 반지름/공전 반경 같은 "그림 크기"만
  // 별도 배율로 늘려 예전과 비슷한 시각적 존재감을 유지한다.
  function companionOrbitSpeed(m1: number, m2: number): number {
    const tierBoost = (Gp._renderStarClass(m1).pulse + Gp._renderStarClass(m2).pulse) / 2;
    const massFactor = Math.sqrt((m1 + m2) / 20);
    return clamp(massFactor * tierBoost * 0.4, 0.3, 2.4);
  }

  Gp._renderDrawCompanionStar = function (this: RenderAPI, dt?: number): StarActorPoint {
    const state = G.state;
    const px = this.W * 0.28, py = this.H * 0.55;
    const m1 = clamp(state.mass, 0.1, 60), m2 = clamp(state.companionMass, 0.1, 60);
    const orbitR = 90 + m1 * 1.2;
    this.companionOrbitAngle += (dt == null ? 0.016 : dt) * companionOrbitSpeed(m1, m2);
    const angle = this.companionOrbitAngle;
    const x = px + Math.cos(angle) * orbitR;
    const y = py + Math.sin(angle) * orbitR * 0.4;
    const fuelFrac = clamp(state.companionFuel / G.FUEL_MAX, 0, 1);
    const volume = clamp(20 + state.companionMass * 3, 6, 160);
    return Gp._renderDrawStarBody(x, y, state.companionMass, volume, fuelFrac, -angle * 1.3, 'companion', dt);
  };
})();
