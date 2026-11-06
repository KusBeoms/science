// 청크 거리 LOD·가시성 공용 부품. 전역 배열을 쓰지 않고 핸들마다 LodSet 을 가지므로 dispose 뒤에 남는 것이 없다
// (기존 render/city/detail-lod.ts 의 cityDetail 은 모듈 전역 배열이라 해제할 수 없어 사용하지 않는다).

export interface Pos {
  x: number;
  y?: number;
  z: number;
}
/** 근거리 모델 ↔ 원거리 단순 모델 전환. far 가 없으면 near 는 range 안에서만 보인다 */
export interface LodEntry {
  cx: number;
  cz: number;
  near: any;
  far?: any;
  /** 밤에만 켜지는 조명 메시(창문·전구). near 가 보일 때만 켠다 */
  lit?: any;
  /** 근거리 반경(m) */
  range: number;
  /** 이 거리 밖은 far 도 숨긴다(Infinity = 항상) */
  cull: number;
}
export class LodSet {
  readonly entries: LodEntry[] = [];
  add(e: LodEntry): void {
    e.far && (e.far.visible = false);
    e.lit && (e.lit.visible = false);
    this.entries.push(e);
  }
  /** 플레이어 위치로 각 항목의 근/원 메시를 고른다. ortho=true(지도 촬영 등)면 전부 근거리 */
  update(p: Pos, night: boolean, ortho = false): void {
    for (const e of this.entries) {
      const d = Math.hypot(e.cx - p.x, e.cz - p.z),
        near = ortho || d < e.range,
        any = ortho || d < e.cull;
      e.near.visible = near;
      if (e.far) e.far.visible = any && !near;
      if (e.lit) e.lit.visible = night && near;
    }
  }
}

/** 객체와 부모 체인이 모두 visible 인가 */
export const shown = (o: any): boolean => {
  for (let n = o; n; n = n.parent) if (!n.visible) return false;
  return true;
};

/** 공간 청크 키(정수 칸). cell 은 m */
export const cellKey = (x: number, z: number, cell: number): string => Math.floor(x / cell) + ',' + Math.floor(z / cell);

/** 지오메트리·그룹의 경계구를 안전하게 갱신(정점 0개면 null) */
export function sphereOf(geo: any): {center: {x: number; y: number; z: number}; radius: number} | null {
  if (!geo.attributes.position || geo.attributes.position.count === 0) return null;
  geo.computeBoundingSphere();
  return geo.boundingSphere;
}
