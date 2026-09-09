"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const crossCanvas = document.getElementById('crossSectionCanvas');
    const crossCtx = crossCanvas.getContext('2d');
    let crossSize = 64;
    function syncCrossCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = crossCanvas.getBoundingClientRect();
        crossSize = Math.max(1, Math.round(rect.width || 64));
        crossCanvas.width = Math.round(crossSize * dpr);
        crossCanvas.height = Math.round(crossSize * dpr);
        crossCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    syncCrossCanvas();
    window.addEventListener('resize', syncCrossCanvas);
    const FUSION_COUNT = 7;
    function layersForKey(key, maxR) {
        if (key === 'rocky') {
            return [
                { r: maxR, color: '#4a3a2c' },
                { r: maxR * 0.94, color: '#b5502f' },
                { r: maxR * 0.546, color: '#e8a13c' },
                { r: maxR * 0.191, color: '#fff1c2' },
            ];
        }
        if (key === 'gasGiant') {
            return [
                { r: maxR, color: '#caa876' },
                { r: maxR * 0.80, color: '#3a2f6b' },
                { r: maxR * 0.17, color: '#7a8fa6' },
            ];
        }
        const stages = Gp._stageFusionStages;
        const idx = stages.findIndex((s) => s.key === key);
        const count = (idx < 0 ? 0 : idx) + 1;
        const layers = [];
        const FUSION_SHELL_R = [1.0, 0.58, 0.44, 0.34, 0.26, 0.19, 0.12];
        for (let i = 0; i < count; i++) {
            layers.push({ r: maxR * FUSION_SHELL_R[i], color: stages[i].color });
        }
        return layers;
    }
    function paintLayers(layers, cx, cy, alpha) {
        if (alpha <= 0)
            return;
        crossCtx.globalAlpha = alpha;
        for (const layer of layers) {
            crossCtx.fillStyle = layer.color;
            crossCtx.beginPath();
            crossCtx.arc(cx, cy, Math.max(2, layer.r), 0, Math.PI * 2);
            crossCtx.fill();
        }
        crossCtx.globalAlpha = 1;
    }
    let prevKey = null;
    let fadingFromKey = null;
    const blend = { t: 1 };
    function drawCrossSection(state) {
        const w = crossSize, h = crossSize;
        crossCtx.clearRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) / 2 - 2;
        const curKey = G.Stage.bodyStageKey(state);
        if (prevKey === null) {
            prevKey = curKey;
        }
        else if (curKey !== prevKey) {
            fadingFromKey = prevKey;
            prevKey = curKey;
            gsap.killTweensOf(blend);
            blend.t = 0;
            gsap.to(blend, { t: 1, duration: 0.7, ease: 'power2.out' });
        }
        if (blend.t < 1) {
            paintLayers(layersForKey(fadingFromKey ?? curKey, maxR), cx, cy, 1 - blend.t);
            paintLayers(layersForKey(curKey, maxR), cx, cy, blend.t);
        }
        else {
            paintLayers(layersForKey(curKey, maxR), cx, cy, 1);
        }
        crossCtx.strokeStyle = 'rgba(255,255,255,0.15)';
        crossCtx.lineWidth = 1;
        crossCtx.beginPath();
        crossCtx.arc(cx, cy, maxR, 0, Math.PI * 2);
        crossCtx.stroke();
    }
    Gp._vitalsPanelUpdate = function (state) {
        drawCrossSection(state);
        Gp._stageTrackUpdate(state);
    };
})();
