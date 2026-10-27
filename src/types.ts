/* 전역 앰비언트 타입 선언. import/export를 쓰지 않는 "전역 스크립트" 모음이므로
   여기서 선언한 타입/인터페이스는 별도 참조 없이 모든 .ts 파일에서 바로 보인다.
   (module: none 전략 — 브라우저에서 file://로 직접 열어도 동작해야 하므로
   ES 모듈 번들러 없이 <script> 태그 순서로만 의존성을 해결한다.) */

type EndingKind =
  | 'blackhole' | 'supernova' | 'whitedwarf' | 'friends'
  | 'merge' | 'collision' | 'spider' | 'vanish';

type CompanionTier = 'low' | 'mid' | 'high';

interface EffectLogEntry {
  id: string;
  name: string;
  icon: string;
}

interface GameState {
  started: boolean;
  gameOver: boolean;
  hasFusion: boolean;
  // 이번 판에서 실제로 도달한 최대 핵융합 단계(FUSION_STAGES 인덱스, -1이면 미점화).
  // 질량은 이벤트로 오르내리므로 "죽는 순간의 질량"만으로는 어디까지 태웠는지
  // 알 수 없다 — 엔딩 분기와 크레딧 표시가 이 값을 쓴다.
  maxFusionIndex: number;
  /* 말기 연소 질주(main/collapse.ts) 중 화면에 보여줄 연소 단계. -1이면 평소처럼
     연료 잔량으로 판정한다. */
  forcedFusionIndex: number;
  collapseRush: CollapseRushState | null;
  endingType: EndingKind | null;
  mass: number;
  volume: number;
  fuel: number;
  ageYears: number;
  distanceLy: number;
  postIgnitionDistanceLy: number;
  accretionBoost: number;
  /* 이번 판에 동반성 조우 이벤트가 등장할 수 있는지 — 판 시작 때 한 번만 굴린다. */
  companionOffered: boolean;
  hasCompanion: boolean;
  companionTier: CompanionTier | null;
  companionMass: number;
  companionFuel: number;
  companionAlive: boolean;
  staysBound: boolean;
  mergeFlag: boolean;
  collisionFlag: boolean;
  companionEventShown: boolean;
  crisisShown: boolean;
  collisionEventShown: boolean;
  lastBreathShown: boolean;
  /* 키 입력 → 성운 → 흡수 루프의 누적 통계 */
  gravity: number;          // 중력 배율(1.0에서 시작, 성운을 삼킬수록 늘어난다)
  pressCount: number;       // 누른 키 수
  burstPresses: number;     // 직전 입력 후 0.28초 안에 눌린 입력 수(몰아치기 성향)
  lastPressAt: number;
  absorbedClouds: number;   // 완전히 삼킨 성운 수
  steps: number;            // 앞으로 나아간 칸 수
  meteorHits: number;       // 운석과 충돌한 횟수
  peakMass: number;         // 이번 판에서 도달한 최대 질량(M☉)
  playTime: number;         // 시뮬레이션이 실제로 흐른 시간(초) — 효과 주기의 기준
  nextEffectAt: number;     // 다음 효과가 발동할 playTime
  lastEffectId: string | null;
  usedEffects: Set<string>;
  effectLog: EffectLogEntry[];
  phaseStarBudget: number;
}

interface CollapseRushState {
  index: number;  // 지금 보여주는 연소 단계
  target: number; // 질량이 정한 마지막 단계
  t: number;      // 현재 단계에 머문 시간(초)
  step: number;   // 질주 시작 후 넘어간 단계 수
}

interface EffectMods {
  absorb: number;    // 성운 입자 하나가 붙여주는 질량 배율
  gravity: number;   // 끌어당기는 힘 배율
  fuelBurn: number;  // 연료 소모 배율
  cloud: number;     // 키 한 번에 생기는 성운의 크기(입자 수) 배율
  massDrain: number; // 초당 잃는 질량 비율(항성풍 등)
  spin: number;      // 자전 속도 배율
  swirl: number;     // 성운이 접선 방향으로 휘도는 정도
}

interface EffectEnv {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  vs: number;                 // 화면 크기 배율(_renderViewScale)
  b: StarActorPoint;          // 플레이어 몸체의 화면 위치/반지름
  age: number;                // 이 효과가 시작된 뒤 경과 시간(초)
  dur: number;
  p: number;                  // age / dur
  k: number;                  // 페이드 인/아웃 강도(0~1)
  dt: number;
  t: number;                  // 전역 시계(초)
  st: GameState;
}

interface EffectInst {
  def: EffectDef;
  age: number;
  dur: number;
  k: number;
  rnd: () => number;
  data: any;
  el: HTMLElement | null;
}

interface EffectDef {
  id: string;
  name: string;
  icon: string;
  kind: 'buff' | 'debuff' | 'event';
  desc: string;
  duration: number | [number, number];
  once?: boolean;
  weight?: number;
  mods?: Partial<EffectMods>;
  condition: (s: GameState) => boolean;
  /* 패널에 보일 설명을 상황에 맞게 바꾸고 싶을 때(무작위 결과가 정해진 뒤 등) */
  detail?: (inst: EffectInst) => string;
  start?: (inst: EffectInst, s: GameState) => void;
  step?: (inst: EffectInst, env: EffectEnv) => void;
  end?: (inst: EffectInst, s: GameState) => void;
  back?: (inst: EffectInst, env: EffectEnv) => void;
  front?: (inst: EffectInst, env: EffectEnv) => void;
  sound?: (A: AudioAPI) => void;
}

interface NebulaPreset {
  id: string;
  name: string;
  desc: string;
  mass: number;
  volume: number;
  accretionBoost: number;
}

type FusionStageKey = 'H' | 'He' | 'C' | 'Ne' | 'O' | 'Si' | 'Fe';

interface FusionStageInfo {
  key: FusionStageKey;
  index: number;
  name: string;
  color: string;
}

type BodyStageKey = 'rocky' | 'gasGiant' | FusionStageKey;

interface StageSequenceEntry {
  key: BodyStageKey;
  label: string;
}

interface StageSequenceInfo {
  entries: StageSequenceEntry[];
  index: number;
}

interface ArchetypeInfo {
  title: string;
  desc: string;
}

interface StarActorPoint {
  x: number;
  y: number;
  r: number;
}

interface StarTier {
  spectral: string;
  max: number;
  color: [number, number, number];
  granules: number;
  granuleSpeed: number;
  spots: number;
  spotOpacity: number;
  flareEvery: [number, number];
  flareSize: number;
  wind: number;
  windSpeed: number;
  oblate: number;
  pulse: number;
}

interface MusicTrackConfig {
  src: string;
  volume: number;
  loop: boolean;
}

interface CurrentMusicHandle {
  name: string;
  howl: any;
  targetVol: number;
}

interface AudioAPI {
  actx: AudioContext | null;
  masterGain: GainNode | null;
  droneNodes: any;
  muted: boolean;
  musicHowls: Record<string, any>;
  currentMusic: CurrentMusicHandle | null;
  init(): void;
  startDrone(): void;
  getMusicHowl(name: string): any;
  playMusic(name: string): void;
  stopMusic(): void;
  playTone(freq: number, dur: number, type?: OscillatorType, gainVal?: number, delay?: number): OscillatorNode | undefined;
  playSweep(f0: number, f1: number, dur: number): void;
  playNoiseBurst(dur: number, gainVal?: number): void;
}

interface BackgroundStar {
  x: number;
  y: number;
  r: number;
  layer: number;
  baseAlpha: number;
  color: string;
  twinkle: number;
  phase: number;
  spike: boolean;
}

interface EndingParticle {
  a: number;
  speed: number;
  r: number;
  life: number;
}

interface RenderAPI {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  stars: BackgroundStar[];
  starAngle: number;
  companionOrbitAngle: number;
  endingAnimT: number;
  endingAnimDur: number;
  endingParticles: EndingParticle[];
  resize(): void;
  initStars(): void;
  starBudget(): number;
  bgDarkness(): number;
  drawBackground(dt: number, scroll: number, budget: number): void;
  massColor(m: number): string;
  starClass(m: number): StarTier;
  starRadius(volume: number): number;
  getSurface(id: string): any;
  resetSurfaces(): void;
  drawStarBody(x: number, y: number, mass: number, volume: number, fuelFrac: number, angle: number, id?: string, dt?: number, ignitionBlend?: number): StarActorPoint;
  drawPlayerStar(dt?: number, centerT?: number, panT?: number): StarActorPoint;
  drawCompanionStar(dt?: number): StarActorPoint;
  setupEndingAnim(type: EndingKind): void;
  playEndingSound(type: EndingKind): void;
  drawEndingAnim(): void;
}

type EndingAnimDrawFn = (ctx: CanvasRenderingContext2D, R: RenderAPI, p: number) => void;
type EndingAnimSoundFn = (A: AudioAPI) => void;

interface EndingAnimModule {
  duration: number;
  sound: EndingAnimSoundFn;
  draw: EndingAnimDrawFn;
}

interface Attractor {
  x: number;
  y: number;
  r: number;
  gm: number;
  hit: (g: any) => void;
}

interface NebulaAPI {
  GM: number;
  attractors: Attractor[];
  hitsThisFrame: number;
  spawn(code: string, label: string, opts?: { near?: boolean }): boolean;
  scaleMass(ratio: number, x?: number, y?: number): void;
  emit(x: number, y: number, count: number, hue: number, opts?: any): void;
  addMassFrac(frac: number, x?: number, y?: number, hue?: number): void;
  ring(x: number, y: number, r0: number, r1: number, life: number, hue: number, lw?: number, a?: number): void;
  pulse(v: number): void;
  floatText(x: number, y: number, text: string, hue: number, size?: number): void;
  accel(x: number, y: number, k?: number): { ax: number; ay: number };
  update(dt: number, body: StarActorPoint): void;
  drawBack(ctx: CanvasRenderingContext2D, body: StarActorPoint, dt: number): void;
  drawFront(ctx: CanvasRenderingContext2D, body: StarActorPoint, dt: number): void;
  reset(): void;
}

interface RunBest { steps: number; mass: number; }

interface RunAPI {
  best: RunBest;
  newRecord: boolean;
  scrollRatio: number;
  hop(code: string, label: string): boolean;
  update(dt: number, body: StarActorPoint): void;
  drawBack(ctx: CanvasRenderingContext2D, body: StarActorPoint): void;
  drawFront(ctx: CanvasRenderingContext2D, body: StarActorPoint): void;
  finish(): void;
  reset(): void;
  massLabel(m: number): string;
  refreshBestUI(): void;
}

interface EffectsAPI {
  mods: EffectMods;
  active: EffectInst[];
  companionPos: StarActorPoint | null;
  update(dt: number, body: StarActorPoint): void;
  drawBack(ctx: CanvasRenderingContext2D, body: StarActorPoint, dt: number): void;
  drawFront(ctx: CanvasRenderingContext2D, body: StarActorPoint, dt: number): void;
  force(id: string): void;
  reset(): void;
}

interface EndingAPI {
  NAMES: Record<EndingKind, string>;
  FLAVOR: Record<EndingKind, string>;
  CLAUSE: Record<EndingKind, string>;
  ARCH: Record<string, ArchetypeInfo>;
  naturalEndingKind(): EndingKind;
  computeArchetype(): ArchetypeInfo;
  buildCredits(): void;
  restart(): void;
}

interface StageAPI {
  FUSION_STAGES: FusionStageInfo[];
  bodyStageKey(state: GameState): BodyStageKey;
  bodyStageLabel(state: GameState): string;
  coarseLabel(state: GameState): string;
  fusionStageIndex(state: GameState): number;
  fusionStageCount(mass: number): number;
  sequence(state: GameState): StageSequenceInfo;
}

interface GameNamespace {
  state: GameState;
  SPEED: number;
  FUEL_MAX: number;
  BASE_BURN: number;
  MASS_REF: number;
  EARTH_MASS: number;
  GAS_GIANT_MIN_MASS: number;
  JUPITER_MASS: number;
  COMPANION_ENCOUNTER_CHANCE: number;
  ACCRETION_DAMP_MASS: number;
  IGNITION_MASS: number;
  WHITE_DWARF_MAX: number;
  BLACK_HOLE_MIN: number;
  HELIUM_IGNITION_MIN: number;
  CARBON_IGNITION_MIN: number;
  IRON_CORE_MIN: number;
  STAR_REST_X_FRACTION: number;
  PROTO_BODY_SCALE: number;
  FORMATION_YEARS_PER_SEC: number;
  clamp(v: number, a: number, b: number): number;
  fuelBurnRate(m: number): number;
  yearsPerSecond(m: number): number;
  formatYears(y: number): string;
  resetState(): void;
  NEBULA_PRESETS: NebulaPreset[];
  applyPreset(id: string): void;
  Audio: AudioAPI;
  Render: RenderAPI;
  Nebula: NebulaAPI;
  Effects: EffectsAPI;
  Run: RunAPI;
  Ending: EndingAPI;
  Stage: StageAPI;
}

interface Window {
  Game: GameNamespace;
  debugEnding: (n: number) => void;
  webkitAudioContext: typeof AudioContext;
}

declare var Game: GameNamespace;
declare var Howl: any;
declare var gsap: any;
