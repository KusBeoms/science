/* 전역 앰비언트 타입 선언. import/export를 쓰지 않는 "전역 스크립트" 모음이므로
   여기서 선언한 타입/인터페이스는 별도 참조 없이 모든 .ts 파일에서 바로 보인다.
   (module: none 전략 — 브라우저에서 file://로 직접 열어도 동작해야 하므로
   ES 모듈 번들러 없이 <script> 태그 순서로만 의존성을 해결한다.) */

type SpecialKind =
  | 'bond' | 'pass' | 'stayBound' | 'drift' | 'collide' | 'swerve'
  | 'impact' | 'compress' | 'flare' | 'fade';

type EndingKind =
  | 'blackhole' | 'supernova' | 'whitedwarf' | 'friends'
  | 'merge' | 'collision' | 'spider';

type CompanionTier = 'low' | 'mid' | 'high';

interface ChoiceVis {
  mass?: number;
  volume?: number;
  fuel?: number;
  special?: SpecialKind;
}

interface Badge {
  glyph: string;
  dir: -1 | 0 | 1;
  name: string;
}

interface ChoiceLogEntry {
  id: number;
  key: 'A' | 'D' | null;
  riskTier: number;
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
  lastEventId: number | null;
  usedOnce: Set<number>;
  choiceLog: ChoiceLogEntry[];
  eventOpen: boolean;
  nextEventAt: number;
  phaseStarBudget: number;
}

interface CollapseRushState {
  index: number;  // 지금 보여주는 연소 단계
  target: number; // 질량이 정한 마지막 단계
  t: number;      // 현재 단계에 머문 시간(초)
  step: number;   // 질주 시작 후 넘어간 단계 수
}

interface EventChoice {
  label: string;
  caption: string;
  riskTier: number;
  vis: ChoiceVis;
  apply: (s: GameState) => void;
}

interface EventDef {
  id: number;
  once: boolean;
  /* 자격을 갖췄을 때 이 이벤트가 뽑힐 확률(0~1). 지정하면 가중치 방식 대신
     이 값이 그대로 등장 확률이 된다 — 후보 수에 따라 확률이 출렁이지 않는다.
     생략하면 기존 방식(일반 1배, once 2배 가중치)을 따른다. */
  chance?: number;
  title: string;
  desc: string;
  condition: (s: GameState) => boolean;
  w: EventChoice;
  s: EventChoice;
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

interface ChoiceAnimAPI {
  badgesFor(vis?: ChoiceVis): Badge[];
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, vis?: ChoiceVis): void;
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
  EVENTS: EventDef[];
  pickEvent(): EventDef | null;
  Audio: AudioAPI;
  Render: RenderAPI;
  ChoiceAnim: ChoiceAnimAPI;
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
