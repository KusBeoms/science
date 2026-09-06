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

  Gp._introBeginGame = function (presetId?: string) {
    G.applyPreset(presetId || 'standard');
    A.init();
    A.playMusic('ingame');
    startOverlay.style.display = 'none';
    RT.introParticles = [];
    const n = 140;
    const finalR = 14 + clamp(state.volume, 6, 160) * 0.55; // drawStarBody와 동일한 반지름 공식(팝인 방지)
    RT.introSpinDir = Math.random() < 0.5 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const a0 = Math.random() * Math.PI * 2;
      const r0 = finalR + 90 + Math.random() * 260;
      RT.introParticles.push({ a: a0, r0, size: 1 + Math.random() * 1.4, delay: Math.random() * 0.25 });
    }
    RT.introT = 0; RT.introPlaying = true;
  };

  document.querySelectorAll<HTMLElement>('#presetRow .presetCard').forEach((card) => {
    card.addEventListener('click', () => Gp._introBeginGame(card.dataset.preset));
  });

  // 매 프레임 인트로 연출을 그리고, 끝나면 state.started=true로 전환한다.
  Gp._introTick = function (dt: number) {
    const ctx = R.ctx, W = R.W, H = R.H;
    RT.introT += dt;
    const p = clamp(RT.introT / RT.introDur, 0, 1);
    const cx = W * 0.28, cy = H * 0.55;
    const finalR = 14 + clamp(state.volume, 6, 160) * 0.55; // drawStarBody와 동일 공식
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
      const alpha = 0.22 + 0.65 * heat;
      const trailA = pt.a - RT.introSpinDir * heat * 0.16;
      const txp = cx + Math.cos(trailA) * r, typ = cy + Math.sin(trailA) * r * 0.72;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.55})`;
      ctx.lineWidth = pt.size * 0.8;
      ctx.beginPath(); ctx.moveTo(txp, typ); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    // 중심 코어가 서서히 밝아지며 자라남 (즉시 팝인 대신 점진적 응축)
    const coreGrow = clamp((p - 0.15) / 0.85, 0, 1);
    if (coreGrow > 0) {
      const col = R.massColor(state.mass);
      ctx.globalAlpha = 0.85 * coreGrow;
      ctx.fillStyle = col;
      ctx.shadowColor = col; ctx.shadowBlur = 10 + 25 * coreGrow;
      ctx.beginPath(); ctx.arc(cx, cy, finalR * coreGrow, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    // 막바지 점화 플래시 (확장하며 사라지는 링)
    if (p > 0.9) {
      const fp = clamp((p - 0.9) / 0.1, 0, 1);
      ctx.strokeStyle = `rgba(255,255,255,${(1 - fp) * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, finalR * (1 + fp * 2.2), 0, Math.PI * 2); ctx.stroke();
    }
    if (p >= 1) {
      R.drawPlayerStar(dt); // 실제 게임 별 렌더링과 동일해 종료 시 크기/모양 점프 없음
    }
    if (p >= 1 && RT.introT > RT.introDur + 0.3) {
      RT.introPlaying = false; state.started = true; state.nextEventAt = state.ageYears + 5;
    }
  };
})();
