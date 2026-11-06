// city-author 미리보기: 지형 음영 + 구역 + 도로(등급별 색, 참조 이미지와 같은 색 체계) + 앵커·입체교차를 SVG 한 장으로 그리고
// Playwright(chromium)로 PNG 로 저장한다. 1 px = 1 m (view 로 잘라낸 범위). 순수 출력 — 게임 모듈을 바꾸지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {hillshadePng} from './city-author-img.mjs';
import {gridOf} from './city-author-terrain.mjs';

export const CLS_STYLE = {expressway: ['#ee8a2b', 1], arterial1: ['#fbe83a', 1], arterial2: ['#3fb985', 1], collector: ['#6fd1a2', 1], local: ['#9a5bdc', 1]};
const ZONE_FILL = {residential: '#f4a77d', commercial: '#f2d35b', office: '#8aa7e8', industrial: '#a39b94', civic: '#d98bd0', park: '#66c26b', nature: '#2f8f4a', farm: '#c9d65e', water: '#4aa3df'};

/** 도로 실제 폭(m)을 반영한 선 굵기. 단면 덮어쓰기가 있으면 그 폭 */
export function roadPx(ctx, r) {
  const d = ctx.SCH.ROAD_CLASS_DEFAULTS[r.cls], o = {...d, ...(r.lanes || {})};
  return Math.max(1.2, ctx.SCH.roadWidth(o));
}
/** 도로 중심선(조밀) — 빌더와 같은 표본기 */
export function roadPath(ctx, r) {
  const d = ctx.G.sampleControlPath(r.pts, r.curve, 0.3, 4, 20000);
  const o = [];
  for (let i = 0; i < d.n; i++) o.push([d.x[i], d.z[i]]);
  return o;
}

/** view = {x0,z0,x1,z1} 월드 범위. opts = {zones, roads, anchors, bounds, hillshade, labels} */
export function renderSvg(ctx, src, t, view, opts = {}) {
  const W = Math.round(view.x1 - view.x0), H = Math.round(view.z1 - view.z0), px = p => `${(p[0] - view.x0).toFixed(1)},${(p[1] - view.z0).toFixed(1)}`;
  const g = gridOf(t), out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  const sea = '#3a6ea5';
  out.push(`<rect width="${W}" height="${H}" fill="${sea}"/>`);
  if (opts.hillshade !== false) {
    const s = 5, hs = hillshadePng(t, (i, j) => t.h[j * t.cols + i], (i, j) => ctx.O.CITY_POLY.inside(...g.xz(i, j)), s);
    out.push(`<image x="${(t.x0 - t.cell / 2 - view.x0).toFixed(1)}" y="${(t.z0 - t.cell / 2 - view.z0).toFixed(1)}" width="${hs.w}" height="${hs.h}" href="data:image/png;base64,${hs.png.toString('base64')}"/>`);
  }
  if (opts.zones) for (const z of src.zones) out.push(`<polygon points="${z.poly.map(px).join(' ')}" fill="${ZONE_FILL[z.use] || '#999'}" fill-opacity="${opts.zoneAlpha ?? 0.42}" stroke="${ZONE_FILL[z.use]}" stroke-opacity="0.8" stroke-width="0.6"/>`);
  out.push(`<polygon points="${ctx.O.CITY_POLY.poly.map(px).join(' ')}" fill="none" stroke="#fff" stroke-width="1.2" stroke-opacity="0.8"/>`);
  if (opts.bounds !== false) out.push(`<polygon points="${src.bounds.map(px).join(' ')}" fill="none" stroke="#111" stroke-width="1.6" stroke-dasharray="7 4"/>`);
  if (opts.roads !== false) {
    const order = ['local', 'collector', 'arterial2', 'arterial1', 'expressway'];
    const sorted = src.roads.slice().sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls));
    // 고가(layer>=1) 구간은 뒤에 그려 지상 도로 위에 보이게 한다
    for (const pass of [0, 1]) for (const r of sorted) {
      const path = roadPath(ctx, r);
      const elevated = (r.segments || []).some(sg => sg.layer >= 1 && sg.kind === 'bridge');
      if (pass === 0 && elevated) continue;
      if (pass === 1 && !elevated) continue;
      const w = opts.trueWidth ? roadPx(ctx, r) : {expressway: 7, arterial1: 5.5, arterial2: 3.6, collector: 2.6, local: 1.5}[r.cls];
      out.push(`<polyline points="${path.map(px).join(' ')}" fill="none" stroke="#202020" stroke-opacity="0.55" stroke-width="${(w + 1.4).toFixed(1)}" stroke-linejoin="round"/>`);
      out.push(`<polyline points="${path.map(px).join(' ')}" fill="none" stroke="${CLS_STYLE[r.cls][0]}" stroke-width="${w.toFixed(1)}" stroke-linejoin="round"/>`);
    }
  }
  if (opts.anchors !== false) for (const a of src.anchors) {
    out.push(`<circle cx="${(a.x - view.x0).toFixed(1)}" cy="${(a.z - view.z0).toFixed(1)}" r="${a.fixed ? 6 : 4.5}" fill="${a.fixed ? '#e33' : '#fff'}" stroke="#000" stroke-width="1.2"/>`);
    if (opts.labels) out.push(`<text x="${(a.x - view.x0 + 8).toFixed(1)}" y="${(a.z - view.z0 + 4).toFixed(1)}" font-size="11" fill="#fff" stroke="#000" stroke-width="2.6" paint-order="stroke" font-family="sans-serif">${a.id}</text>`);
  }
  for (const n of src.nodes) if (n.kind === 'endpoint' && opts.endpoints) out.push(`<circle cx="${(n.at[0] - view.x0).toFixed(1)}" cy="${(n.at[1] - view.z0).toFixed(1)}" r="3" fill="#f0f" stroke="#000" stroke-width="0.8"/>`);
  out.push('</svg>');
  return out.join('\n');
}
export async function svgToPng(svg, w, h, file) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const b = await chromium.launch(), page = await b.newPage({viewport: {width: w, height: h}});
  await page.setContent(`<!doctype html><body style="margin:0;background:#000">${svg}</body>`);
  await page.screenshot({path: file, clip: {x: 0, y: 0, width: w, height: h}});
  await b.close();
}
