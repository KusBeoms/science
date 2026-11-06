// 지형 음영 PNG 인코더(순수 Node, zlib 만 사용) — 미리보기용. 입력: 높이 격자(m) → RGBA 바이트.
import zlib from 'node:zlib';

const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** RGB(A) 바이트 → PNG 버퍼. ch = 3 또는 4 */
export function encodePng(w, h, px, ch = 3) {
  const raw = Buffer.alloc((w * ch + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * ch + 1)] = 0; Buffer.from(px.buffer, px.byteOffset + y * w * ch, w * ch).copy(raw, y * (w * ch + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = ch === 4 ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level: 6})), chunk('IEND', Buffer.alloc(0))]);
}
/** 높이(m) 격자 → 음영 + 고도 색 PNG. land(i,j) 가 false 면 바다색. 반환: {png, w, h} */
export function hillshadePng(t, hAt, landAt, scale = 2) {
  const W = t.cols * scale, Hh = t.rows * scale, px = new Uint8Array(W * Hh * 3);
  const L = [-0.55, -0.6, 0.58]; // 북서쪽 위 광원 (x동+, z남+ → 화면 위쪽이 북)
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
    const u = i / scale, v = j / scale, ci = Math.min(t.cols - 1, Math.round(u)), cj = Math.min(t.rows - 1, Math.round(v));
    const o = (j * W + i) * 3;
    if (!landAt(ci, cj)) { px[o] = 52; px[o + 1] = 104; px[o + 2] = 160; continue; }
    const h = hAt(ci, cj), hx = (hAt(Math.min(t.cols - 1, ci + 1), cj) - hAt(Math.max(0, ci - 1), cj)) / (2 * t.cell), hz = (hAt(ci, Math.min(t.rows - 1, cj + 1)) - hAt(ci, Math.max(0, cj - 1))) / (2 * t.cell);
    const nl = Math.hypot(hx, hz, 1), sh = Math.max(0.15, (-hx * L[0] - hz * L[1] + L[2]) / nl / 0.58) ;
    // 고도 색: 저지 연두 → 숲 → 암석 → 눈
    const a = Math.min(1, Math.max(0, h / 120));
    const r = h < 40 ? 150 - h * 1.5 : 120 + (h - 40) * 1.6, g = h < 40 ? 190 - h * 1.0 : 150 + (h - 40) * 1.2, b = h < 40 ? 120 - h * 0.8 : 110 + (h - 40) * 1.6;
    void a;
    px[o] = Math.min(255, r * sh); px[o + 1] = Math.min(255, g * sh); px[o + 2] = Math.min(255, b * sh);
  }
  return {png: encodePng(W, Hh, px, 3), w: W, h: Hh};
}
