/* 성운 응축 인트로: 프리셋 선택으로 게임 시작 + 강착원반 스타일 낙하 파티클 연출 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const RT = Gp._runtime;
  const state = G.state;
  const clamp = G.clamp;
  const A = G.Audio;
  const R = G.Render;

  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

  const startOverlay = document.getElementById('startOverlay')!;

  // 응축이 끝난 뒤 카메라가 오른쪽으로 팬하며(=별이 왼쪽 제자리로 이동) 진행되는 시간
  const INTRO_PAN_DUR = 0.8;

  // 성운의 "밀도"는 질량을 부피로 나눈 값으로 정의한다 — 프리셋 자체가 질량은
  // 크고 부피는 작을수록(고밀도), 질량은 작고 부피는 클수록(희박) 설계되어
  // 있어서, mass만 볼 때보다 mass/volume 비율을 볼 때 프리셋 간 격차가
  // 훨씬 크게(약 13배) 벌어진다. 표준 성운(mass 1, volume 20)의 밀도를
  // 기준(=1)으로 정규화한다.
  function nebulaDensityFactor(): number {
    const density = state.mass / Math.max(state.volume, 1);
    const standardDensity = 1 / 20;
    return clamp(density / standardDensity, 0.15, 5);
  }

  Gp._introBeginGame = function (presetId?: string) {
    G.applyPreset(presetId || 'standard');
    A.init();
    A.playMusic('ingame');
    startOverlay.style.display = 'none';
    document.body.classList.add('inGame');
    G.Run.reset();
    RT.introParticles = [];
    const density = nebulaDensityFactor();
    const densitySqrt = Math.sqrt(density);
    // 입자 수: 밀도가 높을수록 훨씬 자욱하게, 낮을수록 훨씬 성기게.
    const n = Math.round(clamp(50 + 110 * densitySqrt, 40, 320));
    // 퍼짐 반경: 밀도가 높을수록 좁고 조밀한 구름으로, 낮을수록 화면에
    // 넓게 흩어진 옅은 원반으로 — 입자 수보다 시각적으로 훨씬 뚜렷한
    // "밀도" 차이를 만든다.
    const spreadFactor = clamp(1 / densitySqrt, 0.45, 2.4);
    // 입자 크기: 밀도가 높을수록 뭉친 티끌처럼 굵게, 낮을수록 미세한 먼지처럼 가늘게.
    const sizeFactor = clamp(densitySqrt, 0.55, 1.8);
    const finalR = R.starRadius(state.volume); // drawStarBody와 동일한 반지름 공식(팝인 방지)
    RT.introSpinDir = Math.random() < 0.5 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const a0 = Math.random() * Math.PI * 2;
      const r0 = finalR + 90 * spreadFactor + Math.random() * 260 * spreadFactor;
      RT.introParticles.push({ a: a0, r0, size: (1 + Math.random() * 1.4) * sizeFactor, delay: Math.random() * 0.25 });
    }
    RT.introT = 0; RT.introPanT = 0; RT.introPlaying = true;
  };

  document.querySelectorAll<HTMLElement>('#presetRow .presetCard').forEach((card) => {
    card.addEventListener('click', () => Gp._introBeginGame(card.dataset.preset));
  });

  // 매 프레임 인트로 연출을 그리고, 끝나면 state.started=true로 전환한다.
  // 성운은 항상 화면 중앙(cx=W*0.5)에서 응축되고, 응축이 끝난 뒤에야 카메라가
  // 오른쪽으로 팬하는 것처럼 배경 별이 흘러가며 갓 태어난 별도 함께 실제
  // 플레이 위치(왼쪽)로 이동한다.
  Gp._introTick = function (dt: number) {
    const ctx = R.ctx, W = R.W, H = R.H;
    RT.introT += dt;
    const p = clamp(RT.introT / RT.introDur, 0, 1);
    const cx = W * 0.5, cy = H * 0.55;
    const finalR = R.starRadius(state.volume); // drawStarBody와 동일 공식

    // p<1 구간에서만 낙하 입자/응축 코어/점화 플래시를 직접 그린다. p>=1 이후에는
    // 실제 별 렌더링(drawPlayerStar)이 완전히 그 역할을 이어받는데, 이 블록을
    // p>=1에서도 계속 그리면 코어(고정된 중앙 원)와 실제 별(팬을 따라 옆으로
    // 이동하는 원)이 동시에 보여 "별이 두 개"로 보이는 버그가 생긴다.
    if (p < 1) {
      // 밀도가 높을수록 티끌 하나하나도 더 진하고 밝게 — 입자 수/퍼짐 반경 차이에
      // 더해 색 자체의 존재감도 밀도에 따라 갈리게 한다.
      const glow = clamp(Math.sqrt(nebulaDensityFactor()), 0.7, 1.4);
      for (const pt of RT.introParticles) {
        // 입자마다 낙하 시작 시점이 조금씩 달라 유기적으로 보이게 함
        const lp = clamp((p - pt.delay) / (1 - pt.delay), 0, 1);
        const ease = lp * lp * lp; // 중력 가속: 초반엔 느리게 표류, 후반엔 급격히 빨려듦
        const r = lerp(pt.r0, finalR * 0.25, ease);
        // 각운동량 보존 근사: 반지름이 줄수록 공전 각속도가 커져 강착원반처럼 휘돈다
        pt.a += RT.introSpinDir * dt * (0.35 + 5 / (r * r * 0.01 + 1));
        const x = cx + Math.cos(pt.a) * r, y = cy + Math.sin(pt.a) * r * 0.72;
        // 낙하하며 차가운 성간먼지 색 → 뜨거운 백/주황으로 가열되는 색 전이
        const heat = clamp(ease * 1.3, 0, 1);
        const cr = Math.round(130 + (255 - 130) * heat), cg = Math.round(145 + (235 - 145) * heat), cb = Math.round(190 + (200 - 190) * heat);
        const alpha = clamp((0.22 + 0.65 * heat) * glow, 0, 1);
        const trailA = pt.a - RT.introSpinDir * heat * 0.16;
        const txp = cx + Math.cos(trailA) * r, typ = cy + Math.sin(trailA) * r * 0.72;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.55})`;
        ctx.lineWidth = pt.size * 0.8;
        ctx.beginPath(); ctx.moveTo(txp, typ); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx.beginPath(); ctx.arc(x, y, pt.size, 0, Math.PI * 2); ctx.fill();
      }
      // 중심 코어가 서서히 뭉쳐지며 자라남 (즉시 팝인 대신 점진적 응축).
      // 이 시점의 질량은 아직 핵융합 점화 질량(0.08 M☉)에 한참 못 미치는
      // 운석/원시체 수준이라, massColor(항성 스펙트럼형 색)가 아니라 흐릿한
      // 암갈색 톤으로 뭉쳐 "아직 별이 아님"을 인트로에서부터 암시한다.
      const coreGrow = clamp((p - 0.15) / 0.85, 0, 1);
      if (coreGrow > 0) {
        const col = '#6b5f52';
        ctx.globalAlpha = 0.85 * coreGrow;
        ctx.fillStyle = col;
        ctx.shadowColor = col; ctx.shadowBlur = 4 + 8 * coreGrow;
        ctx.beginPath(); ctx.arc(cx, cy, finalR * coreGrow, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      // 막바지 응축 완료 플래시 (확장하며 사라지는 옅은 링) — 핵융합 점화가
      // 아니라 단순히 "뭉침이 끝났다"는 신호라 은은하게만 표시한다.
      if (p > 0.9) {
        const fp = clamp((p - 0.9) / 0.1, 0, 1);
        ctx.strokeStyle = `rgba(210,195,175,${(1 - fp) * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, finalR * (1 + fp * 2.2), 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (p >= 1) {
      RT.introPanT += dt;
      const panP = clamp(RT.introPanT / INTRO_PAN_DUR, 0, 1);
      // 부드러운 S자 커브(smoothstep) — 양끝(시작/도착)에서 속도가 0에 가까워
      // 갑자기 훅 튀어나가거나 뚝 멈추는 느낌 없이 자연스럽게 가속·감속된다.
      const panEase = panP * panP * (3 - 2 * panP);
      // 실제 게임 별 렌더링과 동일해 종료 시 크기/모양 점프 없음. panEase가 0→1로
      // 진행되며 화면 중앙에서 형성된 별이 실제 플레이 위치로 미끄러져 이동한다.
      R.drawPlayerStar(dt, undefined, panEase);
      // 배경 스크롤은 loop.ts가 담당한다 — 팬 구간부터 실제 게임과 완전히
      // 같은 속도식으로 흘러, 팬이 끝나는 순간 속도가 뚝 끊기는 불연속이 없다.
      if (panP >= 1) {
        RT.introPlaying = false; state.started = true;
      }
    }
  };
})();
