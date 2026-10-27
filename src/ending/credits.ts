/* 엔딩 크레딧 화면 구성 + 재시작 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  // 이번 판에 실제로 태운 원소 사슬. 그 별의 질량이 태울 수 있었던 전체
  // 사슬을 함께 보여줘서, "어디까지 갈 수 있었고 어디서 멈췄는지"가 같이 읽히게 한다.
  function buildFusionHtml(state: GameState): string {
    const stages: FusionStageInfo[] = G.Stage.FUSION_STAGES;
    const reached = state.maxFusionIndex;
    if (reached < 0) {
      return `<div class="sectionTitle">핵융합</div>` +
        `<div class="fusionChain"><span class="fusionStep none">점화하지 못함</span></div>`;
    }
    // 7단계 전체를 늘어놓고 태운 곳까지만 밝힌다 — 몇 단계를 태웠는지와
    // 동시에 "그 위로 무엇이 남아 있었는지"가 함께 읽힌다.
    const cells = stages.map((st, i) => {
      const done = i <= reached;
      return `<span class="fusionStep${done ? ' done' : ''}"` +
        (done ? ` style="border-color:${st.color};color:${st.color}"` : '') +
        `>${st.name}</span>`;
    });
    return `<div class="sectionTitle">도달한 핵융합 단계</div>` +
      `<div class="fusionChain">${cells.join('<span class="fusionArrow">›</span>')}</div>` +
      `<div class="fusionNote">${stages[reached].name}까지 · 전체 ${stages.length}단계 중 ` +
      `<span>${reached + 1}단계</span></div>`;
  }

  Gp._endingBuildCredits = function () {
    const state = G.state;
    const type = state.endingType!;
    const arch: ArchetypeInfo = Gp._endingComputeArchetype();
    const distStr = state.distanceLy.toFixed(1);
    const ageStr = G.formatYears(state.ageYears);
    const rate = state.pressCount / Math.max(1, state.playTime);
    const companionStr = state.hasCompanion
      ? (state.companionAlive ? "생존 (동반성과 함께)" : "먼저 사망")
      : "없음";
    const flavor: string = Gp._endingFlavor[type].replace('{distance}', distStr).replace('{age}', ageStr);
    const finalLine = `너는 ${Gp._endingClause[type]}, ${arch.title}였다.`;

    const root = document.getElementById('creditsScroll')!;
    root.innerHTML =
      `<h1>${Gp._endingNames[type]}</h1>` +
      `<div class="sub">THE LIFE OF A STAR</div>` +
      `<div class="statBlock">` +
      `총 이동거리 &nbsp;<span>${distStr} 광년</span><br>` +
      `총 생존 연수 &nbsp;<span>${ageStr}</span><br>` +
      `최종 질량 &nbsp;<span>${G.Run.massLabel(state.mass)}</span> · 최종 부피 &nbsp;<span>${state.volume.toFixed(0)}</span><br>` +
      `전진 &nbsp;<span>${state.steps}걸음</span> · 최고 기록 &nbsp;<span>${G.Run.best.steps}걸음</span>${G.Run.newRecord ? ' &nbsp;<span>★ 신기록!</span>' : ''}<br>` +
      `최대 질량 &nbsp;<span>${G.Run.massLabel(state.peakMass)}</span> · 최고 기록 &nbsp;<span>${G.Run.massLabel(G.Run.best.mass)}</span><br>` +
      `운석 충돌 &nbsp;<span>${state.meteorHits}번</span><br>` +
      `받은 효과 &nbsp;<span>${state.effectLog.length}개</span> · 삼킨 성운 &nbsp;<span>${state.absorbedClouds}개</span><br>` +
      `누적 중력 &nbsp;<span>×${state.gravity.toFixed(2)}</span><br>` +
      `동반성 &nbsp;<span>${companionStr}</span><br>` +
      `키 입력 &nbsp;<span>${state.pressCount}번 (초당 ${rate.toFixed(1)}회)</span>` +
      `</div>` +
      buildFusionHtml(state) +
      Gp._endingBuildTimelineHtml(state.effectLog) +
      `<div class="sectionTitle">우주에 생긴 일</div>` +
      `<div class="flavor">${flavor}</div>` +
      `<div class="sectionTitle">성격 유형 분석</div>` +
      `<div class="archTitle">${arch.title}</div>` +
      `<div class="archDesc">${arch.desc}</div>` +
      `<div class="finalLine">"${finalLine}"</div>`;

    // THE END와 다시 시작 버튼은 스크롤되는 본문 밖에 따로 둔다. 예전엔
    // 본문 끝에 붙어 있어서 크레딧과 함께 위로 흘러가 버렸고, 버튼이 화면
    // 밖으로 나가면 다시 시작할 방법이 없었다. 이제 화면 중앙에 고정되고,
    // 본문 스크롤이 끝날 즈음 서서히 나타난다.
    const endEl = document.getElementById('creditsEnd')!;
    endEl.innerHTML =
      `<div class="theEnd">THE END</div>` +
      `<button id="restartBtn">다시 시작</button>`;
    endEl.classList.remove('show');
    document.getElementById('restartBtn')!.addEventListener('click', () => Gp._endingRestart());
    root.addEventListener('animationend', () => endEl.classList.add('show'), { once: true });
    // 스크롤 애니메이션이 어떤 이유로 끝나지 않아도 버튼은 반드시 나타나야 한다.
    clearTimeout(Gp._creditsEndTimer);
    Gp._creditsEndTimer = setTimeout(() => endEl.classList.add('show'), 46000);

    document.getElementById('credits')!.classList.add('show');
    G.Audio.playMusic('end');
  };

  Gp._endingRestart = function () {
    clearTimeout(Gp._creditsEndTimer);
    document.getElementById('creditsEnd')!.classList.remove('show');
    document.getElementById('credits')!.classList.remove('show');
    G.Audio.stopMusic();
    G.resetState();
    G.Render.initStars();
    G.Render.resetSurfaces();
    G.Effects.reset(); G.Nebula.reset(); G.Run.reset(); G.Run.refreshBestUI();
    document.body.classList.remove('pressed');
    Gp._hudResetGauge();
    const RT = Gp._runtime;
    // 시간 도약 중에 끝났다면 연출·플래그가 새 판에 남지 않게 정리한다
    Gp._timeSkipToken++;
    RT.timeSkipping = false;
    document.getElementById('timeskip')!.classList.remove('show');
    RT.ignitionAgeRampT = 0;
    Gp._ignitionBlend = null;
    RT.endingPhase = 'idle'; RT.endingMoveT = 0; RT.endingHoldT = 0; RT.endingFadeT = 0;
    document.getElementById('startOverlay')!.style.display = 'flex';
    document.body.classList.remove('inGame');
  };
})();
