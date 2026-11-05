// 휴대폰 메신저 · 사진 앱 화면. 메시지 로직은 game/messenger.ts
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {CONTACTS, markRead, reply} from './messenger.js';
import {sfx} from '../audio/index.js';

const row = (h: string) => `<div class="phrow">${h}</div>`;
const KEY = 'sp_photos';
let photos: string[] = [];
try {
  photos = JSON.parse(localStorage.getItem(KEY) || '[]');
} catch (e) {}
const saveP = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(photos.slice(-8)));
  } catch (e) {}
};

export function renderChatList(body: HTMLElement) {
  const ids = Object.keys(CONTACTS);
  body.innerHTML = ids
    .map(id => {
      const msgs = S.chat.filter(m => m.from === id || m.from === 'me:' + id),
        last = msgs[msgs.length - 1],
        un = S.chat.filter(m => m.from === id && !m.read).length;
      return `<button class="phrow phchat" data-act="chat:${id}"><span style="font-size:26px">${CONTACTS[id].icon}</span><span style="flex:1;text-align:left"><b>${CONTACTS[id].name}</b><br><small>${last ? last.text : '대화 없음'}</small></span>${un ? `<span class="phdot">${un}</span>` : ''}</button>`;
    })
    .join('');
}
export function renderThread(body: HTMLElement, id: string) {
  markRead(id);
  const C = CONTACTS[id],
    msgs = S.chat.filter(m => m.from === id || m.from === 'me:' + id);
  body.innerHTML =
    `<div class="phtitle">${C.icon} ${C.name}</div><div class="phthread">` +
    (msgs.map(m => `<div class="phmsg ${m.from.startsWith('me') ? 'me' : ''}">${m.text}</div>`).join('') || row('아직 대화가 없습니다')) +
    `</div><div class="phrow" style="flex-wrap:wrap;justify-content:center">${C.replies.map(r => `<button class="phb" data-act="say:${id}:${r}">${r}</button>`).join('')}</div>`;
  const t = body.querySelector('.phthread');
  if (t) t.scrollTop = t.scrollHeight;
}
export function sayTo(id: string, text: string) {
  reply(id, text);
}

// ---------- 사진 ----------
export const photoCount = () => photos.length;
/** 지금 화면을 찍는다 (렌더 직후 같은 프레임에 캡처) */
export function snap(): boolean {
  G.renderer.render(G.scene, G.camera);
  const src: HTMLCanvasElement = G.renderer.domElement,
    c = document.createElement('canvas');
  c.width = 320;
  c.height = Math.round((320 * src.height) / src.width);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  try {
    photos.push(c.toDataURL('image/jpeg', 0.62));
    if (photos.length > 8) photos.shift();
    saveP();
  } catch (e) {
    return false;
  }
  sfx('shutter');
  const f = document.createElement('div');
  f.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:60;opacity:.9;transition:opacity .4s;pointer-events:none';
  document.body.append(f);
  requestAnimationFrame(() => (f.style.opacity = '0'));
  setTimeout(() => f.remove(), 500);
  return true;
}
export function renderGallery(body: HTMLElement, open = -1) {
  if (open >= 0 && photos[open]) {
    body.innerHTML = `<img src="${photos[open]}" style="width:100%;border-radius:10px"><div class="phrow" style="justify-content:center;gap:10px"><a class="phb" download="photo.jpg" href="${photos[open]}">저장</a><button class="phb" data-act="photodel:${open}">삭제</button></div>`;
    return;
  }
  body.innerHTML = `<button class="phb big" data-act="photosnap">📸 사진 찍기</button>${photos.length ? '' : row('찍은 사진이 없습니다')}<div class="phphotos">${photos.map((p, i) => `<img data-act="photo:${i}" src="${p}">`).join('')}</div>`;
}
export function deletePhoto(i: number) {
  photos.splice(i, 1);
  saveP();
}
