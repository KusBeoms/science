// 퀴즈 오버레이: 문제 출제/응답/종료
import {S, save} from '../core/state.js';
import {G, releaseLock} from '../core/runtime.js';
import {$, shuffle} from '../core/util.js';
import {sfx} from '../audio/index.js';
import type {QuizCtx, QuizQ} from '../core/types.js';

const mkQ = (a: string[]): QuizQ => ({
  q: a[0],
  opts: shuffle([a[1], a[2], a[3], a[4]].map((t, i) => ({t, ok: i === 0}))),
  why: a[5],
});
type Ctx0 = Pick<QuizCtx, 'title' | 'qs' | 'need' | 'onDone'>;
export function openQuiz(ctx: Ctx0) {
  G.quizCtx = Object.assign({i: 0, right: 0, done: false}, ctx);
  G.quizOpen = true;
  releaseLock();
  $('#qt').textContent = ctx.title;
  $('#quiz').classList.add('on');
  sfx('open');
  showQ();
}
function showQ() {
  const c = G.quizCtx!,
    q = (c.cur = mkQ(c.qs[c.i]));
  c.done = false;
  $('#qq').textContent = (c.qs.length > 1 ? `(${c.i + 1}/${c.qs.length}) ` : '') + q.q;
  $('#qr').innerHTML = '';
  $('#qn').style.display = 'none';
  const box = $('#qo');
  box.innerHTML = '';
  q.opts.forEach((o, k) => {
    const b = document.createElement('button');
    b.textContent = `${k + 1}. ${o.t}`;
    b.onclick = () => answer(k);
    box.append(b);
  });
}
export function answer(k: number) {
  const c = G.quizCtx;
  if (!c || c.done || !c.cur!.opts[k]) return;
  c.done = true;
  c.answered = true;
  const q = c.cur!,
    ok = q.opts[k].ok;
  [...$('#qo').children].forEach((b, j) => {
    (b as HTMLButtonElement).disabled = true;
    if (q.opts[j].ok) (b as HTMLElement).style.borderColor = '#7cf09a';
    else if (j === k) (b as HTMLElement).style.borderColor = '#ff7a8a';
  });
  if (ok) {
    c.right++;
    S.correct++;
  }
  sfx(ok ? 'quizRight' : 'quizWrong');
  $('#qr').innerHTML = `<b class="${ok ? 'ok' : 'no'}">${ok ? '정답!' : '오답'}</b> ${q.why}`;
  const n = $('#qn');
  n.style.display = 'inline-block';
  n.textContent = c.i + 1 < c.qs.length ? '다음 문제 (Space)' : '확인 (Space)';
}
export function nextQ() {
  const c = G.quizCtx;
  if (!c || !c.done) return;
  if (c.i + 1 < c.qs.length) {
    c.i++;
    showQ();
    return;
  }
  closeQuiz(true);
}
export function closeQuiz(finish: boolean) {
  const c = G.quizCtx;
  G.quizOpen = false;
  G.quizCtx = null;
  G.quizClosedAt = performance.now();
  $('#quiz').classList.remove('on');
  if (c && (finish || c.answered)) c.onDone(c.right >= c.need); // 한 문제라도 답했으면 ✕/Esc로 닫아도 결과를 반영한다
  save();
}
