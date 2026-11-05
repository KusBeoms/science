// W6 DOWNTOWN 엘리베이터 연출(글 최소): 큰 층 숫자 이모지가 올라가고(1→…→꼭대기), 옥상 전망(도시 실루엣 + 낮/밤 하늘)이 잠깐 보였다가 내려온다.
import {G} from '../core/runtime.js';
import {sfx} from '../audio/index.js';

const DIG = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const num = (n: number) => [...String(n)].map(c => DIG[+c]).join('');
let el: HTMLElement | null = null,
  busy = false;
/** 연출 중인가 (테스트용) */
export const liftBusy = () => busy;

export function rideLift(icon = '🛗', top = 36) {
  if (busy) return;
  busy = true;
  if (!el) {
    el = document.createElement('div');
    el.id = 'lift';
    el.style.cssText = 'position:fixed;inset:0;z-index:70;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-size:64px;color:#fff;pointer-events:none;transition:opacity .4s;opacity:0;text-shadow:0 2px 10px #0008';
    document.body.appendChild(el);
  }
  const e = el,
    night = G.night > 0,
    sky = night ? 'linear-gradient(#0b1030,#27306b 60%,#f5b73a55)' : 'linear-gradient(#6fb6ff,#cfe9ff 70%,#ffe9b0)';
  e.style.background = '#151822';
  e.style.display = 'flex';
  sfx('buy');
  requestAnimationFrame(() => (e.style.opacity = '1'));
  const t0 = performance.now(),
    DUR = 2600,
    tick = () => {
      const t = Math.min(1, (performance.now() - t0) / DUR),
        f = Math.max(1, Math.round(1 + (top - 1) * t * t));
      if (t < 0.7) e.innerHTML = `<div>${icon}</div><div>${num(f)}</div><div style="font-size:40px;opacity:.85">⬆️ ⬆️ ⬆️</div>`;
      else {
        e.style.background = sky;
        e.innerHTML = `<div style="font-size:84px">${night ? '🌃' : '🏙️'}</div><div style="font-size:44px">${night ? '🌙 ✨ 🏢 🏢 🏬 🏢 ✨' : '☁️ 🏢 🏬 🏢 🏢 🏬 ☁️'}</div><div>${num(top)}</div>`;
      }
      if (t < 1) return requestAnimationFrame(tick);
      setTimeout(() => {
        e.style.opacity = '0';
        sfx('buy');
        setTimeout(() => {
          e.style.display = 'none';
          busy = false;
        }, 420);
      }, 1100);
    };
  tick();
}
