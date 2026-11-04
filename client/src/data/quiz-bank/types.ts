// 문제 은행 공통 타입·작성 도우미 (docs/QUIZ_BANK.md 1장 스키마)
// 구역 파일(zoneNN-MM.ts)은 defineUnit() 으로 단원 단위 문항 묶음을 만든다.

export type UnitId =
  | 'sci1-1-1' | 'sci1-1-2' | 'sci1-1-3'
  | 'sci1-2-1' | 'sci1-2-2' | 'sci1-2-3' | 'sci1-2-4' | 'sci1-2-5' | 'sci1-2-6'
  | 'sci1-3-1' | 'sci1-3-2' | 'sci1-3-3' | 'sci1-3-4' | 'sci1-3-5' | 'sci1-3-6'
  | 'sci2-1-1' | 'sci2-1-2' | 'sci2-1-3' | 'sci2-1-4' | 'sci2-1-5'
  | 'sci2-2-1' | 'sci2-2-2' | 'sci2-2-3' | 'sci2-2-4' | 'sci2-2-5' | 'sci2-2-6'
  | 'sci2-3-1' | 'sci2-3-2' | 'sci2-3-3' | 'sci2-3-4';

export type Diff = 'basic' | 'standard' | 'advanced'; // 기초 / 표준 / 심화
export type Use = 'gate' | 'planet' | 'heist' | 'review'; // 시험 / 행성 / 하이스트 / 복습
export type Flag = 'verify' | '⚠' | '경계'; // verify(=⚠): 사실 확인 필요 / 경계: CURRICULUM 경계 소재
export type ImgSpec = {kind: 'spectrum' | 'graph' | 'diagram' | 'emoji'; spec: string};

export interface QuizItem {
  id: string; // 'Z03-1.3.3-02' = 구역03 · 단원 sci1-3-3 · 2번째 (영구 불변: 단원 배열 안의 순서를 바꾸지 말 것)
  unitId: UnitId;
  subUnits?: UnitId[];
  std?: string[]; // 성취기준 코드 ['10통과1-03-03']
  zone: number; // 주 구역 1~12
  alsoZones?: number[];
  diff: Diff;
  stem: string; // 문두 (목표 ≤40자, 상한 70자)
  correct: string; // 정답 (목표 ≤16자, 상한 24자)
  wrong: [string, string, string]; // 오답 3개 (위치는 런타임 셔플)
  why: string; // 해설 1문장 (상한 70자)
  misconception?: string;
  planets?: string[]; // 연결 행성 이름 (PLANET_CATALOG 이름 · 기존 PQ 키와 같은 표기)
  use: Use[];
  heist?: 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6';
  img?: ImgSpec;
  flag?: Flag;
  status: 'draft' | 'checked' | 'approved';
  author?: string;
}

/** 단원 → 성취기준 코드 (curriculum-units.json 기준) */
export const UNIT_STD: Record<UnitId, string[]> = {
  'sci1-1-1': ['10통과1-01-01'], 'sci1-1-2': ['10통과1-01-02', '10통과1-01-03'], 'sci1-1-3': ['10통과1-01-04'],
  'sci1-2-1': ['10통과1-02-01'], 'sci1-2-2': ['10통과1-02-02'], 'sci1-2-3': ['10통과1-02-03'],
  'sci1-2-4': ['10통과1-02-03', '10통과1-02-04'], 'sci1-2-5': ['10통과1-02-05'], 'sci1-2-6': ['10통과1-02-06'],
  'sci1-3-1': ['10통과1-03-01'], 'sci1-3-2': ['10통과1-03-02'], 'sci1-3-3': ['10통과1-03-03'],
  'sci1-3-4': ['10통과1-03-04'], 'sci1-3-5': ['10통과1-03-05'], 'sci1-3-6': ['10통과1-03-06'],
  'sci2-1-1': ['10통과2-01-01'], 'sci2-1-2': ['10통과2-01-02'], 'sci2-1-3': ['10통과2-01-03'],
  'sci2-1-4': ['10통과2-01-04'], 'sci2-1-5': ['10통과2-01-05'],
  'sci2-2-1': ['10통과2-02-01'], 'sci2-2-2': ['10통과2-02-02'], 'sci2-2-3': ['10통과2-02-03'],
  'sci2-2-4': ['10통과2-02-04'], 'sci2-2-5': ['10통과2-02-05'], 'sci2-2-6': ['10통과2-02-06'],
  'sci2-3-1': ['10통과2-03-01'], 'sci2-3-2': ['10통과2-03-02'], 'sci2-3-3': ['10통과2-03-03'],
  'sci2-3-4': ['10통과2-03-04'],
};

/** 추가 메타(선택). mis=오개념, also=alsoZones, sub=보조 단원 */
export interface Extra {
  mis?: string;
  planets?: string[];
  also?: number[];
  sub?: UnitId[];
  flag?: Flag;
  img?: ImgSpec;
  use?: Use[];
  heist?: QuizItem['heist'];
}
/** 작성용 행: [난이도 B|S|A, 문두, 정답, [오답×3], 해설, 추가?] */
export type Raw = ['B' | 'S' | 'A', string, string, [string, string, string], string, Extra?];

const DIFF: Record<'B' | 'S' | 'A', Diff> = {B: 'basic', S: 'standard', A: 'advanced'};
const pad = (n: number) => String(n).padStart(2, '0');

/** 단원 하나의 문항 묶음을 만든다. id 는 (구역, 단원, 배열 순서)로 자동 부여되므로 기존 항목 사이에 끼워 넣지 말고 뒤에 추가한다. */
export function defineUnit(zone: number, unitId: UnitId, author: string, rows: Raw[]): QuizItem[] {
  const unitKey = unitId.slice(3).replace(/-/g, '.'); // 'sci1-3-3' → '1.3.3'
  return rows.map(([d, stem, correct, wrong, why, x = {}], i) => {
    const it: QuizItem = {
      id: `Z${pad(zone)}-${unitKey}-${pad(i + 1)}`,
      unitId,
      std: UNIT_STD[unitId],
      zone,
      diff: DIFF[d],
      stem,
      correct,
      wrong,
      why,
      use: x.use ?? ['gate', 'planet'],
      status: 'draft',
      author,
    };
    if (x.sub) it.subUnits = x.sub;
    if (x.also) it.alsoZones = x.also;
    if (x.mis) it.misconception = x.mis;
    if (x.planets) it.planets = x.planets;
    if (x.heist) it.heist = x.heist;
    if (x.img) it.img = x.img;
    if (x.flag) it.flag = x.flag;
    return it;
  });
}
