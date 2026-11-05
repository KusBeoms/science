// 물 셰이더 (r128 ShaderMaterial): 바다와 호수가 같은 규칙을 쓴다.
// 깊이 = 수면 − 지면(지면 높이 격자를 float 텍스처로 올려 픽셀마다 읽는다) → 얕은 곳 연한 청록, 깊은 곳 진한 남색, 가장자리 투명 + 움직이는 거품띠.
// 잔물결 = 방향이 다른 사인파 5개의 기울기로 만든 법선 → 하늘 반사(프레넬)·태양 하이라이트·반짝임. 낮밤은 조명 값(uLight/uSunK/uSunDir)으로 반영.
import {GX0, GZ0, NX, NZ, STEP, gridOf} from '../core/heightmap.js';

const WAVES = `
const vec2 D1 = vec2(0.86, 0.50), D2 = vec2(-0.50, 0.87), D3 = vec2(0.20, -0.98), D4 = vec2(-0.90, -0.43), D5 = vec2(0.65, -0.76);
float swell(vec2 p, float t) {
  return 0.30 * sin(dot(D1, p) * 0.35 + t * 0.9) + 0.16 * sin(dot(D2, p) * 0.62 + t * 1.3);
}
vec2 wgrad(vec2 p, float t) {
  vec2 g = D1 * (0.30 * 0.35 * cos(dot(D1, p) * 0.35 + t * 0.9));
  g += D2 * (0.16 * 0.62 * cos(dot(D2, p) * 0.62 + t * 1.3));
  g += D3 * (0.070 * 1.25 * cos(dot(D3, p) * 1.25 + t * 1.9));
  g += D4 * (0.035 * 2.40 * cos(dot(D4, p) * 2.40 + t * 2.7));
  g += D5 * (0.016 * 4.70 * cos(dot(D5, p) * 4.70 + t * 3.8));
  return g;
}`;

const VERT = `
uniform float uTime;
uniform float uAmp;
varying vec3 vWorld;
${WAVES}
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  wp.y += swell(wp.xz, uTime) * uAmp;
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = `
uniform float uTime, uLevel, uDeepD, uClear, uLight, uSunK, uFoam, uRough;
uniform vec3 uShallow, uDeep, uSky, uSunCol, uSunDir, uHemi;
uniform sampler2D uGround;
uniform vec3 uGrid;      // GX0, GZ0, STEP
uniform vec2 uTex;       // NX, NZ
uniform vec4 uHoleA[2];  // 호수 구멍(바다 전용): x, z, rx, rz
uniform vec2 uHoleB[2];  // cos, sin
varying vec3 vWorld;
${WAVES}
#include <fog_pars_fragment>
float gAt(float i, float j) {
  return texture2D(uGround, vec2((clamp(i, 0.0, uTex.x - 1.0) + 0.5) / uTex.x, (clamp(j, 0.0, uTex.y - 1.0) + 0.5) / uTex.y)).r;
}
float groundAt(vec2 p) {
  vec2 g = (p - uGrid.xy) / uGrid.z;
  vec2 i = floor(g), f = g - i;
  float a = mix(gAt(i.x, i.y), gAt(i.x + 1.0, i.y), f.x);
  float b = mix(gAt(i.x, i.y + 1.0), gAt(i.x + 1.0, i.y + 1.0), f.x);
  return mix(a, b, f.y);
}
void main() {
  for (int k = 0; k < 2; k++) {
    if (uHoleA[k].z > 0.0) {
      vec2 d = vWorld.xz - uHoleA[k].xy;
      float u = d.x * uHoleB[k].x + d.y * uHoleB[k].y, v = -d.x * uHoleB[k].y + d.y * uHoleB[k].x;
      if (length(vec2(u / uHoleA[k].z, v / uHoleA[k].w)) < 1.0) discard;
    }
  }
  float depth = uLevel - groundAt(vWorld.xz);
  if (depth < -0.3) discard;
  float cd = length(cameraPosition - vWorld);
  vec2 wg = wgrad(vWorld.xz, uTime) * mix(1.0, 0.3, smoothstep(40.0, 260.0, cd));
  vec3 N = normalize(vec3(-wg.x * uRough, 1.0, -wg.y * uRough));
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = max(dot(N, V), 0.0);
  float fres = pow(1.0 - ndv, 4.0);
  float dn = clamp(depth / uDeepD, 0.0, 1.0);
  vec3 col = mix(uShallow, uDeep, pow(dn, 0.55)) * uLight * mix(vec3(1.0), uHemi, 0.55);
  float alpha = mix(0.42, 0.95, smoothstep(0.0, uClear, depth)) * smoothstep(-0.05, 0.22, depth);
  col = mix(col, uSky, fres * 0.75);
  alpha = mix(alpha, 1.0, fres * 0.65);
  vec3 H = normalize(normalize(uSunDir) + V);
  float spec = pow(max(dot(N, H), 0.0), 110.0) * uSunK;
  col += uSunCol * spec * 1.5;
  alpha = max(alpha, min(1.0, spec));
  float sp = sin(vWorld.x * 2.3 + uTime * 2.0 + sin(vWorld.z * 1.7 + uTime)) * sin(vWorld.z * 2.9 - uTime * 2.4) * sin((vWorld.x - vWorld.z) * 1.9 + uTime * 1.5);
  sp = smoothstep(0.78, 1.0, sp) * uSunK * (0.35 + 0.65 * fres * 2.0) * (1.0 - smoothstep(60.0, 300.0, cd));
  col += uSunCol * sp * 0.9;
  alpha = max(alpha, sp);
  float fw = depth + 0.40 * sin(uTime * 1.3 + vWorld.x * 0.23 + vWorld.z * 0.19) + 0.16 * sin(uTime * 2.3 + vWorld.x * 0.7 - vWorld.z * 0.5);
  float foam = (1.0 - smoothstep(0.05, 0.75, fw)) * (0.55 + 0.45 * sin(vWorld.x * 1.7 + vWorld.z * 1.3 + uTime)) * uFoam;
  foam *= smoothstep(-0.25, 0.05, depth);
  col = mix(col, vec3(0.96, 0.98, 1.0) * (0.35 + 0.65 * uLight), clamp(foam, 0.0, 1.0));
  alpha = max(alpha, clamp(foam, 0.0, 0.92));
  gl_FragColor = vec4(col, alpha);
  #include <fog_fragment>
}`;

let groundTex: any = null;
/** 지면 높이 격자를 float 텍스처로 (모든 물이 공유) */
function groundTexture(): any {
  if (groundTex) return groundTex;
  const h = gridOf().h,
    d = new Float32Array(NX * NZ * 4);
  for (let k = 0; k < NX * NZ; k++) d[k * 4] = h[k];
  const t = new THREE.DataTexture(d, NX, NZ, THREE.RGBAFormat, THREE.FloatType);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return (groundTex = t);
}

export interface WaterOpts {
  level: number;
  shallow: number;
  deep: number;
  deepD: number;
  clear: number;
  amp: number;
  foam: number;
  rough: number;
  holes?: {x: number; z: number; rx: number; rz: number; rot: number}[];
}
const col = (c: number) => new THREE.Color(c);

/** 물 재질 하나. 매 프레임 uniform 은 syncWater(재질, 씬) 가 낮밤 조명으로 갱신한다 */
export function makeWaterMat(o: WaterOpts): any {
  const holes = [0, 1].map(i => {
    const h = o.holes?.[i];
    return h ? {a: new THREE.Vector4(h.x, h.z, h.rx, h.rz), b: new THREE.Vector2(Math.cos(h.rot), Math.sin(h.rot))} : {a: new THREE.Vector4(0, 0, 0, 1), b: new THREE.Vector2(1, 0)};
  });
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: {value: 0}, uLevel: {value: o.level}, uDeepD: {value: o.deepD}, uClear: {value: o.clear}, uLight: {value: 1}, uSunK: {value: 0.8},
        uFoam: {value: o.foam}, uRough: {value: o.rough}, uAmp: {value: o.amp},
        uShallow: {value: col(o.shallow)}, uDeep: {value: col(o.deep)}, uSky: {value: col(0xbcdcf0)}, uSunCol: {value: col(0xfff2d8)},
        uSunDir: {value: new THREE.Vector3(0.4, 0.8, 0.3)}, uHemi: {value: col(0xdcecff)},
        uGround: {value: groundTexture()}, uGrid: {value: new THREE.Vector3(GX0, GZ0, STEP)}, uTex: {value: new THREE.Vector2(NX, NZ)},
        uHoleA: {value: holes.map(h => h.a)}, uHoleB: {value: holes.map(h => h.b)},
      },
    ]),
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: THREE.DoubleSide,
  });
  return m;
}

let hemi: any = null,
  sun: any = null;
/** 낮밤 조명 → 물 uniform (메시의 onBeforeRender 에서 호출) */
export function syncWater(m: any, scene: any) {
  if (!hemi || !sun) {
    for (const c of scene.children) {
      if (c.isHemisphereLight) hemi = c;
      else if (c.isDirectionalLight) sun = c;
    }
    if (!hemi || !sun) return;
  }
  const u = m.uniforms,
    sk = sun.intensity,
    light = Math.min(1.1, 0.2 + 0.85 * (hemi.intensity * 0.4 + sk * 0.6));
  u.uTime.value = performance.now() / 1000;
  u.uLight.value = light;
  u.uSunK.value = sk;
  u.uSunCol.value.copy(sun.color);
  u.uSunDir.value.copy(sun.position).normalize();
  u.uHemi.value.copy(hemi.color);
  if (scene.fog) u.uSky.value.copy(scene.fog.color).multiplyScalar(0.55 + 0.45 * light);
}
