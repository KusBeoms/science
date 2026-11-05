// 미션 목록: [이름, 현재값 getter, 목표값, 보상]
import {S, dexN} from '../core/state.js';
import {P} from './planets.js';

export const MS: [string, () => number, number, number][] = [
  ['행성 1개 훔치기', () => S.stolen, 1, 50],
  ['상점에서 아이템 사기', () => S.bought, 1, 100],
  ['1단계 시험 통과', () => S.zone, 1, 200],
  ['행성 3개 훔치기', () => S.stolen, 3, 300],
  ['도감 8종', () => dexN(), 8, 250],
  ['2단계 시험 통과', () => S.zone, 2, 150],
  ['스프링 3종 모으기', () => S.springs.length, 3, 400],
  ['3단계 시험 통과', () => S.zone, 3, 1000],
  ['도감 15종', () => dexN(), 15, 4000],
  ['4단계 시험 통과', () => S.zone, 4, 10000],
  ['도감 완성', () => dexN(), P.length, 50000],
];
