// 공용 인터페이스
export interface Planet {
  id: number;
  name: string;
  grp: string;
  M: number;
  R: number;
  t: number;
  price: number;
  c1: string;
  c2: string;
  fact: string;
  fx: string;
  g: number;
  ve: number;
  inc: number;
}
/** 행성 DB 행: [이름, 분류(R 인덱스), 질량(M⊕), 반지름(R⊕), 등급(0~5), 가격, 색1, 색2, 설명, 효과?] */
export type DbRow = [string, number, number, number, number, number, string, string, string, string?];
export type Region = 'near' | 'stellar' | 'extreme' | 'fiction';
/** 문(입장 시험)이 놓이는 변: 북(−z)·남(+z)·동(+x)·서(−x) */
export type Side = 'n' | 's' | 'e' | 'w';
/** 섹터 해금 조건. 입장 시험 통과는 항상 필요하고, 아래는 시험을 볼 자격 */
export interface SectorReq {
  prev?: string;
  spd?: number;
  vehicle?: number;
  dex?: number;
  chapter?: number;
}
export interface Sector {
  id: string;
  name: string;
  icon: string;
  region: Region;
  center: {x: number; z: number};
  size: number;
  floor: [string, string];
  rim: number;
  stars: StarDef[];
  guard: {speed: number; glow: number};
  pool: number[];
  difficulty: number;
  gravityMul: number;
  timeMul: number;
  requires: SectorReq;
  gate: Side;
  units: string[];
  note: string;
  solo: number;
}
/** 기지 슬롯에 놓인 행성 */
export interface Owned {
  id: number;
  mut: number;
  left: number;
  st: number;
}
/** 들고 있는 행성 (z=섹터 인덱스, k=둥지 번호, st=문제를 맞혀 얻음) */
export interface Carry {
  id: number;
  z: number;
  k: number;
  st: number;
}
export interface SaveState {
  cr: number;
  slots: number;
  spd: number;
  base: (Owned | null)[];
  dex: Record<number, number>;
  mi: number;
  stolen: number;
  correct: number;
  bought: number;
  zone: number;
  springs: number[];
  eq: number;
  bag: number;
  deco: Record<string, number>;
  look: Record<string, number>;
  own: Record<string, number>;
  notes: Record<string, number>;
  ver: number;
  chapter: number;
  wanted: number;
  vehicle: number;
  ach: Record<string, number>;
  coins: Record<string, number>;
  playSec: number;
  // v5: 섹터 해금·포탈 + 후속 기능용 빈 기본값 (core/save-schema.ts)
  unlocked: Record<string, 1>;
  portals: Record<string, 1>;
  quests: Record<string, number>;
  vehicles: Record<string, number>;
  heists: Record<string, number>;
  collectibles: Record<string, 1>;
}
export interface StarDef {
  n: string;
  bh?: number;
  c: number[];
  R: number;
  orb: number;
}
export interface Star extends StarDef {
  x: number;
  z: number;
  rad: number;
}
export interface OrbitItem {
  kind: 'orbit';
  s: number;
  r: number;
  a: number;
  w: number;
  x: number;
  z: number;
}
export interface SoloItem {
  kind: 'solo';
  x: number;
  z: number;
}
export type LayItem = OrbitItem | SoloItem;
export interface Layout {
  stars: Star[];
  items: LayItem[];
}
/** 섹터 하나의 둥지 상태. at = 마지막으로 시간을 진행시킨 게임 시각(G.gameT) */
export interface Nest {
  t: number[];
  cd: number[];
  s: number[];
  at: number;
}
/** 메시에 붙는 클릭 정보 (userData.pick) */
export interface Pick {
  kind: string;
  [k: string]: any;
}
/** 상호작용 대상. d = 플레이어와의 거리(작을수록 우선) */
export interface Target {
  kind: string;
  d: number;
  [k: string]: any;
}
/** 상호작용 종류 (game/interactables.ts 에 등록) */
export interface Interactable<T extends Target = Target> {
  kind: string;
  /** 0 = 물체(3.5 이내면 시설보다 우선), 1 = 시설(상점·문·포탈) */
  tier: 0 | 1;
  find(me: any): T | null;
  info(t: T): string;
  prompt(t: T): string;
  off?(t: T): boolean;
  /** 화면의 프롬프트를 눌렀을 때 보낼 키 (기본 'e') */
  tapKey?: 'e' | 'f';
  act(t: T, key: 'e' | 'f'): void;
  /** 3D 클릭(userData.pick.kind === kind). 없으면 4초간 이 대상을 우선 선택 */
  click?(pk: Pick): void;
}
/** 게임 시스템 (systems/registry.ts 에 등록, 등록 순서대로 호출) */
export interface GameSystem {
  id: string;
  update?(dt: number, raw: number): void;
  onSectorEnter?(s: Sector, i: number): void;
  onSectorLeave?(s: Sector, i: number): void;
  /** HUD 한 줄 (null/빈 문자열이면 숨김) */
  hud?(): string | null;
  /** 저장 직전: S 의 자기 필드에 상태를 써 넣는다 */
  onSave?(s: SaveState): void;
  /** 등록 시 1회 + 서버 세이브 복원 시: S 에서 상태를 읽는다 */
  onLoad?(s: SaveState): void;
  /** 이동 속도 배율 (모든 시스템 값을 곱한다) */
  speedMul?(): number;
  /** true 면 중력·바닥 판정을 끄고 허공을 떠다닌다 (비행 수단) */
  hover?(): boolean;
}
/** 스트리밍으로 로드된 섹터의 씬 객체 */
export interface Chunk {
  grp: any;
  gate: {grp: any; panel: any; gl: any};
  guard: {m: any; chase: boolean; home: any};
  nest: {id: number; grp: any}[];
}
export interface QuizQ {
  q: string;
  opts: {t: string; ok: boolean}[];
  why: string;
}
export interface QuizCtx {
  title: string;
  qs: string[][];
  need: number;
  onDone: (ok: boolean) => void;
  i: number;
  right: number;
  done: boolean;
  cur?: QuizQ;
  answered?: boolean;
}
