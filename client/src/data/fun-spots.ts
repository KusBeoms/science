// W5 FUN: 구역별 '즐길 거리' 자리 목록 (순수 데이터). game/fun.ts 가 종류(type)별로 동작을 붙인다. 글 대신 이모지.
// 돈 규칙: 화폐는 S.cr(✦). 한 판 평균 수입은 낚시(≈10초에 10~20)와 비슷하게 맞췄다.
import {bikePose, BIKE_LAP, carouselPose, bumperPose, coasterAt, swingPose, slidePose, yachtPose, YACHT, FERRIS, type Pose} from './city-w5.js';

export type RideId = 'bike' | 'carousel' | 'coaster' | 'bumper' | 'ferris' | 'swing' | 'slide' | 'yacht';
/** 탑승 자세: s = 탑승 후 흐른 초, T = 전체 시계 */
export const RIDE_POSE: Record<RideId, (s: number, T: number, wheel: number) => Pose> = {
  bike: s => bikePose(s),
  carousel: (_s, T) => carouselPose(T),
  coaster: s => {
    const p = coasterAt((s / 22) % 1);
    return {...p, y: p.y + 0.9};
  },
  bumper: (_s, T) => bumperPose(0, T),
  ferris: (_s, _T, w) => ({x: FERRIS.x + Math.cos(w) * FERRIS.r, y: FERRIS.y + Math.sin(w) * FERRIS.r - 1.6, z: FERRIS.z, ry: Math.PI / 2}),
  swing: (_s, T) => swingPose(T, 0),
  slide: s => slidePose(Math.min(1, s / 1.6)),
  yacht: s => {
    const p = yachtPose(s);
    return {...p, y: p.y + 0.9};
  },
};
export const RIDE_DUR: Record<RideId, number> = {bike: BIKE_LAP, carousel: 16, coaster: 22, bumper: 24, ferris: 34, swing: 14, slide: 2, yacht: YACHT.lap};

interface Base {
  id: string;
  icon: string;
  x: number;
  z: number;
  /** 닿는 반경 (기본 4.5) */
  r?: number;
  /** 앉기·탑승 방향 */
  ry?: number;
}
export type FunSpot = Base &
  (
    | {type: 'timing'; speed: number; zone: number; tries: number; fee: number; pay: number}
    | {type: 'tap'; taps: number; pay: number; cd: number}
    | {type: 'ride'; ride: RideId; exit: {x: number; z: number}}
    | {type: 'feed'; cd: number; pay: [number, number]}
    | {type: 'gacha'; fee: number; prizes: [string, number, number][]}
    | {type: 'food'; fee: number}
    | {type: 'sit'}
  );

const CLAW: [string, number, number][] = [['🧸', 0, 0.55], ['🎁', 10, 0.28], ['💎', 30, 0.12], ['🌟', 60, 0.05]];
export const FUN_SPOTS: readonly FunSpot[] = [
  // 중앙 공원
  {id: 'p-ducks', icon: '🦆', x: -250.5, z: -268, type: 'feed', cd: 20, pay: [1, 4]},
  {id: 'p-chess', icon: '♟️', x: -238, z: -240, type: 'timing', speed: 0.8, zone: 0.24, tries: 3, fee: 0, pay: 3},
  {id: 'p-wish', icon: '⛲', x: -275, z: -243.5, type: 'gacha', fee: 3, prizes: [['🪙', 0, 0.8], ['💫', 8, 0.15], ['🌠', 25, 0.05]]},
  {id: 'p-bike', icon: '🚲', x: -245.5, z: -268, r: 3.5, type: 'ride', ride: 'bike', exit: {x: -244, z: -262}},
  {id: 'p-picnic', icon: '🧺', x: -304, z: -226, type: 'sit', ry: 0.6},
  {id: 'p-picnic2', icon: '🧺', x: -318, z: -300, type: 'sit', ry: 2.2},
  // 테마파크
  {id: 't-carousel', icon: '🎠', x: -245, z: -52, r: 4, type: 'ride', ride: 'carousel', exit: {x: -245, z: -50}},
  {id: 't-coaster', icon: '🎢', x: -284, z: -72, r: 4, type: 'ride', ride: 'coaster', exit: {x: -283, z: -72}},
  {id: 't-bumper', icon: '🚗', x: -234, z: 13, r: 4, type: 'ride', ride: 'bumper', exit: {x: -234, z: 12}},
  {id: 't-ferris', icon: '🎡', x: -274, z: -9, r: 4.5, type: 'ride', ride: 'ferris', exit: {x: -274, z: -8}},
  {id: 't-hammer', icon: '🔨', x: -318, z: 20, type: 'timing', speed: 1.3, zone: 0.16, tries: 3, fee: 0, pay: 5},
  {id: 't-claw', icon: '🧸', x: -318, z: 38, type: 'gacha', fee: 10, prizes: CLAW},
  {id: 't-candy', icon: '🍭', x: -318, z: 56, type: 'food', fee: 6},
  // 해변
  {id: 'b-volley', icon: '🏐', x: -110, z: 320, type: 'timing', speed: 1.0, zone: 0.2, tries: 3, fee: 0, pay: 4},
  {id: 'b-surf', icon: '🏄', x: -60, z: 326, type: 'timing', speed: 1.6, zone: 0.12, tries: 3, fee: 12, pay: 12},
  {id: 'b-castle', icon: '🏰', x: -180, z: 326.5, type: 'tap', taps: 8, pay: 8, cd: 45},
  {id: 'b-lounge', icon: '🏖️', x: -90, z: 327, r: 3, type: 'sit', ry: 0},
  {id: 'b-lounge2', icon: '🏖️', x: -140, z: 327, r: 3, type: 'sit', ry: 0},
  // 항구
  {id: 'h-crane', icon: '🏗️', x: 168, z: 325, type: 'timing', speed: 1.1, zone: 0.18, tries: 3, fee: 0, pay: 5},
  {id: 'h-yacht', icon: '⛵', x: 98, z: 333, r: 4, type: 'ride', ride: 'yacht', exit: {x: 98, z: 332}},
  // 문화 거리
  {id: 'c-busker', icon: '🎸', x: 232, z: 130, type: 'gacha', fee: 5, prizes: [['🎶', 0, 0.7], ['💝', 12, 0.22], ['🌟', 35, 0.08]]},
  {id: 'c-flea', icon: '🛍️', x: 238, z: 158, type: 'gacha', fee: 15, prizes: [['🧦', 0, 0.45], ['🎩', 12, 0.3], ['🖼️', 30, 0.18], ['🏺', 70, 0.07]]},
  {id: 'c-taco', icon: '🌮', x: 257, z: 132, r: 3.5, type: 'food', fee: 8},
  {id: 'c-skewer', icon: '🍢', x: 257, z: 150, r: 3.5, type: 'food', fee: 8},
  {id: 'c-ice', icon: '🍦', x: 257, z: 168, r: 3.5, type: 'food', fee: 8},
  {id: 'c-mural', icon: '🎨', x: 238, z: 114, r: 5, type: 'tap', taps: 10, pay: 10, cd: 60},
  // 레저
  {id: 'l-hoops', icon: '🏀', x: 229, z: 223, r: 6, type: 'timing', speed: 1.2, zone: 0.17, tries: 3, fee: 0, pay: 5},
  {id: 'l-skate', icon: '🛹', x: 229, z: 250, r: 6, type: 'timing', speed: 1.5, zone: 0.14, tries: 3, fee: 0, pay: 6},
  {id: 'l-dive', icon: '🤿', x: 256, z: 235, r: 3.5, type: 'timing', speed: 1.0, zone: 0.2, tries: 2, fee: 0, pay: 7},
  {id: 'l-climb', icon: '🧗', x: 258, z: 239.5, r: 4.5, type: 'tap', taps: 9, pay: 9, cd: 40},
  {id: 'l-golf', icon: '⛳', x: 256, z: 257, r: 6, type: 'timing', speed: 0.9, zone: 0.15, tries: 3, fee: 0, pay: 5},
  // 주거
  {id: 'r-swing', icon: '🪁', x: -252, z: 287, r: 3.5, type: 'ride', ride: 'swing', exit: {x: -252, z: 284.5}},
  {id: 'r-slide', icon: '🛝', x: -241, z: 289, r: 3, type: 'ride', ride: 'slide', exit: {x: -241, z: 304}},
  {id: 'r-garden', icon: '🌱', x: -243, z: 323, r: 5, type: 'tap', taps: 6, pay: 6, cd: 40},
  {id: 'r-cat', icon: '🐈', x: -224, z: 306, r: 3.5, type: 'feed', cd: 25, pay: [0, 5]},
];
/** 놀거리 이름(안내 문구용). 아이콘은 FUN_SPOTS 의 icon */
export const FUN_NAME: Record<string, string> = {
  'p-ducks': '오리 먹이', 'p-chess': '야외 체스', 'p-wish': '소원 분수', 'p-bike': '자전거', 'p-picnic': '피크닉 자리', 'p-picnic2': '피크닉 자리',
  't-carousel': '회전목마', 't-coaster': '롤러코스터', 't-bumper': '범퍼카', 't-ferris': '대관람차', 't-hammer': '망치 게임', 't-claw': '인형 뽑기', 't-candy': '사탕 가게',
  'b-volley': '비치발리볼', 'b-surf': '서핑', 'b-castle': '모래성', 'b-lounge': '선베드', 'b-lounge2': '선베드',
  'h-crane': '크레인 게임', 'h-yacht': '요트',
  'c-busker': '버스킹', 'c-flea': '벼룩시장 뽑기', 'c-taco': '타코', 'c-skewer': '꼬치', 'c-ice': '아이스크림', 'c-mural': '벽화 그리기',
  'l-hoops': '농구', 'l-skate': '스케이트', 'l-dive': '다이빙', 'l-climb': '암벽 등반', 'l-golf': '골프',
  'r-swing': '그네', 'r-slide': '미끄럼틀', 'r-garden': '텃밭 가꾸기', 'r-cat': '고양이',
};
/** 종류별 한 줄 설명 */
export const FUN_HELP: Record<FunSpot['type'], string> = {
  timing: '막대가 초록 칸에 올 때 E를 누르세요',
  tap: 'E를 연타하세요',
  ride: '타고 즐길 수 있습니다',
  feed: '먹이를 주거나 쓰다듬을 수 있습니다',
  gacha: '코인을 내고 뽑습니다',
  food: '먹으면 스태미나가 가득 찹니다',
  sit: '앉아서 쉴 수 있습니다',
};
export const spotById = (id: string) => FUN_SPOTS.find(s => s.id === id)!;
