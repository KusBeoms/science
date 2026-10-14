/* 배경: 시차(parallax) 별밭 + 절차적 은하수 띠 + 성운 + 먼 은하 + 유성 + 비네트.
   모든 원경은 "월드 좌표(camX)"를 seed 삼아 결정론적으로 생성한다 — 그래서
   지나온 풍경이 다시 반복되지 않으면서도(카메라가 앞으로만 가므로 같은 월드
   좌표를 두 번 보지 않는다) 조각 경계가 끊김 없이 이어진다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const clamp = G.clamp;
  const N = Gp._noise;

  // 한 판 동안 배경이 흘러가는 기준 속도(px/s, 시차 1.0 층 기준). 플레이어가
  // 초당 G.SPEED 광년을 가는 것을 화면상 이 속도로 보여준다.
  function scrollSpeed() { return G.SPEED * 260; }

  // 각 원경 층의 시차 배율 — 멀수록 느리게 흐른다.
  const PAR_MILKY = 0.12;
  const PAR_GALAXY = 0.22;
  const PAR_NEBULA = 0.45;

  // 새로고침마다 다른 우주, 한 판 안에서는 월드 좌표에 대해 고정된 우주.
  const WORLD_SEED = (Math.random() * 0x7fffffff) | 0;

  let camX = 0; // 누적 카메라 이동량(px, 시차 1.0 층 기준)

  // ── 별밭 ────────────────────────────────────────────────────────────────
  // 1280x720 창에서 별 260개였던 밀도를 유지한다. 예전엔 화면 위쪽 85%에만
  // 뿌려서 아래쪽 띠가 텅 비어 보였다 — 이제 화면 전체 높이를 채운다.
  const REFERENCE_AREA = 1280 * 720;
  const STAR_DENSITY = 260 / REFERENCE_AREA;
  function starCountFor(W: number, H: number): number {
    return Math.max(30, Math.round(STAR_DENSITY * W * H));
  }
  // 실제 밤하늘 별의 색 분포를 흉내낸다 — 대부분 흰색/청백색, 일부 노랑·주황.
  const STAR_TINTS: [number, string][] = [
    [0.46, '#e6edff'], [0.66, '#c9d8ff'], [0.80, '#fff4e2'], [0.92, '#ffe0b3'], [1.0, '#ffc59a'],
  ];
  function pickTint(): string {
    const r = Math.random();
    for (const [p, c] of STAR_TINTS) if (r <= p) return c;
    return '#e6edff';
  }
  function makeStar(W: number, H: number, x?: number): BackgroundStar {
    const layer = 0.3 + Math.random() * 1.0;
    // 가까운 층일수록 조금 더 크고 밝게 — 시차와 크기가 함께 깊이감을 만든다.
    const bright = Math.random() < 0.035;
    return {
      x: x == null ? Math.random() * W : x,
      y: Math.random() * H,
      r: bright ? 1.3 + Math.random() * 0.9 : 0.35 + Math.random() * 0.9 * layer,
      layer,
      baseAlpha: bright ? 0.9 : 0.3 + Math.random() * 0.6,
      color: pickTint(),
      twinkle: 0.6 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      spike: bright,
    };
  }

  // 은하수 띠 안에 빽빽이 박힌 미광성(微光星) — 은하수와 같은 시차로 흐른다.
  interface DustStar { wx: number; y: number; r: number; a: number; }
  let dustStars: DustStar[] = [];

  Gp._renderInitStars = function (this: RenderAPI) {
    this.stars = [];
    const count = starCountFor(this.W, this.H);
    for (let i = 0; i < count; i++) this.stars.push(makeStar(this.W, this.H));
    rebuildDustStars(this.W, this.H);
  };

  // 창 크기가 바뀌면 별들의 상대 위치(비율)를 유지한 채 다시 배치하고, 밀도에
  // 맞춰 모자란 만큼 더하거나 넘치는 만큼 잘라낸다. 은하수 띠는 화면 높이에
  // 비례해 그려지므로 통째로 다시 만든다.
  Gp._renderResyncStars = function (this: RenderAPI, oldW: number, oldH: number) {
    if (oldW > 0 && oldH > 0) {
      for (const s of this.stars) {
        s.x = s.x / oldW * this.W;
        s.y = s.y / oldH * this.H;
      }
    }
    const target = starCountFor(this.W, this.H);
    if (this.stars.length < target) {
      for (let i = this.stars.length; i < target; i++) this.stars.push(makeStar(this.W, this.H));
    } else if (this.stars.length > target) {
      this.stars.length = target;
    }
    milky.valid = false;
    nebulaSprites.clear();
    rebuildDustStars(this.W, this.H);
    buildVignette(this.W, this.H);
  };

  Gp._renderStarBudget = function (this: RenderAPI): number {
    const step = Math.floor(G.state.distanceLy);
    // 전체 별 개수가 화면 크기마다 달라지므로 비율로 줄여야 큰 화면에서도
    // 똑같이 서서히 어두워진다.
    const frac = G.clamp(1 - step * 22 / 260, 0, 1);
    return Math.max(1, Math.round(this.stars.length * frac));
  };

  Gp._renderBgDarkness = function (this: RenderAPI): number {
    return G.clamp(G.state.distanceLy / 12, 0, 1);
  };

  // ── 은하수 ──────────────────────────────────────────────────────────────
  // 은하수 띠의 중심 높이·두께가 월드 x를 따라 아주 천천히 물결치며 변한다.
  // 저해상도(1/4) 띠 버퍼를 한 칸씩 밀어내고 오른쪽 끝에 새 열만 계산해
  // 붙이므로, 매 프레임 전체를 다시 계산하지 않고도 영원히 새로운 모양이 나온다.
  const MW_RES = 4;
  const milky = {
    valid: false,
    canvas: document.createElement('canvas'),
    ctx: null as CanvasRenderingContext2D | null,
    img: null as ImageData | null,
    cols: 0, rows: 0,
    col0: 0, // 버퍼 0번 열이 대응하는 월드 열 번호
    H: 0,
  };
  milky.ctx = milky.canvas.getContext('2d');

  function bandCenter(wx: number, H: number) {
    return H * (0.5 + 0.62 * (N.fbm2(wx / 2600, 0.3, WORLD_SEED + 11, 3) - 0.5));
  }
  function bandHalfWidth(wx: number, H: number) {
    return H * (0.09 + 0.12 * N.fbm2(wx / 1500, 4.7, WORLD_SEED + 23, 2));
  }

  function writeMilkyColumn(bufCol: number, worldCol: number) {
    const img = milky.img!, data = img.data, cols = milky.cols, rows = milky.rows, H = milky.H;
    const wx = worldCol * MW_RES;
    const c = bandCenter(wx, H), hw = bandHalfWidth(wx, H);
    const glow = 0.65 + 0.7 * N.fbm2(wx / 900, 9.1, WORLD_SEED + 37, 2);
    for (let row = 0; row < rows; row++) {
      const y = row * MW_RES;
      const d = (y - c) / hw;
      const d2 = d * d;
      const idx = (row * cols + bufCol) * 4;
      if (d2 > 30) { data[idx + 3] = 0; continue; }
      const core = Math.exp(-d2 * 0.9);
      const halo = Math.exp(-d2 * 0.22) * 0.16;
      const clouds = N.fbm2(wx / 240, y / 240, WORLD_SEED + 51, 5);
      let dens = core * (0.25 + 1.05 * clouds * clouds) + halo * (0.6 + clouds * 0.6);
      // 성간 먼지대(dark lane): 띠 한가운데를 가르는 어두운 균열
      const dust = N.fbm2(wx / 130 + 31, y / 130, WORLD_SEED + 67, 4);
      const lane = clamp((dust - 0.5) * 4.2, 0, 1) * Math.exp(-d2 * 1.6);
      dens *= 1 - 0.85 * lane;
      dens *= glow;
      // 중심은 늙은 별이 많은 따뜻한 색, 가장자리는 젊은 별의 푸른 색
      const warm = clamp(Math.exp(-d2 * 1.8) * (0.4 + clouds), 0, 1);
      data[idx] = 120 + (255 - 120) * warm;
      data[idx + 1] = 140 + (222 - 140) * warm;
      data[idx + 2] = 235 + (190 - 235) * warm;
      data[idx + 3] = clamp(dens * 120, 0, 150);
    }
  }

  function rebuildMilky(W: number, H: number, worldColStart: number) {
    milky.cols = Math.ceil(W / MW_RES) + 3;
    milky.rows = Math.ceil(H / MW_RES) + 1;
    milky.H = H;
    milky.canvas.width = milky.cols;
    milky.canvas.height = milky.rows;
    milky.img = milky.ctx!.createImageData(milky.cols, milky.rows);
    milky.col0 = worldColStart;
    for (let c = 0; c < milky.cols; c++) writeMilkyColumn(c, worldColStart + c);
    milky.ctx!.putImageData(milky.img, 0, 0);
    milky.valid = true;
  }

  function drawMilky(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number) {
    const off = camX * PAR_MILKY; // 은하수 층의 월드 x(px)
    const worldCol = Math.floor(off / MW_RES);
    if (!milky.valid || milky.H !== H) rebuildMilky(W, H, worldCol);
    const shift = worldCol - milky.col0;
    if (shift > 0) {
      const { cols, rows } = milky;
      const data = milky.img!.data;
      if (shift >= cols) {
        rebuildMilky(W, H, worldCol);
      } else {
        for (let r = 0; r < rows; r++) {
          const base = r * cols * 4;
          data.copyWithin(base, base + shift * 4, base + cols * 4);
        }
        milky.col0 = worldCol;
        for (let c = cols - shift; c < cols; c++) writeMilkyColumn(c, worldCol + c);
        milky.ctx!.putImageData(milky.img!, 0, 0);
      }
    }
    const frac = off / MW_RES - worldCol;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(milky.canvas, -frac * MW_RES, 0, milky.cols * MW_RES, milky.rows * MW_RES);
    ctx.restore();
  }

  function rebuildDustStars(W: number, H: number) {
    dustStars = [];
    const n = Math.round(420 * (W * H) / REFERENCE_AREA);
    const off = camX * PAR_MILKY;
    for (let i = 0; i < n; i++) dustStars.push(makeDustStar(off + Math.random() * (W + 20), H));
  }
  function makeDustStar(wx: number, H: number): DustStar {
    // 띠의 밝기 분포(가우시안)를 따라 y를 뽑아, 띠 한가운데에 몰려 있게 한다.
    const g = (Math.random() + Math.random() + Math.random() - 1.5) * 1.3;
    return { wx, y: bandCenter(wx, H) + g * bandHalfWidth(wx, H), r: 0.3 + Math.random() * 0.6, a: 0.25 + Math.random() * 0.5 };
  }
  function drawDustStars(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number) {
    const off = camX * PAR_MILKY;
    ctx.fillStyle = '#eef2ff';
    for (let i = 0; i < dustStars.length; i++) {
      let s = dustStars[i];
      if (s.wx - off < -4) { s = dustStars[i] = makeDustStar(off + W + 2 + Math.random() * 20, H); }
      ctx.globalAlpha = s.a * alpha;
      const d = s.r * 2;
      ctx.fillRect(s.wx - off - s.r, s.y - s.r, d, d);
    }
    ctx.globalAlpha = 1;
  }

  // ── 성운 / 먼 은하 ────────────────────────────────────────────────────────
  // 월드를 일정 폭의 칸으로 나누고, 칸 번호를 seed 삼아 그 칸에 무엇이 있는지를
  // 정한다. 칸 번호가 같으면 언제나 같은 결과라, 스프라이트 캐시를 비워도 다시
  // 똑같이 그려지고, 칸이 다르면 절대 같은 모양이 나오지 않는다.
  const NEB_CHUNK = 620;
  const GAL_CHUNK = 780;
  interface Nebula { wx: number; y: number; size: number; seed: number; palette: number; }
  interface Galaxy { wx: number; y: number; size: number; seed: number; tilt: number; rot: number; kind: number; }

  // Hα(붉은 발광) · OIII(청록) · 반사성운(푸른) · 혼합
  const NEB_PALETTES: [number, number, number][][] = [
    [[255, 92, 128], [255, 160, 120]],
    [[70, 200, 210], [120, 150, 255]],
    [[110, 140, 255], [190, 170, 255]],
    [[255, 110, 170], [90, 190, 230]],
  ];

  function nebulaFor(chunk: number, H: number): Nebula | null {
    const r = N.rng(WORLD_SEED ^ Math.imul(chunk, 7919) ^ 0x51f15e);
    if (r() > 0.62) return null;
    const scale = Gp._renderViewScale || 1;
    return {
      wx: chunk * NEB_CHUNK + r() * NEB_CHUNK,
      y: H * (0.08 + r() * 0.84),
      size: (200 + r() * 360) * scale,
      seed: (r() * 1e9) | 0,
      palette: Math.floor(r() * NEB_PALETTES.length),
    };
  }

  function galaxyFor(chunk: number, H: number): Galaxy | null {
    const r = N.rng(WORLD_SEED ^ Math.imul(chunk, 104729) ^ 0x6a1a77);
    if (r() > 0.4) return null;
    const scale = Gp._renderViewScale || 1;
    return {
      wx: chunk * GAL_CHUNK + r() * GAL_CHUNK,
      y: H * (0.06 + r() * 0.88),
      size: (16 + r() * 30) * scale,
      seed: (r() * 1e9) | 0,
      tilt: 0.25 + r() * 0.6,
      rot: r() * Math.PI,
      kind: r() < 0.75 ? 0 : 1, // 0=나선은하, 1=타원은하
    };
  }

  const nebulaSprites = new Map<number, HTMLCanvasElement | null>();
  const galaxySprites = new Map<number, HTMLCanvasElement | null>();

  function buildNebulaSprite(n: Nebula): HTMLCanvasElement {
    // 부드러운 구름이라 저해상도로 만들어 늘려 그려도 티가 나지 않는다 —
    // 크기와 무관하게 최대 150px로 묶어 생성 비용(프레임 끊김)을 일정하게 둔다.
    const s = Math.max(8, Math.min(150, Math.round(n.size / 3)));
    const cv = document.createElement('canvas');
    cv.width = s; cv.height = s;
    const c = cv.getContext('2d')!;
    const img = c.createImageData(s, s);
    const [c1, c2] = NEB_PALETTES[n.palette];
    const r = N.rng(n.seed);
    // 몇 개의 덩어리가 겹친 불규칙한 윤곽
    const lobes: [number, number, number][] = [];
    for (let i = 0; i < 4; i++) lobes.push([0.5 + (r() - 0.5) * 0.35, 0.5 + (r() - 0.5) * 0.35, 0.18 + r() * 0.2]);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const u = x / s, v = y / s;
        let m = 0;
        for (const [lx, ly, lr] of lobes) {
          const dx = (u - lx) / lr, dy = (v - ly) / lr;
          m = Math.max(m, Math.exp(-(dx * dx + dy * dy) * 1.4));
        }
        const f = N.fbm2(u * 4.2, v * 4.2, n.seed, 5);
        const fil = N.fbm2(u * 9 + 3, v * 9, n.seed + 7, 3);
        const dens = clamp(m * (f * 1.6 - 0.35) + fil * m * 0.25, 0, 1);
        const t = clamp(f * 1.3 - 0.15, 0, 1);
        const i4 = (y * s + x) * 4;
        img.data[i4] = c1[0] + (c2[0] - c1[0]) * t;
        img.data[i4 + 1] = c1[1] + (c2[1] - c1[1]) * t;
        img.data[i4 + 2] = c1[2] + (c2[2] - c1[2]) * t;
        img.data[i4 + 3] = dens * dens * 150;
      }
    }
    c.putImageData(img, 0, 0);
    return cv;
  }

  function buildGalaxySprite(g: Galaxy): HTMLCanvasElement {
    // 실제 크기의 절반 해상도로 만들어 두 배로 늘려 그린다 — 팔의 점들이
    // 자연스럽게 번져 멀리 있는 은하처럼 뿌옇게 보인다.
    const s = Math.max(12, Math.round(g.size));
    const cv = document.createElement('canvas');
    cv.width = s; cv.height = s;
    const c = cv.getContext('2d')!;
    const r = N.rng(g.seed);
    const cx = s / 2;
    c.globalCompositeOperation = 'lighter';
    if (g.kind === 0) {
      // 로그 나선 팔을 따라 흩뿌린 점들
      const arms = 2;
      for (let a = 0; a < arms; a++) {
        for (let i = 0; i < 420; i++) {
          const t = r();
          const theta = t * 4.2 + a * Math.PI;
          const rad = cx * 0.08 * Math.exp(t * 2.3);
          if (rad > cx * 0.95) continue;
          const jitter = (r() - 0.5) * cx * 0.12;
          const px = cx + Math.cos(theta) * rad + jitter, py = cx + Math.sin(theta) * rad + jitter;
          const blue = r() < 0.6;
          c.fillStyle = blue ? 'rgba(170,190,255,0.07)' : 'rgba(255,220,200,0.05)';
          c.beginPath(); c.arc(px, py, 0.6 + r() * 1.2, 0, Math.PI * 2); c.fill();
        }
      }
    }
    // 원반 전체의 희미한 빛 — 팔이 점선처럼 떠 보이지 않고 은하의 일부로 녹아들게
    const disk = c.createRadialGradient(cx, cx, 0, cx, cx, cx * 0.95);
    disk.addColorStop(0, 'rgba(200,210,255,0.22)');
    disk.addColorStop(1, 'rgba(200,210,255,0)');
    c.fillStyle = disk;
    c.beginPath(); c.arc(cx, cx, cx, 0, Math.PI * 2); c.fill();
    const core = c.createRadialGradient(cx, cx, 0, cx, cx, cx * (g.kind === 0 ? 0.35 : 0.9));
    core.addColorStop(0, 'rgba(255,240,215,0.9)');
    core.addColorStop(0.3, 'rgba(255,220,180,0.35)');
    core.addColorStop(1, 'rgba(255,210,170,0)');
    c.fillStyle = core;
    c.beginPath(); c.arc(cx, cx, cx, 0, Math.PI * 2); c.fill();
    return cv;
  }

  function drawNebulae(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number) {
    const off = camX * PAR_NEBULA;
    const pad = 600 * (Gp._renderViewScale || 1);
    const first = Math.floor((off - pad) / NEB_CHUNK), last = Math.floor((off + W + pad) / NEB_CHUNK);
    for (const k of nebulaSprites.keys()) if (k < first) nebulaSprites.delete(k);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    // 스프라이트 생성(~15ms)은 한 프레임에 하나만 — 여러 개가 한꺼번에 시야
    // 여유분(pad)에 들어와도 프레임이 길게 끊기지 않는다. 화면 밖 여유분에서
    // 미리 만들어지므로 실제로 보이기 전에 준비된다.
    let built = false;
    for (let k = first; k <= last; k++) {
      const n = nebulaFor(k, H);
      if (!n) continue;
      let sp = nebulaSprites.get(k);
      if (sp === undefined) {
        if (built) continue;
        sp = buildNebulaSprite(n); nebulaSprites.set(k, sp); built = true;
      }
      if (!sp) continue;
      const x = n.wx - off;
      if (x + n.size / 2 < 0 || x - n.size / 2 > W) continue;
      ctx.globalAlpha = alpha * 0.8;
      ctx.drawImage(sp, x - n.size / 2, n.y - n.size / 2, n.size, n.size);
    }
    ctx.restore();
  }

  function drawGalaxies(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number) {
    const off = camX * PAR_GALAXY;
    const first = Math.floor((off - 200) / GAL_CHUNK), last = Math.floor((off + W + 200) / GAL_CHUNK);
    for (const k of galaxySprites.keys()) if (k < first) galaxySprites.delete(k);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = first; k <= last; k++) {
      const g = galaxyFor(k, H);
      if (!g) continue;
      let sp = galaxySprites.get(k);
      if (sp === undefined) { sp = buildGalaxySprite(g); galaxySprites.set(k, sp); }
      if (!sp) continue;
      const x = g.wx - off;
      if (x + g.size < 0 || x - g.size > W) continue;
      ctx.save();
      ctx.translate(x, g.y);
      ctx.rotate(g.rot);
      ctx.scale(1, g.tilt);
      ctx.globalAlpha = alpha * 0.55;
      ctx.drawImage(sp, -g.size, -g.size, g.size * 2, g.size * 2);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 가까운 별 ────────────────────────────────────────────────────────────
  function drawStars(R: RenderAPI, ctx: CanvasRenderingContext2D, dt: number, scroll: number, budget: number, alpha: number) {
    const W = R.W, H = R.H;
    const t = performance.now() / 1000;
    const dx = scrollSpeed() * scroll * dt;
    for (let i = 0; i < R.stars.length; i++) {
      let s = R.stars[i];
      if (dx > 0) {
        s.x -= dx * s.layer;
        // 화면 왼쪽 밖으로 나간 별은 오른쪽에서 "완전히 새로운" 별로 다시
        // 태어난다(위치·색·크기·반짝임 모두 새로 뽑음) — 같은 별밭이 도는
        // 느낌 없이 계속 새로운 공간을 지나간다.
        if (s.x < -6) { s = R.stars[i] = makeStar(W, H, W + 6 + Math.random() * 30); }
      }
      if (i >= budget) continue;
      const tw = 0.72 + 0.28 * Math.sin(t * s.twinkle + s.phase);
      const a = s.baseAlpha * tw * alpha;
      ctx.globalAlpha = a;
      ctx.fillStyle = s.color;
      if (s.r < 0.9) {
        ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      } else {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      if (s.spike) {
        // 밝은 별: 부드러운 광륜 + 망원경 회절 스파이크
        const L = s.r * (5 + 2.5 * tw);
        ctx.globalAlpha = a * 0.5;
        ctx.fillRect(s.x - L, s.y - 0.4, L * 2, 0.8);
        ctx.fillRect(s.x - 0.4, s.y - L, 0.8, L * 2);
        const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        halo.addColorStop(0, s.color);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = a * 0.35;
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── 유성 ────────────────────────────────────────────────────────────────
  interface Meteor { x: number; y: number; vx: number; vy: number; t: number; dur: number; }
  const meteors: Meteor[] = [];
  let meteorTimer = 3 + Math.random() * 5;
  function drawMeteors(ctx: CanvasRenderingContext2D, W: number, H: number, dt: number, alpha: number) {
    meteorTimer -= dt;
    if (meteorTimer <= 0) {
      meteorTimer = 5 + Math.random() * 9;
      const ang = Math.PI * (0.72 + Math.random() * 0.12); // 오른쪽 위 → 왼쪽 아래
      const sp = 700 + Math.random() * 500;
      meteors.push({ x: W * (0.3 + Math.random() * 0.7), y: H * Math.random() * 0.5, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: 0, dur: 0.5 + Math.random() * 0.4 });
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.t += dt;
      if (m.t >= m.dur) { meteors.splice(i, 1); continue; }
      m.x += m.vx * dt; m.y += m.vy * dt;
      const p = m.t / m.dur;
      const a = Math.sin(p * Math.PI) * alpha;
      const tail = 0.12;
      const tx = m.x - m.vx * tail, ty = m.y - m.vy * tail;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
      g.addColorStop(1, 'rgba(160,190,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
    }
  }

  // ── 비네트 ──────────────────────────────────────────────────────────────
  // 화면 가장자리를 은은하게 어둡게 해 시선을 가운데로 모으고, 상단 HUD
  // 글자가 밝은 은하수 위에서도 읽히도록 위쪽을 조금 더 눌러준다.
  const vignette = document.createElement('canvas');
  function buildVignette(W: number, H: number) {
    vignette.width = Math.max(1, Math.round(W / 2));
    vignette.height = Math.max(1, Math.round(H / 2));
    const c = vignette.getContext('2d')!;
    const w = vignette.width, h = vignette.height;
    c.clearRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,6,0.62)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const top = c.createLinearGradient(0, 0, 0, h * 0.2);
    top.addColorStop(0, 'rgba(2,3,12,0.55)');
    top.addColorStop(1, 'rgba(2,3,12,0)');
    c.fillStyle = top;
    c.fillRect(0, 0, w, h * 0.2);
  }

  // scroll: 이번 프레임 카메라 이동 배율(0=정지, 1=게임 속도). budget: 그릴
  // 가까운 별 개수(우주의 노화로 서서히 줄어든다).
  Gp._renderDrawBackground = function (this: RenderAPI, dt: number, scroll: number, budget: number) {
    const ctx = this.ctx, W = this.W, H = this.H;
    const dark = this.bgDarkness();
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, `rgb(${lerp(4, 1, dark)},${lerp(6, 2, dark)},${lerp(18, 6, dark)})`);
    bg.addColorStop(1, `rgb(${lerp(8, 2, dark)},${lerp(10, 3, dark)},${lerp(28, 9, dark)})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    camX += scrollSpeed() * scroll * dt;
    const fadeAll = 1 - dark * 0.8;
    drawMilky(ctx, W, H, fadeAll);
    drawDustStars(ctx, W, H, fadeAll * 0.9);
    drawGalaxies(ctx, W, H, fadeAll);
    drawNebulae(ctx, W, H, fadeAll);
    drawStars(this, ctx, dt, scroll, budget, 1 - dark * 0.85);
    if (scroll > 0) drawMeteors(ctx, W, H, dt, fadeAll);
    ctx.drawImage(vignette, 0, 0, W, H);
  };
})();
