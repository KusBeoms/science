// 손에 낀 스프링 / 가방 / 들고 있는 행성 (플레이어 캐릭터에 붙는 장비)
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {P} from '../data/planets.js';
import {BAGS, SPR} from '../data/shop.js';
import {label, makePlanet, planetR, freePlanet} from './textures.js';

// 손에 낀 스프링 (왼손목)
export function buildSpringOnHand() {
  const me = G.me;
  const arm = me.userData.armL;
  if (G.springGrp) {
    arm.remove(G.springGrp);
    G.springGrp = null;
  }
  const id = S.eq,
    s = SPR[id],
    g = new THREE.Group(),
    anim: any = {};
  const mat = new THREE.MeshLambertMaterial({color: s[1]});
  if (id === 9) {
    mat.emissive = new THREE.Color(0x4422aa);
    mat.emissiveIntensity = 0.7;
  }
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.11, 6, 14), mat);
    r.rotation.x = Math.PI / 2;
    r.position.y = -0.55 - i * 0.3;
    g.add(r);
  }
  const bm = (c: number) => new THREE.MeshBasicMaterial({color: c});
  if (id === 4) {
    // 반짝이
    const orb = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), bm(0xffffff));
      const a = i * 2.1;
      o.position.set(Math.cos(a) * 1, -0.9, Math.sin(a) * 1);
      orb.add(o);
    }
    g.add(orb);
    anim.orb = orb;
  }
  if (id === 5) {
    // 왕관
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 6.283,
        c = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.45, 5),
          new THREE.MeshLambertMaterial({color: 0xffe066, emissive: 0x664400})
        );
      c.position.set(Math.cos(a) * 0.55, -0.2, Math.sin(a) * 0.55);
      g.add(c);
    }
  }
  if (id === 6) {
    // 하트
    [
      [0.95, -0.8, 0.3],
      [-0.95, -0.9, -0.3],
    ].forEach(([x, y, z]) => {
      const h = label('♥', '#ff6fae', 1.1);
      h.position.set(x, y, z);
      g.add(h);
    });
  }
  if (id === 7) {
    // 불꽃
    const fl = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.1, 8),
      new THREE.MeshBasicMaterial({color: 0xff8a1a, transparent: true, opacity: 0.85})
    );
    fl.position.y = 0.3;
    g.add(fl);
    anim.flame = fl;
  }
  if (id === 8) {
    // 무지개 + 후광
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.07, 6, 24),
      new THREE.MeshBasicMaterial({color: 0xffffff})
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.9;
    g.add(halo);
    anim.rainbow = [mat, halo.material];
  }
  if (id === 9) {
    // 궤도를 도는 작은 행성
    const orb = new THREE.Group(),
      pl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({color: 0x8ad0ff}));
    pl.position.set(1.1, -0.9, 0);
    orb.add(pl);
    const rg = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.03, 4, 28),
      new THREE.MeshBasicMaterial({color: 0x8a7aff})
    );
    rg.rotation.x = Math.PI / 2;
    rg.position.y = -0.9;
    orb.add(rg);
    g.add(orb);
    anim.orb = orb;
  }
  g.userData = anim;
  arm.add(g);
  G.springGrp = g;
}
export function buildBag() {
  const me = G.me;
  if (G.sackGrp) {
    me.remove(G.sackGrp);
    G.sackGrp = null;
  }
  if (!S.bag) return;
  const b = BAGS[S.bag - 1],
    g = new THREE.Group(),
    m = new THREE.MeshLambertMaterial({color: b[3]});
  if (S.bag === 1) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), m);
    s.scale.set(1, 1.2, 0.8);
    s.position.set(0, 3.2, -1.2);
    g.add(s);
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 8), m);
    k.position.set(0, 4.5, -1.2);
    g.add(k);
  } else {
    const w = S.bag === 2 ? 1.7 : 2.1,
      h = S.bag === 2 ? 2 : 2.8;
    const bx = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.9), m);
    bx.position.set(0, 3.3, -1.1);
    g.add(bx);
    const st = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, h * 0.9, 0.2),
      new THREE.MeshLambertMaterial({color: 0x222222})
    );
    st.position.set(0.6, 3.3, -0.55);
    g.add(st);
    const st2 = st.clone();
    st2.position.x = -0.6;
    g.add(st2);
  }
  me.add((G.sackGrp = g));
}
// 들고 있는 행성: 첫 번째는 두 손 사이, 나머지는 가방 위
export function syncCarry() {
  const me = G.me,
    carry = G.carry;
  if (G.carryGrp) {
    me.remove(G.carryGrp);
    G.carryGrp.children.forEach(freePlanet);
    G.carryGrp = null;
  }
  if (!carry.length) return;
  const g = new THREE.Group();
  carry.forEach((c, i) => {
    const pl = makePlanet(c.id),
      r = Math.min(1.5, (planetR(P[c.id]) / 0.55) * 0.75);
    if (i === 0) {
      pl.scale.setScalar(r);
      pl.position.set(0, 3.7, 1.7 + r);
    } else {
      pl.scale.setScalar(0.6);
      pl.position.set(((i - 1) % 2 ? 1 : -1) * 0.7, 5.3 + Math.floor((i - 1) / 2) * 1.3, -1.2);
    }
    g.add(pl);
  });
  me.add(g);
  G.carryGrp = g;
}
