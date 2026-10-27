/* 키보드 입력: 글자·숫자·기호 키 어느 것이든 누르면 한 칸 앞으로 나아간다.
   ev.key 대신 ev.code로 판정하므로 한글 IME 상태에서도 똑같이 동작한다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const RT = Gp._runtime;
  const state = G.state;

  const HOP_KEYS = /^(Key|Digit|Numpad|Minus|Equal|Bracket|Semicolon|Quote|Comma|Period|Slash|Backslash|Backquote|Space|IntlBackslash)/;

  function labelFor(ev: KeyboardEvent): string {
    if (ev.key && ev.key.length === 1) return ev.key === ' ' ? '·' : ev.key.toUpperCase();
    return ev.code.replace(/^(Key|Digit|Numpad)/, '').slice(0, 2);
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!state.started || state.gameOver || RT.introPlaying || RT.timeSkipping || state.collapseRush) return;
    if (!HOP_KEYS.test(ev.code)) return;
    // 스페이스·슬래시 등이 브라우저 기본 동작(스크롤, 빠른 찾기)을 일으키지 않게
    ev.preventDefault();
    if (!G.Run.hop(ev.code, labelFor(ev))) return;
    const now = performance.now();
    state.pressCount++;
    if (now - state.lastPressAt < 280) state.burstPresses++;
    state.lastPressAt = now;
    document.body.classList.add('pressed');
  });
})();
