// 기지 슬롯의 행성 메시를 S.base 와 동기화 (둥지 행성은 render/sectors.ts 의 syncNests)
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {slotPos} from '../core/geometry.js';
import {P} from '../data/planets.js';
import {GROW} from '../data/pacing.js';
import {makePlanet, freePlanet} from './textures.js';

export function syncBase(t: number) {
  G.baseMesh.forEach((m, i) => {
    const o = i < S.slots ? S.base[i] : null;
    m.ped.visible = i < S.slots;
    if (!o) {
      if (m.grp) {
        G.scene.remove(m.grp);
        freePlanet(m.grp);
        m.grp = null;
        m.id = -1;
      }
      return;
    }
    if (m.id !== o.id || m.mut !== o.mut) {
      if (m.grp) {
        G.scene.remove(m.grp);
        freePlanet(m.grp);
      }
      m.grp = makePlanet(o.id);
      m.id = o.id;
      m.mut = o.mut;
      G.scene.add(m.grp);
    } // 같은 행성이라도 돌연변이가 바뀌면 재질을 새로 만든다
    const pr = 1 - Math.max(0, o.left) / GROW[P[o.id].t],
      r = m.grp.userData.r * (0.35 + 0.65 * pr) * (o.mut === 2 ? 1.4 : 1);
    const mat = m.grp.userData.mat;
    mat.color.setScalar(0.35 + 0.65 * pr);
    if (o.mut === 1) {
      mat.emissive.set(0xff5a1a);
      mat.emissiveIntensity = 0.5;
    } else if (o.mut === 2) {
      mat.emissive.set(0x9a4aff);
      mat.emissiveIntensity = 0.4;
    }
    const p = slotPos(i);
    m.grp.scale.setScalar(r);
    m.grp.position.set(p.x, 0.8 + r + 0.5 + Math.sin(t * 1.5 + i) * 0.15, p.z);
    m.grp.rotation.y = t * 0.5;
    m.grp.userData.pick = {kind: 'base', i};
  });
}
