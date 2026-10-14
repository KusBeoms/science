/* 원시체(암석형/목성형) 행성의 입체 렌더링.
   경위도(equirectangular) 표면 지도를 한 번 절차적으로 만들어 두고, 매 프레임
   구(球) 투영 + 조명으로 래스터화한다. 경도 오프셋만 바꾸면 자전이 되므로
   크레이터·대적점이 실제로 한쪽 가장자리에서 나타나 반대편 뒤로 넘어간다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const clamp = G.clamp;
  const N = Gp._noise;

  const TEX_W = 384, TEX_H = 192;
  type BodyKind = 'rocky' | 'gasGiant';
  const textures: Partial<Record<BodyKind, Uint8ClampedArray>> = {};
  let texSeed = (Math.random() * 1e9) | 0;

  function mix(a: number[], b: number[], t: number): number[] {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function hex(h: string): number[] {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }

  // 경도 방향으로 이음매가 없도록 원통 좌표(cos,sin)로 3D 노이즈를 샘플링한다.
  function sampleCyl(u: number, v: number, freq: number, seed: number, oct: number, vScale = 1): number {
    const a = u * Math.PI * 2;
    return N.fbm3(Math.cos(a) * freq, Math.sin(a) * freq, v * freq * 2 * vScale, seed, oct);
  }

  function buildRocky(seed: number): Uint8ClampedArray {
    const data = new Uint8ClampedArray(TEX_W * TEX_H * 4);
    const low = hex('#2c2621'), mid = hex('#5d5348'), high = hex('#8d8170'), rust = hex('#6e4a36');
    const r = N.rng(seed);
    // 충돌 크레이터: [경도(rad), 위도(rad), 각반지름(rad)]
    const craters: [number, number, number][] = [];
    for (let i = 0; i < 46; i++) {
      const big = i < 6;
      craters.push([r() * Math.PI * 2, Math.asin(r() * 2 - 1) * 0.9, big ? 0.16 + r() * 0.16 : 0.03 + r() * 0.07]);
    }
    for (let y = 0; y < TEX_H; y++) {
      const v = y / TEX_H;
      const lat = (0.5 - v) * Math.PI;
      const cl = Math.cos(lat), sl = Math.sin(lat);
      for (let x = 0; x < TEX_W; x++) {
        const u = x / TEX_W;
        const lon = u * Math.PI * 2;
        const e = sampleCyl(u, v, 2.2, seed, 5);
        const fine = sampleCyl(u, v, 9, seed + 3, 3);
        let col = e < 0.5 ? mix(low, mid, clamp(e / 0.5, 0, 1)) : mix(mid, high, clamp((e - 0.5) / 0.3, 0, 1));
        col = mix(col, rust, clamp((sampleCyl(u, v, 1.3, seed + 9, 3) - 0.55) * 2.5, 0, 0.55));
        let shade = 0.82 + fine * 0.36;
        for (const [clon, clat, cr] of craters) {
          if (Math.abs(lat - clat) > cr * 1.3) continue;
          // 구면 위 대원 거리 — 극지방에서도 크레이터가 찌그러지지 않는다
          const cosd = sl * Math.sin(clat) + cl * Math.cos(clat) * Math.cos(lon - clon);
          const d = Math.acos(clamp(cosd, -1, 1)) / cr;
          if (d < 0.82) shade *= 0.7 + 0.2 * d;            // 움푹 꺼진 바닥
          else if (d < 1.12) shade *= 1.18;                 // 솟은 테두리
          else if (d < 1.5) shade *= 1 + 0.05 * (1.5 - d);  // 방출물 자국
        }
        const i4 = (y * TEX_W + x) * 4;
        data[i4] = col[0] * shade; data[i4 + 1] = col[1] * shade; data[i4 + 2] = col[2] * shade; data[i4 + 3] = 255;
      }
    }
    return data;
  }

  // [위도 중심(sin 위도, 적도=0), 색] — 밝은 대(zone)와 어두운 띠(belt)
  const GAS_STOPS: [number, string][] = [
    [-1.0, '#7e6044'], [-0.82, '#9d7546'], [-0.62, '#e2c69c'], [-0.42, '#b5895a'], [-0.3, '#a5763f'],
    [-0.14, '#e8d2aa'], [0.0, '#f3e2bd'], [0.14, '#e4cba0'], [0.26, '#a5763f'], [0.38, '#c09366'],
    [0.54, '#dcbb8d'], [0.7, '#b08457'], [0.84, '#9d7546'], [1.0, '#7e6044'],
  ];
  const GAS_RGB = GAS_STOPS.map(([p, c]) => [p, hex(c)] as [number, number[]]);
  function gasColor(p: number): number[] {
    p = clamp(p, -1, 1);
    for (let i = 0; i < GAS_RGB.length - 1; i++) {
      const [p0, c0] = GAS_RGB[i], [p1, c1] = GAS_RGB[i + 1];
      if (p <= p1) return mix(c0, c1, (p - p0) / (p1 - p0));
    }
    return GAS_RGB[GAS_RGB.length - 1][1];
  }

  function buildGas(seed: number): Uint8ClampedArray {
    const data = new Uint8ClampedArray(TEX_W * TEX_H * 4);
    const spotLon = 0.3, spotLat = -0.36; // 대적점 위치(u, sin위도)
    const spotCol = hex('#c05a34'), spotCore = hex('#e98a62');
    for (let y = 0; y < TEX_H; y++) {
      const v = y / TEX_H;
      const lat = (0.5 - v) * Math.PI;
      const s = -Math.sin(lat); // 화면 아래쪽이 +
      for (let x = 0; x < TEX_W; x++) {
        const u = x / TEX_W;
        // 제트류 경계의 난류: 위도를 노이즈로 살짝 비틀어 띠 가장자리가 물결친다
        const turb = sampleCyl(u, v, 3, seed, 4) - 0.5;
        const streak = sampleCyl(u, v, 5, seed + 5, 3, 6) - 0.5;
        let col = gasColor(s + turb * 0.09 + streak * 0.035);
        let shade = 0.93 + streak * 0.22;
        // 대적점 — 소용돌이 모양의 타원(경도 폭이 위도 폭의 약 2배)
        let du = u - spotLon; du -= Math.round(du);
        const ex = du / 0.065, ey = (s - spotLat) / 0.075;
        const dd = ex * ex + ey * ey;
        if (dd < 1.6) {
          const swirl = 0.5 + 0.5 * Math.sin(Math.atan2(ey, ex) * 2 + Math.sqrt(dd) * 7);
          const t = clamp(1.25 - dd, 0, 1);
          col = mix(col, mix(spotCol, spotCore, clamp(1 - dd, 0, 1) * swirl), t);
        }
        // 흰 타원 폭풍 몇 개
        for (let k = 0; k < 3; k++) {
          let dk = u - (0.62 + k * 0.09); dk -= Math.round(dk);
          const qx = dk / 0.022, qy = (s - 0.47) / 0.02;
          const q = qx * qx + qy * qy;
          if (q < 1) col = mix(col, [250, 240, 225], (1 - q) * 0.8);
        }
        const i4 = (y * TEX_W + x) * 4;
        data[i4] = col[0] * shade; data[i4 + 1] = col[1] * shade; data[i4 + 2] = col[2] * shade; data[i4 + 3] = 255;
      }
    }
    return data;
  }

  function textureFor(kind: BodyKind): Uint8ClampedArray {
    let t = textures[kind];
    if (!t) t = textures[kind] = kind === 'rocky' ? buildRocky(texSeed) : buildGas(texSeed + 101);
    return t;
  }

  // 새 판마다 다른 지형/구름 무늬
  Gp._renderResetBodyTextures = function () {
    texSeed = (Math.random() * 1e9) | 0;
    delete textures.rocky; delete textures.gasGiant;
  };
  // 게임 시작 전에 미리 만들어 두어 첫 프레임 끊김을 없앤다.
  Gp._renderWarmBodyTextures = function () { textureFor('rocky'); textureFor('gasGiant'); };

  // 투영 룩업(크기별 캐시): 각 픽셀의 기준 경도·위도 행·조명·가장자리 알파.
  interface Proj { D: number; u: Float32Array; row: Int32Array; nz: Float32Array; diff: Float32Array; alpha: Float32Array; }
  const projCache = new Map<number, Proj>();
  const LIGHT = (() => { const l = [-0.55, -0.42, 0.72]; const m = Math.hypot(l[0], l[1], l[2]); return l.map((c) => c / m); })();
  function projFor(D: number): Proj {
    let p = projCache.get(D);
    if (p) return p;
    const n = D * D;
    p = { D, u: new Float32Array(n), row: new Int32Array(n), nz: new Float32Array(n), diff: new Float32Array(n), alpha: new Float32Array(n) };
    for (let j = 0; j < D; j++) {
      for (let i = 0; i < D; i++) {
        const k = j * D + i;
        const nx = ((i + 0.5) / D) * 2 - 1, ny = ((j + 0.5) / D) * 2 - 1;
        const d2 = nx * nx + ny * ny;
        const dist = Math.sqrt(d2);
        p.alpha[k] = clamp((1 - dist) * D * 0.5 + 0.5, 0, 1);
        if (d2 >= 1) { p.alpha[k] = 0; continue; }
        const nz = Math.sqrt(1 - d2);
        p.nz[k] = nz;
        p.diff[k] = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
        const lon = Math.atan2(nx, nz);
        p.u[k] = (lon / (Math.PI * 2)) * TEX_W;
        const lat = Math.asin(clamp(-ny, -1, 1));
        p.row[k] = clamp(Math.floor((0.5 - lat / Math.PI) * TEX_H), 0, TEX_H - 1);
      }
    }
    // 크기별 룩업은 최대 수 MB라, 최근 몇 개만 남기고 가장 오래된 것부터 버린다.
    if (projCache.size >= 6) projCache.delete(projCache.keys().next().value!);
    projCache.set(D, p);
    return p;
  }

  const scratch = document.createElement('canvas');
  const sctx = scratch.getContext('2d')!;
  let scratchImg: ImageData | null = null;

  // (x,y) 중심, 반지름 r, 자전 위상 rot(rad), 편평도 flat. 반환값 없음.
  Gp._renderDrawTexturedSphere = function (
    ctx: CanvasRenderingContext2D, kind: BodyKind, x: number, y: number, r: number, rot: number, flat: number, alpha?: number
  ) {
    const a = alpha == null ? 1 : alpha;
    if (a <= 0 || r <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    // 화면 픽셀 해상도로 래스터화하되 상한을 둔다(거대해진 몸체는 늘려 그린다).
    // 8px 단위로 묶어, 몸체가 서서히 커져도 룩업을 매 프레임 새로 만들지 않는다.
    const D = clamp(Math.ceil(r * 2 * dpr / 8) * 8, 8, 320);
    const P = projFor(D);
    const tex = textureFor(kind);
    if (scratch.width !== D) { scratch.width = D; scratch.height = D; scratchImg = null; }
    if (!scratchImg) scratchImg = sctx.createImageData(D, D);
    const out = scratchImg.data;
    const shift = ((rot / (Math.PI * 2)) % 1) * TEX_W;
    const gas = kind === 'gasGiant';
    for (let k = 0, n = D * D; k < n; k++) {
      const al = P.alpha[k];
      const o = k * 4;
      if (al <= 0) { out[o + 3] = 0; continue; }
      let u = Math.floor(P.u[k] + shift) % TEX_W;
      if (u < 0) u += TEX_W;
      const t = (P.row[k] * TEX_W + u) * 4;
      const diff = P.diff[k], nz = P.nz[k];
      // 가스행성: 두꺼운 대기로 명암 경계가 부드럽고 가장자리가 어두워진다(주변감광).
      // 암석형: 대기가 없어 명암 경계가 날카롭다.
      const light = gas
        ? (0.1 + 1.0 * Math.pow(diff, 0.8)) * (0.62 + 0.38 * nz)
        : 0.06 + 1.12 * Math.pow(diff, 1.1);
      out[o] = tex[t] * light; out[o + 1] = tex[t + 1] * light; out[o + 2] = tex[t + 2] * light;
      out[o + 3] = al * 255;
    }
    sctx.putImageData(scratchImg, 0, 0);
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.imageSmoothingEnabled = true;
    const ry = r * (1 - flat);
    ctx.drawImage(scratch, x - r, y - ry, r * 2, ry * 2);
    // 대기 산란 테두리: 가스행성은 따뜻한 빛, 암석형은 아주 옅은 가장자리만.
    const rim = ctx.createRadialGradient(x, y, r * 0.86, x, y, r * (gas ? 1.1 : 1.04));
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(0.55, gas ? 'rgba(255,226,180,0.28)' : 'rgba(200,190,170,0.12)');
    rim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rim;
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, 1 - flat); ctx.translate(-x, -y);
    ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  };
})();
