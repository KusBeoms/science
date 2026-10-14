"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    function buildFusionHtml(state) {
        const stages = G.Stage.FUSION_STAGES;
        const reached = state.maxFusionIndex;
        if (reached < 0) {
            return `<div class="sectionTitle">핵융합</div>` +
                `<div class="fusionChain"><span class="fusionStep none">점화하지 못함</span></div>`;
        }
        const cells = stages.map((st, i) => {
            const done = i <= reached;
            return `<span class="fusionStep${done ? ' done' : ''}"` +
                (done ? ` style="border-color:${st.color};color:${st.color}"` : '') +
                `>${st.name}</span>`;
        });
        return `<div class="sectionTitle">도달한 핵융합 단계</div>` +
            `<div class="fusionChain">${cells.join('<span class="fusionArrow">›</span>')}</div>` +
            `<div class="fusionNote">${stages[reached].name}까지 · 전체 ${stages.length}단계 중 ` +
            `<span>${reached + 1}단계</span></div>`;
    }
    Gp._endingBuildCredits = function () {
        const state = G.state;
        const type = state.endingType;
        const arch = Gp._endingComputeArchetype();
        const distStr = state.distanceLy.toFixed(1);
        const ageStr = G.formatYears(state.ageYears);
        const total = state.choiceLog.length;
        let wCount = 0;
        for (const c of state.choiceLog)
            if (c.key === 'A')
                wCount++;
        const wPct = total ? Math.round(wCount / total * 100) : 0;
        const sPct = 100 - wPct;
        const companionStr = state.hasCompanion
            ? (state.companionAlive ? "생존 (동반성과 함께)" : "먼저 사망")
            : "없음";
        const flavor = Gp._endingFlavor[type].replace('{distance}', distStr).replace('{age}', ageStr);
        const finalLine = `너는 ${Gp._endingClause[type]}, ${arch.title}였다.`;
        const root = document.getElementById('creditsScroll');
        root.innerHTML =
            `<h1>${Gp._endingNames[type]}</h1>` +
                `<div class="sub">THE LIFE OF A STAR</div>` +
                `<div class="statBlock">` +
                `총 이동거리 &nbsp;<span>${distStr} 광년</span><br>` +
                `총 생존 연수 &nbsp;<span>${ageStr}</span><br>` +
                `최종 질량 &nbsp;<span>${state.mass.toFixed(1)} × 태양</span> · 최종 부피 &nbsp;<span>${state.volume.toFixed(0)}</span><br>` +
                `겪은 이벤트 수 &nbsp;<span>${total}</span><br>` +
                `동반성 &nbsp;<span>${companionStr}</span><br>` +
                `선택 성향 &nbsp;<span>A ${wPct}% / D ${sPct}%</span>` +
                `</div>` +
                buildFusionHtml(state) +
                Gp._endingBuildTimelineHtml(state.choiceLog) +
                `<div class="sectionTitle">우주에 생긴 일</div>` +
                `<div class="flavor">${flavor}</div>` +
                `<div class="sectionTitle">성격 유형 분석</div>` +
                `<div class="archTitle">${arch.title}</div>` +
                `<div class="archDesc">${arch.desc}</div>` +
                `<div class="finalLine">"${finalLine}"</div>`;
        const endEl = document.getElementById('creditsEnd');
        endEl.innerHTML =
            `<div class="theEnd">THE END</div>` +
                `<button id="restartBtn">다시 시작</button>`;
        endEl.classList.remove('show');
        document.getElementById('restartBtn').addEventListener('click', () => Gp._endingRestart());
        root.addEventListener('animationend', () => endEl.classList.add('show'), { once: true });
        clearTimeout(Gp._creditsEndTimer);
        Gp._creditsEndTimer = setTimeout(() => endEl.classList.add('show'), 46000);
        document.getElementById('credits').classList.add('show');
        G.Audio.playMusic('end');
    };
    Gp._endingRestart = function () {
        clearTimeout(Gp._creditsEndTimer);
        document.getElementById('creditsEnd').classList.remove('show');
        document.getElementById('credits').classList.remove('show');
        G.Audio.stopMusic();
        G.resetState();
        G.Render.initStars();
        G.Render.resetSurfaces();
        Gp._hudResetGauge();
        const RT = Gp._runtime;
        RT.endingPhase = 'idle';
        RT.endingMoveT = 0;
        RT.endingHoldT = 0;
        RT.endingFadeT = 0;
        document.getElementById('startOverlay').style.display = 'flex';
        document.body.classList.remove('inGame');
    };
})();
