// 낮밤의 시각 틴트: 게임 규칙(G.cycT 300초 주기, G.night 12초 밤, 성장 ×30)은 loop.ts 가 그대로 갖고, 여기서는 그 값을 읽어 색만 정한다.
// cycT 0~225 낮 → 270 황혼 → 300 해질녘(어두워지는 중), night>0 밤(첫 1.5초에 서서히), 밤이 끝나면 4초 새벽 → 낮
import {G} from '../core/runtime.js';
import {TINT, mixTint, type Tint} from '../render/lowpoly/palette.js';

/** G.cycT 한 주기(초) / 밤 길이(초) — loop.ts 의 규칙값과 같아야 한다 */
export const CYCLE_S = 300;
const NIGHT_S = 12,
  NIGHT_FADE_S = 1.5,
  DAWN_S = 4;
/** 해질녘 끝에서 한밤까지 가는 비율(밤이 시작되기 직전 색) */
const DUSK_END = mixTint(TINT.dusk, TINT.night, 0.5);

/** 새벽 타이머 상태 (밤이 끝나는 순간을 감지해 4초 세팅) */
export const dawn = {t: 0, wasNight: false};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** 순수 함수: (주기 시각, 남은 밤, 남은 새벽) → 틴트 */
export function tintAt(cycT: number, night: number, dawnT: number): Tint {
  if (night > 0) return mixTint(DUSK_END, TINT.night, (NIGHT_S - night) / NIGHT_FADE_S);
  if (dawnT > 0) {
    const u = 1 - dawnT / DAWN_S;
    return u < 0.4 ? mixTint(TINT.night, TINT.dawn, u / 0.4) : mixTint(TINT.dawn, TINT.day, (u - 0.4) / 0.6);
  }
  if (cycT < 225) return TINT.day;
  if (cycT < 270) return mixTint(TINT.day, TINT.dusk, (cycT - 225) / 45);
  return mixTint(TINT.dusk, TINT.night, clamp01((cycT - 270) / 30) * 0.5);
}

/** 매 프레임: 새벽 타이머를 진행하고 현재 틴트를 돌려준다 (dt 는 일시정지 반영된 게임 시간) */
export function visualTint(dt: number): Tint {
  if (G.night > 0) dawn.wasNight = true;
  else if (dawn.wasNight) {
    dawn.wasNight = false;
    dawn.t = DAWN_S;
  }
  dawn.t = Math.max(0, dawn.t - dt);
  return tintAt(G.cycT, G.night, dawn.t);
}
