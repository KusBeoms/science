// 오디오 시스템: 발소리·점프·포탈·밤·수호신 접근 감지, 상황별 BGM 선택, 음소거 버튼
import {G} from '../core/runtime.js';
import {$, dist2} from '../core/util.js';
import {autoBgm, duck, onPrefs, prefs, setBgm, sfx, toggleMute, type SfxName} from '../audio/index.js';
import type {GameSystem} from '../core/types.js';

const STRIDE = 2.6, // 발소리 간격(월드 거리)
  TELEPORT = 6; // 한 프레임 이동이 이보다 크면 순간이동
const btn = $('#muteBtn');
const paintBtn = () => {
  btn.textContent = prefs.mute ? '🔇' : '🔊';
  btn.setAttribute('aria-pressed', String(prefs.mute));
};
btn.onclick = () => {
  btn.blur();
  toggleMute();
};
onPrefs(paintBtn);
paintBtn();

/** 컷신 디렉터의 소리 큐 → BGM 지정 또는 효과음 (모르는 이름은 sfx 가 조용히 무시한다) */
const BGM_CUE: Record<string, Parameters<typeof setBgm>[0]> = {
  bgm_explore: null,
  bgm_chase: 'tense',
  bgm_happy: 'hub',
  bgm_off: 'none',
};
G.cineHooks.sound = cue => {
  if (cue in BGM_CUE) return setBgm(BGM_CUE[cue]);
  if (cue !== 'silence') sfx(cue as SfxName);
};

let ducked = false,
  px = NaN,
  pz = NaN,
  vy = 0,
  walked = 0,
  night = 0,
  chasing = false,
  calmAt = 0,
  portalSeen = -9;
const now = () => performance.now() / 1000;
/** 추격 중인 수호신 중 가장 가까운 거리 (없으면 Infinity) */
function chaseDist() {
  let best = Infinity;
  G.chunks.forEach(c => {
    if (c && c.guard.chase) best = Math.min(best, dist2(G.me.pos, c.guard.m.position));
  });
  return best;
}
export const audioSystem: GameSystem = {
  id: 'audio',
  update() {
    const cineOn = !!G.cine;
    if (cineOn !== ducked) duck((ducked = cineOn)); // 컷신 동안만 월드 효과음을 낮춘다
    if (!G.started || !G.me) return;
    const p = G.me.pos,
      t = now();
    if (G.modal === 'portal') portalSeen = t;
    const step = Math.hypot(p.x - px, p.z - pz),
      moved = px === px && step < TELEPORT;
    if (px === px && step >= TELEPORT && t - portalSeen < 1.5) sfx('portal');
    px = p.x;
    pz = p.z;
    const grounded = Math.abs(G.me.vy) < 0.01;
    if (G.me.vy > 5 && vy <= 0.01) sfx('jump');
    vy = G.me.vy;
    if (moved && grounded && !G.modal) {
      walked += step;
      if (walked >= STRIDE) {
        walked = 0;
        sfx('step');
      }
    }
    if (G.night > 0 && !night) sfx('night');
    night = G.night;
    const d = chaseDist();
    if (d < 45 && !chasing) sfx('danger');
    chasing = d < 45;
    if (chasing || G.carry.length) calmAt = t;
    autoBgm(t - calmAt < 3 ? 'tense' : 'hub'); // 추격·행성 운반 중이면 긴장, 끝난 뒤 3초 유지
  },
};
