// 라이벌 도둑: 기지에 침입해 다 큰 행성을 훔쳐 달아난다
import {S, save, freeSlot} from '../core/state.js';
import {G} from '../core/runtime.js';
import {dist2, rnd} from '../core/util.js';
import {slotPos} from '../core/geometry.js';
import {H} from '../data/zones.js';
import {P} from '../data/planets.js';
import {animateWalk} from '../render/characters.js';
import {toast} from '../game/hud.js';

export function updateRival(dt: number) {
  const rival = G.rival,
    me = G.me;
  G.raidT -= dt;
  if (rival.state === 'off') {
    if (G.raidT <= 0) {
      const has = S.base.map((o, i) => (o && o.left <= 0 && i < S.slots ? i : -1)).filter(i => i >= 0);
      if (has.length >= 2) {
        rival.sd = Math.random() < 0.5 ? -1 : 1;
        rival.position.set(rival.sd * (H - 2), 0, rnd(-6, 16));
        rival.visible = true;
        rival.state = 'in';
        rival.slot = has[Math.floor(rnd(0, has.length))];
        rival.t = 0;
        rival.stolen = null;
        toast('라이벌 침입! 막아라!');
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
      rp.x += (dx / d) * 9 * dt;
      rp.z += (dz / d) * 9 * dt;
      rival.rotation.y = Math.atan2(dx, dz);
      animateWalk(rival, (performance.now() / 1000) * 3);
    } else if ((rival.t += dt) > 2) {
      rival.stolen = o;
      S.base[rival.slot] = null;
      rival.state = 'flee';
      toast(`${P[o.id].name} 도둑맞는 중! 잡아라!`);
    }
    if (dist2(rp, me.pos) < 2.2) {
      rival.state = 'out';
      toast('막았다!');
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
      toast('되찾았다!');
      save();
    }
    if (Math.abs(rp.x) > H - 0.5) {
      if (rival.stolen) toast(`${P[rival.stolen.id].name}을(를) 도둑맞았다`);
      rival.visible = false;
      rival.state = 'off';
      G.raidT = rnd(40, 70);
      save();
    }
  }
}
