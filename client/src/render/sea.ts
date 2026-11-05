// 바다: 대륙 전체 아래에 깔리는 큰 물 판 하나 (해수면 SEA_Y). 남쪽 해변(core/heightmap.ts beltH)이 이 아래로 가라앉고, 구역 사이 허공도 물로 보인다.
// 재질·파도·거품은 호수와 같은 물 셰이더(render/water.ts · water-shader.ts).
export {buildSeaMesh as buildSea} from './water.js';
