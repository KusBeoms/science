// 도시 포탈 광장 (core/plaza.ts): 12 섹터 포탈 기둥 한 줄 + 허브 받침. 기둥은 하나의 병합 메시, 포탈 창·이름표만 기둥마다 따로 둔다.
// 상태는 글 없이 보인다: 열림 = 섹터 색 창이 맥동 + 🔓, 잠김 = 어두운 창 + 🔒.
import {G} from '../core/runtime.js';
import {S} from '../core/state.js';
import {PLAZA, pillarPos} from '../core/plaza.js';
import {groundH} from '../core/terrain.js';
import {SECTORS} from '../data/sectors.js';
import {BIOME, NEUTRAL, type Biome} from './lowpoly/palette.js';
import {lowMat, mergeGeometries} from './lowpoly/merge.js';
import {box, cyl, ico} from './lowpoly/prim.js';
import {portalFrame} from './portal-art.js';
import {label} from './textures.js';

/** 점 n 개 (4개씩 끊어 읽기 쉽게). 구역 번호를 글 없이 나타낸다 */
export const dots = (n: number) => Array.from({length: n}, (_, i) => (i && i % 4 === 0 ? ' •' : '•')).join('');

interface Slot {
  win: any;
  lb: any;
  accent: number;
  state: number; // 0 미설정, 1 잠김, 2 열림
}
const slots: Slot[] = [];

/** 포탈 기둥 12개 + 허브 받침을 씬에 놓는다 (buildPads 에서 한 번) */
export function buildPlaza() {
  slots.length = 0;
  const parts: any[] = [cyl(7, 0.35, NEUTRAL.slate, PLAZA.x, 0, PLAZA.z, 0, 24), cyl(5.6, 0.5, NEUTRAL.stone, PLAZA.x, 0, PLAZA.z, 0, 24)];
  const grp = new THREE.Group();
  SECTORS.forEach((s, i) => {
    const {x, z} = pillarPos(i, SECTORS.length),
      accent = BIOME[s.id as Biome][5];
    parts.push(portalFrame(s.id, x, z));
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 5.8),
      new THREE.MeshBasicMaterial({color: accent, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false})
    );
    win.position.set(x, 3.5, z);
    const lb = label('', '#ffffff', 5);
    lb.position.set(x, 12, z);
    grp.add(win, lb);
    slots.push({win, lb, accent, state: 0});
  });
  const base = new THREE.Mesh(mergeGeometries(parts), lowMat());
  grp.add(base);
  grp.position.y = groundH(PLAZA.x, PLAZA.z);
  G.scene.add(grp);
}

/** 매 프레임: 해금 상태에 맞춰 창 색·이름표를 바꾸고 맥동시킨다 */
export function updatePlaza(t: number) {
  slots.forEach((sl, i) => {
    const open = !!S.unlocked[SECTORS[i].id],
      st = open ? 2 : 1;
    if (sl.state !== st) {
      sl.state = st;
      sl.win.material.color.setHex(open ? sl.accent : 0x39414f);
      sl.lb.userData.setText(`${SECTORS[i].icon}${open ? '🔓' : '🔒'}`, open ? '#9dffb0' : '#c6ccd6');
    }
    sl.win.material.opacity = open ? 0.55 + 0.18 * Math.sin(t * 3 + i) : 0.45;
  });
}
