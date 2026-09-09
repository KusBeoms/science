/* 이벤트 팝업 UI: 열기/닫기/선택 처리, 미니 애니메이션 캔버스, 배지·캡션 표시 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const RT = Gp._runtime;
  const state = G.state;
  const clamp = G.clamp;
  const A = G.Audio;

  const popupEl = document.getElementById('eventPopup')!;
  const evTitle = document.getElementById('evTitle')!;
  const evDesc = document.getElementById('evDesc')!;
  const evBtnW = document.getElementById('evBtnW')!;
  const evBtnS = document.getElementById('evBtnS')!;
  const evTimerBar = document.getElementById('evTimerBar') as HTMLElement;
  const animCanvasW = document.getElementById('animW') as HTMLCanvasElement;
  const animCanvasS = document.getElementById('animS') as HTMLCanvasElement;
  const animCtxW = animCanvasW.getContext('2d')!;
  const animCtxS = animCanvasS.getContext('2d')!;
  const badgeW = document.getElementById('badgeW')!;
  const badgeS = document.getElementById('badgeS')!;
  const captionW = document.getElementById('captionW')!;
  const captionS = document.getElementById('captionS')!;

  // 캔버스 내부 픽셀 버퍼를 CSS 표시 크기 × devicePixelRatio로 맞춰
  // 비율 왜곡(원이 타원으로 찌그러짐)과 고해상도 화면에서의 흐릿함을 함께 막는다.
  // 좌표계는 setTransform으로 CSS 픽셀 단위를 유지하므로 그리기 코드는 그대로다.
  // 그리기 좌표는 CSS 픽셀 기준이므로 논리 크기를 따로 들고 있는다.
  const animSizeW = { w: 1, h: 1 };
  const animSizeS = { w: 1, h: 1 };

  function sizeCanvasToDisplay(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, out: { w: number; h: number }) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    out.w = w; out.h = h;
  }

  function renderBadges(container: HTMLElement, vis: ChoiceVis) {
    const badges = G.ChoiceAnim.badgesFor(vis);
    container.innerHTML = badges.map((b) => {
      const arrow = b.dir > 0 ? '<span class="arrow up">▲</span>'
        : b.dir < 0 ? '<span class="arrow down">▼</span>' : '';
      return `<span class="badge"><span class="glyph">${b.glyph}</span><span class="name">${b.name}</span>${arrow}</span>`;
    }).join('');
  }

  function runChoiceAnim(now: number) {
    const t = (now - RT.choiceAnimStartT) / 1000;
    G.ChoiceAnim.draw(animCtxW, animSizeW.w, animSizeW.h, t, RT.currentEvent.w.vis);
    G.ChoiceAnim.draw(animCtxS, animSizeS.w, animSizeS.h, t, RT.currentEvent.s.vis);
    RT.choiceAnimRAF = requestAnimationFrame(runChoiceAnim);
  }

  Gp._popupOpenEvent = function (e: EventDef) {
    RT.currentEvent = e; state.eventOpen = true; RT.evTimeLeft = RT.evDuration;
    evTitle.textContent = e.title; evDesc.textContent = e.desc;
    evBtnW.setAttribute('aria-label', e.w.label);
    evBtnS.setAttribute('aria-label', e.s.label);
    captionW.textContent = e.w.caption || '';
    captionS.textContent = e.s.caption || '';
    renderBadges(badgeW, e.w.vis);
    renderBadges(badgeS, e.s.vis);
    evTimerBar.style.transform = 'scaleX(1)';
    evTimerBar.style.background = '#7fa0ff';
    popupEl.classList.add('show');
    sizeCanvasToDisplay(animCanvasW, animCtxW, animSizeW);
    sizeCanvasToDisplay(animCanvasS, animCtxS, animSizeS);
    A.playTone(660, 0.15, 'sine', 0.15);
    RT.choiceAnimStartT = performance.now();
    RT.choiceAnimRAF = requestAnimationFrame(runChoiceAnim);
  };

  Gp._popupCloseEvent = function () {
    popupEl.classList.remove('show');
    state.eventOpen = false; RT.currentEvent = null;
    // 이동거리(distanceLy)는 질량과 무관하게 항상 0.1ly/실제초로 흐르므로,
    // 간격 1ly = 실제 10초다. 한 판을 2분 안팎으로 맞추기 위해 점화 전은
    // 3~4.5초(0.30~0.45ly), 점화 후는 3.5~5.5초(0.35~0.55ly)로 잡는다.
    // 점화 후 간격을 짧게 두는 건, 한 번에 질량이 3배까지만 변할 수 있으므로
    // (popup.ts의 200% 상한) 무거운 별을 노리려면 선택 기회 자체가 충분히
    // 많아야 하기 때문이다 — 초신성(8 M☉)·블랙홀(20 M☉)까지 가려면
    // 질량을 늘리는 선택을 5~6번 연달아 성공시켜야 한다.
    // (예전엔 ageYears를 썼지만, 지금은 질량에 따라 연 카운터 속도가
    // 수천 배까지 벌어져 실제 대기시간과 전혀 무관해졌다.)
    // 점화 전(형성기)에는 성운 밀도(accretionBoost)에 따라 만남의 빈도 자체가
    // 달라진다고 본다 — 배경 성장은 거의 없앴으므로(main/loop.ts), 프리셋별
    // "빨리/천천히 자란다"는 차이는 이제 이 이벤트 간격으로 표현된다.
    const gapLy = state.hasFusion
      ? 0.35 + Math.random() * 0.20
      : (0.30 + Math.random() * 0.15) / Math.sqrt(state.accretionBoost);
    state.nextEventAt = state.distanceLy + gapLy;
    if (RT.choiceAnimRAF) { cancelAnimationFrame(RT.choiceAnimRAF); RT.choiceAnimRAF = null; }
  };

  Gp._popupResolveEvent = function (key: 'A' | 'D' | null) {
    if (!RT.currentEvent) return;
    const e: EventDef = RT.currentEvent;
    if (e.once) state.usedOnce.add(e.id);
    state.lastEventId = e.id;
    // 질량 변화는 절대량이 아니라 "지금 질량 대비 비율"로만 일어나야 한다.
    // 그래야 지구질량급 원시체든 20 M☉ 항성이든 한 번의 선택이 똑같이
    // 의미 있게 느껴진다. 한 번에 바뀔 수 있는 폭은 현재 질량의 200%까지 —
    // 즉 최대 3배까지 늘고, 최소 1/3까지 줄어든다.
    const massBefore = state.mass;
    let riskTier = 0;
    if (key === 'A') { e.w.apply(state); riskTier = e.w.riskTier; A.playTone(520, 0.18, 'triangle', 0.18); }
    else if (key === 'D') { e.s.apply(state); riskTier = e.s.riskTier; A.playTone(340, 0.18, 'triangle', 0.18); }
    else {
      // timeout: 팝업이 열려 있는 동안에는 연료가 타지 않으므로(main/loop.ts),
      // 망설임의 대가를 여기서 한 번에 치른다 — 대략 4초치 연소량.
      state.fuel -= G.fuelBurnRate(state.mass) * 4;
      // 점화 전에는 연료가 0이 돼도 죽지 않는다(아직 태울 게 없으니 사망
      // 판정 자체가 핵융합 이후에만 걸린다). 그래서 형성기에 아무것도 고르지
      // 않으면 질량이 영영 늘지 않아 점화도 사망도 없는 무한 루프에 빠졌다.
      // 방치하더라도 원반 물질은 계속 떨어져 쌓이므로, 고른 것보다 훨씬 작은
      // 배율로나마 자라게 해 판이 반드시 끝나도록 한다.
      if (!state.hasFusion) state.mass *= 1.8;
      riskTier = 0;
    }
    state.choiceLog.push({ id: e.id, key, riskTier });
    // 0.05는 예전 태양질량 스케일용 하한이었다 — 지금은 지구질량급(~1e-6 M☉)
    // 에서 출발하므로 그 하한이 형성기 첫 이벤트만으로 점화 직전까지 강제로
    // 끌어올리는 버그가 됐다. 진짜 0/음수만 막는 훨씬 작은 하한으로 낮춘다.
    state.mass = clamp(state.mass, massBefore / 3, massBefore * 3);
    state.mass = clamp(state.mass, 1e-9, 200);
    // 부피는 순수 시각적 크기 스탯이지만, +부피 선택이 반복되면 무한정 커져
    // 화면을 완전히 덮어버린다 — 커진 티는 충분히 나면서 화면 안에 남는
    // 상한(200 ≈ 반지름 124px)을 둔다(starActors.ts의 oversize 처리 참고).
    state.volume = clamp(state.volume, 4, 200);
    Gp._popupCloseEvent();
  };

  window.addEventListener('resize', () => {
    if (state.eventOpen) {
      sizeCanvasToDisplay(animCanvasW, animCtxW, animSizeW);
      sizeCanvasToDisplay(animCanvasS, animCtxS, animSizeS);
    }
  });
  evBtnW.addEventListener('click', () => Gp._popupResolveEvent('A'));
  evBtnS.addEventListener('click', () => Gp._popupResolveEvent('D'));
  window.addEventListener('keydown', (ev) => {
    if (!state.started || state.gameOver) return;
    const k = ev.key.toLowerCase();
    if (!state.eventOpen) return;
    // 화면 배치 그대로 A=왼쪽 선택지, D=오른쪽 선택지.
    if (k === 'a') Gp._popupResolveEvent('A');
    else if (k === 'd') Gp._popupResolveEvent('D');
  });
})();
