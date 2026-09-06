"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const Audio_ = {
        actx: null, masterGain: null, droneNodes: null, muted: false,
        musicHowls: {}, currentMusic: null,
        init() { Gp._audioInit.call(this); },
        startDrone() { Gp._audioStartDrone.call(this); },
        getMusicHowl(name) { return Gp._audioGetMusicHowl.call(this, name); },
        playMusic(name) { Gp._audioPlayMusic.call(this, name); },
        stopMusic() { Gp._audioStopMusic.call(this); },
        playTone(freq, dur, type, gainVal, delay) { return Gp._audioPlayTone.call(this, freq, dur, type, gainVal, delay); },
        playSweep(f0, f1, dur) { Gp._audioPlaySweep.call(this, f0, f1, dur); },
        playNoiseBurst(dur, gainVal) { Gp._audioPlayNoiseBurst.call(this, dur, gainVal); },
    };
    G.Audio = Audio_;
    document.getElementById('muteBtn').addEventListener('click', () => {
        if (!Audio_.actx)
            return;
        Audio_.muted = !Audio_.muted;
        Audio_.masterGain.gain.value = Audio_.muted ? 0 : 0.5;
        if (Audio_.currentMusic) {
            const { howl, targetVol } = Audio_.currentMusic;
            howl.volume(Audio_.muted ? 0 : targetVol);
        }
        document.getElementById('muteBtn').textContent = Audio_.muted ? '✕' : '♪';
    });
})();
