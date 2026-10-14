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
    const oversizeThresholdR = 45 * (Gp._renderViewScale || 1);
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
  // 지형이 통째로 함께 돈다. 목성형(가스형) 몸체: 고체 표면이 없어 크레이터가
  // 없는 대신, 빠른 자전 + 코리올리 효과로 위도별 제트류가 적도와 나란한 밝은
  // 대/어두운 띠를 만들고, 그 자전 때문에 적도가 부풀어 편평해진다(목성 ≈ 6.5%,
  // 토성 ≈ 9.8% — 여기선 8%). 둘 다 bodyTexture.ts가 경위도 표면 지도를 구에
  // 투영해 그리므로, 크레이터와 대적점이 실제로 가장자리 너머로 돌아 넘어간다.
  function drawRockyBody(x: number, y: number, r: number, angle: number): void {
    Gp._renderDrawTexturedSphere(Gp._renderCtx, 'rocky', x, y, r, angle * 0.35, 0);
  }

  function drawGasGiantBody(x: number, y: number, r: number, angle: number): void {
    Gp._renderDrawTexturedSphere(Gp._renderCtx, 'gasGiant', x, y, r, angle * 0.3, 0.08);
  }

  function drawProtoBody(x: number, y: number, volume: number, angle: number, isGasGiant: boolean): StarActorPoint {
    const r = Math.max(6, Gp._renderStarRadius(volume) * G.PROTO_BODY_SCALE);
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
    const orbitR = (90 + m1 * 1.2) * (Gp._renderViewScale || 1);
    this.companionOrbitAngle += (dt == null ? 0.016 : dt) * companionOrbitSpeed(m1, m2);
    const angle = this.companionOrbitAngle;
    const x = px + Math.cos(angle) * orbitR;
    const y = py + Math.sin(angle) * orbitR * 0.4;
    const fuelFrac = clamp(state.companionFuel / G.FUEL_MAX, 0, 1);
    const volume = clamp(20 + state.companionMass * 3, 6, 160);
    return Gp._renderDrawStarBody(x, y, state.companionMass, volume, fuelFrac, -angle * 1.3, 'companion', dt);
  };
})();
