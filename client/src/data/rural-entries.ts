// Only accepted, rendered houses enter this registry; speculative placement candidates never do.
export interface RuralPoint {x: number; y: number; z: number;}
export interface RuralEntry {
  id: string;
  group: 'rural-house' | 'mountain-lodge' | 'fringe';
  model: string;
  x: number; y: number; z: number;
  w: number; d: number; ry: number;
  door: RuralPoint;
  landing: RuralPoint;
}
export const RURAL_ENTRIES: RuralEntry[] = [];
export function rememberRuralEntry(site: RuralEntry) {
  const old = RURAL_ENTRIES.find(s => s.id === site.id);
  if (old) { Object.assign(old, site); return old; }
  RURAL_ENTRIES.push(site);
  return site;
}
/** Leave door/ramp space free of trees and future landscape decoration. */
export function ruralEntryKeepOut(x: number, z: number, margin = 0): boolean {
  return RURAL_ENTRIES.some(s => {
    const a = s.door, b = s.landing, dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < 1.5 + margin;
  });
}
