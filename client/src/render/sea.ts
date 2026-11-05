// 바다: 대륙 전체 아래에 깔리는 큰 물 판 하나 (해수면 SEA_Y). 남쪽 해변(core/heightmap.ts beltH)이 이 아래로 가라앉고, 구역 사이 허공도 물로 보인다.
import {SEA_Y} from '../data/world-map.js';

export function buildSea(): any {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(3200, 3200),
    new THREE.MeshLambertMaterial({color: 0x2f8fd0, transparent: true, opacity: 0.93})
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, SEA_Y, 0);
  m.name = 'sea';
  return m;
}
