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
}

interface ChoiceLogEntry {
  id: number;
  key: 'W' | 'S' | null;
  riskTier: number;
}

interface GameState {
  started: boolean;
  gameOver: boolean;
  endingType: EndingKind | null;
  mass: number;
  volume: number;
  fuel: number;
  ageYears: number;
  distanceLy: number;
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
  endingAnimT: number;
  endingAnimDur: number;
  endingParticles: EndingParticle[];
  resize(): void;
  initStars(): void;
  starBudget(): number;
  bgDarkness(): number;
  massColor(m: number): string;
  starClass(m: number): StarTier;
  getSurface(id: string): any;
  resetSurfaces(): void;
  drawStarBody(x: number, y: number, mass: number, volume: number, fuelFrac: number, angle: number, id?: string, dt?: number): StarActorPoint;
  drawPlayerStar(dt?: number): StarActorPoint;
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

interface GameNamespace {
  state: GameState;
  SPEED: number;
  FUEL_MAX: number;
  BASE_BURN: number;
  MASS_REF: number;
  clamp(v: number, a: number, b: number): number;
  fuelBurnRate(m: number): number;
  yearsPerSecond(m: number): number;
  resetState(): void;
  NEBULA_PRESETS: NebulaPreset[];
  applyPreset(id: string): void;
  EVENTS: EventDef[];
  pickEvent(): EventDef | null;
  Audio: AudioAPI;
  Render: RenderAPI;
  ChoiceAnim: ChoiceAnimAPI;
  Ending: EndingAPI;
}

interface Window {
  Game: GameNamespace;
  debugEnding: (n: number) => void;
  webkitAudioContext: typeof AudioContext;
}

declare var Game: GameNamespace;
declare var Howl: any;
