// 섹터 청크 스트리밍: 플레이어가 가까울 때만 섹터의 타일·항성·문·수호자·둥지 행성 메시를 만들고, 멀어지면 해제한다
import {G} from '../core/runtime.js';
import {layoutOf, nests, nestPos} from '../core/layout.js';
import {gateFrame, sectorDist} from '../core/geometry.js';
import {SECTORS} from '../data/sectors.js';
import {makeGuardian} from './guardian.js';
import {checkerTex, freePlanet, freeTree, label, makePlanet} from './textures.js';
import type {Chunk} from '../core/types.js';

/** 섹터 사각형까지 이 거리 안이면 로드, UNLOAD 밖이면 해제 (사이 구간은 유지 — 경계에서 깜빡임 방지) */
export const LOAD = 140,
  UNLOAD = 180;
/** 정사각형 타일 (바닥 + 테두리) 을 parent 에 추가하고 바닥 메시를 돌려준다 */
export function tile(parent: any, cx: number, cz: number, a: string, b: string, edge: number, sz: number) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(sz, 0.6, sz),
    new THREE.MeshLambertMaterial({map: checkerTex(a, b, sz / 4)})
  );
  m.position.set(cx, -0.3, cz);
  parent.add(m);
  const e = new THREE.Mesh(
    new THREE.BoxGeometry(sz + 0.5, 0.5, sz + 0.5),
    new THREE.MeshLambertMaterial({color: edge})
  );
  e.position.set(cx, -0.85, cz);
  parent.add(e);
  return m;
}
function addStars(grp: any, i: number) {
  layoutOf(i, G.gameT).stars.forEach(st => {
    // 항성(또는 블랙홀) + 궤도선 + 이름표
    const gs = new THREE.Group(),
      y = st.R + 2;
    if (st.bh) {
      gs.add(new THREE.Mesh(new THREE.SphereGeometry(st.R, 32, 16), new THREE.MeshBasicMaterial({color: 0})));
      const dk = new THREE.Mesh(
        new THREE.RingGeometry(st.R + 1.5, st.R + 6, 64),
        new THREE.MeshBasicMaterial({color: st.c[0], side: THREE.DoubleSide, transparent: true, opacity: 0.85})
      );
      dk.rotation.x = Math.PI / 2.3;
      gs.add(dk);
    } else {
      gs.add(new THREE.Mesh(new THREE.SphereGeometry(st.R, 28, 18), new THREE.MeshBasicMaterial({color: st.c[0]})));
      const hl = new THREE.Mesh(
        new THREE.SphereGeometry(st.R * 1.45, 20, 14),
        new THREE.MeshBasicMaterial({color: st.c[1], transparent: true, opacity: 0.2, depthWrite: false})
      );
      gs.add(hl);
    }
    gs.position.set(st.x, y, st.z);
    grp.add(gs);
    const nl = label(st.n, '#ffe9b0', 9);
    nl.position.set(st.x, y + st.R + 3, st.z);
    grp.add(nl);
    for (let k = 0; k < st.orb; k++) {
      const r = st.R + 6 + k * 2.4,
        rg = new THREE.Mesh(
          new THREE.RingGeometry(r - 0.08, r + 0.08, 72),
          new THREE.MeshBasicMaterial({color: st.c[0], transparent: true, opacity: 0.28, side: THREE.DoubleSide})
        );
      rg.rotation.x = -Math.PI / 2;
      rg.position.set(st.x, 0.06, st.z);
      grp.add(rg);
    }
  });
}
/** 문(아치): 섹터의 입구 변 */
function makeGate(grp: any, i: number) {
  const s = SECTORS[i],
    f = gateFrame(i),
    w = s.size,
    g = new THREE.Group(),
    pm = new THREE.MeshLambertMaterial({color: 0x8a93a8}),
    pl1 = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 2), pm),
    pl2 = pl1.clone(),
    bm = new THREE.Mesh(new THREE.BoxGeometry(w, 2, 2), pm);
  pl1.position.set(-w / 2 + 1, 5, 0);
  pl2.position.set(w / 2 - 1, 5, 0);
  bm.position.set(0, 10, 0);
  g.add(pl1, pl2, bm);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 4, 9),
    new THREE.MeshBasicMaterial({
      color: 0xff3355,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  panel.position.set(0, 4.5, 0);
  g.add(panel);
  const gl = label('', '#ff8aa0', 16);
  gl.position.set(0, 12.5, 0);
  g.add(gl);
  g.position.set(f.x, 0, f.z);
  if (f.lz) g.rotation.y = Math.PI / 2;
  g.userData.pick = {kind: 'gate', i};
  grp.add(g);
  return {grp: g, panel, gl};
}
function buildChunk(i: number): Chunk {
  const s = SECTORS[i],
    {x, z} = s.center,
    grp = new THREE.Group();
  tile(grp, x, z, s.floor[0], s.floor[1], 0x10141f, s.size);
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(s.size + 0.2, 0.1, s.size + 0.2),
    new THREE.MeshBasicMaterial({color: s.rim, wireframe: true})
  );
  rim.position.set(x, 0.02, z);
  grp.add(rim);
  const f = gateFrame(i),
    lt = label(`${i + 1}단계 · ${s.icon} ${s.name}`, '#ffffff', 14);
  lt.position.set(x + f.ix * (s.size / 2 - 3), 9, z + f.iz * (s.size / 2 - 3)); // 문 반대편 끝
  grp.add(lt);
  addStars(grp, i);
  const gd = makeGuardian(s.guard.glow);
  gd.position.set(x, 0, z);
  grp.add(gd);
  const gate = makeGate(grp, i);
  G.scene.add(grp);
  return {
    grp,
    gate,
    guard: {m: gd, chase: false, home: new THREE.Vector3(x, 0, z)},
    nest: nests[i]!.s.map(() => ({id: -1, grp: null})),
  };
}
function freeChunk(c: Chunk) {
  c.nest.forEach(m => {
    if (m.grp) {
      c.grp.remove(m.grp);
      freePlanet(m.grp); // 공유 지오메트리·캐시 텍스처는 freeTree 가 지우면 안 되므로 먼저 떼어 낸다
    }
  });
  G.scene.remove(c.grp);
  freeTree(c.grp);
}
/** 거리 기준 로드/해제. 프레임당 최대 1개만 새로 만든다 (끊김 방지) */
export function streamSectors() {
  const p = G.me.pos;
  let built = false;
  SECTORS.forEach((_, i) => {
    const d = sectorDist(p.x, p.z, i),
      c = G.chunks[i];
    if (!c && d < LOAD && !built) {
      G.chunks[i] = buildChunk(i);
      built = true;
    } else if (c && d > UNLOAD) {
      freeChunk(c);
      G.chunks[i] = null;
    }
  });
}
/** 로드된 섹터의 둥지 행성 메시를 nests 상태와 동기화 */
export function syncNests(t: number) {
  G.chunks.forEach((c, i) => {
    if (!c) return;
    const n = nests[i]!;
    n.s.forEach((id, k) => {
      const m = c.nest[k],
        empty = n.t[k] > 0;
      if (empty && m.grp) {
        c.grp.remove(m.grp);
        freePlanet(m.grp);
        m.grp = null;
        m.id = -1;
      }
      if (!empty && m.id !== id) {
        if (m.grp) {
          c.grp.remove(m.grp);
          freePlanet(m.grp);
        }
        m.grp = makePlanet(id);
        m.id = id;
        c.grp.add(m.grp);
      }
      if (m.grp) {
        const p = nestPos(i, k),
          r = m.grp.userData.r;
        m.grp.scale.setScalar(r);
        m.grp.position.set(p.x, (p.kind === 'orbit' ? 2.6 : 1.3) + r + Math.sin(t * 1.5 + k) * 0.15, p.z);
        m.grp.rotation.y = t * (p.kind === 'orbit' ? 0.9 : 0.5);
        m.grp.userData.pick = {kind: 'nest', z: i, k};
      }
    });
  });
}
