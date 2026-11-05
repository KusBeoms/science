// 기존 보도와 새 필지가 겹칠 때만 건물 바깥으로 우회한다. 렌더/물리 초기화 순서와 무관한 순수 데이터 처리.
type XZ = readonly [number, number];
type Rect = readonly [number, number, number, number];
const key = (p: XZ) => p[0] + ',' + p[1];

export function buildingRoutes(footprints: readonly Rect[], clearance = 0.7) {
  const rects = footprints.map(([a, b, c, d]): Rect => [a - clearance, b - clearance, c + clearance, d + clearance]),
    points = new Map<string, XZ>();
  const contains = (p: XZ, r: Rect) => p[0] > r[0] + 1e-5 && p[0] < r[2] - 1e-5 && p[1] > r[1] + 1e-5 && p[1] < r[3] - 1e-5;
  const free = (p: XZ) => !rects.some(r => contains(p, r));
  /** 열린 사각형과 선분의 교차. 경계 위 보행은 실제 발자국에서 clearance만큼 떨어진다. */
  const crosses = (a: XZ, b: XZ, r: Rect) => {
    let enter = 0, exit = 1;
    for (let axis = 0; axis < 2; axis++) {
      const d = b[axis] - a[axis], lo = r[axis] + 1e-5, hi = r[axis + 2] - 1e-5;
      if (Math.abs(d) < 1e-8) { if (a[axis] <= lo || a[axis] >= hi) return false; }
      else {
        let t0 = (lo - a[axis]) / d, t1 = (hi - a[axis]) / d;
        if (t0 > t1) [t0, t1] = [t1, t0];
        enter = Math.max(enter, t0); exit = Math.min(exit, t1);
        if (enter >= exit) return false;
      }
    }
    return enter < exit;
  };
  const clear = (a: XZ, b: XZ) => !rects.some(r => crosses(a, b, r));
  const corners = (r: Rect): XZ[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
  const point = (p: XZ): XZ => {
    const id = key(p), cached = points.get(id);
    if (cached) return cached;
    let result = p;
    if (!free(p)) {
      const candidates: XZ[] = [];
      for (const r of rects) {
        if (p[0] < r[0] - 25 || p[0] > r[2] + 25 || p[1] < r[1] - 25 || p[1] > r[3] + 25) continue;
        const x = Math.max(r[0], Math.min(r[2], p[0])), z = Math.max(r[1], Math.min(r[3], p[1]));
        candidates.push([r[0], z], [r[2], z], [x, r[1]], [x, r[3]], ...corners(r));
      }
      candidates.sort((a, b) => Math.hypot(a[0] - p[0], a[1] - p[1]) - Math.hypot(b[0] - p[0], b[1] - p[1]));
      const safe = candidates.find(free);
      if (!safe) throw new Error('No free sidewalk near ' + id);
      result = safe;
    }
    points.set(id, result);
    return result;
  };
  /** 장애물 모서리의 가시 그래프. 직진 가능한 기존 보도는 바꾸지 않는다. */
  const route = (a: XZ, b: XZ): XZ[] => {
    if (clear(a, b)) return [a, b];
    for (const margin of [10, 35, 90]) {
      const minX = Math.min(a[0], b[0]) - margin, maxX = Math.max(a[0], b[0]) + margin,
        minZ = Math.min(a[1], b[1]) - margin, maxZ = Math.max(a[1], b[1]) + margin;
      const candidates = rects.filter(r => r[0] <= maxX && r[2] >= minX && r[1] <= maxZ && r[3] >= minZ).flatMap(corners).filter(free),
        at: XZ[] = [a, b, ...candidates], distance = at.map(() => Infinity), previous = at.map(() => -1), done = new Set<number>();
      distance[0] = 0;
      while (done.size < at.length) {
        let u = -1;
        for (let i = 0; i < at.length; i++) if (!done.has(i) && (u < 0 || distance[i] < distance[u])) u = i;
        if (u < 0 || !Number.isFinite(distance[u])) break;
        if (u === 1) {
          const out: XZ[] = [];
          for (let i = 1; i >= 0; i = previous[i]) out.push(at[i]);
          return out.reverse();
        }
        done.add(u);
        for (let v = 1; v < at.length; v++) {
          if (done.has(v)) continue;
          const d = distance[u] + Math.hypot(at[v][0] - at[u][0], at[v][1] - at[u][1]);
          if (d < distance[v] && clear(at[u], at[v])) { distance[v] = d; previous[v] = u; }
        }
      }
    }
    throw new Error('No building-free sidewalk from ' + key(a) + ' to ' + key(b));
  };
  return {point, route};
}
