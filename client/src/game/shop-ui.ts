// 상점 UI: 스프링·가방·신발·기지 칸·꾸미기·캐릭터 탭
import {S, save, cap} from '../core/state.js';
import {G, paused, releaseLock} from '../core/runtime.js';
import {$, fmt} from '../core/util.js';
import {BAGS, CAPS, DECO, LOOK, SPR, sprStyle} from '../data/shop.js';
import {slotCost, spdCost} from '../data/pacing.js';
import {applyLook} from '../render/characters.js';
import {buildBag, buildSpringOnHand, syncCarry} from '../render/gear.js';
import {applyDeco} from '../render/deco.js';
import {toast} from './hud.js';

let shopTab = 'spr',
  shopSub = 'floor',
  lookSub = 'hat';
export function openShop() {
  if (paused()) return;
  G.shopOpen = true;
  releaseLock();
  $('#shop').classList.add('on');
  renderShop();
}
export function closeShop() {
  G.shopOpen = false;
  $('#shop').classList.remove('on');
  save();
}
function spend(cost: number, fn: () => void) {
  if (S.cr < cost) {
    toast('돈이 부족하다');
    return false;
  }
  S.cr -= cost;
  S.bought++;
  fn();
  save();
  renderShop();
  return true;
}
function cell(html: string, cls: string, fn: () => void) {
  const b = document.createElement('button');
  b.className = 'it ' + (cls || '');
  b.innerHTML = html;
  b.onclick = fn;
  return b;
}
export function renderShop() {
  $('#sc').textContent = '✦ ' + fmt(S.cr);
  const tabs: [string, string][] = [
    ['spr', '🧲 스프링'],
    ['bag', '🎒 가방'],
    ['shoe', '👟 신발'],
    ['slot', '🏠 기지 칸'],
    ['deco', '🎨 꾸미기'],
    ['look', '🧑 캐릭터'],
  ];
  const tb = $('#stabs');
  tb.innerHTML = '';
  tabs.forEach(([k, n]) => {
    const b = document.createElement('button');
    b.textContent = n;
    if (k === shopTab) b.classList.add('sel');
    b.onclick = () => {
      shopTab = k;
      renderShop();
    };
    tb.append(b);
  });
  const sub = $('#ssub'),
    g = $('#sgrid'),
    hint = $('#shint');
  sub.innerHTML = '';
  g.innerHTML = '';
  if (shopTab === 'spr') {
    hint.textContent =
      '손에 끼우는 스프링 — 높이 뛰고 더 빨라진다. 색으로 등급을 구분하고, 특별한 스프링엔 장식이 붙는다.';
    SPR.forEach((s, i) => {
      const own = S.springs.includes(i),
        eq = S.eq === i;
      g.append(
        cell(
          `<i class="sw" style="background:${sprStyle(i)}">${s[5]}</i><b>${s[0]}</b><span>점프 ×${s[3]}${s[4] ? ` · 이동 +${s[4]}` : ''}</span><em>${eq ? '착용 중' : own ? '착용하기' : '✦ ' + fmt(s[2])}</em>`,
          eq ? 'eq' : own ? 'own' : '',
          () => {
            if (own) {
              S.eq = i;
              buildSpringOnHand();
              save();
              renderShop();
            } else
              spend(s[2], () => {
                S.springs.push(i);
                S.eq = i;
                buildSpringOnHand();
                toast(`${s[0]} 스프링 장착!`);
              });
          }
        )
      );
    });
  } else if (shopTab === 'bag') {
    hint.textContent = `가방이 있으면 행성을 여러 개 들고 올 수 있다. 지금은 최대 ${cap()}개. (잡히면 전부 잃는다!)`;
    BAGS.forEach((b, i) => {
      const own = S.bag >= i + 1;
      g.append(
        cell(
          `<i class="sw" style="background:${b[3]}">🎒</i><b>${b[0]}</b><span>최대 ${b[2]}개 들기</span><em>${own ? '보유 중' : '✦ ' + fmt(b[1])}</em>`,
          own ? 'eq' : '',
          () => {
            if (!own)
              spend(b[1], () => {
                S.bag = i + 1;
                buildBag();
                syncCarry();
                toast(`${b[0]} 구매! 최대 ${b[2]}개`);
              });
          }
        )
      );
    });
  } else if (shopTab === 'shoe') {
    hint.textContent = '신발 레벨 하나당 이동 속도 +1.5. 구역마다 수호자가 점점 빨라진다.';
    const full = S.spd >= CAPS.spd;
    g.append(
      cell(
        `<i class="sw" style="background:#7cc4ff">👟</i><b>운동화 Lv${S.spd}/${CAPS.spd}</b><span>이동 ${(14 + 1.5 * S.spd).toFixed(1)} → ${(14 + 1.5 * (S.spd + 1)).toFixed(1)}</span><em>${full ? 'MAX' : '✦ ' + fmt(spdCost(S.spd))}</em>`,
        full ? 'eq' : '',
        () => {
          if (!full)
            spend(spdCost(S.spd), () => {
              S.spd++;
              toast(`👟 Lv${S.spd}`);
            });
        }
      )
    );
  } else if (shopTab === 'slot') {
    hint.textContent = `기지에 행성을 놓는 칸 (최대 ${CAPS.slots.max}칸). 지금 ${S.slots}칸.`;
    const full = S.slots >= CAPS.slots.max;
    g.append(
      cell(
        `<i class="sw" style="background:#cfd6e6">🏠</i><b>칸 +1</b><span>${S.slots} → ${Math.min(CAPS.slots.max, S.slots + 1)}</span><em>${full ? 'MAX' : '✦ ' + fmt(slotCost(S.slots))}</em>`,
        full ? 'eq' : '',
        () => {
          if (!full)
            spend(slotCost(S.slots), () => {
              S.slots++;
              toast(`기지 ${S.slots}칸`);
            });
        }
      )
    );
  } else if (shopTab === 'look') {
    hint.textContent = '내 캐릭터를 꾸민다. 한 번 산 건 계속 바꿔 쓸 수 있다.';
    if (!LOOK[lookSub]) lookSub = 'hat';
    Object.keys(LOOK).forEach(k => {
      const b = document.createElement('button');
      b.textContent = LOOK[k].n;
      if (k === lookSub) b.classList.add('sel');
      b.onclick = () => {
        lookSub = k;
        renderShop();
      };
      sub.append(b);
    });
    LOOK[lookSub].v.forEach((v, i) => {
      const price = v[2],
        key = 'look' + lookSub + i,
        own = price === 0 || S.own[key],
        eq = S.look[lookSub] === i;
      const noneI = v[1] === '∅';
      g.append(
        cell(
          `<i class="sw" style="background:${noneI ? '#222' : v[1]}">${noneI ? '∅' : ''}</i><b>${v[0]}</b><em>${eq ? '착용 중' : own ? '착용하기' : '✦ ' + fmt(price)}</em>`,
          eq ? 'eq' : own ? 'own' : '',
          () => {
            const apply = () => {
              S.look[lookSub] = i;
              applyLook();
              save();
              renderShop();
            };
            if (own) apply();
            else
              spend(price, () => {
                S.own[key] = 1;
                S.look[lookSub] = i;
                applyLook();
                toast(`${v[0]} 착용!`);
              });
          }
        )
      );
    });
  } else {
    hint.textContent = '기지를 꾸민다. 한 번 산 건 계속 바꿔 쓸 수 있다.';
    Object.keys(DECO).forEach(k => {
      const b = document.createElement('button');
      b.textContent = DECO[k].n;
      if (k === shopSub) b.classList.add('sel');
      b.onclick = () => {
        shopSub = k;
        renderShop();
      };
      sub.append(b);
    });
    DECO[shopSub].v.forEach((v, i) => {
      const price = v[v.length - 1] as number,
        key = shopSub + i,
        own = price === 0 || S.own[key],
        eq = S.deco[shopSub] === i;
      const col = v[1];
      g.append(
        cell(
          `<i class="sw" style="background:${i === 0 && shopSub !== 'floor' && shopSub !== 'ped' ? '#222' : col}">${i === 0 && shopSub !== 'floor' && shopSub !== 'ped' ? '∅' : ''}</i><b>${v[0]}</b><em>${eq ? '적용 중' : own ? '적용하기' : '✦ ' + fmt(price)}</em>`,
          eq ? 'eq' : own ? 'own' : '',
          () => {
            const apply = () => {
              S.deco[shopSub] = i;
              applyDeco();
              save();
              renderShop();
            };
            if (own) apply();
            else
              spend(price, () => {
                S.own[key] = 1;
                S.deco[shopSub] = i;
                applyDeco();
              });
          }
        )
      );
    });
  }
}
