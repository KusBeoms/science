// 라이벌 도둑 시스템: 기지에 침입해 다 큰 행성을 훔쳐 달아난다
import {S, save, freeSlot} from '../core/state.js';
import {G} from '../core/runtime.js';
import {dist2, rnd, eul} from '../core/util.js';
import {slotPos} from '../core/geometry.js';
import {P} from '../data/planets.js';
import {animateWalk} from '../render/characters.js';
import {toast} from '../game/hud.js';
import type {GameSystem} from '../core/types.js';

const FAR = 140;
function updateRival(dt: number) {
  const rival = G.rival,
    me = G.me;
  G.raidT -= dt;
  if (rival.state === 'off') {
    if (G.raidT <= 0) {
      const has = S.base.map((o, i) => (o && o.left <= 0 && i < S.slots ? i : -1)).filter(i => i >= 0);
      if (has.length >= 2) {
        rival.sd = Math.random() < 0.5 ? -1 : 1;
        rival.position.set(rival.sd * FAR, 0, rnd(-6, 16)); // 도시 가장자리에서 출발
        rival.visible = true;
        rival.state = 'in';
        rival.slot = has[Math.floor(rnd(0, has.length))];
        const sp0 = slotPos(rival.slot);
        rival.approach = Math.hypot(sp0.x - rival.position.x, sp0.z - rival.position.z) / 30; // 도착까지 약 30초
        rival.t = 0;
        rival.stolen = null;
        toast('라이벌이 기지에 접근 중입니다');
      } else G.raidT = 15;
    }
    return;
  }
  const rp = rival.position;
  if (rival.state === 'in') {
    const o = S.base[rival.slot];
    if (!o) {
      rival.state = 'out';
      return;
    }
    const sp = slotPos(rival.slot),
      dx = sp.x - rp.x,
      dz = sp.z - rp.z,
      d = Math.hypot(dx, dz);
    if (d > 2) {
      const sp2 = rival.approach || 9; // 멀리서 약 30초에 걸쳐 걸어온다
      rp.x += (dx / d) * sp2 * dt;
      rp.z += (dz / d) * sp2 * dt;
      rival.rotation.y = Math.atan2(dx, dz);
      animateWalk(rival, (performance.now() / 1000) * 3);
    } else if ((rival.t += dt) > 2) {
      rival.stolen = o;
      S.base[rival.slot] = null;
      rival.state = 'flee';
      toast(`${eul(P[o.id].name)} 빼앗기고 있습니다. 추격하세요`);
    }
    if (dist2(rp, me.pos) < 2.2) {
      rival.state = 'out';
      toast('침입을 막아냈습니다');
    }
  }
  if (rival.state === 'flee' || rival.state === 'out') {
    rp.x += rival.sd * 12 * dt;
    rival.rotation.y = Math.atan2(rival.sd, 0);
    animateWalk(rival, (performance.now() / 1000) * 3);
    if (rival.state === 'flee' && dist2(rp, me.pos) < 2.4) {
      const i = S.base[rival.slot] ? freeSlot() : rival.slot;
      if (i >= 0) S.base[i] = rival.stolen;
      rival.stolen = null;
      rival.state = 'out';
      toast('되찾았습니다');
      save();
    }
    if (Math.abs(rp.x) > FAR) {
      if (rival.stolen) toast(`${eul(P[rival.stolen.id].name)} 빼앗겼습니다`);
      rival.visible = false;
      rival.state = 'off';
      G.raidT = rnd(1100, 1300); // 약 20분에 한 번
      save();
    }
  }
}
export const rivalSystem: GameSystem = {id: 'rival', update: updateRival};
