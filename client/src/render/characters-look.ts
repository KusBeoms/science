// 캐릭터 꾸미기(모자 7·얼굴 4)를 로우폴리로 만들어 머리 그룹(headG)에 붙인다.
// 모양은 전부 병합 지오메트리 1개씩(정점색, 공유 재질)이라 모자 하나가 드로우콜 1~2회다.
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {LOOK} from '../data/shop.js';
import {ACCENT, NEUTRAL, PAL, mix} from './lowpoly/palette.js';
import {box, cone, cyl, frustum, ico, panel, prism, taper, type Geo} from './lowpoly/prim.js';
import {glowMat, lowMat, mergeGeometries} from './lowpoly/merge.js';
import {freeTree} from './textures.js';

type Maker = (c: number) => any[];

const lit = (...g: Geo[]) => new THREE.Mesh(mergeGeometries(g), lowMat());
const glow = (...g: Geo[]) => new THREE.Mesh(mergeGeometries(g), glowMat());
const tilt = (m: any, z: number, x = 0, y = 0) => {
  m.rotation.z = z;
  m.position.set(x, y, 0);
  return m;
};
/** 반지름 r 인 원 위의 n점 (y 고정) */
const ring = (n: number, r: number) =>
  Array.from({length: n}, (_, i): [number, number] => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r]);

/** 모자 1~7. 머리 중심이 원점이고 구 반지름이 약 0.88 */
const HATS: Record<number, Maker> = {
  // 야구모자: 둥근 천 + 앞챙
  1: c => [lit(frustum(8, 0.94, 0.66, 0.55, c, 0, 0.3, 0), box(1.2, 0.1, 0.8, mix(c, PAL.ink, 0.25), 0, 0.3, 0.92))],
  // 실크햇: 챙 + 높은 통 + 붉은 띠
  2: c => [
    lit(cyl(1.18, 0.12, c, 0, 0.56, 0, 0, 10), frustum(10, 0.7, 0.64, 1.2, c, 0, 0.6, 0), cyl(0.72, 0.26, ACCENT.red, 0, 0.64, 0, 0, 10)),
  ],
  // 왕관: 금띠 + 뾰족한 5개 + 보석
  3: c => [
    lit(prism(8, 0.9, 0.4, c, 0, 0.5, 0), ...ring(5, 0.7).map(([x, z]) => cone(0.2, 0.55, c, x, 0.9, z, 0, 4))),
    glow(box(0.2, 0.2, 0.1, ACCENT.red, 0, 0.62, 0.9)),
  ],
  // 고양이 귀: 바깥 귀 + 안쪽 분홍
  4: c =>
    [-1, 1].map(sd =>
      tilt(lit(cone(0.4, 0.85, c, 0, 0, 0, 0, 4), cone(0.24, 0.6, ACCENT.pink, 0, 0, 0.12, 0, 4)), -sd * 0.28, sd * 0.56, 0.5)
    ),
  // 우주 헬멧: 투명 유리구 + 금속 칼라
  5: () => [
    new THREE.Mesh(
      ico(1.14, 1, PAL.white, 0, 0.08, 0),
      new THREE.MeshLambertMaterial({color: 0xbfe8ff, transparent: true, opacity: 0.35, vertexColors: true})
    ),
    lit(prism(8, 1.04, 0.26, NEUTRAL.cloud, 0, -0.9, 0)),
  ],
  // 안테나: 가는 막대 + 빛나는 구
  6: c => [lit(cyl(0.05, 1, NEUTRAL.ash, 0, 0.78, 0, 0, 6)), glow(ico(0.27, 0, c, 0, 1.9, 0))],
  // 마법사 모자: 넓은 챙 + 휘어진 두 마디 원뿔 + 금띠
  7: c => [
    lit(
      cyl(1.35, 0.12, c, 0, 0.56),
      frustum(8, 0.9, 0.5, 0.9, c, 0, 0.62, 0),
      frustum(8, 0.5, 0, 0.9, mix(c, PAL.white, 0.12), 0.18, 1.5, 0),
      cyl(0.92, 0.2, ACCENT.amber, 0, 0.7)
    ),
  ],
};

/** 얼굴 장식 1~4. 머리 앞면(z≈0.8) 눈높이에 붙는다. c = 색 */
const FACES: Record<number, Maker> = {
  // 선글라스: 렌즈 둘 + 코다리 + 양옆 다리
  1: () => [
    lit(
      box(0.58, 0.32, 0.16, NEUTRAL.ink, -0.36, -0.04, 0.72),
      box(0.58, 0.32, 0.16, NEUTRAL.ink, 0.36, -0.04, 0.72),
      box(0.2, 0.07, 0.12, NEUTRAL.ink, 0, 0.1, 0.74),
      box(0.07, 0.07, 0.55, NEUTRAL.ink, -0.8, 0.1, 0.1),
      box(0.07, 0.07, 0.55, NEUTRAL.ink, 0.8, 0.1, 0.1)
    ),
  ],
  // 고글: 머리띠 + 테두리 + 빛나는 렌즈
  2: c => [
    lit(
      prism(8, 0.93, 0.22, c, 0, -0.14, 0),
      box(0.66, 0.5, 0.2, mix(c, PAL.ink, 0.3), -0.38, -0.12, 0.72),
      box(0.66, 0.5, 0.2, mix(c, PAL.ink, 0.3), 0.38, -0.12, 0.72)
    ),
    glow(box(0.46, 0.3, 0.06, mix(ACCENT.cyan, PAL.white, 0.5), -0.38, -0.02, 0.9), box(0.46, 0.3, 0.06, mix(ACCENT.cyan, PAL.white, 0.5), 0.38, -0.02, 0.9)),
  ],
  // 하트 안경: 빛나는 납작한 하트 둘(마름모 3장) + 다리
  3: c => {
    const heart = (x: number) =>
      [[0.34, 0, -0.02], [0.24, -0.12, 0.1], [0.24, 0.12, 0.1]].map(([w, dx, dy]) =>
        panel(w, w, c).rotateZ(Math.PI / 4).translate(x + dx, dy, 0.82)
      );
    return [
      glow(...heart(-0.4), ...heart(0.4)),
      lit(box(0.2, 0.06, 0.1, NEUTRAL.ink, 0, 0.1, 0.8), box(0.07, 0.07, 0.55, NEUTRAL.ink, -0.8, 0.1, 0.1), box(0.07, 0.07, 0.55, NEUTRAL.ink, 0.8, 0.1, 0.1)),
    ];
  },
  // 마스크: 입·코를 덮는 흰 천 + 귀끈
  4: c => [
    lit(
      taper(1.1, 0.5, 1.3, 0.7, 0.55, c, 0, -0.62, 0.42),
      box(0.05, 0.05, 0.6, NEUTRAL.ash, -0.82, -0.3, 0.05),
      box(0.05, 0.05, 0.6, NEUTRAL.ash, 0.82, -0.3, 0.05)
    ),
  ],
};

/** '#rrggbb' → 숫자. 상점의 '없음' 항목(∅)은 0 */
const hex = (c: string) => (c[0] === '#' ? new THREE.Color(c).getHex() : 0);

/** headG 를 비우고 모자·얼굴 장식을 새로 단다 */
export function dress(hg: any, hat: number, hatColor: number, face: number, faceColor: number) {
  hg.children.slice().forEach((c: any) => {
    hg.remove(c);
    freeTree(c);
  });
  const put = (make: Maker | undefined, c: number) => make && make(c).forEach(m => hg.add(m));
  put(HATS[hat], hatColor);
  put(FACES[face], faceColor);
}

/** 상점에서 고른 꾸미기(S.look)를 플레이어에게 적용한다 */
export function applyLook() {
  const me = G.me;
  if (!me) return;
  const p = me.userData,
    Lk = S.look,
    V = (k: string) => LOOK[k].v[Lk[k]] || LOOK[k].v[0];
  p.mat.shirt.color.set(V('shirt')[1]);
  p.mat.pants.color.set(V('pants')[1]);
  p.mat.sk.color.set(V('skin')[1]);
  dress(p.headG, Lk.hat, hex(V('hat')[1]), Lk.face, hex(V('face')[1]));
}
