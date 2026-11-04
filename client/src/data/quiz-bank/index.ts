// 문제 은행 집계·검증·기존 코드 호환 어댑터 (구역 1~12).
// 이 파일은 DOM/게임 상태에 의존하지 않는다(순수 데이터·함수) → node 로도 검증할 수 있다.
import {UNIT_STD, type Diff, type ImgSpec, type QuizItem, type UnitId} from './types.js';
import {ZONE01, ZONE02} from './zone01-02.js';
import {ZONE03, ZONE04} from './zone03-04.js';
import {ZONE05, ZONE06} from './zone05-06.js';
import {ZONE07, ZONE08} from './zone07-08.js';
import {ZONE09, ZONE10} from './zone09-10.js';
import {ZONE11, ZONE12} from './zone11-12.js';

export * from './types.js';

/** 구역 1~6 */
export const BANK_Z01_06: QuizItem[] = [...ZONE01, ...ZONE02, ...ZONE03, ...ZONE04, ...ZONE05, ...ZONE06];
/** 구역 7~12 */
export const BANK_Z07_12: QuizItem[] = [...ZONE07, ...ZONE08, ...ZONE09, ...ZONE10, ...ZONE11, ...ZONE12];
/** 전체 은행 */
export const BANK_ALL: QuizItem[] = [...BANK_Z01_06, ...BANK_Z07_12];

// ───────────── 기획 표 (QUIZ_BANK 2·3장) ─────────────
export const ZONE_UNITS: Record<number, UnitId[]> = {
  1: ['sci1-1-1', 'sci1-1-2', 'sci1-3-1'], 2: ['sci1-1-3', 'sci1-2-5', 'sci1-3-4'], 3: ['sci1-3-2', 'sci1-3-3', 'sci2-1-5'],
  4: ['sci1-2-3', 'sci1-2-4'], 5: ['sci2-1-1', 'sci2-2-5'], 6: ['sci2-2-1', 'sci2-2-2', 'sci2-2-3'],
  7: ['sci1-3-5', 'sci2-1-2'], 8: ['sci2-1-3', 'sci2-1-4'], 9: ['sci1-2-1', 'sci2-2-4'],
  10: ['sci1-2-2', 'sci1-2-6', 'sci1-3-6'], 11: ['sci2-3-2', 'sci2-3-3'], 12: ['sci2-2-6', 'sci2-3-1', 'sci2-3-4'],
};
/** 구역별 [기초, 표준, 심화] 목표 */
export const ZONE_TARGETS: Record<number, [number, number, number]> = {
  1: [13, 6, 2], 2: [11, 8, 2], 3: [9, 9, 3], 4: [7, 5, 2], 5: [6, 5, 3], 6: [7, 9, 5],
  7: [6, 5, 3], 8: [4, 6, 4], 9: [4, 6, 4], 10: [7, 9, 5], 11: [5, 5, 4], 12: [5, 11, 5],
};
/** 구역별 행성 이름 (PLANET_CATALOG 2장, 구역 1~6만) — planets 필드 검사용 */
export const ZONE_PLANETS: Record<number, string[]> = {
  1: ['수성', '금성', '지구', '달', '화성', '포보스', '데이모스'],
  2: ['세레스', '베스타', '팔라스', '이토카와', '류구', '베누'],
  3: ['목성', '이오', '유로파', '가니메데', '칼리스토', '아말테아'],
  4: ['토성', '타이탄', '엔셀라두스', '천왕성', '미란다', '해왕성', '트리톤'],
  5: ['명왕성', '카론', '에리스', '하우메아', '마케마케', '핼리 혜성'],
  6: ['프록시마 센타우리', '프록시마 b', '트라피스트-1 b', '트라피스트-1 d', '트라피스트-1e', '트라피스트-1 f', '트라피스트-1 g', 'LHS 1140 b'],
};
export const LIMIT = {stem: 70, option: 24, why: 70, stemGoal: 40, optionGoal: 16} as const;

// ───────────── 기존 코드 호환 어댑터 ─────────────
/** 기존 GQ/PQ 행 형식 [문제, 정답, 오답×3, 해설]. 주의: id·img·단원·행성 정보는 버려진다 */
export const toRow = (q: QuizItem): string[] => [q.stem, q.correct, ...q.wrong, q.why];

/** QuizCtx.qs 확장형 제안: 행은 그대로 두고 id·그림을 함께 실어 보낸다 (mkQ 가 QuizQ 에 옮겨 담도록 core/types.ts 확장 필요) */
export interface QuizCtxQ {
  row: string[];
  id: string;
  img?: ImgSpec;
}
export const toCtxQ = (q: QuizItem): QuizCtxQ => ({row: toRow(q), id: q.id, ...(q.img ? {img: q.img} : {})});

const usable = (q: QuizItem, use: 'gate' | 'planet') => q.use.includes(use);
/** 구역 시험 풀: 주 구역이거나 alsoZones 에 포함되고 gate 용인 문항 */
export const gatePool = (items: QuizItem[], zone: number): QuizItem[] =>
  items.filter(q => usable(q, 'gate') && (q.zone === zone || q.alsoZones?.includes(zone)));

/** GQU 형태(Record<태그, 행[]>). tagsOf 가 문항을 넣을 태그 목록을 돌려준다 */
export function buildGQU(items: QuizItem[], tagsOf: (q: QuizItem) => string[]): Record<string, string[][]> {
  const out: Record<string, string[][]> = {};
  for (const q of items) if (usable(q, 'gate')) for (const t of tagsOf(q)) (out[t] ||= []).push(toRow(q));
  return out;
}
/** 가장 단순한 연결: 키를 'Z01'~'Z12' 로 만든다 (sectors.ts 의 units 를 ['Z01'] 식으로 바꿔 쓰면 매핑표가 필요 없다) */
export const zoneKey = (zone: number) => `Z${String(zone).padStart(2, '0')}`;
export const buildGQUByZone = (items: QuizItem[]): Record<string, string[][]> =>
  buildGQU(items, q => [zoneKey(q.zone), ...(q.alsoZones ?? []).map(zoneKey)]);

/** 행성 이름 → 문항 목록 (planet 용 + planets 에 이름 포함) */
export function planetPools(items: QuizItem[]): Record<string, QuizItem[]> {
  const out: Record<string, QuizItem[]> = {};
  for (const q of items) if (usable(q, 'planet')) for (const p of q.planets ?? []) (out[p] ||= []).push(q);
  return out;
}
/** 기존 PQ 와 같은 형태(행성 이름 → 행 1개). 행성당 첫 문항만 담긴다 — 여러 문항은 planetPools 를 쓸 것 */
export function buildPQ(items: QuizItem[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [name, qs] of Object.entries(planetPools(items))) out[name] = toRow(qs[0]);
  return out;
}

/** 시험 3문항 뽑기: 난이도 구성(예 ['basic','basic','standard'])대로, 가능하면 서로 다른 단원, exclude(최근 id) 제외. 부족하면 같은 난이도·단원 중복 허용 */
export function pickGate(pool: QuizItem[], diffs: Diff[], exclude: Set<string> = new Set(), rnd: () => number = Math.random): QuizItem[] {
  const shuf = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const picked: QuizItem[] = [];
  for (const d of diffs) {
    const c = shuf(pool.filter(q => q.diff === d && !picked.includes(q)));
    const fresh = c.filter(q => !exclude.has(q.id));
    const pref = (fresh.length ? fresh : c).find(q => !picked.some(p => p.unitId === q.unitId)) ?? (fresh.length ? fresh : c)[0];
    if (pref) picked.push(pref);
  }
  return picked;
}

// ───────────── 집계·검증 ─────────────
export interface BankReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  total: number;
  byZone: Record<number, {total: number; basic: number; standard: number; advanced: number}>;
  byUnit: Record<string, {total: number; basic: number; standard: number; advanced: number}>;
  flagged: number; // flag 가 붙은 문항 수
  positions: number[]; // 런타임 셔플 시뮬레이션에서 정답이 각 위치(1~4번)에 나온 비율
  longestCorrect: number; // 정답이 보기 중 단독 최장인 문항 비율
}
const sentences = (s: string) => (s.match(/[.?!](\s|$)/g) ?? []).length;
const bigrams = (s: string) => {
  const t = s.replace(/\s+/g, ''),
    set = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
};
const jaccard = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  a.forEach(x => b.has(x) && n++);
  return n / (a.size + b.size - n || 1);
};

/**
 * 문제 은행 검증.
 * @param zones 지정하면 그 구역의 단원 구성·문항 수·난이도 목표(ZONE_TARGETS)까지 대조한다
 * @param runs  정답 위치 분포 시뮬레이션 횟수(문항당)
 */
export function validateBank(items: QuizItem[], opt: {zones?: number[]; runs?: number} = {}): BankReport {
  const errors: string[] = [],
    warnings: string[] = [];
  const err = (q: QuizItem, m: string) => errors.push(`${q.id}: ${m}`);
  const warn = (q: QuizItem, m: string) => warnings.push(`${q.id}: ${m}`);
  const byZone: BankReport['byZone'] = {},
    byUnit: BankReport['byUnit'] = {};
  const blank = () => ({total: 0, basic: 0, standard: 0, advanced: 0});
  const ids = new Set<string>(),
    seenStem = new Map<string, string>();
  let flagged = 0,
    longest = 0;
  for (const q of items) {
    if (ids.has(q.id)) err(q, 'id 중복');
    ids.add(q.id);
    if (!/^Z\d{2}-\d\.\d\.\d-\d{2}$/.test(q.id)) err(q, 'id 형식');
    if (!(q.unitId in UNIT_STD)) err(q, `unitId 없음(${q.unitId})`);
    else if (q.zone <= 12 && ZONE_UNITS[q.zone] && !ZONE_UNITS[q.zone].includes(q.unitId)) err(q, `단원 ${q.unitId} 는 구역 ${q.zone} 담당이 아님`);
    if (q.stem.length > LIMIT.stem) err(q, `문두 ${q.stem.length}자 > ${LIMIT.stem}`);
    else if (q.stem.length > LIMIT.stem - 5) warn(q, `문두 ${q.stem.length}자(상한 근접)`);
    const opts = [q.correct, ...q.wrong];
    opts.forEach(o => o.length > LIMIT.option && err(q, `보기 ${o.length}자 > ${LIMIT.option}: ${o}`));
    if (q.why.length > LIMIT.why) err(q, `해설 ${q.why.length}자 > ${LIMIT.why}`);
    if (sentences(q.why) !== 1 || !/[.]$/.test(q.why)) err(q, '해설은 마침표로 끝나는 정확히 1문장');
    if (new Set(opts).size !== 4) err(q, '보기 중복 또는 정답이 오답과 같음');
    if (opts.some(o => !o.trim())) err(q, '빈 보기');
    if (/모두 정답|정답 없음|ㄱ,|ㄴ,/.test(q.stem + opts.join(''))) err(q, '합답/모두 정답 표현');
    const max = Math.max(...opts.map(o => o.length));
    if (q.correct.length === max && opts.filter(o => o.length === max).length === 1) longest++;
    if (q.flag) flagged++;
    const key = q.stem.replace(/\s+/g, '');
    if (seenStem.has(key)) err(q, `문두 중복(${seenStem.get(key)})`);
    seenStem.set(key, q.id);
    const z = (byZone[q.zone] ||= blank()),
      u = (byUnit[q.unitId] ||= blank());
    for (const t of [z, u]) {
      t.total++;
      t[q.diff]++;
    }
    const zp = ZONE_PLANETS[q.zone];
    for (const p of q.planets ?? []) if (zp && !zp.includes(p)) warn(q, `행성 '${p}' 가 구역 ${q.zone} 목록에 없음`);
  }
  // 유사 문항 경고(같은 단원 안, 문두 2-gram 유사도 ≥ .6 또는 정답 동일)
  const byU: Record<string, QuizItem[]> = {};
  items.forEach(q => (byU[q.unitId] ||= []).push(q));
  for (const list of Object.values(byU))
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i],
          b = list[j];
        if (a.correct === b.correct) warnings.push(`${a.id} ~ ${b.id}: 정답이 같음(${a.correct})`);
        else if (jaccard(bigrams(a.stem), bigrams(b.stem)) >= 0.6) warnings.push(`${a.id} ~ ${b.id}: 문두 유사`);
      }
  // 구역 단위 대조
  for (const z of opt.zones ?? []) {
    const t = ZONE_TARGETS[z],
      r = byZone[z] ?? blank();
    if (r.total !== t[0] + t[1] + t[2]) errors.push(`구역 ${z}: 문항 ${r.total} (목표 ${t[0] + t[1] + t[2]})`);
    if (r.basic !== t[0] || r.standard !== t[1] || r.advanced !== t[2])
      errors.push(`구역 ${z}: B/S/A ${r.basic}/${r.standard}/${r.advanced} (목표 ${t.join('/')})`);
    let aUnits = 0;
    for (const u of ZONE_UNITS[z]) {
      const s = byUnit[u] ?? blank();
      if (s.total !== 7) errors.push(`단원 ${u}: ${s.total}문항 (목표 7)`);
      if (s.basic < 1 || s.standard < 1) errors.push(`단원 ${u}: 기초·표준 각 1 이상 필요 (${s.basic}/${s.standard}/${s.advanced})`);
      if (s.advanced > 0) aUnits++;
    }
    if (t[2] >= 2 && aUnits < 2) errors.push(`구역 ${z}: 심화가 있는 단원이 2개 미만`);
  }
  // 정답 위치 분포: 런타임 mkQ 와 같은 방식(Fisher-Yates)으로 셔플해 정답이 몇 번째에 오는지 센다
  const runs = opt.runs ?? 1000,
    pos = [0, 0, 0, 0];
  for (const _ of items)
    for (let r = 0; r < runs; r++) {
      const a = [0, 1, 2, 3];
      for (let i = 3; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      pos[a.indexOf(0)]++;
    }
  const n = items.length * runs || 1,
    positions = pos.map(c => c / n);
  if (positions.some(p => Math.abs(p - 0.25) > 0.03)) errors.push(`정답 위치 편향: ${positions.map(p => p.toFixed(3)).join(' / ')}`);
  const longestCorrect = items.length ? longest / items.length : 0;
  if (longestCorrect > 0.4) warnings.push(`정답이 단독 최장인 문항 ${(longestCorrect * 100).toFixed(0)}% (40% 초과)`);
  return {ok: errors.length === 0, errors, warnings, total: items.length, byZone, byUnit, flagged, positions, longestCorrect};
}
