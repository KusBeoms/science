// 부팅: (서버 복원) → 씬 구성 → 입력/버튼 바인딩 → 루프 시작
import {S, save, applySave, hadLocalSave} from './core/state.js';
import {G} from './core/runtime.js';
import {$} from './core/util.js';
import {fetchRemoteSave} from './net/api.js';
import {initWorld} from './render/world.js';
import {setupKeys, setupPointers} from './systems/input.js';
import {bindUI} from './systems/ui.js';
import {frame} from './systems/loop.js';
import './systems/index.js';
import './debug.js';
import {showGallery} from './render/lowpoly/gallery.js';

async function main() {
  if (typeof THREE === 'undefined') {
    const e = $('#err');
    e.style.display = 'block';
    e.textContent = 'three.js를 불러오지 못했습니다 (인터넷 연결 필요).';
    return;
  }
  if (/[?&]gallery=1/.test(location.search)) {
    showGallery();
    return;
  }
  if (!hadLocalSave) {
    // 로컬 세이브가 없을 때만 서버 세이브를 1회 시도
    const remote = await fetchRemoteSave();
    if (remote && applySave(remote)) save();
  }
  bindUI();
  G.saveI = window.setInterval(save, 5000);
  addEventListener('pagehide', () => {
    if (!G.resetting) save();
  }); // 탭을 닫아도 최근 5초 진행이 사라지지 않게
  initWorld();
  setupKeys();
  setupPointers();
  frame();
}
main();
