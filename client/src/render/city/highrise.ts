// W6 DOWNTOWN: 고층·아파트 건물 생성기. 데이터(CityBuilding.hr) → 낮에 보이는 solid + 밤에만 켜지는 lit 병합 지오메트리(Built).
// 로컬 좌표: 발자국 중심이 원점, 정면(문)이 +z. 외형은 박스 + 테이퍼 + 띠 정도의 로우폴리 — 창문 텍스처 없이 "층마다 번갈아 칠한 줄무늬" 가 유리 커튼월이다.
// 밤 창불빛은 lit 쪽에 층마다 가로 띠 패널(일부만 켜짐)로 넣는다(낮엔 lit 메시가 통째로 꺼진다 → tests/e2e/city.spec.ts 밤 규칙).
import type {CityBuilding, HrSpec} from '../../data/city.js';
import {ACCENT, CITY, NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cone, cyl, gable, panel, taper, type Geo} from '../lowpoly/prim.js';
import {mergePlaced, type Placed} from '../lowpoly/merge.js';
import {hash2} from '../lowpoly/rng.js';
import type {Built} from './building.js';

const FH = 3.6; // 사무 층 높이
const LOGO = [ACCENT.red, ACCENT.cyan, ACCENT.lime, ACCENT.magenta, ACCENT.orange];
const WIN = [ACCENT.amber, ACCENT.amber, ACCENT.yellow, PAL.cloud];

interface Ctx {
  solid: Placed[];
  lit: Placed[];
  rnd: (k: number) => number;
  n: number;
}
const S = (c: Ctx, g: Geo, o: Partial<Placed> = {}) => c.solid.push({g, ...o});
const L = (c: Ctx, g: Geo, o: Partial<Placed> = {}) => c.lit.push({g, ...o});
const FACE_RY = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

/** 옆면 4장만 있는 상자(8 tris): 윗·아랫면이 안 보이는 쌓기용. 바깥에서만 보인다 */
function tube(c: Ctx, w: number, h: number, d: number, col: number, cx: number, y0: number, cz: number) {
  for (let k = 0; k < 4; k++) {
    const hn = (k % 2 ? w : d) / 2;
    S(c, panel(k % 2 ? d : w, h, col, k % 2 ? cx + (k === 1 ? hn : -hn) : cx, y0 + h / 2, k % 2 ? cz : cz + (k === 0 ? hn : -hn), FACE_RY[k]));
  }
}

/** 한 면(k: 0=+z 1=+x 2=−z 3=−x)의 층 띠 창불빛: 층마다 60% 확률로 1~2개 */
function litFloors(c: Ctx, wid: number, dep: number, cx: number, cz: number, y0: number, n: number, sh: number, dens = 0.6) {
  for (let f = 0; f < n; f++)
    for (let k = 0; k < 4; k++) {
      const len = k % 2 ? dep : wid,
        hn = (k % 2 ? wid : dep) / 2 + 0.22;
      for (let j = 0; j < 2; j++) {
        if (c.rnd(c.n++) > dens * (j ? 0.5 : 1)) continue;
        const l = Math.max(1.6, len * (0.25 + c.rnd(c.n++) * 0.4)),
          s = (c.rnd(c.n++) - 0.5) * (len - l - 1.2),
          col = WIN[Math.floor(c.rnd(c.n++) * 4)],
          y = y0 + f * sh + sh * 0.5,
          px = k === 0 ? cx + s : k === 2 ? cx + s : cx + (k === 1 ? hn : -hn),
          pz = k === 1 || k === 3 ? cz + s : cz + (k === 0 ? hn : -hn);
        L(c, panel(l, sh * 0.55, col, px, y, pz, FACE_RY[k]));
      }
    }
}

/** 유리 기둥 한 단: 층마다 두 색을 번갈아 칠한 상자 쌓기 */
function shaft(c: Ctx, wid: number, dep: number, y0: number, y1: number, cx: number, cz: number, tint: number, night = true) {
  const n = Math.max(1, Math.round((y1 - y0) / FH)),
    sh = (y1 - y0) / n,
    A = mix(PAL.glass, tint, 0.45),
    B = mix(A, NEUTRAL.ink, 0.28),
    g = n >= 6 ? 2 : 1, // 층 두 개씩 한 줄무늬(삼각형 절약)
    m = Math.ceil(n / g);
  for (let f = 0; f < m; f++) tube(c, wid, Math.min(g, n - f * g) * sh, dep, f % 2 ? B : A, cx, y0 + f * g * sh, cz);
  S(c, box(wid + 0.8, 0.7, dep + 0.8, NEUTRAL.steel, cx, y1, cz)); // 옥상 테두리(윗면 겸용)
  if (night) litFloors(c, wid, dep, cx, cz, y0, n, sh);
}

/** 글자 없는 로고 도형(5종), 5×5, 바닥이 y=0, +z 를 향함 */
function emblem(i: number, col: number): Geo[] {
  switch (i % 5) {
    case 0: return [box(5, 1, 0.3, col, 0, 0), box(5, 1, 0.3, col, 0, 4), box(1, 3, 0.3, col, -2, 1), box(1, 3, 0.3, col, 2, 1)];
    case 1: return [box(5, 1.6, 0.3, col, 0, 1.7), box(1.6, 5, 0.3, col, 0, 0)];
    case 2: return [gable(5, 4.5, 0.3, col, 0, 0.2)];
    case 3: return [box(5, 1, 0.3, col, 0, 0), box(5, 1, 0.3, col, 0, 2), box(5, 1, 0.3, col, 0, 4)];
    default: return [box(1.4, 5, 0.3, col, -1.8, 0), box(1.4, 5, 0.3, col, 1.8, 0), box(4, 1.2, 0.3, col, 0, 1.9)];
  }
}
/** 정면(과 뒷면)에 거는 회사 로고: 어두운 판 + 낮엔 어두운 색 / 밤엔 빛나는 도형 */
function logo(c: Ctx, i: number, y: number, z: number, s: number) {
  const col = LOGO[i % 5];
  for (const ry of [0, Math.PI]) {
    const zz = ry ? -z : z;
    S(c, box(7 * s, 7 * s, 0.5, NEUTRAL.ink, 0, y, zz + (ry ? 0.25 : -0.25)));
    for (const g of emblem(i, mix(col, NEUTRAL.ink, 0.5))) S(c, g, {x: 0, y: y + 1 * s, z: zz + (ry ? -0.5 : 0.5), s, ry});
    for (const g of emblem(i, col)) L(c, g, {x: 0, y: y + 1 * s, z: zz + (ry ? -0.7 : 0.7), s, ry});
  }
}

/** 옥상: 설비 상자 · 안테나(밤엔 빨간 항공 장애등) · 헬리패드 */
function roof(c: Ctx, wid: number, dep: number, cx: number, cz: number, y: number, ant: number, heli: boolean) {
  S(c, box(wid * 0.45, 2.6, dep * 0.4, NEUTRAL.stone, cx + wid * 0.12, y + 0.7, cz - dep * 0.1));
  if (heli) {
    const r = Math.min(wid, dep) * 0.34;
    S(c, cyl(r, 0.5, NEUTRAL.stone, cx, y + 0.7, cz + dep * 0.12, 0, 12));
    S(c, box(r * 0.2, 0.15, r * 1.1, PAL.yellow, cx - r * 0.35, y + 1.2, cz + dep * 0.12));
    S(c, box(r * 0.2, 0.15, r * 1.1, PAL.yellow, cx + r * 0.35, y + 1.2, cz + dep * 0.12));
    S(c, box(r * 0.7, 0.15, r * 0.2, PAL.yellow, cx, y + 1.2, cz + dep * 0.12));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      L(c, box(0.8, 0.5, 0.8, ACCENT.green, cx + Math.cos(a) * r, y + 1.2, cz + dep * 0.12 + Math.sin(a) * r));
    }
  }
  if (ant > 0) {
    S(c, cyl(0.35, ant, NEUTRAL.steel, cx - wid * 0.2, y + 0.7, cz, 0, 5));
    L(c, box(0.9, 0.9, 0.9, ACCENT.red, cx - wid * 0.2, y + 0.7 + ant, cz));
  }
}

/** 정면 문 + 차양 + 밤에 켜지는 로비 */
function lobby(c: Ctx, wid: number, z: number, dw = 5.2) {
  S(c, panel(dw, 4.6, mix(NEUTRAL.wood, NEUTRAL.coal, 0.4), 0, 2.5, z + 0.25));
  S(c, box(dw + 6, 0.5, 3.6, NEUTRAL.coal, 0, 5.2, z + 1.4));
  S(c, box(0.5, 5.4, 0.5, NEUTRAL.steel, -(dw / 2 + 3), 0, z + 2.9));
  S(c, box(0.5, 5.4, 0.5, NEUTRAL.steel, dw / 2 + 3, 0, z + 2.9));
  L(c, panel(Math.min(wid - 2, 14), 3.4, ACCENT.amber, 0, 1.8, z + 0.5));
  L(c, box(dw + 5, 0.15, 3, ACCENT.yellow, 0, 5.0, z + 1.4));
}

function crownCap(c: Ctx, wid: number, dep: number, y: number, h: number) {
  const gold = mix(ACCENT.amber, PAL.white, 0.12);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const x = sx * (wid / 2 - 0.9),
      z = sz * (dep / 2 - 0.9);
    S(c, box(1.5, h * (sx && sz ? 1 : 0.7), 1.5, gold, x, y, z));
    L(c, box(1.6, 0.8, 1.6, ACCENT.amber, x, y + h * (sx && sz ? 1 : 0.7) - 0.8, z));
  }
  S(c, cone(1.6, h * 1.8, gold, 0, y, 0, 0, 6));
  L(c, box(0.8, 0.8, 0.8, ACCENT.yellow, -0.4, y + h * 1.8 - 0.2, -0.4));
}

function tower(c: Ctx, hr: HrSpec, w: number, d: number) {
  const {H, kind} = hr,
    tint = PAL[hr.tint],
    lobbyH = 6;
  const dark = mix(tint, NEUTRAL.ink, 0.6);
  let logoY = H * 0.72,
    logoZ = d / 2 + 0.3;
  if (kind === 'twin') {
    const sw = w * 0.36,
      gap = w * 0.64 - sw;
    S(c, box(w, lobbyH, d, dark, 0, 0, 0));
    shaft(c, sw, d, lobbyH, H, -w * 0.32, 0, tint);
    shaft(c, sw, d, lobbyH, H * 0.9, w * 0.32, 0, tint);
    const by = H * 0.62;
    S(c, box(gap + 0.4, 5, d * 0.5, mix(PAL.glass, tint, 0.3), 0, by, 0));
    L(c, panel(gap - 1, 2.2, ACCENT.yellow, 0, by + 1.4, d * 0.25 + 0.2));
    roof(c, sw, d, -w * 0.32, 0, H, 20, false);
    roof(c, sw, d, w * 0.32, 0, H * 0.9, 12, false);
    logoY = by + 6;
    logoZ = d * 0.25 + 0.3;
    lobby(c, w, d / 2);
  } else if (kind === 'stepped') {
    const tiers: [number, number][] = [[1, 0.46], [0.8, 0.78], [0.6, 1]];
    let y0 = lobbyH;
    S(c, box(w, lobbyH, d, dark, 0, 0, 0));
    tiers.forEach(([f, hf], i) => {
      const y1 = H * hf;
      shaft(c, w * f, d * f, y0, y1, 0, 0, tint);
      if (i === 1) {
        logoY = y1 - 14;
        logoZ = (d * f) / 2 + 0.3;
      }
      y0 = y1;
    });
    roof(c, w * 0.6, d * 0.6, 0, 0, H, 16, !!hr.heli);
    lobby(c, w, d / 2);
  } else {
    // glass / crown: 한 줄 기둥
    const sh = kind === 'crown' ? H * 0.9 : H;
    S(c, box(w, lobbyH, d, dark, 0, 0, 0));
    shaft(c, w, d, lobbyH, sh, 0, 0, tint);
    if (kind === 'crown') {
      S(c, taper(w, d, w * 0.7, d * 0.7, H * 0.04, mix(tint, PAL.white, 0.2), 0, sh + 0.7, 0));
      crownCap(c, w * 0.7, d * 0.7, sh + 0.7 + H * 0.04, H * 0.05);
    } else {
      // 한 번 줄어든 꼭대기 층 + 옥상
      S(c, box(w * 0.7, 4, d * 0.7, mix(tint, PAL.white, 0.3), 0, sh + 0.7, 0));
      roof(c, w * 0.7, d * 0.7, 0, 0, sh + 4.7, 18, !!hr.heli);
    }
    lobby(c, w, d / 2);
  }
  if (hr.logo !== undefined) logo(c, hr.logo, logoY, logoZ, kind === 'twin' ? 0.8 : 1);
}

/** 아파트 슬랩 동: 층마다 발코니 띠 + 세로 색 줄 + 옥상 물탱크 */
function slab(c: Ctx, hr: HrSpec, w: number, d: number, wall: number) {
  const {H} = hr,
    n = Math.round(H / 3),
    accent = LOGO[(hr.logo ?? 0) % 5],
    band = mix(wall, PAL.white, 0.45),
    glassC = mix(PAL.glass, NEUTRAL.slate, 0.4);
  S(c, box(w, H - 1.8, d, wall, 0, 0, 0));
  S(c, box(w + 0.4, 1.8, d + 0.4, mix(accent, NEUTRAL.coal, 0.35), 0, H - 1.8, 0)); // 꼭대기 색 띠(동 표시)
  for (let f = 1; f < n; f++) {
    S(c, box(w - 0.6, 0.32, d + 3, band, 0, f * 3, 0)); // 층마다 발코니 띠(앞뒤로 1.5씩 튀어나옴)
    S(c, panel(w - 1.4, 1.5, glassC, 0, f * 3 + 1.7, d / 2 + 1.5)); // 앞 난간 유리
    S(c, panel(w - 1.4, 1.5, glassC, 0, f * 3 + 1.7, -d / 2 - 1.5, Math.PI));
  }
  for (const x of [-w / 2 + 1.2, 0, w / 2 - 1.2]) S(c, box(1.0, H, 0.3, mix(accent, wall, 0.6), x, 0, d / 2 + 0.15));
  S(c, box(w * 0.3, 2.4, d * 0.5, NEUTRAL.stone, w * 0.2, H, 0)); // 물탱크·계단실
  S(c, cyl(0.3, 6, NEUTRAL.steel, -w * 0.3, H, 0, 0, 5));
  L(c, box(0.8, 0.8, 0.8, ACCENT.red, -w * 0.3, H + 6, 0));
  // 밤 창: 앞뒤 발코니 층마다 2~3칸, 옆면 1칸
  for (let f = 0; f < n - 1; f++) {
    for (const sg of [1, -1]) {
      for (let j = 0; j < 4; j++) {
        if (c.rnd(c.n++) > 0.55) continue;
        L(c, panel(4.2, 1.5, WIN[Math.floor(c.rnd(c.n++) * 4)], -w / 2 + 3.2 + j * ((w - 6.4) / 3), f * 3 + 1.9, sg * (d / 2 + 0.12), sg > 0 ? 0 : Math.PI));
      }
    }
    for (const sg of [1, -1]) if (c.rnd(c.n++) < 0.5) L(c, panel(3, 1.5, ACCENT.amber, sg * (w / 2 + 0.12), f * 3 + 1.9, 0, sg > 0 ? Math.PI / 2 : -Math.PI / 2));
  }
  S(c, box(8, 4.8, 0.5, NEUTRAL.coal, 0, 0, d / 2 + 0.3)); // 현관 유리
  lobby(c, w, d / 2, 4.4);
}

/** 주상복합: 3층 상가 기단 + 가운데 높은 타워 */
function mixed(c: Ctx, hr: HrSpec, w: number, d: number) {
  const tint = PAL[hr.tint],
    ph = 12;
  S(c, box(w, ph, d, PAL.bone, 0, 0, 0));
  S(c, box(w + 0.6, 0.6, d + 0.6, NEUTRAL.stone, 0, ph, 0));
  for (let i = 0; i < Math.round(w / 3.2); i++) {
    S(c, box(2.4, 0.7, 2.6, i % 2 ? PAL.white : CITY.awning, -w / 2 + 2 + i * ((w - 4) / (Math.round(w / 3.2) - 1)), 5.2, d / 2 + 1.3)); // 줄무늬 차양
  }
  for (let i = 0; i < 6; i++) L(c, panel(w / 8, 3.2, i % 2 ? ACCENT.amber : ACCENT.yellow, -w / 2 + w / 12 + i * (w / 6) * 0.92 + 2, 2.2, d / 2 + 0.4));
  for (let f = 1; f < 3; f++) for (let i = 0; i < 5; i++) if (c.rnd(c.n++) < 0.7) L(c, panel(w / 8, 2.4, ACCENT.amber, -w / 2 + 4.5 + i * ((w - 9) / 4), f * 4 + 1.8, d / 2 + 0.25));
  S(c, box(w * 0.5, 1.6, d * 0.4, NEUTRAL.stone, 0, ph + 0.6, d * 0.3)); // 옥상 정원
  const tw = w * 0.56,
    td = d * 0.62,
    tz = -d * 0.12;
  shaft(c, tw, td, ph + 0.6, hr.H, 0, tz, tint);
  S(c, taper(tw, td, tw * 0.6, td * 0.6, hr.H * 0.04, mix(tint, PAL.white, 0.3), 0, hr.H + 0.7, tz));
  roof(c, tw * 0.6, td * 0.6, 0, tz, hr.H + 0.7 + hr.H * 0.04, 14, false);
  lobby(c, w, d / 2);
  if (hr.logo !== undefined) logo(c, hr.logo, hr.H * 0.7, tz + td / 2 + 0.3, 0.9);
}

/** 거래소·은행: 계단 + 기둥 현관 + 박공 + 낮엔 어둡고 밤엔 켜지는 시세 전광판 */
function exchange(c: Ctx, hr: HrSpec, w: number, d: number) {
  const H = hr.H,
    wall = PAL[hr.tint],
    cols = Math.max(4, Math.round(w / 4.2)),
    bz = d / 2 - 3;
  S(c, box(w + 2, 0.7, d + 1, NEUTRAL.stone, 0, 0, 0));
  S(c, box(w + 0.6, 0.7, d - 0.5, NEUTRAL.ash, 0, 0.7, -0.2));
  S(c, box(w - 1, H - 6, d - 3.5, wall, 0, 1.4, -1.8)); // 본체
  S(c, box(w - 0.4, 1.6, d - 1, mix(wall, NEUTRAL.stone, 0.3), 0, H - 4.6, -0.8)); // 처마
  S(c, gable(w + 0.4, 4, d - 1, mix(wall, PAL.slate, 0.4), 0, H - 3, -0.8));
  for (let i = 0; i < cols; i++) S(c, cyl(0.85, H - 6.4, PAL.white, -w / 2 + 2.4 + i * ((w - 4.8) / (cols - 1)), 1.4, bz + 0.3, 0, 8));
  S(c, panel(5, 4.6, mix(NEUTRAL.wood, NEUTRAL.coal, 0.4), 0, 2.2, bz - 1.4));
  S(c, box(w * 0.7, 1.6, 0.4, NEUTRAL.coal, 0, H - 7.4, bz + 0.2)); // 전광판 틀
  for (let i = 0; i < 12; i++) L(c, box((w * 0.7 - 2) / 12 - 0.3, 0.8, 0.3, i % 3 ? ACCENT.green : ACCENT.red, -w * 0.35 + 1 + i * ((w * 0.7 - 2) / 12), H - 7.0, bz + 0.5));
  L(c, panel(8, 3.4, ACCENT.amber, 0, 2.0, bz - 1.2));
  for (const sx of [-1, 1]) {
    S(c, cyl(0.15, 8, NEUTRAL.steel, sx * (w / 2 - 1), H - 2, d / 2 - 2, 0, 5));
    S(c, box(2.2, 1.4, 0.1, sx > 0 ? ACCENT.red : ACCENT.blue, sx * (w / 2 - 1) + 1.2, H + 4.4, d / 2 - 2));
  }
  for (let k = 0; k < 3; k++) L(c, panel(2, 2, ACCENT.amber, (k - 1) * (w / 3.4), H * 0.45, -d / 2 + 0.2, Math.PI)); // 뒷면 창 몇 개
  S(c, box(w * 0.3, 2, 6, NEUTRAL.stone, 0, H - 2.4, -d * 0.25)); // 옥상 상자
}

export function makeHighrise(b: CityBuilding): Built {
  const hr = b.hr!,
    seed = Math.round(b.x * 7 + b.z * 13),
    c: Ctx = {solid: [], lit: [], rnd: k => hash2(seed, k, 31), n: 0};
  if (hr.kind === 'slab') slab(c, hr, b.w, b.d, PAL[b.wall]);
  else if (hr.kind === 'mixed') mixed(c, hr, b.w, b.d);
  else if (hr.kind === 'exchange') exchange(c, hr, b.w, b.d);
  else tower(c, hr, b.w, b.d);
  return {solid: mergePlaced(c.solid), lit: mergePlaced(c.lit)};
}
