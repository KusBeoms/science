// 포탈 패드 메시: 허브 1개 + 섹터마다 1개 (가벼워서 스트리밍하지 않고 항상 둔다. 보이기는 game/portal.ts 가 정한다)
import {portalFrame} from './portal-art.js';
import {lowMat} from './lowpoly/merge.js';
import {groundH} from '../core/terrain.js';
import {G} from '../core/runtime.js';
import {HUB_PAD, padPos} from '../core/geometry.js';
import {SECTORS} from '../data/sectors.js';
import {label} from './textures.js';

function pad(id: string, x: number, z: number, name: string) {
  const g = new THREE.Group(),
    base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.4, 24), new THREE.MeshLambertMaterial({color: 0x2a3a5a}));
  base.position.y = 0.2;
  g.add(base);
  if (id !== 'hub') g.add(new THREE.Mesh(portalFrame(id, 0, -1.7, true), lowMat()));
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.8, 0.18, 8, 32),
    new THREE.MeshBasicMaterial({color: 0x7cf0ff, transparent: true, opacity: 0.85})
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.55;
  g.add(ring);
  const lb = label(`🌀 ${name}`, '#9ef6ff', 7);
  lb.position.y = 4;
  g.add(lb);
  g.position.set(x, groundH(x, z), z);
  g.userData = {ring, pick: {kind: 'portal', id}};
  G.scene.add(g);
  G.pads[id] = {grp: g, x, z};
}
export function buildPads() {
  pad('hub', HUB_PAD.x, HUB_PAD.z, '포탈');
  SECTORS.forEach((s, i) => {
    const p = padPos(i);
    pad(s.id, p.x, p.z, s.name);
  });
}
