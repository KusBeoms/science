// 컷신 디렉터 데이터 포맷 (UX_CUTSCENE 2장). 텍스트 필드 없음 — 말풍선은 IconKey 배열뿐. 모든 Vec3 는 "재생 시작 시 플레이어 위치" 기준 상대 좌표
import type {IconKey} from './cutscene-icons.js';

/** 스토리 컷신 12 + 중간 비트 5 (세이브 S.story.seen 의 17키) */
export const STORY_CUTS = [
  'c01_love', 'c02_gauge', 'c03_caught', 'c04_hide', 'c05_triple', 'c06_chase', 'c07_safe', 'c08_rich', 'c09_go',
  'c10_quest', 'c11_knife', 'c12_free', 'm4_1_reach', 'm4_2_nest', 'm4_3_shadow', 'm4_4_gaze', 'm4_5_far',
] as const;
/** x_sample = 포맷 검증용 입력 비차단 오버레이 샘플 (세이브 seen 키 17개에는 포함되지 않는다) */
export type CutId = (typeof STORY_CUTS)[number] | 'x_sample';
export type Vec3 = [number, number, number];
export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'back';
export type Anim = 'idle' | 'walk' | 'run' | 'grab' | 'cheer' | 'shock' | 'melt' | 'hide';
export type ActorKind = 'player' | 'apple' | 'guard' | 'npc' | 'knife' | 'triple' | 'silhouette' | 'coin' | 'ring' | 'line' | 'sprout';
export type SoundCue =
  | 'heart' | 'coin' | 'sting' | 'drone' | 'quake' | 'roar' | 'door' | 'portal' | 'ring_bounce' | 'fanfare'
  | 'knife_hit' | 'knife_spin' | 'glass_crack' | 'rain' | 'silence' | 'bgm_explore' | 'bgm_chase' | 'bgm_happy' | 'bgm_off';

/** 모든 키 공통: t = 컷신 시간(초). cut:true 면 직전 키에서 보간하지 않고 이 시각에 점프 */
interface Key {
  t: number;
  ease?: Ease;
  cut?: boolean;
}
/** soft:true = 플레이어 카메라 위에 얹는 시선 보조(0.6s, look·fov 만 사용, 시점 입력 시 즉시 해제) — 입력 비차단 오버레이 전용 */
export interface CamKey extends Key {
  to: Vec3;
  look: Vec3;
  fov?: number;
  shake?: number;
  soft?: boolean;
}
/** follow = 다른 배우 id (pos 는 그 배우 기준 오프셋) */
export interface ActKey extends Key {
  pos?: Vec3;
  yaw?: number;
  scale?: number;
  anim?: Anim;
  visible?: boolean;
  follow?: string;
}
export interface BubbleKey {
  t: number;
  who: string;
  icons: IconKey[];
  dur: number;
  pop?: 'pop' | 'shake' | 'pulse';
}
/** amt/dur 의미: fade·dim·vignetteRed·rain = 목표 불투명도(0~1)까지 dur 초 램프 · flash = 순간 밝기(상한 0.25) · shake = 카메라 흔들림 진폭 · slowmo = 컷신 시간 배속(amt) dur 초 · sparkle = at 배우 위치에 ✨ · spot = at 의 HUD 요소/배우를 비추는 스포트라이트(amt 0 이면 해제) */
export interface FxKey {
  t: number;
  kind: 'vignetteRed' | 'rain' | 'sparkle' | 'shake' | 'fade' | 'flash' | 'spot' | 'slowmo' | 'dim';
  amt?: number;
  dur?: number;
  at?: string;
}
export interface SndKey {
  t: number;
  cue: SoundCue;
  vol?: number;
  pan?: number;
  duck?: boolean;
}
/** 사과 게이지 등 HUD 연출. 값 변경은 G.cineHooks.hud 로 위임(미리보기는 표시만, 종료 시 hud(null) 로 원복) */
export interface HudKey {
  t: number;
  target: 'apple' | 'wanted' | 'dir';
  set?: number;
  from?: 'cur' | number;
  spotlight?: boolean;
  preview?: boolean;
}
/** 게임플레이 HUD 숨김/표시 (기본: 입력 잠금 컷신은 숨김, 오버레이는 표시) */
export interface UiKey {
  t: number;
  hud: boolean;
}
export type Track =
  | {type: 'camera'; kf: CamKey[]}
  | {type: 'actor'; id: string; kf: ActKey[]}
  | {type: 'bubble'; kf: BubbleKey[]}
  | {type: 'fx'; kf: FxKey[]}
  | {type: 'sound'; kf: SndKey[]}
  | {type: 'hud'; kf: HudKey[]}
  | {type: 'ui'; kf: UiKey[]};

export interface Setup {
  actors: {id: string; kind: ActorKind; pos: Vec3; yaw?: number}[];
}
/** 게임 상태 변경은 전부 onEnd 로만 (건너뛰기·정상 종료 동일). beat/mid/flag/ended/save 는 디렉터가 처리, 나머지는 G.cineHooks.effect 로 위임 */
export type EndEffect =
  | {do: 'beat'; to: number}
  | {do: 'mid'; to: 1 | 2 | 3 | 4 | 5}
  | {do: 'flag'; key: string; v: 0 | 1}
  | {do: 'ended'}
  | {do: 'gaugeSync'}
  | {do: 'flushNotices'}
  | {do: 'start'; sys: 'watcher' | 'chase'}
  | {do: 'unlock'; what: 'house' | 'request'}
  | {do: 'save'};

export interface CutDef {
  id: CutId;
  beat: number;
  mid?: 1 | 2 | 3 | 4 | 5;
  durSec: number;
  skipHold?: number;
  letterbox?: boolean;
  lockInput?: boolean;
  setup?: Setup;
  tracks: Track[];
  onEnd: EndEffect[];
}
