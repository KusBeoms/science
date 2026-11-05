// W7 지형 팔레트. 색은 공통 5u 정점에 한 번 계산한 뒤 연속 보간한다.
import {locked} from '../core/progress.js';
import {GX0, GZ0, NX, NZ, REG_CITY, REG_PASS, REG_WILD, STEP, gridOf, terrainNormal} from '../core/heightmap.js';
import {BRIDGE_ENDS} from '../data/outline.js';
import {SECTORS} from '../data/sectors.js';
import {wildTint} from './wild-color.js';
import {CITY_HALF, TERRAIN} from '../data/world-map.js';
import {beltColor} from './belt-color.js';
import {PAL, TINT, mix, ramp, rgb, type Biome} from './lowpoly/palette.js';
const GRASS = mix(PAL.green, PAL.ink, 0.5),
  CITY_GROUND = mix(PAL.slate, PAL.steel, 0.4),
  PASS_STONE = mix(PAL.paving, PAL.clay, 0.3);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 면(중심 cx,cz · 평균 높이 y · 경사 slope=sin각) 의 색 */
function faceColor(reg: number, cx: number, cz: number, y: number, slope: number): number {
  let c: number;
  if (reg === REG_CITY) {
    if (Math.max(Math.abs(cx), Math.abs(cz)) > CITY_HALF) return beltColor(cx, cz, y, slope);
    // 도시 안에서는 북서 언덕과 낭떠러지 경사면만 그려진다 (평지는 render/city 지면)
    c = y > 0.4 ? mix(CITY_GROUND, GRASS, Math.min(1, y / 4)) : CITY_GROUND;
    c = mix(c, PAL.stone, smooth(0.35, 0.75, slope) * 0.8);
  } else if (reg === REG_WILD) {
    c = wildTint(cx, cz, y, slope);
  } else if (reg === REG_PASS) {
    // 임시 다리: 중심선은 아스팔트 (BRIDGE 에이전트가 금문교로 대체)
    c = mix(Math.abs(cx - BRIDGE_ENDS.x) < 8 ? PAL.asphalt : PASS_STONE, PAL.stone, smooth(0.35, 0.75, slope) * 0.8);
  } else {
    const i = reg - 1,
      s = SECTORS[i],
      m = TERRAIN[s.id],
      stripe = m.stripe ? Math.sin(cz * 0.22) * m.stripe : 0;
    c = ramp(s.id as Biome, (y + 3) / (m.ridge.h + 6) + stripe, slope);
    if (locked(i)) {
      const ds = s.size / 2 - Math.max(Math.abs(cx - s.center.x), Math.abs(cz - s.center.z));
      c = mix(c, TINT.day.fog, 0.8 * smooth(m.ridge.w * 0.5, m.ridge.w * 1.3, ds)); // 잠긴 분지는 안개 속
    }
  }
  return y < -2 ? mix(c, PAL.ink, Math.min(0.75, (-y - 2) / 30)) : c; // 낭떠러지 아래는 허공 쪽으로 어두워진다
}


let colors = new Map<number, [number, number, number]>();
export function clearTerrainColors() { colors.clear(); }
function colorAt(i: number, j: number): [number, number, number] {
  const key = j * NX + i;
  const old = colors.get(key);
  if (old) return old;
  const {h, reg} = gridOf(), x = GX0 + i * STEP, z = GZ0 + j * STEP,
    normal = terrainNormal(x, z), slope = Math.sqrt(Math.max(0, 1 - normal[1] ** 2)),
    c = rgb(faceColor(reg[key], x, z, h[key], slope));
  colors.set(key, c);
  return c;
}
export function terrainColor(x: number, z: number): [number, number, number] {
  const u = Math.max(0, Math.min(NX - 1.000001, (x - GX0) / STEP)),
    v = Math.max(0, Math.min(NZ - 1.000001, (z - GZ0) / STEP)),
    i = Math.floor(u), j = Math.floor(v), fx = u - i, fz = v - j,
    a = colorAt(i, j);
  if (fx < 1e-7 && fz < 1e-7) return a;
  const b = colorAt(i + 1, j), c = colorAt(i, j + 1), d = colorAt(i + 1, j + 1);
  return [0, 1, 2].map(k => (a[k] * (1 - fx) + b[k] * fx) * (1 - fz)
    + (c[k] * (1 - fx) + d[k] * fx) * fz) as [number, number, number];
}
