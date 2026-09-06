/* 선택지 미니 애니메이션 렌더러 — 텍스트 설명 대신 효과를 시각적으로 표현 */
(function(){
"use strict";
const Game = window.Game = window.Game || {};

function drawVolumeRings(ctx,cx,cy,t,volume){
  if (!volume) return;
  const dir = volume>0?1:-1;
  const mag = Math.min(2, Math.abs(volume));
  for (let i=0;i<3;i++){
    const phase = ((t*0.55*(0.6+mag*0.4))+i/3)%1;
    const rr = dir>0 ? 6+phase*24 : 30-phase*24;
    const alpha = (1-phase)*0.45;
    ctx.strokeStyle = `rgba(150,185,255,${Math.max(0,alpha)})`;
    ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.arc(cx,cy,Math.max(2,rr),0,Math.PI*2); ctx.stroke();
  }
}

function drawFuelSparks(ctx,cx,cy,t,fuel){
  if (!fuel) return;
  const dir = fuel>0?1:-1;
  const mag = Math.min(2, Math.abs(fuel));
  const n = 3+mag*2;
  for (let i=0;i<n;i++){
    const a = (i/n)*Math.PI*2 + t*0.6;
    const phase = ((t*0.7+i*0.37)%1);
    const rad = dir>0 ? 30-phase*22 : 10+phase*22;
    const x = cx+Math.cos(a)*rad, y = cy+Math.sin(a)*rad*0.55;
    ctx.fillStyle = dir>0
      ? `rgba(150,255,195,${1-phase})`
      : `rgba(255,150,110,${1-phase})`;
    ctx.beginPath(); ctx.arc(x,y,1.5,0,Math.PI*2); ctx.fill();
  }
}

function drawDot(ctx,x,y,r,color,alpha){
  ctx.globalAlpha = alpha===undefined?1:alpha;
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
}

function drawSpecial(ctx,cx,cy,w,h,t,kind){
  const edge = w/2-10;
  if (kind==='bond'){
    const cyc = (t*0.4)%1;
    let ang,rad;
    if (cyc<0.7){ ang=cyc*16; rad=32-(cyc/0.7)*17; }
    else { ang=t*3; rad=15; }
    const x=cx+Math.cos(ang)*rad, y=cy+Math.sin(ang)*rad*0.55;
    drawDot(ctx,x,y,2.4,'#cdeaff');
  } else if (kind==='pass'){
    const cyc=(t*0.45)%1;
    const x=-8+cyc*(w+16), y=cy-16;
    const alpha = Math.sin(cyc*Math.PI);
    drawDot(ctx,x,y,2.2,'#cdeaff',Math.max(0.15,alpha));
  } else if (kind==='stayBound'){
    const ang=t*3.2, r=11;
    drawDot(ctx,cx+Math.cos(ang)*r,cy+Math.sin(ang)*r*0.55,2.2,'#cdeaff');
    drawDot(ctx,cx+Math.cos(ang+Math.PI)*r,cy+Math.sin(ang+Math.PI)*r*0.55,2.2,'#ffd9a8');
  } else if (kind==='drift'){
    const cyc=(t*0.4)%1;
    const dist=cyc*edge;
    const alpha=1-cyc*0.7;
    drawDot(ctx,cx-dist,cy,2.2,'#cdeaff',alpha);
    drawDot(ctx,cx+dist,cy,2.2,'#ffd9a8',alpha);
  } else if (kind==='collide'){
    const cyc=(t*0.55)%1;
    if (cyc<0.72){
      const p=cyc/0.72;
      drawDot(ctx,cx-(1-p)*edge,cy,2.4,'#cdeaff');
      drawDot(ctx,cx+(1-p)*edge,cy,2.4,'#ffd9a8');
    } else {
      const p=(cyc-0.72)/0.28;
      ctx.strokeStyle=`rgba(255,220,170,${1-p})`;
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy,4+p*22,0,Math.PI*2); ctx.stroke();
    }
  } else if (kind==='swerve'){
    const cyc=(t*0.45)%1;
    let x,y;
    if (cyc<0.6){ const p=cyc/0.6; x=cx-38+p*38; y=cy; }
    else { const p=(cyc-0.6)/0.4; x=cx+p*12; y=cy-p*20; }
    drawDot(ctx,x,y,2.4,'#cdeaff');
  } else if (kind==='impact'){
    for (let i=0;i<3;i++){
      const ang=t*1.6+i*2.1, rad=18+Math.sin(t*3+i)*4;
      const x=cx+Math.cos(ang)*rad, y=cy+Math.sin(ang)*rad*0.55;
      ctx.fillStyle='rgba(200,190,255,.8)';
      ctx.fillRect(x-1.3,y-1.3,2.6,2.6);
    }
  }
}

// 별(핵) 반지름 계산: mass 방향/세기 + special 오버라이드
function coreRadius(t, mass, special){
  let r = 9;
  if (mass){
    const dir = mass>0?1:-1;
    const mag = Math.min(2, Math.abs(mass));
    const pulse = (Math.sin(t*2.2)+1)/2;
    r = 9 + dir*mag*3*pulse + (dir>0?mag*1.4:0);
  }
  if (special==='compress'){
    const cyc=(t*1.3)%1;
    const tri = cyc<0.5 ? cyc*2 : 2-cyc*2;
    r = 9-3.5*tri;
  } else if (special==='flare'){
    const cyc=(t*0.75)%1;
    r = cyc<0.15 ? 9+20*(cyc/0.15) : Math.max(6, 29-20*Math.min(1,(cyc-0.15)/0.35));
  } else if (special==='fade'){
    const cyc=(t*0.5)%1;
    r = 12-6*cyc;
  }
  return Math.max(3, r);
}

function coreColor(mass, special){
  if (special==='flare') return '#ffe6a8';
  if (special==='fade' || special==='compress') return '#ff9a6b';
  if (mass>0) return '#ffe6a8';
  if (mass<0) return '#ff9a6b';
  return '#bcd0ff';
}

Game.ChoiceAnim = {
  draw(ctx, w, h, t, vis){
    vis = vis || {};
    ctx.clearRect(0,0,w,h);
    const cx = w/2, cy = h/2+4;

    drawVolumeRings(ctx,cx,cy,t,vis.volume);
    drawFuelSparks(ctx,cx,cy,t,vis.fuel);
    if (vis.special) drawSpecial(ctx,cx,cy,w,h,t,vis.special);

    if (vis.special!=='bond' && vis.special!=='pass' && vis.special!=='stayBound' &&
        vis.special!=='drift' && vis.special!=='collide' && vis.special!=='swerve'){
      const r = coreRadius(t, vis.mass||0, vis.special);
      const col = coreColor(vis.mass||0, vis.special);
      ctx.fillStyle=col;
      ctx.shadowColor=col; ctx.shadowBlur=9;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
  }
};

})();
