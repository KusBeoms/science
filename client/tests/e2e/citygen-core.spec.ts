// citygen 코어(도로·교차로·리본·지형 편집) 시험. WebGL 불필요 — 정적 서버 + 빈 페이지에서 js 모듈만 import 해 page.evaluate 로 실행한다.
import {test, expect, chromium, type Browser, type Page} from '@playwright/test';
import {startServer} from './server';
import {FIXTURES, GRID} from './citygen-fixtures';

const PAGE_HTML = `<!doctype html><meta charset=utf-8><body><script type=module>
const Bd = await import('./js/citygen/build.js'), G = await import('./js/citygen/geom.js'), Tr = await import('./js/citygen/terrain.js');
const Rb = await import('./js/citygen/ribbons.js'), Mh = await import('./js/citygen/ribbon-mesh.js'), Ro = await import('./js/citygen/roads.js'), By = await import('./js/citygen/bytes.js');
const Cd = await import('./js/data/city-terrain-codec.js');
const H = {Bd, G, Tr, Rb, Mh, Ro, By, Cd};
H.heights = (spec) => {
  const g = ${JSON.stringify(GRID)}, cm = new Int32Array(g.cols * g.rows);
  for (let j = 0; j < g.rows; j++) for (let i = 0; i < g.cols; i++) {
    const x = g.x0 + i * g.cell, z = g.z0 + j * g.cell;
    let y = spec.y || 0;
    if (spec.kind === 'slopeZ') y += z * spec.slope;
    if (spec.kind === 'hillCenter') { const d = Math.hypot(x - spec.cx, z - spec.cz); y += d < spec.r ? spec.h * 0.5 * (1 + Math.cos(Math.PI * d / spec.r)) : 0; }
    cm[j * g.cols + i] = Math.round(y * 100);
  }
  return {cols: g.cols, rows: g.rows, cm};
};
H.build = (src, spec, o) => Bd.buildRoadsAndTerrain(JSON.parse(JSON.stringify(src)), Object.assign({baseHeights: H.heights(spec), debug: true}, o || {}));
H.json = (r) => JSON.stringify(r.compiled);
/** 리본 정점·청크 건전성 */
H.sanity = (r) => {
  const cs = r.compiled.header.chunkSize; let bad = 0, nan = 0, over = 0, tris = 0, uvBad = 0;
  for (const c of r.compiled.ribbons) {
    const [cx, cz] = c.key.split(',').map(Number), p = c.positions, nv = p.length / 3;
    if (c.indices.length % 3) bad++;
    for (const v of p) if (!Number.isFinite(v)) nan++;
    for (const v of c.indices) if (!(Number.isInteger(v) && v >= 0 && v < nv)) bad++;
    if (c.uv) { if (c.uv.length !== nv * 2) uvBad++; for (const v of c.uv) if (!Number.isFinite(v)) nan++; }
    for (let i = 0; i < nv; i++) {
      const x = p[i * 3], z = p[i * 3 + 2];
      over = Math.max(over, cx * cs - x, x - (cx + 1) * cs, cz * cs - z, z - (cz + 1) * cs);
    }
    tris += c.indices.length / 3;
  }
  const t = r.compiled.terrain, h = Cd.decodeHeights(t.heightData, t.cols * t.rows);
  let tnan = 0; for (const v of h) if (!Number.isFinite(v)) tnan++;
  for (const d of r.compiled.roads) for (const s of d.samples) for (const k of Object.keys(s)) if (!Number.isFinite(s[k])) nan++;
  return {bad, nan, over, tris, uvBad, tnan, chunks: r.compiled.ribbons.length};
};
/** 교차로 조각 메시(청크 없이) — 겹침·틈·보도 이음 검사용 */
H.pieceMesh = (r) => {
  const ms = new Mh.MeshSet(1e9, false, 1e9), ctx = {mesh: ms, terrain: r.debug.terrainFinal, tol: Ro.DEFAULT_THIN};
  for (const p of r.debug.pieces) Rb.emitPiece(ctx, r.debug.roads[p.ri], {ri: p.ri, sa: p.sa, sb: p.sb, capA: false, capB: false});
  return ms.chunks();
};
H.junctionChecks = (r) => {
  const chunks = H.pieceMesh(r), out = {overlapArea: 0, gap: 0, joints: 0, jointMiss: 0, polys: 0, selfX: 0, minArea: 1e9};
  const sw = new G.SpatialHash(2);
  for (const c of chunks) if (c.surface === 'sidewalk') for (let i = 0; i < c.positions.length; i += 3) sw.insert(c.positions[i], c.positions[i + 2], c.positions[i], c.positions[i + 2], [c.positions[i], c.positions[i + 1], c.positions[i + 2], c.layer]);
  for (const j of r.debug.junctions) {
    if (!j.polygon.length) continue;
    out.polys++;
    const inner = G.insetPolygon(j.polygon, 0.04), poly = j.polygon;
    out.minArea = Math.min(out.minArea, G.polygonArea(poly));
    // 자기 교차(인접 변 제외)
    const n = poly.length;
    for (let a = 0; a < n; a++) for (let b = a + 2; b < n; b++) { if (a === 0 && b === n - 1) continue; if (G.segIntersect(poly[a], poly[(a + 1) % n], poly[b], poly[(b + 1) % n], -1e-9)) out.selfX++; }
    // 도로 조각(차도·갓길) 삼각형 표본점이 포장 다각형 안에 있으면 겹침
    for (const c of chunks) {
      if (c.layer !== j.layer || (c.surface !== 'asphalt' && c.surface !== 'shoulder')) continue;
      const p = c.positions;
      for (let t = 0; t < c.indices.length; t += 3) {
        const a = c.indices[t] * 3, b = c.indices[t + 1] * 3, d = c.indices[t + 2] * 3;
        const area = Math.abs((p[b] - p[a]) * (p[d + 2] - p[a + 2]) - (p[d] - p[a]) * (p[b + 2] - p[a + 2])) / 2, N = 6;
        for (let u = 0; u < N; u++) for (let v = 0; v < N - u; v++) {
          const w1 = (u + 0.33) / N, w2 = (v + 0.33) / N, w0 = 1 - w1 - w2, x = w0 * p[a] + w1 * p[b] + w2 * p[d], z = w0 * p[a + 2] + w1 * p[b + 2] + w2 * p[d + 2];
          if (inner.length && G.pointInPolygon(x, z, inner)) out.overlapArea += area / ((N * (N + 1)) / 2);
        }
      }
    }
    // 틈: 팔 트림 위치의 도로 중심점은 다각형 경계 위에 있어야 한다
    const ring = poly.concat([poly[0]]);
    for (const a of j.arms) {
      if (a.trim <= 0) continue;
      const road = r.debug.roads.find(q => q.id === a.roadId), pt = Ro.pointAt(road, a.sNode + a.dir * a.trim);
      out.gap = Math.max(out.gap, G.distToPolyline(pt.x, pt.z, ring));
    }
    // 보도 이음: 모서리 띠 양끝이 도로 조각 보도 끝 정점과 만나는가 (직선 팔만 의미 있음)
    for (const bd of j.bands) for (const q of [bd.inner[0], bd.inner[bd.inner.length - 1], bd.outer[0], bd.outer[bd.outer.length - 1]]) {
      out.joints++;
      const hit = sw.query(q[0] - 0.06, q[2] - 0.06, q[0] + 0.06, q[2] + 0.06).some(v => Math.hypot(v[0] - q[0], v[2] - q[2]) < 0.06 && Math.abs(v[1] - (q[1] + 0.15)) < 0.03 && v[3] === j.layer);
      if (!hit) out.jointMiss++;
    }
  }
  return out;
};
window.H = H; window.READY = true;
</script></body>`;

let browser: Browser, server: {url: string; close: () => Promise<void>}, page: Page;
test.beforeAll(async () => {
  server = await startServer(); browser = await chromium.launch(); page = await browser.newPage();
  await page.route('**/__citygen.html', r => r.fulfill({contentType: 'text/html', body: PAGE_HTML}));
  await page.goto(server.url + '/__citygen.html');
  await page.waitForFunction(() => (window as any).READY === true);
});
test.afterAll(async () => { await browser.close(); await server.close(); });

type Name = keyof typeof FIXTURES;
const ev = <T>(f: (a: any) => T, arg: any) => page.evaluate(f as any, arg) as Promise<T>;
/** 한 fixture 를 빌드해 윈도우에 보관하고 요약을 돌려준다 */
const build = (name: Name, mutate?: string) => ev(({src, spec, mutate}) => {
  const w = window as any, s = JSON.parse(JSON.stringify(src));
  if (mutate) new Function('s', mutate)(s);
  w.last = w.H.build(s, spec);
  const r = w.last;
  return {rejected: r.rejected, warnings: r.warnings.map((x: any) => x.code + ':' + x.owner), stats: r.stats, junctions: r.compiled.junctions, roads: r.compiled.roads.map((x: any) => x.id), header: r.compiled.header};
}, {src: FIXTURES[name].src, spec: FIXTURES[name].terrain, mutate});
const sanity = () => ev(() => (window as any).H.sanity((window as any).last), 0);
const jchecks = () => ev(() => (window as any).H.junctionChecks((window as any).last), 0);

const ALL: Name[] = ['cross', 'tee', 'hillOk', 'gradeKeys', 'overpass', 'round', 'edits'];

test('결정성: 같은 원본·seed → 같은 compiled 와 해시, seed/키 순서 변경 규칙', async () => {
  for (const n of ['cross', 'tee', 'overpass', 'round', 'edits'] as Name[]) {
    const r = await ev(({src, spec}) => {
      const H = (window as any).H, a = H.json(H.build(src, spec)), b = H.json(H.build(src, spec));
      // 키 순서를 뒤섞은 같은 원본: 해시가 같아야 한다
      const shuffled = JSON.parse(JSON.stringify(src)); const rev: any = {}; for (const k of Object.keys(shuffled).reverse()) rev[k] = shuffled[k];
      const c = H.build(rev, spec), s2 = JSON.parse(JSON.stringify(src)); s2.seed += 1;
      const d = H.build(s2, spec);
      return {same: a === b, len: a.length, hashA: JSON.parse(a).header.sourceHash, hashShuffled: c.compiled.header.sourceHash, hashSeed: d.compiled.header.sourceHash, bodySame: JSON.stringify(c.compiled.ribbons) === JSON.stringify(JSON.parse(a).ribbons)};
    }, {src: FIXTURES[n].src, spec: FIXTURES[n].terrain});
    expect(r.same, n).toBe(true);
    expect(r.hashA, n).toBe(r.hashShuffled);
    expect(r.hashA, n).not.toBe(r.hashSeed);
    expect(r.bodySame, n).toBe(true);
    expect(r.hashA).toMatch(/^[0-9a-f]{16}$/);
  }
});

test('리본: NaN 없음·인덱스 유효·청크 경계 안·헤더/청크 크기', async () => {
  for (const n of ALL) {
    const b = await build(n);
    const s = await sanity();
    expect(s.nan, n).toBe(0); expect(s.bad, n).toBe(0); expect(s.uvBad, n).toBe(0); expect(s.tnan, n).toBe(0);
    expect(s.tris, n).toBeGreaterThan(0);
    expect(s.over, `${n} 청크 밖으로 나간 정점`).toBeLessThan(0.011); // 반올림(1cm 미만) 허용
    expect(b.header.chunkSize).toBe(64);
    expect(b.stats.overflow).toBe(false);
  }
  // 청크 크기를 바꿔도 모든 정점이 해당 청크 안
  const r = await ev(({src, spec}) => { const H = (window as any).H, x = H.build(src, spec, {chunkSize: 16}); return H.sanity(x); }, {src: FIXTURES.cross.src, spec: FIXTURES.cross.terrain});
  expect(r.over).toBeLessThan(0.011); expect(r.bad).toBe(0);
});

test('십자 교차로: 신호 노드·4팔·횡단보도·정지선, 겹침·틈 0, 보도 이음', async () => {
  const b = await build('cross');
  expect(b.rejected).toEqual([]);
  expect(b.junctions!.length).toBe(1);
  const j = b.junctions![0];
  expect(j.kind).toBe('signal'); expect(j.arms.length).toBe(4);
  expect(j.crosswalks).toBeGreaterThan(8); expect(j.stopLines).toBeGreaterThanOrEqual(3);
  for (const a of j.arms) expect(a.trim).toBeGreaterThan(5);
  const c = await jchecks();
  expect(c.polys).toBe(1);
  expect(c.overlapArea).toBeLessThan(0.05);
  expect(c.gap).toBeLessThan(0.1);
  expect(c.selfX).toBe(0);
  expect(c.joints).toBeGreaterThan(8); expect(c.jointMiss).toBe(0);
  // 자동 노드 검출: 같은 도로 쌍을 NodeSource 없이 빌드해도 같은 교차로(kind 만 cross)
  const auto = await build('cross', 's.nodes = [];');
  expect(auto.junctions!.length).toBe(1); expect(auto.junctions![0].kind).toBe('cross'); expect(auto.junctions![0].crosswalks).toBe(0);
});

test('예각 T 교차로: 마이터 한계(트림 ≤ 60m), 다각형 단순, 겹침·틈 0, 보도 이음', async () => {
  const b = await build('tee');
  expect(b.rejected).toEqual([]);
  expect(b.junctions!.length).toBe(2); // 예각 + 직교 T
  const c = await jchecks();
  expect(c.polys).toBe(2);
  expect(c.selfX).toBe(0);
  expect(c.minArea).toBeGreaterThan(30);
  expect(c.overlapArea).toBeLessThan(0.05);
  expect(c.gap).toBeLessThan(0.1);
  expect(c.jointMiss).toBe(0);
  for (const j of b.junctions!) for (const a of j.arms) expect(a.trim).toBeLessThanOrEqual(60);
  const acute = b.junctions!.find(j => j.arms.some(a => a.road === 'acute'))!;
  expect(Math.max(...acute.arms.map(a => a.trim))).toBeGreaterThan(25); // 35° 쐐기라 한쪽 팔이 길게 트림된다
});

test('언덕 굽은 도로: 한도 내 성공, 가파른 지형·과도한 키는 조용히 고치지 않고 거부', async () => {
  const ok = await build('hillOk');
  expect(ok.rejected).toEqual([]);
  const hi = ok.stats.roadInfo.find((r: any) => r.id === 'h')!;
  expect(hi.maxGrade).toBeGreaterThan(0.02); expect(hi.maxGrade).toBeLessThanOrEqual(0.08 * 1.02);
  const bad = await build('hillBad');
  expect(bad.rejected.map((r: any) => r.code)).toContain('earthwork-exceeded');
  expect(bad.roads).not.toContain('steep');
  const keys = await build('gradeKeys');
  const rej = keys.rejected.find((r: any) => r.owner === 'badramp');
  expect(rej && rej.code).toBe('grade-exceeded');
  expect(keys.roads).toContain('okramp'); expect(keys.roads).not.toContain('badramp');
  // 수락된 모든 도로: 종단 경사 ≤ 등급 한도
  for (const n of ALL) {
    const b = await build(n);
    for (const r of b.stats.roadInfo) expect(r.maxGrade, `${n}/${r.id}`).toBeLessThanOrEqual(r.limit * 1.02 + 1e-4);
  }
  // 한도를 넘는 경사가 compiled 표본에도 없다
  const mg = await ev(() => { const r = (window as any).last; let m = 0; for (const d of r.compiled.roads) for (const s of d.samples) m = Math.max(m, Math.abs(s.grade)); return m; }, 0);
  expect(mg).toBeLessThan(0.1);
});

test('고가: 같은 XZ 의 지상·고가는 합쳐지지 않고, 램프로만 층이 이어진다', async () => {
  const b = await build('overpass');
  expect(b.rejected).toEqual([]);
  expect(b.warnings.filter(w => w.startsWith('node-'))).toEqual([]);
  const js = b.junctions!;
  expect(js.find(j => j.arms.some(a => a.road === 'gnd') && j.arms.some(a => a.road === 'deck'))).toBeUndefined();
  const n0 = js.find(j => j.id === 'nr0')!, n1 = js.find(j => j.id === 'nr1')!;
  expect(n0.layer).toBe(0); expect(n1.layer).toBe(1);
  expect(n0.arms.map(a => a.road).sort()).toEqual(['gnd', 'gnd', 'ramp']);
  expect(n1.arms.map(a => a.road).sort()).toEqual(['deck', 'deck', 'ramp']);
  const ys = await ev(() => { const r = (window as any).last, f = (id: string) => r.compiled.roads.find((x: any) => x.id === id).samples; const ramp = f('ramp'), deck = f('deck'); return {r0: ramp[0].y, r1: ramp[ramp.length - 1].y, d: deck[10].y, layers: [...new Set(r.compiled.ribbons.map((c: any) => c.layer))]}; }, 0);
  expect(Math.abs(ys.r0)).toBeLessThan(0.05); expect(Math.abs(ys.r1 - 7)).toBeLessThan(0.05); expect(Math.abs(ys.d - 7)).toBeLessThan(0.05);
  expect((ys.layers as number[]).sort()).toEqual([0, 1]);
  // 일부러 (0,0) 지상 노드에 고가 도로를 넣어도 층이 달라 합치지 않는다
  const forced = await build('overpass', "s.nodes.push({id: 'bad', kind: 'junction', at: [0, 0], layer: 0, roads: ['gnd', 'deck']});");
  expect(forced.warnings).toContain('node-layer-mismatch:bad');
  expect(forced.junctions!.some(j => j.arms.some(a => a.road === 'deck') && j.arms.some(a => a.road === 'gnd'))).toBe(false);
  const s = await sanity(); expect(s.nan).toBe(0); expect(s.bad).toBe(0);
});

test('검사 감도(음성 대조): 조각을 교차로 안으로 밀면 겹침이, 트림을 줄이면 틈이 잡힌다', async () => {
  await build('cross');
  const r = await ev(() => {
    const w = window as any, H = w.H, d = w.last.debug, base = H.junctionChecks(w.last);
    const keep = JSON.parse(JSON.stringify(d.pieces));
    d.pieces.forEach((p: any) => { p.sa = Math.max(0, p.sa - 4); p.sb = Math.min(d.roads[p.ri].length, p.sb + 4); });
    const over = H.junctionChecks(w.last); d.pieces = keep;
    d.junctions.forEach((j: any) => j.arms.forEach((a: any) => { a.trim -= 3; }));
    const gap = H.junctionChecks(w.last);
    return {base: base.overlapArea, over: over.overlapArea, gapBase: base.gap, gap: gap.gap};
  }, 0);
  expect(r.base).toBeLessThan(0.05); expect(r.over).toBeGreaterThan(1);
  expect(r.gapBase).toBeLessThan(0.1); expect(r.gap).toBeGreaterThan(1);
});

test('회전교차로: 링·중앙섬·4팔, 겹침·틈 0, 보도 이음', async () => {
  const b = await build('round');
  expect(b.rejected).toEqual([]);
  const j = b.junctions![0];
  expect(j.kind).toBe('roundabout'); expect(j.arms.length).toBe(4);
  expect(j.island && j.island.r).toBeGreaterThan(3);
  const c = await jchecks();
  expect(c.overlapArea).toBeLessThan(0.05); expect(c.gap).toBeLessThan(0.1); expect(c.selfX).toBe(0); expect(c.jointMiss).toBe(0);
  const m = await ev(() => { const r = (window as any).last; return r.compiled.ribbons.filter((c: any) => c.surface === 'median').length; }, 0);
  expect(m).toBeGreaterThan(0);
});

test('지형 편집: 패드 평지(≤0.01u)·멱등, corridor 멱등·노면 아래 정렬, 붓 결정적, 부지 보고', async () => {
  const b = await build('edits');
  expect(b.rejected).toEqual([]);
  const r = await ev(({src, spec}) => {
    const H = (window as any).H, T = H.Tr, last = (window as any).last, t = last.debug.terrainFinal;
    // 패드: 반경 20 안(칸 중심)이 y=4 에서 0.01 이내
    let padMax = 0, n = 0;
    for (let j = 0; j < t.rows; j++) for (let i = 0; i < t.cols; i++) { const x = t.x0 + i * t.cell, z = t.z0 + j * t.cell; if (Math.hypot(x, z - 100) <= 20) { padMax = Math.max(padMax, Math.abs(t.h[j * t.cols + i] - 4)); n++; } }
    // 멱등: 패드와 corridor 를 이미 편집된 래스터에 한 번 더 적용해도 변하지 않는다
    const sd = JSON.parse(JSON.stringify(src)), base = T.terrainFromSource(sd, H.heights(spec)), edits = sd.terrain.edits;
    const once = T.cloneTerrain(base); T.applyPad(once, edits[0]);
    const twice = T.cloneTerrain(once); T.applyPad(twice, edits[0]);
    let padDiff = 0; for (let i = 0; i < once.h.length; i++) padDiff = Math.max(padDiff, Math.abs(once.h[i] - twice.h[i]));
    const road = last.debug.roads[0], run = []; for (let i = 0; i < road.n; i += 5) run.push({x: road.x[i], z: road.z[i], y: road.y[i], wcL: 5, wcR: 5, hwL: 8, hwR: 8});
    const c1 = T.cloneTerrain(base); T.carveCorridor(c1, run, 2, 2, 3);
    const c2 = T.cloneTerrain(c1); T.carveCorridor(c2, run, 2, 2, 3);
    let corDiff = 0; for (let i = 0; i < c1.h.length; i++) corDiff = Math.max(corDiff, Math.abs(c1.h[i] - c2.h[i]));
    // 전체 사전 편집(패드+붓)은 같은 입력에 같은 결과
    const p1 = T.cloneTerrain(base), p2 = T.cloneTerrain(base); T.applyPreEdits(p1, edits); T.applyPreEdits(p2, edits);
    let preDiff = 0; for (let i = 0; i < p1.h.length; i++) preDiff = Math.max(preDiff, Math.abs(p1.h[i] - p2.h[i]));
    // 최종 지형: 도로 중심선 근처가 노면보다 PAVE_DROP 만큼 아래
    let under = 0; for (const x of [-100, -50, 0, 60]) { const i = road.s.findIndex((s: number, k: number) => Math.abs(road.x[k] - x) < 0.6); under = Math.max(under, Math.abs((road.y[i] - T.PAVE_DROP) - T.sampleBilinear(t, road.x[i], road.z[i]))); }
    const hump = base.h[(81) * base.cols + 81], hy = T.sampleBilinear(t, 0, 0);
    // 부지 보고
    const flat = T.makeTerrain({cell: 5, x0: 0, z0: 0, cols: 20, rows: 20}, new Int32Array(400)), slope = T.makeTerrain({cell: 5, x0: 0, z0: 0, cols: 20, rows: 20}, Int32Array.from({length: 400}, (_, k) => Math.floor(k / 20) * 5 * 20));
    const rf = T.siteReport(flat, 50, 50, 10, 8, 30), rs = T.siteReport(slope, 50, 50, 10, 8, 30);
    return {padMax, n, padDiff, corDiff, preDiff, under, hump, hy, rf: [rf.planeSlope, rf.ok], rs: [rs.planeSlope, rs.ok, rs.okSlope]};
  }, {src: FIXTURES.edits.src, spec: FIXTURES.edits.terrain});
  expect(r.n).toBeGreaterThan(40); expect(r.padMax).toBeLessThan(0.01);
  expect(r.padDiff).toBe(0); expect(r.corDiff).toBeLessThan(1e-9); expect(r.preDiff).toBe(0);
  expect(r.under).toBeLessThan(0.04);
  expect(r.rf[0]).toBeLessThan(1e-9); expect(r.rf[1]).toBe(true);
  expect(r.rs[0]).toBeGreaterThan(0.15); expect(r.rs[2]).toBe(false);
});

test('기하 도우미: Catmull 오차·표본 상한, 오프셋·폴리곤 연산', async () => {
  const r = await ev(() => {
    const G = (window as any).H.G, pts = [[0, 0], [40, 30], [90, 10], [130, 60]], LIM = {err: 0.1};
    const d = G.sampleControlPath(pts, 'catmull', LIM.err, 1, 20000);
    // 제어점은 정확히 표본이고 s 는 단조
    let ctrlErr = 0; pts.forEach((p, i) => { ctrlErr = Math.max(ctrlErr, Math.hypot(d.x[d.ctrl[i]] - p[0], d.z[d.ctrl[i]] - p[1])); });
    let mono = true; for (let i = 1; i < d.n; i++) if (!(d.s[i] > d.s[i - 1])) mono = false;
    // 곡선 위 점이 참값 근처인지: 매우 촘촘한 기준 곡선과의 최대 거리
    const ref = []; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)] || [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]]; const p3 = pts[i + 2] || [2 * pts[i + 1][0] - pts[i][0], 2 * pts[i + 1][1] - pts[i][1]]; for (let k = 0; k <= 400; k++) ref.push(G.crPoint(i === 0 ? [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]] : p0, pts[i], pts[i + 1], p3, k / 400)); }
    let maxDev = 0; for (let i = 0; i < d.n; i++) { let m = 1e9; for (const q of ref) m = Math.min(m, Math.hypot(d.x[i] - q[0], d.z[i] - q[1])); maxDev = Math.max(maxDev, m); }
    const cap = G.sampleControlPath(pts, 'catmull', 0.1, 0.001, 200);
    // 오프셋: 완만한 곡선은 꼬임 없음, 직각 꼬임은 정리됨
    const poly = []; for (let i = 0; i < d.n; i += 5) poly.push([d.x[i], d.z[i]]);
    const off = G.offsetPolyline(poly, 6), sharp = G.offsetPolyline([[0, 0], [20, 0], [20, 20]], 8);
    let selfX = 0; const chk = (a: number[][]) => { for (let i = 0; i + 1 < a.length; i++) for (let j = i + 2; j + 1 < a.length; j++) if (G.segIntersect(a[i], a[i + 1], a[j], a[j + 1], -1e-9)) selfX++; };
    chk(off); chk(sharp);
    // 폴리곤: 면적·내부 판정·inset·귀자르기 면적 보존(오목)
    const sq = [[0, 0], [10, 0], [10, 10], [0, 10]], L = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
    const tri = G.triangulatePolygon(L); let ta = 0; for (let i = 0; i < tri.length; i += 3) ta += G.polygonArea([L[tri[i]], L[tri[i + 1]], L[tri[i + 2]]]);
    const hash = new G.SpatialHash(8); hash.insert(0, 0, 3, 3, 'a'); hash.insert(50, 50, 51, 51, 'b');
    return {ctrlErr, mono, maxDev, cap: [cap.n, cap.capped], selfX, area: G.polygonArea(sq), inside: [G.pointInPolygon(5, 5, sq), G.pointInPolygon(11, 5, sq)], inset: G.polygonArea(G.insetPolygon(sq, 1)), outset: G.polygonArea(G.offsetPolygon(sq, 1, 1.5)), ta, la: G.polygonArea(L),
      hq: [hash.query(0, 0, 1, 1).join(), hash.query(40, 40, 60, 60).join(), String(hash.query(200, 200, 201, 201).length)]};
  }, 0);
  expect(r.ctrlErr).toBeLessThan(1e-9); expect(r.mono).toBe(true);
  expect(r.maxDev).toBeLessThan(0.12);
  expect(r.cap[0]).toBeLessThanOrEqual(200); expect(r.cap[1]).toBe(true);
  expect(r.selfX).toBe(0);
  expect(r.area).toBe(100); expect(r.inside).toEqual([true, false]);
  expect(r.inset).toBeCloseTo(64, 3); expect(r.outset).toBeCloseTo(144, 3);
  expect(r.ta).toBeCloseTo(r.la, 6);
  expect(r.hq).toEqual(['a', 'b', '0']);
});

test('규모: 60km 격자도 수 초 안에 빌드되고 크기·한도가 보고된다 (스모크)', async () => {
  const r = await ev(() => {
    const H = (window as any).H, g = {cell: 5, x0: -1500, z0: -1500, cols: 601, rows: 601}, cm = new Int32Array(g.cols * g.rows);
    for (let j = 0; j < g.rows; j++) for (let i = 0; i < g.cols; i++) { const x = g.x0 + i * 5, z = g.z0 + j * 5; cm[j * g.cols + i] = Math.round((6 * Math.sin(x / 260) * Math.cos(z / 310) + 4 * Math.sin((x + z) / 170)) * 100); }
    const roads: any[] = [], cls = ['arterial2', 'collector', 'local']; let k = 0;
    for (let a = -1050; a <= 1050; a += 150) { roads.push({id: 'ew' + a, cls: cls[k++ % 3], pts: [[-1000, a], [1000, a]], curve: 'line'}); roads.push({id: 'ns' + a, cls: cls[k++ % 3], pts: [[a, -1000], [a, 1000]], curve: 'line'}); }
    const src = {schemaVersion: 1, cityRevision: 1, generatorVersion: 1, seed: 3, bounds: [[-1400, -1400], [1400, -1400], [1400, 1400], [-1400, 1400]], terrain: {grid: {...g, encoding: 'delta-cm-b64', ref: 'x'}, edits: []}, roads, nodes: [], ramps: [], zones: [], parcels: [], buildings: [], anchors: [], parking: [], greenery: [], props: [], exceptions: []};
    const t = performance.now(), res = H.Bd.buildRoadsAndTerrain(src, {baseHeights: {cols: g.cols, rows: g.rows, cm}, debug: false});
    return {ms: performance.now() - t, st: res.stats, rej: res.rejected.length};
  }, 0);
  expect(r.rej).toBe(0);
  expect(r.st.roadLengthM).toBe(60000); expect(r.st.junctions).toBeGreaterThan(150);
  expect(r.st.compiledJsonBytes).toBeLessThan(20e6);
  expect(r.ms).toBeLessThan(30000);
});
