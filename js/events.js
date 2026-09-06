/* W/S 갈림길 이벤트 데이터 + 선택 로직
   vis: 선택지 애니메이션 묘사 파라미터
     mass/volume/fuel: -2~2 (증감 방향/세기)
     special: null 이거나 다음 중 하나
       'bond'(동반성 결속) 'pass'(스쳐 지나감) 'stayBound'(근접 유지)
       'drift'(거리를 둠) 'collide'(충돌) 'swerve'(회피) 'impact'(파편 충격)
       'compress'(압축) 'flare'(격렬한 발화) 'fade'(서서히 소멸)
*/
(function(){
"use strict";
const Game = window.Game = window.Game || {};

Game.EVENTS = [
  { id:1, once:false, title:"원시 원반의 잔해",
    desc:"주변을 맴도는 먼지 원반이 아직 흩어지지 않았다.",
    condition:s=>s.distanceLy<3,
    w:{label:"강하게 끌어당긴다", riskTier:1, vis:{mass:2,volume:1,fuel:-1}, apply:s=>{s.mass+=9; s.volume+=5; s.fuel-=8;}},
    s:{label:"천천히 정착하며 균형을 잡는다", riskTier:0, vis:{mass:1,volume:1,fuel:0}, apply:s=>{s.mass+=5; s.volume+=5;}} },
  { id:2, once:false, title:"거대 분자운 통과",
    desc:"짙은 가스 구름이 진로를 가로막는다.",
    condition:s=>s.distanceLy<3,
    w:{label:"구름 속으로 파고들어 흡수한다", riskTier:1, vis:{mass:1,volume:2,fuel:0}, apply:s=>{s.mass+=6; s.volume+=10;}},
    s:{label:"구름을 피해 돌아간다", riskTier:0, vis:{mass:0,volume:0,fuel:-1}, apply:s=>{s.fuel-=2;}} },
  { id:3, once:false, title:"쌍둥이 원시성 경쟁",
    desc:"근처에 같은 물질을 노리는 또 다른 원시성이 있다.",
    condition:s=>s.distanceLy<3,
    w:{label:"물질을 먼저 차지하려 경쟁한다", riskTier:1, vis:{mass:2,fuel:-1}, apply:s=>{s.mass+=8; s.fuel-=6;}},
    s:{label:"양보하고 남는 것을 취한다", riskTier:0, vis:{mass:1,fuel:1}, apply:s=>{s.mass+=3; s.fuel+=6;}} },
  { id:4, once:false, title:"자전 가속",
    desc:"회전이 점점 빨라지며 형태가 요동친다.",
    condition:s=>s.distanceLy<3,
    w:{label:"회전을 가속해 편평해진다", riskTier:0, vis:{volume:2}, apply:s=>{s.volume+=8;}},
    s:{label:"천천히 응축된다", riskTier:0, vis:{mass:1,volume:-1}, apply:s=>{s.mass+=6; s.volume-=5;}} },
  { id:5, once:false, title:"핵융합 점화",
    desc:"중심부에서 첫 반응이 시작된다.",
    condition:s=>s.distanceLy>=3 && s.distanceLy<7,
    w:{label:"반응을 적극적으로 가속한다", riskTier:2, vis:{mass:-1,fuel:-2}, apply:s=>{s.mass-=2; s.fuel-=14;}},
    s:{label:"반응을 조절해 안정화한다", riskTier:0, vis:{fuel:2}, apply:s=>{s.fuel+=10;}} },
  { id:6, once:false, title:"항성풍 분출",
    desc:"표면에서 물질이 뿜어져 나가려 한다.",
    condition:s=>s.distanceLy>=3 && s.distanceLy<7,
    w:{label:"강하게 뿜어낸다", riskTier:1, vis:{mass:-2,volume:-1}, apply:s=>{s.mass-=10; s.volume-=6;}},
    s:{label:"조용히 흘려보낸다", riskTier:0, vis:{mass:-1}, apply:s=>{s.mass-=4;}} },
  { id:7, once:false, title:"소행성대 통과",
    desc:"파편이 빽빽하게 흩어진 지대를 지난다.",
    condition:s=>s.distanceLy>=3 && s.distanceLy<7,
    w:{label:"충돌을 감수하고 돌진한다", riskTier:2, vis:{special:'impact'}, apply:s=>{ const dmg = s.volume<25?10:3; s.mass += s.volume<25? -dmg : 6; }},
    s:{label:"중력으로 끌어당겨 흡수한다", riskTier:0, vis:{mass:1}, apply:s=>{s.mass+=4;}} },
  { id:8, once:true, title:"동반성 조우",
    desc:"근처를 떠돌던 또 다른 원시성이 안정 궤도에 들어온다.",
    condition:s=>s.distanceLy>=3 && s.distanceLy<7 && !s.hasCompanion && !s.companionEventShown,
    w:{label:"끌어당겨 궤도에 묶는다", riskTier:1, vis:{special:'bond'}, apply:s=>{
        s.hasCompanion=true; s.companionEventShown=true;
        const r = Math.random();
        if (r<0.34){ s.companionTier='low'; s.companionMass = 25+Math.random()*20; }
        else if (r<0.67){ s.companionTier='mid'; s.companionMass = 50+Math.random()*28; }
        else { s.companionTier='high'; s.companionMass = 80+Math.random()*30; }
        s.companionFuel = Game.FUEL_MAX;
        s.companionAlive = true;
    }},
    s:{label:"서로의 중력만 느끼며 스쳐 지나간다", riskTier:0, vis:{special:'pass'}, apply:s=>{ s.companionEventShown=true; }} },
  { id:9, once:false, title:"가스 자이언트 흡수",
    desc:"거대한 가스 덩어리가 궤도 안으로 들어왔다.",
    condition:s=>s.distanceLy>=3 && s.distanceLy<7,
    w:{label:"집어삼킨다", riskTier:1, vis:{mass:2,volume:2}, apply:s=>{s.mass+=12; s.volume+=12;}},
    s:{label:"밀어낸다", riskTier:0, vis:{fuel:1}, apply:s=>{s.fuel+=6;}} },
  { id:10, once:false, title:"초신성 잔해 구름 통과",
    desc:"오래전 죽은 별의 무거운 원소가 흩어져 있다.",
    condition:s=>s.distanceLy>=3 && s.distanceLy<7,
    w:{label:"무거운 원소를 흡수한다", riskTier:1, vis:{mass:2,volume:1}, apply:s=>{s.mass+=15; s.volume+=3;}},
    s:{label:"가볍게 스치듯 통과한다", riskTier:0, vis:{mass:1}, apply:s=>{s.mass+=3;}} },
  { id:11, once:false, title:"핵 붕괴 전조",
    desc:"중심핵이 눈에 띄게 불안정해지기 시작한다.",
    condition:s=>s.distanceLy>=7,
    w:{label:"핵을 압축해 버틴다", riskTier:2, vis:{fuel:-2,special:'compress'}, apply:s=>{s.fuel-=20;}},
    s:{label:"외피를 벗어던져 부담을 던다", riskTier:0, vis:{mass:-2,volume:-2,fuel:2}, apply:s=>{s.mass-=10; s.volume-=10; s.fuel+=14;}} },
  { id:12, once:true, title:"동반성의 위기",
    desc:"동반성이 눈에 띄게 불안정해지고 있다.",
    condition:s=>s.distanceLy>=7 && s.hasCompanion && s.companionAlive && s.companionTier!=='low' && !s.crisisShown,
    w:{label:"궤도를 좁혀 가까이 머문다", riskTier:1, vis:{special:'stayBound'}, apply:s=>{ s.staysBound=true; s.crisisShown=true; }},
    s:{label:"거리를 두어 각자의 길을 간다", riskTier:0, vis:{special:'drift'}, apply:s=>{ s.staysBound=false; s.crisisShown=true; }} },
  { id:13, once:true, title:"충돌 코스",
    desc:"동반성과의 궤도가 위험할 만큼 좁혀졌다.",
    condition:s=>s.distanceLy>=7 && s.hasCompanion && s.staysBound && s.companionAlive && !s.collisionEventShown,
    w:{label:"정면으로 충돌해 하나가 된다", riskTier:2, vis:{special:'collide'}, apply:s=>{ s.collisionEventShown=true; s.collisionFlag=true; }},
    s:{label:"마지막 순간 궤도를 튼다", riskTier:1, vis:{special:'swerve'}, apply:s=>{ s.collisionEventShown=true; s.mass+=4; s.volume+=2; }} },
  { id:14, once:false, title:"은하 중심 접근",
    desc:"초거대질량 블랙홀의 조석력이 느껴진다.",
    condition:s=>s.distanceLy>=7,
    w:{label:"중력에 몸을 맡긴다", riskTier:2, vis:{mass:2,fuel:-2}, apply:s=>{s.mass+=14; s.fuel-=18;}},
    s:{label:"벗어나려 발버둥친다", riskTier:1, vis:{mass:-1,volume:1,fuel:2}, apply:s=>{s.mass-=6; s.volume+=6; s.fuel+=10;}} },
  { id:15, once:true, title:"마지막 숨",
    desc:"연료가 얼마 남지 않았다.",
    condition:s=>s.distanceLy>=7 && (s.fuel/Game.FUEL_MAX)<0.22 && !s.lastBreathShown,
    w:{label:"마지막으로 크게 타오른다", riskTier:2, vis:{fuel:-2,special:'flare'}, apply:s=>{s.mass+=5; s.fuel-=30; s.lastBreathShown=true;}},
    s:{label:"조용히 사그라들기 시작한다", riskTier:0, vis:{fuel:-1,special:'fade'}, apply:s=>{s.fuel-=8; s.lastBreathShown=true;}} },
];

Game.pickEvent = function(){
  const state = Game.state;
  const pool=[];
  for (const e of Game.EVENTS){
    if (e.once && state.usedOnce.has(e.id)) continue;
    if (!e.once && e.id===state.lastEventId) continue;
    if (!e.condition(state)) continue;
    pool.push(e);
    if (e.once) { for(let k=0;k<4;k++) pool.push(e); } // weight specials higher
  }
  if (pool.length===0) return null;
  return pool[Math.floor(Math.random()*pool.length)];
};

})();
