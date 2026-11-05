// 구역 날씨 (WORLD 6.4): 카메라 둘레 상자 안에서 도는 입자 한 묶음(Points 1개)을 구역이 바뀔 때 종류만 바꿔 쓴다. 도시와 평소 구역은 날씨 없음.
// 눈(거대 행성) · 불씨(뜨거운 목성) · 안개 띠(성운) · 결정 파편(초신성 잔해) · 포자(알파 센타우리). 글자 없음, 상태 저장 없음.
import {G} from '../core/runtime.js';
import {zoneAt} from '../core/geometry.js';
import {SECTORS} from '../data/sectors.js';
import type {GameSystem} from '../core/types.js';

export type WeatherKind = 'snow' | 'ember' | 'mist' | 'shard' | 'spore';
interface Spec {
  color: number;
  size: number;
  opacity: number;
  /** 초당 속도 (x, y, z) · 흔들림 진폭 */
  vel: [number, number, number];
  sway: number;
  count: number;
  additive: boolean;
}
export const WEATHER: Record<WeatherKind, Spec> = {
  snow: {color: 0xffffff, size: 9, opacity: 0.95, vel: [1.5, -3.2, 0.6], sway: 1.2, count: 260, additive: false},
  ember: {color: 0xff8a3a, size: 8, opacity: 1, vel: [0.8, 3.4, 0.4], sway: 1.6, count: 200, additive: true},
  mist: {color: 0xc9a8ff, size: 90, opacity: 0.2, vel: [2.6, 0, 1.2], sway: 0.6, count: 26, additive: false},
  shard: {color: 0xbfe8ff, size: 9, opacity: 0.95, vel: [0.4, -1.6, 0.2], sway: 0.5, count: 160, additive: true},
  spore: {color: 0xb6ff7a, size: 9, opacity: 0.9, vel: [0.5, 1.1, 0.4], sway: 2.2, count: 180, additive: true},
};
/** 구역 id → 날씨 */
export const SECTOR_WEATHER: Record<string, WeatherKind> = {
  giants: 'snow',
  hotjup: 'ember',
  nebula: 'mist',
  supernova: 'shard',
  alpha: 'spore',
};
/** 카메라 둘레 상자 한 변(가로) · 높이 */
const BOX = 70,
  TALL = 34,
  MAX = 260,
  FADE = 1.2;

let pts: any = null,
  attr: any = null,
  cur: WeatherKind | null = null,
  alpha = 0,
  t = 0;
const seed = new Float32Array(MAX * 3);
/** v 를 [lo, lo+span) 로 감는다 */
const wrap = (v: number, lo: number, span: number) => ((((v - lo) % span) + span) % span) + lo;

function dotTexture(): any {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!,
    g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
function init() {
  const pos = new Float32Array(MAX * 3);
  for (let i = 0; i < MAX * 3; i++) seed[i] = Math.random();
  for (let i = 0; i < MAX; i++) {
    pos[i * 3] = (seed[i * 3] - 0.5) * BOX;
    pos[i * 3 + 1] = seed[i * 3 + 1] * TALL;
    pos[i * 3 + 2] = (seed[i * 3 + 2] - 0.5) * BOX;
  }
  const g = new THREE.BufferGeometry();
  attr = new THREE.BufferAttribute(pos, 3);
  g.setAttribute('position', attr);
  pts = new THREE.Points(g, new THREE.PointsMaterial({map: dotTexture(), size: 4, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false}));
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  pts.visible = false;
  G.scene.add(pts);
}

/** 지금 서 있는 구역의 날씨 (없으면 null) */
export function weatherHere(): WeatherKind | null {
  const z = zoneAt();
  return z >= 0 ? SECTOR_WEATHER[SECTORS[z].id] ?? null : null;
}
/** 현재 켜진 날씨와 보이는 입자 수 (테스트·디버그용) */
export const weatherState = () => ({kind: cur, alpha, visible: !!pts && pts.visible});

function apply(k: WeatherKind) {
  const s = WEATHER[k];
  cur = k;
  pts.material.color.setHex(s.color);
  pts.material.size = s.size;
  pts.material.blending = s.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
  pts.material.needsUpdate = true;
  pts.geometry.setDrawRange(0, s.count);
}

export const weatherSystem: GameSystem = {
  id: 'weather',
  update(dt, raw) {
    if (!pts) init();
    const want = weatherHere();
    // 종류가 바뀌면 현재 것을 서서히 끄고, 꺼지면 새 것을 켠다
    if (want !== cur) {
      alpha = Math.max(0, alpha - raw / FADE);
      if (alpha === 0 && want) apply(want);
      else if (alpha === 0) cur = null;
    } else if (cur) alpha = Math.min(1, alpha + raw / FADE);
    pts.visible = !!cur && alpha > 0;
    if (!pts.visible) return;
    const s = WEATHER[cur!],
      cam = G.camera.position,
      a = attr.array as Float32Array;
    t += dt;
    pts.material.opacity = s.opacity * alpha;
    for (let i = 0; i < s.count; i++) {
      const o = i * 3;
      a[o] += (s.vel[0] + Math.sin(t * 0.9 + seed[o] * 20) * s.sway) * dt;
      a[o + 1] += s.vel[1] * dt;
      a[o + 2] += (s.vel[2] + Math.cos(t * 0.7 + seed[o + 2] * 20) * s.sway) * dt;
      // 카메라 둘레 상자로 감아 돌린다 (멀리 순간이동해도 한 번에 상자 안으로 들어온다)
      a[o] = cam.x + wrap(a[o] - cam.x, -BOX / 2, BOX);
      a[o + 2] = cam.z + wrap(a[o + 2] - cam.z, -BOX / 2, BOX);
      a[o + 1] = cam.y + wrap(a[o + 1] - cam.y, -TALL * 0.4, TALL);
    }
    attr.needsUpdate = true;
  },
};
