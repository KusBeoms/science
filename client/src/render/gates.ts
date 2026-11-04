// 구역 문 (docs/WORLD.md 2.4): 둘레 능선의 개구(폭 40)에 서는 돌 아치. 글 없이 형태와 아이콘으로 상태를 보인다.
//  far   = 회색 셔터(아직 멂) · next/ready = 붉은 안개 기둥 장벽 + 맥동 화살표(다음 차례, ready 는 조건 충족) · open = 아치 안에 초록 링
import {gateFrame} from '../core/geometry.js';
import {PASS_W} from '../data/world-map.js';
import {SECTORS} from '../data/sectors.js';
import {ACCENT, BIOME, NEUTRAL, PAL, mix, type Biome} from './lowpoly/palette.js';
import {lowMat, mergeGeometries} from './lowpoly/merge.js';
import {box, frustum, ico, panel, taper} from './lowpoly/prim.js';
import {label} from './textures.js';

export type GateState = 'open' | 'far' | 'next' | 'ready';
const ICON: Record<GateState, [string, string]> = {
  open: ['🔓', '#9dffb0'],
  far: ['🔒', '#c6ccd6'],
  next: ['🔒⚠️', '#ff8aa0'],
  ready: ['🔒📝', '#ffd27a'],
};
const HALF = PASS_W / 2,
  PILLAR_X = HALF + 2,
  TOP = 15,
  ARROW_Y = TOP + 5;

/** 점 n 개 (4개씩 끊어 읽기 쉽게). 구역 번호를 글 없이 나타낸다 */
export const dots = (n: number) => Array.from({length: n}, (_, i) => (i && i % 4 === 0 ? ' •' : '•')).join('');

/** 석조 아치: 기둥 2 + 상인방 + 머릿돌 + 기둥 위 등. 개구 폭은 PASS_W */
function archGeo(accent: number) {
  const parts = [-1, 1].flatMap(sg => [
    box(8, 1.2, 8, NEUTRAL.slate, sg * PILLAR_X, 0, 0),
    taper(5.2, 5.2, 4, 4, TOP, NEUTRAL.stone, sg * PILLAR_X, 1.2, 0),
    ico(1.3, 1, accent, sg * PILLAR_X, TOP + 2.4, 0),
  ]);
  parts.push(box(PILLAR_X * 2 + 5, 3, 5.2, NEUTRAL.ash, 0, TOP - 1.5, 0), taper(7, 5.6, 4, 4, 3.2, accent, 0, TOP + 1.5, 0));
  return mergeGeometries(parts);
}
/** 회색 셔터: 가로 판 5장 + 양쪽 레일 */
const shutterGeo = () =>
  mergeGeometries([
    ...[1.6, 4.2, 6.8, 9.4, 12].map(y => box(PASS_W, 1.9, 0.8, NEUTRAL.steel, 0, y - 0.9, 0)),
    box(1.2, TOP - 1.5, 1.4, NEUTRAL.coal, -HALF + 0.6, 0, 0),
    box(1.2, TOP - 1.5, 1.4, NEUTRAL.coal, HALF - 0.6, 0, 0),
  ]);
/** 안개 기둥 장벽: 개구를 가로지르는 육각 기둥 줄 + 붉은 막 */
const mistGeo = () =>
  mergeGeometries([
    ...Array.from({length: 7}, (_, k) => {
      const x = -HALF + 3.3 + k * ((PASS_W - 6.6) / 6);
      return frustum(6, 3.6, 2.6, 13 + (k % 2) * 1.5, mix(PAL.fog, PAL.red, 0.35), x, 0, (k % 2) * 1.2 - 0.6);
    }),
    panel(PASS_W, 13, PAL.red, 0, 6.5, 0),
    panel(PASS_W, 13, PAL.red, 0, 6.5, 0, Math.PI),
  ]);

/** 문 하나: {grp, panel(잠금 장벽 묶음), gl(상태 아이콘 이름표)}. 상태는 setGateState 로 바꾼다 */
export function makeGate(parent: any, i: number) {
  const s = SECTORS[i],
    f = gateFrame(i),
    accent = BIOME[s.id as Biome][5],
    g = new THREE.Group(),
    arch = new THREE.Mesh(archGeo(accent), lowMat()),
    shutter = new THREE.Mesh(shutterGeo(), lowMat()),
    mist = new THREE.Mesh(
      mistGeo(),
      new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide})
    ),
    arrow = new THREE.Mesh(
      mergeGeometries([taper(0, 0, 8, 1.4, 4.5, PAL.red), box(2.4, 5, 1.4, PAL.red, 0, 4.5, 0)]),
      new THREE.MeshBasicMaterial({color: PAL.red})
    ),
    ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 5, 24), new THREE.MeshBasicMaterial({color: ACCENT.lime})),
    gl = label('', '#ffffff', 16),
    barrier = new THREE.Group();
  arrow.position.set(0, ARROW_Y, 0);
  ring.position.set(0, 7, 0);
  ring.scale.set(HALF - 1, 6.5, 1); // 개구에 맞춘 납작한 링
  gl.position.set(0, TOP + 17, 0);
  barrier.add(shutter, mist);
  g.add(arch, barrier, arrow, ring, gl);
  g.position.set(f.x, 0, f.z);
  if (f.lz) g.rotation.y = Math.PI / 2;
  g.userData.pick = {kind: 'gate', i};
  g.userData.parts = {shutter, mist, arrow, ring};
  parent.add(g);
  return {grp: g, panel: barrier, gl};
}

/** 문 모양과 아이콘을 상태에 맞춘다 (바뀔 때만 다시 그림) */
export function setGateState(gate: {grp: any; panel: any; gl: any}, state: GateState, i: number) {
  const g = gate.grp;
  if (g.userData.state === state) return;
  g.userData.state = state;
  const {shutter, mist, arrow, ring} = g.userData.parts,
    lk = state !== 'open';
  gate.panel.visible = lk;
  shutter.visible = state === 'far';
  mist.visible = arrow.visible = state === 'next' || state === 'ready';
  ring.visible = !lk;
  arrow.material.color.setHex(state === 'ready' ? ACCENT.amber : PAL.red);
  const [icon, color] = ICON[state];
  gate.gl.userData.setText(`${icon} ${dots(i + 1)}`, color);
}

/** 매 프레임: 안개 장벽과 화살표 맥동 */
export function animateGate(gate: {grp: any}, t: number) {
  const {mist, arrow} = gate.grp.userData.parts;
  if (mist.visible) mist.material.opacity = 0.26 + 0.1 * Math.sin(t * 3);
  if (arrow.visible) {
    arrow.position.y = ARROW_Y + Math.sin(t * 4) * 0.8;
    arrow.scale.setScalar(1 + 0.08 * Math.sin(t * 4));
  }
}
