// 문제 은행 — 구역 S11(가르강튀아)·S12(알파 센타우리·판도라). 스키마: docs/QUIZ_BANK.md 1장.
// S11 의 중력 개념(sci1-3-3) 문항은 Z03 소유 문항에 alsoZones:[11] 로 공유한다. 시간 지연·탈출 속도는 출제하지 않는다.
// 윤리·쟁점 문항은 정답이 가치 중립적으로 판정되는 것만 쓴다.
import type {QuizItem} from './types.js';

/** S11 가르강튀아 — 14문항 (기초 5 · 표준 5 · 심화 4). sci2-3-2 빅데이터 / sci2-3-3 AI·로봇·사물 인터넷 */
export const ZONE11: QuizItem[] = [
  // ── sci2-3-2 ──
  {
    id: 'Z11-2.3.2-01', unitId: 'sci2-3-2', std: ['10통과2-03-02'], zone: 11, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '건강·위치 정보를 모은 빅데이터를 쓸 때 가장 주의할 점은?',
    correct: '개인 정보 보호',
    wrong: ['자료 수 줄이기', '모든 자료 공개하기', '오류를 그대로 쓰기'],
    why: '빅데이터는 유용하지만 개인 정보가 새지 않게 관리해야 한다.',
  },
  {
    id: 'Z11-2.3.2-02', unitId: 'sci2-3-2', std: ['10통과2-03-02'], zone: 11, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '빅데이터의 특징으로 알맞은 것은?',
    correct: '양이 방대하고 빠르게 쌓인다',
    wrong: ['양이 적고 한 번만 모은다', '사람이 손으로만 처리한다', '한 번 모으면 변하지 않는다'],
    why: '빅데이터는 방대한 자료를 빠르게 모아 컴퓨터로 분석한다.',
  },
  {
    id: 'Z11-2.3.2-03', unitId: 'sci2-3-2', std: ['10통과2-03-02'], zone: 11, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '우주 탐사선이 보낸 방대한 관측 자료를 분석할 때 빅데이터가 유용한 까닭은?',
    correct: '많은 자료에서 규칙을 찾을 수 있다',
    wrong: ['자료가 적을수록 정확해서', '오류가 있어도 늘 정확해서', '자료를 모으지 않아도 되어서'],
    why: '빅데이터 분석은 사람이 보기 어려운 많은 자료에서 규칙을 찾아낸다.',
  },
  {
    id: 'Z11-2.3.2-04', unitId: 'sci2-3-2', std: ['10통과2-03-02'], zone: 11, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '다음 중 빅데이터 활용 사례로 알맞은 것은?',
    correct: '교통 카드 기록으로 혼잡 시간 예측',
    wrong: ['한 사람의 키 한 번 재기', '손으로 일기 쓰기', '별 이름 외우기'],
    why: '많은 사람의 이용 기록을 분석해 혼잡 시간을 예측하는 것이 빅데이터 활용이다.',
  },
  {
    id: 'Z11-2.3.2-05', unitId: 'sci2-3-2', std: ['10통과2-03-02'], zone: 11, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '잘못된 자료가 섞인 빅데이터로 분석하면 생길 수 있는 문제는?',
    correct: '잘못된 결론이 나올 수 있다',
    wrong: ['분석이 항상 더 정확해진다', '개인 정보가 안전해진다', '결과가 저절로 고쳐진다'],
    why: '자료에 오류가 있으면 분석 결과도 틀릴 수 있어 자료 품질이 중요하다.',
  },
  {
    id: 'Z11-2.3.2-06', unitId: 'sci2-3-2', std: ['10통과2-03-02'], zone: 11, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '행성 기지 주민의 이동 경로 자료로 시설을 개선하려 한다. 가장 바람직한 처리는?',
    correct: '개인을 알아볼 수 없게 하여 분석',
    wrong: ['이름과 사진을 그대로 공개', '동의 없이 외부에 판매', '불리한 자료만 삭제'],
    why: '개인을 식별할 수 없게 처리하면 자료의 유용성과 정보 보호를 함께 지킬 수 있다.',
  },
  {
    id: 'Z11-2.3.2-07', unitId: 'sci2-3-2', std: ['10통과2-03-02'], zone: 11, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '한 지역에서만 모은 많은 자료로 행성 전체를 예측하면 생기는 문제는?',
    correct: '자료가 치우쳐 예측이 틀릴 수 있다',
    wrong: ['자료가 많아 항상 정확하다', '개인 정보가 사라진다', '어떤 예측도 할 수 없다'],
    why: '자료가 한쪽에 치우치면 양이 많아도 전체를 대표하지 못한다.',
  },
  // ── sci2-3-3 ──
  {
    id: 'Z11-2.3.3-01', unitId: 'sci2-3-3', std: ['10통과2-03-03'], zone: 11, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '사물에 센서와 인터넷을 달아 서로 정보를 주고받게 하는 기술은?',
    correct: '사물 인터넷(IoT)',
    wrong: ['3D 프린팅', '열 기관', '전자기 유도'],
    why: '사물 인터넷은 사물이 인터넷으로 정보를 주고받는 기술이다.',
  },
  {
    id: 'Z11-2.3.3-02', unitId: 'sci2-3-3', std: ['10통과2-03-03'], zone: 11, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: 'AI가 문제를 풀기 위해 먼저 필요한 것은?',
    correct: '학습에 쓸 많은 자료',
    wrong: ['스스로 느끼는 감정', '모든 정답의 미리 입력', '살아 있는 세포'],
    why: 'AI는 많은 자료를 학습해 규칙을 찾아 판단한다.',
  },
  {
    id: 'Z11-2.3.3-03', unitId: 'sci2-3-3', std: ['10통과2-03-03'], zone: 11, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '로봇이 사람 대신 하기에 알맞은 일은?',
    correct: '위험하고 반복적인 작업',
    wrong: ['책임이 필요한 최종 결정 전부', '사람의 감정을 대신 느끼기', '법을 새로 만들기'],
    why: '로봇은 위험하거나 반복적인 일을 사람 대신 할 때 유용하다.',
  },
  {
    id: 'Z11-2.3.3-04', unitId: 'sci2-3-3', std: ['10통과2-03-03'], zone: 11, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '자율 주행 로버가 학습하지 못한 지형에서 길을 잘못 들었다. 이 사례가 보여 주는 AI의 한계는?',
    correct: '낯선 상황에서 오판할 수 있다',
    wrong: ['계산이 너무 느리다', '전기를 쓰지 않는다', '데이터가 필요 없다'],
    why: 'AI는 학습한 자료와 다른 상황에서 잘못 판단할 수 있다.',
  },
  {
    id: 'Z11-2.3.3-05', unitId: 'sci2-3-3', std: ['10통과2-03-03'], zone: 11, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: 'AI의 판단을 사람이 점검해야 하는 까닭은?',
    correct: 'AI도 틀릴 수 있기 때문',
    wrong: ['AI는 늘 완벽해서', '점검하면 AI가 멈춰서', '학습 자료가 필요 없어서'],
    why: '학습 자료의 오류나 편향 때문에 AI도 틀린 판단을 할 수 있다.',
  },
  {
    id: 'Z11-2.3.3-06', unitId: 'sci2-3-3', subUnits: ['sci2-3-4'], std: ['10통과2-03-03'], zone: 11, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '개인 비서 AI가 사용자의 대화를 모은다. 편리함과 함께 따져야 할 것은?',
    correct: '개인 정보 보호와 사용 동의',
    wrong: ['대화 속도뿐이다', '기기 색깔이다', '전기 요금뿐이다'],
    why: 'AI가 개인 정보를 모을 때는 동의를 받고 안전하게 관리해야 한다.',
  },
  {
    id: 'Z11-2.3.3-07', unitId: 'sci2-3-3', subUnits: ['sci2-3-2'], std: ['10통과2-03-03'], zone: 11, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '기지의 산소 센서 정보를 AI가 받아 환기구를 자동 조절한다. 처리 순서는?',
    correct: '측정 → 전송 → 판단 → 작동',
    wrong: ['판단 → 측정 → 전송 → 작동', '작동 → 측정 → 판단 → 전송', '전송 → 작동 → 측정 → 판단'],
    why: '사물 인터넷은 측정한 정보를 보내고 AI가 판단하면 장치가 작동한다.',
  },
];

/** S12 알파 센타우리·판도라 — 21문항 (기초 5 · 표준 11 · 심화 5). sci2-2-6 에너지(H5·H6 풀) / sci2-3-1 감염병 / sci2-3-4 과학 윤리 */
export const ZONE12: QuizItem[] = [
  // ── sci2-2-6 ──
  {
    id: 'Z12-2.2.6-01', unitId: 'sci2-2-6', std: ['10통과2-02-06'], zone: 12, diff: 'basic', use: ['gate', 'planet', 'heist'], heist: 'H5', status: 'draft',
    stem: '에너지가 다른 형태로 바뀔 때 에너지의 총량은?',
    correct: '그대로 보존된다',
    wrong: ['마찰이 있으면 사라진다', '계속 늘어난다', '열로 바뀌면 없어진다'],
    why: '에너지는 전환되어도 총량이 변하지 않는다.',
    misconception: '에너지가 사라진다',
  },
  {
    id: 'Z12-2.2.6-02', unitId: 'sci2-2-6', std: ['10통과2-02-06'], zone: 12, diff: 'basic', use: ['gate', 'planet', 'heist'], heist: 'H5', status: 'draft',
    stem: '다음 중 신재생 에너지는?',
    correct: '태양광',
    wrong: ['석탄', '석유', '천연가스'],
    why: '태양광은 고갈되지 않는 신재생 에너지이고 나머지는 화석 연료이다.',
  },
  {
    id: 'Z12-2.2.6-03', unitId: 'sci2-2-6', std: ['10통과2-02-06'], zone: 12, diff: 'standard', use: ['gate', 'planet', 'heist'], heist: 'H6', status: 'draft',
    stem: '발전소가 공급받은 에너지 200 MJ 중 50 MJ를 전기로 바꿨다. 에너지 효율은?',
    correct: '25 %',
    wrong: ['50 %', '75 %', '4 %'],
    why: '효율은 유용한 에너지 ÷ 공급 에너지 × 100이므로 50÷200×100 = 25 %이다.',
  },
  {
    id: 'Z12-2.2.6-04', unitId: 'sci2-2-6', std: ['10통과2-02-06'], zone: 12, diff: 'standard', use: ['gate', 'planet', 'heist'], heist: 'H5', status: 'draft',
    stem: '전구에 공급한 전기 에너지 100 J 중 빛은 10 J였다. 나머지 90 J은?',
    correct: '대부분 열에너지로 전환됐다',
    wrong: ['에너지가 사라졌다', '빛 에너지로 되돌아왔다', '새로운 에너지로 늘어났다'],
    why: '에너지는 사라지지 않고 쓰기 어려운 열 등으로 전환된다.',
    misconception: '에너지가 사라진다',
  },
  {
    id: 'Z12-2.2.6-05', unitId: 'sci2-2-6', std: ['10통과2-02-06'], zone: 12, diff: 'standard', use: ['gate', 'planet', 'heist'], heist: 'H6', status: 'draft',
    stem: '태양광 발전이 화력 발전과 다른 특징으로 알맞은 것은?',
    correct: '발전 중 CO₂를 직접 내지 않는다',
    wrong: ['밤에도 같은 양을 발전한다', '연료를 계속 태워야 한다', '날씨의 영향을 전혀 안 받는다'],
    why: '태양광은 연소 없이 빛 에너지를 전기 에너지로 바꾼다.',
  },
  {
    id: 'Z12-2.2.6-06', unitId: 'sci2-2-6', std: ['10통과2-02-06'], zone: 12, diff: 'standard', use: ['gate', 'planet', 'heist'], heist: 'H6', status: 'draft',
    stem: '같은 연료 100 MJ로 A 발전소는 전기 30 MJ, B 발전소는 40 MJ를 만든다. 효율이 더 높은 쪽은?',
    correct: 'B, 40 %',
    wrong: ['A, 30 %', 'A, 70 %', 'B, 60 %'],
    why: '효율은 전기 에너지 ÷ 연료 에너지이므로 B가 40 %로 더 높다.',
  },
  {
    id: 'Z12-2.2.6-07', unitId: 'sci2-2-6', std: ['10통과2-02-06'], zone: 12, diff: 'advanced', use: ['gate', 'planet', 'heist'], heist: 'H6', status: 'draft',
    stem: '효율 20 %인 장치를 40 %인 장치로 바꿨다. 같은 출력을 내는 데 필요한 공급 에너지는?',
    correct: '절반으로 줄어든다',
    wrong: ['2배로 늘어난다', '그대로이다', '4배로 늘어난다'],
    why: '공급 에너지 = 출력 ÷ 효율이므로 효율이 2배면 절반이면 된다.',
  },
  // ── sci2-3-1 ──
  {
    id: 'Z12-2.3.1-01', unitId: 'sci2-3-1', std: ['10통과2-03-01'], zone: 12, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '감염병 확산을 줄이는 개인 행동은?',
    correct: '손 씻기와 기침 예절',
    wrong: ['증상이 있어도 모임 참석', '약을 임의로 나눠 먹기', '환기 안 된 곳에 모이기'],
    why: '손 씻기와 기침 예절은 병원체가 퍼지는 것을 줄인다.',
  },
  {
    id: 'Z12-2.3.1-02', unitId: 'sci2-3-1', std: ['10통과2-03-01'], zone: 12, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '감염병 진단에서 병원체의 DNA나 RNA를 찾는 검사는?',
    correct: '핵산(유전자) 검사',
    wrong: ['혈액형 검사', '시력 검사', '골밀도 검사'],
    why: '병원체의 유전 물질인 핵산을 찾으면 감염 여부를 확인할 수 있다.',
  },
  {
    id: 'Z12-2.3.1-03', unitId: 'sci2-3-1', subUnits: ['sci1-2-5'], std: ['10통과2-03-01'], zone: 12, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '병원체의 특정 단백질(항원)을 찾는 검사가 이용하는 성질은?',
    correct: '항원과 항체의 특이적 결합',
    wrong: ['세포막의 선택적 투과', '물질의 전기 전도성', '연료의 연소 반응'],
    why: '항체는 특정 항원에만 결합하는 성질이 있어 단백질 진단에 쓰인다.',
  },
  {
    id: 'Z12-2.3.1-04', unitId: 'sci2-3-1', subUnits: ['sci2-3-4'], std: ['10통과2-03-01'], zone: 12, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '감염병 접촉자 추적에서 알맞은 자세는?',
    correct: '필요한 정보만 모아 보호한다',
    wrong: ['모든 개인 정보를 공개한다', '접촉자를 비난한다', '모은 정보를 판매한다'],
    why: '추적에는 꼭 필요한 정보만 모으고 개인 정보를 안전하게 지켜야 한다.',
  },
  {
    id: 'Z12-2.3.1-05', unitId: 'sci2-3-1', std: ['10통과2-03-01'], zone: 12, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '유전자 진단이 병원체의 고유한 염기 서열을 찾는 까닭은?',
    correct: '종마다 서열이 달라 구별할 수 있어서',
    wrong: ['모든 병원체의 서열이 같아서', '염기 서열은 색이 달라서', '서열이 없는 병원체를 찾으려고'],
    why: '병원체마다 염기 서열이 달라서 그 서열로 어떤 병원체인지 알 수 있다.',
  },
  {
    id: 'Z12-2.3.1-06', unitId: 'sci2-3-1', std: ['10통과2-03-01'], zone: 12, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '증상이 없는 감염자가 많은 감염병에서 증상 확인만으로 확산을 막기 어려운 까닭은?',
    correct: '증상 없는 감염자도 퍼뜨릴 수 있어서',
    wrong: ['증상이 있어야만 전파되어서', '증상은 감염과 무관해서', '진단 검사가 필요 없어서'],
    why: '증상이 없어도 병원체를 옮길 수 있어 검사와 추적이 함께 필요하다.',
  },
  {
    id: 'Z12-2.3.1-07', unitId: 'sci2-3-1', std: ['10통과2-03-01'], zone: 12, diff: 'advanced', use: ['gate', 'planet'], flag: 'verify', status: 'draft',
    stem: '항원 검사는 빠르고 유전자 검사는 정밀하다. 둘을 함께 쓰는 까닭은?',
    correct: '빠른 선별과 정확한 확진을 위해',
    wrong: ['항원 검사가 DNA를 읽어서', '유전자 검사가 단백질만 찾아서', '두 검사가 완전히 같아서'],
    why: '빠른 검사로 먼저 거르고 정밀 검사로 확인하면 효율과 정확성을 모두 얻는다.',
  },
  // ── sci2-3-4 ──
  {
    id: 'Z12-2.3.4-01', unitId: 'sci2-3-4', std: ['10통과2-03-04'], zone: 12, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '행성 자원 채굴이 현지 생태계를 해칠 수 있어 계획을 고쳤다. 이는 과학 기술자의 어떤 자세일까?',
    correct: '사회적·환경적 책임',
    wrong: ['이윤 최대화', '연구 결과 숨기기', '호기심 억누르기'],
    why: '과학 기술의 영향을 예측하고 책임지는 것이 과학 윤리이다.',
  },
  {
    id: 'Z12-2.3.4-02', unitId: 'sci2-3-4', std: ['10통과2-03-04'], zone: 12, diff: 'basic', use: ['gate', 'planet'], status: 'draft',
    stem: '연구 자료를 일부러 바꾸거나 지어내는 행동은?',
    correct: '연구 부정행위(자료 조작)',
    wrong: ['창의적인 연구', '표준에 맞는 측정', '정직한 결과 보고'],
    why: '자료를 조작하는 것은 과학 윤리를 어기는 연구 부정행위이다.',
  },
  {
    id: 'Z12-2.3.4-03', unitId: 'sci2-3-4', std: ['10통과2-03-04'], zone: 12, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '기지 주민의 건강 자료를 연구에 쓰려면 먼저 필요한 것은?',
    correct: '당사자의 동의',
    wrong: ['연구자의 호기심', '자료 공개 후의 동의', '기지 관리자의 구두 허락만'],
    why: '개인의 자료를 연구에 쓰려면 먼저 본인의 동의를 받아야 한다.',
  },
  {
    id: 'Z12-2.3.4-04', unitId: 'sci2-3-4', std: ['10통과2-03-04'], zone: 12, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: 'AI 같은 과학기술이 이로움과 위험을 함께 가질 수 있다는 점은?',
    correct: '과학기술의 양면성',
    wrong: ['과학기술의 무해성', '과학기술의 불변성', '과학기술의 독립성'],
    why: '과학기술은 쓰임에 따라 이로움과 위험을 함께 줄 수 있다.',
  },
  {
    id: 'Z12-2.3.4-05', unitId: 'sci2-3-4', std: ['10통과2-03-04'], zone: 12, diff: 'standard', use: ['gate', 'planet'], status: 'draft',
    stem: '새 기술의 사회적 쟁점을 판단할 때 알맞은 태도는?',
    correct: '근거를 모으고 여러 입장을 살핀다',
    wrong: ['첫인상으로 바로 결정한다', '유명인 의견만 따른다', '소수 의견은 무시한다'],
    why: '근거 자료를 모으고 다양한 입장을 비교해 판단해야 한다.',
  },
  {
    id: 'Z12-2.3.4-06', unitId: 'sci2-3-4', subUnits: ['sci2-2-1'], std: ['10통과2-03-04'], zone: 12, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '행성 자원 채굴이 이익을 주지만 현지 생태계를 해칠 수 있다. 쟁점 해결에 먼저 할 일은?',
    correct: '영향 조사 후 대안 논의',
    wrong: ['이익이 큰 쪽만 선택', '환경 문제는 무시하고 추진', '모든 연구를 즉시 중단'],
    why: '영향을 조사하고 여러 입장이 대안을 논의하는 것이 쟁점 해결의 출발이다.',
  },
  {
    id: 'Z12-2.3.4-07', unitId: 'sci2-3-4', subUnits: ['sci2-3-1'], std: ['10통과2-03-04'], zone: 12, diff: 'advanced', use: ['gate', 'planet'], status: 'draft',
    stem: '새 약 개발 연구가 일부 참여자에게 위험을 줄 수 있다. 우선해야 할 원칙은?',
    correct: '참여자의 안전과 자발적 동의',
    wrong: ['연구 속도와 비용', '참여자 모르게 진행', '결과가 좋을 때만 공개'],
    why: '사람을 대상으로 하는 연구는 참여자의 안전과 자발적 동의가 최우선이다.',
  },
];
