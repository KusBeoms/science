// 시작 연출(글 없음): 지구에서 로켓이 날아 달에 내린다 → 달 구역(S1) 해금 + 달 포탈 패드에서 게임 시작. 달은 도시와 떨어진 섬 — 패드의 포탈로 도시에 간다(해금 불필요).
// 새 게임(처음 컷신을 안 본 세이브)에서만 자동 재생, 클릭/Space/Esc 로 건너뛴다. ?cine=0 이면 재생하지 않는다(E2E).
import {G} from '../core/runtime.js';
import {S, save} from '../core/state.js';
import {padPos} from '../core/geometry.js';
import {groundH} from '../core/terrain.js';
import {unlockSector} from '../core/progress.js';
import {SECTORS} from '../data/sectors.js';
import {toast} from './hud.js';

const DUR = 9000;
let running = false;

/** 달에서 시작: 첫 구역 해금 + 그 구역의 포탈 패드 + 플레이어를 패드 옆에 세운다 */
export function startOnMoon() {
  unlockSector(0);
  S.portals[SECTORS[0].id] = 1;
  const p = padPos(0);
  G.me.pos.set(p.x, groundH(p.x, p.z), p.z + 4);
  G.me.vy = 0;
  G.yaw = 0;
  toast('도시로 가려면 포탈 패드에서 E를 누르세요', 3.5); // 도시로 가는 길은 포탈뿐 — 패드에서 E
  save();
}

export const moonIntroDone = () => !!S.unlocked[SECTORS[0].id];

export function playMoonIntro(done: () => void) {
  if (running) return;
  running = true;
  G.modal = 'moonintro';
  const el = document.createElement('div');
  el.id = 'moonintro';
  el.innerHTML = '<i class="mi-earth">🌍</i><i class="mi-rocket">🚀</i><i class="mi-moon">🌙</i><i class="mi-dust">💨</i>';
  document.body.append(el);
  let fin = false;
  const end = () => {
    if (fin) return;
    fin = true;
    removeEventListener('keydown', onKey, true);
    el.remove();
    G.modal = null;
    running = false;
    startOnMoon();
    done();
  };
  const onKey = (e: KeyboardEvent) => {
    if (['Space', 'Escape', 'Enter'].includes(e.code)) {
      e.preventDefault();
      e.stopPropagation();
      end();
    }
  };
  addEventListener('keydown', onKey, true);
  el.onclick = end;
  setTimeout(end, DUR);
}
