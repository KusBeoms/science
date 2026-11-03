/* 상단 중앙 소형 패널: 내부 단면도(crossSectionCanvas) + 단계 진행 트랙(stageTrack).
   stageModel.ts가 판정한 현재 단계만 읽어 그린다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  const crossCanvas = document.getElementById('crossSectionCanvas') as HTMLCanvasElement;
  const crossCtx = crossCanvas.getContext('2d')!;

  // 표시 크기는 CSS(rem)가 정하고, 픽셀 버퍼만 그 크기 × devicePixelRatio로
  // 잡아 고해상도 화면에서 단면도 원이 뭉개지지 않게 한다. 좌표계는 CSS 픽셀
  // 단위를 유지하므로 아래 그리기 코드는 그대로다. 루트 폰트 크기가 창 크기에
  // 따라 바뀌므로(css/style.css의 html font-size clamp) 리사이즈 때 다시 잰다.
  let crossSize = 64;
  function syncCrossCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = crossCanvas.getBoundingClientRect();
    crossSize = Math.max(1, Math.round(rect.width || 64));
    crossCanvas.width = Math.round(crossSize * dpr);
    crossCanvas.height = Math.round(crossSize * dpr);
    crossCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  syncCrossCanvas();
  window.addEventListener('resize', syncCrossCanvas);

  const FUSION_COUNT = 7; // Gp._stageFusionStages.length (H..Fe)

  type Layer = { r: number; color: string };

  // 지구형: 지각/맨틀/핵 3겹. 목성형: 가스 외피/금속수소층/핵 3겹.
  // 점화 후: 바깥(먼저 생긴 재)→안쪽(현재 타는 층) 순서의 양파구조,
  // 현재 연소 단계 수만큼만 층이 쌓인다(예: 헬륨연소=수소외피+헬륨핵 2겹).
  // key만으로 층 목록이 완전히 정해지는 순수 함수라, 크로스페이드 시
  // "이전 key"와 "현재 key"의 그림을 각각 독립적으로 계산할 수 있다.
  function layersForKey(key: BodyStageKey, maxR: number): Layer[] {
    if (key === 'rocky') {
      // 지구 기준 실제 반지름 비율(총 6,371 km):
      //   지각 5~70 km      → 바깥 1% 미만
      //   맨틀 ~2,890 km 깊이 → 0.546 ~ 1.0
      //   외핵 3,480 km      → 0.191 ~ 0.546 (액체 철-니켈)
      //   내핵 1,220 km      → 0 ~ 0.191 (고체)
      // 지각은 실제 비율대로 두면 1픽셀도 안 되므로 최소한만 두껍게(6%) 그린다.
      return [
        { r: maxR, color: '#4a3a2c' },         // 지각
        { r: maxR * 0.94, color: '#b5502f' },  // 맨틀
        { r: maxR * 0.546, color: '#e8a13c' }, // 외핵(액체)
        { r: maxR * 0.191, color: '#fff1c2' }, // 내핵(고체)
      ];
    }
    if (key === 'gasGiant') {
      // 목성 내부 구조의 실제 반지름 비율:
      //   분자 수소 외피 : 0.80 ~ 1.0
      //   금속 수소층    : 0.17 ~ 0.80 (부피의 대부분을 차지한다)
      //   중심핵        : ~0.17 (암석·얼음, 경계가 흐릿한 "희석된 핵")
      return [
        { r: maxR, color: '#caa876' },         // 분자 수소 외피
        { r: maxR * 0.80, color: '#3a2f6b' },  // 금속 수소층
        { r: maxR * 0.17, color: '#7a8fa6' },  // 핵
      ];
    }
    const stages: FusionStageInfo[] = Gp._stageFusionStages;
    const idx = stages.findIndex((s) => s.key === key);
    const count = (idx < 0 ? 0 : idx) + 1; // 바깥부터 현재 단계까지 층 개수
    const layers: Layer[] = [];
    // 실제 초신성 직전 별의 양파구조는 화면에 그대로 옮길 수가 없다 —
    // 적색초거성은 반지름이 1,000 R☉인데 헬륨핵은 수 R☉, 철핵은 지구만
    // 하다(별 반지름의 0.001% 수준). 그래서 정성적 사실 두 가지만 지킨다:
    //   (1) 수소 외피가 압도적으로 두껍다 → 첫 경계에서 가장 크게 떨어진다
    //   (2) 안쪽으로 갈수록 껍질이 얇아지고 철핵은 점처럼 작다
    // 아래 비율은 그 순서를 지키면서 각 층이 최소한 눈에 보이도록 압축한 값이다.
    const FUSION_SHELL_R = [1.0, 0.58, 0.44, 0.34, 0.26, 0.19, 0.12];
    for (let i = 0; i < count; i++) {
      layers.push({ r: maxR * FUSION_SHELL_R[i], color: stages[i].color });
    }
    return layers;
  }

  function paintLayers(layers: Layer[], cx: number, cy: number, alpha: number) {
    if (alpha <= 0) return;
    crossCtx.globalAlpha = alpha;
    for (const layer of layers) {
      crossCtx.fillStyle = layer.color;
      crossCtx.beginPath(); crossCtx.arc(cx, cy, Math.max(2, layer.r), 0, Math.PI * 2); crossCtx.fill();
    }
    crossCtx.globalAlpha = 1;
  }

  // 단면도는 몸체 단계(bodyStageKey)가 바뀔 때마다(지각/맨틀/핵 ↔ 목성형 ↔
  // 점화 ↔ 각 연소 단계) 통째로 다시 그려져 팝업처럼 보였다. GSAP로 0→1
  // 블렌드 값을 트윈해 이전 단계 그림과 현재 단계 그림을 겹쳐 크로스페이드
  // 시키면, 어떤 종류의 전환이든 같은 코드로 부드럽게 이어진다.
  let prevKey: BodyStageKey | null = null;
  let fadingFromKey: BodyStageKey | null = null;
  const blend = { t: 1 };
  function drawCrossSection(state: GameState) {
    const w = crossSize, h = crossSize;
    crossCtx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const maxR = Math.min(w, h) / 2 - 2;

    const curKey = G.Stage.bodyStageKey(state);
    if (prevKey === null) {
      prevKey = curKey;
    } else if (curKey !== prevKey) {
      fadingFromKey = prevKey;
      prevKey = curKey;
      if (typeof gsap !== 'undefined') {
        gsap.killTweensOf(blend);
        blend.t = 0;
        gsap.to(blend, { t: 1, duration: 0.7, ease: 'power2.out' });
      } else {
        blend.t = 1;
      }
    }

    if (blend.t < 1) {
      paintLayers(layersForKey(fadingFromKey ?? curKey, maxR), cx, cy, 1 - blend.t);
      paintLayers(layersForKey(curKey, maxR), cx, cy, blend.t);
    } else {
      paintLayers(layersForKey(curKey, maxR), cx, cy, 1);
    }

    crossCtx.strokeStyle = 'rgba(255,255,255,0.15)';
    crossCtx.lineWidth = 1;
    crossCtx.beginPath(); crossCtx.arc(cx, cy, maxR, 0, Math.PI * 2); crossCtx.stroke();
  }

  Gp._vitalsPanelUpdate = function (state: GameState) {
    drawCrossSection(state);
    Gp._stageTrackUpdate(state);
  };
})();
