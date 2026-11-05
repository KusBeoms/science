// W5 상점 거리: 가게 입구(openShop2) 라우팅 + 일반 가게(편의점·빵집·약국·꽃집·전자제품·서점·주유소·세차장) 품목 화면과 효과.
// 옷·대리점·중고차·자전거·펫은 전용 화면(clothes.ts · shops2-vehicles.ts · pets.ts). 임시 버프는 저장하지 않는다.
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {PURPOSE_INFO} from '../data/interiors.js';
import {BOOK_BONUS, ITEMS, LOTTO, dayKey, priceTag, stockOf, type ShopItem, type ShopPurpose} from '../data/shops2.js';
import {condOf, repairCost} from '../systems/vehicle-damage.js';
import {carOf} from '../data/cars.js';
import {repairCar} from './cars.js';
import {toast} from './hud.js';
import {big, card, commit, crHead, openPanel, pay} from './shops2-ui.js';
import {openClothes} from './clothes.js';
import {openVehicleShop} from './shops2-vehicles.js';
import {openPetShop} from './pets.js';
import {fmt, eul} from '../core/util.js';
import type {GameSystem} from '../core/types.js';

/** 임시 버프 (속도 배율·남은 초, 지치지 않음 남은 초) */
export const buffs = {mul: 1, t: 0, icon: '', endure: 0};
/** 세차·정비 후 다른 시스템(DAMAGE)이 붙을 수 있는 훅 (차 번호 i = S.cars.list 인덱스) */
export const carService = {wash: [] as ((i: number, level: number) => void)[]};
const gadgetMul = () => 1 + Object.keys(S.own).reduce((a, k) => a + (k.startsWith('g:') && S.own[k] ? +S.own[k] / 100 : 0), 0);
export const bookCount = () => Object.keys(S.own).filter(k => k.startsWith('bk:') && k !== 'bk:bonus').length;

// ---- 하루 한정 재고 ----
export const soldToday = (id: string) => (S.coins['sd:' + id] === dayKey() ? S.coins['sn:' + id] || 0 : 0);
export function addSold(id: string) {
  if (S.coins['sd:' + id] !== dayKey()) [S.coins['sd:' + id], S.coins['sn:' + id]] = [dayKey(), 0];
  S.coins['sn:' + id]++;
}
export const stockLeft = (id: string, ltd: number) => Math.max(0, stockOf(id, ltd) - soldToday(id));

export function giveSpeed(mul: number, sec: number, icon: string) {
  if (buffs.t > 0 && buffs.mul > mul) return;
  buffs.mul = mul;
  buffs.t = Math.max(buffs.t, sec);
  buffs.icon = icon;
}
const owned = (it: ShopItem) => (it.run === 'gadget' && !!S.own['g:' + it.id]) || (it.run === 'book' && !!S.own['bk:' + it.a]);

function run(it: ShopItem) {
  const a = it.a ?? 0;
  switch (it.run) {
    case 'stam': G.stam = Math.min(100, G.stam + a); G.tired = false; toast(`${eul(it.name)} 먹었습니다. 스태미나 +${a}`); break;
    case 'speed': giveSpeed(a, it.b!, it.icon); toast(`${it.name} 사용. ${it.b}초간 빨라집니다`); break;
    case 'endure': buffs.endure = Math.max(buffs.endure, a); toast(`${it.name} 사용. ${a}초간 지치지 않습니다`); break;
    case 'heal': G.stam = 100; G.tired = false; buffs.endure = Math.max(buffs.endure, 20); toast('컨디션이 최고입니다. 잠시 지치지 않습니다'); break;
    case 'snackbox': G.stam = 100; G.tired = false; giveSpeed(1.15, 60, it.icon); toast('간식을 맛있게 먹었습니다. 스태미나가 가득 차고 잠시 빨라집니다'); break;
    case 'lotto': {
      const r = Math.random(),
        win = LOTTO.find(([p]) => r < p)![1];
      S.cr += win;
      S.coins.lottos = (S.coins.lottos || 0) + 1;
      toast(win ? `당첨되었습니다. ✦ +${fmt(win)}` : '아쉽게도 꽝입니다');
      break;
    }
    case 'flower': S.coins.flowers = (S.coins.flowers || 0) + 1; giveSpeed(1 + a / 10, 90, it.icon); toast('기분이 좋아졌습니다. 잠시 빨라집니다'); break;
    case 'gadget': S.own['g:' + it.id] = Math.round(a * 100); toast(`${it.name} 구매 완료. 이동 속도 +${Math.round(a * 100)}%`); break;
    case 'book': {
      S.own['bk:' + a] = 1;
      toast(`${eul(it.name)} 읽었습니다 (${bookCount()}/6권)`);
      if (bookCount() >= 6 && !S.own['bk:bonus']) {
        S.own['bk:bonus'] = 1;
        S.cr += BOOK_BONUS;
        setTimeout(() => toast(`6권을 모두 읽었습니다. 보너스 ✦ +${fmt(BOOK_BONUS)}`), 1200);
      }
      break;
    }
    case 'fuel': toast('연료를 가득 채웠습니다'); break;
    default:
  }
}

function itemsView(p: ShopPurpose) {
  const list = ITEMS[p] || [],
    pan = openPanel(),
    info = PURPOSE_INFO[p];
  const draw = () => {
    pan.title.innerHTML = crHead(info.icon);
    pan.grid.innerHTML = '';
    pan.hint.textContent = '🔥 오늘의 특가 −25% · ⏰ 지금 세일 −10%';
    if (p === 'gasstation') pan.grid.appendChild(card(big('🔧') + '<b>차 정비</b>', () => repairView(), ''));
    list.forEach((it, i) => {
      if (it.run === 'repair') return;
      const pt = priceTag(p, list.length, i, it.price),
        have = owned(it),
        left = it.ltd ? stockLeft(it.id, it.ltd) : 99,
        dead = have || left <= 0,
        cls = dead ? 'locked' : S.cr >= pt.price ? '' : 'locked';
      const price = have ? '✔' : left <= 0 ? '매진' : `${pt.tag ? `<s>${fmt(it.price)}</s> ` : ''}✦ ${fmt(pt.price)}`;
      const c = card(`${pt.tag ? `<i class="tag">${pt.tag}</i>` : ''}${big(it.icon)}<b>${it.name}</b>${it.ltd && !have ? `<span>남은 수량 ${left}</span>` : ''}<em>${price}</em>`, () => {
        if (dead || (it.ltd && stockLeft(it.id, it.ltd) <= 0)) return;
        if (it.run === 'wash') return washView(it);
        if (!pay(pt.price)) return;
        if (it.ltd) addSold(it.id);
        run(it);
        commit();
        draw();
      }, cls);
      pan.grid.appendChild(c);
    });
  };
  draw();
}

/** 주유소: 내 차 정비 (DAMAGE 의 repairCost/condOf, 결제는 game/cars.ts repairCar) */
function repairView() {
  const pan = openPanel();
  pan.title.innerHTML = crHead('🔧');
  pan.tabs.appendChild(card('◀', () => itemsView('gasstation')));
  if (!S.cars.list.length) pan.hint.textContent = '정비할 차량이 없습니다';
  S.cars.list.forEach((o, i) => {
    const c = condOf(i),
      rc = repairCost(i);
    pan.grid.appendChild(
      card(
        `${big(carOf(o.t).icon)}<div class="bar"><i style="width:${c.hp}%"></i></div><div class="bar"><i style="width:${c.engine}%"></i></div><em>${rc ? '✦ ' + fmt(rc) : '✔'}</em>`,
        () => (repairCar(i), repairView()),
        rc && S.cr >= rc ? '' : 'locked'
      )
    );
  });
}
/** 세차장: 내 차를 골라 세차 (지금은 연출만 — carService.wash 훅으로 DAMAGE 가 먼지를 지울 수 있다) */
function washView(it: ShopItem) {
  const pan = openPanel();
  pan.title.innerHTML = crHead(it.icon);
  pan.tabs.appendChild(card('◀', () => itemsView('carwash')));
  pan.hint.textContent = S.cars.list.length ? '세차할 차량을 고르세요' : '세차할 차량이 없습니다';
  S.cars.list.forEach((o, i) =>
    pan.grid.appendChild(
      card(`${big(carOf(o.t).icon)}<em>✦ ${fmt(it.price)}</em>`, () => {
        if (!pay(it.price)) return;
        carService.wash.forEach(f => f(i, it.a ?? 1));
        toast(it.a === 2 ? '광택 세차를 마쳤습니다' : '세차를 마쳤습니다');
        commit();
        washView(it);
      }, S.cr >= it.price ? '' : 'locked')
    )
  );
}

/** 방 안 계산대/거울 지점에서 부른다 */
export function openShop2(p: ShopPurpose) {
  switch (p) {
    case 'clothes': return openClothes();
    case 'autoshop': case 'usedcar': case 'bikeshop': return openVehicleShop(p);
    case 'petshop': return openPetShop();
    default: return itemsView(p);
  }
}

export const shops2System: GameSystem = {
  id: 'shops2',
  speedMul: () => gadgetMul() * (buffs.t > 0 ? buffs.mul : 1),
  update(dt) {
    if (buffs.t > 0) buffs.t -= dt;
    if (buffs.endure > 0) {
      buffs.endure -= dt;
      G.stam = 100;
      G.tired = false;
    }
  },
  hud: () => (buffs.t > 0 ? `${buffs.icon} 빨라짐 ×${buffs.mul} ${Math.ceil(buffs.t)}초` : buffs.endure > 0 ? `지치지 않음 ${Math.ceil(buffs.endure)}초` : null),
};
