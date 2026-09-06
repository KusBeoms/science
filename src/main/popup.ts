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

  // 캔버스 내부 픽셀 버퍼를 실제 CSS 표시 크기와 1:1로 맞춰
  // 브라우저의 비율 다른 스트레칭(원이 타원으로 찌그러지는 문제)을 방지한다.
  function sizeCanvasToDisplay(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }

  function renderBadges(container: HTMLElement, vis: ChoiceVis) {
    const badges = G.ChoiceAnim.badgesFor(vis);
    container.innerHTML = badges.map((b) => {
      const arrow = b.dir > 0 ? '<span class="arrow up">▲</span>'
        : b.dir < 0 ? '<span class="arrow down">▼</span>' : '';
      return `<span class="badge"><span class="glyph">${b.glyph}</span>${arrow}</span>`;
    }).join('');
  }

  function runChoiceAnim(now: number) {
    const t = (now - RT.choiceAnimStartT) / 1000;
    G.ChoiceAnim.draw(animCtxW, animCanvasW.width, animCanvasW.height, t, RT.currentEvent.w.vis);
    G.ChoiceAnim.draw(animCtxS, animCanvasS.width, animCanvasS.height, t, RT.currentEvent.s.vis);
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
    sizeCanvasToDisplay(animCanvasW);
    sizeCanvasToDisplay(animCanvasS);
    A.playTone(660, 0.15, 'sine', 0.15);
    RT.choiceAnimStartT = performance.now();
    RT.choiceAnimRAF = requestAnimationFrame(runChoiceAnim);
  };

  Gp._popupCloseEvent = function () {
    popupEl.classList.remove('show');
    state.eventOpen = false; RT.currentEvent = null;
    state.nextEventAt = state.ageYears + 6 + Math.random() * 6;
    if (RT.choiceAnimRAF) { cancelAnimationFrame(RT.choiceAnimRAF); RT.choiceAnimRAF = null; }
  };

  Gp._popupResolveEvent = function (key: 'W' | 'S' | null) {
    if (!RT.currentEvent) return;
    const e: EventDef = RT.currentEvent;
    if (e.once) state.usedOnce.add(e.id);
    state.lastEventId = e.id;
    let riskTier = 0;
    if (key === 'W') { e.w.apply(state); riskTier = e.w.riskTier; A.playTone(520, 0.18, 'triangle', 0.18); }
    else if (key === 'S') { e.s.apply(state); riskTier = e.s.riskTier; A.playTone(340, 0.18, 'triangle', 0.18); }
    else {
      // timeout: blended weak penalty
      state.fuel -= 6;
      riskTier = 0;
    }
    state.choiceLog.push({ id: e.id, key, riskTier });
    state.mass = clamp(state.mass, 6, 160);
    state.volume = clamp(state.volume, 6, 160);
    Gp._popupCloseEvent();
  };

  window.addEventListener('resize', () => {
    if (state.eventOpen) {
      sizeCanvasToDisplay(animCanvasW);
      sizeCanvasToDisplay(animCanvasS);
    }
  });
  evBtnW.addEventListener('click', () => Gp._popupResolveEvent('W'));
  evBtnS.addEventListener('click', () => Gp._popupResolveEvent('S'));
  window.addEventListener('keydown', (ev) => {
    if (!state.started || state.gameOver) return;
    const k = ev.key.toLowerCase();
    if (!state.eventOpen) return;
    if (k === 'w') Gp._popupResolveEvent('W');
    else if (k === 's') Gp._popupResolveEvent('S');
  });
})();
