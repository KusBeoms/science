// 도시 섬 높이 굽기·다듬기 도구 (W8 P3-a)
// 사용: cd client && npx tsc && node tools/terrain-bake.mjs [--out public/data/city-terrain.json] [--report tests/out/terrain-bake] [--no-report] [--set 키=값 ...]
// 현재 core/heightmap.js 의 도시 섬(5u 격자)을 읽어 다듬고 city-terrain/1 JSON 으로 저장한다. 같은 입력·매개변수면 결과(체크섬)가 같다.
import fs from 'node:fs';
import path from 'node:path';
import {sampleCity} from './terrain-bake-sample.mjs';
import {smoothTerrain, DEFAULTS as SMOOTH} from './terrain-bake-smooth.mjs';
import {compare, hillshade} from './terrain-bake-metrics.mjs';
import {renderComparison} from './terrain-bake-render.mjs';
import {encodeTerrain, checksumCm} from '../public/js/data/city-terrain-codec.js';

/** 표본·보존 구역 매개변수 (단위 u). 보존 가중치 1 = 원본 그대로, 거리 구간에서 0 으로 서서히 풀린다 */
export const SAMPLE = {
  margin: 25, // 윤곽 bbox 바깥 여유 (낭떠러지 −12/−40/−90 띠가 들어간다)
  coastFull: 10, coastFade: 30, // 해안선 안쪽 거리: ≤10 보존, 30 에서 완전히 다듬기
  squareFull: 3, squareFade: 16, // 시가지 사각형(±335) 바깥 거리: ≤3 보존, 16 에서 풀림 (사각형 안은 전부 보존)
  bridgeEndFull: 70, bridgeEndFade: 100, // 남안 다리 어귀 |x−BX|
  approachPad: 4, // 다리 진입로 평탄 반폭 + 이 값까지 보존, FLAT_FADE 뒤 풀림
  roadPad: 0, roadFade: 40, // 산악도로 중심선 거리: ≤18(노면+어깨) 보존, 40 에서 풀림
  obsFull: 10, // 천문대 광장 반지름 + 10 보존, +44 에서 풀림
};
export const DEFAULT_SMOOTH = {...SMOOTH, sigma: 1.5, rangeSigma: 12, talus: 1.1, thermalRate: 0.4, thermalIter: 40, maxDev: 20};

const args = process.argv.slice(2);
const arg = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const out = path.resolve(arg('--out') || 'public/data/city-terrain.json');
const reportDir = path.resolve(arg('--report') || 'tests/out/terrain-bake');
const S = {...SAMPLE}, M = {...DEFAULT_SMOOTH};
args.forEach((a, i) => {
  if (args[i - 1] !== '--set') return;
  const [k, v] = a.split('=');
  if (k in S) S[k] = +v; else if (k in M) M[k] = +v; else throw new Error('알 수 없는 매개변수 ' + k);
});

const f = await sampleCity(S);
f.step = 5;
const res = smoothTerrain(f, M);
const after = Float64Array.from(res.cm, v => v / 100);
const cmts = compare(f, f.h, after);
// 보존 구역 검증: pw=1 칸은 원본과 1cm 이내(반올림)여야 한다
let preservedCells = 0, preservedMaxDev = 0;
for (let o = 0; o < f.h.length; o++) if (f.pw[o] >= 1) { preservedCells++; preservedMaxDev = Math.max(preservedMaxDev, Math.abs(after[o] - f.h[o])); }
const srcCm = Int32Array.from(f.h, v => Math.round(v * 100));
const file = encodeTerrain(
  {origin: {x: f.ox, z: f.oz}, step: 5, nx: f.nx, nz: f.nz, cm: res.cm, land: f.land},
  {sample: S, smooth: M, tool: 'client/tools/terrain-bake.mjs', source: 'core/heightmap.js bakeContinent() 5u 격자 (도시 윤곽 bbox + margin)'},
  {landCells: cmts.landCells, preservedCells, preservedMaxDevU: preservedMaxDev, source: {min: Math.min(...srcCm), max: Math.max(...srcCm), checksum: checksumCm(srcCm)}, clampedCells: res.clamped,
    compare: {maxDevU: cmts.maxDev, meanDevU: cmts.meanDev, changedCells: cmts.changedCells, peakBeforeAfter: cmts.peak}},
);
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(file));
const size = fs.statSync(out).size;
console.log(`쓴 파일 ${out} (${(size / 1024).toFixed(0)} KB) 격자 ${f.nx}x${f.nz} 땅 ${cmts.landCells} 체크섬 ${file.stats.checksum}`);
console.log(JSON.stringify({...cmts, preservedCells, preservedMaxDevU: preservedMaxDev, clamped: res.clamped}, null, 1));
if (!args.includes('--no-report')) {
  fs.mkdirSync(reportDir, {recursive: true});
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify({file: path.relative(process.cwd(), out), bytes: size, checksum: file.stats.checksum, sample: S, smooth: M, ...cmts, preservedCells, preservedMaxDevU: preservedMaxDev, clamped: res.clamped}, null, 1));
  await renderComparison(f, f.h, after, hillshade(f.h, f.nx, f.nz, 5), hillshade(after, f.nx, f.nz, 5), reportDir);
  console.log('이미지·report.json →', reportDir);
}
