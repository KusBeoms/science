#!/usr/bin/env node
// city.source.json → city.compiled.json (도로·지형 단계). 순수 citygen 라이브러리(public/js/citygen)를 Node 에서 그대로 부른다.
// 사용: cd client && npx tsc && node --no-warnings tools/city-build.mjs [옵션]
//   --src <파일>    입력 원본 (기본 public/data/city.source.json)
//   --out <파일>    출력 (기본 public/data/city.compiled.json)
//   --pub <폴더>    public 폴더 (grid.ref 해석·citygen 모듈 위치, 기본 client/public)
//   --chunk <m>     리본 청크 크기 (기본 64)
//   --no-uv         리본 uv 를 내보내지 않는다 (크기 약 25% 감소, 클라이언트가 월드 좌표로 투영)
//   --no-mask       지형 surfaceMask 를 내보내지 않는다
//   --strict        거부(rejected)가 하나라도 있으면 종료 코드 2
//   --quiet         보고를 한 줄로
// 종료 코드: 0 성공, 1 입력·검증·IO 오류, 2 --strict 인데 거부 있음.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && i + 1 < args.length ? args[i + 1] : def; };
const flag = name => args.includes(name);
const pub = path.resolve(opt('--pub', path.join(here, '..', 'public')));
const srcPath = path.resolve(opt('--src', path.join(pub, 'data', 'city.source.json')));
const outPath = path.resolve(opt('--out', path.join(pub, 'data', 'city.compiled.json')));
const die = (msg, code = 1) => { console.error('city-build: ' + msg); process.exit(code); };
const mb = n => (n / 1e6).toFixed(2) + ' MB';

if (!fs.existsSync(srcPath)) die(`원본이 없다: ${srcPath}`);
const jsDir = path.join(pub, 'js');
if (!fs.existsSync(path.join(jsDir, 'citygen', 'build.js'))) die('public/js/citygen 이 없다. 먼저 `cd client && npx tsc` 를 실행하라');
let source;
try { source = JSON.parse(fs.readFileSync(srcPath, 'utf8')); } catch (e) { die(`원본 JSON 을 읽을 수 없다: ${e.message}`); }

const B = await import(pathToFileURL(path.join(jsDir, 'citygen', 'build.js')).href);
const C = await import(pathToFileURL(path.join(jsDir, 'data', 'city-terrain-codec.js')).href);

// 기본 높이: 인라인 data 가 없으면 grid.ref(city-terrain/1 파일)를 해독해 넘긴다
let baseHeights;
const g = source?.terrain?.grid;
if (g && !g.data && g.ref) {
  const refPath = path.resolve(pub, g.ref);
  if (!fs.existsSync(refPath)) die(`grid.ref 파일이 없다: ${refPath}`);
  let t;
  try { t = C.decodeTerrain(JSON.parse(fs.readFileSync(refPath, 'utf8'))); } catch (e) { die(`높이 파일 해독 실패: ${e.message}`); }
  const same = t.nx === g.cols && t.nz === g.rows && t.origin.x === g.x0 && t.origin.z === g.z0 && t.step === g.cell;
  if (!same) die(`높이 파일 격자(${t.nx}x${t.nz} @${t.origin.x},${t.origin.z} step ${t.step})가 원본 grid(${g.cols}x${g.rows} @${g.x0},${g.z0} cell ${g.cell})와 다르다`);
  baseHeights = {cols: t.nx, rows: t.nz, cm: t.cm};
}

let res;
try {
  res = B.buildRoadsAndTerrain(source, {baseHeights, chunkSize: +opt('--chunk', 64), uv: !flag('--no-uv'), surfaceMask: !flag('--no-mask')});
} catch (e) {
  if (e.name === 'BuildError') { console.error('city-build: ' + e.message); for (const x of (e.errors || []).slice(0, 20)) console.error(`  ${x.path} [${x.code}] ${x.msg}`); process.exit(1); }
  throw e;
}
const json = JSON.stringify(res.compiled);
fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, json);
const gz = zlib.gzipSync(json).length;
const st = res.stats;
if (flag('--quiet')) console.log(`city-build: roads ${st.roadsOut}/${st.roadsIn} 교차로 ${st.junctions} ${mb(json.length)} (gzip ${mb(gz)}) rejected ${res.rejected.length}`);
else {
  console.log(`원본  ${srcPath}\n출력  ${outPath}\nhash  ${res.compiled.header.sourceHash}`);
  console.log(`도로  ${st.roadsOut}/${st.roadsIn} 채택 (거부 ${st.roadsRejected}), 연장 ${(st.roadLengthM / 1000).toFixed(2)} km, 교차로 ${st.junctions}`);
  console.log(`리본  청크 ${st.ribbonChunks}, 정점 ${st.ribbonVertices}, 삼각형 ${st.ribbonTriangles}, 표면별 ${JSON.stringify(st.verticesBySurface)}`);
  const part = k => { const s = JSON.stringify(res.compiled[k] ?? null); return `${k} ${mb(s.length)}/gz ${mb(zlib.gzipSync(s).length)}`; };
  console.log(`크기  전체 ${mb(json.length)} (gzip ${mb(gz)})  |  ${['terrain', 'roads', 'ribbons', 'junctions'].map(part).join('  |  ')}`);
  console.log(`시간  ${JSON.stringify(st.timingsMs)} ms`);
  if (res.rejected.length) { console.log(`거부 ${res.rejected.length}건:`); for (const r of res.rejected.slice(0, 50)) console.log(`  [${r.code}] ${r.owner}: ${r.msg}`); }
  if (res.warnings.length) { console.log(`경고 ${res.warnings.length}건:`); for (const r of res.warnings.slice(0, 50)) console.log(`  [${r.code}] ${r.owner}: ${r.msg}`); }
}
if (flag('--strict') && res.rejected.length) process.exit(2);
