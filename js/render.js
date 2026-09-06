/* 캔버스 렌더링: 배경 별밭, 플레이어 별, 엔딩 연출 애니메이션 */
(function(){
"use strict";
const Game = window.Game = window.Game || {};
const clamp = Game.clamp;

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

const Render = {
  canvas, ctx, W:0, H:0,
  stars:[],
  starAngle:0,
  endingAnimT:0, endingAnimDur:3.2, endingParticles:[],

  resize(){
    this.W = canvas.width = window.innerWidth;
    this.H = canvas.height = window.innerHeight;
  },

  initStars(){
    this.stars=[];
    const count=260;
    for (let i=0;i<count;i++){
      this.stars.push({
        x:Math.random()*this.W, y:Math.random()*this.H*0.85,
        r: 0.6+Math.random()*1.8,
        layer: 0.3+Math.random()*1.0,
        baseAlpha: 0.4+Math.random()*0.6
      });
    }
  },

  starBudget(){
    const step = Math.floor(Game.state.distanceLy);
    return Math.max(1, 260 - step*22);
  },

  bgDarkness(){
    return clamp(Game.state.distanceLy/12, 0, 1);
  },

  massColor(m){
    const t = clamp(m/120,0,1);
    const stops = [
      [255,90,60],[255,160,70],[255,225,140],[255,255,240],[190,215,255],[150,190,255]
    ];
    const pos = t*(stops.length-1);
    const i0=Math.floor(pos), i1=Math.min(stops.length-1,i0+1), f=pos-i0;
    const c0=stops[i0], c1=stops[i1];
    return `rgb(${Math.round(c0[0]+(c1[0]-c0[0])*f)},${Math.round(c0[1]+(c1[1]-c0[1])*f)},${Math.round(c0[2]+(c1[2]-c0[2])*f)})`;
  },

  drawPlayerStar(){
    const state = Game.state;
    const r = 14 + clamp(state.volume,6,160)*0.55;
    const x = this.W*0.28, y = this.H*0.55;
    const col = this.massColor(state.mass);
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(this.starAngle);
    const grad = ctx.createRadialGradient(0,0,0,0,0,r*2.2);
    grad.addColorStop(0, col);
    grad.addColorStop(0.5, col+'');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha=0.5;
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.arc(0,0,r*2.2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle=col;
    ctx.shadowColor=col; ctx.shadowBlur=30;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(0,0,0,.15)';
    for (let i=0;i<3;i++){
      ctx.beginPath();
      ctx.arc(r*0.3,0, r*0.55, i*1.4, i*1.4+1.2);
      ctx.stroke();
    }
    ctx.restore();
    return {x,y,r};
  },

  setupEndingAnim(type){
    this.endingAnimT=0; this.endingParticles=[];
    const n = 90;
    for (let i=0;i<n;i++){
      const a = Math.random()*Math.PI*2;
      this.endingParticles.push({a, speed: 20+Math.random()*80, r: 1+Math.random()*2.5, life:1});
    }
    if (type==='blackhole') this.endingAnimDur=3.6;
    else if (type==='supernova') this.endingAnimDur=3.0;
    else if (type==='whitedwarf') this.endingAnimDur=3.2;
    else if (type==='friends') this.endingAnimDur=3.4;
    else if (type==='merge') this.endingAnimDur=3.4;
    else if (type==='collision') this.endingAnimDur=3.0;
    else if (type==='spider') this.endingAnimDur=3.6;
    this.playEndingSound(type);
  },

  playEndingSound(type){
    const A = Game.Audio;
    if (!A.actx) return;
    if (type==='blackhole') A.playSweep(500,40,3.2);
    else if (type==='supernova') { A.playNoiseBurst(1.2,.5); A.playTone(120,1.5,'sawtooth',.25); }
    else if (type==='whitedwarf') A.playSweep(400,180,2.6);
    else if (type==='friends') { A.playTone(523,1.6,'sine',.15); A.playTone(659,1.6,'sine',.12,.3); }
    else if (type==='merge') A.playSweep(300,30,3.0);
    else if (type==='collision') { A.playNoiseBurst(.8,.45); setTimeout(()=>A.playNoiseBurst(.8,.4),250); }
    else if (type==='spider') { for(let i=0;i<6;i++) setTimeout(()=>A.playTone(880,.08,'square',.12), i*350); }
  },

  drawEndingAnim(){
    const p = clamp(this.endingAnimT/this.endingAnimDur,0,1);
    const cx = this.W*0.5, cy = this.H*0.5;
    ctx.fillStyle='rgba(2,3,10,'+(0.25)+')';
    ctx.fillRect(0,0,this.W,this.H);
    const type = Game.state.endingType;

    if (type==='blackhole'){
      const shrink = 1-p;
      for (const pt of this.endingParticles){
        const dist = (1-p)*(200+pt.speed);
        const x = cx+Math.cos(pt.a+p*8)*dist, y=cy+Math.sin(pt.a+p*8)*dist;
        ctx.fillStyle='rgba(180,190,255,'+(0.6*(1-p))+')';
        ctx.beginPath(); ctx.arc(x,y,pt.r,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle='#000';
      ctx.beginPath(); ctx.arc(cx,cy, 40*shrink, 0, Math.PI*2); ctx.fill();
    } else if (type==='supernova'){
      for (let i=0;i<3;i++){
        const rr = p*400 - i*40;
        if (rr<0) continue;
        ctx.strokeStyle='rgba(255,220,160,'+clamp(0.8-p,0,0.8)+')';
        ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(cx,cy,rr,0,Math.PI*2); ctx.stroke();
      }
      ctx.fillStyle='rgba(255,255,255,'+clamp(1-p*1.6,0,1)+')';
      ctx.beginPath(); ctx.arc(cx,cy, 60*(1-p*0.5), 0, Math.PI*2); ctx.fill();
    } else if (type==='whitedwarf'){
      const r = 60*(1-p*0.85);
      ctx.fillStyle='rgba(255,255,255,'+ (0.9) +')';
      ctx.shadowColor='#fff'; ctx.shadowBlur=40*(1-p);
      ctx.beginPath(); ctx.arc(cx,cy,Math.max(4,r),0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    } else if (type==='friends'){
      const tw = 0.6+0.4*Math.sin(p*Math.PI*6);
      [ -70, 70 ].forEach(off=>{
        ctx.fillStyle='rgba(255,255,255,'+tw+')';
        ctx.shadowColor='#fff'; ctx.shadowBlur=25;
        ctx.beginPath(); ctx.arc(cx+off,cy,18,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
      });
    } else if (type==='merge'){
      const holeX = cx+180;
      ctx.fillStyle='rgba(0,0,0,.9)'; ctx.beginPath(); ctx.arc(holeX,cy,26,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(160,180,255,.6)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(holeX,cy,34,0,Math.PI*2); ctx.stroke();
      const sx = cx-220 + p*(220+180-30);
      const stretch = 1+p*5;
      ctx.save(); ctx.translate(sx,cy); ctx.scale(stretch,1/Math.sqrt(stretch));
      ctx.fillStyle='rgba(220,225,255,'+clamp(1-p*0.6,0,1)+')';
      ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill();
      ctx.restore();
    } else if (type==='collision'){
      const gap = (1-p)*160;
      ctx.fillStyle='rgba(255,200,140,.9)';
      ctx.beginPath(); ctx.arc(cx-gap,cy,14,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+gap,cy,14,0,Math.PI*2); ctx.fill();
      if (p>0.45){
        const fp=(p-0.45)/0.55;
        ctx.fillStyle='rgba(255,240,200,'+clamp(1-fp,0,1)+')';
        ctx.beginPath(); ctx.arc(cx,cy,fp*160,0,Math.PI*2); ctx.fill();
      }
    } else if (type==='spider'){
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(p*10);
      ctx.strokeStyle='rgba(160,220,255,.6)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-260,0); ctx.lineTo(260,0); ctx.stroke();
      ctx.restore();
      const r = 22*(1-p*0.5);
      ctx.fillStyle='rgba(255,210,180,'+clamp(1-p*0.7,0.15,1)+')';
      ctx.beginPath(); ctx.ellipse(cx,cy,r*(1+p*0.6),r*(1-p*0.4),0,0,Math.PI*2); ctx.fill();
    }
  }
};

window.addEventListener('resize', ()=>Render.resize());
Render.resize();

Game.Render = Render;

})();
