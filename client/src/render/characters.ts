// 블록형 캐릭터(플레이어·점원·라이벌), 걷기 애니메이션, 캐릭터 꾸미기 적용
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {LOOK} from '../data/shop.js';

export function blocky(shirt: number | string, pants: number | string, skin: string, big?: number, hat?: number): any {
  const g = new THREE.Group(),
    L = (c: any) => new THREE.MeshLambertMaterial({color: c});
  const box = (w: number, h: number, d: number, m: any, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  };
  const fc = document.createElement('canvas');
  fc.width = fc.height = 64;
  const f = fc.getContext('2d')!;
  f.fillStyle = skin;
  f.fillRect(0, 0, 64, 64);
  f.fillStyle = '#111';
  f.fillRect(18, 20, 6, 10);
  f.fillRect(40, 20, 6, 10);
  f.lineWidth = 4;
  f.strokeStyle = '#111';
  f.beginPath();
  f.arc(32, 36, 12, 0.2, Math.PI - 0.2);
  f.stroke();
  const sk = L(skin),
    fm = new THREE.MeshLambertMaterial({map: new THREE.CanvasTexture(fc)});
  const parts: any = {},
    mShirt = L(shirt),
    mPants = L(pants);
  parts.mat = {shirt: mShirt, pants: mPants, sk, fm, f};
  parts.legL = box(0.9, 2, 0.9, mPants, -0.5, 1, 0);
  parts.legR = box(0.9, 2, 0.9, mPants, 0.5, 1, 0);
  parts.legL.geometry.translate(0, -1, 0);
  parts.legR.geometry.translate(0, -1, 0);
  parts.legL.position.y = 2;
  parts.legR.position.y = 2;
  box(2, 2, 1, mShirt, 0, 3, 0);
  parts.armL = box(0.9, 2, 0.9, sk, -1.45, 3, 0);
  parts.armR = box(0.9, 2, 0.9, sk, 1.45, 3, 0);
  parts.armL.geometry.translate(0, -0.8, 0);
  parts.armR.geometry.translate(0, -0.8, 0);
  parts.armL.position.y = 3.8;
  parts.armR.position.y = 3.8;
  parts.headG = new THREE.Group();
  parts.headG.position.set(0, 5, 0);
  g.add(parts.headG);
  box(1.6, 1.6, 1.6, [sk, sk, sk, sk, fm, sk], 0, 5, 0);
  if (hat) {
    box(1.8, 0.35, 1.8, L(hat), 0, 5.95, 0);
    box(1.2, 0.9, 1.2, L(hat), 0, 6.5, 0);
  }
  g.scale.setScalar(big || 0.55);
  g.userData = parts;
  return g;
}
export const animateWalk = (m: any, ph: number, hold?: boolean) => {
  const p = m.userData,
    s = Math.sin(ph * 4) * 0.9;
  p.legL.rotation.x = s;
  p.legR.rotation.x = -s;
  if (hold) {
    p.armL.rotation.x = p.armR.rotation.x = -1.35;
  } else {
    p.armL.rotation.x = -s;
    p.armR.rotation.x = s;
  }
};

// 캐릭터 꾸미기 적용
export function applyLook() {
  const me = G.me;
  if (!me) return;
  const p = me.userData,
    m = p.mat,
    Lk = S.look,
    V = (k: string) => LOOK[k].v[Lk[k]] || LOOK[k].v[0];
  m.shirt.color.set(V('shirt')[1]);
  m.pants.color.set(V('pants')[1]);
  const skin = V('skin')[1];
  m.sk.color.set(skin);
  m.f.fillStyle = skin;
  m.f.fillRect(0, 0, 64, 64);
  m.f.fillStyle = '#111';
  m.f.fillRect(18, 20, 6, 10);
  m.f.fillRect(40, 20, 6, 10);
  m.f.lineWidth = 4;
  m.f.strokeStyle = '#111';
  m.f.beginPath();
  m.f.arc(32, 36, 12, 0.2, Math.PI - 0.2);
  m.f.stroke();
  m.fm.map.needsUpdate = true;
  const hg = p.headG;
  while (hg.children.length) {
    const c = hg.children.pop();
    c.traverse((o: any) => {
      o.geometry && o.geometry.dispose();
      o.material && o.material.dispose && o.material.dispose();
    });
  }
  const M = (c: any, o?: any) => new THREE.MeshLambertMaterial(Object.assign({color: c}, o || {})),
    B = (c: any) => new THREE.MeshBasicMaterial({color: c});
  const add = (geo: any, mat: any, x: number, y: number, z: number) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    hg.add(o);
    return o;
  };
  const bx = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const h = Lk.hat,
    hc = V('hat')[1];
  if (h === 1) {
    add(bx(1.8, 0.35, 1.8), M(hc), 0, 0.95, 0);
    add(bx(1.2, 0.5, 1.2), M(hc), 0, 1.3, 0);
    add(bx(1.8, 0.1, 1), M(hc), 0, 0.85, 1.1);
  } else if (h === 2) {
    add(bx(2.3, 0.15, 2.3), M(hc), 0, 0.85, 0);
    add(bx(1.4, 1.3, 1.4), M(hc), 0, 1.5, 0);
    add(bx(1.45, 0.25, 1.45), M('#e84a5f'), 0, 1.0, 0);
  } else if (h === 3) {
    add(bx(1.7, 0.45, 1.7), M(hc, {emissive: 0x553300}), 0, 0.95, 0);
    [-0.7, 0, 0.7].forEach(x =>
      [-0.7, 0.7].forEach(z => {
        if (x === 0 && z !== 0) return;
        add(bx(0.3, 0.5, 0.3), M(hc, {emissive: 0x553300}), x, 1.35, z);
      })
    );
    add(bx(0.3, 0.5, 0.3), M(hc, {emissive: 0x553300}), 0, 1.4, 0);
  } else if (h === 4) {
    [-1, 1].forEach(sd => {
      const e = add(new THREE.ConeGeometry(0.35, 0.8, 4), M(hc), sd * 0.55, 1.2, 0);
      e.rotation.z = -sd * 0.15;
    });
  } else if (h === 5) {
    add(new THREE.SphereGeometry(1.15, 16, 12), M('#bfe8ff', {transparent: true, opacity: 0.35}), 0, 0.1, 0);
    add(bx(1.75, 0.2, 1.75), M('#ddd'), 0, -0.7, 0);
  } else if (h === 6) {
    add(bx(0.1, 0.9, 0.1), M('#999'), 0, 1.2, 0);
    add(new THREE.SphereGeometry(0.25, 10, 8), B(hc), 0, 1.75, 0);
  } else if (h === 7) {
    add(new THREE.CylinderGeometry(1.4, 1.4, 0.12, 16), M(hc), 0, 0.85, 0);
    add(new THREE.ConeGeometry(0.9, 1.8, 12), M(hc), 0, 1.8, 0);
    add(new THREE.CylinderGeometry(0.92, 0.92, 0.2, 12), M('#ffd24a'), 0, 1.0, 0);
  }
  const fc = V('face')[1],
    fi = Lk.face;
  if (fi === 1) {
    add(bx(1.7, 0.35, 0.15), M('#111'), 0, 0.1, 0.85);
  } else if (fi === 2) {
    add(bx(1.75, 0.5, 0.3), M(fc), 0, 0.1, 0.85);
    [-0.4, 0.4].forEach(x => add(bx(0.5, 0.35, 0.1), M('#9ee8ff', {emissive: 0x113344}), x, 0.1, 1.02));
  } else if (fi === 3) {
    [-0.4, 0.4].forEach(x => add(bx(0.55, 0.45, 0.12), B(fc), x, 0.1, 0.85));
  } else if (fi === 4) {
    add(bx(1.65, 0.7, 0.15), M(fc), 0, -0.4, 0.85);
  }
}
