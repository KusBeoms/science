// 입력: 키보드·마우스·터치·포인터락·조이스틱·화면 클릭 선택
import {openPhone} from '../game/phone.js';
import {G, paused} from '../core/runtime.js';
import {clamp, $} from '../core/util.js';
import {answer, closeQuiz, nextQ} from '../game/quiz.js';
import {act} from '../game/actions.js';
import {clickPick} from '../game/interactables.js';
import {closeModal} from '../game/modal.js';
import {closeShop} from '../game/shop-ui.js';
import {toggleDex} from '../game/dex.js';
import {startGame} from './ui.js';

export const TOUCH =
  matchMedia('(hover:none) and (pointer:coarse)').matches ||
  /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) ||
  (/Mac/.test(navigator.platform) && navigator.maxTouchPoints > 1);
if (TOUCH) document.body.classList.add('touch');
const ray: any = typeof THREE !== 'undefined' ? new THREE.Raycaster() : null;
function clickAt(cx: number, cy: number) {
  if (paused()) return;
  const v = new THREE.Vector2((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(v, G.camera);
  const groups: any[] = [G.npc];
  G.chunks.forEach(c => {
    if (!c) return;
    c.nest.forEach(m => m.grp && groups.push(m.grp));
    groups.push(c.gate.grp);
  });
  G.baseMesh.forEach(m => m.grp && groups.push(m.grp));
  Object.keys(G.pads).forEach(id => groups.push(G.pads[id].grp));
  const vis = (o: any) => {
    for (; o; o = o.parent) if (!o.visible) return false;
    return true;
  }; // Raycaster는 숨겨진 객체도 맞히므로 보이는 것만 고른다
  const hit = ray.intersectObjects(groups, true).find((h: any) => vis(h.object));
  if (!hit) return;
  let o = hit.object;
  while (o && !(o.userData && o.userData.pick)) o = o.parent;
  if (!o) return;
  clickPick(o.userData.pick, pk => (G.pickOv = {pk, t: 4}));
}
export function setLock(on: boolean) {
  G.lockMode = on;
  $('#lockBtn').classList.toggle('on', on);
  if (!TOUCH) {
    if (on) {
      try {
        const p = G.renderer.domElement.requestPointerLock();
        p && p.catch && p.catch(() => setLock(false));
      } catch (e) {}
    } else if (document.pointerLockElement) document.exitPointerLock();
    $('#cross').style.display = on ? 'block' : 'none';
  }
}
$('#lockBtn').onclick = e => {
  (e.target as HTMLElement).blur();
  setLock(!G.lockMode);
};
document.addEventListener('pointerlockchange', () => {
  if (!TOUCH && G.lockMode && !document.pointerLockElement) setLock(false);
});
document.addEventListener('pointerlockerror', () => setLock(false));
const rot = (dx: number, dy: number) => {
  G.yaw -= dx * 0.006;
  G.pitch = clamp(G.pitch + dy * 0.005, 0.05, 1.35);
};
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement) {
    G.yaw -= e.movementX * 0.003;
    G.pitch = clamp(G.pitch + e.movementY * 0.003, 0.05, 1.35);
  }
});
export function setupPointers() {
  const cv = G.renderer.domElement,
    ptrs = new Map<number, {x: number; y: number; sx: number; sy: number; t: number}>(),
    cap_ = (el: HTMLElement, id: number) => {
      try {
        el.setPointerCapture(id);
      } catch (e) {}
    };
  let mdrag: {x: number; y: number; moved: number} | null = null,
    pinch: {d: number; mx: number; my: number} | null = null,
    tap = false;
  const meas = () => {
    const a = [...ptrs.values()];
    return {d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2};
  };
  cv.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (document.pointerLockElement) {
        clickAt(innerWidth / 2, innerHeight / 2);
        return;
      }
      mdrag = {x: e.clientX, y: e.clientY, moved: 0};
      cap_(cv, e.pointerId);
      if (!paused()) setLock(true); // 클릭하면 마우스가 사라지고 시점 고정
      return;
    }
    cap_(cv, e.pointerId);
    ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now()});
    if (ptrs.size === 2) {
      tap = false;
      pinch = meas();
    } else if (ptrs.size === 1) tap = true;
    else tap = false;
  });
  cv.addEventListener('pointermove', (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (!mdrag || document.pointerLockElement) return;
      const dx = e.clientX - mdrag.x,
        dy = e.clientY - mdrag.y;
      mdrag.moved += Math.abs(dx) + Math.abs(dy);
      rot(dx, dy);
      mdrag.x = e.clientX;
      mdrag.y = e.clientY;
      return;
    }
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (ptrs.size === 2) {
      // 두 손가락: 핀치 줌 + 회전
      const m = meas();
      G.camDist = clamp((G.camDist * pinch!.d) / m.d, 4, 36);
      rot(m.mx - pinch!.mx, m.my - pinch!.my);
      pinch = m;
      tap = false;
    } else if (ptrs.size === 1) {
      rot(dx, dy);
      if (Math.hypot(p.x - p.sx, p.y - p.sy) > 10) tap = false;
    } // 터치: 한 손가락 드래그로 시점 회전
  });
  const end = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (mdrag && mdrag.moved < 5) clickAt(e.clientX, e.clientY);
      mdrag = null;
      return;
    }
    const p = ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    if (p && tap && ptrs.size === 0 && performance.now() - p.t < 450) clickAt(p.x, p.y);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) tap = false;
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  // 트랙패드: 두 손가락 스크롤 = 화면 회전, 핀치(ctrl+휠) = 줌, 마우스 휠 = 줌
  addEventListener(
    'wheel',
    e => {
      if (paused()) return;
      e.preventDefault();
      if (e.ctrlKey) {
        G.camDist = clamp(G.camDist + e.deltaY * 0.06, 4, 36);
        return;
      }
      const wheelMouse =
        e.deltaMode === 1 ||
        (e.deltaX === 0 && Math.abs(e.deltaY) >= 100 && Number.isInteger(e.deltaY) && e.deltaY % 100 === 0);
      if (wheelMouse) {
        G.camDist = clamp(G.camDist + Math.sign(e.deltaY) * 2, 4, 36);
        return;
      }
      G.yaw += e.deltaX * 0.006;
      G.pitch = clamp(G.pitch - e.deltaY * 0.005, 0.05, 1.35);
    },
    {passive: false}
  );
  let gsc = 1;
  // Safari 제스처 이벤트: 데스크탑 트랙패드 핀치에서만 줌에 쓴다. 터치 기기에서는 조이스틱 손가락 + 화면 손가락이 핀치로 오인되므로 줌에 쓰지 않는다(기본 동작만 막음).
  addEventListener('gesturestart', (e: any) => {
    e.preventDefault();
    gsc = e.scale || 1;
  });
  addEventListener('gesturechange', (e: any) => {
    e.preventDefault();
    if (TOUCH) return;
    G.camDist = clamp((G.camDist * gsc) / (e.scale || 1), 4, 36);
    gsc = e.scale || 1;
  });
  addEventListener('contextmenu', e => e.preventDefault());
  // 터치 컨트롤
  const joyEl = $('#joy'),
    knob = $('#knob');
  let jp: number | null = null;
  const jmove = (e: PointerEvent) => {
    const r = joyEl.getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    let dx = e.clientX - cx,
      dy = e.clientY - cy;
    const m = Math.hypot(dx, dy),
      RR = r.width / 2;
    if (m > RR) {
      dx *= RR / m;
      dy *= RR / m;
    }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    G.joy.x = dx / RR;
    G.joy.y = -dy / RR;
  };
  joyEl.addEventListener('pointerdown', e => {
    jp = e.pointerId;
    cap_(joyEl, jp);
    jmove(e);
  });
  joyEl.addEventListener('pointermove', e => {
    if (e.pointerId === jp) jmove(e);
  });
  const jend = (e: PointerEvent) => {
    if (e.pointerId === jp) {
      jp = null;
      G.joy.x = G.joy.y = 0;
      knob.style.transform = '';
    }
  };
  joyEl.addEventListener('pointerup', jend);
  joyEl.addEventListener('pointercancel', jend);
  const hold = (id: string, on: (v: boolean) => void) => {
    const el = $(id);
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      cap_(el, e.pointerId);
      on(true);
      el.classList.add('on');
    });
    ['pointerup', 'pointercancel'].forEach(t =>
      el.addEventListener(t, () => {
        on(false);
        el.classList.remove('on');
      })
    );
  };
  hold('#jump', v => (G.jumpHeld = v));
  hold('#run', v => (G.runHeld = v));
}

/** 키보드 / 창 이벤트 (원본 init() 의 리스너) */
export function setupKeys() {
  addEventListener('keydown', e => {
    if (!G.started) {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        startGame();
      }
      return;
    }
    if (G.quizOpen) {
      if (e.code === 'Escape') closeQuiz(false);
      else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!e.repeat) nextQ();
      } else {
        const n = +e.code.replace('Digit', '');
        if (n >= 1 && n <= 4) answer(n - 1);
      }
      return;
    }
    if (G.dexOpen) {
      if (e.code === 'Escape' || e.code === 'KeyB') toggleDex(false);
      return;
    }
    if (G.shopOpen) {
      if (e.code === 'Escape') closeShop();
      return;
    }
    if (G.modal) {
      if (e.code === 'Escape') closeModal();
      return;
    }
    if (e.repeat && performance.now() - G.quizClosedAt < 700) {
      e.preventDefault();
      return;
    } // 퀴즈를 닫은 키의 반복 입력이 점프로 새지 않게
    G.keys[e.code] = true;
    if (e.code === 'KeyE') act('e');
    if (e.code === 'KeyF') act('f');
    if (e.code === 'KeyB') toggleDex(true);
    if (e.code === 'KeyP') openPhone();
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', e => (G.keys[e.code] = false));
  addEventListener('blur', () => {
    Object.keys(G.keys).forEach(k => (G.keys[k] = false));
    G.runHeld = G.jumpHeld = false;
  }); // 창을 벗어나면 눌린 키가 계속 눌린 채로 남는 문제 방지
  addEventListener('resize', () => {
    G.renderer.setSize(innerWidth, innerHeight);
    G.camera.aspect = innerWidth / innerHeight;
    G.camera.updateProjectionMatrix();
  });
}
