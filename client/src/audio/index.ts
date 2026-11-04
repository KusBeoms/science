// 오디오 어댑터: 게임/컷신 디렉터는 여기서만 import 한다 (모듈 `sfx`, 전역 `window.sfx` / `window.gameAudio`)
import {onPrefs, prefs, setMute, setVolume, toggleMute} from './ctx.js';
import {playBgm, type BgmMood} from './bgm.js';
import {duck, sfx, type SfxName} from './sfx.js';

export type {BgmMood, SfxName};
export {duck, onPrefs, prefs, setMute, setVolume, sfx, toggleMute};

type Manual = BgmMood | 'none' | null;
let manual: Manual = null,
  auto: BgmMood = 'hub';
const sync = () => playBgm(manual === 'none' ? null : manual ?? auto);
/** 컷신/연출이 BGM 을 직접 지정 ('none' = 무음, null = 자동 선택으로 복귀) */
export function setBgm(m: Manual) {
  manual = m;
  sync();
}
/** systems/audio.ts 의 상황 기반 자동 선택 (setBgm 으로 지정돼 있으면 무시됨) */
export function autoBgm(m: BgmMood) {
  auto = m;
  sync();
}
declare global {
  interface Window {
    sfx: typeof sfx;
    gameAudio: {sfx: typeof sfx; duck: typeof duck; setBgm: typeof setBgm; setMute: typeof setMute; setVolume: typeof setVolume};
  }
}
window.sfx = sfx;
window.gameAudio = {sfx, duck, setBgm, setMute, setVolume};
