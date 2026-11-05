// 부동산: 건물을 사서 분당 수익을 받는다(휴대폰 estate.web). 산 건물은 어디서든 택시가 무료다.
import {S, save} from '../core/state.js';
import {fmt} from '../core/util.js';
import {LISTINGS, type Listing} from '../data/places.js';
import {toast} from './hud.js';
import {sfx} from '../audio/index.js';
import type {GameSystem} from '../core/types.js';

export const ownedListings = () => LISTINGS.filter(l => S.props[l.id]);
export const incomePerMin = () => ownedListings().reduce((a, l) => a + l.income, 0);
export function buyProp(l: Listing): boolean {
  if (S.props[l.id]) return false;
  if (S.cr < l.price) return toast('✦ 잔액이 부족합니다'), sfx('deny'), false;
  S.cr -= l.price;
  S.props[l.id] = 1;
  toast(`🏢 계약 완료 — 분당 ✦ +${fmt(l.income)}`);
  sfx('buy');
  save();
  return true;
}
export function sellProp(l: Listing): boolean {
  if (!S.props[l.id]) return false;
  delete S.props[l.id];
  S.cr += Math.round(l.price * 0.7);
  toast(`💰 매각 ✦ +${fmt(Math.round(l.price * 0.7))}`);
  sfx('buy');
  save();
  return true;
}
let acc = 0;
export const estateSystem: GameSystem = {
  id: 'estate',
  update(dt) {
    const per = incomePerMin();
    if (!per) return;
    acc += (per / 60) * dt;
    if (acc >= 1) {
      S.cr += Math.floor(acc);
      acc -= Math.floor(acc);
    }
  },
};
