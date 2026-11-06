// 부동산: 건물을 사서 분당 수익을 받는다(휴대폰 estate.web). 산 건물은 어디서든 택시가 무료다.
import {S, save} from '../core/state.js';
import {fmt} from '../core/util.js';
import {LISTINGS, type Listing} from '../data/places.js';
import {toast} from './hud.js';
import {sfx} from '../audio/index.js';
import type {GameSystem} from '../core/types.js';

const KNOWN = new Set(LISTINGS.map(l => l.id));
/** 세이브에 남은 모르는 건물 ID(옛 도심 등)를 지운다. 크래시 없이 무시하는 것이 목적 (13-1) */
export function pruneUnknownProps(): number {
  if (!S.props || typeof S.props !== 'object') S.props = {};
  let n = 0;
  for (const k of Object.keys(S.props)) if (!KNOWN.has(k)) delete S.props[k], n++;
  return n;
}
export const ownedListings = () => LISTINGS.filter(l => S.props?.[l.id]);
export const incomePerMin = () => ownedListings().reduce((a, l) => a + l.income, 0);
export function buyProp(l: Listing | undefined): boolean {
  if (!l || !KNOWN.has(l.id) || S.props?.[l.id]) return false;
  if (S.cr < l.price) return toast('코인이 부족합니다'), sfx('deny'), false;
  S.cr -= l.price;
  S.props[l.id] = 1;
  toast(`계약 완료. 이제 분당 ✦ +${fmt(l.income)}를 받습니다`);
  sfx('buy');
  save();
  return true;
}
export function sellProp(l: Listing | undefined): boolean {
  if (!l || !S.props?.[l.id]) return false;
  delete S.props[l.id];
  S.cr += Math.round(l.price * 0.7);
  toast(`매각 완료. ✦ +${fmt(Math.round(l.price * 0.7))}`);
  sfx('buy');
  save();
  return true;
}
let acc = 0;
export const estateSystem: GameSystem = {
  id: 'estate',
  onLoad() {
    pruneUnknownProps();
  },
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
