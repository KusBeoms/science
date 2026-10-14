/* 연소 단계 질주(collapse rush): 연료가 한꺼번에 크게 깎여 단계를 건너뛰었거나,
   아직 그 질량이 가야 할 마지막 연소 단계에 닿지 못했는데 연료가 바닥난 경우
   (이벤트로 수소 연소 도중에 수명이 끝나는 "빨리 끝나는 판" 등), 건너뛴 단계를
   빠르게 차례로 밟는다. 연료가 바닥난 경우엔 그 뒤 결말로 넘어간다.

   실제 대질량 별도 중심핵의 수소가 떨어지면 거기서 멈추지 못한다 — 수축하며
   온도가 올라 헬륨 → 탄소 → 네온 → 산소 → 규소를 차례로 태우고, 규소가 타서
   철핵이 쌓이는 순간 붕괴한다. 각 단계는 앞 단계보다 훨씬 짧다(25 M☉ 기준
   헬륨 수십만 년 … 규소 하루). 그래서 여기서도 단계마다 시간을 기하급수적으로
   줄여, 뒤로 갈수록 가속하며 무너지는 느낌을 낸다.

   어디까지 가는지는 질량이 정한 경로(stageModel의 fusionStageCount)를 그대로
   따른다: 11 M☉ 이상은 철핵까지, 8~11 M☉는 네온(O-Ne-Mg 핵)까지, 0.5~8 M☉는
   헬륨까지. 도달한 단계는 maxFusionIndex에 기록되므로 결말 분기(branching.ts)와
   크레딧의 핵융합 사슬도 자동으로 맞는다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const A = G.Audio;

  const FIRST_STEP_DUR = 0.85; // 첫 단계(보통 헬륨)에 머무는 시간(초)
  const STEP_SHRINK = 0.7;     // 다음 단계는 이전의 70%
  const MIN_STEP_DUR = 0.22;
  const FINAL_HOLD = 0.9;      // 마지막 단계(철핵 등)를 보여준 뒤 결말까지

  const vitalsPanel = document.getElementById('vitalsPanel') as HTMLElement;

  function stepDur(k: number): number {
    return Math.max(MIN_STEP_DUR, FIRST_STEP_DUR * Math.pow(STEP_SHRINK, k));
  }

  function stageTick(k: number) {
    if (!A.actx) return;
    // 단계가 오를수록 음도 높아진다 — 가속하는 연쇄 반응
    A.playTone(196 * Math.pow(1.19, k), 0.18, 'triangle', 0.12);
  }

  function endRush(state: GameState) {
    state.collapseRush = null;
    state.forcedFusionIndex = -1;
    vitalsPanel.classList.remove('collapsing');
  }

  // 점화 후 매 프레임 호출된다. 이번 판에 도달한 연소 단계(maxFusionIndex)를
  // 기록하고, 단계가 한 번에 두 칸 이상 뛰거나(연료가 한꺼번에 크게 깎였을 때)
  // 마지막 단계 전에 연료가 끝나면 건너뛴 단계를 빠르게 차례로 보여준다.
  // 연료가 다 떨어졌고 마지막 단계까지 다 보여줬으면 true(=결말로 넘어갈 때).
  Gp._stageRushUpdate = function (dt: number): boolean {
    const state = G.state;
    const dead = state.fuel <= 0;
    // 연료 0은 연료 기준 판정에서 경로의 마지막 단계와 같으므로, 죽은 별의
    // 목표는 곧 질량이 허락하는 마지막 단계다.
    const natural = dead ? G.Stage.fusionStageCount(state.mass) - 1 : Gp._stageFuelIndex(state);
    let rush = state.collapseRush;
    if (!rush) {
      const shown = Math.max(0, state.maxFusionIndex);
      const skipped = dead ? natural > shown : natural > shown + 1;
      if (!skipped) {
        if (!dead) state.maxFusionIndex = Math.max(state.maxFusionIndex, natural);
        return dead;
      }
      rush = state.collapseRush = { index: shown, target: natural, t: 0, step: 0 };
      state.forcedFusionIndex = shown;
      vitalsPanel.classList.add('collapsing');
    }
    // 질주 도중에 연료가 마저 바닥나면 목표가 경로의 끝까지 늘어난다.
    rush.target = Math.max(rush.target, natural);
    if (dead) state.fuel = 0;
    rush.t += dt;
    if (rush.index < rush.target) {
      if (rush.t >= stepDur(rush.step)) {
        rush.t = 0;
        rush.index++;
        rush.step++;
        state.forcedFusionIndex = rush.index;
        state.maxFusionIndex = Math.max(state.maxFusionIndex, rush.index);
        stageTick(rush.step);
      }
      return false;
    }
    // 살아 있는 별은 따라잡는 즉시 평소 판정(연료 잔량)으로 돌아간다.
    if (!dead) { endRush(state); return false; }
    if (rush.t < FINAL_HOLD) return false;
    endRush(state);
    return true;
  };

  Gp._collapseRushReset = function () {
    vitalsPanel.classList.remove('collapsing');
  };
})();
