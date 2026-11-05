// 옷가게 거울 UI: 옷·바지·모자 색 갈아입기, 등 장식(망토·가방·날개·로켓 팩). 겉모습은 S.look.shirtC/pantsC/hatC/back/backC (0 = 기본), 산 색은 S.own 에 기억.
import {S} from '../core/state.js';
import {applyLook} from '../render/characters.js';
import {BACKS, COLORS, COLOR_COST, dealDay} from '../data/shops2.js';
import {LOOK} from '../data/shop.js';
import {toast} from './hud.js';
import {big, card, commit, crHead, openPanel, pay} from './shops2-ui.js';
import {fmt, eul} from '../core/util.js';

type Tab = 'shirt' | 'pants' | 'hat' | 'back';
let tab: Tab = 'shirt';
const hexS = (c: number) => '#' + c.toString(16).padStart(6, '0');

/** 작은 거울 속 모습: 모자·머리·몸통·바지·등 장식을 색 블록으로 */
function mirror() {
  const sk = LOOK.skin.v[S.look.skin]?.[1] || '#f4d03f',
    sh = S.look.shirtC ? hexS(S.look.shirtC) : LOOK.shirt.v[S.look.shirt][1],
    pa = S.look.pantsC ? hexS(S.look.pantsC) : LOOK.pants.v[S.look.pants][1],
    ha = S.look.hat ? (S.look.hatC ? hexS(S.look.hatC) : LOOK.hat.v[S.look.hat][1]) : 'transparent',
    bk = S.look.back ? hexS(S.look.backC || BACKS[S.look.back].color) : 'transparent';
  const d = (w: number, h: number, c: string, x = 0, y = 0) => `<i style="position:absolute;left:${50 + x - w / 2}px;top:${y}px;width:${w}px;height:${h}px;background:${c};border-radius:3px"></i>`;
  return `<div style="position:relative;width:100px;height:112px;margin:0 auto 6px;background:linear-gradient(#cfe3f0,#8fb0c8);border:3px solid #fff8;border-radius:10px">
    ${d(44, 70, bk, 0, 26)}${d(34, 30, sh, 0, 36)}${d(10, 30, sk, -22, 36)}${d(10, 30, sk, 22, 36)}${d(30, 30, pa, 0, 66)}${d(24, 24, sk, 0, 12)}${d(28, 10, ha, 0, 6)}</div>`;
}

export function openClothes() {
  const pan = openPanel();
  const draw = () => {
    pan.title.innerHTML = crHead('👕');
    pan.tabs.innerHTML = '';
    pan.grid.innerHTML = '';
    pan.hint.innerHTML = '오늘의 특가 색은 −50%입니다';
    (['shirt', 'pants', 'hat', 'back'] as Tab[]).forEach(k =>
      pan.tabs.appendChild(card({shirt: '👕', pants: '👖', hat: '🧢', back: '🎒'}[k], () => ((tab = k), draw()), k === tab ? 'eq' : ''))
    );
    pan.tabs.appendChild(card('🔄', () => {
      Object.assign(S.look, {shirtC: 0, pantsC: 0, hatC: 0, back: 0, backC: 0});
      applyLook();
      commit();
      draw();
    }));
    const m = document.createElement('div');
    m.style.cssText = 'grid-column:1/-1';
    m.innerHTML = mirror();
    pan.grid.appendChild(m);
    if (tab === 'back') {
      BACKS.forEach(b => {
        const have = b.price === 0 || !!S.own['back' + b.id],
          on = (S.look.back || 0) === b.id;
        pan.grid.appendChild(card(`${big(b.icon)}<em>${on ? '착용 중' : have ? '입기' : '✦ ' + fmt(b.price)}</em>`, () => {
          if (!on && !have && !pay(b.price)) return;
          S.own['back' + b.id] = 1;
          S.look.back = b.id;
          S.look.backC = 0;
          applyLook();
          toast(`${eul(b.name)} 착용했습니다`);
          commit();
          draw();
        }, on ? 'eq' : have ? 'own' : S.cr >= b.price ? '' : 'locked'));
      });
      return;
    }
    if (tab === 'hat' && !S.look.hat) pan.hint.innerHTML = '모자가 없습니다. 상점에서 모자를 먼저 사세요';
    const base = COLOR_COST[tab],
      deal = dealDay('clothes', COLORS.length);
    COLORS.forEach((c, i) => {
      const key = `c:${tab}:${c}`,
        have = !!S.own[key],
        on = (S.look[tab + 'C'] || 0) === c,
        price = i === deal ? Math.round(base * 0.5) : base;
      pan.grid.appendChild(card(`${i === deal && !have ? '<i class="tag">🔥 특가</i>' : ''}<i class="sw" style="background:${hexS(c)}"></i><em>${on ? '착용 중' : have ? '입기' : '✦ ' + price}</em>`, () => {
        if (!on && !have && !pay(price)) return;
        S.own[key] = 1;
        S.look[tab + 'C'] = c;
        applyLook();
        commit();
        draw();
      }, on ? 'eq' : have ? 'own' : ''));
    });
  };
  draw();
}
