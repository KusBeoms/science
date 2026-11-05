// 탈것 모델(킥보드·자전거·산악·전기 자전거·외발자전거·오토바이): 몸체 1 메시 + 바퀴 메시들(굴러야 해서 따로) — 전부 병합 지오메트리, 앞쪽 = +z.
// 원점은 바닥, 플레이어 엉덩이(높이 ≈0.76)가 안장에 앉는 크기. 바퀴는 userData.wheels 의 {pivot, r} 로 돌린다.
import {PAL} from './lowpoly/palette.js';
import {box, cyl, cone} from './lowpoly/prim.js';
import {glowMat, lowMat, mergeGeometries} from './lowpoly/merge.js';

type G3 = any;
const TIRE = 0x23262e,
  RIM = 0xcfd6e6;
/** 두 점 (y0,z0)→(y1,z1) 를 잇는 굵기 t 의 막대 (x 위치 x) */
function tube(c: number, y0: number, z0: number, y1: number, z1: number, t = 0.07, x = 0): G3 {
  const L = Math.hypot(y1 - y0, z1 - z0);
  return box(t, t, L, c, 0, -t / 2, 0).rotateX(Math.atan2(-(y1 - y0), z1 - z0)).translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
}
/** 바퀴: 타이어(10각 기둥) + 림 + 스포크 막대. 허브가 원점이라 pivot 에 붙여 x 축으로 굴린다 */
function wheel(r: number, w: number): G3 {
  const tire = cyl(r, w, TIRE, 0, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(w / 2, 0, 0),
    rim = cyl(r * 0.72, w + 0.02, RIM, 0, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate((w + 0.02) / 2, 0, 0),
    sp = box(w + 0.04, r * 1.7, 0.05, PAL.steel, 0, -r * 0.85, 0),
    sp2 = box(w + 0.04, 0.05, r * 1.7, PAL.steel, 0, -0.025, 0);
  return mergeGeometries([tire, rim, sp, sp2].map(g => g.translate(-w / 2, 0, 0)));
}
function bikeBody(c: number, thick: number, extra: G3[] = []): G3[] {
  const dk = PAL.coal;
  return [
    tube(c, 0.3, 0.25, 0.7, -0.12, thick), // 시트 튜브
    tube(c, 0.7, -0.12, 0.88, 0.58, thick), // 탑 튜브
    tube(c, 0.3, 0.25, 0.7, 0.55, thick), // 다운 튜브
    tube(c, 0.3, 0.25, 0.42, -0.8, thick * 0.8), // 체인 스테이
    tube(c, 0.7, -0.12, 0.42, -0.8, thick * 0.8), // 시트 스테이
    tube(PAL.steel, 0.42, 0.85, 0.92, 0.6, thick), // 포크
    box(0.7, 0.06, 0.07, dk, 0, 0.95, 0.6), // 핸들
    box(0.34, 0.09, 0.55, dk, 0, 0.74, -0.25), // 안장
    box(0.1, 0.05, 0.3, dk, 0.16, 0.28, 0.3),
    box(0.1, 0.05, 0.3, dk, -0.16, 0.28, 0.3),
    ...extra,
  ];
}
export interface RideModel {
  grp: G3;
  wheels: {pivot: G3; r: number}[];
}
/** 탈것 모델 하나 */
export function buildRide(id: string, c: number): RideModel {
  const grp = new THREE.Group(),
    wheels: {pivot: G3; r: number}[] = [];
  const add = (geo: G3, glow = false) => grp.add(new THREE.Mesh(geo, glow ? glowMat() : lowMat()));
  const wh = (r: number, w: number, z: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, r, z);
    pivot.add(new THREE.Mesh(wheel(r, w), lowMat()));
    grp.add(pivot);
    wheels.push({pivot, r});
  };
  switch (id) {
    case 'scooter':
      add(mergeGeometries([box(0.38, 0.1, 1.5, c, 0, 0.2, 0), tube(PAL.steel, 0.25, 0.7, 1.15, 0.62, 0.07), box(0.7, 0.06, 0.07, PAL.coal, 0, 1.15, 0.62), box(0.34, 0.14, 0.5, PAL.coal, 0, 0.14, -0.55)]));
      wh(0.2, 0.1, 0.85);
      wh(0.2, 0.1, -0.75);
      break;
    case 'unicycle':
      add(mergeGeometries([tube(c, 0.4, 0, 0.72, 0, 0.09), box(0.34, 0.09, 0.45, PAL.coal, 0, 0.72, 0), box(0.28, 0.05, 0.1, PAL.coal, 0.2, 0.4, 0), box(0.28, 0.05, 0.1, PAL.coal, -0.2, 0.4, 0)]));
      wh(0.4, 0.12, 0);
      break;
    case 'moto': {
      add(mergeGeometries([
        box(0.5, 0.5, 1.0, PAL.coal, 0, 0.3, 0.1),
        box(0.52, 0.34, 0.8, c, 0, 0.62, 0.4),
        box(0.46, 0.14, 0.95, PAL.ink, 0, 0.7, -0.4),
        tube(PAL.steel, 0.3, 1.15, 0.95, 0.75, 0.09),
        box(0.9, 0.07, 0.07, PAL.coal, 0, 1.0, 0.75),
        box(0.22, 0.12, 1.1, PAL.steel, 0.3, 0.28, -0.4),
        cone(0.12, 0.3, PAL.steel, 0, 0, 0, 0, 6).rotateX(-Math.PI / 2).translate(0.3, 0.3, -1.05),
      ]));
      add(mergeGeometries([box(0.3, 0.2, 0.12, PAL.yellow, 0, 0.9, 0.85)]), true);
      wh(0.48, 0.28, 1.05);
      wh(0.48, 0.3, -0.95);
      break;
    }
    case 'ebike':
      add(mergeGeometries(bikeBody(c, 0.1, [box(0.14, 0.14, 0.7, PAL.ink, 0, 0.5, 0.15)])));
      add(mergeGeometries([box(0.1, 0.06, 0.5, PAL.cyan, 0, 0.58, 0.15)]), true);
      wh(0.42, 0.1, 0.85);
      wh(0.42, 0.1, -0.8);
      break;
    case 'mtb':
      add(mergeGeometries(bikeBody(c, 0.1, [tube(PAL.steel, 0.5, 0.78, 0.92, 0.62, 0.05, 0.12), tube(PAL.steel, 0.5, 0.78, 0.92, 0.62, 0.05, -0.12)])));
      wh(0.45, 0.2, 0.85);
      wh(0.45, 0.2, -0.8);
      break;
    default:
      add(mergeGeometries(bikeBody(c, 0.07, [box(0.4, 0.07, 0.35, PAL.amber, 0, 0.98, 0.55)])));
      wh(0.42, 0.08, 0.85);
      wh(0.42, 0.08, -0.8);
  }
  return {grp, wheels};
}
