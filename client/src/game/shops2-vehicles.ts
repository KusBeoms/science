// 탈것 가게 화면: 자동차 대리점(전 차종 + 색 고르기 + 오늘의 특가), 중고차·오토바이(날짜별 입고 6대, −35%·하루 한정), 자전거 샵(킥보드·자전거·전기·외발).
// 자동차 구매는 기존 규칙 그대로 game/cars.ts buyCar(차고 S.cars.list 로 인도). 탈것은 game/rides.ts.
import {S} from '../core/state.js';
import {fmt} from '../core/util.js';
import {CARS, PAINTS} from '../data/cars.js';
import {RIDES, dayKey, dealDay, hashStr, priceTag, type Ride, type ShopPurpose} from '../data/shops2.js';
import {buyCar, hasRoom} from './cars.js';
import {closeModal} from './modal.js';
import {mountRide, ownsRide} from './rides.js';
import {toast} from './hud.js';
import {addSold, stockLeft} from './shops2.js';
import {big, card, commit, crHead, openPanel, pay} from './shops2-ui.js';

const bar = (v: number, max: number) => `<div class="bar"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></div>`;
const hexS = (c: number) => '#' + c.toString(16).padStart(6, '0');
let selCar = '',
  selColor = 0;

/** 중고차 입고 목록: 날짜로 정해진 6대 (너무 비싼 차는 빼고), 차마다 색이 다르다 */
export function usedLot() {
  const pool = CARS.filter(c => c.price <= 60000),
    out: {id: string; color: number; price: number}[] = [];
  for (let k = 0; out.length < 6; k++) {
    const c = pool[hashStr('used' + dayKey() + ':' + k) % pool.length];
    if (out.some(o => o.id === c.id)) continue;
    out.push({id: c.id, color: PAINTS[hashStr('c' + dayKey() + c.id) % PAINTS.length], price: Math.round((c.price * 0.65) / 50) * 50});
  }
  return out;
}

function carShop(p: 'autoshop' | 'usedcar') {
  const pan = openPanel(),
    lot = p === 'usedcar' ? usedLot() : null,
    list = lot ? lot.map(o => CARS.find(c => c.id === o.id)!) : CARS,
    deal = dealDay(p, list.length);
  const draw = () => {
    pan.title.innerHTML = crHead(p === 'usedcar' ? '🏍️' : '🚘') + ` · 🅿️ ${S.cars.list.length}`;
    pan.grid.innerHTML = '';
    pan.tabs.innerHTML = '';
    pan.hint.textContent = !hasRoom() ? '보관 공간이 부족합니다. 차고를 확장하세요' : p === 'usedcar' ? '하루 한정 판매입니다. 매일 새 차가 들어옵니다' : '오늘의 특가를 확인하세요. 차를 누르면 색을 고를 수 있습니다';
    list.forEach((c, i) => {
      const used = lot?.[i],
        base = used ? used.price : c.price,
        pt = priceTag(p, list.length, i, base),
        left = used ? stockLeft('used-' + c.id, 1) : 99,
        dead = left <= 0,
        color = used ? used.color : selCar === c.id && selColor ? selColor : c.color;
      pan.grid.appendChild(
        card(
          `${pt.tag ? `<i class="tag">${pt.tag}</i>` : ''}${big(c.icon)}<b>${c.name}</b><i class="sw" style="width:14px;height:14px;background:${hexS(color)}"></i><span>최고 속도</span>${bar(c.vmax, 90)}<em>${dead ? '매진' : (pt.tag ? `<s>${fmt(base)}</s> ` : '') + '✦ ' + fmt(pt.price)}</em>`,
          () => {
            if (dead || (used && stockLeft('used-' + c.id, 1) <= 0)) return;
            if (!used && selCar !== c.id) {
              selCar = c.id;
              selColor = 0;
              return draw();
            }
            if (buyCar(c.id, pt.price, color)) {
              if (used) addSold('used-' + c.id);
              commit();
            }
            draw();
          },
          dead || S.cr < pt.price ? 'locked' : !used && selCar === c.id ? 'eq' : ''
        )
      );
    });
    if (!lot && selCar) {
      const row = document.createElement('div');
      row.className = 'it';
      row.style.cssText = 'grid-column:1/-1';
      row.innerHTML = '<div style="font-size:22px">🎨</div><div class="pt"></div>';
      PAINTS.forEach(c => {
        const d = document.createElement('b');
        d.style.background = hexS(c);
        if (c === selColor) d.className = 'on';
        d.onclick = () => ((selColor = c), draw());
        row.querySelector('.pt')!.appendChild(d);
      });
      pan.grid.appendChild(row);
    }
    if (lot) {
      // 오토바이는 중고차점에서
      RIDES.filter(r => r.shop === 'usedcar').forEach(r => pan.grid.appendChild(rideCard(r, 'usedcar', draw)));
    }
  };
  draw();
}

function rideCard(r: Ride, shop: ShopPurpose, redraw: () => void) {
  const list = RIDES.filter(x => x.shop === shop),
    i = list.indexOf(r),
    pt = priceTag(shop, list.length, i, r.price),
    have = ownsRide(r.id),
    left = stockLeft('ride-' + r.id, r.id === 'ebike' || r.id === 'moto' ? 2 : 99),
    dead = !have && left <= 0;
  return card(
    `${pt.tag && !have ? `<i class="tag">${pt.tag}</i>` : ''}${big(r.icon)}<b>${r.name}</b><span>속도 ×${r.mul}</span>${bar(r.mul, 3.2)}<em>${have ? '타기 (V)' : dead ? '매진' : (pt.tag ? `<s>${fmt(r.price)}</s> ` : '') + '✦ ' + fmt(pt.price)}</em>`,
    () => {
      if (have) {
        closeModal();
        mountRide(r.id);
        return;
      }
      if (dead || stockLeft('ride-' + r.id, r.id === 'ebike' || r.id === 'moto' ? 2 : 99) <= 0 || !pay(pt.price)) return;
      addSold('ride-' + r.id);
      S.vehicles['r:' + r.id] = 1;
      S.vehicles.sel = RIDES.indexOf(r) + 1;
      toast(`${r.name} 구매 완료. V 키로 타고 내립니다`);
      commit();
      redraw();
    },
    have ? 'own' : dead || S.cr < pt.price ? 'locked' : ''
  );
}

function bikeShop() {
  const pan = openPanel();
  const draw = () => {
    pan.title.innerHTML = crHead('🚲');
    pan.grid.innerHTML = '';
    pan.hint.textContent = '산 탈것은 V 키로 타고 내립니다. 타면 걷기보다 빠릅니다';
    RIDES.filter(r => r.shop === 'bikeshop').forEach(r => pan.grid.appendChild(rideCard(r, 'bikeshop', draw)));
  };
  draw();
}

export function openVehicleShop(p: ShopPurpose) {
  if (p === 'bikeshop') bikeShop();
  else carShop(p as 'autoshop' | 'usedcar');
}
