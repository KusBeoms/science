// The map reads gameplay geometry and accepted facilities; it never starts another 3D scene.
import {G} from '../core/runtime.js';
import {SHOP_AT, SPAWN, padPos} from '../core/geometry.js';
import {CITY_POLY, WILD_POLY} from '../data/outline.js';
import {SECTORS} from '../data/sectors.js';
import {PLACES} from '../data/places.js';
import {CITY_LANDMARKS} from '../data/city.js';
import {ENTERABLES, PURPOSE_INFO} from '../data/interiors.js';
import {FUN_SPOTS, FUN_NAME} from '../data/fun-spots.js';
import {OBS} from '../data/mountain-road.js';
import {SUMMIT} from '../data/wild.js';
export interface MapPlace {id: string; name: string; icon: string; x: number; z: number}
export interface MapPosition {x: number; z: number; heading: number; inside: boolean; driving: boolean}
const xs = [CITY_POLY.x0, CITY_POLY.x1, WILD_POLY.x0, WILD_POLY.x1],
  zs = [CITY_POLY.z0, CITY_POLY.z1, WILD_POLY.z0, WILD_POLY.z1];
for (const s of SECTORS) {xs.push(s.center.x - s.size / 2, s.center.x + s.size / 2); zs.push(s.center.z - s.size / 2, s.center.z + s.size / 2);}
export const MAP_BOUNDS = Object.freeze({x0: Math.min(...xs) - 65, x1: Math.max(...xs) + 65,
  z0: Math.min(...zs) - 65, z1: Math.max(...zs) + 65});
const LANDMARKS: Record<string, [string, string]> = {
  clock: ['시계탑', '🕰️'], orrery: ['중앙 분수', '⛲'], arch: ['시장 입구', '🏛️'], tower: ['관제탑', '🗼'],
  hangar: ['격납고', '🚀'], dome: ['천문대', '🔭'], castle: ['언덕 성', '🏰'], stadium: ['축구 경기장', '⚽'],
  ferris: ['대관람차', '🎡'], lighthouse: ['등대', '🔦'], tvtower: ['전망 타워', '📡'], aquarium: ['수족관', '🐠'],
};
let places: MapPlace[] = [], revision = -1;
const priority = new Map<string, number>();
export function mapPlacePriority(id: string) {return priority.get(id) ?? 30;}
export function mapPlaces(): readonly MapPlace[] {
  if (revision === ENTERABLES.length) return places;
  revision = ENTERABLES.length; places = []; priority.clear();
  const add = (place: MapPlace, rank: number, avoidDuplicate = false) => {
    if (!Number.isFinite(place.x) || !Number.isFinite(place.z) || places.some(p => p.id === place.id)) return;
    if (avoidDuplicate && places.some(p => Math.hypot(p.x - place.x, p.z - place.z) < 1.5)) return;
    places.push({...place}); priority.set(place.id, rank);
  };
  PLACES.forEach(p => add(p, 90));
  add({id: 'base-shop', name: '기지 상점', icon: '🛒', ...SHOP_AT}, 95);
  add({id: 'mountain-observatory', name: '산악 천문대', icon: '🔭', x: OBS.x, z: OBS.z}, 95);
  add({id: 'rural-summit', name: '산 정상 전망대', icon: '⛰️', ...SUMMIT}, 80);
  CITY_LANDMARKS.forEach(l => {
    const [name, icon] = LANDMARKS[l.kind];
    add({id: `landmark:${l.id}`, name, icon, x: l.x, z: l.z}, 85, true);
  });
  SECTORS.forEach((s, i) => add({id: `sector:${s.id}`, name: s.name, icon: s.icon, ...padPos(i)}, 100));
  ENTERABLES.forEach(e => {
    const info = PURPOSE_INFO[e.purpose], home = e.purpose === 'house',
      name = home ? e.rural?.group === 'fringe' ? '교외 주택' : e.rural ? '시골 주택' : '도시 주택' : info.name;
    add({id: `building:${e.id}`, name, icon: info.icon, x: e.door.x, z: e.door.z}, home ? 15 : e.purpose === 'office' ? 30 : 60, true);
  });
  FUN_SPOTS.forEach(p => add({id: `activity:${p.id}`, name: FUN_NAME[p.id] || '즐길 거리', icon: p.icon, x: p.x, z: p.z}, 40, true));
  return places;
}
/** Indoor rooms live at virtual coordinates: display the actual entrance, never the room's 1500,1500. */
export function currentMapPosition(): MapPosition {
  const inside = !!G.inside, drive = inside ? null : G.drive,
    p = inside ? G.inside!.ret : drive || G.me?.pos || SPAWN,
    heading = drive?.h ?? G.me?.rotation.y ?? 0;
  return {x: Number.isFinite(p.x) ? p.x : SPAWN.x, z: Number.isFinite(p.z) ? p.z : SPAWN.z,
    heading: Number.isFinite(heading) ? heading : 0, inside, driving: !!drive};
}
