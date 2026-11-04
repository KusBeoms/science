// 씬 구성: 렌더러·카메라·하늘·허브 타일·상점·포탈 패드·플레이어·라이벌 (섹터는 render/sectors.ts)
import {G} from '../core/runtime.js';
import {SHOP_AT, SPAWN, slotPos} from '../core/geometry.js';
import {CITY_HALF, PASSES} from '../core/terrain.js';
import {P} from '../data/planets.js';
import {SECTORS, TS, sectorIndex} from '../data/sectors.js';
import {CAPS} from '../data/shop.js';
import {blocky, applyLook} from './characters.js';
import {buildSpringOnHand, buildBag} from './gear.js';
import {applyDeco} from './deco.js';
import {checkerTex, label, makePlanet} from './textures.js';
import {buildPads} from './portals.js';
import {tile} from './sectors.js';
import {initSky} from './sky.js';

/** 임시 바닥(W1 에서 지형 메시로 교체): 도시 평지 + 구역 사이 통로. 기지 타일(top 0) 보다 살짝 낮게 깔아 겹침 깜빡임을 피한다 */
function buildGround() {
  const flat = (x0: number, z0: number, x1: number, z1: number, tex: any) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(x1 - x0, 0.6, z1 - z0),
      new THREE.MeshLambertMaterial(tex ? {map: tex} : {color: 0x555b68})
    );
    m.position.set((x0 + x1) / 2, -0.38, (z0 + z1) / 2);
    G.scene.add(m);
  };
  flat(-CITY_HALF, -CITY_HALF, CITY_HALF, CITY_HALF, checkerTex('#4b5262', '#444b5a', CITY_HALF / 4));
  PASSES.forEach(r => flat(r[0], r[1], r[2], r[3], null));
}
export function initWorld() {
  G.renderer = new THREE.WebGLRenderer({antialias: true});
  G.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  G.renderer.setSize(innerWidth, innerHeight);
  document.body.prepend(G.renderer.domElement);
  G.scene = new THREE.Scene();
  G.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1200);
  initSky(); // 하늘 돔·별·해·달·사과 행성·조명·안개 (render/sky.ts)
  G.baseFloor = tile(G.scene, 0, 0, '#3c8f48', '#358040', 0x1c3a22, TS);
  buildGround();
  const bl = label('내 기지', '#9dffb0', 12);
  bl.position.set(0, 9, 10);
  G.scene.add(bl);
  for (let i = 0; i < CAPS.slots.max; i++) {
    const p = slotPos(i),
      ped = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 2.6), new THREE.MeshLambertMaterial({color: 0xcfd6e6}));
    ped.position.set(p.x, 0.4, p.z);
    G.scene.add(ped);
    G.baseMesh.push({ped, id: -1, grp: null});
  }
  // 상점 + 점원
  const shop = new THREE.Group(),
    lam = (c: number) => new THREE.MeshLambertMaterial({color: c});
  const sb = (w: number, h: number, d: number, c: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c));
    m.position.set(x, y, z);
    shop.add(m);
    return m;
  };
  sb(9, 1.6, 2.6, 0x8a5a2a, 0, 0.8, 1.6);
  sb(0.5, 6, 0.5, 0xdddddd, -4.2, 3, 2.6);
  sb(0.5, 6, 0.5, 0xdddddd, 4.2, 3, 2.6);
  sb(10, 0.5, 5.6, 0xd23a4a, 0, 6.2, 0.8);
  sb(10, 0.3, 0.8, 0xffffff, 0, 5.9, 3.4);
  sb(9, 5, 0.5, 0x3a3a50, 0, 2.5, -1.4);
  const sl = label('🛒 상점', '#ffd27a', 8);
  sl.position.set(0, 8.4, 1);
  shop.add(sl);
  shop.position.set(SHOP_AT.x, 0, SHOP_AT.z - 1);
  G.scene.add(shop);
  G.npc = blocky(0x2f9e6e, 0x333344, '#f0c8a0', 0.7, 0xd23a4a);
  G.npc.position.set(SHOP_AT.x, 0, SHOP_AT.z + 1.2);
  G.npc.userData.pick = {kind: 'npc'};
  G.scene.add(G.npc);
  // 섹터(타일·문·수호자·둥지)는 render/sectors.ts 가 거리 기준으로 스트리밍한다. 포탈 패드는 항상 둔다
  G.chunks = SECTORS.map(() => null);
  buildPads();
  // 배경 천체 (4단계 뒤의 폴리페무스)
  const poly = makePlanet(P.findIndex(p => p.name === '폴리페무스')),
    a4 = SECTORS[sectorIndex('alpha')];
  poly.scale.setScalar(14);
  poly.position.set(a4.center.x, 40, a4.center.z - a4.size / 2 - 40);
  G.scene.add(poly);
  // 플레이어 / 라이벌
  G.me = blocky(0x3b82f6, 0x4a9a4a, '#f4d03f');
  G.me.pos = G.me.position;
  G.me.vy = 0;
  G.me.pos.set(SPAWN.x, 0, SPAWN.z);
  G.scene.add(G.me);
  applyLook();
  buildSpringOnHand();
  buildBag();
  G.rival = blocky(0xd23a4a, 0x333333, '#e8b090');
  G.rival.visible = false;
  G.rival.state = 'off';
  G.scene.add(G.rival);
  G.rival.mark = label('라이벌!', '#ff6a7a', 6);
  G.rival.mark.position.set(0, 9.5, 0);
  G.rival.add(G.rival.mark);
  G.rival.mark.scale.multiplyScalar(1 / 0.55);
  G.decoGrp = new THREE.Group();
  G.scene.add(G.decoGrp);
  applyDeco();
  G.clock = new THREE.Clock();
}
