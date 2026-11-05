// 시골 섬 높이(W7 RURAL): 완만한 구릉 평야 + 비대칭 산(능선·계곡) + 해안 바위 띠·모래 사구 + 계단식 밭 단 + 마을 평지 + 개울 + 호수 바닥 + 주차장 + 등산로 + 도로 평탄화.
// core/heightmap.ts 가 부팅 때 격자에 굽는다. 호수 모양(lakeT)은 core/water.ts 의 inside 판정도 같이 쓴다. 뒤에 오는 규칙일수록 우선한다(도로가 마지막).
import {DESERT, JAIL, LAKES} from '../data/wild.js';
import {HW, Z_DN1, Z_FLARE} from '../data/bridge.js';
import {BRIDGE_ENDS, WILD_POLY} from '../data/outline.js';
import {LOT, STREAMS, STREAM_W, SUMMIT_FLAT, SUMMIT_Y, PEAK} from '../data/wild-mountain.js';
import {roadNear} from '../data/wild-road.js';
import {parcelNear, siteNear} from '../data/wild-fields.js';
import {lakeT} from './lake-shape.js';
import {mountainH} from './wild-mountain.js';
import {trailNear, TRAIL_HW, TRAIL_FADE} from './wild-trail.js';
import {beachMask, cliffMask, plainsH, segDist, smoothstep as smooth} from './wild-base.js';
export {lakeT};

const LK = LAKES.map(L => ({L}));
const ST = STREAMS.map(s => {
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
  for (const p of s.pts) {
    x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]);
  }
  return {pts: s.pts, box: [x0 - 8, z0 - 8, x1 + 8, z1 + 8]};
});
// 교도소 모델·경비·탈출 벽돌은 기존 y=0 계약을 유지한다.
const JAIL_Y = 0;
const LOT_R = [LOT.x - LOT.w / 2, LOT.z - LOT.d / 2, LOT.x + LOT.w / 2, LOT.z + LOT.d / 2];

export function wildH(x: number, z: number): number {
  let h = plainsH(x, z);
  h += mountainH(x, z);
  // 해안: 모래 반도 사구 + 일부 해안은 바위 절벽 띠(heightmap 의 해안 침강 SHORE_DIP 과 합쳐져 바다 쪽으로 가파르게 떨어진다)
  const beach = beachMask(x, z, DESERT.x0, DESERT.z0);
  if (beach > 0) h += beach * (1.2 * Math.sin(x * 0.05 + z * 0.03) + 0.8 * Math.sin(z * 0.07 - x * 0.02) + 0.4);
  const dc = WILD_POLY.dist(x, z, 14, 50);
  if (dc > 0 && dc < 44) {
    const cm = cliffMask(x, z, beach, BRIDGE_ENDS.x, BRIDGE_ENDS.wild);
    if (cm > 0) h += 7 * cm * Math.exp(-(((dc - 16) / 9) ** 2));
  }
  const j = JAIL.flat,
    jd = Math.max(j[0] - x, x - j[2], j[1] - z, z - j[3], 0);
  h += (JAIL_Y - h) * (1 - smooth(0, 24, jd)); // 교도소 둘레는 평지(주변 구릉 높이에 맞춘 단)
  h *= smooth(0, 55, Math.hypot(x - BRIDGE_ENDS.x, z - BRIDGE_ENDS.wild - 8)); // 다리 끝(북안 곶)도 평지
  // 계단식 밭 단 · 마을 평지
  const pn = parcelNear(x, z);
  if (pn) h += (pn.y - h) * pn.w;
  const sn = siteNear(x, z);
  if (sn) h += (sn.y - h) * sn.w;
  // 개울: 지면을 살짝 판다(흐르는 파란 띠는 렌더가 깐다)
  for (const s of ST) {
    const b = s.box;
    if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
    let d = 1e9;
    for (let i = 0; i < s.pts.length - 1; i++) d = Math.min(d, segDist(x, z, s.pts[i][0], s.pts[i][1], s.pts[i + 1][0], s.pts[i + 1][1]));
    if (d < STREAM_W + 3) h -= 0.8 * (1 - smooth(STREAM_W * 0.4, STREAM_W + 3, d));
  }
  // 호수: 바닥 모양(가장자리 1 에서 수면, 안쪽으로 완만하게 깊어짐)을 지면에 섞는다
  for (const k of LK) {
    const L = k.L;
    if (Math.abs(x - L.x) > L.rx * 2 || Math.abs(z - L.z) > L.rx * 2) continue;
    const lt = lakeT(L, x, z);
    if (lt >= 1.7) continue;
    const bed = L.level - L.depth * Math.pow(Math.max(0, 1 - lt * lt), 0.85),
      w = 1 - smooth(0.88, 1.7, lt);
    h += (bed - h) * w;
  }
  // 산기슭 주차장(평지) · 정상 정자 터 · 스위치백 등산로
  const ld = Math.max(LOT_R[0] - x, x - LOT_R[2], LOT_R[1] - z, z - LOT_R[3], 0);
  if (ld < 16) h += (LOT.y - h) * (1 - smooth(0, 16, ld));
  const pd = Math.hypot(x - PEAK[0], z - PEAK[1]);
  if (pd < SUMMIT_FLAT + 16) h += (SUMMIT_Y - h) * (1 - smooth(SUMMIT_FLAT, SUMMIT_FLAT + 16, pd));
  const tr = trailNear(x, z);
  if (tr.d < TRAIL_HW + TRAIL_FADE) h += (tr.y - h) * (1 - smooth(TRAIL_HW, TRAIL_HW + TRAIL_FADE, tr.d));
  // 정상 8u는 고정하고 8~14u에서 완만히 산길과 잇는다(2.5u 메시 보간에서도 급경사를 피한다).
  if (pd < SUMMIT_FLAT + 6) h += (SUMMIT_Y - h) * (1 - smooth(SUMMIT_FLAT, SUMMIT_FLAT + 6, pd));
  // 도로: 길 폭 안은 완전 평지, 바깥 26u 동안 완만히 원래 지형으로
  const r = roadNear(x, z);
  if (r.d < r.hw + 28) {
    // 차도+갓길 2u는 무조건 도로 높이. 그 밖의 완화 사면에서는 인접 밭의 평평한 단을 보존한다.
    const keepTerrace = pn ? 1 - pn.w * smooth(r.hw + 2, r.hw + 3, r.d) : 1;
    h += (r.y - h) * (1 - smooth(r.hw + 2, r.hw + 28, r.d)) * keepTerrace;
  }
  // 내리막 데크 끝부터 flare까지 같은 y=0 진입면. 북안의 구릉이 램프 말단으로 솟지 않는다.
  if (z >= Z_DN1 - 6 && z <= Z_FLARE + 18) {
    const w = (1 - smooth(HW + 2, HW + 12, Math.abs(x - BRIDGE_ENDS.x))) * (1 - smooth(Z_FLARE, Z_FLARE + 18, z));
    h *= 1 - w;
  }
  return h;
}
