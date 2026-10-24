/* Forja de Mundos — motor de geração.
   Roda dentro de um Web Worker. Fica tudo dentro de uma única função para o app poder transformar
   o código em Blob e abrir o worker mesmo com o index.html aberto direto do disco (file://). */
function ForjaEngine() {
  'use strict';

  // ================= utilidades =================
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth01 = (t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const smoothstep = (a, b, x) => smooth01((x - a) / (b - a));

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Simplex 2D (Gustavson) com tabela de permutação gerada pela seed.
  function makeSimplex(seed) {
    const rnd = mulberry32((seed * 2654435761) >>> 0);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }
    const grad = new Float32Array([1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1]);
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    return function (xin, yin) {
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s), j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t), y0 = yin - (j - t);
      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      let n = 0;
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 > 0) { const g = pm12[ii + perm[jj]] * 2; t0 *= t0; n += t0 * t0 * (grad[g] * x0 + grad[g + 1] * y0); }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 > 0) { const g = pm12[ii + i1 + perm[jj + j1]] * 2; t1 *= t1; n += t1 * t1 * (grad[g] * x1 + grad[g + 1] * y1); }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 > 0) { const g = pm12[ii + 1 + perm[jj + 1]] * 2; t2 *= t2; n += t2 * t2 * (grad[g] * x2 + grad[g + 1] * y2); }
      return 70 * n;
    };
  }

  // fBm: soma de oitavas, resultado aproximadamente em [-1, 1].
  function fbm(n, x, y, oct) {
    let a = 1, f = 1, s = 0, norm = 0;
    for (let o = 0; o < oct; o++) { s += a * n(x * f + o * 17.31, y * f - o * 11.73); norm += a; a *= 0.5; f *= 2; }
    return s / norm;
  }

  // Ridged multifractal: cristas de montanha. Resultado bruto ~[0, 1], normalizado depois.
  function ridged(n, x, y, oct) {
    let a = 0.5, f = 1, s = 0, w = 1;
    for (let o = 0; o < oct; o++) {
      let v = 1 - Math.abs(n(x * f + o * 31.1, y * f + o * 7.7));
      v *= v; v *= w;
      w = Math.min(1, v * 2);
      s += v * a; a *= 0.5; f *= 2;
    }
    return s;
  }

  // Blur gaussiano aproximado: 3 passadas de box blur separável. R em pixels.
  function boxH(src, dst, W, r) {
    const inv = 1 / (2 * r + 1);
    for (let y = 0; y < W; y++) {
      const row = y * W;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[row + clamp(k, 0, W - 1)];
      for (let x = 0; x < W; x++) {
        dst[row + x] = acc * inv;
        const a = x + r + 1, b = x - r;
        acc += src[row + (a < W ? a : W - 1)] - src[row + (b > 0 ? b : 0)];
      }
    }
  }
  function boxV(src, dst, W, r) {
    const inv = 1 / (2 * r + 1);
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[clamp(k, 0, W - 1) * W + x];
      for (let y = 0; y < W; y++) {
        dst[y * W + x] = acc * inv;
        const a = y + r + 1, b = y - r;
        acc += src[(a < W ? a : W - 1) * W + x] - src[(b > 0 ? b : 0) * W + x];
      }
    }
  }
  function blur(src, W, R) {
    const r = Math.round(R / 2);
    const out = Float32Array.from(src);
    if (r < 1) return out;
    const tmp = new Float32Array(src.length);
    for (let p = 0; p < 3; p++) { boxH(out, tmp, W, r); boxV(tmp, out, W, r); }
    return out;
  }

  function anyAbove(a, t) { for (let i = 0; i < a.length; i++) if (a[i] > t) return true; return false; }

  // ================= estado =================
  const S = { W: 0, worldM: 0, cell: 0, fields: null, fieldsKey: '', base: null, eroded: null, P: null };

  function post(msg, transfer) { self.postMessage(msg, transfer || []); }
  function progress(label, value) { post({ type: 'progress', label, value }); }

  function octFor(scale, cell) { return clamp(Math.floor(Math.log2(scale / (2 * cell))) + 1, 1, 8); }

  // Campos de ruído dependem só da seed, das escalas e do tamanho. Ficam em cache:
  // mexer em alturas/máscaras não precisa recalcular ruído, só recombinar.
  function ensureFields(W, worldM, P) {
    const key = [W, worldM, P.seed, P.coastScale, P.plainsScale, P.hillsScale, P.mtnScale, P.warpAmp, P.warpScale].join('|');
    if (S.fieldsKey === key && S.fields) return;
    const N = W * W, cell = worldM / W;
    const seed = P.seed | 0;
    const nWx = makeSimplex(seed + 1), nWy = makeSimplex(seed + 2), nCoast = makeSimplex(seed + 3);
    const nPlains = makeSimplex(seed + 4), nHills = makeSimplex(seed + 5), nRidge = makeSimplex(seed + 6), nDet = makeSimplex(seed + 7);
    const F = { coast: new Float32Array(N), plains: new Float32Array(N), hills: new Float32Array(N), ridge: new Float32Array(N), detail: new Float32Array(N) };
    const oCoast = octFor(P.coastScale, cell), oPlains = octFor(P.plainsScale, cell), oHills = octFor(P.hillsScale, cell), oRidge = octFor(P.mtnScale, cell);
    const detWave = Math.max(60, 3 * cell);
    const fw = 1 / P.warpScale;
    let rMin = Infinity, rMax = -Infinity;
    for (let y = 0; y < W; y++) {
      if ((y & 31) === 0) progress('Calculando ruído', y / W);
      const ym = (y + 0.5) * cell;
      for (let x = 0; x < W; x++) {
        const i = y * W + x, xm = (x + 0.5) * cell;
        const X = xm + fbm(nWx, xm * fw, ym * fw, 3) * P.warpAmp;
        const Y = ym + fbm(nWy, xm * fw + 5.2, ym * fw + 1.3, 3) * P.warpAmp;
        F.coast[i] = fbm(nCoast, X / P.coastScale, Y / P.coastScale, oCoast);
        F.plains[i] = fbm(nPlains, X / P.plainsScale, Y / P.plainsScale, oPlains);
        const hv = fbm(nHills, X / P.hillsScale, Y / P.hillsScale, oHills) * 0.5 + 0.5;
        F.hills[i] = Math.pow(clamp(hv, 0, 1), 1.2);
        const r = ridged(nRidge, X / P.mtnScale, Y / P.mtnScale, oRidge);
        F.ridge[i] = r; if (r < rMin) rMin = r; if (r > rMax) rMax = r;
        F.detail[i] = fbm(nDet, xm / detWave, ym / detWave, 3);
      }
    }
    const inv = 1 / Math.max(1e-6, rMax - rMin);
    for (let i = 0; i < N; i++) F.ridge[i] = (F.ridge[i] - rMin) * inv;
    S.fields = F; S.fieldsKey = key;
  }

  // ================= composição do terreno (em metros) =================
  function compose(m, P) {
    const W = S.W, N = W * W, cell = S.cell, F = S.fields;
    const px = (meters) => Math.max(0, meters / cell);

    progress('Montando relevo', 0.1);
    const landB = blur(m.land, W, px(P.coastSmooth));
    const Lh = new Float32Array(N);
    for (let i = 0; i < N; i++) Lh[i] = landB[i] + F.coast[i] * P.coastRough > 0.5 ? 1 : 0;
    const L = blur(Lh, W, px(P.beachWidth));          // transição mar→terra (praias)
    const Lfar = blur(Lh, W, px(P.inlandDist));       // "quão para dentro do continente"
    progress('Montando relevo', 0.4);
    const mtn = blur(m.mountains, W, px(P.mtnSoft));
    const hil = blur(m.hills, W, px(P.mtnSoft * 0.6));
    const pla = blur(m.plateau, W, Math.max(2, px(40)));
    const H = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const pl = F.plains[i];
      const deep = smooth01((0.5 - Lfar[i]) / 0.5);
      const hO = -P.shelfDepth * (1 - L[i]) - (P.oceanDepth - P.shelfDepth) * deep + pl * P.shelfDepth * 0.3;
      const inl = smooth01((Lfar[i] - 0.5) / 0.5);
      let hL = P.coastHeight + P.inlandRise * inl + P.plainsAmp * (pl * 0.5 + 0.5) * (0.3 + 0.7 * inl);
      hL += P.hillsAmp * smooth01(hil[i]) * F.hills[i];
      const mt = smooth01(mtn[i]);
      hL += P.mtnHeight * mt * (0.12 + 0.88 * F.ridge[i]);
      hL += P.plateauHeight * smoothstep(0.4, 0.6, pla[i] + pl * 0.1);
      hL += F.detail[i] * P.detailAmp * (0.4 + mt);
      H[i] = hO + (hL - hO) * L[i];
    }

    progress('Montando relevo', 0.7);
    applyFlattenRivers(H, m, P);
    if (m.sculpt) for (let i = 0; i < N; i++) H[i] += m.sculpt[i];
    return H;
  }

  // Heightmap importado vira o relevo base; as camadas pintadas somam por cima (só em terra firme).
  function composeOnBase(m, P, base) {
    const W = S.W, N = W * W, cell = S.cell, F = S.fields;
    const px = (meters) => Math.max(0, meters / cell);
    progress('Montando relevo', 0.2);
    const mtn = blur(m.mountains, W, px(P.mtnSoft));
    const hil = blur(m.hills, W, px(P.mtnSoft * 0.6));
    const pla = blur(m.plateau, W, Math.max(2, px(40)));
    const span = base.max - base.min;
    const H = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const hb = base.min + base.data[i] * span;
      const add = P.hillsAmp * smooth01(hil[i]) * F.hills[i]
        + P.mtnHeight * smooth01(mtn[i]) * (0.12 + 0.88 * F.ridge[i])
        + P.plateauHeight * smoothstep(0.4, 0.6, pla[i] + F.plains[i] * 0.1);
      H[i] = hb + add * smoothstep(-1, 3, hb);
    }
    progress('Montando relevo', 0.7);
    applyFlattenRivers(H, m, P);
    if (m.sculpt) for (let i = 0; i < N; i++) H[i] += m.sculpt[i];
    return H;
  }

  function applyFlattenRivers(H, m, P) {
    const W = S.W, N = W * W, cell = S.cell;
    const px = (meters) => Math.max(0, meters / cell);
    if (anyAbove(m.flatten, 0.01)) {
      const fl = blur(m.flatten, W, Math.max(2, px(30)));
      const Hs = blur(H, W, px(P.flattenRadius));
      for (let i = 0; i < N; i++) H[i] += (Hs[i] - H[i]) * smooth01(fl[i] * 1.3);
    }
    if (anyAbove(m.rivers, 0.01)) {
      const R = blur(m.rivers, W, Math.max(1, px(P.riverWidth)));
      const V = blur(m.rivers, W, px(P.valleyWidth));
      const Hv = blur(H, W, px(P.valleyWidth));
      for (let i = 0; i < N; i++) {
        const v = smoothstep(0.02, 0.25, V[i]);
        H[i] += (Hv[i] - H[i]) * v * 0.7;
        const r = smoothstep(0.05, 0.35, R[i]);
        const bed = Math.min(H[i], Hv[i] - P.riverDepth);
        H[i] += (bed - H[i]) * r;
      }
    }
  }

  // ================= erosão =================
  // Hidráulica por partículas (gotas de chuva que arrancam e depositam sedimento).
  // Alturas normalizadas para a faixa em que o algoritmo de referência se comporta bem.
  function erodeHydraulic(H, W, P, seed) {
    const N = W * W;
    let maxH = 0, land = 0;
    for (let i = 0; i < N; i++) { if (H[i] > maxH) maxH = H[i]; if (H[i] > 0) land++; }
    if (maxH <= 0 || land === 0) return;
    const k = (W / 256) / maxH;
    const h = new Float32Array(N);
    for (let i = 0; i < N; i++) h[i] = H[i] * k;

    const R = Math.max(1, Math.round(P.erRadius));
    const ox = [], oy = [], bw = [];
    let wsum = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy);
      if (d <= R) { const w = 1 - d / (R + 1); ox.push(dx); oy.push(dy); bw.push(w); wsum += w; }
    }
    for (let b = 0; b < bw.length; b++) bw[b] /= wsum;
    const nb = bw.length;

    const rnd = mulberry32((seed * 7 + 3) >>> 0);
    const inertia = P.erInertia, capF = 4, minCap = 0.01, erodeS = P.erStrength, depS = P.erDeposit;
    const evap = P.erEvaporation, grav = 4, life = Math.round(P.erLifetime);
    const drops = Math.min(4000000, Math.round(P.erDensity * land));

    for (let d = 0; d < drops; d++) {
      if (d % 20000 === 0) progress('Erosão hidráulica', d / drops);
      let px = 0, py = 0;
      for (let t = 0; t < 8; t++) {
        px = 1 + rnd() * (W - 3); py = 1 + rnd() * (W - 3);
        if (h[(py | 0) * W + (px | 0)] > 0) break;
      }
      let dx = 0, dy = 0, speed = 1, water = 1, sed = 0;
      for (let l = 0; l < life; l++) {
        const nx = px | 0, ny = py | 0, cx = px - nx, cy = py - ny, idx = ny * W + nx;
        const h00 = h[idx], h10 = h[idx + 1], h01 = h[idx + W], h11 = h[idx + W + 1];
        const gx = (h10 - h00) * (1 - cy) + (h11 - h01) * cy;
        const gy = (h01 - h00) * (1 - cx) + (h11 - h10) * cx;
        const hh = h00 * (1 - cx) * (1 - cy) + h10 * cx * (1 - cy) + h01 * (1 - cx) * cy + h11 * cx * cy;
        dx = dx * inertia - gx * (1 - inertia);
        dy = dy * inertia - gy * (1 - inertia);
        const len = Math.hypot(dx, dy);
        if (len < 1e-9) break;
        dx /= len; dy /= len;
        px += dx; py += dy;
        if (px < 1 || py < 1 || px >= W - 2 || py >= W - 2) break;
        const mx = px | 0, my = py | 0, ax = px - mx, ay = py - my, j = my * W + mx;
        const nh = h[j] * (1 - ax) * (1 - ay) + h[j + 1] * ax * (1 - ay) + h[j + W] * (1 - ax) * ay + h[j + W + 1] * ax * ay;
        const dh = nh - hh;
        const cap = Math.max(-dh * speed * water * capF, minCap);
        if (sed > cap || dh > 0) {
          const amt = dh > 0 ? Math.min(dh, sed) : (sed - cap) * depS;
          sed -= amt;
          h[idx] += amt * (1 - cx) * (1 - cy); h[idx + 1] += amt * cx * (1 - cy);
          h[idx + W] += amt * (1 - cx) * cy; h[idx + W + 1] += amt * cx * cy;
        } else {
          const amt = Math.min((cap - sed) * erodeS, -dh);
          for (let b = 0; b < nb; b++) {
            const xx = nx + ox[b], yy = ny + oy[b];
            if (xx < 0 || yy < 0 || xx >= W || yy >= W) continue;
            h[yy * W + xx] -= amt * bw[b];
          }
          sed += amt;
        }
        speed = Math.sqrt(Math.max(0, speed * speed - dh * grav));
        water *= 1 - evap;
        // chegou ao mar ou lago: o sedimento é levado embora (depositar aqui aterraria costas e lagos)
        if (nh < 0) break;
      }
    }
    for (let i = 0; i < N; i++) H[i] = h[i] / k;
  }

  // Térmica: material desliza onde a encosta passa do ângulo de repouso.
  function erodeThermal(H, W, cell, iters, talusDeg) {
    const T = Math.tan(talusDeg * Math.PI / 180) * cell;
    const off = [-1, 1, -W, W];
    for (let it = 0; it < iters; it++) {
      if (it % 4 === 0) progress('Erosão térmica', it / iters);
      for (let y = 1; y < W - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          for (let k = 0; k < 4; k++) {
            const n = i + off[k];
            const d = H[i] - H[n];
            if (d > T) { const amt = (d - T) * 0.25; H[i] -= amt; H[n] += amt; }
          }
        }
      }
    }
  }

  // ================= camadas de material =================
  // Pesos que somam 1: [Grama, Rocha, Areia, Neve].
  function layerWeights(h, slope, P, out) {
    const rock = smoothstep(P.rockSlope - 6, P.rockSlope + 6, slope);
    const snow = smoothstep(P.snowLine - 60, P.snowLine + 60, h) * (1 - rock * 0.7);
    const sand = (1 - smoothstep(P.beachHeight * 0.5, P.beachHeight + 0.5, h)) * (1 - rock);
    const r = rock, s = snow * (1 - r), a = sand * (1 - r - s);
    out[0] = Math.max(0, 1 - r - s - a); out[1] = r; out[2] = a; out[3] = s;
  }

  // ================= colorização da prévia 2D =================
  const LAND_STOPS = [
    [0.0, 118, 158, 82], [0.25, 82, 130, 62], [0.55, 128, 112, 78], [0.85, 140, 132, 124], [1.0, 236, 238, 242]
  ];
  function landColor(t, out) {
    if (t <= 0) { out[0] = LAND_STOPS[0][1]; out[1] = LAND_STOPS[0][2]; out[2] = LAND_STOPS[0][3]; return; }
    for (let s = 1; s < LAND_STOPS.length; s++) {
      const b = LAND_STOPS[s];
      if (t <= b[0] || s === LAND_STOPS.length - 1) {
        const a = LAND_STOPS[s - 1];
        const f = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
        out[0] = a[1] + (b[1] - a[1]) * f; out[1] = a[2] + (b[2] - a[2]) * f; out[2] = a[3] + (b[3] - a[3]) * f;
        return;
      }
    }
  }

  function colorize(H, W, cell, P, mode) {
    const out = new Uint8ClampedArray(W * W * 4);
    let mn = Infinity, mx = -Infinity, land = 0;
    for (let i = 0; i < H.length; i++) { const v = H[i]; if (v < mn) mn = v; if (v > mx) mx = v; if (v > 0) land++; }
    const range = Math.max(1e-6, mx - mn);
    let lx = -1, ly = -1, lz = 1.3; { const l = Math.hypot(lx, ly, lz); lx /= l; ly /= l; lz /= l; }
    const zf = 3; // exagero só para o sombreamento ficar legível em escala de continente
    const c = [0, 0, 0], w = [0, 0, 0, 0];
    const snowRef = Math.max(P.snowLine, P.beachHeight + 10);
    for (let y = 0; y < W; y++) {
      const y0 = y > 0 ? y - 1 : y, y1 = y < W - 1 ? y + 1 : y;
      for (let x = 0; x < W; x++) {
        const i = y * W + x, o = i * 4;
        const x0 = x > 0 ? x - 1 : x, x1 = x < W - 1 ? x + 1 : x;
        const h = H[i];
        const dzdx = (H[y * W + x1] - H[y * W + x0]) / ((x1 - x0) * cell);
        const dzdy = (H[y1 * W + x] - H[y0 * W + x]) / ((y1 - y0) * cell);
        const slope = Math.atan(Math.hypot(dzdx, dzdy)) * 57.29578;
        let nx = -dzdx * zf, ny = -dzdy * zf, nz = 1;
        const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
        const shade = 0.35 + 0.8 * Math.max(0, nx * lx + ny * ly + nz * lz);
        let r, g, b;
        if (mode === 'gray') {
          const v = ((h - mn) / range) * 255; r = g = b = v;
        } else if (mode === 'slope') {
          const t = clamp(slope / 50, 0, 1);
          r = 60 + 195 * Math.min(1, t * 2); g = 190 - 150 * Math.max(0, t * 2 - 1); b = 70;
          if (h < 0) { r = 40; g = 70; b = 120; }
          r *= shade; g *= shade; b *= shade;
        } else if (mode === 'layers') {
          if (h < 0) { r = 40; g = 80; b = 140; }
          else {
            layerWeights(h, slope, P, w);
            r = w[0] * 70 + w[1] * 128 + w[2] * 222 + w[3] * 245;
            g = w[0] * 150 + w[1] * 122 + w[2] * 200 + w[3] * 247;
            b = w[0] * 60 + w[1] * 118 + w[2] * 120 + w[3] * 252;
          }
          r *= shade; g *= shade; b *= shade;
        } else { // relevo
          if (h < 0) {
            const t = smooth01(-h / Math.max(1, P.oceanDepth));
            r = 88 + (18 - 88) * t; g = 170 + (52 - 170) * t; b = 205 + (105 - 205) * t;
            const s2 = 0.8 + 0.25 * (shade - 0.35);
            r *= s2; g *= s2; b *= s2;
          } else if (h < P.beachHeight) {
            r = 200 * shade; g = 186 * shade; b = 134 * shade;
          } else {
            landColor((h - P.beachHeight) / (snowRef - P.beachHeight), c);
            const rk = smoothstep(P.rockSlope - 6, P.rockSlope + 6, slope) * 0.6;
            r = (c[0] + (125 - c[0]) * rk) * shade; g = (c[1] + (120 - c[1]) * rk) * shade; b = (c[2] + (115 - c[2]) * rk) * shade;
          }
        }
        out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
      }
    }
    return { rgba: out, stats: { min: mn, max: mx, landPct: (land / H.length) * 100 } };
  }

  function current() { return S.eroded || S.base; }

  function reply(id, extra) {
    const H = current();
    const col = colorize(H, S.W, S.cell, S.P, extra.mode || 'relief');
    const Hc = Float32Array.from(H);
    post({ type: 'height', id, H: Hc, rgba: col.rgba, stats: col.stats, eroded: !!S.eroded, W: S.W }, [Hc.buffer, col.rgba.buffer]);
  }

  // ================= geração automática =================
  function autoLand(W, P, style, coverage) {
    const N = W * W, seed = (P.seed | 0) + 501;
    const n = makeSimplex(seed), nwx = makeSimplex(seed + 1), nwy = makeSimplex(seed + 2);
    const freq = style === 'islands' ? 6 : style === 'pangea' ? 1.6 : 2.4;
    const v = new Float32Array(N);
    for (let y = 0; y < W; y++) {
      if ((y & 63) === 0) progress('Gerando continente', y / W);
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) / W, t = (y + 0.5) / W;
        const wx = fbm(nwx, u * 2, t * 2, 3) * 0.12, wy = fbm(nwy, u * 2 + 3.1, t * 2 + 7.7, 3) * 0.12;
        let val = fbm(n, (u + wx) * freq, (t + wy) * freq, 6);
        const d = Math.hypot(u - 0.5, t - 0.5) * 2;
        if (style === 'islands') val -= Math.pow(d, 4) * 0.6;
        else if (style === 'pangea') val -= Math.pow(d, 6) * 0.35;
        else val -= d * d * 0.9;
        v[y * W + x] = val;
      }
    }
    const sample = [];
    for (let i = 0; i < N; i += 7) sample.push(v[i]);
    sample.sort((a, b) => a - b);
    const thr = sample[clamp(Math.floor((1 - coverage) * sample.length), 0, sample.length - 1)];
    const mask = new Float32Array(N);
    for (let i = 0; i < N; i++) mask[i] = clamp((v[i] - thr) * 12 + 0.5, 0, 1);
    return mask;
  }

  function autoRelief(W, P, land, amt) {
    const am = amt ? amt.mtn : 1, ah = amt ? amt.hills : 1;
    const tm = 0.8 - 0.07 * (am - 1), th = 0.55 - 0.07 * (ah - 1);
    const N = W * W, seed = (P.seed | 0) + 777;
    const nM = makeSimplex(seed), nH = makeSimplex(seed + 1), nw = makeSimplex(seed + 2);
    const Lh = new Float32Array(N);
    for (let i = 0; i < N; i++) Lh[i] = land[i] > 0.5 ? 1 : 0;
    const Lfar = blur(Lh, W, W / 14);
    const mountains = new Float32Array(N), hills = new Float32Array(N);
    for (let y = 0; y < W; y++) {
      if ((y & 63) === 0) progress('Gerando relevo', y / W);
      for (let x = 0; x < W; x++) {
        const i = y * W + x, u = (x + 0.5) / W, t = (y + 0.5) / W;
        const w = fbm(nw, u * 3, t * 3, 2) * 0.08;
        const line = 1 - Math.abs(fbm(nM, (u + w) * 2.6, (t - w) * 2.6, 4));
        const inner = smoothstep(0.5, 0.75, Lfar[i]);
        mountains[i] = am > 0 ? smoothstep(tm, tm + 0.15, line) * inner : 0;
        const hv = fbm(nH, u * 5, t * 5, 4) * 0.5 + 0.5;
        hills[i] = ah > 0 ? Math.max(smoothstep(th, th + 0.2, hv) * smoothstep(0.35, 0.6, Lfar[i]), smoothstep(tm - 0.18, tm, line) * inner * 0.7) : 0;
      }
    }
    return { mountains, hills };
  }

  // ================= PNG / ZIP =================
  const CRC_T = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crcUpdate(crc, buf) { for (let i = 0; i < buf.length; i++) crc = CRC_T[(crc ^ buf[i]) & 255] ^ (crc >>> 8); return crc; }
  function crc32(buf) { return (crcUpdate(0xFFFFFFFF, buf) ^ 0xFFFFFFFF) >>> 0; }
  const enc = new TextEncoder();

  function pngChunk(type, data) {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    out.set(enc.encode(type), 4);
    out.set(data, 8);
    dv.setUint32(8 + data.length, (crcUpdate(0xFFFFFFFF, out.subarray(4, 8 + data.length)) ^ 0xFFFFFFFF) >>> 0);
    return out;
  }

  // Encoder de PNG em streaming: recebe linha por linha (filtro Sub) e comprime com CompressionStream.
  function createPNG(w, h, colorType, bitDepth) {
    const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : 4;
    const bpp = (channels * bitDepth) / 8, rowBytes = w * bpp;
    const cs = new CompressionStream('deflate');
    const outP = new Response(cs.readable).arrayBuffer();
    const wr = cs.writable.getWriter();
    const rowsPerChunk = Math.max(1, Math.floor(4e6 / (rowBytes + 1)));
    let buf = new Uint8Array(rowsPerChunk * (rowBytes + 1)), off = 0;
    return {
      rowBytes,
      async addRow(row) {
        buf[off++] = 1;
        for (let i = 0; i < bpp; i++) buf[off + i] = row[i];
        for (let i = bpp; i < rowBytes; i++) buf[off + i] = (row[i] - row[i - bpp]) & 255;
        off += rowBytes;
        if (off === buf.length) { await wr.write(buf); buf = new Uint8Array(buf.length); off = 0; }
      },
      async finish() {
        if (off > 0) await wr.write(buf.subarray(0, off));
        await wr.close();
        const z = new Uint8Array(await outP);
        const ihdr = new Uint8Array(13);
        const dv = new DataView(ihdr.buffer);
        dv.setUint32(0, w); dv.setUint32(4, h);
        ihdr[8] = bitDepth; ihdr[9] = colorType; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
        const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr)];
        const CH = 8 * 1024 * 1024;
        for (let p = 0; p < z.length; p += CH) parts.push(pngChunk('IDAT', z.subarray(p, Math.min(z.length, p + CH))));
        parts.push(pngChunk('IEND', new Uint8Array(0)));
        return new Blob(parts, { type: 'image/png' });
      }
    };
  }

  // ZIP sem compressão (os PNGs já vêm comprimidos).
  async function makeZip(entries) {
    const parts = [], central = [];
    let offset = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (let e = 0; e < entries.length; e++) {
      progress('Empacotando ZIP', e / entries.length);
      const { name, blob } = entries[e];
      const data = new Uint8Array(await blob.arrayBuffer());
      const crc = crc32(data), nb = enc.encode(name), size = data.length;
      const lh = new Uint8Array(30 + nb.length), ld = new DataView(lh.buffer);
      ld.setUint32(0, 0x04034b50, true); ld.setUint16(4, 20, true); ld.setUint16(6, 0x0800, true); ld.setUint16(8, 0, true);
      ld.setUint16(10, dosTime, true); ld.setUint16(12, dosDate, true); ld.setUint32(14, crc, true);
      ld.setUint32(18, size, true); ld.setUint32(22, size, true); ld.setUint16(26, nb.length, true); ld.setUint16(28, 0, true);
      lh.set(nb, 30);
      parts.push(lh, blob);
      const ch = new Uint8Array(46 + nb.length), cd = new DataView(ch.buffer);
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true);
      cd.setUint16(10, 0, true); cd.setUint16(12, dosTime, true); cd.setUint16(14, dosDate, true); cd.setUint32(16, crc, true);
      cd.setUint32(20, size, true); cd.setUint32(24, size, true); cd.setUint16(28, nb.length, true);
      cd.setUint32(42, offset, true);
      ch.set(nb, 46);
      central.push(ch);
      offset += lh.length + size;
    }
    const cdSize = central.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array(22), ed = new DataView(end.buffer);
    ed.setUint32(0, 0x06054b50, true); ed.setUint16(8, entries.length, true); ed.setUint16(10, entries.length, true);
    ed.setUint32(12, cdSize, true); ed.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }

  // ================= exportação =================
  // Mesma conta que o Unreal faz: Z = LocationZ + (valor - 32768) * ScaleZ / 128 (cm).
  function unrealZ(mn, mx) {
    const zScale = ((mx - mn) * 12800) / 65535;
    return { zScale, locZ: mn * 100 + 256 * zScale, stepCm: ((mx - mn) / 65535) * 100 };
  }

  function catmullW(f) {
    const f2 = f * f, f3 = f2 * f;
    return [-0.5 * f3 + f2 - 0.5 * f, 1.5 * f3 - 2.5 * f2 + 1, -1.5 * f3 + 2 * f2 + 0.5 * f, 0.5 * f3 - 0.5 * f2];
  }

  function fileSafe(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Regiao'; }

  // Altura final (bicúbica + detalhe fino) de um retângulo em coordenadas globais da exportação.
  // Pedimos sempre 1 px de borda a mais: a inclinação nas emendas entre pedaços fica igual à do mapa inteiro.
  function renderRegion(src, W, R, cellT, o, P, gx0, gy0, w, h, label) {
    const out = new Float32Array(w * h);
    const k = (W - 1) / (R - 1);
    const xi = new Int32Array(w * 4), xw = new Float32Array(w * 4);
    for (let x = 0; x < w; x++) {
      const u = clamp(gx0 + x, 0, R - 1) * k, i0 = Math.floor(u), wv = catmullW(u - i0);
      for (let q = 0; q < 4; q++) { xi[x * 4 + q] = clamp(i0 - 1 + q, 0, W - 1); xw[x * 4 + q] = wv[q]; }
    }
    const n = o.detailAmp > 0 ? makeSimplex((P.seed | 0) + 99) : null;
    const inv = 1 / Math.max(cellT * 2, o.detailWave);
    for (let y = 0; y < h; y++) {
      if ((y & 63) === 0) progress(label, y / h);
      const gy = clamp(gy0 + y, 0, R - 1), v = gy * k, j0 = Math.floor(v), wy = catmullW(v - j0);
      const r0 = clamp(j0 - 1, 0, W - 1) * W, r1 = clamp(j0, 0, W - 1) * W, r2 = clamp(j0 + 1, 0, W - 1) * W, r3 = clamp(j0 + 2, 0, W - 1) * W;
      const row = y * w, ym = gy * cellT * inv;
      for (let x = 0; x < w; x++) {
        const b = x * 4;
        let s = 0;
        for (let q = 0; q < 4; q++) {
          const c = xi[b + q];
          s += xw[b + q] * (wy[0] * src[r0 + c] + wy[1] * src[r1 + c] + wy[2] * src[r2 + c] + wy[3] * src[r3 + c]);
        }
        if (n) s += fbm(n, clamp(gx0 + x, 0, R - 1) * cellT * inv, ym, 3) * o.detailAmp * smoothstep(-2, 4, s);
        out[row + x] = s;
      }
    }
    return out;
  }

  // A = retângulo com 1 px de borda ((w+2)×(h+2)); grava só o miolo w×h.
  async function writeHeightPNG(A, w, h, q, label) {
    const aw = w + 2, png = createPNG(w, h, 0, 16), row = new Uint8Array(png.rowBytes);
    for (let y = 0; y < h; y++) {
      if ((y & 63) === 0) progress(label, y / h);
      const o2 = (y + 1) * aw + 1;
      for (let x = 0; x < w; x++) { const v = q(A[o2 + x]); row[2 * x] = v >> 8; row[2 * x + 1] = v & 255; }
      await png.addRow(row);
    }
    return png.finish();
  }

  function writeR16(A, w, h, q) {
    const aw = w + 2, u = new Uint16Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) u[y * w + x] = q(A[(y + 1) * aw + x + 1]);
    const b = new Uint8Array(u.buffer);
    // .r16 é little-endian; garante isso mesmo em máquinas big-endian
    if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1) for (let i = 0; i < b.length; i += 2) { const t = b[i]; b[i] = b[i + 1]; b[i + 1] = t; }
    return new Blob([b]);
  }

  const LAYER_NAMES = ['Grama', 'Rocha', 'Areia', 'Neve'];
  async function writeLayers(A, w, h, cellT, P, label) {
    const aw = w + 2, encs = LAYER_NAMES.map(() => createPNG(w, h, 0, 8)), rows = LAYER_NAMES.map(() => new Uint8Array(w));
    const wt = [0, 0, 0, 0], d = 2 * cellT;
    for (let y = 0; y < h; y++) {
      if ((y & 63) === 0) progress(label, y / h);
      const c = (y + 1) * aw + 1;
      for (let x = 0; x < w; x++) {
        const i = c + x;
        const dzdx = (A[i + 1] - A[i - 1]) / d, dzdy = (A[i + aw] - A[i - aw]) / d;
        layerWeights(A[i], Math.atan(Math.hypot(dzdx, dzdy)) * 57.29578, P, wt);
        for (let k = 0; k < 4; k++) rows[k][x] = Math.round(wt[k] * 255);
      }
      for (let k = 0; k < 4; k++) await encs[k].addRow(rows[k]);
    }
    const out = [];
    for (let k = 0; k < 4; k++) out.push(await encs[k].finish());
    return out;
  }

  async function writeRegions(ids, regionIds, W, R, gx0, gy0, w, h, rgb, withMasks, label) {
    const colorPng = createPNG(w, h, 2, 8), crow = new Uint8Array(w * 3);
    const maskEncs = withMasks ? ids.map(() => createPNG(w, h, 0, 8)) : [];
    const mrows = ids.map(() => new Uint8Array(w));
    const xs = new Int32Array(w);
    for (let x = 0; x < w; x++) xs[x] = Math.min(W - 1, Math.floor(((gx0 + x + 0.5) * W) / R));
    for (let y = 0; y < h; y++) {
      if ((y & 63) === 0) progress(label, y / h);
      const sy = Math.min(W - 1, Math.floor(((gy0 + y + 0.5) * W) / R)) * W;
      for (let x = 0; x < w; x++) {
        const id = regionIds[sy + xs[x]];
        const c = id ? rgb[id - 1] : null;
        crow[x * 3] = c ? c[0] : 0; crow[x * 3 + 1] = c ? c[1] : 0; crow[x * 3 + 2] = c ? c[2] : 0;
        for (let k = 0; k < ids.length; k++) mrows[k][x] = id === ids[k] ? 255 : 0;
      }
      await colorPng.addRow(crow);
      for (let k = 0; k < maskEncs.length; k++) await maskEncs[k].addRow(mrows[k]);
    }
    const masks = [];
    for (const e of maskEncs) masks.push(await e.finish());
    return { color: await colorPng.finish(), masks };
  }

  // o.tiles = 1: um arquivo só. o.tiles = n: n×n pedaços "_x{col}_y{lin}" que o Unreal monta lado a lado
  // (sem borda compartilhada) num nível com World Partition.
  async function doExport(o) {
    const src = current(), W = S.W, R = o.res, P = S.P, n = o.tiles || 1;
    if (Math.abs(S.worldM - o.worldM) > 0.5) throw new Error('O tamanho do mundo mudou durante a exportação. Tente de novo.');
    if (R % n) throw new Error('A resolução não se divide em pedaços iguais.');
    const T = R / n, cellT = S.worldM / (R - 1); // tamanho com que o relevo foi calculado
    const base = fileSafe(o.name), entries = [];

    // Faixa de altura → Z Scale. Arquivo único: faixa exata. Pedaços: calculados um por vez (memória),
    // então a faixa vem do relevo de trabalho com uma margem para o detalhe fino.
    let mn, mx, single = null;
    if (n === 1) {
      single = renderRegion(src, W, R, cellT, o, P, -1, -1, R + 2, R + 2, 'Ampliando para ' + R + '×' + R);
      mn = Infinity; mx = -Infinity;
      for (let y = 1; y <= R; y++) for (let x = 1; x <= R; x++) { const v = single[y * (R + 2) + x]; if (v < mn) mn = v; if (v > mx) mx = v; }
    } else {
      let a = Infinity, b = -Infinity;
      for (let i = 0; i < src.length; i++) { if (src[i] < a) a = src[i]; if (src[i] > b) b = src[i]; }
      const pad = o.detailAmp * 1.2 + (b - a) * 0.02 + 1;
      mn = a - pad; mx = b + pad;
    }
    mn = Math.floor(mn); mx = Math.ceil(mx); if (mx <= mn) mx = mn + 1;
    const sc = 65535 / (mx - mn);
    const q = (v) => { const r = Math.round((v - mn) * sc); return r < 0 ? 0 : r > 65535 ? 65535 : r; };

    let ids = [], rgb = null;
    if (o.regions && o.regionIds && o.regionDefs.length) {
      const used = new Set();
      for (let i = 0; i < o.regionIds.length; i++) if (o.regionIds[i]) used.add(o.regionIds[i]);
      ids = [...used].sort((a, b) => a - b);
      rgb = o.regionDefs.map((d) => [parseInt(d.color.slice(1, 3), 16), parseInt(d.color.slice(3, 5), 16), parseInt(d.color.slice(5, 7), 16)]);
    }

    for (let ty = 0; ty < n; ty++) {
      for (let tx = 0; tx < n; tx++) {
        const sfx = n === 1 ? '' : `_x${tx}_y${ty}`;
        const lbl = n === 1 ? '' : ` — pedaço ${ty * n + tx + 1} de ${n * n}`;
        const A = single || renderRegion(src, W, R, cellT, o, P, tx * T - 1, ty * T - 1, T + 2, T + 2, 'Calculando relevo' + lbl);
        entries.push({ name: base + '_heightmap' + sfx + '.png', blob: await writeHeightPNG(A, T, T, q, 'Gravando heightmap PNG 16-bit' + lbl) });
        if (o.r16 && n === 1) entries.push({ name: base + '_heightmap.r16', blob: writeR16(A, T, T, q) });
        if (o.layers) {
          const blobs = await writeLayers(A, T, T, cellT, P, 'Gravando camadas de material' + lbl);
          blobs.forEach((b, k) => entries.push({ name: 'camadas/' + base + '_' + LAYER_NAMES[k] + sfx + '.png', blob: b }));
        }
        if (ids.length) {
          const r = await writeRegions(ids, o.regionIds, W, R, tx * T, ty * T, T, T, rgb, o.regionMasks, 'Gravando mapa de regiões' + lbl);
          entries.push({ name: 'regioes/' + base + '_regioes' + sfx + '.png', blob: r.color });
          r.masks.forEach((b, k) => entries.push({ name: 'regioes/' + base + '_' + String(ids[k]).padStart(2, '0') + '_' + fileSafe(o.regionDefs[ids[k] - 1].name) + sfx + '.png', blob: b }));
        }
      }
    }
    if (ids.length) {
      const legend = ids.map((id) => ({ id, nome: o.regionDefs[id - 1].name, cor: o.regionDefs[id - 1].color }));
      entries.push({ name: 'regioes/' + base + '_regioes.json', blob: new Blob([JSON.stringify(legend, null, 2)], { type: 'application/json' }) });
    }

    // arquivos prontos vindos da interface (mapa ilustrado, marcadores)
    for (const f of o.extraFiles || []) entries.push(f);

    const z = unrealZ(mn, mx);
    const readme = o.readmeTemplate
      .replace(/\{ZSCALE\}/g, z.zScale.toFixed(4))
      .replace(/\{LOCZ\}/g, z.locZ.toFixed(2))
      .replace(/\{MIN\}/g, String(mn))
      .replace(/\{MAX\}/g, String(mx))
      .replace(/\{STEP\}/g, z.stepCm.toFixed(2));
    entries.unshift({ name: 'LEIA-ME_Unreal.txt', blob: new Blob(['﻿' + readme.replace(/\n/g, '\r\n')], { type: 'text/plain' }) });
    entries.push({ name: base + '_config.json', blob: new Blob([JSON.stringify({ unreal: o.unreal, tiles: n, tileSize: T, minM: mn, maxM: mx, zScale: z.zScale, locationZ: z.locZ, params: P }, null, 2)], { type: 'application/json' }) });

    const zip = await makeZip(entries);
    progress('', 1);
    return { blob: zip, mn, mx, zScale: z.zScale, locZ: z.locZ, stepCm: z.stepCm };
  }

  // ================= rio automático =================
  // "Priority flood" a partir da nascente: a água avança sempre pelo ponto mais baixo ao redor do que já
  // molhou. Desce morro abaixo e, se cair num buraco, enche como um lago e transborda pelo ponto mais baixo.
  // Termina no mar, num rio já pintado (afluente) ou na borda do mapa.
  // Rio entre dois pontos: caminho de menor custo (A*) de A até B. Custo de cada passo = distância × (1 + quanto
  // o ponto é alto na região, de 0 a 1 × 6) + subida em metros × 40, e o mar custa 25× (só o ponto final pode ser
  // mar). Resultado: a água corre pelos vales e só sobe quando não há outro jeito (cava o leito por cima).
  function riverLink(H, W, cell, ax, ay, bx, by, rivers) {
    const N = W * W, start = ay * W + ax, goal = by * W + bx;
    // destino em água (mar/lago ou um rio já pintado): vale qualquer ponto daquela mesma água perto do clique
    // (raio r), e o rio corre até a margem mais próxima dali. Destino em terra firme: o ponto exato.
    const isWater = (i) => H[i] < 0, isRiver = (i) => rivers && rivers[i] > 0.5;
    const cls = isWater(goal) ? isWater : isRiver(goal) ? isRiver : null;
    let target = null;
    if (cls) {
      const r = Math.max(W * 0.06, 0.4 * Math.hypot(bx - ax, by - ay)), r2 = r * r;
      target = new Uint8Array(N); target[goal] = 1;
      const st = [goal];
      while (st.length) {
        const c = st.pop(), x = c % W, y = (c / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue;
          const nb = ny * W + nx;
          if (!target[nb] && cls(nb) && (nx - bx) ** 2 + (ny - by) ** 2 <= r2) { target[nb] = 1; st.push(nb); }
        }
      }
      if (target[start]) return null; // nascente dentro da própria água de destino
    }
    let lo = Infinity, hi = -Infinity;
    const pad = Math.round(W * 0.08), x0 = Math.max(0, Math.min(ax, bx) - pad), x1 = Math.min(W - 1, Math.max(ax, bx) + pad);
    const y0 = Math.max(0, Math.min(ay, by) - pad), y1 = Math.min(W - 1, Math.max(ay, by) + pad);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const h = Math.max(0, H[y * W + x]); if (h < lo) lo = h; if (h > hi) hi = h; }
    const span = Math.max(1, hi - lo);
    const g = new Float64Array(N).fill(Infinity), parent = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    let hk = new Float64Array(1024), hi2 = new Int32Array(1024), hn = 0;
    const push = (k, i) => {
      if (hn === hk.length) { const k2 = new Float64Array(hn * 2), i2 = new Int32Array(hn * 2); k2.set(hk); i2.set(hi2); hk = k2; hi2 = i2; }
      let c = hn++;
      while (c > 0) { const p = (c - 1) >> 1; if (hk[p] <= k) break; hk[c] = hk[p]; hi2[c] = hi2[p]; c = p; }
      hk[c] = k; hi2[c] = i;
    };
    const pop = () => {
      const top = hi2[0], lk = hk[--hn], li = hi2[hn];
      let c = 0;
      for (;;) {
        let ch = 2 * c + 1;
        if (ch >= hn) break;
        if (ch + 1 < hn && hk[ch + 1] < hk[ch]) ch++;
        if (hk[ch] >= lk) break;
        hk[c] = hk[ch]; hi2[c] = hi2[ch]; c = ch;
      }
      hk[c] = lk; hi2[c] = li;
      return top;
    };
    const reach = target ? Math.max(W * 0.06, 0.4 * Math.hypot(bx - ax, by - ay)) : 0; // a meta começa a r do clique
    const heur = (i) => Math.max(0, Math.hypot((i % W) - bx, ((i / W) | 0) - by) - reach) * cell;
    g[start] = 0; push(heur(start), start);
    let visited = 0, found = -1;
    while (hn) {
      const c = pop();
      if (done[c]) continue;
      done[c] = 1;
      if (target ? target[c] : c === goal) { found = c; break; }
      if ((++visited & 65535) === 0) progress('Traçando o rio', Math.min(0.99, visited / N));
      const x = c % W, y = (c / W) | 0, hc = H[c];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue;
        const nb = ny * W + nx;
        if (done[nb]) continue;
        const hn2 = H[nb], len = (dx && dy ? 1.41421 : 1) * cell;
        let cost = len * (1 + 3 * Math.min(1, Math.max(0, (hn2 - lo) / span))) + Math.max(0, hn2 - hc) * 60;
        if (hn2 < 0 && !(target ? target[nb] : nb === goal)) cost *= 25;
        const ng = g[c] + cost;
        if (ng < g[nb]) { g[nb] = ng; parent[nb] = c; push(ng + heur(nb), nb); }
      }
    }
    progress('', 1);
    if (found < 0) return null;
    const chain = [];
    for (let c = found; c !== -1; c = parent[c]) chain.push(c);
    chain.reverse();
    const n = chain.length;
    const path = [];
    let climb = 0;
    for (let i = n - 1; i >= 0; i--) { const c = chain[i]; path.push(c % W, (c / W) | 0); if (i > 0 && H[chain[i - 1]] < H[c]) climb += H[c] - H[chain[i - 1]]; }
    const out = new Int32Array(path.length);
    for (let i = 0; i < path.length; i += 2) { out[i] = path[path.length - 2 - i]; out[i + 1] = path[path.length - 1 - i]; }
    return { path: out, climb };
  }

  // ================= mensagens =================
  function setup(m) {
    if (S.W !== m.W || S.worldM !== m.worldM) { S.W = m.W; S.worldM = m.worldM; S.cell = m.worldM / m.W; S.fields = null; S.fieldsKey = ''; }
    S.P = m.P;
  }

  // Uma mensagem por vez: a exportação é assíncrona e não pode ser atropelada por uma recomposição.
  let queue = Promise.resolve();
  self.onmessage = (e) => { queue = queue.then(() => handle(e.data)); };

  async function handle(m) {
    try {
      if (m.type === 'compose') {
        setup(m);
        ensureFields(S.W, S.worldM, S.P);
        S.base = m.base ? composeOnBase(m.masks, S.P, m.base) : compose(m.masks, S.P);
        S.eroded = null;
        reply(m.id, m);
      } else if (m.type === 'erode') {
        S.P = m.P;
        if (!S.base) throw new Error('Nada para erodir ainda.');
        const H = Float32Array.from(S.base);
        erodeHydraulic(H, S.W, S.P, S.P.seed | 0);
        if (S.P.thIters > 0) erodeThermal(H, S.W, S.cell, Math.round(S.P.thIters), S.P.thTalus);
        S.eroded = H;
        reply(m.id, m);
      } else if (m.type === 'recolor') {
        S.P = m.P;
        if (!S.base) throw new Error('Nada para colorir ainda.');
        reply(m.id, m);
      } else if (m.type === 'autoLand') {
        const mask = autoLand(m.W, m.P, m.style, m.coverage);
        post({ type: 'mask', id: m.id, mask }, [mask.buffer]);
      } else if (m.type === 'autoRelief') {
        const r = autoRelief(m.W, m.P, m.land, m.amount);
        post({ type: 'masks', id: m.id, mountains: r.mountains, hills: r.hills }, [r.mountains.buffer, r.hills.buffer]);
      } else if (m.type === 'riverLink') {
        if (!S.base) throw new Error('Gere o terreno primeiro.');
        const r = riverLink(current(), S.W, S.cell, m.ax, m.ay, m.bx, m.by, m.rivers);
        post({ type: 'river', id: m.id, path: r ? r.path : null, climb: r ? r.climb : 0 }, r ? [r.path.buffer] : []);
      } else if (m.type === 'export') {
        S.P = m.P;
        if (!S.base) throw new Error('Gere o terreno antes de exportar.');
        if (m.erode && !S.eroded) {
          const H = Float32Array.from(S.base);
          erodeHydraulic(H, S.W, S.P, S.P.seed | 0);
          if (S.P.thIters > 0) erodeThermal(H, S.W, S.cell, Math.round(S.P.thIters), S.P.thTalus);
          S.eroded = H;
        }
        const r = await doExport(m);
        post({ type: 'exported', id: m.id, ...r });
      }
    } catch (err) {
      post({ type: 'error', id: m.id, message: String((err && err.message) || err) });
    }
  }
}
