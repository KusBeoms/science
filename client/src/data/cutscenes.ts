// 컷신 데이터 (UX_CUTSCENE 1장). 새 컷신은 여기에 CutDef 를 추가하기만 하면 된다 — 글자 필드 없음, 좌표는 재생 시작 시 플레이어 위치 기준
import type {CutDef, CutId, Vec3} from './cutscene-types.js';

const A: Vec3 = [40, 58, -230], // 먼 사과 행성
  UP = Math.PI; // 북쪽(-z) 보기

/** C01 첫눈에 반함 (비트 1, 20s): 먼 사과 → 💗×3 → 금화 고리에 튕김 🙅/💰🤔 → 빈 주머니 💨 → 😤 → 조작 카메라 복귀 */
const c01: CutDef = {
  id: 'c01_love',
  beat: 1,
  durSec: 20,
  setup: {
    actors: [
      {id: 'p', kind: 'player', pos: [0, 0, 0], yaw: UP},
      {id: 'apple', kind: 'apple', pos: A},
      {id: 'ring', kind: 'ring', pos: A},
      {id: 'gold', kind: 'coin', pos: [A[0] - 38, A[1] - 30, A[2] + 22]},
    ],
  },
  tracks: [
    {
      type: 'camera',
      kf: [
        {t: 0, to: [0, 9, 44], look: A, fov: 70},
        {t: 4.99, to: [0, 11, 22], look: A, fov: 45, ease: 'inOut'},
        {t: 5, cut: true, to: [2.4, 4.6, 5.5], look: [A[0], A[1] - 10, A[2]], fov: 55},
        {t: 8.99, to: [2.4, 4.8, 5.5], look: [A[0], A[1] - 6, A[2]], fov: 50},
        {t: 9, cut: true, to: [A[0] + 14, A[1] + 6, A[2] + 66], look: [A[0], A[1] - 2, A[2]], fov: 40},
        {t: 10.99, to: [A[0] + 9, A[1] + 4, A[2] + 52], look: [A[0], A[1] - 2, A[2]], fov: 40, ease: 'out'},
        {t: 11, cut: true, to: [-4, 4, 7], look: [0, 7, -60], fov: 55},
        {t: 12.49, to: [-4, 4, 7], look: [0, 7, -60], fov: 55},
        {t: 12.5, cut: true, to: [A[0] - 14, A[1] - 8, A[2] + 52], look: [A[0] - 26, A[1] - 20, A[2] + 20], fov: 45},
        {t: 13.99, to: [A[0] - 18, A[1] - 8, A[2] + 46], look: [A[0] - 30, A[1] - 22, A[2] + 20], fov: 45, ease: 'out'},
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
        {t: 11, anim: 'grab'},
        {t: 12.5, anim: 'idle'},
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
        {t: 11.5, who: 'p', icons: ['rebuff'], dur: 1, pop: 'shake'},
        {t: 12.6, who: 'gold', icons: ['money', 'wonder'], dur: 1.4, pop: 'pop'},
        {t: 14.4, who: 'p', icons: ['dust'], dur: 1.6, pop: 'shake'},
        {t: 16.3, who: 'p', icons: ['determined'], dur: 1.9, pop: 'pulse'},
      ],
    },
    {
      type: 'fx',
      kf: [
        {t: 0, kind: 'fade', amt: 1, dur: 0},
        {t: 0.1, kind: 'fade', amt: 0, dur: 1.8},
        {t: 11.3, kind: 'flash', amt: 0.18},
        {t: 11.3, kind: 'sparkle', at: 'ring'},
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
        {t: 9.6, cue: 'coin'},
        {t: 10.1, cue: 'coin'},
        {t: 10.6, cue: 'coin'},
        {t: 11.5, cue: 'ring_bounce'},
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
