// 범용 오버레이: index.html 의 <div class="hud ov" id="..."> 를 열고 닫는다 (열려 있으면 paused(), Esc 로 닫힘)
import {G, releaseLock} from '../core/runtime.js';
import {$} from '../core/util.js';
import {sfx} from '../audio/index.js';

export function openModal(id: string, onClose?: () => void) {
  if (G.modal) closeModal();
  G.modal = id;
  G.modalClose = onClose || null;
  releaseLock();
  $('#' + id).classList.add('on');
  sfx('open');
}
export function closeModal() {
  if (!G.modal) return;
  const f = G.modalClose;
  $('#' + G.modal).classList.remove('on');
  sfx('close');
  G.modal = null;
  G.modalClose = null;
  if (f) f();
}
