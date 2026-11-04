// 수호신: 거대한 천신(Celestial)풍 — 검은 암석 갑옷, 갈라진 틈으로 새어 나오는 용암빛, 눈 6개 달린 투구, 커다란 어깨 갑옷
import {blocky} from './characters.js';
import {panel} from './lowpoly/prim.js';

/** 낮은 해상도 도형을 면마다 각지게 만든다 */
const facet = (geo: any) => {
  const f = geo.toNonIndexed();
  geo.dispose();
  f.computeVertexNormals();
  return f;
};

/** glow = 섹터별 빛 색 (data/sectors.ts 의 guard.glow) */
export function makeGuardian(glow0: number): any {
  const rock = 0x17141c,
    g = blocky(rock, 0x120f16, '#1a1620', 1.8),
    pr = g.userData;
  const rockM = new THREE.MeshLambertMaterial({color: rock}),
    rockM2 = new THREE.MeshLambertMaterial({color: 0x241f2c});
  const socketM = new THREE.MeshBasicMaterial({color: 0x2c0d08});
  const glow = new THREE.MeshBasicMaterial({color: glow0}),
    eyes = new THREE.MeshBasicMaterial({color: glow0});
  const add = (m: any, x: number, y: number, z_: number, p?: any) => {
    m.position.set(x, y, z_);
    (p || g).add(m);
    return m;
  };
  const crack = (p: any, w: number, h: number, x: number, y: number, z_: number, rz?: number) => {
    const c = add(new THREE.Mesh(panel(w, h, 0xffffff), glow), x, y, z_, p);
    c.rotation.z = rz || 0;
    return c;
  };
  // 가슴: 세로로 갈라진 용암 줄기 + 잔금
  crack(g, 0.5, 2.3, 0, 3, 0.56);
  crack(g, 0.9, 0.1, 0, 3.5, 0.57, 0.5);
  crack(g, 0.7, 0.1, 0.1, 2.7, 0.57, -0.6);
  crack(g, 0.5, 0.1, -0.2, 2.2, 0.57, 0.3);
  // 팔·다리 잔금
  [pr.armL, pr.armR].forEach((a: any, i: number) => {
    crack(a, 0.08, 0.9, 0.2 * (i ? 1 : -1), -0.9, 0.5);
    crack(a, 0.5, 0.07, 0, -0.5, 0.5, 0.4);
    crack(a, 0.07, 0.6, 0, -1.4, 0.45);
  });
  [pr.legL, pr.legR].forEach((l: any) => {
    crack(l, 0.07, 0.8, 0, -0.8, 0.5);
    crack(l, 0.45, 0.07, 0, -1.4, 0.44, -0.5);
  });
  // 거대한 둥근 어깨 갑옷
  [-1, 1].forEach(sd => {
    const sh = add(new THREE.Mesh(facet(new THREE.IcosahedronGeometry(0.7, 1)), rockM2), sd * 1.6, 4.2, 0);
    sh.scale.set(1, 0.8, 1);
    crack(g, 0.06, 0.6, sd * 1.95, 4.3, 0.55, sd * 0.3);
    crack(g, 0.4, 0.06, sd * 1.75, 4.1, 0.62, -sd * 0.5);
  });
  // 목 + 투구 (몸통을 좁게 눌러도 머리는 찌그러지지 않게 따로 묶어 역보정, 처음 비율 1.8:2.5 유지)
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.1, 8), rockM), 0, 4.35, 0);
  const head = new THREE.Group();
  head.position.set(0, 5.2, 0);
  head.scale.set(1 / 0.78, 1 / 1.12, 1);
  g.add(head);
  add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.8, 1.4), rockM2), 0, 0, 0, head);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.3), rockM), 0, 0, 0.7, head);
  [-0.32, 0.32].forEach(x =>
    [-0.5, 0, 0.5].forEach(y => {
      add(new THREE.Mesh(panel(0.42, 0.42, 0xffffff), socketM), x, y, 0.71, head);
      add(new THREE.Mesh(panel(0.24, 0.24, 0xffffff), eyes), x, y, 0.72, head);
    })
  );
  [-1, 1].forEach(sd => {
    const fin = add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.2, 0.4), rockM), sd * 0.75, 0.4, -0.15, head);
    fin.rotation.z = -sd * 0.2;
  });
  // 발밑 오라
  const aura = new THREE.Mesh(
    facet(new THREE.TorusGeometry(2.6, 0.1, 3, 20)),
    new THREE.MeshBasicMaterial({color: glow0, transparent: true, opacity: 0.55})
  );
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.1;
  g.add(aura);
  pr.head.visible = false; // 기본 머리는 투구 안에 숨긴다
  g.scale.x *= 0.78;
  g.scale.y *= 1.12; // 좁고 길쭉하게
  Object.assign(pr, {eyes, glow, aura});
  return g;
}
