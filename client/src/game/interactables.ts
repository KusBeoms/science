// 상호작용 레지스트리: 종류별 find/info/prompt/act 를 등록하면 대상 탐색·프롬프트·E/F 키·3D 클릭이 자동으로 붙는다
import type {Interactable, Pick, Target} from '../core/types.js';

const LIST: Interactable[] = [];
export function registerInteractable<T extends Target>(it: Interactable<T>) {
  if (LIST.some(o => o.kind === it.kind)) throw new Error(`interactable kind 중복: ${it.kind}`);
  LIST.push(it as unknown as Interactable);
}
export const interactableOf = (kind: string) => LIST.find(o => o.kind === kind) || null;
/** 가장 알맞은 대상: 3.5 안의 물체(tier 0) > 시설(tier 1) > 그보다 먼 물체. 같은 층에선 가까운 순 */
export function findTarget(me: any): Target | null {
  let near: Target | null = null,
    fac: Target | null = null;
  LIST.forEach(it => {
    const t = it.find(me);
    if (!t) return;
    if (it.tier === 0) {
      if (!near || t.d < near.d) near = t;
    } else if (!fac || t.d < fac.d) fac = t;
  });
  const n = near as Target | null;
  if (n && n.d <= 3.5) return n;
  return fac || n;
}
/** 3D 클릭: 등록된 click 이 있으면 그것, 없으면 4초간 우선 선택 (base 등) */
export function clickPick(pk: Pick, setOverride: (pk: Pick) => void) {
  const it = interactableOf(pk.kind);
  if (it && it.click) it.click(pk);
  else setOverride(pk);
}
