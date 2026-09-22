"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const RT = Gp._runtime;
    const state = G.state;
    const clamp = G.clamp;
    const A = G.Audio;
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
    const badgeW = document.getElementById('badgeW');
    const badgeS = document.getElementById('badgeS');
    const captionW = document.getElementById('captionW');
    const captionS = document.getElementById('captionS');
    const animSizeW = { w: 1, h: 1 };
    const animSizeS = { w: 1, h: 1 };
    function sizeCanvasToDisplay(canvas, ctx, out) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        out.w = w;
        out.h = h;
    }
    function renderBadges(container, vis) {
        const badges = G.ChoiceAnim.badgesFor(vis);
        container.innerHTML = badges.map((b) => {
            const arrow = b.dir > 0 ? '<span class="arrow up">▲</span>'
                : b.dir < 0 ? '<span class="arrow down">▼</span>' : '';
            return `<span class="badge"><span class="glyph">${b.glyph}</span><span class="name">${b.name}</span>${arrow}</span>`;
        }).join('');
    }
    function runChoiceAnim(now) {
        const t = (now - RT.choiceAnimStartT) / 1000;
        G.ChoiceAnim.draw(animCtxW, animSizeW.w, animSizeW.h, t, RT.currentEvent.w.vis);
        G.ChoiceAnim.draw(animCtxS, animSizeS.w, animSizeS.h, t, RT.currentEvent.s.vis);
        RT.choiceAnimRAF = requestAnimationFrame(runChoiceAnim);
    }
    Gp._popupOpenEvent = function (e) {
        RT.currentEvent = e;
        state.eventOpen = true;
        RT.evTimeLeft = RT.evDuration;
        evTitle.textContent = e.title;
        evDesc.textContent = e.desc;
        evBtnW.setAttribute('aria-label', e.w.label);
        evBtnS.setAttribute('aria-label', e.s.label);
        captionW.textContent = e.w.caption || '';
        captionS.textContent = e.s.caption || '';
        renderBadges(badgeW, e.w.vis);
        renderBadges(badgeS, e.s.vis);
        evTimerBar.style.transform = 'scaleX(1)';
        evTimerBar.style.background = '#7fa0ff';
        popupEl.classList.add('show');
        sizeCanvasToDisplay(animCanvasW, animCtxW, animSizeW);
        sizeCanvasToDisplay(animCanvasS, animCtxS, animSizeS);
        A.playTone(660, 0.15, 'sine', 0.15);
        RT.choiceAnimStartT = performance.now();
        RT.choiceAnimRAF = requestAnimationFrame(runChoiceAnim);
    };
    Gp._popupCloseEvent = function () {
        popupEl.classList.remove('show');
        state.eventOpen = false;
        RT.currentEvent = null;
        const gapLy = state.hasFusion
            ? 0.35 + Math.random() * 0.20
            : (0.30 + Math.random() * 0.15) / Math.sqrt(state.accretionBoost);
        state.nextEventAt = state.distanceLy + gapLy;
        if (RT.choiceAnimRAF) {
            cancelAnimationFrame(RT.choiceAnimRAF);
            RT.choiceAnimRAF = null;
        }
    };
    Gp._popupResolveEvent = function (key) {
        if (!RT.currentEvent)
            return;
        const e = RT.currentEvent;
        if (e.once)
            state.usedOnce.add(e.id);
        state.lastEventId = e.id;
        const massBefore = state.mass;
        let riskTier = 0;
        if (key === 'A') {
            e.w.apply(state);
            riskTier = e.w.riskTier;
            A.playTone(520, 0.18, 'triangle', 0.18);
        }
        else if (key === 'D') {
            e.s.apply(state);
            riskTier = e.s.riskTier;
            A.playTone(340, 0.18, 'triangle', 0.18);
        }
        else {
            state.fuel -= G.fuelBurnRate(state.mass) * 4;
            if (!state.hasFusion)
                state.mass *= 1.8;
            riskTier = 0;
        }
        state.choiceLog.push({ id: e.id, key, riskTier });
        state.mass = clamp(state.mass, massBefore / 3, massBefore * 3);
        if (state.mass > massBefore) {
            const damp = 1 / (1 + massBefore / G.ACCRETION_DAMP_MASS);
            state.mass = massBefore * (1 + (state.mass / massBefore - 1) * damp);
        }
        state.mass = clamp(state.mass, 1e-9, 200);
        state.volume = clamp(state.volume, 4, 200);
        Gp._popupCloseEvent();
    };
    window.addEventListener('resize', () => {
        if (state.eventOpen) {
            sizeCanvasToDisplay(animCanvasW, animCtxW, animSizeW);
            sizeCanvasToDisplay(animCanvasS, animCtxS, animSizeS);
        }
    });
    evBtnW.addEventListener('click', () => Gp._popupResolveEvent('A'));
    evBtnS.addEventListener('click', () => Gp._popupResolveEvent('D'));
    window.addEventListener('keydown', (ev) => {
        if (!state.started || state.gameOver)
            return;
        const k = ev.key.toLowerCase();
        if (!state.eventOpen)
            return;
        if (k === 'a')
            Gp._popupResolveEvent('A');
        else if (k === 'd')
            Gp._popupResolveEvent('D');
    });
})();
