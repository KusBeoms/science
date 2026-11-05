// 게임 시계: 낮(아침~해질녘) 12분 + 밤 4분. 낮밤 규칙(systems/loop.ts)·틴트(systems/daynight.ts)·휴대폰 시계가 같이 쓴다.
export const DAY_S = 720,
  NIGHT_S = 240,
  /** 밤 동안 성장 배율 (예전: 12초 × 30 = 360 → 지금 240초 × 1.5) */
  NIGHT_GROW = 1.5,
  /** 시계 표시: 낮 구간 = 06:00 → 20:00, 밤 구간 = 20:00 → 06:00 */
  DAY_START_H = 6,
  DAY_END_H = 20;
/** (낮 경과 cycT, 남은 밤) → 게임 속 시각(시, 0~24) */
export function clockHours(cycT: number, nightLeft: number): number {
  if (nightLeft > 0) return (DAY_END_H + (1 - nightLeft / NIGHT_S) * (24 - DAY_END_H + DAY_START_H)) % 24;
  return DAY_START_H + Math.min(1, cycT / DAY_S) * (DAY_END_H - DAY_START_H);
}
export const clockText = (cycT: number, nightLeft: number) => {
  const h = clockHours(cycT, nightLeft),
    hh = Math.floor(h),
    mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
