// 둥지/기지 슬롯의 행성 메시를 상태(nests, S.base)와 동기화
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {nests, nestPos} from '../core/layout.js';
import {slotPos} from '../core/geometry.js';
import {GROW, P} from '../data/planets.js';
import {makePlanet, freePlanet} from './textures.js';

export function syncPlanets(t: number) {
  nests.forEach((n, zi) =>
    n.s.forEach((id, k) => {
      const m = G.nestMesh[zi][k],
        empty = n.t[k] > 0;
      if (empty && m.grp) {
        G.scene.remove(m.grp);
        freePlanet(m.grp);
        m.grp = null;
        m.id = -1;
      }
      if (!empty && m.id !== id) {
        if (m.grp) {
          G.scene.remove(m.grp);
          freePlanet(m.grp);
        }
        m.grp = makePlanet(id);
        m.id = id;
        G.scene.add(m.grp);
      }
      if (m.grp) {
        const p = nestPos(zi, k),
          r = m.grp.userData.r;
        m.grp.scale.setScalar(r);
        m.grp.position.set(p.x, (p.kind === 'orbit' ? 2.6 : 1.3) + r + Math.sin(t * 1.5 + k) * 0.15, p.z);
        m.grp.rotation.y = t * (p.kind === 'orbit' ? 0.9 : 0.5);
        m.grp.userData.pick = {kind: 'nest', z: zi, k};
      }
    })
  );
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
