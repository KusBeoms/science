// 외곽선 PNG → 정규화 폴리곤 (헤드리스 크로미움 canvas 로 픽셀을 읽어 경계 추적 + RDP 단순화)
// 사용: node tools/outline-extract.mjs <png> <이름> <eps(px)>  → JSON(stdout)
import {chromium} from 'playwright';
import fs from 'fs';
const [, , png, name, epsArg] = process.argv;
const eps = +(epsArg || 3);
const b64 = fs.readFileSync(png).toString('base64');
const br = await chromium.launch();
const pg = await br.newPage();
const out = await pg.evaluate(async ({b64, eps}) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const W = img.width, H = img.height, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = d[i * 4] < 235 || d[i * 4 + 1] < 235 || d[i * 4 + 2] < 245 ? 1 : 0;
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x];
  // 가장 왼쪽 위 마스크 픽셀에서 Moore 추적
  let sx = -1, sy = -1;
  for (let y = 0; y < H && sx < 0; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { sx = x; sy = y; break; }
  const D = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  const pts = [[sx, sy]];
  let x = sx, y = sy, dir = 6; // 시작: 위쪽에서 들어왔다고 보고 (0,-1) 쪽부터 시계
  for (let guard = 0; guard < 4e6; guard++) {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const nd = (dir + 6 + k) % 8, nx = x + D[nd][0], ny = y + D[nd][1];
      if (at(nx, ny)) { x = nx; y = ny; dir = nd; found = true; break; }
    }
    if (!found) break;
    if (x === sx && y === sy) break;
    pts.push([x, y]);
  }
  // RDP
  const rdp = (p, e) => {
    if (p.length < 3) return p;
    const a = p[0], b = p[p.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    let mi = 0, md = 0;
    for (let i = 1; i < p.length - 1; i++) {
      const dd = Math.abs((p[i][0] - a[0]) * dy - (p[i][1] - a[1]) * dx) / L;
      if (dd > md) { md = dd; mi = i; }
    }
    if (md <= e) return [a, b];
    return rdp(p.slice(0, mi + 1), e).slice(0, -1).concat(rdp(p.slice(mi), e));
  };
  const half = Math.floor(pts.length / 2),
    s = rdp(pts.slice(0, half + 1), eps).slice(0, -1).concat(rdp(pts.slice(half).concat([pts[0]]), eps).slice(0, -1));
  return {W, H, raw: pts.length, pts: s};
}, {b64, eps});
await br.close();
const xs = out.pts.map(p => p[0]), ys = out.pts.map(p => p[1]);
const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), S = Math.max(x1 - x0, y1 - y0);
const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
const poly = out.pts.map(p => [+((p[0] - cx) / S).toFixed(4), +((p[1] - cy) / S).toFixed(4)]);
console.error(name, 'img', out.W, out.H, 'raw', out.raw, 'pts', poly.length, 'bbox w/h(norm)', ((x1 - x0) / S).toFixed(3), ((y1 - y0) / S).toFixed(3));
console.log(JSON.stringify(poly));
