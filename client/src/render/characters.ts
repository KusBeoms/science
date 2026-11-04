// 로우폴리 캐릭터(플레이어·점원·라이벌·수호자), 걷기 애니메이션
// 모양은 정점색 지오메트리(전 캐릭터 공유)이고, 옷·바지·피부 색은 재질 색으로 바꾼다 → 꾸미기는 재질만 건드린다.
// userData 계약: legL/legR/armL/armR(관절 그룹, rotation.x 로 흔듦), headG(모자·얼굴 장식 자리),
// head(머리+얼굴, 숨기기용), mat{shirt,pants,sk}
import {NEUTRAL, PAL} from './lowpoly/palette.js';
import {box, frustum, ico, taper, type Geo} from './lowpoly/prim.js';
import {keep, lowMat, mergeGeometries} from './lowpoly/merge.js';
import {dress} from './characters-look.js';

export {applyLook} from './characters-look.js';

interface Shapes {
  torso: Geo;
  leg: Geo;
  shoe: Geo;
  sleeve: Geo;
  arm: Geo;
  head: Geo;
  face: Geo;
}
let shapes: Shapes | null = null;

/** 몸 부위별 지오메트리(1회 생성, 공유). 관절 부위는 관절 중심이 원점 */
function getShapes(): Shapes {
  if (shapes) return shapes;
  const W = PAL.white;
  shapes = {
    // 상체: 어깨가 넓은 테이퍼 몸통 + 골반
    torso: mergeGeometries([taper(1.75, 1, 2, 1, 1.65, W, 0, 2.35, 0), box(1.9, 0.6, 0.95, W, 0, 1.85, 0)]),
    // 다리(바지) / 신발. 엉덩이 관절에서 아래로
    leg: frustum(8, 0.47, 0.4, 1.65, W, 0, -1.65, 0),
    shoe: box(0.85, 0.35, 1.05, NEUTRAL.coal, 0, -2, 0.1),
    // 팔: 소매(옷 색) + 팔뚝·손(피부). 어깨 관절에서 아래로
    sleeve: frustum(8, 0.5, 0.43, 0.95, NEUTRAL.cloud, 0, -0.7, 0),
    arm: mergeGeometries([frustum(8, 0.38, 0.33, 1, W, 0, -1.7, 0), box(0.56, 0.42, 0.56, W, 0, -2.1, 0)]),
    // 머리(이코스피어) + 귀 + 목, 그리고 어두운 눈·입
    head: mergeGeometries([
      ico(0.88, 1, W, 0, 0, 0),
      box(0.2, 0.3, 0.26, W, -0.86, -0.15, 0),
      box(0.2, 0.3, 0.26, W, 0.86, -0.15, 0),
      frustum(6, 0.3, 0.34, 0.4, W, 0, -0.95, 0),
    ]),
    face: mergeGeometries([
      box(0.2, 0.36, 0.12, NEUTRAL.ink, -0.33, -0.02, 0.72),
      box(0.2, 0.36, 0.12, NEUTRAL.ink, 0.33, -0.02, 0.72),
      box(0.36, 0.08, 0.1, NEUTRAL.ink, 0, -0.4, 0.75),
    ]),
  };
  Object.values(shapes).forEach(keep);
  return shapes;
}

/** 로우폴리 사람. hat 을 주면 그 색의 야구모자를 쓴다(점원). big = 배율 */
export function blocky(shirt: number | string, pants: number | string, skin: string, big?: number, hat?: number): any {
  const g = new THREE.Group(),
    sh = getShapes(),
    L = (c: any) => new THREE.MeshLambertMaterial({color: c, vertexColors: true}),
    mat = {shirt: L(shirt), pants: L(pants), sk: L(skin)},
    mesh = (geo: Geo, m: any) => new THREE.Mesh(geo, m),
    joint = (x: number, y: number, ...meshes: any[]) => {
      const j = new THREE.Group();
      j.position.set(x, y, 0);
      j.add(...meshes);
      g.add(j);
      return j;
    };
  const parts: any = {mat};
  parts.legL = joint(-0.5, 2, mesh(sh.leg, mat.pants), mesh(sh.shoe, lowMat()));
  parts.legR = joint(0.5, 2, mesh(sh.leg, mat.pants), mesh(sh.shoe, lowMat()));
  parts.armL = joint(-1.42, 3.8, mesh(sh.sleeve, mat.shirt), mesh(sh.arm, mat.sk));
  parts.armR = joint(1.42, 3.8, mesh(sh.sleeve, mat.shirt), mesh(sh.arm, mat.sk));
  g.add(mesh(sh.torso, mat.shirt));
  parts.head = new THREE.Group();
  parts.head.position.set(0, 5, 0);
  parts.head.add(mesh(sh.head, mat.sk), mesh(sh.face, lowMat()));
  g.add(parts.head);
  parts.headG = new THREE.Group();
  parts.headG.position.set(0, 5, 0);
  g.add(parts.headG);
  if (hat) dress(parts.headG, 1, hat, 0, 0);
  g.scale.setScalar(big || 0.55);
  g.userData = parts;
  return g;
}
export const animateWalk = (m: any, ph: number, hold?: boolean) => {
  const p = m.userData,
    s = Math.sin(ph * 4) * 0.9;
  p.legL.rotation.x = s;
  p.legR.rotation.x = -s;
  if (hold) {
    p.armL.rotation.x = p.armR.rotation.x = -1.35;
  } else {
    p.armL.rotation.x = -s;
    p.armR.rotation.x = s;
  }
};
