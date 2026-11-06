// 도시 섬 높이 표본 + 보존 가중치: 브라우저(헤드리스)에서 실제 core/heightmap.js 를 불러 5u 격자를 읽는다.
// 보존 가중치 pw (0..1): 1 = 원본 그대로, 0 = 마음껏 다듬는다. 해안·다리·산악도로·천문대·시가지 사각형을 지킨다.
import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const MIME = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css'};
/** client/public 을 서빙하는 최소 정적 서버 (tests/e2e/server.ts 와 같은 동작) */
export async function startServer() {
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent((req.url || '/').split('?')[0]), file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return void res.writeHead(404).end('not found');
    res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return {url: `http://127.0.0.1:${srv.address().port}`, close: () => new Promise(r => srv.close(r))};
}

export const SERVER_FREE_PAGE = '/__terrain_bake__';

/** 브라우저 안에서 실행되는 함수 (직렬화되므로 자기완결이어야 한다) */
async function pageSample(P) {
  const hm = await import('/js/core/heightmap.js');
  const ol = await import('/js/data/outline.js');
  const br = await import('/js/data/bridge.js');
  const mr = await import('/js/data/mountain-road.js');
  const wm = await import('/js/data/world-map.js');
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const fade = (full, end, v) => 1 - smooth(full, end, v); // v<=full → 1, v>=end → 0
  const C = ol.CITY_POLY, S = hm.STEP;
  const i0 = Math.floor((C.x0 - P.margin - hm.GX0) / S), i1 = Math.ceil((C.x1 + P.margin - hm.GX0) / S);
  const j0 = Math.floor((C.z0 - P.margin - hm.GZ0) / S), j1 = Math.ceil((C.z1 + P.margin - hm.GZ0) / S);
  const nx = i1 - i0 + 1, nz = j1 - j0 + 1, ox = hm.GX0 + i0 * S, oz = hm.GZ0 + j0 * S;
  const HM = hm.bakeContinent(); // 5u 기본 격자 (물 shader·지상 메시가 공유하는 같은 표본)
  const h = new Float64Array(nx * nz), land = new Uint8Array(nx * nz), pw = new Float32Array(nx * nz), cd = new Float32Array(nx * nz);
  const half = wm.CITY_HALF, OBS = mr.OBS;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = ox + i * S, z = oz + j * S, o = j * nx + i;
      h[o] = HM[(j0 + j) * hm.NX + (i0 + i)];
      const d = C.dist(x, z, 14, 200);
      cd[o] = d;
      if (d < 0) { pw[o] = 1; continue; } // 바다·낭떠러지(−12/−40/−90)·해협 바닥은 원본 그대로
      land[o] = 1;
      let w = fade(P.coastFull, P.coastFade, d);
      const cm = Math.max(Math.abs(x), Math.abs(z));
      w = Math.max(w, fade(half + P.squareFull, half + P.squareFade, cm));
      if (z > half) {
        w = Math.max(w, fade(P.bridgeEndFull, P.bridgeEndFade, Math.abs(x - ol.BRIDGE_ENDS.x)));
        const ap = br.approachNear(x, z);
        if (ap.d < 1e9) w = Math.max(w, fade(ap.w + br.FLAT_MARGIN + P.approachPad, ap.w + br.FLAT_MARGIN + br.FLAT_FADE + P.approachPad, ap.d));
      }
      const m = mr.mroadNear(x, z);
      if (m.d < 1e9) w = Math.max(w, fade(mr.MROAD_FLAT + mr.MROAD_SHOULDER + P.roadPad, mr.MROAD_FLAT + mr.MROAD_SHOULDER + P.roadFade, m.d));
      const od = Math.hypot(x - OBS.x, z - OBS.z);
      w = Math.max(w, fade(OBS.r + P.obsFull, OBS.r + 44, od));
      pw[o] = w;
    }
  return {nx, nz, ox, oz, h: Array.from(h), land: Array.from(land), pw: Array.from(pw), cd: Array.from(cd), bakeMs: hm.bakeMs};
}

/** 정적 서버 + 헤드리스 크로미움으로 표본을 읽는다. 반환 값은 일반 배열 → Float64Array 등으로 변환해 돌려준다 */
export async function sampleCity(P) {
  const srv = await startServer();
  const br = await chromium.launch();
  try {
    const pg = await br.newPage();
    pg.on('pageerror', e => console.error('pageerror', e));
    await pg.goto(srv.url + SERVER_FREE_PAGE); // 404 문서지만 같은 출처라 /js 모듈을 import 할 수 있다
    const r = await pg.evaluate(pageSample, P);
    return {...r, h: Float64Array.from(r.h), land: Uint8Array.from(r.land), pw: Float32Array.from(r.pw), cd: Float32Array.from(r.cd)};
  } finally {
    await br.close();
    await srv.close();
  }
}
