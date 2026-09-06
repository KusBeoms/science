"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const MUSIC_FADE_MS = 1500;
    const MUSIC_TRACKS = {
        ingame: { src: 'src/music/ingame.mp3', volume: 0.638, loop: true },
        end: { src: 'src/music/end.mp3', volume: 0.741, loop: false },
    };
    Gp._audioGetMusicHowl = function (name) {
        if (this.musicHowls[name])
            return this.musicHowls[name];
        const cfg = MUSIC_TRACKS[name];
        if (!cfg || typeof Howl === 'undefined')
            return null;
        const howl = new Howl({
            src: [cfg.src], loop: cfg.loop, volume: 0,
            onloaderror: () => console.warn('음악 로드 실패:', cfg.src),
        });
        this.musicHowls[name] = howl;
        return howl;
    };
    Gp._audioPlayMusic = function (name) {
        const cfg = MUSIC_TRACKS[name];
        if (!cfg)
            return;
        const next = Gp._audioGetMusicHowl.call(this, name);
        if (!next)
            return;
        if (this.currentMusic && this.currentMusic.howl !== next) {
            const prev = this.currentMusic.howl;
            prev.fade(prev.volume(), 0, MUSIC_FADE_MS);
            prev.once('fade', () => prev.stop());
        }
        const targetVol = this.muted ? 0 : cfg.volume;
        next.stop();
        next.volume(0);
        next.play();
        next.fade(0, targetVol, MUSIC_FADE_MS);
        this.currentMusic = { name, howl: next, targetVol: cfg.volume };
    };
    Gp._audioStopMusic = function () {
        if (!this.currentMusic)
            return;
        const { howl } = this.currentMusic;
        howl.fade(howl.volume(), 0, MUSIC_FADE_MS);
        howl.once('fade', () => howl.stop());
        this.currentMusic = null;
    };
})();
