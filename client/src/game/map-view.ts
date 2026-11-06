// Native 2D map controller. No animation frame, game-camera mutation or 3D render lives here.
import {MAP_BOUNDS as B, mapPlaces, mapPlacePriority, currentMapPosition, type MapPlace} from './map-data.js';
import {paintMap, type MapMarker, type MapTransform} from './map-painter.js';
import {getWaypoint} from './phone-apps.js';
import {SECTORS} from '../data/sectors.js';
import {locked} from '../core/progress.js';
export {mapPlaces, mapPlacePriority, currentMapPosition};
export type {MapPlace};
export function mountMapView(canvas: HTMLCanvasElement, onSelect?: (place: MapPlace) => void) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D 지도를 표시할 수 없습니다.');
  const v: MapTransform = {width: 1, height: 1, centerX: (B.x0 + B.x1) / 2, centerZ: (B.z0 + B.z1) / 2, scale: 1},
    pointers = new Map<number, {x: number; y: number}>(), cleanup: (() => void)[] = [],
    oldStyle = {touchAction: canvas.style.touchAction, overscroll: canvas.style.overscrollBehavior, cursor: canvas.style.cursor};
  let minScale = 0.01, maxScale = 6, fitScale = 0.1, dpr = 1, destroyed = false, fitted = true, dirty = true,
    selected: string | null = null, markers: MapMarker[] = [], moved = false,
    previous: {x: number; y: number; distance: number} | null = null, safariScale = 1, safariGesture = false, travel = 0;
  let lastPlayer: ReturnType<typeof currentMapPosition> | null = null,
    lastWaypoint: ReturnType<typeof getWaypoint> | null = null, lastPlaces: readonly MapPlace[] | null = null, lastUnlocks = -1;
  canvas.style.touchAction = 'none'; canvas.style.overscrollBehavior = 'contain'; canvas.style.cursor = 'grab';
  const listen = (target: EventTarget, name: string, listener: EventListener, options?: AddEventListenerOptions) => {
    target.addEventListener(name, listener, options); cleanup.push(() => target.removeEventListener(name, listener, options));
  };
  const consume = (e: Event) => {if (e.cancelable) e.preventDefault(); e.stopPropagation();};
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const clampView = () => {
    v.scale = clamp(v.scale, minScale, maxScale);
    const mx = (B.x1 - B.x0) * 0.25, mz = (B.z1 - B.z0) * 0.25;
    v.centerX = clamp(v.centerX, B.x0 - mx, B.x1 + mx); v.centerZ = clamp(v.centerZ, B.z0 - mz, B.z1 + mz);
  };
  const worldToScreen = (x: number, z: number) => ({x: (x - v.centerX) * v.scale + v.width / 2, y: (z - v.centerZ) * v.scale + v.height / 2});
  const screenToWorld = (x: number, y: number) => ({x: (x - v.width / 2) / v.scale + v.centerX, z: (y - v.height / 2) / v.scale + v.centerZ});
  const point = (e: {clientX: number; clientY: number}) => {const r = canvas.getBoundingClientRect(); return {x: (e.clientX - r.left) * v.width / (r.width || v.width), y: (e.clientY - r.top) * v.height / (r.height || v.height)};};
  function draw() {
    if (destroyed) return;
    const player = currentMapPosition(), waypoint = getWaypoint(), places = mapPlaces(),
      unlocks = SECTORS.reduce((n, _, i) => n | (locked(i) ? 0 : 1 << i), 0);
    if (!dirty && lastPlayer && player.x === lastPlayer.x && player.z === lastPlayer.z && player.heading === lastPlayer.heading
      && player.inside === lastPlayer.inside && player.driving === lastPlayer.driving
      && waypoint === lastWaypoint && places === lastPlaces && unlocks === lastUnlocks) return;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    markers = paintMap(ctx!, v, places, selected, player, waypoint);
    lastPlayer = player; lastWaypoint = waypoint; lastPlaces = places; lastUnlocks = unlocks; dirty = false;
  }
  const changed = () => {fitted = false; clampView(); dirty = true; draw();};
  function fitAll() {
    if (destroyed) return;
    fitted = true; v.scale = fitScale; v.centerX = (B.x0 + B.x1) / 2; v.centerZ = (B.z0 + B.z1) / 2;
    dirty = true; draw();
  }
  function resize() {
    if (destroyed) return;
    const r = canvas.getBoundingClientRect();
    v.width = Math.max(1, canvas.clientWidth || r.width || 300); v.height = Math.max(1, canvas.clientHeight || r.height || 200);
    dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    fitScale = Math.max(0.005, Math.min(Math.max(1, v.width - 48) / (B.x1 - B.x0), Math.max(1, v.height - 48) / (B.z1 - B.z0)));
    minScale = fitScale * 0.7; maxScale = Math.max(6, fitScale * 8);
    const w = Math.round(v.width * dpr), h = Math.round(v.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {canvas.width = w; canvas.height = h;}
    if (fitted) fitAll(); else {clampView(); dirty = true; draw();}
  }
  function zoomAt(factor: number, x: number, y: number) {
    if (destroyed || !Number.isFinite(factor) || factor <= 0) return;
    const anchor = screenToWorld(x, y); v.scale = clamp(v.scale * factor, minScale, maxScale);
    v.centerX = anchor.x - (x - v.width / 2) / v.scale; v.centerZ = anchor.z - (y - v.height / 2) / v.scale; changed();
  }
  const zoomBy = (factor: number) => zoomAt(factor, v.width / 2, v.height / 2);
  function recenter() {
    if (destroyed) return;
    const player = currentMapPosition(); v.centerX = player.x; v.centerZ = player.z; v.scale = Math.max(fitScale * 4, 0.75); changed();
  }
  function focusPlace(place: MapPlace) {
    if (destroyed || !Number.isFinite(place.x) || !Number.isFinite(place.z)) return;
    selected = place.id; v.centerX = place.x; v.centerZ = place.z; v.scale = Math.max(v.scale, 0.9); changed();
  }
  const measure = () => {
    const a = pointers.values(), first = a.next().value!, second = a.next().value!;
    return {x: (first.x + second.x) / 2, y: (first.y + second.y) / 2, distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y))};
  };
  const down = (event: Event) => {
    const e = event as PointerEvent; consume(e); if (destroyed || e.pointerType === 'mouse' && e.button !== 0) return;
    if (!pointers.size) {moved = false; travel = 0;}
    pointers.set(e.pointerId, point(e));
    try {canvas.setPointerCapture(e.pointerId);} catch {}
    canvas.style.cursor = 'grabbing';
    if (pointers.size >= 2) {previous = measure(); moved = true;}
  };
  const move = (event: Event) => {
    const e = event as PointerEvent; consume(e); const old = pointers.get(e.pointerId); if (!old || destroyed) return;
    const next = point(e), dx = next.x - old.x, dy = next.y - old.y;
    travel += Math.hypot(dx, dy); if (travel > 4) moved = true;
    pointers.set(e.pointerId, next);
    if (pointers.size >= 2) {
      const current = measure(), prior = previous || current, anchor = screenToWorld(prior.x, prior.y);
      v.scale = clamp(v.scale * current.distance / prior.distance, minScale, maxScale);
      v.centerX = anchor.x - (current.x - v.width / 2) / v.scale; v.centerZ = anchor.z - (current.y - v.height / 2) / v.scale;
      previous = current;
    } else {v.centerX -= dx / v.scale; v.centerZ -= dy / v.scale;}
    changed();
  };
  const end = (event: Event) => {
    const e = event as PointerEvent; consume(e); if (!pointers.has(e.pointerId)) return;
    const tap = !moved && pointers.size === 1 && e.type === 'pointerup', at = point(e);
    pointers.delete(e.pointerId);
    try {if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);} catch {}
    previous = pointers.size >= 2 ? measure() : null;
    if (!pointers.size) canvas.style.cursor = 'grab';
    if (tap) {
      const hit = markers.filter(m => Math.hypot(at.x - m.x, at.y - m.y) <= 15)
        .sort((a, b) => Math.hypot(at.x - a.x, at.y - a.y) - Math.hypot(at.x - b.x, at.y - b.y))[0];
      const place = hit && mapPlaces().find(p => p.id === hit.id);
      if (place) {selected = place.id; dirty = true; draw(); onSelect?.(place);}
    }
  };
  listen(canvas, 'pointerdown', down); listen(canvas, 'pointermove', move);
  listen(canvas, 'pointerup', end); listen(canvas, 'pointercancel', end);
  listen(canvas, 'lostpointercapture', event => {
    const e = event as PointerEvent; pointers.delete(e.pointerId); previous = pointers.size >= 2 ? measure() : null;
    if (!pointers.size) canvas.style.cursor = 'grab';
  });
  listen(canvas, 'wheel', event => {
    const e = event as WheelEvent; consume(e); if (destroyed) return;
    const at = point(e), units = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? v.height : 1;
    if ((e.ctrlKey || e.metaKey) && safariGesture) return;
    if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(clamp(-e.deltaY * units * 0.01, -2, 2)), at.x, at.y);
    else {v.centerX += e.deltaX * units / v.scale; v.centerZ += e.deltaY * units / v.scale; changed();}
  }, {passive: false});
  listen(canvas, 'gesturestart', event => {consume(event); safariGesture = true; safariScale = (event as any).scale || 1; moved = true;});
  listen(canvas, 'gesturechange', event => {
    consume(event); if (pointers.size >= 2 || destroyed) return;
    const e = event as any, scale = e.scale || 1, r = canvas.getBoundingClientRect(),
      x = Number.isFinite(e.clientX) && e.clientX >= r.left && e.clientX <= r.right ? (e.clientX - r.left) * v.width / (r.width || v.width) : v.width / 2,
      y = Number.isFinite(e.clientY) && e.clientY >= r.top && e.clientY <= r.bottom ? (e.clientY - r.top) * v.height / (r.height || v.height) : v.height / 2;
    zoomAt(scale / safariScale, x, y); safariScale = scale;
  }, {passive: false});
  listen(canvas, 'gestureend', event => {consume(event); safariGesture = false;});
  for (const name of ['contextmenu', 'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove']) listen(canvas, name, consume);
  listen(window, 'resize', resize);
  listen(window, 'blur', () => {pointers.clear(); previous = null; safariGesture = false; canvas.style.cursor = 'grab';});
  const destroy = () => {
    if (destroyed) return; destroyed = true;
    for (const id of pointers.keys()) try {if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);} catch {}
    pointers.clear(); cleanup.forEach(fn => fn());
    canvas.style.touchAction = oldStyle.touchAction; canvas.style.overscrollBehavior = oldStyle.overscroll; canvas.style.cursor = oldStyle.cursor;
  };
  resize();
  return {draw, resize, recenter, fitAll, zoomBy, focusPlace, worldToScreen, screenToWorld,
    state: () => ({...v, center: {x: v.centerX, z: v.centerZ}, minScale, maxScale, zoom: v.scale / minScale, dpr,
      selected, dragging: pointers.size > 0, markers: markers.map(m => ({...m})), player: currentMapPosition(), destroyed}), destroy};
}
