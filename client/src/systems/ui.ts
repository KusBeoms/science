// DOM 버튼 바인딩: 퀴즈·상점·도감·메뉴·행동 프롬프트
import {S, clearSave} from '../core/state.js';
import {G} from '../core/runtime.js';
import {$} from '../core/util.js';
import {closeQuiz, nextQ} from '../game/quiz.js';
import {act} from '../game/actions.js';
import {interactableOf} from '../game/interactables.js';
import {closeShop, openShop} from '../game/shop-ui.js';
import {toggleDex} from '../game/dex.js';

export function startGame() {
  G.started = true;
  $('#menu').classList.remove('on');
}

export function bindUI() {
  $('#qx').onclick = () => closeQuiz(false);
  $('#qn').onclick = nextQ;
  $('#prompt').addEventListener('pointerdown', e => {
    e.preventDefault();
    const it = G.target && interactableOf(G.target.kind);
    if (it) act(it.tapKey || 'e');
  });
  $('#sx').onclick = closeShop;
  $('#shopBtn').onclick = e => {
    (e.target as HTMLElement).blur();
    G.shopOpen ? closeShop() : openShop();
  };
  $('#dexBtn').onclick = e => {
    (e.target as HTMLElement).blur();
    toggleDex(!G.dexOpen);
  };
  $('#dclose').onclick = () => toggleDex(false);
  $('#mstart').onclick = startGame;
  $('#mnew').onclick = () => {
    if (S.stolen || S.cr > 10 || S.zone) {
      if (!confirm('저장된 진행이 사라집니다. 새로 시작할까요?')) return;
    }
    G.resetting = true;
    clearSave();
    clearInterval(G.saveI);
    location.reload();
  };
  if (S.stolen || S.zone || S.bought || S.cr > 10) $('#mstart').textContent = '▶ 이어하기';
}
