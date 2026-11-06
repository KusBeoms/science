// "그림 문/창" 판의 접기 (W8 INTERIOR): 청크 병합 메시 안에서 한 건물의 판 정점 구간만 한 점으로 접어(넓이 0) 숨기고, 원래 값으로 되돌린다.
// 병합 메시는 건물 단위로 지우거나 가릴 수 없으므로, 병합 시 정점 오프셋을 기록해 두고 위치 속성만 고친다(재병합·재업로드는 이 메시 하나의 위치 버퍼뿐).
import type {Geo} from '../lowpoly/prim.js';
import type {Placed} from '../lowpoly/merge.js';

/** 병합 결과에서 이 지오메트리가 차지하는 정점 수(mergePlaced 는 비인덱스로 풀어 붙인다) */
export const vertexCount = (g: Geo): number => (g.index ? g.index.count : g.attributes.position.count);
/** Placed 목록의 항목별 시작 정점 오프셋 */
export function offsetsOf(list: readonly Placed[]): number[] {
  const out: number[] = [];
  let o = 0;
  for (const it of list) { out.push(o); o += vertexCount(it.g); }
  return out;
}
export interface PlugPart {
  mesh: any;
  start: number;
  count: number;
  saved: Float32Array;
}
export interface PlugRef {
  solid: PlugPart | null;
  lit: PlugPart | null;
  hidden: boolean;
}
export function makePart(mesh: any, start: number, count: number): PlugPart {
  const pos = mesh.geometry.attributes.position.array as Float32Array;
  return {mesh, start, count, saved: pos.slice(start * 3, (start + count) * 3)};
}
function apply(part: PlugPart | null, hide: boolean): void {
  if (!part || part.count === 0) return;
  const attr = part.mesh.geometry.attributes.position, a = attr.array as Float32Array, o = part.start * 3;
  if (hide) {
    const x = part.saved[0], y = part.saved[1], z = part.saved[2];
    for (let i = 0; i < part.count; i++) { a[o + i * 3] = x; a[o + i * 3 + 1] = y; a[o + i * 3 + 2] = z; }
  } else a.set(part.saved, o);
  attr.needsUpdate = true;
}
/** true 면 판을 접어 숨김(실내가 보이게), false 면 되돌림 */
export function setPlugHidden(ref: PlugRef, hide: boolean): void {
  if (ref.hidden === hide) return;
  ref.hidden = hide;
  apply(ref.solid, hide);
  apply(ref.lit, hide);
}
