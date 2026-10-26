/* 키보드 입력: 글자·숫자·기호 키 어느 것이든 누르면 성운이 하나 생긴다.
   ev.key 대신 ev.code로 판정하므로 한글 IME 상태에서도 똑같이 동작한다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const RT = Gp._runtime;
  const state = G.state;

  const SPAWN_KEYS = /^(Key|Digit|Numpad|Minus|Equal|Bracket|Semicolon|Quote|Comma|Period|Slash|Backslash|Backquote|Space|IntlBackslash)/;
  // 입력이 너무 빽빽하면 화면이 입자로 가득 차므로 아주 짧은 간격만 걸러낸다
  const MIN_GAP_MS = 55;
  let lastSpawn = 0;

  function labelFor(ev: KeyboardEvent): string {
    if (ev.key && ev.key.length === 1) return ev.key === ' ' ? '·' : ev.key.toUpperCase();
    return ev.code.replace(/^(Key|Digit|Numpad)/, '').slice(0, 2);
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!state.started || state.gameOver || RT.introPlaying || RT.timeSkipping || state.collapseRush) return;
    if (!SPAWN_KEYS.test(ev.code)) return;
    // 스페이스·슬래시 등이 브라우저 기본 동작(스크롤, 빠른 찾기)을 일으키지 않게
    ev.preventDefault();

    const now = performance.now();
    if (now - lastSpawn < MIN_GAP_MS) return;
    lastSpawn = now;

    if (!G.Nebula.spawn(ev.code, labelFor(ev))) return;
    state.pressCount++;
    if (now - state.lastPressAt < 280) state.burstPresses++;
    state.lastPressAt = now;
    document.body.classList.add('pressed');
  });
})();
