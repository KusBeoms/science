// 우주 지도 (포탈 UI, 글 최소): 도시 포탈 광장·섹터 입구 패드에서 E → 아이콘 12칸 + 도시 귀환 칸.
//  열린 섹터 = 누르면 포탈 이동 · 잠긴 섹터 = 누르면 그 자리에서 해금 검토(조건 막대 → 충족하면 📝 시험 → 통과 시 해금 + 이동).
import {S, save} from '../core/state.js';
import {G} from '../core/runtime.js';
import {$} from '../core/util.js';
import {groundH} from '../core/terrain.js';
import {reqStatus, sectorUnlocked} from '../core/progress.js';
import {SECTORS} from '../data/sectors.js';
import {dots} from '../render/plaza.js';
import {flash, toast} from './hud.js';
import {closeModal, openModal} from './modal.js';
import {openGate} from './actions.js';

const el = (cls: string, html = '', tag = 'div') => {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
};
/** 패드 id → 이름표(아이콘). hub = 도시 */
const iconOf = (id: string) => (id === 'hub' ? '🏙️' : SECTORS.find(s => s.id === id)!.icon);

/** 패드 id 로 순간이동 (들고 있는 행성은 그대로). 도착 시 섹터 아이콘 토스트 */
export function warpTo(id: string) {
  const p = G.pads[id];
  if (!p) return;
  if (id !== 'hub') S.portals[id] = 1; // 도착한 섹터는 영구히 포탈이 열린다
  G.me.pos.set(p.x, groundH(p.x, p.z), p.z + 3);
  G.me.vy = 0;
  flash('#7cf0ff', 0.45);
  toast(`${iconOf(id)} ${id === 'hub' ? '도시' : SECTORS.find(s => s.id === id)!.name}(으)로 이동했습니다`);
  save();
}

/** 우주 지도 열기. from = 지금 서 있는 패드 id, review = 해금 검토 중인 섹터 번호 */
export function openStarMap(from: string, review = -1) {
  const list = $('#plist');
  list.innerHTML = '';
  list.className = review < 0 ? 'sm-grid' : 'sm-review';
  if (review >= 0) renderReview(list, from, review);
  else renderGrid(list, from);
  $('#px').onclick = closeModal;
  if (G.modal !== 'portal') openModal('portal');
}

function card(id: string, icon: string, sub: string, cls: string, onClick: () => void, dis = false) {
  const b = el('sm-card ' + cls, `<i>${icon}</i><small>${sub}</small>`, 'button') as HTMLButtonElement;
  b.dataset.id = id;
  b.disabled = dis;
  b.onclick = onClick;
  return b;
}
function renderGrid(list: HTMLElement, from: string) {
  list.append(card('hub', '🏙️', from === 'hub' ? '현재 위치' : '도시로', from === 'hub' ? 'here' : 'open', () => go('hub'), from === 'hub'));
  SECTORS.forEach((s, i) => {
    const open = sectorUnlocked(s.id),
      here = s.id === from;
    list.append(
      card(
        s.id,
        s.icon,
        `${dots(i + 1)}<br>${here ? '현재 위치' : open ? '이동 가능' : '잠김'}`,
        here ? 'here' : open ? 'open' : 'lock',
        () => (open ? go(s.id) : openStarMap(from, i)),
        here
      )
    );
  });
}
function go(id: string) {
  closeModal();
  warpTo(id);
}
const reqLabel = (icon: string) => (icon === '📖' ? '도감' : icon === '👟' ? '신발' : '이전 구역');
/** 해금 검토 화면: 조건마다 아이콘 + 진행 막대 + ✔/✘, 모두 충족하면 📝 시험 버튼이 켜진다 */
function renderReview(list: HTMLElement, from: string, i: number) {
  const s = SECTORS[i],
    rows = reqStatus(i),
    ready = rows.every(r => r.ok);
  list.append(el('sm-head', `<i>${s.icon}</i><span>${dots(i + 1)}</span><b>${ready ? '시험 볼 수 있음' : '잠김'}</b>`));
  rows.forEach(r => {
    const pct = Math.round((r.have / r.need) * 100);
    list.append(
      el(
        'sm-req ' + (r.ok ? 'ok' : 'no'),
        `<i>${r.icon}</i><small>${reqLabel(r.icon)}</small><span class="bar"><span style="width:${pct}%"></span></span><em>${r.need > 1 ? `${r.have}/${r.need}` : ''}</em><b>${r.ok ? '✔' : '✘'}</b>`
      )
    );
  });
  const exam = el('sm-go', '📝 입장 시험 (3문제)', 'button') as HTMLButtonElement;
  exam.dataset.act = 'exam';
  exam.disabled = !ready;
  exam.onclick = () => {
    closeModal();
    openGate(
      i,
      () => warpTo(s.id),
      () => openStarMap(from, i)
    );
  };
  const back = el('sm-back', '↩ 돌아가기', 'button') as HTMLButtonElement;
  back.dataset.act = 'back';
  back.onclick = () => openStarMap(from);
  const btns = el('sm-btns');
  btns.append(back, exam);
  list.append(btns);
}
