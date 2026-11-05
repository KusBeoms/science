// 로드된 섹터만: 수호자 AI (자기 섹터에 들어온 플레이어를 쫓는다)
import {G} from '../core/runtime.js';
import {clamp, dist2} from '../core/util.js';
import {inSector} from '../core/geometry.js';
import {heightAt} from '../core/heightmap.js';
import {locked} from '../core/progress.js';
import {SECTORS} from '../data/sectors.js';
import {animateWalk} from '../render/characters.js';
import {caught} from '../game/actions.js';

export function updateGuardians(dt: number, t: number) {
  G.chunks.forEach((c, i) => {
    if (!c) return;
    const s = SECTORS[i],
      lk = locked(i);
    const g = c.guard,
      gp = g.m.position,
      h = s.size / 2,
      sp = s.guard.speed;
    g.chase = !lk && inSector(G.me.pos.x, G.me.pos.z, i, 3); // 행성 유무와 상관없이, 자기 섹터에 들어온 플레이어를 쫓는다
    const tg = g.chase ? G.me.pos : g.home,
      dx = tg.x - gp.x,
      dz = tg.z - gp.z,
      d = Math.hypot(dx, dz);
    if (d > 0.8 && dt > 0) {
      gp.x = clamp(gp.x + (dx / d) * sp * dt, s.center.x - h + 1, s.center.x + h - 1);
      gp.z = clamp(gp.z + (dz / d) * sp * dt, s.center.z - h + 1, s.center.z + h - 1);
      g.m.rotation.y = Math.atan2(dx, dz);
      animateWalk(g.m, t * sp * 0.22);
    } else if (d <= 0.8) animateWalk(g.m, 0);
    gp.y = heightAt(gp.x, gp.z); // 기복 위를 걷는다
    const gu = g.m.userData,
      hot = new THREE.Color(s.guard.glow).lerp(new THREE.Color(0xffffff), g.chase ? 0.55 : 0);
    gu.eyes.color.copy(hot);
    gu.glow.color.copy(hot);
    gu.aura.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.06);
    gu.aura.material.opacity = g.chase ? 0.9 : 0.5;
    if (g.chase && dist2(G.me.pos, gp) < 3 && G.me.pos.y - gp.y < 3.2 && dt > 0) caught();
  });
}
