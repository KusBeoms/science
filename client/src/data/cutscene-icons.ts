// 아이콘 사전 (UX_CUTSCENE 3.2): key → [이모지, 말풍선 외곽 shape]. 글자 대신 이모지·도형만 쓰는 스토리/튜토리얼/HUD 의 단일 출처
export type IconShape = 'round' | 'spike' | 'square' | 'hex';
const I = <T extends Record<string, readonly [string, IconShape]>>(t: T) => t;
export const ICONS = I({
  // 감정 (round, 충돌 시 spike)
  love: ['💗', 'round'],
  determined: ['😤', 'round'],
  drool: ['🤤', 'round'],
  shock: ['😱', 'round'],
  relief: ['😮‍💨', 'round'],
  joy: ['🎉', 'round'],
  happy: ['😄', 'round'],
  sad: ['😢', 'round'],
  wonder: ['🤔', 'round'],
  rage: ['💢', 'spike'],
  rebuff: ['🙅', 'round'],
  sweat: ['💦', 'round'],
  anger: ['😠', 'round'],
  sprout: ['🌱', 'round'],
  dust: ['💨', 'round'],
  sparkle: ['✨', 'round'],
  ellipsis: ['⋯', 'round'],
  // 의뢰 (square)
  quest: ['❗', 'square'],
  quest_done: ['✅', 'square'],
  steal_spec: ['🪐✨', 'square'],
  // 위험 (spike)
  danger: ['⚠️', 'spike'],
  watch: ['👁️', 'spike'],
  alarm: ['🚨', 'spike'],
  chase_arrow: ['➡️➡️➡️', 'spike'],
  knife: ['🗡️', 'spike'],
  // 상태·시스템 (hex)
  price: ['🏷️', 'hex'],
  stamina: ['⚡', 'hex'],
  tired: ['💤', 'hex'],
  carry: ['🎒', 'hex'],
  full: ['🎒🔒', 'hex'],
  money: ['💰', 'hex'],
  locked: ['🔒', 'hex'],
  skip: ['⏭', 'hex'],
  home: ['🏠', 'hex'],
  house: ['🏡', 'hex'],
  apple: ['🍎', 'hex'],
  // 안내
  hint_hand: ['👆', 'round'],
  hint_look: ['👀', 'round'],
});
export type IconKey = keyof typeof ICONS;
