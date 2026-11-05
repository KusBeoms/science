// 물 연출: 파문 고리(헤엄·입수 때 퍼지는 흰 고리) 풀 + 물보라 방울. 수면 y 에 평평하게 눕힌다.
import {G} from '../core/runtime.js';

interface Ring {
  m: any;
  t: number;
  life: number;
}
const rings: Ring[] = [];
let ringGeo: any = null;
let next = 0;
const POOL = 14;

/** (x,y,z) 수면에 파문 하나. big 이면 크고 느리게(입수) */
export function ripple(x: number, y: number, z: number, big = false) {
  if (!ringGeo) {
    ringGeo = new THREE.RingGeometry(0.8, 1.0, 28);
    ringGeo.rotateX(-Math.PI / 2);
  }
  let r = rings[next];
  if (!r) {
    r = {m: new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: true})), t: 1, life: 1};
    r.m.visible = false;
    r.m.renderOrder = 3;
    G.scene.add(r.m);
    rings[next] = r;
  }
  next = (next + 1) % POOL;
  r.t = 0;
  r.life = big ? 1.6 : 1.1;
  r.m.position.set(x, y + 0.06, z);
  r.m.userData.big = big;
  r.m.visible = true;
}
export function rippleUpdate(dt: number) {
  for (const r of rings) {
    if (!r || !r.m.visible) continue;
    r.t += dt / r.life;
    if (r.t >= 1) {
      r.m.visible = false;
      continue;
    }
    r.m.scale.setScalar(0.4 + r.t * (r.m.userData.big ? 5 : 3));
    r.m.material.opacity = 0.7 * (1 - r.t);
  }
}

// 물보라: 입수 순간 튀는 방울 (Points 하나 재사용)
let pts: any = null;
const N = 24;
const vel = new Float32Array(N * 3);
let spT = 0;
export function splashAt(x: number, y: number, z: number) {
  if (!pts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    pts = new THREE.Points(g, new THREE.PointsMaterial({color: 0xdff6ff, size: 0.28, transparent: true, opacity: 0.9, depthWrite: false}));
    pts.frustumCulled = false;
    pts.visible = false;
    G.scene.add(pts);
  }
  const p = pts.geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < N; i++) {
    const a = Math.random() * 6.283, s = 0.6 + Math.random() * 1.6;
    p.set([x, y, z], i * 3);
    vel.set([Math.cos(a) * s, 3 + Math.random() * 3, Math.sin(a) * s], i * 3);
  }
  pts.geometry.attributes.position.needsUpdate = true;
  pts.visible = true;
  spT = 0.8;
}
export function splashUpdate(dt: number) {
  if (!pts || !pts.visible) return;
  spT -= dt;
  if (spT <= 0) return void (pts.visible = false);
  const p = pts.geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < N; i++) {
    vel[i * 3 + 1] -= 14 * dt;
    p[i * 3] += vel[i * 3] * dt;
    p[i * 3 + 1] += vel[i * 3 + 1] * dt;
    p[i * 3 + 2] += vel[i * 3 + 2] * dt;
  }
  pts.geometry.attributes.position.needsUpdate = true;
  pts.material.opacity = Math.min(0.9, spT * 2);
}
