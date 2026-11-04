// 추가 행성 행 (M5: 80종 확장). 형식은 planets.ts 의 DB 와 같고, 이 배열 순서대로 id 가 이어진다 — 끝에만 추가할 것.
// 섹터 둥지에 나오게 하려면 data/sectors.ts 의 해당 섹터 planets 목록에 이름을 넣는다.
import type {DbRow} from '../core/types.js';

export const DB_MORE: DbRow[] = [];
