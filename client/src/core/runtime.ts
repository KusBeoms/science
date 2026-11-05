// 여러 모듈이 공유하는 가변 런타임 상태 (원본의 전역 let 변수들). ES 모듈은 import 한 let 에 대입할 수 없으므로 하나의 객체 G 로 묶는다.
// THREE 객체와 라이벌은 경계 타입이라 any.
import type {Carry, Chunk, CineState, Pick, QuizCtx, Target} from './types.js';

export const G = {
  // 입력/플레이어
  /** 앉아 있는 자리(벤치 등). null 이면 서 있음. 이동 입력이 들어오면 일어난다 */
  sit: null as null | {x: number; y: number; z: number; ry: number},
  /** 들어가 있는 건물 방 (game/interior.ts). null 이면 야외 */
  inside: null as null | {i: number; grp: any; spots: {kind: string; x: number; z: number; ry?: number}[]; ret: {x: number; z: number}},
  /** 운전 중인 차 (systems/vehicle.ts) */
  drive: null as any,
  jumpHeld: false,
  runHeld: false,
  stam: 100,
  tired: false,
  lockMode: false,
  joy: {x: 0, y: 0},
  pickOv: null as {pk: Pick; t: number} | null,
  keys: {} as Record<string, boolean>,
  yaw: 0,
  pitch: 0.45,
  camDist: 11,
  // 게임 진행
  carry: [] as Carry[],
  raidT: 1200,
  toastT: 0,
  target: null as Target | null,
  cycT: 0,
  night: 0,
  quizOpen: false,
  dexOpen: false,
  shopOpen: false,
  /** 범용 오버레이(game/modal.ts)로 열린 요소 id — 포탈 목록 등. 열려 있으면 일시정지 */
  modal: null as string | null,
  modalClose: null as (() => void) | null,
  quizCtx: null as QuizCtx | null,
  /** 재생 중인 컷신(game/cutscene.ts). lock 이면 paused() */
  cine: null as CineState | null,
  /** 컷신 → 다른 모듈 느슨한 훅 (사운드·HUD 게이지·종료 효과). 구현하는 쪽이 대입한다 */
  cineHooks: {} as {
    sound?: (cue: string, o: {vol?: number; pan?: number; duck?: boolean}) => void;
    hud?: (k: {target: string; set?: number; from?: 'cur' | number; preview?: boolean; spotlight?: boolean} | null) => void;
    effect?: (e: {do: string; [k: string]: any}) => void;
  },
  /** 플레이어가 서 있는 섹터 인덱스 (-1 = 허브/허공) */
  curZone: -1,
  /** 일시정지를 뺀 누적 게임 시간(초) — 둥지 시간 보정 기준 */
  gameT: 0,
  comet: null as any,
  cometT: 40,
  started: false,
  quizClosedAt: 0,
  fullToastAt: 0,
  resetting: false,
  saveI: 0,
  // three.js 객체
  renderer: null as any,
  scene: null as any,
  camera: null as any,
  me: null as any,
  rival: null as any,
  npc: null as any,
  clock: null as any,
  decoGrp: null as any,
  baseFloor: null as any,
  carryGrp: null as any,
  sackGrp: null as any,
  springGrp: null as any,
  /** 섹터 인덱스별 로드된 씬 객체 (render/sectors.ts 가 거리 기준으로 만들고 해제) */
  chunks: [] as (Chunk | null)[],
  /** 포탈 패드: 'hub' 또는 섹터 id → {grp, x, z} */
  pads: {} as Record<string, {grp: any; x: number; z: number}>,
  baseMesh: [] as {ped: any; id: number; grp: any; mut?: number}[],
};
export const paused = () => !G.started || G.quizOpen || G.dexOpen || G.shopOpen || G.modal !== null || (G.cine !== null && G.cine.lock);
export function releaseLock() {
  if (document.pointerLockElement) document.exitPointerLock();
  Object.keys(G.keys).forEach(k => (G.keys[k] = false));
}
