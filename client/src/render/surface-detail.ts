// Shared neutral detail maps: source luminance changes texture, never the palette or mesh count.
import {G} from '../core/runtime.js';
import {terrainDetailMask, TERRAIN_DETAIL_MASK_BYTES} from './terrain-detail.js';
const NAMES = ['natural-a', 'natural-b', 'built-a', 'built-b'] as const;
type State = 'idle' | 'loading' | 'ready' | 'error';
const records = NAMES.map(name => ({name, url: new URL(`../../assets/surfaces/${name}.png`, import.meta.url).href,
  state: 'idle' as State, width: 1, height: 1, error: ''}));
let material: any = null, fallback: any = null, ready: Promise<void> | null = null;
let uniforms: Record<string, {value: any}>;
let maskBytes = 0;
function mipBytes(w: number, h: number) {
  let sum = 0;
  do { sum += w * h * 4; w = Math.floor(w / 2); h = Math.floor(h / 2); } while (w && h);
  return sum;
}
function configure(texture: any) {
  texture.encoding = THREE.LinearEncoding;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.premultiplyAlpha = false;
  texture.anisotropy = Math.min(4, G.renderer?.capabilities.getMaxAnisotropy() || 1);
  texture.userData = {...texture.userData,keep:true};
  return texture;
}
function loadTextures() {
  if (ready) return ready;
  fallback = configure(new THREE.DataTexture(new Uint8Array([128, 128, 128, 128]), 1, 1, THREE.RGBAFormat));
  fallback.needsUpdate = true;
  const terrain = terrainDetailMask(); maskBytes = terrain.bytes;
  uniforms = {surfaceLoaded: {value: new THREE.Vector4(0, 0, 0, 0)}, surfaceEnabled: {value: 1},
    surfaceTerrainMask: {value: terrain.texture},
    surfaceTerrainGrid: {value: new THREE.Vector4(terrain.x0, terrain.z0, terrain.step, 0)},
    surfaceTerrainSize: {value: new THREE.Vector4(terrain.columns, terrain.rows, terrain.width, terrain.height)}};
  for (let i = 0; i < NAMES.length; i++) uniforms[`surfaceMap${i}`] = {value: fallback};
  ready = Promise.all(records.map((record, i) => new Promise<void>(resolve => {
    record.state = 'loading';
    new THREE.TextureLoader().load(record.url, (texture: any) => {
      if (texture.image.width !== 512 || texture.image.height !== 512) {
        texture.dispose(); record.state = 'error'; record.error = 'Expected a 512x512 detail map'; resolve(); return;
      }
      configure(texture); record.state = 'ready';
      record.width = texture.image.width; record.height = texture.image.height;
      uniforms[`surfaceMap${i}`].value = texture;
      uniforms.surfaceLoaded.value.setComponent(i, 1);
      resolve();
    }, undefined, () => { record.state = 'error'; record.error = 'Texture loading failed'; resolve(); });
  }))).then(() => undefined);
  return ready;
}
const PARS = `
varying vec3 vSurfaceWorld;
varying vec3 vSurfaceNormal;
varying vec3 vSurfaceDetail;
`;
const FRAGMENT = `
uniform sampler2D surfaceMap0, surfaceMap1, surfaceMap2, surfaceMap3, surfaceTerrainMask;
uniform vec4 surfaceTerrainGrid, surfaceTerrainSize;
uniform vec4 surfaceLoaded;
uniform float surfaceEnabled;
float surfaceChannel(vec4 data, float channel) {
  if (channel < 0.5) return data.r;
  if (channel < 1.5) return data.g;
  if (channel < 2.5) return data.b;
  return data.a;
}
float surfaceTerrainKind(vec2 worldXZ) {
  vec2 grid = clamp(floor((worldXZ - surfaceTerrainGrid.xy) / surfaceTerrainGrid.z + 0.5), vec2(0.0), surfaceTerrainSize.xy - 1.0);
  vec2 texel = floor(grid * 0.5);
  vec4 ids = texture2D(surfaceTerrainMask, (texel + 0.5) / surfaceTerrainSize.zw);
  float channel = mod(grid.x, 2.0) + 2.0 * mod(grid.y, 2.0);
  return floor(surfaceChannel(ids, channel) * 255.0 + 0.5);
}
float surfaceValue(vec4 a, vec4 b, vec4 c, vec4 d, float kind) {
  if (kind < 3.5) return surfaceChannel(a, kind);
  if (kind < 7.5) return surfaceChannel(b, kind - 4.0);
  if (kind < 11.5) return surfaceChannel(c, kind - 8.0);
  return surfaceChannel(d, kind - 12.0);
}
`;
// r128 does not upload cameraPosition for plain Lambert; viewMatrix is always current.
const APPLY = `
float surfaceFade = isOrthographic ? 1.0 : 1.0 - smoothstep(180.0, 350.0, length((viewMatrix * vec4(vSurfaceWorld, 1.0)).xyz));
float surfaceAmount = clamp(vSurfaceDetail.z, 0.0, 1.0) * surfaceFade * surfaceEnabled;
if (surfaceAmount > 0.001) {
  vec3 axisNormal = abs(normalize(vSurfaceNormal));
  vec2 surfaceUV;
  if (axisNormal.y >= axisNormal.x && axisNormal.y >= axisNormal.z) surfaceUV = vSurfaceWorld.xz;
  else if (axisNormal.x >= axisNormal.z) surfaceUV = vSurfaceWorld.zy;
  else surfaceUV = vSurfaceWorld.xy;
  surfaceUV /= max(0.1, vSurfaceDetail.y);
  // Every lookup precedes material/channel selection; no dynamic sampler indexing in WebGL1.
  vec4 a = mix(vec4(0.5), texture2D(surfaceMap0, surfaceUV), surfaceLoaded.x);
  vec4 b = mix(vec4(0.5), texture2D(surfaceMap1, surfaceUV), surfaceLoaded.y);
  vec4 c = mix(vec4(0.5), texture2D(surfaceMap2, surfaceUV), surfaceLoaded.z);
  vec4 d = mix(vec4(0.5), texture2D(surfaceMap3, surfaceUV), surfaceLoaded.w);
  // IDs are categorical: terrain reads a nearest grid ID, primitives keep their explicit integer ID.
  float kind = vSurfaceDetail.x > 15.5 ? surfaceTerrainKind(vSurfaceWorld.xz) : floor(clamp(vSurfaceDetail.x, 0.0, 15.0) + 0.5);
  // Disabled ID255 stays neutral even when a neighboring vertex contributes contrast.
  if (kind < 15.5) {
    float grain = surfaceValue(a, b, c, d, kind);
    diffuseColor.rgb *= mix(1.0, grain * 2.0, surfaceAmount);
  }
}
`;
/** One opt-in Lambert for terrain, merged building surfaces and props. lowMat remains untouched. */
export function surfaceMaterial(): any {
  loadTextures();
  if (!material) {
    material = new THREE.MeshLambertMaterial({vertexColors: true});
    material.userData.keep = true;
    material.name = 'surface-detail';
    material.defaultAttributeValues = {color: [1, 1, 1], uv: [0, 0], uv2: [0, 0], surfaceDetail: [0, 4, 0]};
    material.customProgramCacheKey = () => 'surface-detail-v3-disabled-terrain-id';
    material.onBeforeCompile = (shader: any) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 surfaceDetail;\n' + PARS)
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 surfaceWorld = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
          surfaceWorld = instanceMatrix * surfaceWorld;
          #endif
          vSurfaceWorld = (modelMatrix * surfaceWorld).xyz;
          vSurfaceNormal = inverseTransformDirection(transformedNormal, viewMatrix);
          vSurfaceDetail = surfaceDetail;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + PARS + FRAGMENT)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + APPLY);
    };
  }
  return material;
}
/** Apply an explicit material ID (0..15), world repeat period and contrast to an entire primitive. */
export function markSurface<T extends {attributes: any; setAttribute: any}>(geo: T, kind: number, scale = 4, strength = 0.55): T {
  const count = geo.attributes.position.count, data = new Float32Array(count * 3),
    k = Number.isFinite(kind) ? Math.round(Math.max(0, Math.min(15, kind))) : 0,
    size = Number.isFinite(scale) ? Math.max(0.1, scale) : 4,
    amount = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
  for (let i = 0; i < data.length; i += 3) { data[i] = k; data[i + 1] = size; data[i + 2] = amount; }
  geo.setAttribute('surfaceDetail', new THREE.BufferAttribute(data, 3));
  return geo;
}
/** Resolves even after a failed URL: the neutral fallback remains renderable and stats expose failure. */
export function surfaceTexturesReady(): Promise<void> { return loadTextures(); }
/** Debug/quality control, without replacing meshes or materials. */
export function setSurfaceDetailEnabled(on:boolean) {loadTextures();uniforms.surfaceEnabled.value=on?1:0;}
export function surfaceTextureStats() {
  const loaded = records.filter(r => r.state === 'ready'), failed = records.filter(r => r.state === 'error'),
    gpuBytes = loaded.reduce((n, r) => n + mipBytes(r.width, r.height), (fallback ? 4 : 0) + maskBytes);
  return {loaded: loaded.length, failed: failed.length, pending: records.length - loaded.length - failed.length,
    logicalMaps: records.length, maps: records.map(r => ({...r})), maskBytes, gpuBytes, gpuMiB: gpuBytes / 1048576,
    maxGpuBytes: 4 * mipBytes(512, 512) + 4 + TERRAIN_DETAIL_MASK_BYTES, materialCreated: !!material};
}
