// 문제 은행 — 구역 S7(쌍성·거주후보)·S8(뜨거운 목성들). 스키마: docs/QUIZ_BANK.md 1장.
// 정답 위치는 파일에 두지 않는다(런타임 셔플). std 코드는 curriculum-units.json 기준.
import type {QuizItem} from './types.js';

/** S7 쌍성·거주후보 — 14문항 (기초 6 · 표준 5 · 심화 3). sci1-3-5 생명 시스템(효소·세포막) / sci2-1-2 진화 */
export const ZONE07: QuizItem[] = [
  // ── sci1-3-5 ──
  {
    id: 'Z07-1.3.5-01', unitId: 'sci1-3-5', std: ['10통과1-03-05'], zone: 7, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '세포막이 필요한 물질만 골라 통과시키는 성질은?',
    correct: '선택적 투과성',
    wrong: ['용해성', '탄성', '전도성'],
    why: '세포막은 물질을 선택적으로 통과시켜 세포 안 환경을 유지한다.',
  },
  {
    id: 'Z07-1.3.5-02', unitId: 'sci1-3-5', std: ['10통과1-03-05'], zone: 7, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '생명체 안에서 화학 반응을 빠르게 해 주는 단백질 촉매는?',
    correct: '효소',
    wrong: ['호르몬', '항체', '비타민'],
    why: '효소는 생명체 안의 화학 반응을 빠르게 하는 생체 촉매이다.',
  },
  {
    id: 'Z07-1.3.5-03', unitId: 'sci1-3-5', std: ['10통과1-03-05'], zone: 7, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '효소는 화학 반응이 끝난 뒤 어떻게 될까?',
    correct: '변하지 않고 다시 쓰인다',
    wrong: ['반응하며 모두 소모된다', '다른 효소로 바뀐다', '열로 모두 사라진다'],
    why: '효소는 반응 전후에 변하지 않아 여러 번 다시 작용한다.',
    misconception: '효소는 반응물처럼 소모된다',
  },
  {
    id: 'Z07-1.3.5-04', unitId: 'sci1-3-5', std: ['10통과1-03-05'], zone: 7, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '효소 X는 물질 A만 분해한다. 시험관에 X와 물질 B를 넣으면?',
    correct: '반응이 거의 일어나지 않는다',
    wrong: ['B도 A처럼 분해된다', 'B가 A로 바뀐다', 'X가 B로 변한다'],
    why: '효소는 특정 물질(기질)에만 작용하는 기질 특이성이 있다.',
  },
  {
    id: 'Z07-1.3.5-05', unitId: 'sci1-3-5', std: ['10통과1-03-05'], zone: 7, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '효소 반응 속도는 최적 온도보다 훨씬 높은 온도에서 어떻게 될까?',
    correct: '크게 느려지거나 멈춘다',
    wrong: ['계속 더 빨라진다', '변함이 없다', '두 배로 빨라진다'],
    why: '너무 높은 온도에서는 효소 단백질이 변형되어 기능을 잃는다.',
    misconception: '온도가 높을수록 효소 반응은 항상 빨라진다',
  },
  {
    id: 'Z07-1.3.5-06', unitId: 'sci1-3-5', std: ['10통과1-03-05'], zone: 7, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '진한 소금물에 담근 오이 세포에서 물은 어디로 이동할까?',
    correct: '세포 안에서 밖으로',
    wrong: ['세포 밖에서 안으로', '이동하지 않는다', '소금과 함께 안으로'],
    why: '물은 용액 농도가 낮은 쪽에서 높은 쪽으로 세포막을 통과한다.',
  },
  {
    id: 'Z07-1.3.5-07', unitId: 'sci1-3-5', subUnits: ['sci1-3-6'], std: ['10통과1-03-05'], zone: 7, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '체온이 지나치게 오르면 위험한 까닭을 효소로 설명하면?',
    correct: '효소 구조가 변해 반응이 방해된다',
    wrong: ['효소가 늘어 반응이 지나쳐서', '효소가 DNA로 바뀌어서', '효소가 필요 없어져서'],
    why: '높은 열에 효소가 변형되면 생명 활동의 화학 반응이 깨진다.',
  },
  // ── sci2-1-2 ──
  {
    id: 'Z07-2.1.2-01', unitId: 'sci2-1-2', std: ['10통과2-01-02'], zone: 7, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '단단한 씨앗뿐인 섬에서 부리가 큰 새가 더 살아남았다(부리 크기는 유전). 몇 세대 뒤 개체군은?',
    correct: '큰 부리의 비율이 늘어난다',
    wrong: ['새들이 필요해서 부리를 키웠다', '모든 새의 부리가 곧바로 커진다', '부리 크기 분포가 그대로다'],
    why: '변이 중 환경에 유리한 형질이 자연선택되어 개체군에서 늘어난다.',
    misconception: '개체가 필요해서 변이를 만든다',
  },
  {
    id: 'Z07-2.1.2-02', unitId: 'sci2-1-2', std: ['10통과2-01-02'], zone: 7, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '같은 종 안에서 개체마다 형질이 조금씩 다른 것은?',
    correct: '변이',
    wrong: ['진화', '번식', '항상성'],
    why: '같은 종이어도 개체마다 형질이 다른 것을 변이라 한다.',
  },
  {
    id: 'Z07-2.1.2-03', unitId: 'sci2-1-2', std: ['10통과2-01-02'], zone: 7, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '같은 종 안에서 유전자가 서로 다양한 정도는?',
    correct: '유전적 다양성',
    wrong: ['종 다양성', '생태계 다양성', '먹이 다양성'],
    why: '생물다양성은 유전적·종·생태계 다양성으로 나뉘며 종 안의 차이는 유전적 다양성이다.',
  },
  {
    id: 'Z07-2.1.2-04', unitId: 'sci2-1-2', std: ['10통과2-01-02'], zone: 7, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '환경에 유리한 형질의 개체가 더 많이 살아남아 자손을 남기는 과정은?',
    correct: '자연선택',
    wrong: ['인공 선택', '용불용설', '돌연변이'],
    why: '환경에 유리한 변이를 가진 개체가 더 많이 번식하는 것이 자연선택이다.',
  },
  {
    id: 'Z07-2.1.2-05', unitId: 'sci2-1-2', std: ['10통과2-01-02'], zone: 7, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '살충제를 뿌린 밭에서 살아남은 해충의 자손이 살충제에 강해진 까닭은?',
    correct: '강한 변이 개체가 살아남아 번식',
    wrong: ['해충이 적응하려 노력해서', '살충제가 해충 유전자를 바꿔서', '약한 개체만 번식해서'],
    why: '살충제에 강한 변이를 가진 개체가 살아남아 그 형질을 자손에게 물려준다.',
    misconception: '개체가 환경에 맞추려고 노력해 변한다',
  },
  {
    id: 'Z07-2.1.2-06', unitId: 'sci2-1-2', std: ['10통과2-01-02'], zone: 7, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '자연선택으로 형질 비율이 달라져 진화가 나타나는 단위는?',
    correct: '개체군',
    wrong: ['개체 한 마리', '세포 하나', '무생물 환경'],
    why: '개체는 평생 형질이 변하지 않고 개체군의 형질 비율이 세대를 거쳐 달라진다.',
    misconception: '개체가 진화한다',
  },
  {
    id: 'Z07-2.1.2-07', unitId: 'sci2-1-2', std: ['10통과2-01-02'], zone: 7, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '유전적 다양성이 낮은 개체군이 새 질병에 특히 위험한 까닭은?',
    correct: '모두 같은 약점을 가져 함께 쓰러질 수 있다',
    wrong: ['변이가 많아 선택이 늘어서', '번식하지 않아 개체가 줄어서', '환경이 변하지 않아서'],
    why: '변이가 적으면 질병에 강한 개체가 없을 수 있어 개체군 전체가 위험하다.',
  },
];

/** S8 뜨거운 목성들 — 14문항 (기초 4 · 표준 6 · 심화 4). sci2-1-3 산화·환원(H2 풀) / sci2-1-4 산·염기·중화 */
export const ZONE08: QuizItem[] = [
  // ── sci2-1-3 ──
  {
    id: 'Z08-2.1.3-01', unitId: 'sci2-1-3', std: ['10통과2-01-03'], zone: 8, diff: 'basic', use: ['gate', 'planet', 'heist'], heist: 'H2', status: 'draft',
    stem: '산소를 얻는 반응을 무엇이라 할까?',
    correct: '산화',
    wrong: ['환원', '중화', '승화'],
    why: '물질이 산소를 얻는 반응이 산화이고 산소를 잃는 반응이 환원이다.',
  },
  {
    id: 'Z08-2.1.3-02', unitId: 'sci2-1-3', std: ['10통과2-01-03'], zone: 8, diff: 'basic', use: ['gate', 'planet', 'heist'], heist: 'H2', status: 'draft',
    stem: '산화와 환원에 대한 설명으로 옳은 것은?',
    correct: '동시에 일어난다',
    wrong: ['산화만 따로 일어난다', '환원은 산소를 얻는 반응이다', '산화는 산소를 잃는 반응이다'],
    why: '한 물질이 산소를 얻으면 다른 물질은 그 산소를 잃으므로 둘은 함께 일어난다.',
    misconception: '산화와 환원은 따로 일어난다',
  },
  {
    id: 'Z08-2.1.3-03', unitId: 'sci2-1-3', std: ['10통과2-01-03'], zone: 8, diff: 'standard', use: ['gate', 'planet', 'heist'], heist: 'H2', status: 'draft',
    stem: '광합성, 연소, 철 제련의 공통점은?',
    correct: '산화와 환원이 함께 일어난다',
    wrong: ['열이 항상 방출된다', '높은 온도가 반드시 필요하다', '원소가 다른 원소로 바뀐다'],
    why: '세 과정 모두 산소나 전자가 이동하는 산화·환원 반응이다.',
  },
  {
    id: 'Z08-2.1.3-04', unitId: 'sci2-1-3', std: ['10통과2-01-03'], zone: 8, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '철광석(Fe₂O₃)에서 철을 얻는 제련 과정에서 철광석은 어떻게 될까?',
    correct: '산소를 잃고 환원된다',
    wrong: ['산소를 얻고 산화된다', '산소를 잃고 산화된다', '산소를 얻고 환원된다'],
    why: '산화철이 산소를 잃고 철이 되는 변화는 환원이다.',
  },
  {
    id: 'Z08-2.1.3-05', unitId: 'sci2-1-3', std: ['10통과2-01-03'], zone: 8, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '마그네슘(Mg)이 전자를 잃고 Mg²⁺가 될 때 Mg는?',
    correct: '산화된다',
    wrong: ['환원된다', '중화된다', '변하지 않는다'],
    why: '전자를 잃는 변화가 산화이다.',
  },
  {
    id: 'Z08-2.1.3-06', unitId: 'sci2-1-3', std: ['10통과2-01-03'], zone: 8, diff: 'advanced', use: ['gate', 'planet', 'heist'], heist: 'H2', status: 'draft',
    stem: '화성 토양의 철이 산소와 결합해 붉은 산화철이 되었다. 이때 산화된 물질은?',
    correct: '철',
    wrong: ['산소', '철과 산소 모두', '산화철'],
    why: '산소를 얻은 철이 산화되고, 산화철은 그 결과로 생긴 물질이다.',
  },
  {
    id: 'Z08-2.1.3-07', unitId: 'sci2-1-3', std: ['10통과2-01-03'], zone: 8, diff: 'advanced', use: ['gate', 'planet', 'heist'], heist: 'H2', status: 'draft',
    stem: '산화 구리(CuO)와 탄소 가루를 가열하자 구리가 생겼다. 이때 탄소는?',
    correct: '산소를 얻어 산화된다',
    wrong: ['산소를 잃어 환원된다', '중화된다', '변하지 않는다'],
    why: 'CuO가 환원되는 동시에 탄소는 그 산소를 얻어 산화된다.',
  },
  // ── sci2-1-4 ──
  {
    id: 'Z08-2.1.4-01', unitId: 'sci2-1-4', std: ['10통과2-01-04'], zone: 8, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '염기가 물에 녹아 내놓는 이온은?',
    correct: '수산화 이온(OH⁻)',
    wrong: ['수소 이온(H⁺)', '염화 이온(Cl⁻)', '나트륨 이온(Na⁺)'],
    why: '아레니우스 정의에서 염기는 물에 녹아 OH⁻를 내놓는 물질이다.',
  },
  {
    id: 'Z08-2.1.4-02', unitId: 'sci2-1-4', std: ['10통과2-01-04'], zone: 8, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '푸른 리트머스 종이를 산성 용액에 대면 색은?',
    correct: '붉게 변한다',
    wrong: ['푸른색 그대로이다', '노랗게 변한다', '하얗게 변한다'],
    why: '산성 용액은 푸른 리트머스 종이를 붉게 변하게 한다.',
  },
  {
    id: 'Z08-2.1.4-03', unitId: 'sci2-1-4', std: ['10통과2-01-04'], zone: 8, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '노란색 BTB 용액이 든 산성 용액에 염기를 가해 딱 중화시키면 색은?',
    correct: '초록색',
    wrong: ['파란색', '노란색 그대로', '붉은색'],
    why: 'BTB 용액은 산성에서 노랑, 중성에서 초록, 염기성에서 파랑이다.',
  },
  {
    id: 'Z08-2.1.4-04', unitId: 'sci2-1-4', std: ['10통과2-01-04'], zone: 8, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '묽은 염산에 수산화 나트륨 수용액을 섞어 중화시키면 온도는?',
    correct: '올라간다',
    wrong: ['내려간다', '변하지 않는다', '얼어붙는다'],
    why: '중화 반응은 열을 내놓는 발열 반응이다.',
    misconception: '중화는 흡열 반응이다',
  },
  {
    id: 'Z08-2.1.4-05', unitId: 'sci2-1-4', std: ['10통과2-01-04'], zone: 8, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '중화 반응에서 H⁺와 OH⁻가 결합해 생기는 물질은?',
    correct: '물(H₂O)',
    wrong: ['수소 기체', '산소 기체', '이산화 탄소'],
    why: 'H⁺와 OH⁻가 1:1로 결합하면 물이 된다.',
  },
  {
    id: 'Z08-2.1.4-06', unitId: 'sci2-1-4', std: ['10통과2-01-04'], zone: 8, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '산 용액에 염기 용액을 조금씩 넣을 때 온도가 가장 높아지는 시점은?',
    correct: '산과 염기가 딱 맞게 중화될 때',
    wrong: ['염기를 넣기 시작할 때', '염기를 아주 많이 넣었을 때', '산이 많이 남아 있을 때'],
    why: '중화 열은 산과 염기가 모두 반응하는 지점에서 가장 많이 발생한다.',
  },
  {
    id: 'Z08-2.1.4-07', unitId: 'sci2-1-4', std: ['10통과2-01-04'], zone: 8, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '같은 농도의 염산 10 mL와 수산화 나트륨 수용액 15 mL를 섞고 BTB를 떨어뜨리면?',
    correct: '파란색',
    wrong: ['노란색', '초록색', '붉은색'],
    why: 'OH⁻가 H⁺보다 많이 남아 염기성이므로 BTB는 파란색이다.',
  },
];
