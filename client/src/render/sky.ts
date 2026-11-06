// 하늘: 카메라를 따라다니는 천구(그라디언트 돔 · 별 · 해 · 달 · 사과 행성)와 낮밤 조명·안개색.
// 천구 오브젝트는 전부 안개·깊이를 무시하고 불투명 패스의 맨 앞(renderOrder < 0)에서 그려져 지형·건물이 그 위를 덮는다. 드로우콜 6
import {G} from '../core/runtime.js';
import {CYCLE_S, visualTint} from '../systems/daynight.js';
import {buildApple, dimApple, pulseHalo, type Apple} from './apple.js';
import {mulberry32} from './lowpoly/rng.js';
import {ico} from './lowpoly/prim.js';
import {TINT, rgb, mix, type Tint} from './lowpoly/palette.js';
import {dimTint, stepInteriorDark} from './interior-dark.js';

const DOME_R = 1000,
  STAR_R = 900,
  BODY_R = 850,
  APPLE_R = 800,
  STARS = 1500,
  SEG = 16;
/** 사과: 정북(-z) 고도 17°, 각지름 약 7° */
const APPLE_ELEV = (17 * Math.PI) / 180,
  APPLE_SIZE = APPLE_R * Math.tan((3.5 * Math.PI) / 180);
/** 돔 위도 고리(도)와 고리별 하늘색 비율(0 = 지평선 안개색, 1 = 천정색) */
const RINGS: [number, number][] = [[-90, 0], [-50, 0], [-12, 0], [0, 0], [8, 0.28], [20, 0.66], [40, 0.94], [65, 1], [90, 1]];
const MOON_DIR = [0.53, 0.375, -0.76];

let root: any, domeGeo: any, stars: any, sun: any, moon: any, apple: Apple, hemi: any, sunLight: any;

function buildDome(): any {
  const rows = RINGS.length,
    pos = new Float32Array(rows * (SEG + 1) * 3),
    idx: number[] = [];
  RINGS.forEach(([lat], j) => {
    const y = Math.sin((lat * Math.PI) / 180) * DOME_R,
      rr = Math.cos((lat * Math.PI) / 180) * DOME_R;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      pos.set([Math.cos(a) * rr, y, Math.sin(a) * rr], (j * (SEG + 1) + i) * 3);
    }
    if (j < rows - 1) {
      for (let i = 0; i < SEG; i++) {
        const a = j * (SEG + 1) + i, b = a + SEG + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  });
  domeGeo = new THREE.BufferGeometry();
  domeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  domeGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
  domeGeo.setIndex(idx);
  const m = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.DoubleSide, fog: false, depthTest: false, depthWrite: false}));
  m.renderOrder = -4;
  m.frustumCulled = false;
  return m;
}

/** 위쪽 반구에 흩뿌린 별 (정점색으로 푸른/따뜻한 빛 변화) */
function buildStars(): any {
  const rnd = mulberry32(2611),
    pos = new Float32Array(STARS * 3),
    col = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const a = rnd() * Math.PI * 2,
      y = 0.03 + rnd() * 0.97,
      r = Math.sqrt(1 - y * y),
      warm = rnd(),
      b = 0.55 + rnd() * 0.45;
    pos.set([Math.cos(a) * r * STAR_R, y * STAR_R, Math.sin(a) * r * STAR_R], i * 3);
    col.set([b * (0.85 + warm * 0.15), b * 0.92, b * (1.0 - warm * 0.2)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(
    g,
    new THREE.PointsMaterial({size: 2.2, sizeAttenuation: false, vertexColors: true, blending: THREE.AdditiveBlending, fog: false, depthTest: false, depthWrite: false}),
  );
  p.renderOrder = -3;
  p.frustumCulled = false;
  return p;
}

/** 해: 노란 광채 + 둥근 원반 */
function buildSun(): any {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!,
    g = x.createRadialGradient(64, 64, 6, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,1)');
  g.addColorStop(0.24, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, transparent: false, depthTest: false, depthWrite: false, fog: false}),
  );
  s.scale.setScalar(300);
  s.renderOrder = -2;
  return s;
}

/** 달: 면이 보이는 작은 로우폴리 구 (밝은 면 / 어두운 면을 정점색에 구움) */
function buildMoon(): any {
  const g = ico(1, 1, 0xe4e8ef),
    p = g.attributes.position,
    c = g.attributes.color;
  for (let t = 0; t < p.count; t += 3) {
    const nx = (p.getX(t) + p.getX(t + 1) + p.getX(t + 2)) / 3,
      ny = (p.getY(t) + p.getY(t + 1) + p.getY(t + 2)) / 3,
      k = 0.62 + 0.38 * Math.max(0, nx * -0.5 + ny * 0.6 + 0.4);
    for (let i = t; i < t + 3; i++) c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k * 1.04);
  }
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({vertexColors: true, fog: false, depthTest: false, depthWrite: false}));
  m.scale.setScalar(36);
  m.renderOrder = -2;
  m.frustumCulled = false;
  return m;
}

/** 씬에 하늘을 만든다 (initWorld 에서 한 번). 조명(반구광 + 해/달빛)도 여기서 만들어 틴트와 함께 갱신한다 */
export function initSky() {
  G.scene.background = new THREE.Color(TINT.day.fog);
  G.scene.fog = new THREE.Fog(TINT.day.fog, 160, 520);
  hemi = new THREE.HemisphereLight(0xffffff, 0x303850, 0.95);
  sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
  G.scene.add(hemi, sunLight);
  apple = buildApple();
  apple.group.scale.setScalar(APPLE_SIZE);
  apple.group.position.set(0, Math.sin(APPLE_ELEV) * APPLE_R, -Math.cos(APPLE_ELEV) * APPLE_R);
  stars = buildStars();
  sun = buildSun();
  moon = buildMoon();
  root = new THREE.Group();
  root.add(buildDome(), stars, sun, moon, apple.group);
  G.scene.add(root);
}
/** 해의 방향: 동쪽 낮은 곳에서 떠 남쪽 고도 45°(카메라 시야 상한 ≈ 27° 라 정오엔 안 보임)를 지나 서쪽으로 진다. 정북의 사과와 겹치지 않음 */
function sunDir(cycT: number): number[] {
  const p = Math.min(1, cycT / CYCLE_S),
    az = Math.PI * (0.1 + 0.8 * p),
    el = ((p < 0.2 ? 14 + 31 * (p / 0.2) : p < 0.75 ? 45 : 45 * (1 - Math.pow((p - 0.75) / 0.25, 0.8))) * Math.PI) / 180,
    h = Math.hypot(Math.cos(az), 0.45);
  return [(Math.cos(el) * Math.cos(az)) / h, Math.sin(el), (Math.cos(el) * 0.45) / h];
}

function paintDome(t: Tint) {
  const col = domeGeo.attributes.color;
  RINGS.forEach(([, f], j) => {
    const [r, g, b] = rgb(mix(t.fog, t.sky, f));
    for (let i = 0; i <= SEG; i++) col.setXYZ(j * (SEG + 1) + i, r, g, b);
  });
  col.needsUpdate = true;
}

/** 매 프레임 카메라 배치 이후 호출: 틴트 계산 → 돔 색·안개·조명·해/달/별/사과 갱신 후 천구를 카메라에 붙인다 */
/** 컷신이 자기 사과 배우를 쓰는 동안 하늘의 원경 사과를 숨긴다(두 개로 겹쳐 보이는 것 방지) */
export const setSkyApple = (on: boolean) => {
  if (apple) apple.group.visible = on;
};
export function updateSky(dt: number, time: number) {
  const raw = visualTint(dt),
    t = dimTint(raw, stepInteriorDark(dt)), // W8 INTERIOR: 건물 안이면 바깥을 어둡게(별·달 가시성은 원래 틴트 기준)
    dark = Math.min(1, Math.max(0, (0.75 - raw.hemiK) / 0.2)),
    sd = sunDir(G.cycT),
    night = G.night > 0;
  paintDome(t);
  G.scene.background.setHex(t.fog);
  G.scene.fog.color.setHex(t.fog);
  hemi.color.setHex(t.hemiSky);
  hemi.groundColor.setHex(t.hemiGround);
  hemi.intensity = t.hemiK;
  sunLight.color.setHex(t.sun);
  sunLight.intensity = t.sunK;
  const ld = night ? MOON_DIR : sd;
  sunLight.position.set(ld[0] * 100, ld[1] * 100, ld[2] * 100);
  stars.material.color.setScalar(dark);
  stars.visible = dark > 0.02;
  sun.visible = !night && sd[1] > 0.02;
  sun.position.set(sd[0] * BODY_R, sd[1] * BODY_R, sd[2] * BODY_R);
  sun.material.color.setHex(t.sun);
  moon.visible = dark > 0.6;
  moon.position.set(MOON_DIR[0] * BODY_R, MOON_DIR[1] * BODY_R, MOON_DIR[2] * BODY_R);
  moon.material.color.setScalar(Math.min(1, dark * 1.3));
  pulseHalo(apple, time);
  dimApple(apple, 1 - dark);
  root.position.copy(G.camera.position);
}
