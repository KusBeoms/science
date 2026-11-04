// 기지 꾸미기(바닥·발판·울타리·깃발·장식물·조명) 적용
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {DECO} from '../data/shop.js';
import {TS, H} from '../data/sectors.js';
import {checkerTex, freeTree} from './textures.js';

export function applyDeco() {
  const {baseFloor, baseMesh, scene} = G;
  let decoGrp = G.decoGrp;
  const D = S.deco,
    fl = DECO.floor.v[D.floor];
  if (baseFloor.material.map) baseFloor.material.map.dispose();
  baseFloor.material.map = checkerTex(fl[1], fl[2] as string, TS / 4);
  baseFloor.material.needsUpdate = true;
  baseMesh.forEach(m => m.ped.material.color.set(DECO.ped.v[D.ped][1]));
  scene.remove(decoGrp);
  freeTree(decoGrp);
  decoGrp = G.decoGrp = new THREE.Group();
  scene.add(decoGrp);
  const lam = (c: number | string) => new THREE.MeshLambertMaterial({color: c}),
    add = (m: any, x: number, y: number, z: number) => {
      m.position.set(x, y, z);
      decoGrp.add(m);
      return m;
    };
  const bx = (w: number, h: number, d: number, c: number | string) =>
      new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c)),
    cyl = (r: number, h: number, c: number | string, s?: number) =>
      new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, s || 10), lam(c));
  // 울타리 (서·동·남쪽 가장자리. 막지는 않는다)
  if (D.fence) {
    const col = DECO.fence.v[D.fence][1],
      neon = D.fence === 4,
      mk = (w: number, h: number, d: number) =>
        neon
          ? new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({color: col}))
          : bx(w, h, d, col);
    [
      [-1, 0],
      [1, 0],
    ].forEach(([sx]) => {
      add(mk(0.3, 0.3, TS), sx * (H - 0.3), 0.9, 0);
      for (let z = -H + 2; z <= H - 2; z += 4) add(mk(0.4, 1.4, 0.4), sx * (H - 0.3), 0.7, z);
    });
    add(mk(TS, 0.3, 0.3), 0, 0.9, H - 0.3);
    for (let x = -H + 2; x <= H - 2; x += 4) add(mk(0.4, 1.4, 0.4), x, 0.7, H - 0.3);
  }
  // 깃발
  if (D.flag) {
    add(cyl(0.12, 7, 0xcccccc, 6), 18, 3.5, -18);
    const fg = bx(2.6, 1.6, 0.1, DECO.flag.v[D.flag][1]);
    add(fg, 19.3, 6.2, -18);
  }
  // 장식물
  if (D.prop) {
    const gp = new THREE.Group(),
      px = 12,
      pz = -15;
    if (D.prop === 1) {
      gp.add(Object.assign(cyl(0.5, 2.4, 0x6a4a2a), {position: new THREE.Vector3(0, 1.2, 0)}));
      [
        [0, 3.4, 2.2],
        [0, 5.2, 1.6],
      ].forEach(([x, y, r]) => {
        const c = new THREE.Mesh(new THREE.ConeGeometry(r, 2.6, 10), lam(0x3c8f48));
        c.position.set(x, y, 0);
        gp.add(c);
      });
    }
    if (D.prop === 2) {
      const b = cyl(0.9, 5, 0xf2f2f2, 12);
      b.position.y = 3.2;
      gp.add(b);
      const n = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 12), lam(0xe84a5f));
      n.position.y = 6.5;
      gp.add(n);
      [0, 2.1, 4.2].forEach(a => {
        const f = bx(0.2, 1.6, 1.4, 0xe84a5f);
        f.position.set(Math.sin(a) * 1.1, 1.3, Math.cos(a) * 1.1);
        f.rotation.y = a;
        gp.add(f);
      });
    }
    if (D.prop === 3) {
      [0, 2.1, 4.2].forEach(a => {
        const l = cyl(0.08, 3, 0x555555, 5);
        l.position.set(Math.sin(a) * 0.7, 1.4, Math.cos(a) * 0.7);
        l.rotation.z = Math.sin(a) * 0.3;
        l.rotation.x = Math.cos(a) * 0.3;
        gp.add(l);
      });
      const t = cyl(0.5, 3.2, 0x7cc4ff, 10);
      t.position.set(0, 3.4, 0);
      t.rotation.z = 0.9;
      gp.add(t);
    }
    if (D.prop === 4) {
      [
        [-1, 0xff6fae],
        [0, 0xffd24a],
        [1, 0x4a8cff],
      ].forEach(([o, c], i) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), lam(c));
        s.scale.y = 1.2;
        s.position.set(o * 1.3, 5 + (i % 2) * 0.8, 0);
        gp.add(s);
        const st = cyl(0.03, 4, 0xdddddd, 3);
        st.position.set(o * 1.3, 2.6, 0);
        gp.add(st);
      });
    }
    if (D.prop === 5) {
      const bm = lam(0xa9763c);
      [
        [0, 1.4, 0, 1.2],
        [0, 3, 0, 0.9],
      ].forEach(([x, y, z, r]) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), bm);
        s.position.set(x, y, z);
        gp.add(s);
      });
      [-0.7, 0.7].forEach(x => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bm);
        e.position.set(x, 3.8, 0);
        gp.add(e);
      });
    }
    if (D.prop === 6) {
      const c = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.4),
        new THREE.MeshLambertMaterial({color: 0x43ffd9, emissive: 0x127a68})
      );
      c.scale.y = 1.8;
      c.position.y = 3;
      gp.add(c);
      decoGrp.userData.spin = c;
    }
    gp.position.set(px, 0, pz);
    decoGrp.add(gp);
  }
  // 조명 (네 모서리)
  if (D.light) {
    const col = DECO.light.v[D.light][1];
    [
      [-20, -20],
      [20, -20],
      [-20, 20],
      [20, 20],
    ].forEach(([x, z]) => {
      if (D.light === 4) {
        const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshBasicMaterial({color: col}));
        add(s, x, 7, z);
      } else {
        add(cyl(0.15, 6, 0x333333, 6), x, 3, z);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({color: col})), x, 6.3, z);
      }
    });
  }
}
