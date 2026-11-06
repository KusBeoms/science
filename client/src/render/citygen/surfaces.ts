// 리본 표면(RibbonChunk.surface)별 팔레트 색·표면 무늬 태그·재질. 색은 palette.ts 토큰에서만 가져온다.
// 무늬(surfaceDetail)는 기존 지면(tagGround)과 같은 SURFACE 번호를 쓰므로 새 도로가 옛 도로·보도와 같은 질감으로 읽힌다.
import {CITY, NEUTRAL, PAL, mix, rgb} from '../lowpoly/palette.js';
import {SURFACE} from '../surface-tags.js';
import type {RibbonChunk} from '../../data/city-compiled.js';

export type Surface = RibbonChunk['surface'];
export const SURFACES: readonly Surface[] = ['asphalt', 'sidewalk', 'curb', 'marking', 'crosswalk', 'median', 'shoulder', 'deck'];

interface SurfaceStyle {
  color: number;
  /** [SURFACE 번호, 반복 주기(m), 세기]. null 이면 무늬 없음(차선·횡단보도 도료) */
  tag: readonly [number, number, number] | null;
  /** true 면 겹친 면 위에 얹는 도료 → polygonOffset 재질. 렌더 순서에서 아래 면보다 앞에 보이게 한다 */
  decal: boolean;
  /** true 면 윗면 전용: 아래를 보는 삼각형은 감김이 뒤집힌 것으로 보고 되돌린다(통계 flippedTris 에 남김) */
  topOnly: boolean;
}
export const STYLE: Record<Surface, SurfaceStyle> = {
  asphalt: {color: CITY.asphalt, tag: [SURFACE.asphalt, 3, 0.65], decal: false, topOnly: true},
  sidewalk: {color: mix(CITY.paving, NEUTRAL.bone, 0.35), tag: [SURFACE.paving, 4, 0.6], decal: false, topOnly: true},
  curb: {color: mix(NEUTRAL.stone, NEUTRAL.ash, 0.5), tag: [SURFACE.paving, 3, 0.5], decal: false, topOnly: false},
  marking: {color: mix(NEUTRAL.cloud, PAL.yellow, 0.18), tag: null, decal: true, topOnly: true},
  crosswalk: {color: mix(NEUTRAL.cloud, CITY.asphalt, 0.08), tag: null, decal: true, topOnly: true},
  median: {color: mix(PAL.green, NEUTRAL.stone, 0.3), tag: [SURFACE.lawn, 3, 0.55], decal: false, topOnly: true},
  shoulder: {color: mix(CITY.asphalt, NEUTRAL.stone, 0.22), tag: [SURFACE.asphalt, 3, 0.5], decal: false, topOnly: true},
  deck: {color: mix(NEUTRAL.stone, NEUTRAL.ash, 0.5), tag: [SURFACE.paving, 4, 0.5], decal: false, topOnly: false},
};
export const isSurface = (s: unknown): s is Surface => typeof s === 'string' && s in STYLE;
export const surfaceRgb = (s: Surface): [number, number, number] => rgb(STYLE[s].color);

let decal: any = null;
/** 도료(차선·횡단보도)용 공유 재질: 아래 면과 같은 높이로 겹쳐도 z-fighting 이 없도록 폴리곤 오프셋. keep=true 라 dispose 때 해제하지 않는다 */
export function decalMat(): any {
  if (!decal) {
    decal = new THREE.MeshLambertMaterial({vertexColors: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3});
    decal.userData.keep = true;
  }
  return decal;
}
