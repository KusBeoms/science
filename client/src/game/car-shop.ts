// 차 가게 UI: 구매(딜러) · 튜닝/내 차 만들기 · 차고·등록·판매. 규칙은 game/cars.ts.
import {S} from '../core/state.js';
import {$, fmt} from '../core/util.js';
import {CARS, GARAGE_LV, PAINTS, REG_COST, OWN_COST, TUNE, carOf, tuneCost} from '../data/cars.js';
import {buyCar, buyGarage, hasRoom, makeMine, paintCar, registerCar, sellCar, storeCar, takeOut, tuneCar, registerCar as _r} from './cars.js';
import {openModal} from './modal.js';
import {vehOfOwn} from '../systems/vehicle.js';

type Tab = 'buy' | 'tune' | 'garage';
let tab: Tab = 'buy',
  sel = 0;
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
const bar = (v: number, max: number) => `<div class="bar"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></div>`;
function btn(html: string, fn: () => void, cls = '') {
  const b = document.createElement('button');
  b.className = 'it ' + cls;
  b.innerHTML = html;
  b.onclick = fn;
  return b;
}
export function openCarShop(t: Tab) {
  tab = t;
  sel = Math.min(sel, Math.max(0, S.cars.list.length - 1));
  openModal('carshop');
  $('#csx').onclick = () => import('./modal.js').then(m => m.closeModal());
  render();
}
function render() {
  const box = $('#csgrid'),
    tabs = $('#cstabs');
  $('#cstitle').innerHTML = `🚗 <span style="color:var(--acc)">✦ ${fmt(S.cr)}</span> · 🅿️ ${S.cars.list.length}/${GARAGE_LV[S.cars.garage].slots}`;
  tabs.innerHTML = '';
  box.innerHTML = '';
  ([['buy', '🚗 사기'], ['tune', '🛠️ 튜닝'], ['garage', '🅿️ 차고·등록']] as [Tab, string][]).forEach(([k, l]) =>
    tabs.appendChild(btn(l, () => ((tab = k), render()), k === tab ? 'eq' : ''))
  );
  const hint = $('#cshint');
  if (tab === 'buy') {
    hint.textContent = hasRoom() ? '길가 차량은 시승 후 개조할 수 있습니다 🔑' : '🅿️ 보관 공간 부족 — 차고 확장 또는 차량 정리가 필요합니다';
    CARS.forEach(c =>
      box.appendChild(
        btn(
          `<div style="font-size:26px">${c.icon}</div><b>${c.name}</b>⚡${bar(c.vmax, 90)}🔄${bar(c.turn, 3)}<em>✦ ${fmt(c.price)}</em>`,
          () => (buyCar(c.id), render()),
          S.cr >= c.price ? '' : 'locked'
        )
      )
    );
  } else if (tab === 'tune') {
    hint.textContent = S.cars.list.length ? '시승 차량은 먼저 "내 차로 개조"를 진행해 주세요' : '보유 차량이 없습니다';
    const strip = document.createElement('div');
    strip.style.cssText = 'grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap';
    S.cars.list.forEach((o, i) => strip.appendChild(btn(`${carOf(o.t).icon}${o.stolen ? '🔧' : ''}`, () => ((sel = i), render()), i === sel ? 'eq' : '')));
    box.appendChild(strip);
    const o = S.cars.list[sel];
    if (!o) return;
    const t = carOf(o.t);
    if (o.stolen)
      box.appendChild(btn(`<div style="font-size:26px">🔓→🛠️</div><b>내 차로 개조</b><span>도색 · 번호판 재발급</span><em>✦ ${fmt(OWN_COST(t.price))}</em>`, () => (makeMine(sel), render())));
    else {
      TUNE.forEach(k =>
        box.appendChild(
          btn(
            `<div style="font-size:24px">${k.icon}</div><b>${k.name} ${o[k.key]}/${k.max}</b><span>${k.eff}</span>${bar(o[k.key], k.max)}<em>${o[k.key] >= k.max ? '✔' : '✦ ' + fmt(tuneCost(t.price, k.key, o[k.key]))}</em>`,
            () => (tuneCar(sel, k.key), render())
          )
        )
      );
      const pt = document.createElement('div');
      pt.className = 'it';
      pt.innerHTML = '<div style="font-size:24px">🎨</div><b>도색 ✦ 150</b><div class="pt"></div>';
      PAINTS.forEach(c => {
        const d = document.createElement('b');
        d.style.background = hex(c);
        d.onclick = () => (paintCar(sel, c), render());
        pt.querySelector('.pt')!.appendChild(d);
      });
      box.appendChild(pt);
    }
  } else {
    const nx = GARAGE_LV[S.cars.garage + 1];
    hint.textContent = `🅿️ ${GARAGE_LV[S.cars.garage].name}`;
    if (nx) box.appendChild(btn(`<div style="font-size:26px">🅿️⬆</div><b>${nx.name}</b><span>${nx.slots}대</span><em>✦ ${fmt(nx.price)}</em>`, () => (buyGarage(), render())));
    S.cars.list.forEach((o, i) => {
      const t = carOf(o.t),
        out = !!vehOfOwn(i);
      const d = document.createElement('div');
      d.className = 'it';
      d.innerHTML = `<div style="font-size:26px">${t.icon}</div><b>${o.stolen ? '🔧 개조 대기' : o.plate || '등록 필요'}</b><span>${o.stored ? '🅿️ 보관 중' : '🛣️ 주차 중'}</span>`;
      const row = document.createElement('div');
      row.className = 'pt';
      const add = (l: string, f: () => void) => {
        const b = document.createElement('button');
        b.textContent = l;
        b.onclick = () => (f(), render());
        row.appendChild(b);
      };
      if (!o.stolen && !o.plate) add(`📋 ✦${fmt(REG_COST(t.price))}`, () => registerCar(i));
      if (o.stored) add('🚗 출고', () => takeOut(i));
      else if (out) add('🅿️ 입고', () => storeCar(i));
      add('💰', () => sellCar(i));
      d.appendChild(row);
      box.appendChild(d);
    });
  }
}
void _r;
