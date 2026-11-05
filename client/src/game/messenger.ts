// 휴대폰 메신저: 연락처 5명이 이벤트나 시간에 따라 메시지를 보낸다(삐릭 + 배너 + 📱 빨간 점). 답장은 이모지 빠른 답장. 대화는 S.chat 에 저장(최대 60).
import {S, save} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {sfx} from '../audio/index.js';
import type {GameSystem} from '../core/types.js';

export const CONTACTS: Record<string, {icon: string; name: string; replies: string[]}> = {
  friend: {icon: '😎', name: '친구', replies: ['좋아 👍', 'ㅋㅋ 😂', '부탁해 🙏', '왜? ❓']},
  agent: {icon: '🏢', name: '부동산 김 사장', replies: ['매물 보기', '좋아요 👍', '괜찮아요']},
  coach: {icon: '⚽', name: '축구 감독', replies: ['경기장 갈게요', '좋아요 👍', '파이팅 💪']},
  mech: {icon: '🛠️', name: '정비사', replies: ['튜닝샵 갈게요', '좋아요 👍']},
  cop: {icon: '🚔', name: '지인(경찰서)', replies: ['헉 😱', '부탁해요 🙏']},
};
export const unread = () => S.chat.filter(m => !m.read && m.from !== 'me').length;
function badge() {
  const b = document.getElementById('phoneBtn');
  if (!b) return;
  const n = unread();
  b.dataset.n = String(n);
  b.style.position = 'relative';
  let dot = b.querySelector('i');
  if (n && !dot) {
    dot = document.createElement('i');
    dot.style.cssText = 'position:absolute;top:2px;right:2px;width:10px;height:10px;border-radius:50%;background:#e5483f;border:1.5px solid #0d1322';
    b.append(dot);
  } else if (!n && dot) dot.remove();
}
let banner: HTMLElement | null = null,
  bannerT = 0;
export function pushMsg(from: string, text: string) {
  S.chat.push({from, text, t: Date.now(), read: 0});
  if (S.chat.length > 60) S.chat.splice(0, S.chat.length - 60);
  badge();
  sfx('ping');
  if (!banner) {
    banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:9;background:#0d1322f0;border:1px solid #5a6275;border-radius:16px;padding:10px 16px;font-size:15px;color:#fff;transform:translateY(120px);transition:transform .35s cubic-bezier(.2,1.5,.4,1);pointer-events:none';
    document.body.append(banner);
  }
  banner.textContent = `${CONTACTS[from]?.icon ?? '💬'}  ${text}`;
  requestAnimationFrame(() => banner && (banner.style.transform = 'none'));
  bannerT = 3.5;
  save();
}
export function markRead(from: string) {
  S.chat.forEach(m => m.from === from && (m.read = 1));
  badge();
}
/** 플레이어 답장 + 상대의 짧은 자동 답 */
export function reply(from: string, text: string) {
  S.chat.push({from: 'me:' + from, text, t: Date.now(), read: 1});
  const auto: Record<string, string> = {friend: '좋아! 😄', agent: '감사합니다 🤝', coach: '파이팅! 🔥', mech: '맡겨 주세요 🔧', cop: '비밀이야 🤫'};
  setTimeout(() => pushMsg(from, auto[from] || '👍'), 1200);
  save();
}
let tFriend = 150,
  tAgent = 240;
const FRIEND = ['햄버거 먹으러 갈래? 🍔', '같이 낚시하자 🎣', '축구 한 판 어때? ⚽', '산 정상 가봤어? 🏔️', '레이싱 한 판 할까? 🚗', '놀이공원 가자 🎡'];
export const messengerSystem: GameSystem = {
  id: 'messenger',
  onLoad() {
    setTimeout(badge, 0);
  },
  update(dt) {
    if (bannerT > 0 && (bannerT -= dt) <= 0 && banner) banner.style.transform = 'translateY(120px)';
    if (paused() || !G.started) return;
    if ((tFriend -= dt) <= 0) {
      tFriend = 200 + Math.random() * 200;
      pushMsg('friend', FRIEND[Math.floor(Math.random() * FRIEND.length)]);
    }
    if ((tAgent -= dt) <= 0) {
      tAgent = 300 + Math.random() * 240;
      if (S.cr > 3000) pushMsg('agent', '새 매물이 나왔어요 🏢');
    }
  },
};
