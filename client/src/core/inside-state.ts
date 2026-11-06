// 실내 상태 단일 출처 (W8 INTERIOR). 두 종류의 "건물 안"이 있다.
//  - legacy: 구 도심·랜드마크의 순간이동 방(game/interior.ts 가 G.inside 를 직접 대입). 좌표는 가상 방(1500,1500).
//  - onsite: 새 도심의 실제 위치 실내. 플레이어가 건물 내부 영역 안에 있는지로 매 프레임 판정한다(render/citygen/onsite-stream.ts).
// 기존 코드·Codex 소유 파일은 계속 `G.inside` 를 읽는다. 여기서 G.inside 를 접근자로 바꿔 둘 중 하나가 켜져 있는 동안만 truthy 가 되게 한다.
//  - 대입(G.inside = x)은 legacy 값을 바꾼다(기존 호출부·시험 호환).
//  - 읽기는 legacy 값이 있으면 그것, 없으면 onsite 호환 객체({i:-1, grp, spots, ret, onsite:true})를 준다. ret 는 읽을 때마다 현재 위치(지도 앱이 `G.inside.ret` 을 쓴다).
import {G} from './runtime.js';

/** 온사이트 실내 한 곳의 공간 정보(월드 좌표). 내부 유효 영역 = 회전한 직사각형 */
export interface OnsiteInside {
  id: string;
  /** 충돌 소유자 키(city-v2:<owner>) */
  key: string;
  floorY: number;
  ceilY: number;
  cx: number; cz: number;
  hx: number; hz: number;
  /** three rotation.y (도) */
  rotDeg: number;
  /** 방 상호작용 지점(월드 좌표, game/interior.ts roomIt 가 읽는다) */
  spots: any[];
  grp: any;
}

let legacy: any = null;
let onsite: OnsiteInside | null = null;
let compat: any = null;

function makeCompat(o: OnsiteInside): any {
  return {
    i: -1, onsite: true, id: o.id, grp: o.grp, spots: o.spots,
    get ret() {
      const p = G.me?.pos;
      return {x: p ? p.x : o.cx, y: p ? p.y : o.floorY, z: p ? p.z : o.cz};
    },
  };
}
Object.defineProperty(G, 'inside', {
  configurable: true,
  enumerable: true,
  get: () => legacy ?? compat,
  set: (v: any) => { legacy = v; },
});

/** 구 도심 순간이동 방 안인가(실제 좌표가 아님) — 거리 계산이 무의미한 시스템이 쓴다 */
export const legacyInside = (): any => legacy;
/** 온사이트 실내 정보(없으면 null) */
export const onsiteInside = (): OnsiteInside | null => onsite;
/** 어떤 종류든 건물 안인가 */
export const insideBuilding = (): boolean => legacy != null || onsite != null;
/** 온사이트 실내 진입/퇴장 표시. 같은 건물이면 객체를 유지한다 */
export function setOnsiteInside(o: OnsiteInside | null): void {
  if (o === null) { onsite = null; compat = null; return; }
  if (onsite && onsite.id === o.id && onsite.grp === o.grp) { onsite = o; compat.spots = o.spots; return; }
  onsite = o;
  compat = makeCompat(o);
}

/** 월드 점 → 실내 영역 로컬 (회전 해제). three rotation.y θ: world = R(θ) local */
function toLocal(o: OnsiteInside, x: number, z: number): [number, number] {
  const a = (o.rotDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), rx = x - o.cx, rz = z - o.cz;
  return [rx * c - rz * s, rx * s + rz * c];
}
/** 점이 내부 영역(여유 margin 만큼 키움/줄임)과 높이 범위 안인가 */
export function inOnsiteRect(o: OnsiteInside, x: number, z: number, margin = 0, y?: number): boolean {
  const [lx, lz] = toLocal(o, x, z);
  if (Math.abs(lx) > o.hx + margin || Math.abs(lz) > o.hz + margin) return false;
  return y === undefined || (y >= o.floorY - 0.6 && y <= o.ceilY + 0.3);
}
/** 카메라가 벽·천장 밖으로 나가지 않게 플레이어→카메라 선분을 내부 영역 안으로 줄인다(반환: 줄인 점과 비율 k) */
export function limitCameraInside(o: OnsiteInside, p: {x: number; y: number; z: number}, c: {x: number; y: number; z: number}, pad = 0.3): {x: number; y: number; z: number; k: number} {
  const ok = (k: number) => {
    const x = p.x + (c.x - p.x) * k, y = p.y + (c.y - p.y) * k, z = p.z + (c.z - p.z) * k;
    const [lx, lz] = toLocal(o, x, z);
    return Math.abs(lx) <= o.hx - pad && Math.abs(lz) <= o.hz - pad && y <= o.ceilY - 0.25 && y >= o.floorY + 0.1;
  };
  if (ok(1)) return {...c, k: 1};
  let lo = 0, hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    ok(mid) ? (lo = mid) : (hi = mid);
  }
  return {x: p.x + (c.x - p.x) * lo, y: p.y + (c.y - p.y) * lo, z: p.z + (c.z - p.z) * lo, k: lo};
}
