// 가로 휴대폰 지도. 지도 엔진과 UI의 수명을 모달 한 번 열고 닫는 동안으로 한정한다.
import {G} from '../core/runtime.js';
import {openModal, closeModal} from './modal.js';
import {setWaypoint} from './phone-apps.js';
import {toast} from './hud.js';
import {mountMapView, mapPlaces, mapPlacePriority, currentMapPosition} from './map-view.js';

type Place = {id: string; name: string; icon: string; x: number; z: number};
type Phase = 'closed' | 'opening' | 'open' | 'closing';
let root: HTMLElement | null = null, controller: ReturnType<typeof mountMapView> | null = null,
  resizeObserver: ResizeObserver | null = null, phase: Phase = 'closed', places: readonly Place[] = [], selected: Place | null = null,
  raf = 0, openTimer = 0, closeTimer = 0, generation = 0, drawCount = 0, lastLabel = 0,
  returnFocus: HTMLElement | null = null;
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isWorldMapOpen = () => G.modal === 'world-map' && (phase === 'opening' || phase === 'open');
/** QA/debug snapshot; does not install another animation loop or retain a destroyed controller. */
export const worldMapState = () => ({phase, rafActive: raf !== 0, drawCount, selected: selected?.id || null,
  places: places.length, view: controller?.state() || null});

function resetInput() {
  for (const key of Object.keys(G.keys)) G.keys[key] = false;
  G.joy.x = G.joy.y = 0; G.jumpHeld = G.runHeld = false;
  document.dispatchEvent(new Event('game-input-reset'));
}
function distance(p: Place) {
  const me = currentMapPosition();
  return Math.round(Math.hypot(p.x - me.x, p.z - me.z));
}
function labelPosition() {
  const me = currentMapPosition();
  el('wm-position').textContent = me.inside ? '실내 · 건물 앞 위치' : me.driving ? '운전 중 · 현재 위치' : '현재 위치';
  if (selected) el('wm-distance').textContent = `현재 위치에서 ${distance(selected).toLocaleString()}m`;
}
function setPlacesOpen(on: boolean) {
  root?.classList.toggle('wm-places-open', on);
  el('wm-facilities').setAttribute('aria-expanded', String(on));
  if (on) el('wm-search').focus({preventScroll: true});
}
function choose(p: Place, focus = false) {
  selected = p;
  el('wm-detail').hidden = false;
  el('wm-selected-icon').textContent = p.icon;
  el('wm-selected-name').textContent = p.name;
  el<HTMLButtonElement>('wm-waypoint').disabled = false;
  if (focus) controller?.focusPlace(p);
  root?.querySelectorAll<HTMLButtonElement>('[data-place-id]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.placeId === p.id)));
  const hadDrawerFocus = root?.classList.contains('wm-places-open') && el('wm-places').contains(document.activeElement);
  setPlacesOpen(false);
  if (hadDrawerFocus) el('wm-facilities').focus({preventScroll: true});
  labelPosition();
}
function renderPlaces() {
  const query = el<HTMLInputElement>('wm-search').value.trim().toLocaleLowerCase(),
    visible = places.filter(p => query ? p.name.toLocaleLowerCase().includes(query) : mapPlacePriority(p.id) >= 60);
  visible.sort((a, b) => (!query ? mapPlacePriority(b.id) - mapPlacePriority(a.id) : 0) || distance(a) - distance(b));
  const fragment = document.createDocumentFragment();
  for (const p of visible.slice(0, 80)) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'wm-place';
    button.dataset.placeId = p.id; button.setAttribute('aria-pressed', String(selected?.id === p.id));
    const icon = document.createElement('span'); icon.className = 'wm-place-icon'; icon.textContent = p.icon; icon.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span'); name.className = 'wm-place-name'; name.textContent = p.name;
    const meters = document.createElement('small'); meters.textContent = `${distance(p).toLocaleString()}m`;
    button.append(icon, name, meters); button.onclick = () => choose(p, true); fragment.append(button);
  }
  if (!visible.length) {
    const empty = document.createElement('p'); empty.className = 'wm-empty'; empty.textContent = '검색한 장소가 없습니다.'; fragment.append(empty);
  }
  el('wm-places').replaceChildren(fragment);
  el('wm-result-count').textContent = visible.length > 80 ? `${visible.length}곳 중 80곳` : `${visible.length}곳 · ${query ? '가까운 순' : '주요시설 순'}`;
}
function dom() {
  if (root) return root;
  root = document.createElement('section'); root.id = 'world-map'; root.className = 'wm-overlay'; root.hidden = true;
  root.dataset.state = 'closed'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'wm-title');
  root.innerHTML = `<div class="wm-scene"><div class="wm-phone">
    <i class="wm-side wm-side-a" aria-hidden="true"></i><i class="wm-side wm-side-b" aria-hidden="true"></i>
    <i class="wm-speaker" aria-hidden="true"></i><div class="wm-screen">
      <header class="wm-header"><div class="wm-heading"><span class="wm-app-icon" aria-hidden="true">↗</span><div><h2 id="wm-title">지도</h2><span id="wm-position">현재 위치</span></div></div>
        <div class="wm-header-actions"><button id="wm-facilities" type="button" aria-expanded="false" aria-controls="wm-places">⌕ 장소</button><button id="wm-fit" type="button">전체 보기</button><button id="wm-recenter" type="button">◎ <span>현재 위치</span></button><button id="wm-close" type="button" aria-label="지도 닫기">×</button></div></header>
      <div class="wm-content"><aside class="wm-sidebar" aria-label="장소 찾기"><label class="wm-search-label" for="wm-search"><span aria-hidden="true">⌕</span><input id="wm-search" type="search" placeholder="장소·시설 찾기" autocomplete="off" spellcheck="false" aria-label="장소·시설 찾기"></label>
        <div class="wm-list-heading"><b>주요 장소</b><span id="wm-result-count" aria-live="polite"></span></div><div id="wm-places" class="wm-places"></div></aside>
        <div class="wm-map-area"><canvas id="wm-canvas" aria-label="세계 지도. 드래그·스크롤로 이동하고 핀치로 확대하세요."></canvas>
          <div class="wm-map-badge" aria-hidden="true"><b>지금, 여기</b><span>도시에서 섬까지</span></div>
          <div class="wm-zoom" aria-label="지도 확대 축소"><button id="wm-zoom-in" type="button" aria-label="지도 확대">+</button><button id="wm-zoom-out" type="button" aria-label="지도 축소">−</button></div>
          <section id="wm-detail" class="wm-detail" aria-label="선택한 장소" hidden><span id="wm-selected-icon" aria-hidden="true"></span><div><h3 id="wm-selected-name"></h3><p id="wm-distance"></p></div><button id="wm-waypoint" type="button" disabled>길안내 시작 <span aria-hidden="true">↗</span></button></section>
          <p class="wm-map-help">드래그·스크롤 이동 · 핀치 확대</p></div></div>
      <footer class="wm-footer"><span><i></i> 현재 위치</span><span>시설을 선택해 길안내를 시작하세요</span><kbd>M / Esc 닫기</kbd></footer>
    </div><div class="wm-grip wm-grip-left" aria-hidden="true"><i></i><i></i><i></i></div><div class="wm-grip wm-grip-right" aria-hidden="true"><i></i><i></i><i></i></div></div></div>`;
  document.body.append(root);
  el('wm-close').onclick = closeWorldMap;
  el('wm-recenter').onclick = () => controller?.recenter();
  el('wm-fit').onclick = () => controller?.fitAll();
  el('wm-zoom-in').onclick = () => controller?.zoomBy(1.25);
  el('wm-zoom-out').onclick = () => controller?.zoomBy(0.8);
  el('wm-search').oninput = renderPlaces;
  el('wm-facilities').onclick = () => setPlacesOpen(!root!.classList.contains('wm-places-open'));
  el('wm-waypoint').onclick = () => {
    if (!selected) return;
    setWaypoint({x: selected.x, z: selected.z, name: selected.name});
    toast(`${selected.name} 길안내를 시작합니다`); closeWorldMap();
  };
  root.addEventListener('click', e => {if (e.target === root) closeWorldMap(); e.stopPropagation();});
  for (const event of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend']) root.addEventListener(event, e => e.stopPropagation(), {passive: true});
  root.addEventListener('wheel', e => e.stopPropagation(), {passive: true});
  root.addEventListener('contextmenu', e => {e.preventDefault(); e.stopPropagation();});
  root.addEventListener('keydown', e => {
    // M/Escape belong to the shared input handler, including the editable-input exception.
    if (e.code === 'Escape' || e.code === 'KeyM') return;
    e.stopPropagation();
    if (e.code !== 'Tab') return;
    const nodes = [...root!.querySelectorAll<HTMLElement>('button:not(:disabled),input,[tabindex="0"]')].filter(n => n.getClientRects().length);
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {e.preventDefault(); last?.focus();}
    else if (!e.shiftKey && document.activeElement === last) {e.preventDefault(); first?.focus();}
  });
  root.addEventListener('keyup', e => e.stopPropagation());
  return root;
}
const resize = () => controller?.resize();
function disposeView() {
  if (raf) cancelAnimationFrame(raf); raf = 0;
  controller?.destroy(); controller = null;
  resizeObserver?.disconnect(); resizeObserver = null;
  removeEventListener('resize', resize);
}
function beginClose() {
  const ticket = ++generation;
  clearTimeout(openTimer); clearTimeout(closeTimer); openTimer = closeTimer = 0;
  disposeView(); resetInput();
  phase = 'closing'; root!.dataset.state = phase; root!.setAttribute('aria-hidden', 'true');
  const finish = () => {
    if (ticket !== generation || G.modal === 'world-map') return;
    phase = 'closed'; root!.dataset.state = phase; root!.hidden = true; closeTimer = 0;
    if (!G.modal) {
      const target = returnFocus?.isConnected && returnFocus.getClientRects().length ? returnFocus : document.getElementById('mapBtn');
      target?.focus({preventScroll: true});
    }
  };
  if (reduced()) finish(); else closeTimer = window.setTimeout(finish, 280);
}
export function openWorldMap() {
  if (!G.started || G.quizOpen || G.shopOpen || G.dexOpen || G.cine?.lock || G.modal && G.modal !== 'phone' && G.modal !== 'world-map') return;
  if (G.modal === 'world-map' && (phase === 'opening' || phase === 'open')) return;
  const overlay = dom(), ticket = ++generation;
  clearTimeout(openTimer); clearTimeout(closeTimer); openTimer = closeTimer = 0;
  disposeView();
  if (!overlay.contains(document.activeElement)) returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  overlay.hidden = false; overlay.setAttribute('aria-hidden', 'false'); phase = 'opening'; overlay.dataset.state = phase;
  // Restart a closing animation cleanly when M is pressed again before it finishes.
  overlay.classList.remove('on'); void overlay.offsetWidth;
  openModal('world-map', beginClose); resetInput();
  places = mapPlaces(); selected = null; drawCount = 0; lastLabel = 0;
  setPlacesOpen(false);
  el<HTMLInputElement>('wm-search').value = ''; el('wm-detail').hidden = true;
  el<HTMLButtonElement>('wm-waypoint').disabled = true;
  controller = mountMapView(el<HTMLCanvasElement>('wm-canvas'), p => choose(p));
  renderPlaces(); labelPosition();
  resizeObserver = new ResizeObserver(resize); resizeObserver.observe(el('wm-canvas').parentElement!);
  addEventListener('resize', resize); controller.resize();
  const tick = (now: number) => {
    if (ticket !== generation || G.modal !== 'world-map' || !controller) {raf = 0; return;}
    controller.draw(); drawCount++;
    if (now - lastLabel > 400) {labelPosition(); lastLabel = now;}
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  el('wm-close').focus({preventScroll: true});
  const opened = () => {if (ticket === generation && G.modal === 'world-map') {phase = 'open'; overlay.dataset.state = phase; controller?.resize();} openTimer = 0;};
  openTimer = window.setTimeout(opened, reduced() ? 0 : 760);
}
export function closeWorldMap() {
  if (G.modal === 'world-map') closeModal();
  else if (phase === 'open' || phase === 'opening') beginClose();
}
export function toggleWorldMap() {if (G.modal === 'world-map') closeWorldMap(); else openWorldMap();}
