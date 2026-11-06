// 로블록스식 사각 블록 캐릭터(플레이어·점원·라이벌·수호자), 걷기 애니메이션 — 사용자 요청으로 사각형 느낌을 유지한다(둥글리지 말 것)
// 모양은 정점색 지오메트리(전 캐릭터 공유)이고, 옷·바지·피부 색은 재질 색으로 바꾼다 → 꾸미기는 재질만 건드린다.
// userData 계약: legL/legR/armL/armR(관절 그룹, rotation.x 로 흔듦), headG(모자·얼굴 장식 자리),
// head(머리+얼굴, 숨기기용), eyes/gazeEyes(눈동자 그룹), mat{shirt,pants,sk}
import {NEUTRAL, PAL} from './lowpoly/palette.js';
import {box, panel, type Geo} from './lowpoly/prim.js';
import {keep, lowMat, mergeGeometries} from './lowpoly/merge.js';
import {dress} from './characters-look.js';
import {CHARACTER_GAZE} from './characters-gaze.js';

export {applyLook} from './characters-look.js';

interface Shapes {
  torso: Geo;
  leg: Geo;
  shoe: Geo;
  sleeve: Geo;
  arm: Geo;
  head: Geo;
  face: Geo;
  eyes: Geo;
}
let shapes: Shapes | null = null;

/** 몸 부위별 지오메트리(1회 생성, 공유). 관절 부위는 관절 중심이 원점 */
function getShapes(): Shapes {
  if (shapes) return shapes;
  const W = PAL.white;
  shapes = {
    // 로블록스식 사각 블록: 몸통 2×2×1, 팔다리 0.9×2×0.9, 머리 1.6 정육면체
    torso: mergeGeometries([box(2, 2, 1, W, 0, 2, 0), panel(0.45, 0.18, NEUTRAL.fog, -0.5, 3.55, 0.52), panel(0.45, 0.18, NEUTRAL.fog, 0.5, 3.55, 0.52)]),
    // 다리(바지) / 신발. 엉덩이 관절에서 아래로
    leg: mergeGeometries([box(0.9, 0.96, 0.9, W, 0, -0.96, 0), box(0.86, 1, 0.88, W, 0, -2, 0)]),
    shoe: box(0.96, 0.3, 0.98, NEUTRAL.coal, 0, -2, 0.04),
    // 팔: 윗부분은 소매(옷 색), 아래는 피부. 어깨 관절에서 아래로
    sleeve: box(0.94, 1.0, 0.94, W, 0, -0.8, 0),
    arm: mergeGeometries([box(0.84, 0.7, 0.86, W, 0, -1.5, 0), box(0.9, 0.3, 0.94, W, 0, -1.82, 0.03)]),
    head: box(1.6, 1.6, 1.6, W, 0, -0.8, 0),
    // 흰 사각 눈 + 입. 머리카락은 기본 모델에 넣지 않는다.
    face: mergeGeometries([
      box(0.32, 0.44, 0.04, W, -0.33, -0.14, 0.81),
      box(0.32, 0.44, 0.04, W, 0.33, -0.14, 0.81),
      box(0.5, 0.08, 0.06, NEUTRAL.ink, 0, -0.5, 0.8),
      box(0.1, 0.1, 0.06, NEUTRAL.ink, -0.3, -0.42, 0.8),
      box(0.1, 0.1, 0.06, NEUTRAL.ink, 0.3, -0.42, 0.8),
    ]),
    // 두 동공/하이라이트를 한 메시로 공유한다. 그룹 하나를 옮겨도 추가 draw는 1회뿐.
    eyes: mergeGeometries([
      box(0.18, 0.28, 0.035, NEUTRAL.ink, -0.33, -0.06, 0.85),
      box(0.18, 0.28, 0.035, NEUTRAL.ink, 0.33, -0.06, 0.85),
      panel(0.055, 0.065, W, -0.355, 0.135, 0.872),
      panel(0.055, 0.065, W, 0.305, 0.135, 0.872),
    ]),
  };
  Object.values(shapes).forEach(keep);
  return shapes;
}

/** 블록형 사람. hat 을 주면 그 색의 야구모자를 쓴다(점원). big = 배율 */
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
  parts.armL = joint(-1.45, 3.8, mesh(sh.sleeve, mat.shirt), mesh(sh.arm, mat.sk));
  parts.armR = joint(1.45, 3.8, mesh(sh.sleeve, mat.shirt), mesh(sh.arm, mat.sk));
  g.add(mesh(sh.torso, mat.shirt));
  parts.head = new THREE.Group();
  parts.head.name = 'character-head';
  parts.head.position.set(0, 5, 0);
  const face = mesh(sh.face, lowMat()), pupils = mesh(sh.eyes, lowMat());
  face.name = 'character-eye-whites-and-mouth'; pupils.name = 'character-pupils';
  parts.eyeWhites = face;
  parts.eyes = parts.gazeEyes = new THREE.Group();
  parts.eyes.name = 'character-eyes';
  parts.eyes.userData.gazeLimits = CHARACTER_GAZE;
  parts.eyes.add(pupils);
  parts.head.add(mesh(sh.head, mat.sk), face, parts.eyes);
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
/** 앉은 자세: 다리는 앞으로, 팔은 무릎 위 */
export const sitPose = (m: any) => {
  const p = m.userData;
  p.legL.rotation.x = p.legR.rotation.x = -1.45;
  p.armL.rotation.x = p.armR.rotation.x = -0.5;
};
