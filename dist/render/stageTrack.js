"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const viewport = document.getElementById('stageTrackViewport');
    const list = document.getElementById('stageTrackList');
    const label = document.getElementById('stageTrackLabel');
    let renderedLength = -1;
    let ticks = [];
    let renderedKeys = [];
    let currentIndex = -1;
    let lastLabelText = '';
    function tickBackground(key) {
        if (key === 'rocky') {
            return 'radial-gradient(circle at 34% 28%, #6f6355 0%, #4a4239 55%, #2b251e 100%)';
        }
        if (key === 'gasGiant') {
            return 'repeating-linear-gradient(180deg,' +
                '#efdcb4 0 18%, #a8763f 18% 34%, #e2c69c 34% 52%,' +
                '#9d7546 52% 70%, #caa170 70% 100%)';
        }
        const stage = G.Stage.FUSION_STAGES.filter((s) => s.key === key)[0];
        const color = stage ? stage.color : '#ffffff';
        return `radial-gradient(circle at 36% 30%, #ffffff 0%, ${color} 62%, ${color} 100%)`;
    }
    function rebuildTicks(entries) {
        list.innerHTML = '';
        ticks = entries.map(() => {
            const el = document.createElement('div');
            el.className = 'stageTick upcoming';
            list.appendChild(el);
            return el;
        });
        renderedKeys = entries.map(() => null);
        renderedLength = entries.length;
    }
    Gp._stageTrackUpdate = function (state) {
        const seq = G.Stage.sequence(state);
        const { entries, index } = seq;
        if (entries.length !== renderedLength)
            rebuildTicks(entries);
        for (let i = 0; i < ticks.length; i++) {
            const cls = i === index ? 'current' : (i < index ? 'reached' : 'upcoming');
            const el = ticks[i];
            if (!el.classList.contains(cls)) {
                el.classList.remove('current', 'reached', 'upcoming');
                el.classList.add(cls);
            }
            const key = entries[i].key;
            if (renderedKeys[i] !== key) {
                renderedKeys[i] = key;
                el.style.background = tickBackground(key);
            }
        }
        if (index !== currentIndex && ticks[index]) {
            currentIndex = index;
            const target = ticks[index];
            const targetX = viewport.offsetWidth / 2 - (target.offsetLeft + target.offsetWidth / 2);
            gsap.to(list, { x: targetX, duration: 0.6, ease: 'power2.out', overwrite: true });
        }
        const text = G.Stage.bodyStageLabel(state);
        if (text !== lastLabelText) {
            lastLabelText = text;
            label.textContent = text;
            gsap.fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.35 });
        }
    };
})();
