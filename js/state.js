/* 전역 상수, 게임 상태 객체, 공용 유틸 */
(function(){
"use strict";
const Game = window.Game = window.Game || {};

Game.SPEED = 0.1;      // ly / sec
Game.FUEL_MAX = 750;
Game.BASE_BURN = 6;

Game.clamp = function(v,a,b){ return Math.max(a,Math.min(b,v)); };
Game.fuelBurnRate = function(m){ return Game.BASE_BURN * (1 + m/100); };

function freshState(){
  return {
    started:false, gameOver:false, endingType:null,
    mass:20, volume:20, fuel:Game.FUEL_MAX,
    ageYears:0, distanceLy:0,
    hasCompanion:false, companionTier:null, companionMass:0, companionFuel:0,
    companionAlive:false, staysBound:false, mergeFlag:false, collisionFlag:false,
    companionEventShown:false, crisisShown:false, collisionEventShown:false, lastBreathShown:false,
    lastEventId:null, usedOnce:new Set(),
    choiceLog:[],
    eventOpen:false, nextEventAt:6,
    phaseStarBudget:220
  };
}

// state는 여러 모듈이 참조를 공유해야 하므로, 재시작 시에도
// 객체 참조 자체는 유지한 채 내용만 Object.assign으로 교체한다.
Game.state = freshState();
Game.resetState = function(){
  Object.assign(Game.state, freshState());
};

})();
