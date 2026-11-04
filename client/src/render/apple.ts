// 사과 행성 모델: 위가 눌린 로우폴리 구 + 꼭지 + 잎 + 후광 스프라이트.
// 반지름 1 단위로 만든다 — 하늘 천체(render/sky.ts)와 컷신 배우(game/cutscene-actors.ts)가 배율만 달리해 함께 쓴다.
// 조명을 받지 않는 정점색(면 밝기는 정점에 미리 구움) + 안개·깊이 무시: 먼 배경 천체용
import {mergePlaced} from './lowpoly/merge.js';
import {frustum, gradientY, ico, speckle, type Geo} from './lowpoly/prim.js';
import {NEUTRAL, mix} from './lowpoly/palette.js';

const FLESH_LOW = 0xa8202c,
  FLESH_HIGH = 0xe5483f,
  STEM = 0x6b4a32,
  LEAF_LIGHT = 0x6cc455,
  LEAF_DARK = 0x3a9a48;
/** 후광 지름(사과 반지름 단위): 사과 지름 2 의 약 3.5 배 */
export const HALO_SIZE = 7;
/** 사과 윗면(움푹)이 보이도록 카메라 쪽(+z)으로 기울이는 각도 */
const TILT = 0.62;
/** 면 밝기를 구울 때 쓰는 빛 방향(왼쪽 위 앞) */
const LIGHT = [-0.45, 0.7, 0.55];

export interface Apple {
  /** 반지름 1 의 그룹 (후광 + 몸통). 위치·배율은 쓰는 쪽이 정한다 */
  group: any;
  halo: any;
  body: any;
}

/** 단위 구 위의 점을 사과 모양으로: 어깨는 넓고 아래는 좁게, 5갈래 굴곡, 윗면 움푹, 바닥 살짝 움푹 */
function shape(geo: Geo): Geo {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i),
      r2 = x * x + z * z,
      lobes = 1 + 0.05 * Math.cos(5 * Math.atan2(z, x)) * (1 - Math.abs(y)),
      k = (1 + 0.1 * Math.max(0, y) - 0.2 * Math.max(0, -y)) * lobes;
    p.setXYZ(
      i,
      x * k,
      y * 0.9 - 0.42 * Math.exp(-r2 / 0.16) * Math.max(0, y) + 0.14 * Math.exp(-r2 / 0.1) * Math.max(0, -y),
      z * k,
    );
  }
  return geo;
}

/** 삼각형 법선과 빛의 내적으로 정점색을 어둡게/밝게 굽는다 (lo..1 배) */
function bakeShade(geo: Geo, lo = 0.6): Geo {
  const p = geo.attributes.position,
    c = geo.attributes.color,
    len = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
  for (let t = 0; t < p.count; t += 3) {
    const ux = p.getX(t + 1) - p.getX(t), uy = p.getY(t + 1) - p.getY(t), uz = p.getZ(t + 1) - p.getZ(t),
      vx = p.getX(t + 2) - p.getX(t), vy = p.getY(t + 2) - p.getY(t), vz = p.getZ(t + 2) - p.getZ(t),
      nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx,
      nl = Math.hypot(nx, ny, nz) || 1,
      d = Math.max(0, (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / (nl * len)),
      k = lo + (1 - lo) * d;
    for (let i = t; i < t + 3; i++) c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
  }
  return geo;
}

/** 잎: 마름모 한 장을 가운데 맥으로 접은 4 tris (양면 재질로 그린다) */
function leaf(): Geo {
  const base = [0, 0, 0], up = [0.2, 0.2, 0.04], lo = [0.2, -0.06, 0.04], mid = [0.34, 0.1, 0.1], tip = [0.62, 0.2, 0.06],
    tris = [[base, up, mid, LEAF_LIGHT], [base, mid, lo, LEAF_DARK], [mid, up, tip, LEAF_LIGHT], [mid, tip, lo, LEAF_DARK]] as const,
    pos: number[] = [],
    col: number[] = [];
  tris.forEach(([a, b, c, color]) => {
    pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) col.push((color >> 16) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  return geo;
}

/** 몸통 + 꼭지(2마디) + 잎을 지오메트리 1개로 병합 (약 350 tris) */
function bodyGeometry(): Geo {
  const flesh = speckle(gradientY(shape(ico(1, 3, FLESH_HIGH)), FLESH_LOW, FLESH_HIGH), 0.07, 5),
    stem = frustum(5, 0.075, 0.055, 0.32, STEM, 0, 0.4, 0),
    stem2 = frustum(5, 0.055, 0.04, 0.2, mix(STEM, NEUTRAL.clay, 0.4), 0.04, 0.7, 0);
  return mergePlaced([
    {g: bakeShade(flesh)},
    {g: bakeShade(stem)},
    {g: bakeShade(stem2)},
    {g: leaf(), x: 0.08, y: 0.78},
  ]);
}

/** 후광 텍스처: 붉은 방사형 광채 + 십자 반짝임 */
function haloTexture(): any {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!,
    g = x.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,170,150,0.85)');
  g.addColorStop(0.35, 'rgba(255,90,100,0.38)');
  g.addColorStop(1, 'rgba(255,60,80,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  for (const horizontal of [true, false]) {
    const r = horizontal ? x.createLinearGradient(0, 0, 128, 0) : x.createLinearGradient(0, 0, 0, 128);
    r.addColorStop(0, 'rgba(255,220,210,0)');
    r.addColorStop(0.5, 'rgba(255,235,225,0.4)');
    r.addColorStop(1, 'rgba(255,220,210,0)');
    x.fillStyle = r;
    if (horizontal) x.fillRect(0, 62, 128, 4);
    else x.fillRect(62, 0, 4, 128);
  }
  return new THREE.CanvasTexture(c);
}

/**
 * 사과 행성 1개를 만든다. 재질은 안개·깊이 판정을 쓰지 않고 불투명 패스에서 후광(-2) → 몸통(-1) 순으로 가장 먼저 그려진다
 * (뒤에 그려지는 지형·건물이 그 위를 덮는다). 쓰는 쪽이 여러 번 만들고 freeTree 로 해제해도 서로 영향이 없다.
 */
export function buildApple(): Apple {
  const group = new THREE.Group(),
    tilt = new THREE.Group(),
    halo = new THREE.Sprite(
      new THREE.SpriteMaterial({map: haloTexture(), blending: THREE.AdditiveBlending, transparent: false, depthTest: false, depthWrite: false, fog: false}),
    ),
    body = new THREE.Mesh(
      bodyGeometry(),
      new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.DoubleSide, fog: false, depthTest: false, depthWrite: false}),
    );
  halo.scale.setScalar(HALO_SIZE);
  halo.renderOrder = -2;
  body.renderOrder = -1;
  body.frustumCulled = false;
  tilt.rotation.x = TILT;
  tilt.add(body);
  group.add(halo, tilt);
  return {group, halo, body};
}

/** 후광의 느린 맥박과 반짝임 회전 (t: 초) */
export function pulseHalo(a: Apple, t: number) {
  a.halo.scale.setScalar(HALO_SIZE * (1 + 0.05 * Math.sin(t * 2.2)));
  a.halo.material.rotation = Math.sin(t * 0.35) * 0.4;
}

/** 어둠에 맞춰 몸통을 어둡게 (k: 0 = 한밤, 1 = 원색) */
export function dimApple(a: Apple, k: number) {
  a.body.material.color.setScalar(0.62 + 0.38 * k);
  a.halo.material.opacity = 0.9 - 0.55 * k; // 밝은 하늘에서는 연하게, 밤에는 또렷하게
}
