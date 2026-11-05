// 관중: 스탠드 계단 위에 서 있는 상자 인물 ≈800명(몸+머리 InstancedMesh). 골이 나면 함성과 함께 뛰어오르고, 평소엔 가만히 있다.
import {G} from '../core/runtime.js';
import {PITCH, STADIUM} from '../data/soccer.js';

let body: any = null,
  head: any = null,
  base: {x: number; y: number; z: number; ry: number; ph: number}[] = [],
  cheerT = 0,
  cheerTeam = 0;
export const crowdCheer = (team: number) => ((cheerT = 4.5), (cheerTeam = team));

export function ensureStandCrowd() {
  if (body) return;
  const [x0, z0, x1, z1] = STADIUM.rect,
    gate = STADIUM.gateHalf;
  const spots: typeof base = [];
  const add = (x: number, y: number, z: number) => spots.push({x, y, z, ry: Math.atan2(PITCH.cx - x, PITCH.cz - z), ph: Math.random() * 6});
  for (let r = 0; r < 4; r++) {
    const h = 2.4 * (r + 1),
      d = (3 - r) * 3 + 1.5;
    for (let x = x0 + 2; x < x1 - 1; x += 2.1) add(x, h, z0 + d); // 북
    for (let z = z0 + 14; z < z1 - 13; z += 2.1) (add(x0 + d, h, z), add(x1 - d, h, z)); // 서·동
    for (let x = x0 + 2; x < x1 - 1; x += 2.1) if (Math.abs(x - STADIUM.gateX) > gate + 1) add(x, h, z1 - d); // 남 (출입구 제외)
  }
  base = spots;
  const mat = new THREE.MeshLambertMaterial({color: 0xffffff});
  body = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 1.5, 0.7), mat, spots.length);
  head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), new THREE.MeshLambertMaterial({color: 0xffffff}), spots.length);
  const shirts = [0x3b82f6, 0xd23a4a, 0xf3e04a, 0xffffff, 0x4cb860, 0x8b62dc],
    skins = [0xf4c8a0, 0xc98e6b, 0x8d5a3c, 0xe8b090],
    c = new THREE.Color();
  spots.forEach((s, i) => {
    body.setColorAt(i, c.setHex(shirts[(i * 7 + ((i / 13) | 0)) % shirts.length]));
    head.setColorAt(i, c.setHex(skins[i % 4]));
  });
  body.frustumCulled = head.frustumCulled = false;
  body.geometry.boundingSphere = head.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(PITCH.cx, 8, PITCH.cz), 90);
  G.scene.add(body, head);
  draw(0);
}
const o = new THREE.Object3D();
function draw(t: number) {
  if (!body) return;
  base.forEach((s, i) => {
    const jump = cheerT > 0 ? Math.abs(Math.sin(t * 9 + s.ph)) * 0.9 * Math.min(1, cheerT) : 0;
    o.position.set(s.x, s.y + 0.75 + jump, s.z);
    o.rotation.set(0, s.ry, 0);
    o.updateMatrix();
    body.setMatrixAt(i, o.matrix);
    o.position.y = s.y + 1.8 + jump;
    o.updateMatrix();
    head.setMatrixAt(i, o.matrix);
  });
  body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true;
}
let acc = 0;
export function updateStandCrowd(dt: number) {
  if (cheerT > 0) {
    cheerT -= dt;
    draw(performance.now() / 1000);
    if (cheerT <= 0) draw(0);
  } else if ((acc += dt) > 2) acc = 0;
  void cheerTeam;
}
