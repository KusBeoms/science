// 휴대폰(P / 📱): 홈 화면 앱 · 인터넷(상점·딜러·부동산·은행 웹사이트). 앱 구현은 game/phone-apps.ts, 거래는 game/cars.ts · game/estate.ts · game/shop-ui.ts.
import {S} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {$, fmt} from '../core/util.js';
import {LISTINGS, listingName} from '../data/places.js';
import {buyProp, incomePerMin, ownedListings, sellProp} from './estate.js';
import {renderAssets, renderCars, renderFood, renderTaxi, callCar, orderFood, setWaypoint, taxiTo, warpTo} from './phone-apps.js';
import {openWorldMap} from './world-map.js';
import {closeModal, openModal} from './modal.js';
import {openShop} from './shop-ui.js';
import {sfx} from '../audio/index.js';
import {renderChatList, renderGallery, renderThread, sayTo, snap, deletePhoto} from './phone-social.js';
import {unread} from './messenger.js';
import {renderClock, stopClock} from './phone-clock.js';
import {clockText} from '../core/clock.js';
import {openCarShop} from './car-shop.js';
import {SHOP_PLACES} from '../data/shops2.js';

type View = 'home' | 'map' | 'taxi' | 'cars' | 'food' | 'assets' | 'soccer' | 'web' | string;
let view: View = 'home',
  hist: View[] = [];
const APPS: [View, string, string][] = [
  ['web', '🌐', '인터넷'], ['map', '🗺️', '지도'], ['taxi', '🚕', '택시'], ['cars', '🚗', '내 차'],
  ['food', '🍔', '배달'], ['assets', '💼', '자산'], ['soccer', '⚽', '축구'], ['web:estate', '🏢', '부동산'],
  ['chat', '💬', '메신저'], ['photo', '📸', '사진'], ['clock', '🕒', '시계'],
];
const SITES: [string, string, string][] = [
  ['mart', '🛒', '우주 잡화점'], ['fashion', '👕', '패션몰'], ['cars', '🚗', '자동차 딜러'], ['tune', '🛠️', '튜닝샵'],
  ['garage', '🅿️', '차고·등록'], ['shopst', '🛍️', '상가 골목'], ['estate', '🏢', '부동산'], ['bank', '🏦', '은행'], ['food', '🍔', '배달'],
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
  openModal('phone');
  sfx('jump'); // 삐릭
  render();
}
function go(v: View, reset: boolean) {
  if (v === 'map') {closeModal(); openWorldMap(); return;}
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
  if (view !== 'clock') stopClock();
  $('#phurl').textContent = view.startsWith('web:') ? view.slice(4) + '.web' : view === 'web' ? '🌐' : (G.night > 0 ? '🌙 ' : '☀️ ') + clockText(G.cycT, G.night);
  if (view === 'home') {
    body.innerHTML = `<div class="phgrid">${APPS.map(([k, i, n]) => `<button class="phapp" data-act="app:${k}"><span>${i}</span>${k === 'chat' && unread() ? `<b class="phdot">${unread()}</b>` : ''}<em>${n}</em></button>`).join('')}</div>`;
  } else if (view === 'web') {
    body.innerHTML = `<div class="phgrid">${SITES.map(([k, i, n]) => `<button class="phapp" data-act="app:web:${k}"><span>${i}</span><em>${n}.web</em></button>`).join('')}</div>`;
  } else if (view === 'clock') renderClock(body);
  else if (view === 'taxi') renderTaxi(body);
  else if (view === 'cars') renderCars(body);
  else if (view === 'food') renderFood(body);
  else if (view === 'assets') renderAssets(body);
  else if (view === 'soccer') {
    body.innerHTML = `<div class="phhero">⚽</div>${row('방향키 이동 · Shift 달리기 · Space 슛')}${row('파란 팀이 동쪽 골대를 공격합니다 · 경기 10분')}${btn('taxi:stadium', '🚕 경기장으로 이동')}${btn('wp:stadium', '📍 길안내')}`;
  } else if (view === 'chat') renderChatList(body);
  else if (view.startsWith('chat:')) renderThread(body, view.slice(5));
  else if (view === 'photo') renderGallery(body);
  else if (view.startsWith('photo:')) renderGallery(body, +view.slice(6));
  else if (view.startsWith('web:')) renderSite(body, view.slice(4));
}
function hero(icon: string, title: string) {
  return `<div class="phhero">${icon}</div><div class="phtitle">${title}</div>`;
}
function renderSite(body: HTMLElement, site: string) {
  switch (site) {
    case 'mart': body.innerHTML = hero('🛒', '우주 잡화점') + row('스프링 · 가방 · 신발 · 기지 꾸미기') + btn('shop:spr', '🛒 상점 열기', 'big'); break;
    case 'shopst': body.innerHTML = hero('🛍️', '상가 골목') + row('옷, 꽃, 카페 등 여러 가게가 모여 있습니다') + btn('taxi:shopst', '🚕 상가 골목으로 이동') + SHOP_PLACES.map(p => row(`<span>${p.icon} ${p.name}</span>${btn('taxi:' + p.id, '🚕 이동')}${btn('wp:' + p.id, '📍 길안내')}`)).join(''); break;
    case 'fashion': body.innerHTML = hero('👕', '패션몰') + row('모자 · 표정 · 상의 · 하의') + btn('shop:look', '👕 패션몰 열기', 'big'); break;
    case 'cars': body.innerHTML = hero('🚗', '자동차 딜러 · 15종') + btn('car:buy', '🚗 차 보러 가기', 'big'); break;
    case 'tune': body.innerHTML = hero('🛠️', '튜닝샵') + row('엔진 · 타이어 · 네온 · 색상') + btn('car:tune', '🛠️ 튜닝샵 열기', 'big'); break;
    case 'garage': body.innerHTML = hero('🅿️', '차고 · 등록') + btn('car:garage', '🅿️ 차고 열기', 'big'); break;
    case 'food': renderFood(body); break;
    case 'bank': renderAssets(body); break;
    case 'estate': {
      body.innerHTML =
        hero('🏢', '부동산') + row(`<span>보유 ${ownedListings().length}</span><span>+${fmt(incomePerMin())}/분</span>`) +
        [...LISTINGS].sort((a, b) => a.price - b.price).map(l => row(`<span>${listingName(l)} </span><span>✦ ${fmt(l.price)}<br><small>+${fmt(l.income)}/분</small></span>${S.props[l.id] ? btn('sell:' + l.id, '판매') : btn('buy:' + l.id, '구매', S.cr >= l.price ? '' : 'dim')}${btn('wpl:' + l.id, '📍 길안내')}`)).join('');
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
  else if (k === 'chat') return go('chat:' + v, false);
  else if (k === 'say') { const [id, ...t] = v.split(':'); const text = t.join(':'); sayTo(id, text); if (text.includes('보기')) { go('web:estate', false); return; } if (text.includes('경기장')) return taxiTo('stadium'); if (text.includes('튜닝')) { closeModal(); return openCarShop('tune'); } }
  else if (k === 'photo') return go('photo:' + v, false);
  else if (k === 'photodel') { deletePhoto(+v); hist.pop(); return go('photo', false); }
  else if (k === 'photosnap') {
    closeModal();
    setTimeout(() => { snap(); setTimeout(() => { openPhone(); go('photo', false); }, 600); }, 250);
    return;
  }
  else if (k === 'taxi') return taxiTo(v);
  else if (k === 'call') return callCar(+v);
  else if (k === 'food') orderFood(v);
  render();
}
void warpTo;
document.getElementById('phoneBtn')?.addEventListener('click', openPhone);
