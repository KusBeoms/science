// 검증을 통과한 city.source.json 의 단일 보관소. boot.ts 가 한 번만 채우고, 게임 모듈은 getCitySource() 로 읽는다.
// 타입만 import 하므로 도시·월드 모듈을 실행시키지 않는다.
import type {CitySource} from './city-schema.js';

let current: CitySource | null = null;

/** 한 번만 설정 가능(부분 갱신·덮어쓰기 금지). 깊은 동결로 이후 우발적 수정을 막는다 */
export function setCitySource(src: CitySource): void {
  if (current) throw new Error('city source 는 이미 설정되었습니다');
  current = deepFreeze(src);
}
export function hasCitySource(): boolean {
  return current !== null;
}
export function getCitySource(): CitySource {
  if (!current) throw new Error('city source 가 아직 로드되지 않았습니다 (boot.ts 를 거치지 않음)');
  return current;
}
/** 테스트 전용 초기화 */
export function resetCitySourceForTest(): void {
  current = null;
}
function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}
