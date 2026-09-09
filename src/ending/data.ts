/* 엔딩 이름/플레이버 문단/한 문장 요약용 절 — 순수 텍스트 데이터 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  Gp._endingNames = {
    blackhole: "블랙홀", supernova: "초신성", whitedwarf: "백색왜성",
    friends: "영원한 친구 (백색왜성 쌍성계)", merge: "블랙홀에 병합됨",
    collision: "동반 타살", spider: "스파이더별 (거미펄서)",
  };

  Gp._endingFlavor = {
    blackhole: "너의 잔해는 은하 한켠에 사건의 지평선을 남겼다. {distance}광년을 헤엄쳐 온 빛조차, 이제 그곳을 벗어나지 못한다.",
    supernova: "너의 마지막 숨은 우주 전역에 무거운 원소를 흩뿌렸다. 언젠가 그 잔해로 새로운 별이, 어쩌면 생명이 태어날 것이다.",
    whitedwarf: "너는 조용히 식어간다. {age}을 달려온 여정의 끝에서, 그 자리를 지키는 작고 단단한 결정체로 남았다.",
    friends: "너와 동반성은 서로를 비추며 영원히 식어간다. 수십억 년이 지나도, 그 둘은 여전히 같은 궤도를 돈다.",
    merge: "너는 동반성이 남긴 심연에 스스로 걸어 들어갔다. 두 개의 이야기가 하나의 어둠이 되었다.",
    collision: "가까워질수록 파국이었다. 두 별은 서로를 끌어안은 채 동시에 사라졌고, 그 충격은 은하 저편까지 전해졌다.",
    spider: "동반성이 먼저 떠난 자리, 너는 1억 년 동안 그 잔광에 시달리며 서서히 깎여나갔다. 끝내 남은 건 벗겨진 껍질뿐.",
  };

  Gp._endingClause = {
    blackhole: "모든 것을 끌어안다 스스로 무너진",
    supernova: "마지막 순간까지 타오르다 흩어진",
    whitedwarf: "조용히 자신을 다스리며 식어간",
    friends: "조용히 관조하며 영원한 친구 곁에 머문",
    merge: "동반성의 어둠 속으로 스스로 걸어 들어간",
    collision: "가까움이 곧 파국이었던 순간을 함께한",
    spider: "떠난 이의 잔광에 서서히 깎여나간",
  };
})();
