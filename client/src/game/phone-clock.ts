// 휴대폰 시계 앱: 게임 속 시각(낮 12분 + 밤 4분 = 하루)을 아날로그+디지털로, 해/달 진행 막대와 함께 보여 준다.
import {G} from '../core/runtime.js';
import {DAY_S, NIGHT_S, clockHours, clockText} from '../core/clock.js';

let timer = 0;
const f = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const hand = (deg: number, len: number, w: number, c: string) =>
  `<line x1="50" y1="50" x2="50" y2="${50 - len}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" transform="rotate(${deg} 50 50)"/>`;

function paint() {
  const el = document.getElementById('phclock');
  if (!el) return stop();
  const night = G.night > 0,
    h = clockHours(G.cycT, G.night),
    left = night ? G.night : DAY_S - G.cycT,
    pct = night ? 1 - G.night / NIGHT_S : G.cycT / DAY_S;
  el.innerHTML =
    `<svg viewBox="0 0 100 100" width="150" height="150"><circle cx="50" cy="50" r="47" fill="${night ? '#161a33' : '#fff7e0'}" stroke="#555" stroke-width="3"/>` +
    [...Array(12)].map((_, i) => `<line x1="50" y1="6" x2="50" y2="${i % 3 ? 10 : 14}" stroke="${night ? '#aab' : '#444'}" stroke-width="${i % 3 ? 1.5 : 3}" transform="rotate(${i * 30} 50 50)"/>`).join('') +
    hand((h % 12) * 30 + (h % 1) * 30, 24, 4, night ? '#fff' : '#222') +
    hand((h % 1) * 360, 36, 2.5, night ? '#dde' : '#333') +
    `<circle cx="50" cy="50" r="3" fill="#e5483f"/></svg>` +
    `<div style="font-size:30px;font-weight:700;margin:6px 0">${night ? '🌙' : '☀️'} ${clockText(G.cycT, G.night)}</div>` +
    `<div style="height:12px;border-radius:8px;background:#0003;overflow:hidden;margin:6px 8px"><i style="display:block;height:100%;width:${(pct * 100).toFixed(1)}%;background:${night ? '#6a78d8' : '#f3c64a'}"></i></div>` +
    `<div style="opacity:.85">${night ? '해가 뜰 때까지' : '해가 질 때까지'} ${f(left)}</div>`;
}
function stop() {
  clearInterval(timer);
  timer = 0;
}
export function renderClock(body: HTMLElement) {
  body.innerHTML = '<div id="phclock" style="text-align:center;padding-top:10px"></div>';
  paint();
  stop();
  timer = window.setInterval(paint, 400);
}
export const stopClock = stop;
