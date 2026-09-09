/* 상단 단계 진행 트랙: 예전 나침반을 대체한다. 전체 단계(원시체 → 연소
   단계들)를 가로로 나열해두고, 현재 위치 근처만 보이는 창을 통해 좌우로
   스르륵 이동시켜 보여준다 — 단계가 바뀌어도 통째로 팝업되지 않는다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  const viewport = document.getElementById('stageTrackViewport') as HTMLElement;
  const list = document.getElementById('stageTrackList') as HTMLElement;
  const label = document.getElementById('stageTrackLabel') as HTMLElement;

  let renderedLength = -1;
  let ticks: HTMLElement[] = [];
  let renderedKeys: (BodyStageKey | null)[] = [];
  let currentIndex = -1;
  let lastLabelText = '';

  // 각 칸은 그 단계의 실제 외형을 그대로 축소해 보여준다 — 암석 행성은
  // 무광 암석질 구체, 가스 행성은 가로 줄무늬(제트류), 연소 단계는
  // 단면도(vitalsPanel)가 쓰는 것과 똑같은 원소 색. 그래야 트랙만 봐도
  // "지금 내가 무엇인지"와 "무엇을 지나왔는지"가 그림으로 읽힌다.
  function tickBackground(key: BodyStageKey): string {
    if (key === 'rocky') {
      return 'radial-gradient(circle at 34% 28%, #6f6355 0%, #4a4239 55%, #2b251e 100%)';
    }
    if (key === 'gasGiant') {
      return 'repeating-linear-gradient(180deg,' +
        '#efdcb4 0 18%, #a8763f 18% 34%, #e2c69c 34% 52%,' +
        '#9d7546 52% 70%, #caa170 70% 100%)';
    }
    const stage = G.Stage.FUSION_STAGES.filter((s) => s.key === key)[0];
    const color = stage ? stage.color : '#ffffff';
    // 핵융합 중인 별이므로 한쪽이 밝게 빛나는 구체로 그린다.
    return `radial-gradient(circle at 36% 30%, #ffffff 0%, ${color} 62%, ${color} 100%)`;
  }

  // 저질량(백색왜성행)/고질량(초신성·블랙홀행) 경로에 따라 총 칸 수가
  // 달라지는 드문 순간에만 DOM을 다시 만든다. 그 외엔 클래스만 바꾼다.
  function rebuildTicks(entries: StageSequenceEntry[]) {
    list.innerHTML = '';
    ticks = entries.map(() => {
      const el = document.createElement('div');
      el.className = 'stageTick upcoming';
      list.appendChild(el);
      return el;
    });
    renderedKeys = entries.map(() => null);
    renderedLength = entries.length;
  }

  Gp._stageTrackUpdate = function (state: GameState) {
    const seq: StageSequenceInfo = G.Stage.sequence(state);
    const { entries, index } = seq;
    if (entries.length !== renderedLength) rebuildTicks(entries);

    for (let i = 0; i < ticks.length; i++) {
      const cls = i === index ? 'current' : (i < index ? 'reached' : 'upcoming');
      const el = ticks[i];
      if (!el.classList.contains(cls)) {
        el.classList.remove('current', 'reached', 'upcoming');
        el.classList.add(cls);
      }
      // 0번 칸은 질량이 가스행성 경계를 넘는 순간 암석형 → 목성형으로 바뀐다
      // (칸 개수는 그대로라 rebuildTicks가 다시 불리지 않는다). 그래서 칸 수와
      // 별개로, 키가 달라졌을 때마다 외형을 갱신한다.
      const key = entries[i].key;
      if (renderedKeys[i] !== key) {
        renderedKeys[i] = key;
        el.style.background = tickBackground(key);
      }
    }

    // 현재 칸이 뷰포트 중앙 근처에 오도록 목록 전체를 가로로 이동한다.
    // 실제 DOM 레이아웃(offsetLeft)을 그대로 재서 계산하므로, 화면 크기에
    // 비례해 UI 전체가 커지고 작아져도(html의 rem 기준 폰트 스케일) 별도
    // 보정 없이 항상 정확히 맞는다.
    if (index !== currentIndex && ticks[index]) {
      currentIndex = index;
      const target = ticks[index];
      const targetX = viewport.offsetWidth / 2 - (target.offsetLeft + target.offsetWidth / 2);
      gsap.to(list, { x: targetX, duration: 0.6, ease: 'power2.out', overwrite: true });
    }

    const text = G.Stage.bodyStageLabel(state);
    if (text !== lastLabelText) {
      lastLabelText = text;
      label.textContent = text;
      gsap.fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.35 });
    }
  };
})();
