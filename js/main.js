/* 이벤트 팝업 UI, 동반성 운명 시뮬레이션, 인트로/메인 루프, 디버그 훅 */
(function(){
"use strict";
const Game = window.Game = window.Game || {};
const state = Game.state;
const clamp = Game.clamp;
const R = Game.Render;
const A = Game.Audio;

/* ---------------- event popup UI ---------------- */
const popupEl = document.getElementById('eventPopup');
const evTitle = document.getElementById('evTitle');
const evDesc = document.getElementById('evDesc');
const evBtnW = document.getElementById('evBtnW');
const evBtnS = document.getElementById('evBtnS');
const evTimerBar = document.getElementById('evTimerBar');
const animCanvasW = document.getElementById('animW');
const animCanvasS = document.getElementById('animS');
const animCtxW = animCanvasW.getContext('2d');
const animCtxS = animCanvasS.getContext('2d');

let currentEvent=null, evTimeLeft=0, evDuration=4;
let choiceAnimRAF=null, choiceAnimStartT=0;

function runChoiceAnim(now){
  const t = (now-choiceAnimStartT)/1000;
  Game.ChoiceAnim.draw(animCtxW, animCanvasW.width, animCanvasW.height, t, currentEvent.w.vis);
  Game.ChoiceAnim.draw(animCtxS, animCanvasS.width, animCanvasS.height, t, currentEvent.s.vis);
  choiceAnimRAF = requestAnimationFrame(runChoiceAnim);
}

function openEvent(e){
  currentEvent=e; state.eventOpen=true; evTimeLeft=evDuration;
  evTitle.textContent=e.title; evDesc.textContent=e.desc;
  evBtnW.setAttribute('aria-label', e.w.label);
  evBtnS.setAttribute('aria-label', e.s.label);
  evTimerBar.style.transform='scaleX(1)';
  evTimerBar.style.background='#7fa0ff';
  popupEl.classList.add('show');
  A.playTone(660,.15,'sine',.15);
  choiceAnimStartT = performance.now();
  choiceAnimRAF = requestAnimationFrame(runChoiceAnim);
}
function closeEvent(){
  popupEl.classList.remove('show');
  state.eventOpen=false; currentEvent=null;
  state.nextEventAt = state.ageYears + 6 + Math.random()*6;
  if (choiceAnimRAF){ cancelAnimationFrame(choiceAnimRAF); choiceAnimRAF=null; }
}
function resolveEvent(key){
  if (!currentEvent) return;
  const e = currentEvent;
  if (e.once) state.usedOnce.add(e.id);
  state.lastEventId = e.id;
  let riskTier=0;
  if (key==='W'){ e.w.apply(state); riskTier=e.w.riskTier; A.playTone(520,.18,'triangle',.18); }
  else if (key==='S'){ e.s.apply(state); riskTier=e.s.riskTier; A.playTone(340,.18,'triangle',.18); }
  else {
    // timeout: blended weak penalty
    state.fuel -= 6;
    riskTier = 0;
  }
  state.choiceLog.push({id:e.id, key:key, riskTier:riskTier});
  state.mass = clamp(state.mass, 6, 160);
  state.volume = clamp(state.volume, 6, 160);
  closeEvent();
}
evBtnW.addEventListener('click', ()=>resolveEvent('W'));
evBtnS.addEventListener('click', ()=>resolveEvent('S'));
window.addEventListener('keydown', (ev)=>{
  if (!state.started || state.gameOver) return;
  const k = ev.key.toLowerCase();
  if (!state.eventOpen) return;
  if (k==='w') resolveEvent('W');
  else if (k==='s') resolveEvent('S');
});

/* ---------------- companion fate ---------------- */
function updateCompanion(dt){
  if (!state.hasCompanion || !state.companionAlive || state.gameOver) return;
  const burn = state.companionTier==='low' ? 0.01 : Game.fuelBurnRate(state.companionMass);
  state.companionFuel -= burn*dt;
  if (state.companionFuel<=0){
    state.companionAlive=false;
    if (state.companionTier==='high'){
      if (state.staysBound){ state.mergeFlag=true; }
    } else if (state.companionTier==='mid'){
      if (state.staysBound){ playTimeSkip(); }
    }
  }
}

/* ---------------- time skip cutscene ---------------- */
let timeSkipping=false;
function playTimeSkip(){
  timeSkipping = true;
  const el = document.getElementById('timeskip');
  const od = document.getElementById('odometer');
  el.classList.add('show');
  A.playSweep(300,60,2.4);
  const target = 100000000;
  const dur = 2400; const t0 = performance.now();
  function step(now){
    const p = clamp((now-t0)/dur,0,1);
    const eased = 1-Math.pow(1-p,3);
    const val = Math.floor(eased*target);
    od.textContent = val.toLocaleString('ko-KR')+'년';
    if (p<1) requestAnimationFrame(step);
    else {
      state.ageYears += target;
      setTimeout(()=>{ el.classList.remove('show'); timeSkipping=false; }, 400);
    }
  }
  requestAnimationFrame(step);
}

/* ---------------- ending trigger ---------------- */
function triggerEnding(type){
  if (state.gameOver) return;
  state.gameOver=true; state.endingType=type;
  if (state.eventOpen) closeEvent();
  R.setupEndingAnim(type);
}

/* ---------------- title / intro ---------------- */
const startOverlay = document.getElementById('startOverlay');
let introParticles=[];
let introT=0, introPlaying=false, introDur=2.2;
function beginGame(){
  A.init();
  startOverlay.style.display='none';
  introParticles=[];
  const n=140;
  for (let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, d=100+Math.random()*300;
    introParticles.push({x:R.W*0.28+Math.cos(a)*d, y:R.H*0.55+Math.sin(a)*d, tx:R.W*0.28, ty:R.H*0.55});
  }
  introT=0; introPlaying=true;
}
startOverlay.addEventListener('click', beginGame);

/* ---------------- main loop ---------------- */
function lerp(a,b,t){ return a+(b-a)*t; }

function updateHUD(){
  document.getElementById('clockDisplay').textContent = Math.floor(state.ageYears).toLocaleString('ko-KR')+'년';
  document.getElementById('distDisplay').textContent = state.distanceLy.toFixed(1)+' 광년';
}

let lastT = performance.now();
function loop(now){
  const dt = clamp((now-lastT)/1000, 0, 0.05);
  lastT = now;
  requestAnimationFrame(loop);

  const ctx = R.ctx, W = R.W, H = R.H;

  // background darkness fade (우주의 노화)
  const dark = R.bgDarkness();
  const bgCol = `rgba(${lerp(6,2,dark)},${lerp(9,3,dark)},${lerp(24,8,dark)},1)`;
  ctx.fillStyle=bgCol;
  ctx.fillRect(0,0,W,H);

  const budget = introPlaying? R.stars.length : R.starBudget();
  for (let i=0;i<R.stars.length;i++){
    if (i>=budget) continue;
    const s = R.stars[i];
    if (!introPlaying && state.started && !state.gameOver){
      s.x -= Game.SPEED*260*s.layer*dt;
      if (s.x < -5) { s.x = W+5; s.y = Math.random()*H*0.85; }
    }
    ctx.globalAlpha = s.baseAlpha * (1-dark*0.85);
    ctx.fillStyle='#dfe8ff';
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;

  // ground line
  ctx.strokeStyle='rgba(140,160,255,'+ (0.15*(1-dark*0.7)) +')';
  ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,H*0.72); ctx.lineTo(W,H*0.72); ctx.stroke();

  if (introPlaying){
    introT += dt;
    const p = clamp(introT/introDur,0,1);
    for (const pt of introParticles){
      const x = pt.x + (pt.tx-pt.x)*p, y = pt.y + (pt.ty-pt.y)*p;
      ctx.fillStyle='rgba(200,210,255,'+ (0.5+0.5*p) +')';
      ctx.beginPath(); ctx.arc(x,y,1.6,0,Math.PI*2); ctx.fill();
    }
    if (p>=1){
      ctx.fillStyle=R.massColor(state.mass);
      ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=25;
      ctx.beginPath(); ctx.arc(W*0.28,H*0.55,14,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
    if (p>=1 && introT>introDur+0.3){
      introPlaying=false; state.started=true; state.nextEventAt = state.ageYears+5;
    }
  } else if (state.started && !state.gameOver){
    R.starAngle += dt* (0.6+state.mass/120);
    R.drawPlayerStar();

    // simulation updates
    state.ageYears += dt;
    state.distanceLy += Game.SPEED*dt;
    if (!timeSkipping){
      state.fuel -= Game.fuelBurnRate(state.mass)*dt;
      state.mass += state.volume*0.0009*dt*60; // passive ambient absorption tied to volume
      updateCompanion(dt);
    }

    // ending triggers
    if (state.collisionFlag) triggerEnding('collision');
    else if (state.mergeFlag) triggerEnding('merge');
    else if (state.fuel<=0) triggerEnding(Game.Ending.naturalEndingType());

    // event scheduling
    if (!state.eventOpen && !timeSkipping && !state.gameOver && state.ageYears>=state.nextEventAt){
      const e = Game.pickEvent();
      if (e) openEvent(e);
      else state.nextEventAt = state.ageYears+3;
    }
    if (state.eventOpen){
      evTimeLeft -= dt;
      const frac = clamp(evTimeLeft/evDuration,0,1);
      evTimerBar.style.transform='scaleX('+frac+')';
      evTimerBar.style.background = frac<0.3? '#ff6b6b' : (frac<0.6? '#ffcf6b':'#7fa0ff');
      if (evTimeLeft<=0) resolveEvent(null);
    }

    updateHUD();
  } else if (state.gameOver){
    R.drawPlayerStar();
    R.endingAnimT += dt;
    R.drawEndingAnim();
    if (R.endingAnimT>=R.endingAnimDur && document.getElementById('credits').classList.contains('show')===false){
      Game.Ending.buildCredits();
    }
  }
}

R.initStars();
requestAnimationFrame(loop);

/* ---------------- debug hooks ---------------- */
const DEBUG_ORDER = ['blackhole','supernova','whitedwarf','friends','merge','collision','spider'];
window.debugEnding = function(n){
  if (n<1||n>7) { console.warn('use 1~7'); return; }
  A.init();
  document.getElementById('startOverlay').style.display='none';
  document.getElementById('credits').classList.remove('show');
  Game.resetState();
  state.started=true; state.gameOver=false;
  state.distanceLy = 6+Math.random()*5;
  state.ageYears = state.distanceLy/Game.SPEED;
  state.mass = 30+Math.random()*70;
  state.volume = 30+Math.random()*60;
  state.choiceLog = [];
  for (let i=0;i<10;i++){
    state.choiceLog.push({id:i, key: Math.random()<0.5?'W':'S', riskTier: Math.floor(Math.random()*3)});
  }
  const type = DEBUG_ORDER[n-1];
  if (type==='friends'){ state.hasCompanion=true; state.companionAlive=true; state.mass=30; }
  if (type==='spider'){ state.hasCompanion=true; state.companionAlive=false; state.staysBound=true; }
  if (type==='merge'){ state.hasCompanion=true; state.mergeFlag=true; state.companionAlive=false; }
  if (type==='collision'){ state.hasCompanion=true; state.collisionFlag=true; }
  if (type==='blackhole') state.mass=90;
  if (type==='supernova') state.mass=60;
  if (type==='whitedwarf') state.mass=30;
  introPlaying=false;
  triggerEnding(type);
};

})();
