// 전후 비교 이미지: (1) 상공 언덕음영(전/후/차) 캔버스 PNG (2) three.js 지상·사선 샷 — 같은 메시·같은 조명으로 전/후만 바꿔 찍는다.
// 게임 자체 재질이 아니라 비교용 단색 정점색 메시다 (게임은 아직 JSON 을 읽지 않는다).
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THREE = path.resolve(HERE, '../tests/vendor/three.min.js');
const ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];

/** 지상·사선 시점 [이름, 눈(x,z, 지면 위 높이), 바라보는 점(x,z,y 보정), fov] — 도시 가장자리에서 산·능선·도로·해변을 본다 */
export const VIEWS = [
  ['ground-spawn-north', [0, 17, 1.7], [0, -520, 20], 60],
  ['ground-north-ridge', [60, -330, 1.7], [140, -640, 60], 60],
  ['ground-west-ridge', [-330, -30, 1.7], [-500, -40, 60], 62],
  ['ground-mroad', [470, -215, 1.7], [620, -270, 20], 62],
  ['ground-south-beach', [74, 340, 1.7], [74, 420, 0], 70],
  ['oblique-north', [60, -150, 220], [140, -620, 20], 58],
  ['oblique-east-peninsula', [380, 120, 250], [800, -250, 20], 58],
];

async function pageRender(D) {
  const T = window.THREE, {nx, nz, ox, oz, step, views, W, H} = D;
  const renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
  renderer.setSize(W, H);
  const mk = (h) => {
    const g = new T.BufferGeometry(), pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const o = j * nx + i; pos.set([ox + i * step, h[o], oz + j * step], o * 3); }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1); }
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    for (let o = 0; o < nx * nz; o++) {
      const y = h[o], steep = 1 - nrm.getY(o);
      const grass = y < 2 && D.beach[o] ? [0.85, 0.78, 0.55] : [0.32 + y * 0.0012, 0.5 - y * 0.0008, 0.24];
      let c = grass;
      if (!D.land[o]) c = y < -1 ? [0.1, 0.25, 0.4] : [0.3, 0.45, 0.6];
      else {
        const k = Math.min(1, Math.max(0, (steep - 0.15) / 0.3)), rock = [0.5, 0.47, 0.42], sn = Math.min(1, Math.max(0, (y - 90) / 12));
        c = c.map((v, a) => v + (rock[a] - v) * k);
        c = c.map((v, a) => v + ([0.95, 0.96, 0.98][a] - v) * sn);
      }
      col.set(c, o * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    return new T.Mesh(g, new T.MeshLambertMaterial({vertexColors: true}));
  };
  const hAt = (h, x, z) => { const u = Math.min(nx - 1.001, Math.max(0, (x - ox) / step)), v = Math.min(nz - 1.001, Math.max(0, (z - oz) / step)), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, o = j * nx + i;
    return h[o] * (1 - a) * (1 - b) + h[o + 1] * a * (1 - b) + h[o + nx] * (1 - a) * b + h[o + nx + 1] * a * b; };
  const out = {};
  for (const key of ['before', 'after']) {
    const scene = new T.Scene();
    scene.background = new T.Color(0xbfd8ea);
    scene.add(new T.HemisphereLight(0xdfeaff, 0x6b6050, 0.75));
    const sun = new T.DirectionalLight(0xfff0d8, 0.85);
    sun.position.set(-300, 400, -200); // 북서쪽 낮은 해: 비탈 음영이 잘 보인다
    scene.add(sun);
    scene.add(mk(D[key]));
    const t0 = key === 'before' ? D.before : D.after;
    for (const [name, e, t, fov] of views) {
      const cam = new T.PerspectiveCamera(fov, W / H, 0.5, 6000);
      const ey = e[2] < 50 ? hAt(t0, e[0], e[1]) + e[2] : e[2];
      cam.position.set(e[0], ey, e[1]);
      cam.lookAt(t[0], (t[2] < 0 ? 0 : hAt(t0, t[0], t[1])) + (name.startsWith('ground') ? t[2] * 0.4 : 0), t[1]);
      renderer.render(scene, cam);
      (out[name] = out[name] || {})[key] = renderer.domElement.toDataURL('image/png');
    }
  }
  return out;
}

async function pageTopdown(D) {
  const {nx, nz, W} = D, S = W / nx; // 칸당 픽셀
  const mkImg = (arr, fn) => {
    const c = document.createElement('canvas');
    c.width = nx * S; c.height = nz * S;
    const x = c.getContext('2d'), im = x.createImageData(c.width, c.height);
    for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
      const o = Math.floor(j / S) * nx + Math.floor(i / S), p = (j * c.width + i) * 4, v = fn(o);
      im.data[p] = v[0]; im.data[p + 1] = v[1]; im.data[p + 2] = v[2]; im.data[p + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c.toDataURL('image/png');
  };
  const shade = (hs, h) => (o) => {
    if (!D.land[o]) return [40, 70, 100];
    const s = hs[o], y = h[o], base = y > 95 ? [235, 238, 245] : y < 2 ? [200, 190, 140] : [90 + y * 0.6, 130 - y * 0.2, 80 + y * 0.3];
    return base.map(c => Math.max(0, Math.min(255, c * (0.35 + 0.9 * s))));
  };
  return {
    before: mkImg(0, shade(D.hsBefore, D.before)),
    after: mkImg(0, shade(D.hsAfter, D.after)),
    diff: mkImg(0, (o) => {
      if (!D.land[o]) return [30, 30, 30];
      const d = D.after[o] - D.before[o], a = Math.min(1, Math.abs(d) / 8);
      return d > 0 ? [255 - 80 * (1 - a), 255 * (1 - a), 255 * (1 - a)] : [255 * (1 - a), 255 * (1 - a), 255 - 80 * (1 - a) * 0 - 0];
    }),
  };
}

export async function renderComparison(f, before, after, hsBefore, hsAfter, outDir, W = 1100, H = 620) {
  fs.mkdirSync(outDir, {recursive: true});
  const br = await chromium.launch({args: ARGS});
  try {
    const pg = await br.newPage();
    await pg.goto('about:blank');
    await pg.addScriptTag({path: THREE});
    const beach = Array.from(f.h, (_, o) => (f.oz + Math.floor(o / f.nx) * f.step > 335 ? 1 : 0));
    const D = {nx: f.nx, nz: f.nz, ox: f.ox, oz: f.oz, step: f.step, views: VIEWS, W, H, land: Array.from(f.land), beach,
      before: Array.from(before), after: Array.from(after), hsBefore: Array.from(hsBefore), hsAfter: Array.from(hsAfter)};
    const save = (name, url) => fs.writeFileSync(path.join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));
    const shots = await pg.evaluate(pageRender, D);
    for (const [name, v] of Object.entries(shots)) { save(`${name}-before.png`, v.before); save(`${name}-after.png`, v.after); }
    const top = await pg.evaluate(pageTopdown, {...D, W: f.nx * 3});
    for (const k of ['before', 'after', 'diff']) save(`top-${k}.png`, top[k]);
  } finally {
    await br.close();
  }
}
