// 군중 렌더 (WORLD.md 5.3): 사람 모양을 파트별 InstancedMesh 로 그린다. 드로우콜은 인원수와 무관하게 4개.
//   근거리(< NEAR): 몸통+머리 / 다리(인스턴스 2개씩) / 팔(2개씩) — 걸음은 인스턴스 행렬의 각도만 갱신한다.
//   중거리(< FAR): 서 있는 자세로 굳힌 통짜 메시 1개(포즈 없음). 그 밖은 그리지 않는다.
// 셔츠색은 인스턴스 색이 셔츠 부위(tintMask=1)에만 곱해지도록 정점 속성 tintMask 로 구분한다. 아키타입 4종은 체형(배율)으로 나눈다.
import {PAL, rgb} from './lowpoly/palette.js';
import {box} from './lowpoly/prim.js';
import {mergeGeometries} from './lowpoly/merge.js';
import type {Geo} from './lowpoly/prim.js';

/** 아키타입 4종: 보통 · 키 큰 · 통통 · 어린이 (w = 가로·깊이 배율, h = 키 배율) */
export const ARCHETYPES = [
  {w: 1, h: 1},
  {w: 0.92, h: 1.12},
  {w: 1.14, h: 0.9},
  {w: 0.74, h: 0.74},
] as const;
/** 셔츠 색 후보 (팔레트 이름) */
export const SHIRTS = [PAL.red, PAL.blue, PAL.amber, PAL.green, PAL.violet, PAL.teal, PAL.pink, PAL.orange, PAL.cloud, PAL.cyan];
/** 키 1.0 일 때 머리 꼭대기 높이 */
export const HEAD_TOP = 1.95;
/** 시민 배율: 플레이어(블록 캐릭터, 키 약 3.1u)와 같은 크기로 보이게 한다 */
export const CITIZEN_SCALE = 1.6;

const NEAR = 35,
  FAR = 80,
  HIP = 0.8,
  SHOULDER = 1.44,
  ARM_X = 0.37,
  LEG_X = 0.14;

/** 한 명을 그리는 데 필요한 값 (시뮬레이션은 systems/crowd.ts) */
export interface CrowdSprite {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** 아키타입 배율 × 등장·퇴장 크기 */
  w: number;
  h: number;
  /** 다리 흔들림 각(라디안, 팔은 반대 방향) */
  swing: number;
  bob: number;
  /** 셔츠색 */
  color: number;
}

type Part = [Geo, number];
/** [지오메트리, tintMask] 목록 → 병합 지오메트리 + tintMask 속성 */
function build(parts: Part[]): Geo {
  const g = mergeGeometries(parts.map(p => p[0])),
    mask = new Float32Array(g.attributes.position.count);
  let o = 0;
  for (const [pg, m] of parts) {
    const n = pg.attributes.position.count;
    mask.fill(m, o, o + n);
    o += n;
  }
  g.setAttribute('tintMask', new THREE.BufferAttribute(mask, 1));
  return g;
}
const SKIN = PAL.plaster,
  PANTS = PAL.slate,
  SHIRT = PAL.white;
/** 몸통 + 머리 + 머리카락 (발바닥 y=0) */
const torso = (): Part[] => [
  [box(0.5, 0.7, 0.3, SHIRT, 0, HIP, 0), 1],
  [box(0.36, 0.36, 0.36, SKIN, 0, 1.5, 0), 0], // 사각 머리(로블록스식)
  [box(0.36, 0.1, 0.36, PAL.coal, 0, 1.82, -0.02), 0],
];
/** 다리 1개: 엉덩이 y=0 에서 아래로 */
const leg = (x = 0): Part[] => [
  [box(0.22, 0.66, 0.26, PANTS, x, -HIP, 0), 0],
  [box(0.24, 0.14, 0.34, PAL.ink, x, -HIP, 0.03), 0],
];
/** 팔 1개: 어깨 y=0 에서 아래로 */
const arm = (x = 0): Part[] => [
  [box(0.16, 0.42, 0.18, SHIRT, x, -0.42, 0), 1],
  [box(0.14, 0.26, 0.16, SKIN, x, -0.68, 0), 0],
];
const lift = (parts: Part[], y: number): Part[] => parts.map(([g, m]) => [g.translate(0, y, 0), m]);
const standing = (): Part[] => [
  ...torso(),
  ...lift(leg(-LEG_X), HIP),
  ...lift(leg(LEG_X), HIP),
  ...lift(arm(-ARM_X), SHOULDER),
  ...lift(arm(ARM_X), SHOULDER),
];

/** 정점색에 인스턴스 색을 tintMask 만큼만 곱하는 Lambert (공유 재질 lowMat 은 건드리지 않는다) */
function crowdMat(): any {
  const m = new THREE.MeshLambertMaterial({vertexColors: true});
  m.onBeforeCompile = (sh: any) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float tintMask;')
      .replace(
        '#include <color_vertex>',
        'vColor = color;\n#ifdef USE_INSTANCING_COLOR\nvColor *= mix(vec3(1.0), instanceColor, tintMask);\n#endif'
      );
  };
  m.userData.keep = true;
  return m;
}

/** 모든 메시가 instanceColor 를 가져야 같은 재질·같은 셰이더 변형을 쓴다 (다리는 tintMask 0 이라 색이 곱해지지 않는다) */
function instances(geo: Geo, mat: any, cap: number): any {
  const m = new THREE.InstancedMesh(geo, mat, cap);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  m.count = 0;
  return m;
}

/** 열 우선 4×4 에 T·Ry(yaw)·Rx(swing)·S(sx,sy,sx) 를 쓴다 (i = 인스턴스 번호) */
function put(a: Float32Array, i: number, px: number, py: number, pz: number, yaw: number, swing: number, sx: number, sy: number) {
  const cy = Math.cos(yaw),
    sn = Math.sin(yaw),
    c = Math.cos(swing),
    s = Math.sin(swing),
    o = i * 16;
  a[o] = cy * sx;
  a[o + 1] = 0;
  a[o + 2] = -sn * sx;
  a[o + 3] = 0;
  a[o + 4] = sn * s * sy;
  a[o + 5] = c * sy;
  a[o + 6] = cy * s * sy;
  a[o + 7] = 0;
  a[o + 8] = sn * c * sx;
  a[o + 9] = -s * sx;
  a[o + 10] = cy * c * sx;
  a[o + 11] = 0;
  a[o + 12] = px;
  a[o + 13] = py;
  a[o + 14] = pz;
  a[o + 15] = 1;
}
function tint(a: Float32Array, i: number, color: number) {
  const [r, g, b] = rgb(color);
  a[i * 3] = r;
  a[i * 3 + 1] = g;
  a[i * 3 + 2] = b;
}

export interface CrowdView {
  root: any;
  /** list[0..n) 를 카메라 거리로 나눠 그린다 */
  draw(list: CrowdSprite[], n: number, camX: number, camZ: number): void;
}
export function createCrowdView(cap: number): CrowdView {
  const mat = crowdMat(),
    body = instances(build(torso()), mat, cap),
    legs = instances(build(leg()), mat, cap * 2),
    arms = instances(build(arm()), mat, cap * 2),
    far = instances(build(standing()), mat, cap),
    root = new THREE.Group();
  root.add(body, legs, arms, far);
  return {
    root,
    draw(list, n, camX, camZ) {
      let nb = 0,
        nf = 0;
      const bm = body.instanceMatrix.array,
        lm = legs.instanceMatrix.array,
        am = arms.instanceMatrix.array,
        fm = far.instanceMatrix.array;
      for (let k = 0; k < n; k++) {
        const p = list[k],
          d = Math.hypot(p.x - camX, p.z - camZ);
        if (d >= FAR) continue;
        const sx = p.w * CITIZEN_SCALE,
          sy = p.h * CITIZEN_SCALE,
          y = p.y + p.bob * sy;
        if (d >= NEAR) {
          put(fm, nf, p.x, y, p.z, p.yaw, 0, sx, sy);
          tint(far.instanceColor.array, nf++, p.color);
          continue;
        }
        const cy = Math.cos(p.yaw),
          sn = Math.sin(p.yaw);
        put(bm, nb, p.x, y, p.z, p.yaw, 0, sx, sy);
        tint(body.instanceColor.array, nb, p.color);
        for (let j = 0; j < 2; j++) {
          const sd = j ? 1 : -1, // 한쪽 다리가 앞으로 가면 같은 쪽 팔은 뒤로
            i2 = nb * 2 + j,
            lx = sd * LEG_X * sx,
            ax = sd * ARM_X * sx;
          put(lm, i2, p.x + cy * lx, y + HIP * sy, p.z - sn * lx, p.yaw, -sd * p.swing, sx, sy);
          put(am, i2, p.x + cy * ax, y + SHOULDER * sy, p.z - sn * ax, p.yaw, sd * p.swing * 0.8, sx, sy);
          tint(arms.instanceColor.array, i2, p.color);
        }
        nb++;
      }
      body.count = nb;
      far.count = nf;
      legs.count = arms.count = nb * 2;
      for (const m of [body, legs, arms, far]) {
        m.instanceMatrix.needsUpdate = true;
        m.instanceColor.needsUpdate = true;
      }
    },
  };
}
