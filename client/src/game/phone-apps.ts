// 휴대폰 앱: 지도(캔버스 + 길안내) · 택시(순간이동) · 내 차 호출 · 배달 · 내 자산. 껍데기와 인터넷은 game/phone.ts
import {S, save, income} from '../core/state.js';
import {G} from '../core/runtime.js';
import {$, fmt} from '../core/util.js';
import {groundH} from '../core/terrain.js';
import {CITY_ROADS} from '../data/city.js';
import {CARS, carOf} from '../data/cars.js';
import {LISTINGS, PLACES, type Place} from '../data/places.js';
import {DESERT, JAIL, LAKES, MOUNTAIN} from '../data/wild.js';
import {ROAD_LINES} from '../data/wild-road.js';
import {TRAIL} from '../core/wild-trail.js';
import {WILD_PLACE, WILD_POLY} from '../data/outline.js';
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
  if (G.jail || G.match) return toast('지금은 이동할 수 없습니다');
  closeModal();
  exitVeh(true); // 탑승 모션 중에도 먼저 취소한다.
  if (G.inside) leaveBuilding(true);
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
  body.innerHTML = `<canvas id="phmap" width="300" height="300"></canvas><div class="phrow">${btn('mapmode', mapWild ? '🌆 도시 지도' : '🌄 야생지 지도')} ${wp ? btn('wpoff', '길안내 끄기') : ''}</div><div id="phplaces"></div>`;
  const cv = body.querySelector('#phmap') as HTMLCanvasElement,
    c = cv.getContext('2d')!,
    cx = mapWild ? WILD_PLACE.x : 0,
    cz = mapWild ? WILD_PLACE.z : 40,
    half = mapWild ? 640 : 390,
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
    c.fillStyle = '#2a4a6a'; // 바다
    c.fillRect(0, 0, 300, 300);
    c.fillStyle = '#3b6a3a'; // 땅 = 시골 윤곽
    c.beginPath();
    WILD_POLY.poly.forEach((p, i) => (i ? c.lineTo(X(p[0]), Z(p[1])) : c.moveTo(X(p[0]), Z(p[1]))));
    c.fill();
    c.fillStyle = '#d9b867';
    c.beginPath(); c.arc(X(DESERT.x0 + 160), Z(DESERT.z0 + 80), 90 * sc, 0, 7); c.fill();
    c.beginPath(); c.arc(X(DESERT.x0 + 130), Z(DESERT.z0 + 270), 60 * sc, 0, 7); c.fill();
    c.fillStyle = '#3d8fd8';
    for (const L of LAKES) { c.beginPath(); c.ellipse(X(L.x), Z(L.z), L.rx * sc, L.rz * sc, L.rot, 0, 7); c.fill(); }
    c.fillStyle = '#7d8590';
    c.beginPath(); c.ellipse(X(MOUNTAIN.x + 10), Z(MOUNTAIN.z + 130), 140 * sc, 150 * sc, 0, 0, 7); c.fill();
    c.strokeStyle = '#4a4f57'; c.lineWidth = Math.max(1, 6 * sc);
    for (const L of ROAD_LINES) { c.beginPath(); L.pts.forEach((p, i) => (i ? c.lineTo(X(p.x), Z(p.z)) : c.moveTo(X(p.x), Z(p.z)))); if (L.closed) c.closePath(); c.stroke(); }
    c.strokeStyle = '#f3e29a'; c.lineWidth = Math.max(1, 3 * sc); c.beginPath(); TRAIL.forEach((p, i) => (i ? c.lineTo(X(p.x), Z(p.z)) : c.moveTo(X(p.x), Z(p.z)))); c.stroke();
  }
  c.strokeStyle = '#e0613a'; // 금문교(남쪽 다리): 진입로 → 상판 → 야생지 접속부
  c.lineWidth = Math.max(2, 6 * sc);
  c.beginPath(); c.moveTo(X(0), Z(333)); c.lineTo(X(74), Z(372)); c.lineTo(X(74), Z(790)); c.stroke();
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
    toast('길안내를 시작합니다');
    renderMap(body);
  };
  const list = body.querySelector('#phplaces')!;
  list.innerHTML = [...PLACES].filter(p => (mapWild ? p.z > 600 : p.z < 380)).sort((a, b) => dist(a) - dist(b)).map(p => row(`<span>${p.icon} ${p.name}</span><span>${dist(p)}m</span>${btn('wp:' + p.id, '📍 길안내')}`)).join('');
}

// ---------- 택시 ----------
const fare = (p: {x: number; z: number}) => Math.max(10, Math.round(dist(p) * 0.08));
export function renderTaxi(body: HTMLElement) {
  const mine = ownedListings().map(l => ({id: 'prop:' + l.id, icon: '🏢', name: '내 건물', x: l.x, z: l.z}));
  body.innerHTML = [...mine, ...PLACES].map(p => row(`<span>${p.icon} ${p.name}</span><span>${p.id.startsWith('prop:') ? '무료' : '✦ ' + fare(p)}</span>${btn('taxi:' + p.id, '🚕 이동')}`)).join('');
}
export function taxiTo(id: string) {
  const p: Place | undefined = id.startsWith('prop:') ? (() => { const l = LISTINGS.find(q => q.id === id.slice(5))!; return {id, icon: '🏢', name: '내 건물', x: l.x, z: l.z}; })() : PLACES.find(q => q.id === id);
  if (!p) return;
  const f = id.startsWith('prop:') ? 0 : fare(p);
  if (S.cr < f) return toast('코인이 부족합니다'), sfx('deny');
  S.cr -= f;
  save();
  warpTo(p.x, p.z);
}

// ---------- 내 차 호출 ----------
export function renderCars(body: HTMLElement) {
  if (!S.cars.list.length) return void (body.innerHTML = row('보유한 차가 없습니다') + row('자동차 딜러 사이트에서 살 수 있습니다'));
  body.innerHTML = S.cars.list.map((o, i) => row(`<span>${carOf(o.t).icon} ${o.stolen ? '미등록' : o.plate || '번호판 없음'}</span><span>${o.stored ? '차고에 있음' : '밖에 있음'}</span>${btn('call:' + i, '호출 ✦30')}`)).join('');
}
export function callCar(i: number) {
  if (G.jail || G.drive) return toast('지금은 호출할 수 없습니다');
  if (S.cr < 30) return toast('코인이 부족합니다'), sfx('deny');
  S.cr -= 30;
  const h = G.me.rotation.y,
    x = G.me.pos.x + Math.sin(h) * 7,
    z = G.me.pos.z + Math.cos(h) * 7;
  if (!VEH.every(v => Math.hypot(v.x - x, v.z - z) > 4)) return toast('주변이 복잡해 차를 부를 수 없습니다');
  spawnOwned(i, {x, z, h: h + Math.PI / 2});
  save();
  closeModal();
  toast('내 차가 도착했습니다');
}

// ---------- 배달 ----------
const MENU = [
  {id: 'burger', icon: '🍔', name: '햄버거', price: 15, desc: '스태미나 +60'},
  {id: 'juice', icon: '🧃', name: '주스', price: 10, desc: '스태미나 +35'},
  {id: 'energy', icon: '⚡', name: '에너지 음료', price: 40, desc: '90초 동안 빨라짐'},
  {id: 'box', icon: '🎁', name: '선물 상자', price: 50, desc: '코인 10~120 획득'},
];
export function renderFood(body: HTMLElement) {
  body.innerHTML = MENU.map(m => row(`<span>${m.icon} ${m.name}<br><small>${m.desc}</small></span><span>✦ ${m.price}</span>${btn('food:' + m.id, '🛵 주문')}`)).join('');
}
export function orderFood(id: string) {
  const m = MENU.find(q => q.id === id)!;
  if (S.cr < m.price) return toast('코인이 부족합니다'), sfx('deny');
  S.cr -= m.price;
  if (id === 'burger') G.stam = Math.min(100, G.stam + 60);
  else if (id === 'juice') G.stam = Math.min(100, G.stam + 35);
  else if (id === 'energy') giveBuff(90);
  else {
    const w = 10 + Math.floor(Math.random() * 111);
    S.cr += w;
    toast(`선물 상자에서 ✦ ${w}을 얻었습니다`);
  }
  sfx('buy');
  toast(`${m.name} 배달이 도착했습니다`);
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
    row(`<span>🏔️ 정상 정복</span><span>${S.coins.summit ? '완료' : '아직'}</span>`),
  ].join('');
}
void CARS; void JAIL; void $;
