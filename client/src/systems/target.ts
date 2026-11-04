// 상호작용 대상 탐색(game/interactables.ts 레지스트리) + 하단 정보/프롬프트 표시
import {G, paused} from '../core/runtime.js';
import {$} from '../core/util.js';
import {findTarget, interactableOf} from '../game/interactables.js';

export function updateTarget(raw: number) {
  if (G.pickOv && (G.pickOv.t -= raw) <= 0) G.pickOv = null;
  const target = findTarget(G.me);
  G.target = target;
  const inf = $('#info'),
    pr = $('#prompt'),
    it = target && interactableOf(target.kind);
  if (target && it && !paused()) {
    pr.style.display = 'block';
    pr.classList.toggle('off', !!(it.off && it.off(target)));
    inf.style.display = 'block';
    inf.innerHTML = it.info(target);
    pr.textContent = it.prompt(target);
  } else {
    inf.style.display = 'none';
    pr.style.display = 'none';
  }
}
