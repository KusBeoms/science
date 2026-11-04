// sfx(name) 단일 진입점: 이름 → 합성 함수. 컨텍스트 미개방(첫 입력 전)·음소거면 조용히 무시
import {audioCtx, bus, prefs} from './ctx.js';
import {CUE} from './sfx-cue.js';
import {GAME} from './sfx-game.js';
import {route} from './synth.js';

export type SfxName = keyof typeof GAME | keyof typeof CUE;
const LIB: Record<string, (t: number) => void> = {...GAME, ...CUE},
  GAP: Partial<Record<SfxName, number>> = {step: 0.1, jump: 0.15}, // 같은 소리 최소 간격(초): 연타 소음 방지
  last: Partial<Record<SfxName, number>> = {};

export function sfx(name: SfxName) {
  const ac = audioCtx(),
    fn = LIB[name]; // 컷신 데이터가 모르는 이름을 넘겨도 에러 없이 무시
  if (!ac || !fn || prefs.mute || ac.state !== 'running') return;
  if (ac.currentTime - (last[name] ?? -9) < (GAP[name] ?? 0.04)) return;
  last[name] = ac.currentTime;
  route.out = name in CUE ? bus.sfx : bus.world;
  fn(ac.currentTime + 0.005);
}
/** 컷신 중 월드 효과음 −12dB (UX_CUTSCENE 6.1 믹싱). 컷신 큐·BGM 은 영향 없음 */
export function duck(on: boolean) {
  const ac = audioCtx();
  if (ac) bus.world.gain.setTargetAtTime(on ? 0.25 : 1, ac.currentTime, 0.08);
}
