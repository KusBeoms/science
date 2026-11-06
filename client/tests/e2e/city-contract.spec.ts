// 도시 계약 검증: city-validate(좋은/나쁜 fixture)와 boot.ts 오류 분류. WebGL 불필요 — 정적 서버 + 빈 페이지에서 js 모듈만 import.
import {test, expect, chromium, type Browser, type Page} from '@playwright/test';
import {startServer} from './server';

type Src = Record<string, any>;
const door = () => ({x: 0, z: 4, w: 1, h: 2.1, facing: 's'});
function good(): Src {
  return {
    schemaVersion: 1, cityRevision: 1, generatorVersion: 1, seed: 7,
    bounds: [[-300, -300], [300, -300], [320, 100], [0, 320], [-320, 100]],
    terrain: {grid: {cell: 5, x0: -400, z0: -400, cols: 160, rows: 160, encoding: 'delta-cm-b64', ref: 'data/city-terrain.json'},
      edits: [{kind: 'pad', id: 'pad1', x: 0, z: 17, r: 20, falloff: 10}, {kind: 'corridor', id: 'cor1', roadId: 'r1', cut: 3, fill: 3, shoulder: 6},
        {kind: 'brush', id: 'br1', mode: 'smooth', r: 10, strength: 0.5, pts: [[0, 0], [10, 10]]}]},
    roads: [
      {id: 'r1', cls: 'arterial1', curve: 'catmull', pts: [[-200, 0], [0, 10], [200, 0]],
        segments: [{id: 'r1a', from: 0, to: 1, layer: 0, kind: 'ground'}, {id: 'r1b', from: 1, to: 2, layer: 1, kind: 'bridge', heights: [{s: 0, y: 6}, {s: 100, y: 6}]}]},
      {id: 'r2', cls: 'local', curve: 'line', pts: [[0, 10], [0, 200]], oneWay: true},
    ],
    nodes: [{id: 'n1', kind: 'junction', at: [0, 10], layer: 0, roads: ['r1', 'r2']}, {id: 'n2', kind: 'rampEnd', at: [0, 60], layer: 1, roads: ['r1']}],
    ramps: [{id: 'rp1', road: 'r2', fromNode: 'n1', toNode: 'n2'}],
    zones: [{id: 'z1', use: 'residential', poly: [[-100, 20], [100, 20], [100, 120], [-100, 120]]}],
    parcels: [{id: 'p1', road: 'r2', side: 'left', t0: 10, t1: 40, depth: 25, zone: 'z1'}],
    buildings: [{id: 'b1', parcel: 'p1', x: -20, z: 50, w: 10, d: 8, rot: 90, floors: 2, style: 'house',
      interior: {mode: 'onsite', door: door(), floors: 2, floorH: 3, floorY: 1.5}}],
    anchors: [{id: 'a1', kind: 'bridgeEnd', x: 0, z: -300, fixed: true, flattenRadius: 15}],
    parking: [{id: 'pk1', kind: 'perpendicular', x: 5, z: 60, rot: 0, layer: 0, road: 'r2'}],
    greenery: [{id: 'g1', kind: 'streetTree', roadClass: 'local', species: ['oak'], spacing: {min: 6, target: 10, max: 14}, clearance: 2}],
    props: [{id: 'pp1', kind: 'lamp', roadClass: 'local', side: 'stagger', spacing: {min: 20, target: 28, max: 35}, offset: 0.5, clearance: 3}],
    exceptions: [{kind: 'noBuild', id: 'e1', poly: [[0, 0], [10, 0], [10, 10]]}, {kind: 'style', id: 'e2', target: 'b1', style: 'shop'}],
  };
}
const mut = (f: (s: Src) => void) => { const s = good(); f(s); return JSON.stringify(s); };
const BAD: Record<string, {json: string; code: string}> = {
  'unsupported-version': {json: mut(s => { s.schemaVersion = 99; }), code: 'unsupported-version'},
  'duplicate-id': {json: mut(s => { s.roads[1].id = 'r1'; }), code: 'duplicate-id'},
  'bad-ref(node→road)': {json: mut(s => { s.nodes[0].roads = ['nope']; }), code: 'bad-ref'},
  'bad-ref(building→parcel)': {json: mut(s => { s.buildings[0].parcel = 'nope'; }), code: 'bad-ref'},
  'non-finite(1e999)': {json: JSON.stringify(good()).replace('"seed":7', '"seed":7,"x":1').replace('"cityRevision":1', '"cityRevision":1e999'), code: 'non-finite'},
  'zero-length(point)': {json: mut(s => { s.roads[1].pts = [[0, 10], [0, 10]]; }), code: 'zero-length'},
  'zero-length(segment from>=to)': {json: mut(s => { s.roads[0].segments[0].to = 0; }), code: 'zero-length'},
  'width<=0(laneW)': {json: mut(s => { s.roads[1].lanes = {laneW: 0}; }), code: 'bad-width'},
  'width<=0(door)': {json: mut(s => { s.buildings[0].interior.door.w = 0; }), code: 'bad-width'},
  'self-intersect(zone)': {json: mut(s => { s.zones[0].poly = [[0, 0], [10, 10], [10, 0], [0, 10]]; }), code: 'self-intersect'},
  'self-intersect(bounds)': {json: mut(s => { s.bounds = [[0, 0], [10, 10], [10, 0], [0, 10]]; }), code: 'self-intersect'},
  'cap(roads)': {json: mut(s => { s.roads = Array.from({length: 601}, (_, i) => ({id: 'x' + i, cls: 'local', curve: 'line', pts: [[0, 0], [1, 1]]})); }), code: 'too-many'},
  'range(floors)': {json: mut(s => { s.buildings[0].floors = 999; }), code: 'range'},
  'order(heights)': {json: mut(s => { s.roads[0].segments[1].heights = [{s: 50, y: 6}, {s: 10, y: 6}]; }), code: 'order'},
  'missing(bridge heights)': {json: mut(s => { delete s.roads[0].segments[1].heights; }), code: 'missing'},
  'range(parcel t1>길이)': {json: mut(s => { s.parcels[0].t1 = 5000; }), code: 'range'},
  'range(door 밖)': {json: mut(s => { s.buildings[0].interior.door.z = 40; }), code: 'range'},
};

let browser: Browser, server: {url: string; close: () => Promise<void>};
test.beforeAll(async () => { server = await startServer(); browser = await chromium.launch(); });
test.afterAll(async () => { await browser.close(); await server.close(); });

const PAGE_HTML = `<!doctype html><meta charset=utf-8><body><script type=module>
globalThis.__BOOT_NO_AUTORUN__ = true;
const B = await import('./js/boot.js');
const V = await import('./js/data/city-validate.js');
const S = await import('./js/data/city-source.js');
const C = await import('./js/data/city-schema.js');
window.T = {B, V, S, C}; window.READY = true;
</script></body>`;

/** base 가 '/' 또는 '/steal-an-planet/'. 하위 경로 요청은 정적 서버 루트로 되돌려 보낸다 */
async function open(base: string, dataRoute?: (r: import('@playwright/test').Route) => Promise<void> | void): Promise<Page> {
  const page = await browser.newPage();
  const html = (r: import('@playwright/test').Route) => r.fulfill({contentType: 'text/html', body: PAGE_HTML});
  await page.route(`**${base}__contract.html`, html);
  if (base !== '/') await page.route(`**${base}js/**`, r => r.continue({url: r.request().url().replace(base, '/')}));
  if (dataRoute) await page.route('**/data/city.source.json', dataRoute);
  await page.goto(server.url + base + '__contract.html');
  await page.waitForFunction(() => (window as any).READY === true);
  return page;
}
const boot = (page: Page, opt: Record<string, unknown> = {}) =>
  page.evaluate(async (o) => {
    const T = (window as any).T;
    const w = window as any;
    w.__main = 0; w.__err = null;
    const out = await T.B.bootGame({require: true, terrain: false, importMain: async () => { w.__main++; }, showError: (r: any) => { w.__err = r.kind; }, ...o});
    return {kind: out.ok ? 'ok:' + out.origin : out.kind, main: w.__main, err: w.__err, has: T.S.hasCitySource()};
  }, opt);

test('validator: 좋은 fixture 통과', async () => {
  const page = await open('/');
  const r = await page.evaluate((j) => (window as any).T.V.validateCitySource(JSON.parse(j)), JSON.stringify(good()));
  expect(r.errors).toEqual([]);
  expect(r.ok).toBe(true);
  await page.close();
});

test('validator: 나쁜 fixture 는 해당 코드 오류를 낸다', async () => {
  const page = await open('/');
  for (const [name, {json, code}] of Object.entries(BAD)) {
    const r = await page.evaluate((j) => (window as any).T.V.validateCitySource(JSON.parse(j)), json);
    expect(r.ok, name).toBe(false);
    expect(r.errors.map((e: any) => e.code), name).toContain(code);
  }
  // 원본 불변·객체가 아닌 입력
  for (const bad of ['null', '[]', '5', '"x"']) {
    const r = await page.evaluate((j) => (window as any).T.V.validateCitySource(JSON.parse(j)), bad);
    expect(r.ok).toBe(false);
  }
  await page.close();
});

test('스키마 상수: 도로 5등급 총 폭이 SCALE.md 표와 같다', async () => {
  const page = await open('/');
  const w = await page.evaluate(() => { const C = (window as any).T.C; return Object.fromEntries(C.ROAD_CLASSES.map((k: string) => [k, +C.roadWidth(C.ROAD_CLASS_DEFAULTS[k]).toFixed(2)])); });
  expect(w).toEqual({expressway: 29, arterial1: 32.5, arterial2: 22.6, collector: 18, local: 13.5});
  await page.close();
});

test('boot: 정상 로드 → source 설정 후 main 1회', async () => {
  const page = await open('/', r => r.fulfill({contentType: 'application/json', body: JSON.stringify(good())}));
  expect(await boot(page)).toEqual({kind: 'ok:deployed', main: 1, err: null, has: true});
  // 두 번째 설정 시도는 거부(덮어쓰기 금지)
  const again = await page.evaluate(() => { try { (window as any).T.S.setCitySource({}); return 'set'; } catch { return 'throws'; } });
  expect(again).toBe('throws');
  await page.close();
});

const CASES: [string, (r: import('@playwright/test').Route) => unknown, string, Record<string, unknown>?][] = [
  ['404', r => r.fulfill({status: 404, body: 'nf'}), 'not-found'],
  ['500', r => r.fulfill({status: 500, body: 'x'}), 'http'],
  ['SPA fallback HTML 200 → invalid-json', r => r.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><html>'}), 'invalid-json'],
  ['잘린 JSON', r => r.fulfill({status: 200, contentType: 'application/json', body: '{"schemaVersion":1,'}), 'invalid-json'],
  ['미지원 버전', r => r.fulfill({contentType: 'application/json', body: mut(s => { s.schemaVersion = 2; })}), 'unsupported-version'],
  ['검증 실패', r => r.fulfill({contentType: 'application/json', body: mut(s => { s.roads[1].id = 'r1'; })}), 'invalid'],
  ['네트워크 오류', r => r.abort('connectionrefused'), 'network'],
  ['시간 초과', () => { /* 응답하지 않음 */ }, 'timeout', {timeoutMs: 300}],
];
for (const [name, handler, kind, extra] of CASES) {
  test(`boot: ${name} → ${kind}, source 미설정·main 미실행·오류 표시`, async () => {
    const page = await open('/', handler);
    expect(await boot(page, extra)).toEqual({kind, main: 0, err: kind, has: false});
    await page.close();
  });
}

test('boot: 기본 오류 화면에 원인이 한국어로 표시된다', async () => {
  const page = await open('/', r => r.fulfill({status: 404, body: ''}));
  await page.evaluate(async () => { await (window as any).T.B.bootGame({require: true, terrain: false, importMain: async () => {}}); });
  const text = await page.locator('#boot-error').innerText();
  expect(text).toContain('게임을 시작하지 못했습니다');
  expect(text).toContain('404');
  expect(text).toContain('not-found');
  await page.close();
});

test('boot: require=false 면 fetch 없이 main 만 실행(현행 게임 보호)', async () => {
  let hits = 0;
  const page = await open('/', r => { hits++; return r.fulfill({status: 404, body: ''}); });
  expect(await boot(page, {require: false})).toEqual({kind: 'ok:skipped', main: 1, err: null, has: false});
  expect(hits).toBe(0);
  await page.close();
});

test('boot: ?city=local 초안은 param 이 있을 때만 사용', async () => {
  const page = await open('/', r => r.fulfill({status: 404, body: ''}));
  await page.evaluate((j) => localStorage.setItem('steal-planet.city-draft.v1', j), JSON.stringify(good()));
  expect(await boot(page, {search: ''})).toMatchObject({kind: 'not-found', main: 0, has: false}); // 초안 무시
  expect(await boot(page, {search: '?city=local'})).toEqual({kind: 'ok:local', main: 1, err: null, has: true});
  await page.close();
  const p2 = await open('/');
  expect(await boot(p2, {search: '?city=local'})).toMatchObject({kind: 'local-missing', main: 0, has: false});
  await p2.evaluate(() => localStorage.setItem('steal-planet.city-draft.v1', '{oops'));
  expect(await boot(p2, {search: '?city=local'})).toMatchObject({kind: 'invalid-json', main: 0, has: false});
  await p2.close();
});

test('boot: /steal-an-planet/ 하위 경로에서 상대 URL 로 해석', async () => {
  let seen = '';
  const page = await open('/steal-an-planet/', r => { seen = r.request().url(); return r.fulfill({contentType: 'application/json', body: JSON.stringify(good())}); });
  expect(await boot(page)).toMatchObject({kind: 'ok:deployed', main: 1, has: true});
  expect(seen).toBe(server.url + '/steal-an-planet/data/city.source.json');
  await page.close();
});
