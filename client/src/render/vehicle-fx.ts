// 차 파손 이펙트 파티클 풀: 연기·불꽃·김·물보라·스파크 — InstancedMesh 1개(드로콜 1회), 90개 고정.
import {G} from '../core/runtime.js';

export type FxKind = 'smoke' | 'dark' | 'fire' | 'steam' | 'spark' | 'splash' | 'debris';
interface P {
  on: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  t: number;
  life: number;
  s0: number;
  s1: number;
  g: number;
  kind: FxKind;
}
const MAX = 90;
const COL: Record<FxKind, number> = {smoke: 0xc8ccd2, dark: 0x2a2a30, fire: 0xff8a2a, steam: 0xf2f6fa, spark: 0xffd84a, splash: 0xdff3ff, debris: 0x555a64};
const pool: P[] = [];
let mesh: any = null,
  dummy: any = null,
  col: any = null,
  next = 0;

function init() {
  if (mesh || !G.scene) return;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({transparent: true, opacity: 0.88, depthWrite: false}), MAX);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  dummy = new THREE.Object3D();
  col = new THREE.Color();
  for (let i = 0; i < MAX; i++) {
    pool.push({on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: 1, s0: 0, s1: 0, g: 0, kind: 'smoke'});
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, col.setHex(0xffffff));
  }
  G.scene.add(mesh);
}
const R = (a: number) => (Math.random() - 0.5) * a;
/** 파티클 1개 방출. 부족하면 가장 오래된 것을 덮어쓴다 */
export function puff(kind: FxKind, x: number, y: number, z: number) {
  init();
  if (!mesh) return;
  const p = pool[next++ % MAX];
  p.on = true;
  p.kind = kind;
  p.x = x;
  p.y = y;
  p.z = z;
  p.t = 0;
  p.g = 0;
  p.vx = R(0.8);
  p.vz = R(0.8);
  switch (kind) {
    case 'smoke': p.vy = 1.6 + Math.random(); p.life = 1.8; p.s0 = 0.4; p.s1 = 1.7; break;
    case 'dark': p.vy = 2 + Math.random() * 1.2; p.life = 2.4; p.s0 = 0.5; p.s1 = 2.4; break;
    case 'steam': p.vy = 2.4 + Math.random(); p.life = 1.5; p.s0 = 0.35; p.s1 = 1.6; break;
    case 'fire': p.vy = 1.8 + Math.random(); p.life = 0.55; p.s0 = 0.7; p.s1 = 0.1; p.vx = R(1.2); p.vz = R(1.2); break;
    case 'spark': p.vy = 3 + Math.random() * 3; p.life = 0.45; p.s0 = 0.18; p.s1 = 0.04; p.g = 14; p.vx = R(9); p.vz = R(9); break;
    case 'splash': p.vy = 4 + Math.random() * 4; p.life = 0.8; p.s0 = 0.5; p.s1 = 0.1; p.g = 14; p.vx = R(6); p.vz = R(6); break;
    case 'debris': p.vy = 2 + Math.random() * 3; p.life = 0.9; p.s0 = 0.28; p.s1 = 0.2; p.g = 14; p.vx = R(7); p.vz = R(7); break;
  }
  col.setHex(COL[kind]);
  mesh.setColorAt(pool.indexOf(p), col);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
/** 매 프레임 갱신 (살아 있는 것이 없으면 거의 공짜) */
let live = 0;
export function updateFx(dt: number) {
  if (!mesh || (!live && next === 0)) return;
  live = 0;
  for (let i = 0; i < MAX; i++) {
    const p = pool[i];
    if (!p.on) continue;
    p.t += dt;
    if (p.t >= p.life) {
      p.on = false;
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      continue;
    }
    live++;
    p.vy -= p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    const k = p.t / p.life;
    // 연기는 커지다가 끝에서 사그라든다, 나머지는 줄어든다
    const grow = p.kind === 'smoke' || p.kind === 'dark' || p.kind === 'steam';
    const s = grow ? (p.s0 + (p.s1 - p.s0) * k) * (k > 0.7 ? (1 - k) / 0.3 : 1) : p.s0 + (p.s1 - p.s0) * k;
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(k * 2, k * 3 + i, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
export const fxLive = () => live;
