// Cached cartography plus CSS-pixel pins. All paths come from the actual game data.
import {CITY_POLY, WILD_POLY} from '../data/outline.js';
import {CITY_BUILDINGS, CITY_PARKS, CITY_PLAZAS, CITY_ROADS, footprint} from '../data/city.js';
import {FRINGE_LANES} from '../data/city-fringe.js';
import {CENTER_CIRCLE, RADIALS} from '../data/roads-w7.js';
import {ALL_DECKS, VIADUCTS, slipsOf} from '../data/roads-w4.js';
import {BX, HW, ROAD_HW, Z_UP0, Z_DN1, CITY_APPROACH_START, cityApproach, wildFlare} from '../data/bridge.js';
import {MOUNTAIN_ROAD, MROAD_W} from '../data/mountain-road.js';
import {ROAD_LINES} from '../data/wild-road.js';
import {LAKES} from '../data/wild.js';
import {PARCELS} from '../data/wild-fields.js';
import {RURAL_ENTRIES} from '../data/rural-entries.js';
import {STREAMS} from '../data/wild-mountain.js';
import {SECTORS} from '../data/sectors.js';
import {CITY_HALF} from '../data/world-map.js';
import {GX0, GZ0, NX, NZ, STEP, gridOf} from '../core/heightmap.js';
import {TRAIL} from '../core/wild-trail.js';
import {lakeT} from '../core/lake-shape.js';
import {locked} from '../core/progress.js';
import {MAP_BOUNDS as B, mapPlacePriority, type MapPlace, type MapPosition} from './map-data.js';
export interface MapTransform {width: number; height: number; centerX: number; centerZ: number; scale: number}
export interface MapMarker {id: string; x: number; y: number; label: boolean}
type Rect = readonly [number, number, number, number];
interface Road {path: Path2D; width: number; color: string; casing: string; border: number; dash?: number[]}
const polygon = (pts: readonly (readonly number[])[]) => {
  const p = new Path2D(); pts.forEach((v, i) => i ? p.lineTo(v[0], v[1]) : p.moveTo(v[0], v[1])); p.closePath(); return p;
};
const line = (pts: readonly {x: number; z: number}[], closed = false) => {
  const p = new Path2D(); pts.forEach((v, i) => i ? p.lineTo(v.x, v.z) : p.moveTo(v.x, v.z)); if (closed) p.closePath(); return p;
};
let cache: HTMLCanvasElement | null = null, roads: Road[] = [], builds = 0;
const approaches: {path: Path2D; color: string}[] = [];
function buildRoads() {
  const add = (pts: readonly {x: number; z: number}[], width: number, color = '#b8c2c4', border = 2, casing = '#71878c', closed = false, dash?: number[]) =>
    roads.push({path: line(pts, closed), width, color, border, casing, dash});
  CITY_ROADS.forEach(r => {
    // The old straight harbor tail is replaced by the actual quintic bridge approach.
    let z0 = r.z0, z1 = r.z1;
    if (r.x0 === 0 && r.x1 === 0 && Math.max(z0, z1) > CITY_APPROACH_START) {
      z0 = Math.min(z0, CITY_APPROACH_START); z1 = Math.min(z1, CITY_APPROACH_START);
    }
    add([{x: r.x0, z: z0}, {x: r.x1, z: z1}], r.w, r.car ? '#b8c2c4' : '#d9d1b5', r.sidewalk * 2, '#d3d4c3');
  });
  RADIALS.forEach(r => add([{x: r.x0, z: r.z0}, {x: r.x1, z: r.z1}], r.w, '#b8c2c4', r.sw * 2, '#d3d4c3'));
  FRINGE_LANES.forEach(r => add(r.points.map(p => ({x: p[0], z: p[1]})), r.width, '#c4c0aa', 1));
  add(MOUNTAIN_ROAD, MROAD_W, '#b8c2c4', 3);
  ROAD_LINES.forEach(r => add(r.pts, r.w, '#b8c2c4', 2, '#70846e', r.closed));
  add(TRAIL, 2.5, '#e0c78f', 0, '#768669', false, [5, 3]);
  VIADUCTS.flatMap(slipsOf).forEach(r => add([{x: r.ax, z: r.az}, {x: r.bx, z: r.bz}], r.hw * 2));
  ALL_DECKS.forEach(d => add([{x: d.ax, z: d.az}, {x: d.bx, z: d.bz}], d.hw * 2, '#d2c79e', 2, '#596d74'));
  add([{x: BX, z: Z_UP0}, {x: BX, z: Z_DN1}], ROAD_HW * 2, '#bcc8c9', (HW - ROAD_HW) * 2, '#d58a60');
  for (const samples of [cityApproach(64), wildFlare(20)]) for (const [field, color] of [['w', '#d58a60'], ['r', '#bcc8c9']] as const) {
    const left = samples.map(p => [p.x + p.tz * p[field], p.z - p.tx * p[field]]),
      right = samples.map(p => [p.x - p.tz * p[field], p.z + p.tx * p[field]]).reverse();
    approaches.push({path: polygon([...left, ...right]), color});
  }
}
function strokeRoads(ctx: CanvasRenderingContext2D) {
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const r of roads) {
    ctx.setLineDash([]); ctx.strokeStyle = r.casing; ctx.lineWidth = r.width + r.border; ctx.stroke(r.path);
    ctx.strokeStyle = r.color; ctx.lineWidth = r.width; ctx.setLineDash(r.dash || []); ctx.stroke(r.path);
  }
  ctx.setLineDash([]);
  for (const fill of approaches) {ctx.fillStyle = fill.color; ctx.fill(fill.path);}
}
function relief() {
  const canvas = document.createElement('canvas'), w = B.x1 - B.x0, h = B.z1 - B.z0;
  canvas.height = 512; canvas.width = Math.ceil(512 * w / h);
  const ctx = canvas.getContext('2d')!, image = ctx.createImageData(canvas.width, canvas.height), {h: heights} = gridOf();
  for (let j = 0; j < canvas.height; j++) for (let i = 0; i < canvas.width; i++) {
    const x = B.x0 + i / canvas.width * w, z = B.z0 + j / canvas.height * h,
      gx = Math.max(1, Math.min(NX - 2, Math.round((x - GX0) / STEP))),
      gz = Math.max(1, Math.min(NZ - 2, Math.round((z - GZ0) / STEP))), index = gz * NX + gx, y = heights[index],
      t = Math.max(0, Math.min(1, (y - 8) / 60)), snow = Math.max(0, Math.min(1, (y - 65) / 24)),
      shade = Math.max(-14, Math.min(14, (heights[index - 1] - heights[index + 1] + heights[index - NX] - heights[index + NX]) * 1.8)), o = (j * canvas.width + i) * 4;
    image.data[o] = (100 + 53 * t) * (1 - snow) + 225 * snow + shade;
    image.data[o + 1] = (143 + 10 * t) * (1 - snow) + 228 * snow + shade;
    image.data[o + 2] = (108 + 34 * t) * (1 - snow) + 218 * snow + shade;
    image.data[o + 3] = 255;
  }
  ctx.putImageData(image, 0, 0); return canvas;
}
function ensureBase() {
  if (cache) return cache;
  builds++; buildRoads(); cache = document.createElement('canvas');
  const w = B.x1 - B.x0, h = B.z1 - B.z0, scale = 1536 / Math.max(w, h);
  cache.width = Math.ceil(w * scale); cache.height = Math.ceil(h * scale);
  const ctx = cache.getContext('2d')!; ctx.scale(scale, scale); ctx.translate(-B.x0, -B.z0);
  ctx.fillStyle = '#173f52'; ctx.fillRect(B.x0, B.z0, w, h);
  const land = new Path2D(); land.addPath(polygon(CITY_POLY.poly)); land.addPath(polygon(WILD_POLY.poly));
  SECTORS.forEach(s => land.rect(s.center.x - s.size / 2, s.center.z - s.size / 2, s.size, s.size));
  ctx.strokeStyle = '#3b7484'; ctx.lineWidth = 18; ctx.stroke(land);
  ctx.save(); ctx.clip(land); ctx.drawImage(relief(), B.x0, B.z0, w, h); ctx.restore();
  SECTORS.forEach(s => {
    ctx.fillStyle = s.floor[0]; ctx.globalAlpha = 0.85;
    ctx.fillRect(s.center.x - s.size / 2, s.center.z - s.size / 2, s.size, s.size);
  }); ctx.globalAlpha = 1;
  // A single actual footprint layer makes blocks and parks legible without 3D re-rendering.
  ctx.fillStyle = '#8a9d88'; ctx.fillRect(-CITY_HALF, -CITY_HALF, CITY_HALF * 2, CITY_HALF * 2);
  CITY_PARKS.forEach(p => {ctx.fillStyle = '#699775'; ctx.fillRect(p[0], p[1], p[2] - p[0], p[3] - p[1]);});
  CITY_PLAZAS.forEach(p => {const r = p.rect; ctx.fillStyle = '#c5c6ac'; ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);});
  for (const p of PARCELS) {
    ctx.save(); ctx.translate(p.x, p.z); ctx.rotate(p.ang); ctx.fillStyle = p.kind === 'soil' ? '#9f9470' : p.kind === 'pale' || p.kind === 'rice' ? '#c7bc7d' : '#8ca96c';
    ctx.fillRect(-p.w / 2, -p.d / 2, p.w, p.d); ctx.restore();
  }
  ctx.fillStyle = '#b7b8a4';
  CITY_BUILDINGS.forEach(b => {const r = footprint(b); ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);});
  RURAL_ENTRIES.forEach(e => {ctx.save(); ctx.translate(e.x, e.z); ctx.rotate(-e.ry); ctx.fillRect(-e.w / 2, -e.d / 2, e.w, e.d); ctx.restore();});
  ctx.save(); ctx.clip(polygon(WILD_POLY.poly)); ctx.fillStyle = '#397e9e';
  for (const lake of LAKES) {
    const points: number[][] = [];
    for (let i = 0; i < 128; i++) {
      const a = i / 128 * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a); let lo = 0, hi = Math.max(lake.rx, lake.rz) * 2.5;
      for (let k = 0; k < 12; k++) {const r = (lo + hi) / 2; if (lakeT(lake, lake.x + dx * r, lake.z + dz * r) < 1) lo = r; else hi = r;}
      points.push([lake.x + dx * hi, lake.z + dz * hi]);
    }
    ctx.fill(polygon(points));
  }
  ctx.strokeStyle = '#5292a0'; ctx.lineWidth = 3;
  STREAMS.forEach(s => ctx.stroke(line(s.pts.map(p => ({x: p[0], z: p[1]}))))); ctx.restore();
  strokeRoads(ctx);
  ctx.strokeStyle = '#c5c6ac'; ctx.lineWidth = CENTER_CIRCLE.r - CENTER_CIRCLE.inner;
  ctx.beginPath(); ctx.arc(0, 0, (CENTER_CIRCLE.r + CENTER_CIRCLE.inner) / 2, 0, Math.PI * 2); ctx.stroke();
  return cache;
}
export function mapBaseStats() {return {builds, width: cache?.width || 0, height: cache?.height || 0, roads: roads.length};}
const overlaps = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
export function paintMap(ctx: CanvasRenderingContext2D, v: MapTransform, places: readonly MapPlace[], selected: string | null,
  player: MapPosition, waypoint: {x: number; z: number; name: string} | null): MapMarker[] {
  const base = ensureBase(), markers: MapMarker[] = [], occupied: Rect[] = [],
    X = (x: number) => (x - v.centerX) * v.scale + v.width / 2,
    Z = (z: number) => (z - v.centerZ) * v.scale + v.height / 2;
  ctx.clearRect(0, 0, v.width, v.height); ctx.fillStyle = '#173f52'; ctx.fillRect(0, 0, v.width, v.height);
  ctx.save(); ctx.translate(v.width / 2 - v.centerX * v.scale, v.height / 2 - v.centerZ * v.scale); ctx.scale(v.scale, v.scale);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(base, B.x0, B.z0, B.x1 - B.x0, B.z1 - B.z0);
  if (v.scale > 0.5) strokeRoads(ctx); ctx.restore();
  ctx.font = '600 12px system-ui,sans-serif'; ctx.textBaseline = 'middle';
  const candidates = places.filter(p => mapPlacePriority(p.id) >= (v.scale < 0.35 ? 80 : v.scale < 0.8 ? 40 : v.scale < 1.5 ? 25 : 0) || p.id === selected)
    .sort((a, b) => (b.id === selected ? 1000 : mapPlacePriority(b.id)) - (a.id === selected ? 1000 : mapPlacePriority(a.id)));
  const px = X(player.x), pz = Z(player.z); occupied.push([px - 18, pz - 18, px + 18, pz + 18]);
  for (const p of candidates) {
    const x = X(p.x), y = Z(p.z), pin: Rect = [x - 11, y - 11, x + 11, y + 11], active = p.id === selected;
    if (x < -15 || y < -15 || x > v.width + 15 || y > v.height + 15 || (!active && occupied.some(r => overlaps(pin, r)))) continue;
    occupied.push(pin); ctx.beginPath(); ctx.arc(x, y, active ? 12 : 10, 0, Math.PI * 2);
    ctx.fillStyle = active ? '#d4a34b' : '#203d4a'; ctx.fill(); ctx.strokeStyle = '#d4e4dc'; ctx.lineWidth = active ? 2 : 1; ctx.stroke();
    ctx.font = '14px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.icon, x, y + 1);
    ctx.font = '600 12px system-ui,sans-serif'; const textW = ctx.measureText(p.name).width, box: Rect = [x + 14, y - 10, x + textW + 24, y + 10];
    const label = active || (box[2] < v.width - 8 && occupied.every(r => !overlaps(box, r)));
    if (label) {occupied.push(box); ctx.fillStyle = '#17323ded'; ctx.fillRect(box[0], box[1], box[2] - box[0], 20); ctx.fillStyle = '#edf5e8'; ctx.textAlign = 'left'; ctx.fillText(p.name, x + 19, y);}
    if (p.id.startsWith('sector:') && locked(SECTORS.findIndex(s => `sector:${s.id}` === p.id))) {
      ctx.font = '9px system-ui,sans-serif'; ctx.fillText('🔒', x + 6, y + 9);
    }
    markers.push({id: p.id, x, y, label});
  }
  if (waypoint) {
    const x = X(waypoint.x), y = Z(waypoint.z); ctx.strokeStyle = '#e5b95c'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(px, pz); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '23px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('📍', x, y - 8);
  }
  const x = Math.max(14, Math.min(v.width - 14, px)), y = Math.max(14, Math.min(v.height - 14, pz));
  ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fillStyle = '#51d7d0'; ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.rotate(-player.heading);
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(-5, -5); ctx.lineTo(0, -2); ctx.lineTo(5, -5); ctx.closePath(); ctx.fillStyle = '#173f52'; ctx.fill(); ctx.restore();
  ctx.font = '600 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText('내 위치', x, y > v.height - 40 ? y - 24 : y + 25);
  // Compact north arrow and metric scale remain screen sized while the world pans underneath.
  ctx.fillStyle = '#17323ddd'; ctx.fillRect(v.width / 2 - 14, 12, 28, 42); ctx.fillStyle = '#edf5e8'; ctx.fillText('N', v.width / 2, 22); ctx.fillText('↑', v.width / 2, 40);
  const raw = 90 / v.scale, power = Math.pow(10, Math.floor(Math.log10(raw))), ratio = raw / power,
    units = power * (ratio >= 5 ? 5 : ratio >= 2 ? 2 : 1), length = units * v.scale;
  ctx.strokeStyle = '#edf5e8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(18, v.height - 25); ctx.lineTo(18 + length, v.height - 25); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillText(`${units} m`, 18, v.height - 38);
  return markers;
}
