/* 엔딩 분기 로직, 성격 유형 분석, 크레딧 화면 구성 */
(function(){
"use strict";
const Game = window.Game = window.Game || {};

const ENDING_NAMES = {
  blackhole:"블랙홀", supernova:"초신성", whitedwarf:"백색왜성",
  friends:"영원한 친구 (백색왜성 쌍성계)", merge:"블랙홀에 병합됨",
  collision:"동반 타살", spider:"스파이더별 (거미펄서)"
};
const FLAVOR = {
  blackhole:"너의 잔해는 은하 한켠에 사건의 지평선을 남겼다. {distance}광년을 헤엄쳐 온 빛조차, 이제 그곳을 벗어나지 못한다.",
  supernova:"너의 마지막 숨은 우주 전역에 무거운 원소를 흩뿌렸다. 언젠가 그 잔해로 새로운 별이, 어쩌면 생명이 태어날 것이다.",
  whitedwarf:"너는 조용히 식어간다. {age}년을 달려온 여정의 끝에서, 그 자리를 지키는 작고 단단한 결정체로 남았다.",
  friends:"너와 동반성은 서로를 비추며 영원히 식어간다. 수십억 년이 지나도, 그 둘은 여전히 같은 궤도를 돈다.",
  merge:"너는 동반성이 남긴 심연에 스스로 걸어 들어갔다. 두 개의 이야기가 하나의 어둠이 되었다.",
  collision:"가까워질수록 파국이었다. 두 별은 서로를 끌어안은 채 동시에 사라졌고, 그 충격은 은하 저편까지 전해졌다.",
  spider:"동반성이 먼저 떠난 자리, 너는 1억 년 동안 그 잔광에 시달리며 서서히 깎여나갔다. 끝내 남은 건 벗겨진 껍질뿐."
};
const ENDING_CLAUSE = {
  blackhole:"모든 것을 끌어안다 스스로 무너진",
  supernova:"마지막 순간까지 타오르다 흩어진",
  whitedwarf:"조용히 자신을 다스리며 식어간",
  friends:"조용히 관조하며 영원한 친구 곁에 머문",
  merge:"동반성의 어둠 속으로 스스로 걸어 들어간",
  collision:"가까움이 곧 파국이었던 순간을 함께한",
  spider:"떠난 이의 잔광에 서서히 깎여나간"
};
const ARCH = {
  EB:{title:"팽창형 개입가", desc:"무엇이든 끌어안고 보는 성향, 몸집을 불리는 데 주저함이 없다."},
  EP:{title:"신중한 수집가", desc:"천천히, 그러나 꾸준히 모으는 성향."},
  CB:{title:"대담한 정리자", desc:"위험을 감수하며 스스로를 깎아내는 데 익숙하다."},
  CP:{title:"고요한 관조자", desc:"최소한의 개입으로 흐름에 몸을 맡긴다."},
  EBX:{title:"탐욕스러운 붕괴자", desc:"거의 모든 순간 손을 뻗었고, 위험조차 서슴지 않았다."},
  CPX:{title:"은둔의 수도자", desc:"거의 모든 순간 물러섰고, 어떤 위험도 곁에 두지 않았다."}
};

function naturalEndingType(){
  const state = Game.state;
  if (state.hasCompanion && state.companionAlive && state.mass<50) return 'friends';
  if (state.hasCompanion && !state.companionAlive && state.staysBound) return 'spider';
  if (state.mass>=80) return 'blackhole';
  if (state.mass>=50) return 'supernova';
  return 'whitedwarf';
}

function computeArchetype(){
  const state = Game.state;
  const total = state.choiceLog.length;
  if (total===0) return ARCH.CP;
  let wCount=0, riskCount=0;
  for (const c of state.choiceLog){ if (c.key==='W') wCount++; if (c.riskTier>=2) riskCount++; }
  const wRatio = wCount/total, riskRatio = riskCount/total;
  const axisA = wRatio>=0.5 ? 'E':'C';
  const axisB = riskRatio>=0.28 ? 'B':'P';
  if (axisA==='E' && axisB==='B' && wRatio>=0.85) return ARCH.EBX;
  if (axisA==='C' && axisB==='P' && wRatio<=0.15) return ARCH.CPX;
  return ARCH[axisA+axisB];
}

function buildCredits(){
  const state = Game.state;
  const type = state.endingType;
  const arch = computeArchetype();
  const distStr = state.distanceLy.toFixed(1);
  const ageStr = Math.floor(state.ageYears).toLocaleString('ko-KR');
  const total = state.choiceLog.length;
  let wCount=0; for (const c of state.choiceLog) if (c.key==='W') wCount++;
  const wPct = total? Math.round(wCount/total*100):0;
  const sPct = 100-wPct;
  const companionStr = state.hasCompanion
    ? (state.companionAlive? "생존 (동반성과 함께)" : "먼저 사망")
    : "없음";
  const flavor = FLAVOR[type].replace('{distance}', distStr).replace('{age}', ageStr);
  const finalLine = `너는 ${ENDING_CLAUSE[type]}, ${arch.title}였다.`;

  const root = document.getElementById('creditsScroll');
  root.innerHTML =
    `<h1>${ENDING_NAMES[type]}</h1>`+
    `<div class="sub">THE LIFE OF A STAR</div>`+
    `<div class="statBlock">`+
      `총 이동거리 &nbsp;<span>${distStr} 광년</span><br>`+
      `총 생존 연수 &nbsp;<span>${ageStr} 년</span><br>`+
      `최종 질량 &nbsp;<span>${state.mass.toFixed(0)}</span> · 최종 부피 &nbsp;<span>${state.volume.toFixed(0)}</span><br>`+
      `겪은 이벤트 수 &nbsp;<span>${total}</span><br>`+
      `동반성 &nbsp;<span>${companionStr}</span><br>`+
      `선택 성향 &nbsp;<span>W ${wPct}% / S ${sPct}%</span>`+
    `</div>`+
    `<div class="sectionTitle">우주에 생긴 일</div>`+
    `<div class="flavor">${flavor}</div>`+
    `<div class="sectionTitle">성격 유형 분석</div>`+
    `<div class="archTitle">${arch.title}</div>`+
    `<div class="archDesc">${arch.desc}</div>`+
    `<div class="finalLine">"${finalLine}"</div>`+
    `<div class="theEnd">THE END</div>`+
    `<button id="restartBtn">다시 시작</button>`;

  document.getElementById('restartBtn').addEventListener('click', restart);
  document.getElementById('credits').classList.add('show');
}

function restart(){
  document.getElementById('credits').classList.remove('show');
  Game.resetState();
  Game.Render.initStars();
  document.getElementById('startOverlay').style.display='flex';
}

Game.Ending = {
  NAMES: ENDING_NAMES, FLAVOR, CLAUSE: ENDING_CLAUSE, ARCH,
  naturalEndingType, computeArchetype, buildCredits, restart
};

})();
