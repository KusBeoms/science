// 합성 기본 부품: 톤(오실레이터+엔벨로프)·노이즈·동전. 모든 시간은 AudioContext 시각(초)
import {audioCtx, bus} from './ctx.js';

/** 현재 재생 중인 효과음의 출력 노드 (sfx() 가 월드/컷신 큐에 맞춰 바꾼다) */
export const route = {out: null as AudioNode | null};
export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export interface Opt {
  type?: OscillatorType;
  vol?: number;
  /** 끝 주파수 (지수 슬라이드) */
  to?: number;
  /** 어택(초) */
  att?: number;
  /** 로우패스 컷오프 */
  lp?: number;
  out?: AudioNode;
}
export function tone(freq: number, t: number, dur: number, o: Opt = {}) {
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator(),
    g = ac.createGain(),
    att = o.att ?? 0.008;
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol ?? 0.25, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let tail: AudioNode = osc.connect(g);
  if (o.lp) {
    const f = ac.createBiquadFilter();
    f.frequency.value = o.lp;
    tail = tail.connect(f);
  }
  tail.connect(o.out ?? route.out ?? bus.sfx);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}
let nbuf: AudioBuffer | null = null,
  nctx: AudioContext | null = null;
/** 2초짜리 백색소음 버퍼 (컨텍스트별 1개) */
export function noiseBuf(ac: AudioContext) {
  if (nbuf && nctx === ac) return nbuf;
  nctx = ac;
  nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = nbuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return nbuf;
}
export interface NoiseOpt {
  vol?: number;
  att?: number;
  lp?: number;
  hp?: number;
  /** 밴드패스 중심 (to 가 있으면 그쪽으로 스윕) */
  bp?: number;
  to?: number;
  out?: AudioNode;
}
export function noise(t: number, dur: number, o: NoiseOpt = {}) {
  const ac = audioCtx();
  if (!ac) return;
  const src = ac.createBufferSource(),
    g = ac.createGain();
  src.buffer = noiseBuf(ac);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol ?? 0.2, t + (o.att ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let tail: AudioNode = src;
  const filt = (type: BiquadFilterType, f: number) => {
    const b = ac.createBiquadFilter();
    b.type = type;
    b.frequency.setValueAtTime(f, t);
    tail = tail.connect(b);
    return b;
  };
  if (o.lp) filt('lowpass', o.lp);
  if (o.hp) filt('highpass', o.hp);
  if (o.bp) {
    const b = filt('bandpass', o.bp);
    if (o.to) b.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  }
  tail.connect(g).connect(o.out ?? route.out ?? bus.sfx);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}
/** 금화 "짤랑" 한 알 */
export function coin(t: number, f = 2200) {
  tone(f, t, 0.2, {vol: 0.1});
  tone(f * 1.5, t + 0.012, 0.22, {vol: 0.07});
}
