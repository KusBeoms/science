// 손에 낀 스프링 / 가방 / 들고 있는 행성 (플레이어 캐릭터에 붙는 장비). 모양은 전부 낮은 폴리곤
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {P} from '../data/planets.js';
import {BAGS, SPR} from '../data/shop.js';
import {label, makePlanet, planetR, freePlanet, freeTree} from './textures.js';
import {PAL, mix} from './lowpoly/palette.js';
import {lowMat} from './lowpoly/merge.js';
import {box, cone, ico, taper, type Geo} from './lowpoly/prim.js';

/** 낮은 해상도 도형을 면마다 각지게(법선 분리) 만든다 */
const facet = (geo: any) => {
  const f = geo.toNonIndexed();
  geo.dispose();
  f.computeVertexNormals();
  return f;
};
const bm = (c: number) => new THREE.MeshBasicMaterial({color: c});
const at = (m: any, x: number, y: number, z: number) => {
  m.position.set(x, y, z);
  return m;
};

// 손에 낀 스프링 (왼손목)
export function buildSpringOnHand() {
  const me = G.me;
  const arm = me.userData.armL;
  if (G.springGrp) {
    arm.remove(G.springGrp);
    freeTree(G.springGrp);
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
  const coil = facet(new THREE.TorusGeometry(0.62, 0.11, 3, 8));
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(coil, mat);
    r.rotation.x = Math.PI / 2;
    r.position.y = -0.55 - i * 0.3;
    g.add(r);
  }
  if (id === 4) {
    // 반짝이
    const orb = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1;
      orb.add(at(new THREE.Mesh(new THREE.OctahedronGeometry(0.2), bm(0xffffff)), Math.cos(a), -0.9, Math.sin(a)));
    }
    g.add(orb);
    anim.orb = orb;
  }
  if (id === 5) {
    // 왕관
    const gold = new THREE.MeshLambertMaterial({color: 0xffe066, emissive: 0x664400}),
      tip = facet(new THREE.ConeGeometry(0.12, 0.45, 4));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 6.283;
      g.add(at(new THREE.Mesh(tip, gold), Math.cos(a) * 0.55, -0.2, Math.sin(a) * 0.55));
    }
  }
  if (id === 6) {
    // 하트
    [
      [0.95, -0.8, 0.3],
      [-0.95, -0.9, -0.3],
    ].forEach(([x, y, z]) => g.add(at(label('♥', '#ff6fae', 1.1), x, y, z)));
  }
  if (id === 7) {
    // 불꽃
    const fl = at(
      new THREE.Mesh(
        facet(new THREE.ConeGeometry(0.4, 1.1, 5)),
        new THREE.MeshBasicMaterial({color: 0xff8a1a, transparent: true, opacity: 0.85})
      ),
      0,
      0.3,
      0
    );
    g.add(fl);
    anim.flame = fl;
  }
  if (id === 8) {
    // 무지개 + 후광
    const halo = at(new THREE.Mesh(facet(new THREE.TorusGeometry(0.95, 0.07, 3, 12)), bm(0xffffff)), 0, -0.9, 0);
    halo.rotation.x = Math.PI / 2;
    g.add(halo);
    anim.rainbow = [mat, halo.material];
  }
  if (id === 9) {
    // 궤도를 도는 작은 행성
    const orb = new THREE.Group(),
      rg = at(new THREE.Mesh(facet(new THREE.TorusGeometry(1.1, 0.03, 3, 14)), bm(0x8a7aff)), 0, -0.9, 0);
    rg.rotation.x = Math.PI / 2;
    orb.add(at(new THREE.Mesh(facet(new THREE.IcosahedronGeometry(0.2, 1)), bm(0x8ad0ff)), 1.1, -0.9, 0), rg);
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
    freeTree(G.sackGrp);
    G.sackGrp = null;
  }
  if (!S.bag) return;
  const b = BAGS[S.bag - 1],
    g = new THREE.Group(),
    col = new THREE.Color(b[3]).getHex(),
    dark = mix(col, PAL.ink, 0.45),
    part = (geo: Geo, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, lowMat());
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
  if (S.bag === 1) {
    // 자루: 두툼한 타원 + 묶은 입구
    part(ico(1.1, 1, col, 0, 0, 0, 0, 1.2), 0, 3.2, -1.2);
    part(cone(0.42, 0.7, dark, 0, 0, 0, 0, 6), 0, 4.4, -1.2);
  } else {
    // 배낭: 테이퍼 본체 + 덮개 + 앞주머니 + 어깨끈
    const w = S.bag === 2 ? 1.7 : 2.1,
      h = S.bag === 2 ? 2 : 2.8;
    part(taper(w, 0.9, w * 0.85, 0.8, h, col, 0, 0, 0), 0, 2.1, -1.1);
    part(box(w * 0.9, 0.3, 1, dark, 0, 0, 0), 0, 2.1 + h - 0.1, -1.1);
    part(box(w * 0.6, h * 0.35, 0.3, dark, 0, 0, 0), 0, 2.3, -1.65);
    [-0.6, 0.6].forEach(x => part(box(0.25, h * 0.9, 0.2, PAL.coal, 0, 0, 0), x, 2.2, -0.6));
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
