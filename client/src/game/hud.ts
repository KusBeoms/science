// HUD 보조: 토스트/플래시/정보 문구
import {MUT} from '../data/planets.js';
import {G} from '../core/runtime.js';
import {$} from '../core/util.js';
import type {Owned, Planet} from '../core/types.js';

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
}
