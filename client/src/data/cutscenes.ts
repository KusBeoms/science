// 컷신 데이터 (UX_CUTSCENE 1장). 새 컷신은 여기에 CutDef 를 추가하기만 하면 된다 — 글자 필드 없음, 좌표는 재생 시작 시 플레이어 위치 기준
import type {CutDef, CutId, Vec3} from './cutscene-types.js';

const A: Vec3 = [40, 58, -230], // 먼 사과 행성
  UP = Math.PI; // 북쪽(-z) 보기

/** C01 첫눈에 반함 (비트 1, 20s): 먼 사과 → 💗×3 → 사과 위 🔍❓(파는 곳을 못 찾음) → 💰(돈이 필요) → 빈 주머니 💨 → 😤 → 조작 카메라 복귀 (금화 고리 결계·튕김은 폐기됨 — STORY v2.2 #2) */
const c01: CutDef = {
  id: 'c01_love',
  beat: 1,
  durSec: 20,
  setup: {
    actors: [
      {id: 'p', kind: 'player', pos: [0, 0, 0], yaw: UP},
      {id: 'apple', kind: 'apple', pos: A},
    ],
  },
  tracks: [
    {
      type: 'camera',
      kf: [
        // 0–5: 지형 능선 위로 사과가 온전히 보이도록 카메라를 높인다
        {t: 0, to: [0, 22, 44], look: A, fov: 70},
        {t: 4.99, to: [0, 26, 22], look: A, fov: 45, ease: 'inOut'},
        // 5–9: 주인공 뒤통수(화면 우하) + 어깨 너머 사과(우상). 주인공이 프레임 안에 들어오도록 낮고 넓게
        {t: 5, cut: true, to: [-1.8, 2.6, 6.5], look: [4, 10, -92], fov: 60},
        {t: 8.99, to: [-1.8, 2.6, 6.5], look: [8, 12, -92], fov: 58},
        // 9–11: 사과 클로즈업
        {t: 9, cut: true, to: [A[0] + 18, A[1] + 8, A[2] + 112], look: [A[0], A[1] - 2, A[2]], fov: 40},
        {t: 10.99, to: [A[0] + 10, A[1] + 5, A[2] + 88], look: [A[0], A[1] - 2, A[2]], fov: 40, ease: 'out'},
        // 11–12.5: 주인공과 사과를 함께 — 사과 위 🔍❓
        {t: 11, cut: true, to: [1.8, 2.2, 6.5], look: [20, 30, -120], fov: 62},
        {t: 12.49, to: [1.8, 2.2, 6.5], look: [20, 30, -120], fov: 62},
        // 12.5–14: 주인공 근접 — 머리 위 💰
        {t: 12.5, cut: true, to: [4, 3.2, 9.5], look: [0, 3, 0], fov: 42},
        {t: 13.99, to: [2.6, 3.2, 9], look: [0, 3, 0], fov: 42, ease: 'out'},
        {t: 14, cut: true, to: [0, 4, 9], look: [0, 3.6, 0], fov: 50},
        {t: 17, to: [0, 4, 9], look: [0, 3.6, 0], fov: 50},
        {t: 20, to: [0, 10, 17], look: [0, 3, 0], fov: 60, ease: 'inOut'},
      ],
    },
    {
      type: 'actor',
      id: 'p',
      kf: [
        {t: 0, anim: 'idle', yaw: UP},
        {t: 13.99, yaw: UP}, // 14초 컷 직전까지 사과 쪽을 향한 채 유지(보간으로 서서히 돌아서지 않게)
        {t: 14, yaw: 0.25, anim: 'shock'},
        {t: 17, anim: 'idle'},
      ],
    },
    {
      type: 'bubble',
      kf: [
        {t: 5.4, who: 'p', icons: ['love'], dur: 0.9, pop: 'pop'},
        {t: 6.4, who: 'p', icons: ['love'], dur: 0.9, pop: 'pop'},
        {t: 7.4, who: 'p', icons: ['love'], dur: 1.1, pop: 'pop'},
        {t: 11.4, who: 'apple', icons: ['search', 'question'], dur: 1.1, pop: 'pulse'},
        {t: 12.6, who: 'p', icons: ['money'], dur: 1.4, pop: 'pop'},
        {t: 14.4, who: 'p', icons: ['dust'], dur: 1.6, pop: 'shake'},
        {t: 16.3, who: 'p', icons: ['determined'], dur: 1.9, pop: 'pulse'},
      ],
    },
    {
      type: 'fx',
      kf: [
        {t: 0, kind: 'fade', amt: 1, dur: 0},
        {t: 0.1, kind: 'fade', amt: 0, dur: 1.8},
        {t: 16.2, kind: 'dim', amt: 0.18, dur: 0.4},
        {t: 17, kind: 'dim', amt: 0, dur: 1},
      ],
    },
    {
      type: 'sound',
      kf: [
        {t: 0, cue: 'silence'},
        {t: 5.4, cue: 'heart'},
        {t: 6.4, cue: 'heart'},
        {t: 7.4, cue: 'heart'},
        {t: 12.6, cue: 'coin'},
        {t: 13.1, cue: 'coin'},
        {t: 13.6, cue: 'coin'},
        {t: 16.3, cue: 'sting'},
        {t: 18.5, cue: 'bgm_explore'},
      ],
    },
  ],
  onEnd: [{do: 'beat', to: 1}, {do: 'save'}],
};

/** x_sample: 입력 비차단 오버레이 포맷 검증용 (6s) — 레터박스 없음, 이동 유지, soft 시선 보조 + 말풍선 + 어두워짐 + HUD 키 */
const sample: CutDef = {
  id: 'x_sample',
  beat: 0,
  durSec: 6,
  lockInput: false,
  letterbox: false,
  setup: {actors: [{id: 'p', kind: 'player', pos: [0, 0, 0]}]},
  tracks: [
    {type: 'camera', kf: [{t: 0.5, soft: true, to: [0, 0, 0], look: [0, 6, -80], fov: 52}]},
    {type: 'bubble', kf: [{t: 0.5, who: 'p', icons: ['love', 'sparkle'], dur: 1.6, pop: 'pop'}, {t: 3, who: 'p', icons: ['wonder'], dur: 1.4, pop: 'pulse'}]},
    {type: 'fx', kf: [{t: 2.5, kind: 'dim', amt: 0.3, dur: 0.4}, {t: 4.5, kind: 'dim', amt: 0, dur: 0.5}]},
    {type: 'sound', kf: [{t: 0.5, cue: 'heart', vol: 0.6, duck: true}]},
    {type: 'hud', kf: [{t: 2.5, target: 'apple', spotlight: true}]},
  ],
  onEnd: [],
};

export const CUTS: Partial<Record<CutId, CutDef>> = {c01_love: c01, x_sample: sample};
export const cutOf = (id: CutId) => CUTS[id];
/** STORY 비트 번호(+중간 비트 mid)로 조회 */
export const cutByBeat = (beat: number, mid = 0) => Object.values(CUTS).find(c => c && c.beat === beat && (c.mid || 0) === mid);
