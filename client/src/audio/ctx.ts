// 오디오 컨텍스트(첫 사용자 입력 뒤 지연 생성)·게인 그래프·음소거/볼륨 저장
import {clamp} from '../core/util.js';

export interface Prefs {
  mute: boolean;
  master: number;
  sfx: number;
  bgm: number;
}
export type Vol = 'master' | 'sfx' | 'bgm';
const KEY = 'stealPlanetAudio'; // 게임 세이브와 분리된 별도 키 (음소거·볼륨은 기기 설정)
const VOLS: Vol[] = ['master', 'sfx', 'bgm'];

function load(): Prefs {
  let calm = false;
  try {
    calm = matchMedia('(prefers-reduced-motion: reduce)').matches; // 모션/소음 민감 사용자는 더 작게 시작
  } catch (e) {}
  const p: Prefs = calm ? {mute: false, master: 0.4, sfx: 0.6, bgm: 0.2} : {mute: false, master: 0.5, sfx: 0.7, bgm: 0.35};
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (o && typeof o === 'object') {
      p.mute = o.mute === true;
      VOLS.forEach(k => {
        if (typeof o[k] === 'number') p[k] = clamp(o[k], 0, 1);
      });
    }
  } catch (e) {}
  return p;
}
export const prefs: Prefs = load();

/** 게인 그래프: world(덕킹) → sfx ┐ / cue → sfx ┤→ master → 리미터 / bgm ┘ */
export const bus = {} as {master: GainNode; sfx: GainNode; bgm: GainNode; world: GainNode};
let ctx: AudioContext | null = null,
  dead = false;
const readyFns: (() => void)[] = [],
  prefFns: (() => void)[] = [];
export const audioCtx = () => ctx;
/** 컨텍스트가 실제로 켜진 뒤 1회 호출 (이미 켜졌으면 즉시) */
export const onReady = (f: () => void) => (ctx && ctx.state === 'running' ? f() : void readyFns.push(f));
export const onPrefs = (f: () => void) => void prefFns.push(f);

function apply() {
  prefFns.forEach(f => f());
  if (!ctx) return;
  const t = ctx.currentTime;
  bus.master.gain.setTargetAtTime(prefs.mute ? 0 : prefs.master, t, 0.03);
  bus.sfx.gain.setTargetAtTime(prefs.sfx, t, 0.03);
  bus.bgm.gain.setTargetAtTime(prefs.bgm, t, 0.03);
}
function persist() {
  apply();
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch (e) {}
}
export function setMute(m: boolean) {
  prefs.mute = m;
  persist();
}
export function toggleMute() {
  setMute(!prefs.mute);
  return prefs.mute;
}
export function setVolume(k: Vol, v: number) {
  prefs[k] = clamp(v, 0, 1);
  persist();
}

function build() {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return (dead = true);
  ctx = new AC() as AudioContext;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -14;
  limit.ratio.value = 8;
  bus.master = ctx.createGain();
  bus.sfx = ctx.createGain();
  bus.bgm = ctx.createGain();
  bus.world = ctx.createGain();
  [bus.master.gain, bus.sfx.gain, bus.bgm.gain].forEach(g => (g.value = 0)); // apply() 가 부드럽게 올린다
  bus.world.connect(bus.sfx);
  bus.sfx.connect(bus.master);
  bus.bgm.connect(bus.master);
  bus.master.connect(limit).connect(ctx.destination);
  apply();
}
const GESTURES = ['pointerdown', 'keydown', 'touchend'];
function unlock() {
  if (!ctx && !dead) build();
  if (!ctx) return;
  ctx
    .resume()
    .then(() => {
      if (ctx!.state !== 'running') return;
      GESTURES.forEach(e => removeEventListener(e, unlock, true));
      readyFns.splice(0).forEach(f => f());
    })
    .catch(() => {});
}
GESTURES.forEach(e => addEventListener(e, unlock, true)); // 첫 입력 전에는 컨텍스트를 만들지도 않는다 (무음)
document.addEventListener('visibilitychange', () => {
  if (ctx && ctx.state !== 'closed') (document.hidden ? ctx.suspend() : ctx.resume()).catch(() => {}); // 탭을 가리면 소리도 멈춘다
});
