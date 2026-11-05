// HUD 보조: 토스트/플래시/정보 문구
import {MUT} from '../data/planets.js';
import {ICONS, type IconKey} from '../data/cutscene-icons.js';
import {G} from '../core/runtime.js';
import {$} from '../core/util.js';
import type {HudSlot, HudWidget, Owned, Planet} from '../core/types.js';

/** 문장 토스트 — 시스템 오류(저장 실패 등) 전용. 스토리·튜토리얼·알림 경로는 iconToast 만 쓴다 (UX_CUTSCENE 4.3·9장 #1) */
export function toast(m: string, sec?: number) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('on');
  G.toastT = sec || 2.2;
}
export function flash(c: string, o?: number) {
  const f = $('#flash');
  f.style.background = c;
  f.style.opacity = String(o || 0.5);
  setTimeout(() => (f.style.opacity = '0'), 250);
}
export function infoHTML(p: Planet, o: Owned | null) {
  return (
    `<b>${p.name}</b> · ${p.grp} · 중력 <i>${p.g.toFixed(2)}g</i> · 탈출속도 <i>${p.ve.toFixed(1)}km/s</i>` +
    (o && o.mut ? ` · <i>${MUT[o.mut][0]}</i>` : '') +
    (o && o.st ? ' · <i>연구됨 ✔ ×1.5</i>' : '') +
    `<br>${p.fact}`
  );
}
/** HUD 상태 줄 확장 포인트: 후속 기능이 한 줄씩 추가한다 (null/빈 문자열이면 그 줄은 숨김). 시스템의 hud() 도 여기로 등록된다 */
export const hudLines: (() => string | null)[] = [];
export const addHudLine = (f: () => string | null) => hudLines.push(f);
/** 매 프레임: #lines 에 줄들을 그린다 (바뀔 때만 DOM 갱신) */
let linesTxt = '';
export function renderHudLines() {
  const t = hudLines
    .map(f => f())
    .filter(Boolean)
    .join('\n');
  if (t !== linesTxt) {
    linesTxt = t;
    $('#lines').textContent = t;
  }
  renderHudWidgets();
}

/** 이모지 + 외곽 shape 아이콘 한 개 (aria-label 은 스크린리더용 한 단어 key) */
export function iconEl(k: IconKey): HTMLElement {
  const [e, shape] = ICONS[k],
    el = document.createElement('span');
  el.className = 'ic ic-' + shape;
  el.dataset.shape = shape;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', k);
  el.textContent = e;
  return el;
}
/** 문장 없는 알림: 아이콘 1~3개를 화면 중앙 하단 위에 sec 초. 큐 최대 2개, 같은 아이콘 연속은 ×n 으로 합침, 컷신·오버레이 중엔 보류했다가 flushIconToasts */
const held: IconKey[][] = [],
  shown: {key: string; n: number; el: HTMLElement; cnt: HTMLElement; tm: number}[] = [];
export function iconToast(icons: IconKey[], sec = 1.2) {
  if (G.cine) {
    if (held.length < 2) held.push(icons);
    return;
  }
  const key = icons.join(),
    box = $('#itoast'),
    last = shown[shown.length - 1];
  const expire = (it: (typeof shown)[number]) => {
    clearTimeout(it.tm);
    it.tm = window.setTimeout(() => {
      it.el.remove();
      shown.splice(shown.indexOf(it), 1);
    }, sec * 1000);
  };
  if (last && last.key === key) {
    last.cnt.textContent = '×' + ++last.n;
    expire(last);
    return;
  }
  const el = document.createElement('div'),
    cnt = document.createElement('span');
  el.className = 'itk'; // 상점 칸(.it)과 이름이 겹쳐 글자가 커지던 문제로 분리
  icons.slice(0, 3).forEach(k => el.append(iconEl(k)));
  cnt.className = 'cnt';
  el.append(cnt);
  box.append(el);
  const it = {key, n: 1, el, cnt, tm: 0};
  shown.push(it);
  expire(it);
  while (shown.length > 2) {
    const o = shown.shift()!;
    clearTimeout(o.tm);
    o.el.remove();
  }
}
export const flushIconToasts = () => held.splice(0).forEach(i => iconToast(i));

/** 글 없는 HUD 위젯 확장 포인트 (UX_CUTSCENE 10.3.2): 슬롯별·총량 상한을 렌더러가 강제, 넘치면 priority 낮은 것부터 숨김 */
export const SLOT_CAP: Record<HudSlot, number> = {TL: 2, TC: 1, TR: 2, L1: 1, L2: 1, RM: 1},
  WIDGET_CAP = 6;
export const hudWidgets: (() => HudWidget | null)[] = [];
export const addHudWidget = (f: () => HudWidget | null) => hudWidgets.push(f);
let wKey = '';
const wFill = new Map<string, HTMLElement>();
export function renderHudWidgets() {
  const used: Record<string, number> = {},
    list = hudWidgets
      .map(f => f())
      .filter((w): w is HudWidget => !!w)
      .sort((a, b) => b.priority - a.priority)
      .filter(w => (used[w.slot] = (used[w.slot] || 0) + 1) <= SLOT_CAP[w.slot])
      .slice(0, WIDGET_CAP),
    key = list.map(w => w.id + w.slot + w.icons.join()).join('|');
  if (key !== wKey) {
    wKey = key;
    wFill.clear();
    const box = $('#widgets');
    box.replaceChildren();
    (Object.keys(SLOT_CAP) as HudSlot[]).forEach(sl => {
      const ws = list.filter(w => w.slot === sl);
      if (!ws.length) return;
      const col = document.createElement('div');
      col.className = 'slot';
      col.dataset.slot = sl;
      ws.forEach(w => {
        const el = document.createElement('div');
        el.className = 'wg';
        w.icons.slice(0, 3).forEach(k => el.append(iconEl(k)));
        if (w.fill !== undefined) {
          const bar = document.createElement('i');
          bar.className = 'fill';
          el.append(bar);
          wFill.set(w.id, bar);
        }
        col.append(el);
      });
      box.append(col);
    });
  }
  list.forEach(w => w.fill !== undefined && wFill.get(w.id)?.style.setProperty('--f', String(Math.max(0, Math.min(1, w.fill)))));
}
