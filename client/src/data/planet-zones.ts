// 행성의 "소속 구역"(0~11 = S1~S12): 가격 = ZONE_MUL[구역] × TIER_MUL[등급] 에 쓴다 (data/pacing.ts 의 priceOf).
// 기존 25종은 PLANET_CATALOG 1장의 구역 배정. 행성을 추가할 때 여기에 이름을 넣는다.
export const HOME_ZONE: Record<string, number> = {
  수성: 0,
  금성: 0,
  지구: 0,
  화성: 0,
  목성: 2,
  토성: 3,
  천왕성: 3,
  해왕성: 3,
  명왕성: 4,
  '프록시마 센타우리': 5,
  '프록시마 b': 5,
  '트라피스트-1e': 5,
  '케플러-16b': 6,
  '케플러-452b': 6,
  'HD 189733b': 7,
  'WASP-76b': 7,
  'WASP-12b': 7,
  '게자리 55e': 7,
  '페가수스자리 51b': 7,
  '밀러의 행성': 10,
  '만의 행성': 10,
  '에드먼즈 행성': 10,
  판도라: 11,
  폴리페무스: 11,
  태양: 11,
};
/** 표에 없는 행성의 임시 구역: 등급이 높을수록 깊은 구역 */
const TIER_ZONE = [0, 2, 4, 6, 8, 10];
export const zoneOfPlanet = (name: string, tier: number) => HOME_ZONE[name] ?? TIER_ZONE[tier];
