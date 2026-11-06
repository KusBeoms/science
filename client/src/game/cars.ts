// 차량 거래·튜닝·등록·차고 규칙 (UI 없음 — game/car-shop.ts 가 부른다)와 차 타기/훔치기 상호작용.
import {S, save} from '../core/state.js';
import {G} from '../core/runtime.js';
import {dist2} from '../core/util.js';
import {CARS, GARAGE_LV, GARAGE_NEAR, GARAGE_OUT, OWN_COST, PAINTS, REG_COST, SELL_BACK, TUNE, carOf, tuneCost, type TuneKey} from '../data/cars.js';
import {VEH, enterVeh, exitVeh, refreshOwned, removeVeh, spawnOwned, vacateSpot, vehOfOwn, type Veh} from '../systems/vehicle.js';
import {sfx} from '../audio/index.js';
import {canStart, repairCost, repairOwned, repairSaved} from '../systems/vehicle-damage.js';
import {crowdApi} from '../systems/crowd.js';
import {addStars} from '../systems/police.js';
import {toast} from './hud.js';
import {vehicleTransitionActive} from '../systems/vehicle-transition.js';
import {pushMsg} from './messenger.js';
import type {Interactable, OwnedCar, Target} from '../core/types.js';

export const cap = () => GARAGE_LV[S.cars.garage].slots;
export const hasRoom = () => S.cars.list.length < cap();
const PLATE_A = ['서울', '경기', '부산', '인천', '대구'],
  PLATE_B = ['가', '나', '다', '라', '마', '바', '사'];
const mkPlate = () =>
  `${PLATE_A[Math.floor(Math.random() * 5)]} ${10 + Math.floor(Math.random() * 89)}${PLATE_B[Math.floor(Math.random() * 7)]} ${1000 + Math.floor(Math.random() * 8999)}`;
function pay(cost: number): boolean {
  if (S.cr < cost) {
    toast('코인이 부족합니다');
    sfx('deny');
    return false;
  }
  S.cr -= cost;
  sfx('buy');
  return true;
}
/** 차고 앞 빈 자리 (이미 차가 있으면 옆으로 5u 씩 밀어 낸다) */
function outSpot() {
  for (let k = 0; k < 8; k++) {
    const x = GARAGE_OUT.x - k * 5.5;
    if (!VEH.some(v => Math.hypot(v.x - x, v.z - GARAGE_OUT.z) < 5)) return {x, z: GARAGE_OUT.z, h: GARAGE_OUT.h};
  }
  return {...GARAGE_OUT};
}

/** price/color 를 주면 특가·중고가·고른 색으로 산다 (W5 상점 거리) */
export function buyCar(id: string, price?: number, color?: number): boolean {
  const t = carOf(id);
  if (!hasRoom()) return toast('보관 공간이 부족합니다. 차고를 확장하거나 차를 정리하세요'), false;
  if (!pay(price ?? t.price)) return false;
  const at = outSpot();
  S.cars.list.push({t: t.id, c: color ?? t.color, plate: '', stolen: 0, eng: 0, tire: 0, neon: 0, stored: 0, ...at});
  spawnOwned(S.cars.list.length - 1, at);
  setTimeout(() => pushMsg('mech', '새 차 구매를 축하합니다. 튜닝은 튜닝샵에서 하세요'), 4000);
  toast(`${t.name} 구매 완료. 차고 앞에 있습니다. 번호판을 등록하세요`);
  save();
  return true;
}
export function buyGarage(): boolean {
  const nx = GARAGE_LV[S.cars.garage + 1];
  if (!nx || !pay(nx.price)) return false;
  S.cars.garage++;
  toast(`${nx.name} 개장. 최대 ${nx.slots}대까지 보관합니다`);
  save();
  return true;
}
export function registerCar(i: number): boolean {
  const o = S.cars.list[i];
  if (!o || o.plate || o.stolen) return false;
  if (!pay(REG_COST(carOf(o.t).price))) return false;
  o.plate = mkPlate();
  toast('등록 완료. 번호판 ' + o.plate);
  save();
  return true;
}
/** 시승 차량을 내 차로 개조: 도색 + 번호판 재발급 대기(다시 등록해야 한다) */
export function makeMine(i: number): boolean {
  const o = S.cars.list[i];
  if (!o || !o.stolen || !pay(OWN_COST(carOf(o.t).price))) return false;
  o.stolen = 0;
  o.plate = '';
  o.c = PAINTS.filter(p => p !== o.c)[Math.floor(Math.random() * (PAINTS.length - 1))];
  refreshOwned(i);
  toast('개조 완료. 이제 내 차입니다. 등록소에서 번호판을 받으세요');
  save();
  return true;
}
export function tuneCar(i: number, key: TuneKey): boolean {
  const o = S.cars.list[i],
    def = TUNE.find(t => t.key === key)!;
  if (!o || o.stolen || o[key] >= def.max) return false;
  if (!pay(tuneCost(carOf(o.t).price, key, o[key]))) return false;
  o[key]++;
  refreshOwned(i);
  save();
  return true;
}
export function paintCar(i: number, color: number): boolean {
  const o = S.cars.list[i];
  if (!o || o.stolen || o.c === color || !pay(150)) return false;
  o.c = color;
  refreshOwned(i);
  save();
  return true;
}
/** 수리 (튜닝샵): 어디 있든 그 차를 정비소로 견인해 고친 것으로 친다 */
export function repairCar(i: number): boolean {
  const c = repairCost(i);
  if (!S.cars.list[i] || c <= 0 || !pay(c)) return false;
  repairOwned(i);
  toast('수리를 마쳤습니다');
  save();
  return true;
}
export function storeCar(i: number): boolean {
  const o = S.cars.list[i],
    v = vehOfOwn(i);
  if (!o || !v || G.drive === v) return false;
  if (S.cars.garage < 1) return toast('차고를 먼저 개장하세요'), false;
  if (o.stolen || !o.plate) return toast('등록을 마친 내 차만 보관할 수 있습니다'), false;
  if (Math.hypot(v.x - GARAGE_OUT.x, v.z - GARAGE_OUT.z) > GARAGE_NEAR) return toast('차를 차고 가까이로 옮기세요'), false;
  o.stored = 1;
  repairSaved(o); // 입고 시 무료 정비
  removeVeh(v);
  save();
  return true;
}
export function takeOut(i: number): boolean {
  const o = S.cars.list[i];
  if (!o || !o.stored) return false;
  spawnOwned(i, outSpot());
  save();
  return true;
}
export function sellCar(i: number): boolean {
  const o = S.cars.list[i];
  if (!o) return false;
  const v = vehOfOwn(i);
  if (v && G.drive === v) return toast('차에서 내린 뒤 이용하세요'), false;
  if (v) removeVeh(v);
  S.cr += Math.round(carOf(o.t).price * SELL_BACK * (o.stolen ? 0.5 : 1) * (1 + 0.2 * (o.eng + o.tire)));
  S.cars.list.splice(i, 1);
  // 삭제로 밀린 인덱스를 월드 차에 반영
  VEH.forEach(w => w.own > i && w.own--);
  sfx('buy');
  save();
  return true;
}

// ---------- 상호작용 ----------
interface CarT extends Target {
  kind: 'car';
  v: Veh;
}
export function takeCar(v: Veh, animate = false) {
  if (vehicleTransitionActive() || !canStart(v)) return;
  if (animate && !enterVeh(v, true)) return;
  if (v.own >= 0) {
    if (!animate && v.v === 0) enterVeh(v);
    return;
  }
  // 길가 차량 시승: 튜닝샵에서 개조하면 내 차가 된다 (내부 플래그 stolen=1 = 개조 대기)
  vacateSpot(v);
  const witness = crowdApi.nearest(v.x, v.z, 26);
  if (witness >= 0) {
    crowdApi.react(witness, '😱', 3);
    addStars(1, '시민에게 들켰습니다.');
  }
  if (hasRoom()) {
    const o: OwnedCar = {t: v.t, c: v.c, plate: '', stolen: 1, eng: 0, tire: 0, neon: 0, stored: 0, x: v.x, z: v.z, h: v.h};
    S.cars.list.push(o);
    v.own = S.cars.list.length - 1;
    toast('시승 중입니다. 튜닝샵에서 내 차로 개조할 수 있습니다');
  } else {
    v.own = -2;
    toast('보관 공간이 없어 시승만 가능합니다. 내리면 반납됩니다');
  }
  save();
  if (!animate) enterVeh(v);
}
export const carIt: Interactable<CarT> = {
  kind: 'car',
  tier: 0,
  find(me) {
    if (G.inside || G.drive || vehicleTransitionActive()) return null;
    let best: Veh | null = null,
      bd = 1e9;
    for (const v of VEH) {
      if (v.own <= -3) continue; // 경찰차
      const t = carOf(v.t),
        d = dist2(me.pos, v) - t.len / 2 + 1;
      if (d < 3.4 && d < bd) [best, bd] = [v, d];
    }
    return best ? {kind: 'car', d: Math.max(0.1, bd), v: best} : null;
  },
  info: t => `<b>${carOf(t.v.t).icon} ${carOf(t.v.t).name}</b>` + (t.v.own >= 0 ? (S.cars.list[t.v.own]?.stolen ? '<br>개조할 수 있는 차량' : '<br>내 차량') : '<br>튜닝샵에서 내 차로 개조할 수 있습니다'),
  prompt: t => (t.v.own >= 0 ? 'E 탑승' : 'E 시승하기'),
  act(t, key) {
    if (key === 'e') takeCar(t.v, true);
  },
};
export const carExitIt: Interactable<Target & {kind: 'carexit'}> = {
  kind: 'carexit',
  tier: 0,
  find: () => (G.drive && !vehicleTransitionActive() ? {kind: 'carexit', d: 0} : null),
  info: () => (G.drive ? `<b>${carOf(G.drive.t).icon} ${carOf(G.drive.t).name}</b><br>W/S 가속 · A/D 조향 · Space 제동` : ''),
  prompt: () => 'E 하차',
  act(_t, key) {
    if (key === 'e') exitVeh(false, true);
  },
};
void CARS;
