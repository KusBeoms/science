// 휴대폰 앱: 지도(캔버스 + 길안내) · 택시(순간이동) · 내 차 호출 · 배달 · 내 자산. 껍데기와 인터넷은 game/phone.ts
import {S, save, income} from '../core/state.js';
import {G} from '../core/runtime.js';
import {$, fmt} from '../core/util.js';
import {groundH} from '../core/terrain.js';
import {CITY_ROADS} from '../data/city.js';
import {CARS, carOf} from '../data/cars.js';
import {LISTINGS, PLACES, type Place} from '../data/places.js';
import {JAIL} from '../data/wild.js';
import {VEH, exitVeh, spawnOwned, vehOfOwn} from '../systems/vehicle.js';
import {giveBuff, leaveBuilding} from './interior.js';
import {incomePerMin, ownedListings} from './estate.js';
import {addHudLine, toast} from './hud.js';
import {closeModal} from './modal.js';
import {sfx} from '../audio/index.js';

export const waypoint: {x: number; z: number; name: string} | null = null;
let wp: {x: number; z: number; name: string} | null = null;
export const setWaypoint = (p: {x: number; z: number; name: string} | null) => (wp = p);
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
addHudLine(() => {
  if (!wp) return null;
  const dx = wp.x - G.me.pos.x,
    dz = wp.z - G.me.pos.z,
    d = Math.hypot(dx, dz);
  if (d < 8) {
    wp = null;
    return null;
  }
  return `📍 ${wp.name} ${ARROWS[Math.round((Math.atan2(dx, -dz) / (Math.PI / 4) + 8) % 8) % 8]} ${Math.round(d)}m`;
});
const dist = (p: {x: number; z: number}) => Math.round(Math.hypot(p.x - G.me.pos.x, p.z - G.me.pos.z));

/** 순간이동: 차·건물·앉기 상태를 정리하고 땅 위에 내려놓는다 */
export function warpTo(x: number, z: number) {
  if (G.jail || G.match) return toast('⛓️⚽ 지금은 이용할 수 없습니다');
  closeModal();
  if (G.drive) exitVeh();
  if (G.inside) leaveBuilding();
  G.sit = null;
  G.me.pos.set(x, Math.max(0, groundH(x, z)), z);
  G.me.vy = 0;
  sfx('open');
}
const row = (html: string) => `<div class="phrow">${html}</div>`;
const btn = (id: string, label: string, cls = '') => `<button class="phb ${cls}" data-act="${id}">${label}</button>`;

// ---------- 지도 ----------
let mapWild = false,
  mapAuto = true;
export const flipMap = () => ((mapAuto = false), (mapWild = !mapWild));
export const resetMap = () => (mapAuto = true);
export function renderMap(body: HTMLElement) {
  if (mapAuto) mapWild = G.me.pos.z > 600;
  body.innerHTML = `<canvas id="phmap" width="300" height="300"></canvas><div class="phrow">${btn('mapmode', mapWild ? '🌆 도시' : '🌄 야생지')} ${wp ? btn('wpoff', '📍✕') : ''}</div><div id="phplaces"></div>`;
  const cv = body.querySelector('#phmap') as HTMLCanvasElement,
    c = cv.getContext('2d')!,
    cx = 0,
    cz = mapWild ? 990 : 0,
    half = mapWild ? 340 : 350,
    sc = 300 / (half * 2),
    X = (x: number) => (x - cx + half) * sc,
    Z = (z: number) => (z - cz + half) * sc;
  c.fillStyle = mapWild ? '#3b6a3a' : '#2a3a2a';
  c.fillRect(0, 0, 300, 300);
  if (!mapWild) {
    c.fillStyle = '#34364a';
    c.fillRect(X(-335), Z(-335), 670 * sc, 670 * sc);
    c.strokeStyle = '#8a8fa3';
    for (const r of CITY_ROADS) {
      c.lineWidth = Math.max(1, r.w * sc);
      c.beginPath();
      c.moveTo(X(r.x0), Z(r.z0));
      c.lineTo(X(r.x1), Z(r.z1));
      c.stroke();
    }
    c.fillStyle = '#e7c98a';
    c.fillRect(X(-335), Z(335), 670 * sc, 12 * sc);
  } else {
    c.fillStyle = '#d9b867';
    c.fillRect(X(175), Z(880), 165 * sc, 400 * sc);
    c.fillStyle = '#3d8fd8';
    c.beginPath(); c.arc(X(130), Z(840), 82 * sc, 0, 7); c.fill();
    c.beginPath(); c.arc(X(-30), Z(1010), 42 * sc, 0, 7); c.fill();
    c.fillStyle = '#7d8590';
    c.beginPath(); c.arc(X(0), Z(1110), 120 * sc, 0, 7); c.fill();
  }
  c.font = '14px sans-serif';
  c.textAlign = 'center';
  for (const p of PLACES) if (mapWild ? p.z > 600 : p.z < 380) c.fillText(p.icon, X(p.x), Z(p.z) + 5);
  for (const l of LISTINGS) if (ownedListings().includes(l) && (mapWild ? l.z > 600 : l.z < 380)) c.fillText('🏢', X(l.x), Z(l.z) + 5);
  if (wp) c.fillText('📍', X(wp.x), Z(wp.z));
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(X(G.me.pos.x), Z(G.me.pos.z), 4, 0, 7); c.fill();
  c.strokeStyle = '#f55'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(X(G.me.pos.x), Z(G.me.pos.z)); c.lineTo(X(G.me.pos.x) - Math.sin(G.me.rotation.y + 3.14159) * 0, Z(G.me.pos.z)); c.stroke();
  cv.onclick = e => {
    const r = cv.getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * 300 / sc - half + cx,
      z = ((e.clientY - r.top) / r.height) * 300 / sc - half + cz;
    wp = {x, z, name: '표시 지점'};
    toast('📍 길안내 시작');
    renderMap(body);
  };
  const list = body.querySelector('#phplaces')!;
  list.innerHTML = [...PLACES].filter(p => (mapWild ? p.z > 600 : p.z < 380)).sort((a, b) => dist(a) - dist(b)).map(p => row(`<span>${p.icon} ${p.name}</span><span>${dist(p)}m</span>${btn('wp:' + p.id, '📍')}`)).join('');
}

// ---------- 택시 ----------
const fare = (p: {x: number; z: number}) => Math.max(10, Math.round(dist(p) * 0.08));
export function renderTaxi(body: HTMLElement) {
  const mine = ownedListings().map(l => ({id: 'prop:' + l.id, icon: '🏢', name: '내 건물', x: l.x, z: l.z}));
  body.innerHTML = [...mine, ...PLACES].map(p => row(`<span>${p.icon} ${p.name}</span><span>${p.id.startsWith('prop:') ? '무료' : '✦ ' + fare(p)}</span>${btn('taxi:' + p.id, '🚕')}`)).join('');
}
export function taxiTo(id: string) {
  const p: Place | undefined = id.startsWith('prop:') ? (() => { const l = LISTINGS.find(q => q.id === id.slice(5))!; return {id, icon: '🏢', name: '내 건물', x: l.x, z: l.z}; })() : PLACES.find(q => q.id === id);
  if (!p) return;
  const f = id.startsWith('prop:') ? 0 : fare(p);
  if (S.cr < f) return toast('✦ 잔액이 부족합니다'), sfx('deny');
  S.cr -= f;
  save();
  warpTo(p.x, p.z);
}

// ---------- 내 차 호출 ----------
export function renderCars(body: HTMLElement) {
  if (!S.cars.list.length) return void (body.innerHTML = row('🚗 ✕') + row('🌐 cars.web'));
  body.innerHTML = S.cars.list.map((o, i) => row(`<span>${carOf(o.t).icon} ${o.stolen ? '🔧' : o.plate || '—'}</span><span>${o.stored ? '🅿️' : '🛣️'}</span>${btn('call:' + i, '📞 ✦30')}`)).join('');
}
export function callCar(i: number) {
  if (G.jail || G.drive) return toast('지금은 호출할 수 없습니다');
  if (S.cr < 30) return toast('✦ 잔액이 부족합니다'), sfx('deny');
  S.cr -= 30;
  const h = G.me.rotation.y,
    x = G.me.pos.x + Math.sin(h) * 7,
    z = G.me.pos.z + Math.cos(h) * 7;
  if (!VEH.every(v => Math.hypot(v.x - x, v.z - z) > 4)) return toast('근처가 복잡합니다');
  spawnOwned(i, {x, z, h: h + Math.PI / 2});
  save();
  closeModal();
  toast('🚗 도착했습니다');
}

// ---------- 배달 ----------
const MENU = [
  {id: 'burger', icon: '🍔', price: 15, desc: '스태미나 +60'},
  {id: 'juice', icon: '🧃', price: 10, desc: '스태미나 +35'},
  {id: 'energy', icon: '⚡', price: 40, desc: '90초 빨라짐'},
  {id: 'box', icon: '🎁', price: 50, desc: '✦ 10~120'},
];
export function renderFood(body: HTMLElement) {
  body.innerHTML = MENU.map(m => row(`<span>${m.icon} ${m.desc}</span><span>✦ ${m.price}</span>${btn('food:' + m.id, '🛵')}`)).join('');
}
export function orderFood(id: string) {
  const m = MENU.find(q => q.id === id)!;
  if (S.cr < m.price) return toast('✦ 잔액이 부족합니다'), sfx('deny');
  S.cr -= m.price;
  if (id === 'burger') G.stam = Math.min(100, G.stam + 60);
  else if (id === 'juice') G.stam = Math.min(100, G.stam + 35);
  else if (id === 'energy') giveBuff(90);
  else {
    const w = 10 + Math.floor(Math.random() * 111);
    S.cr += w;
    toast(`🎁 ✦ +${w}`);
  }
  sfx('buy');
  toast(`${m.icon} 배달 완료`);
  save();
}

// ---------- 내 자산 ----------
export function renderAssets(body: HTMLElement) {
  body.innerHTML = [
    row(`<span>✦ 잔액</span><b>${fmt(S.cr)}</b>`),
    row(`<span>🪐 기지 수익</span><span>+${fmt(income())}/s</span>`),
    row(`<span>🏢 보유 건물 ${ownedListings().length}</span><span>+${fmt(incomePerMin())}/분</span>`),
    row(`<span>🚗 보유 차량</span><span>${S.cars.list.length}</span>`),
    row(`<span>🚨 수배</span><span>${'★'.repeat(S.wanted)}${'☆'.repeat(6 - S.wanted)}</span>`),
    row(`<span>🏔️ 정상 정복</span><span>${S.coins.summit ? '✔' : '—'}</span>`),
  ].join('');
}
void CARS; void JAIL; void $;
