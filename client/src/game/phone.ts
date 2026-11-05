// 휴대폰(P / 📱): 홈 화면 앱 · 인터넷(상점·딜러·부동산·은행 웹사이트). 앱 구현은 game/phone-apps.ts, 거래는 game/cars.ts · game/estate.ts · game/shop-ui.ts.
import {S} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {$, fmt} from '../core/util.js';
import {LISTINGS, listingName} from '../data/places.js';
import {buyProp, incomePerMin, ownedListings, sellProp} from './estate.js';
import {flipMap, resetMap, renderAssets, renderCars, renderFood, renderMap, renderTaxi, callCar, orderFood, setWaypoint, taxiTo, warpTo} from './phone-apps.js';
import {closeModal, openModal} from './modal.js';
import {openShop} from './shop-ui.js';
import {sfx} from '../audio/index.js';
import {openCarShop} from './car-shop.js';

type View = 'home' | 'map' | 'taxi' | 'cars' | 'food' | 'assets' | 'soccer' | 'web' | string;
let view: View = 'home',
  hist: View[] = [];
const APPS: [View, string, string][] = [
  ['web', '🌐', '인터넷'], ['map', '🗺️', '지도'], ['taxi', '🚕', '택시'], ['cars', '🚗', '내 차'],
  ['food', '🍔', '배달'], ['assets', '💼', '자산'], ['soccer', '⚽', '축구'], ['web:estate', '🏢', '부동산'],
];
const SITES: [string, string, string][] = [
  ['mart', '🛒', '우주 잡화점'], ['fashion', '👕', '패션몰'], ['cars', '🚗', '자동차 딜러'], ['tune', '🛠️', '튜닝샵'],
  ['garage', '🅿️', '차고·등록'], ['estate', '🏢', '부동산'], ['bank', '🏦', '은행'], ['food', '🍔', '배달'],
];

function dom() {
  let el = document.getElementById('phone');
  if (el) return el;
  el = document.createElement('div');
  el.className = 'hud ov';
  el.id = 'phone';
  el.innerHTML =
    '<div class="card phone"><i class="phsb s1"></i><i class="phsb s2"></i><i class="phsb s3"></i><i class="phsb s4"></i><div class="phscreen"><i class="phisl"><u></u></i><div class="phbar"><span id="phurl">📱</span><b id="phcr"></b></div><div id="phbody"></div><div class="phnav"><button id="phback">◀</button><button id="phhome">⚪</button><button id="phx">✕</button></div><i class="phbar2"></i></div></div>';
  document.body.append(el);
  $('#phx').onclick = () => closeModal();
  $('#phhome').onclick = () => go('home', true);
  $('#phback').onclick = () => {
    const v = hist.pop();
    if (v) go(v, false);
    else closeModal();
  };
  $('#phbody').addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (t) act(t.dataset.act!);
  });
  return el;
}
export function openPhone() {
  if (!G.started || (paused() && G.modal !== 'phone')) return;
  if (G.modal === 'phone') return closeModal();
  dom();
  hist = [];
  view = 'home';
  resetMap();
  openModal('phone');
  sfx('jump'); // 삐릭
  render();
}
function go(v: View, reset: boolean) {
  if (reset) hist = [];
  else if (v !== view) hist.push(view);
  view = v;
  render();
}
const btn = (id: string, label: string, cls = '') => `<button class="phb ${cls}" data-act="${id}">${label}</button>`;
const row = (html: string) => `<div class="phrow">${html}</div>`;

function render() {
  const body = $('#phbody');
  $('#phcr').textContent = '✦ ' + fmt(S.cr);
  $('#phurl').textContent = view.startsWith('web:') ? view.slice(4) + '.web' : view === 'web' ? '🌐' : '📱';
  if (view === 'home') {
    body.innerHTML = `<div class="phgrid">${APPS.map(([k, i, n]) => `<button class="phapp" data-act="app:${k}"><span>${i}</span><em>${n}</em></button>`).join('')}</div>`;
  } else if (view === 'web') {
    body.innerHTML = `<div class="phgrid">${SITES.map(([k, i, n]) => `<button class="phapp" data-act="app:web:${k}"><span>${i}</span><em>${n}.web</em></button>`).join('')}</div>`;
  } else if (view === 'map') renderMap(body);
  else if (view === 'taxi') renderTaxi(body);
  else if (view === 'cars') renderCars(body);
  else if (view === 'food') renderFood(body);
  else if (view === 'assets') renderAssets(body);
  else if (view === 'soccer') {
    body.innerHTML = `<div class="phhero">⚽</div>${row('⌨️ ← ↑ → ↓ · Shift 🏃 · Space 🥅')}${row('🔵 ➜ 🥅 (동쪽)  ⏱ 3:00')}${btn('taxi:stadium', '🚕 경기장')}${btn('wp:stadium', '📍')}`;
  } else if (view.startsWith('web:')) renderSite(body, view.slice(4));
}
function hero(icon: string, title: string) {
  return `<div class="phhero">${icon}</div><div class="phtitle">${title}</div>`;
}
function renderSite(body: HTMLElement, site: string) {
  switch (site) {
    case 'mart': body.innerHTML = hero('🛒', '우주 잡화점') + row('🧲 🎒 👟 🏠 🎨') + btn('shop:spr', '🛒 열기', 'big'); break;
    case 'fashion': body.innerHTML = hero('👕', '패션몰') + row('🧢 😀 👕 👖') + btn('shop:look', '👕 열기', 'big'); break;
    case 'cars': body.innerHTML = hero('🚗', '자동차 딜러 · 15종') + btn('car:buy', '🚗 열기', 'big'); break;
    case 'tune': body.innerHTML = hero('🛠️', '튜닝샵') + row('⚙️ 🛞 💡 🎨') + btn('car:tune', '🛠️ 열기', 'big'); break;
    case 'garage': body.innerHTML = hero('🅿️', '차고 · 등록') + btn('car:garage', '🅿️ 열기', 'big'); break;
    case 'food': renderFood(body); break;
    case 'bank': renderAssets(body); break;
    case 'estate': {
      body.innerHTML =
        hero('🏢', '부동산') + row(`<span>보유 ${ownedListings().length}</span><span>+${fmt(incomePerMin())}/분</span>`) +
        [...LISTINGS].sort((a, b) => a.price - b.price).map(l => row(`<span>${listingName(l)} </span><span>✦ ${fmt(l.price)}<br><small>+${fmt(l.income)}/분</small></span>${S.props[l.id] ? btn('sell:' + l.id, '💰') : btn('buy:' + l.id, '🔑', S.cr >= l.price ? '' : 'dim')}${btn('wpl:' + l.id, '📍')}`)).join('');
      break;
    }
  }
}
function act(a: string) {
  const [k, v] = [a.split(':')[0], a.slice(a.indexOf(':') + 1)];
  if (k === 'app') return go(v, false);
  if (k === 'shop') { closeModal(); return openShop(v); }
  if (k === 'car') { closeModal(); return openCarShop(v as 'buy' | 'tune' | 'garage'); }
  if (k === 'buy') buyProp(LISTINGS.find(l => l.id === v)!);
  else if (k === 'sell') sellProp(LISTINGS.find(l => l.id === v)!);
  else if (k === 'wpl') { const l = LISTINGS.find(q => q.id === v)!; setWaypoint({x: l.x, z: l.z, name: listingName(l)}); }
  else if (k === 'wp') { import('../data/places.js').then(m => { const p = m.PLACES.find(q => q.id === v)!; setWaypoint({x: p.x, z: p.z, name: p.name}); render(); }); return; }
  else if (k === 'wpoff') setWaypoint(null);
  else if (k === 'taxi') return taxiTo(v);
  else if (k === 'call') return callCar(+v);
  else if (k === 'food') orderFood(v);
  else if (k === 'mapmode') flipMap();
  render();
}
void warpTo;
document.getElementById('phoneBtn')?.addEventListener('click', openPhone);
