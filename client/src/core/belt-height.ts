// 도시 둘레 산악 지형 (W7 CITY_SURROUND): 시가지 사각형(±335) 밖 ~ 윤곽(해안)까지의 높이.
// 참조 이미지(Snowy Mountain Island Cityscape): 북쪽 꼭대기의 높은 설산 봉우리(≈168u) + 서쪽 긴 설산 능선 + 동쪽으로 뻗은 반도(산악 도로 → 천문대) + 남동 곶.
// 능선(RIDGES)은 높이·폭이 점마다 다른 폴리라인이고, 능선 사이는 계곡(포근한 구릉)이다. 남쪽은 모래 해변. 산악 도로·천문대 광장·다리 진입로는 평탄화한다.
// 사과 시선 축(기지 (0,17) 에서 정북 ±8°·고도 8° 위 하늘)을 가리지 않게 축 위의 능선은 낮은 안부로 두고 높은 봉우리는 축 바깥(x ≈ +215)에 둔다.
import {CITY_HALF} from '../data/world-map.js';
import {BRIDGE_ENDS} from '../data/outline.js';
import {FLAT_FADE, FLAT_MARGIN, approachNear} from '../data/bridge.js';
import {MROAD_FLAT, MROAD_SHOULDER, OBS, mroadNear} from '../data/mountain-road.js';
import {fbm} from '../render/lowpoly/rng.js';

const T8 = Math.tan((8 * Math.PI) / 180);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 도시 남쪽 해변 가중(0..1): 사각형 바로 남쪽 + 양옆으로 서서히 산으로 바뀐다 */
export const beachW = (x: number, z: number) => (z > CITY_HALF ? 1 - smooth(CITY_HALF - 60, CITY_HALF + 170, Math.abs(x)) : 0);

export interface RidgePt {
  x: number;
  z: number;
  h: number;
  w: number;
}
/** 능선 폴리라인: 점마다 마루 높이 h · 반폭 w */
export const RIDGES: RidgePt[][] = [
  // 북쪽 주봉(168u)과 북쪽 끝으로 이어지는 낮은 능선 (주봉은 정북 축 x=0 에서 동쪽으로 비껴 선다)
  [{x: 85, z: -846, h: 70, w: 34}, {x: 118, z: -740, h: 100, w: 56}, {x: 138, z: -648, h: 152, w: 92}, {x: 192, z: -566, h: 122, w: 76}, {x: 222, z: -470, h: 112, w: 74}],
  // 시가지 뒤(북쪽)를 가로지르는 동서 주능선 (축 근처는 안부로 낮아진다 — beltH 의 축 제한)
  [{x: -300, z: -440, h: 98, w: 72}, {x: -170, z: -470, h: 110, w: 74}, {x: -50, z: -482, h: 96, w: 66}, {x: 90, z: -480, h: 104, w: 70},
    {x: 222, z: -470, h: 112, w: 74}, {x: 340, z: -440, h: 102, w: 68}, {x: 408, z: -376, h: 96, w: 62}, {x: 520, z: -350, h: 102, w: 70},
    {x: 650, z: -342, h: 108, w: 72}, {x: 760, z: -322, h: 102, w: 66}, {x: 850, z: -290, h: 90, w: 60}],
  // 서쪽 긴 설산 능선 (북서에서 남서까지)
  [{x: -300, z: -560, h: 104, w: 64}, {x: -385, z: -470, h: 120, w: 70}, {x: -450, z: -350, h: 130, w: 72}, {x: -480, z: -200, h: 128, w: 68},
    {x: -500, z: -40, h: 122, w: 68}, {x: -540, z: 90, h: 112, w: 64}, {x: -520, z: 200, h: 92, w: 58}, {x: -400, z: 290, h: 60, w: 46}],
  [{x: -300, z: -440, h: 98, w: 72}, {x: -300, z: -560, h: 104, w: 64}],
  // 북서 해안을 따라 북쪽 끝으로: 정북 축 위는 낮게
  [{x: -300, z: -560, h: 104, w: 64}, {x: -220, z: -598, h: 90, w: 58}, {x: -120, z: -630, h: 80, w: 56}, {x: -40, z: -668, h: 66, w: 48}, {x: 30, z: -736, h: 66, w: 40}, {x: 85, z: -846, h: 70, w: 34}],
  // 동쪽 반도 능선: 정상(천문대, 76u)으로
  [{x: 850, z: -290, h: 90, w: 60}, {x: 880, z: -262, h: 80, w: 56}, {x: OBS.x, z: OBS.z, h: 78, w: 56}, {x: 975, z: -214, h: 54, w: 44}, {x: 1030, z: -200, h: 28, w: 34}],
  // 시가지 북동 모서리의 설산 지맥
  [{x: 392, z: -336, h: 96, w: 56}, {x: 440, z: -268, h: 80, w: 46}],
  // 동쪽 구릉과 남동 곶(항구 동쪽 언덕)
  [{x: 600, z: -40, h: 70, w: 64}, {x: 500, z: 62, h: 62, w: 58}, {x: 455, z: 175, h: 50, w: 50}, {x: 440, z: 262, h: 38, w: 40}],
];

const rseg = (x: number, z: number, a: RidgePt, b: RidgePt): number => {
  const dx = b.x - a.x, dz = b.z - a.z,
    t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1))),
    d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t),
    w = a.w + (b.w - a.w) * t,
    h = a.h + (b.h - a.h) * t,
    u = d / (w * 1.65);
  return u >= 1 ? 0 : h * Math.pow(1 - u, 1.3);
};
/** 능선 합성: 능선 높이 중 최대 */
export function ridgeField(px: number, pz: number): number {
  // 능선이 곧은 벽처럼 보이지 않게 질의 좌표를 살짝 휘어 구불구불하게 한다
  const x = px + (fbm(px * 0.011 + 40, pz * 0.011, 3, 5) - 0.5) * 90,
    z = pz + (fbm(px * 0.011, pz * 0.011 + 40, 3, 6) - 0.5) * 90;
  let m = 0;
  for (const R of RIDGES)
    for (let i = 0; i < R.length - 1; i++) {
      const a = R[i], b = R[i + 1];
      if (x < Math.min(a.x, b.x) - 100 || x > Math.max(a.x, b.x) + 100 || z < Math.min(a.z, b.z) - 100 || z > Math.max(a.z, b.z) + 100) continue;
      m = Math.max(m, rseg(x, z, a, b));
    }
  return m;
}

/**
 * 윤곽 안쪽 (x,z) 의 높이. d = 윤곽(해안선)까지 안쪽 거리. 사각형 밖 전역(도시 사각형 안은 호출하지 않는다).
 * 구성: 구릉(계곡) + 능선 → 시가지 가장자리·해안에서 낮아짐 → 산악 도로·천문대·다리 진입로 평탄화.
 */
export function beltH(x: number, z: number, d: number): number {
  const dsq = Math.max(Math.abs(x), Math.abs(z)) - CITY_HALF,
    // Valleys extend the inhabited plain by different amounts along each edge.
    // The first foothill is no longer the same cross-section around a square.
    reach = 18 + 30 * (0.5 + 0.5 * Math.sin(x * 0.017 + z * 0.011))
      + 18 * (0.5 + 0.5 * Math.sin(z * 0.025 - x * 0.009)),
    foothill = Math.max(0, dsq - reach),
    bw = beachW(x, z),
    detail = fbm(x * 0.016 + 7, z * 0.016 - 3, 3, 91),
    fine = fbm(x * 0.06 + 2, z * 0.06 + 9, 2, 33),
    rr = 1 - Math.abs(fbm(x * 0.012 + 3, z * 0.012 + 8, 3, 17) * 2 - 1);
  // 계곡 바닥은 포근한 구릉 (능선 사이)
  const foot = (4 + 26 * detail * (0.6 + 0.8 * rr)) * smooth(0, 130, foothill);
  let m = Math.max(foot, ridgeField(x, z) * (0.84 + 0.3 * rr));
  m += (fine - 0.5) * 5 * smooth(10, 70, m);
  m *= smooth(0, 92, foothill); // 주택·텃밭이 이어지는 불규칙한 산기슭 평지
  if (z < -CITY_HALF) {
    // 사과 시선 축(기지 (0,17) 정북 ±8°, 고도 8°↑)을 가리지 않는다: 축 부채꼴 안은 높이 상한 0.78·D·tan8°, 바깥으로 갈수록 풀린다
    const D = 17 - z, fan = D * T8, f = smooth(fan + 8, fan + 55, Math.abs(x));
    m = Math.min(m, 0.78 * fan) * (1 - f) + m * f;
  }
  // 해안: 가까울수록 낮아져 바다에 내려선다(절벽 해안은 능선이 닿는 곳)
  m *= 0.42 + 0.58 * smooth(2, 50, d);
  m -= 10 * (1 - smooth(0, 30, d)) * (1 - bw);
  const beach = -8 * smooth(0, 1, dsq / (dsq + Math.max(d, 0.01))) * (0.85 + 0.15 * smooth(0, 0.3, dsq / (dsq + Math.max(d, 0.01))));
  let h = m * (1 - bw) + beach * bw;
  if (z > CITY_HALF) h *= smooth(14, 60, Math.abs(x - BRIDGE_ENDS.x)); // 다리 어귀는 평지 둑길
  const ap = approachNear(x, z);
  if (ap.d < 1e9) h *= smooth(ap.w + FLAT_MARGIN, ap.w + FLAT_MARGIN + FLAT_FADE, ap.d);
  // 산악 도로: 도로 높이로 눌러 완만한 비탈을 만든다(주변은 도로 높이 쪽으로 끌려 가파른 절개를 막는다)
  const mr = mroadNear(x, z);
  if (mr.d < 1e9) {
    const t = smooth(MROAD_FLAT, MROAD_FLAT + MROAD_SHOULDER + 46, mr.d);
    h = mr.y + (h - mr.y) * t;
  }
  const od = Math.hypot(x - OBS.x, z - OBS.z);
  if (od < OBS.r + 44) h = OBS.y + (h - OBS.y) * smooth(OBS.r, OBS.r + 44, od); // 천문대 광장
  return h;
}
