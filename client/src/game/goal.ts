// "다음 목표" HUD 한 줄: 다음에 열 구역의 이름·부족한 조건·방향/거리. 구역이 어떻게 해금되는지 보이게 한다.
// 조건은 core/progress.ts 의 reqMissing 이 정한다(이 파일은 보여 주기만 한다).
import {G} from '../core/runtime.js';
import {gateFrame} from '../core/geometry.js';
import {isNext, reqMissing} from '../core/progress.js';
import {SECTORS} from '../data/sectors.js';
import {addHudLine} from './hud.js';

const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

/** 지금 열 수 있는(바로 앞 단계가 열려 있는) 첫 잠긴 구역의 번호, 없으면 −1 */
export const nextGoal = () => SECTORS.findIndex((_, i) => isNext(i));

addHudLine(() => {
  if (G.inside) return null;
  const i = nextGoal();
  if (i < 0) return null;
  const s = SECTORS[i],
    f = gateFrame(i),
    dx = f.x - G.me.pos.x,
    dz = f.z - G.me.pos.z,
    arrow = ARROWS[Math.round((Math.atan2(dx, -dz) / (Math.PI / 4) + 8) % 8) % 8], // 위쪽 = 정북(−z)
    miss = reqMissing(i);
  return `🔓 ${s.icon} ${s.name} ${arrow} ${Math.round(Math.hypot(dx, dz))}m — ${miss.length ? '필요: ' + miss.join(' · ') : '문 앞에서 E — 입장 시험'}`;
});
