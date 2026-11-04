// 컷신 시스템: 매 프레임 타임라인 진행 + 첫 실행 C01 자동 재생(S.story.seen 으로 1회) + 건너뛰기 입력(⏭ 버튼 / Space·Enter·Esc)
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {$} from '../core/util.js';
import {cineActive, playCut, skipCut, skipPress, tickCut} from '../game/cutscene.js';
import {addHudWidget, iconToast} from '../game/hud.js';
import type {GameSystem} from '../core/types.js';

const skipBtn = $('#cineSkip'),
  AUTO = new URLSearchParams(location.search).get('cine') !== '0'; // ?cine=0 : 자동 재생 끔(QA·E2E)
skipBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  skipPress(true);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => skipBtn.addEventListener(t, () => skipPress(false)));
// 입력 잠금 컷신 중에는 키가 게임에 새지 않게 먼저 가로챈다. 오버레이는 Space 가 점프이므로 Enter/Esc 만 건너뛰기
const skipKey = (e: KeyboardEvent) => (G.cine?.lock ? ['Space', 'Enter', 'Escape'] : ['Enter', 'Escape']).includes(e.code);
addEventListener(
  'keydown',
  e => {
    if (!G.cine) return;
    if (G.cine.lock) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
    if (!e.repeat && skipKey(e)) skipPress(true);
  },
  true
);
addEventListener(
  'keyup',
  e => {
    if (G.cine && skipKey(e)) skipPress(false);
  },
  true
);
let hooked = false;
export const cutsceneSystem: GameSystem = {
  id: 'cutscene',
  update(_dt, raw) {
    tickCut(raw);
    if (AUTO && G.started && !G.cine && !S.story.seen.c01_love) playCut('c01_love');
    if (!hooked) {
      hooked = true; // ?debug=1 일 때만: __game.cine.play('id') / skip() / iconToast([...]) / addHudWidget(fn)
      const g = (window as any).__game;
      if (g) g.cine = {play: playCut, skip: skipCut, active: cineActive, iconToast, addHudWidget};
    }
  },
};
