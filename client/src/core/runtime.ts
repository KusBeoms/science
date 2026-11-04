// 여러 모듈이 공유하는 가변 런타임 상태 (원본의 전역 let 변수들). ES 모듈은 import 한 let 에 대입할 수 없으므로 하나의 객체 G 로 묶는다.
// THREE 객체와 라이벌은 경계 타입이라 any.
import type {Carry, Pick, QuizCtx, Target} from './types.js';

export const G = {
  // 입력/플레이어
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
  camDist: 16,
  // 게임 진행
  carry: [] as Carry[],
  raidT: 50,
  toastT: 0,
  target: null as Target | null,
  cycT: 0,
  night: 0,
  quizOpen: false,
  dexOpen: false,
  shopOpen: false,
  quizCtx: null as QuizCtx | null,
  curZone: -1,
  lastZone: -2,
  comet: null as any,
  cometT: 40,
  started: false,
  quizClosedAt: 0,
  fullToastAt: 0,
  resetting: false,
  saveI: 0,
  // three.js 객체
  starPts: null as any,
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
  guards: [] as {m: any; chase: boolean; home: any}[],
  nestMesh: [] as {id: number; grp: any}[][],
  baseMesh: [] as {ped: any; id: number; grp: any; mut?: number}[],
  gates: [] as {grp: any; panel: any; gl: any; pm: any}[],
};
export const paused = () => !G.started || G.quizOpen || G.dexOpen || G.shopOpen;
export function releaseLock() {
  if (document.pointerLockElement) document.exitPointerLock();
  Object.keys(G.keys).forEach(k => (G.keys[k] = false));
}
