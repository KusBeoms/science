/* Howler.js 기반 배경음악 트랙 재생/정지 (CDN의 전역 Howl 사용) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  const MUSIC_FADE_MS = 1500;
  // 볼륨은 애플뮤직(Sound Check)이 쓰는 -16 LUFS 표준에 맞춘 선형 게인(10^(dB/20))이다.
  // 유튜브 표준(-14 LUFS)보다 더 낮아, 이 값이 애플뮤직 대비 체감 음량을 맞춘다.
  // ffmpeg -i <파일> -af loudnorm=I=-16:TP=-1:LRA=11:print_format=json -f null - 로 측정한
  // input_i(통합 라우드니스)를 기준으로 재계산한다.
  const MUSIC_TRACKS: Record<string, MusicTrackConfig> = {
    // ingame.mp3 측정치 -10.10 LUFS → -16 LUFS까지 -5.9dB 감쇠 필요: 10^(-5.9/20)≈0.507
    ingame: { src: 'src/music/ingame.mp3', volume: 0.507, loop: true },
    // end.mp3 측정치 -11.40 LUFS → -16 LUFS까지 -4.6dB 감쇠 필요: 10^(-4.6/20)≈0.589
    end: { src: 'src/music/end.mp3', volume: 0.589, loop: false },
  };

  Gp._audioGetMusicHowl = function (this: AudioAPI, name: string): any {
    if (this.musicHowls[name]) return this.musicHowls[name];
    const cfg = MUSIC_TRACKS[name];
    if (!cfg || typeof Howl === 'undefined') return null;
    const howl = new Howl({
      src: [cfg.src], loop: cfg.loop, volume: 0,
      onloaderror: () => console.warn('음악 로드 실패:', cfg.src),
    });
    this.musicHowls[name] = howl;
    return howl;
  };

  Gp._audioPlayMusic = function (this: AudioAPI, name: string) {
    const cfg = MUSIC_TRACKS[name];
    if (!cfg) return;
    const next = Gp._audioGetMusicHowl.call(this, name);
    if (!next) return;
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

  Gp._audioStopMusic = function (this: AudioAPI) {
    if (!this.currentMusic) return;
    const { howl } = this.currentMusic;
    howl.fade(howl.volume(), 0, MUSIC_FADE_MS);
    howl.once('fade', () => howl.stop());
    this.currentMusic = null;
  };
})();
