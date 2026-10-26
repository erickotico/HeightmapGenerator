/* Forja de Mundos — carimbos de relevo: formas prontas (montanha, vulcão, cratera, cânion, platô, ilha) aplicadas
   com um clique na camada Esculpir (metros somados por cima de tudo). Por isso dá para desfazer, suavizar ou
   rebaixar depois como qualquer pincelada. Cada clique sorteia uma semente nova: duas montanhas nunca saem iguais.
   Usa as globais do app.js (S, snapshot, afterMaskChange…) só depois que ele carrega. */
'use strict';

const Stamps = (() => {
  // size = diâmetro (m) · height = altura, profundidade ou altura acima do mar (m) · aspect = largura/comprimento
  const TYPES = [
    { id: 'montanha', name: 'Montanha', size: 1600, height: 600, aspect: 1, hLabel: 'Altura (m)' },
    { id: 'vulcao', name: 'Vulcão', size: 2400, height: 900, aspect: 1, hLabel: 'Altura (m)' },
    { id: 'cratera', name: 'Cratera', size: 1200, height: 120, aspect: 1, hLabel: 'Profundidade (m)' },
    { id: 'canion', name: 'Cânion', size: 3000, height: 180, aspect: 0.22, hLabel: 'Profundidade (m)' },
    { id: 'plato', name: 'Platô', size: 1500, height: 150, aspect: 1, hLabel: 'Altura (m)' },
    { id: 'ilha', name: 'Ilha', size: 1500, height: 60, aspect: 1, hLabel: 'Altura acima do mar (m)' }
  ];
  const byId = (id) => TYPES.find((t) => t.id === id) || TYPES[0];

  // ---------------- ruído (valor suavizado, determinístico pela semente) ----------------
  function hash(ix, iy, seed) {
    let h = (ix * 374761393 + iy * 668265263 + seed * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  }
  function fbm(x, y, seed, oct = 4) {
    let s = 0, amp = 0.5, f = 1, tot = 0;
    for (let o = 0; o < oct; o++) { s += amp * vnoise(x * f, y * f, seed + o * 17); tot += amp; amp *= 0.5; f *= 2; }
    return s / tot;
  }
  const ridged = (x, y, seed) => { let s = 0, amp = 0.5, f = 1, tot = 0; for (let o = 0; o < 4; o++) { s += amp * (1 - Math.abs(2 * vnoise(x * f, y * f, seed + o * 31) - 1)); tot += amp; amp *= 0.5; f *= 2; } return s / tot; };
  const sm = (t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };

  // Forma em coordenadas locais (u, v): borda em r = 1 (cânion: u = comprimento, v = largura já normalizada).
  // Devolve a fração da altura (negativa = cava). Ilha devolve {shape, w} para nivelar até o alvo.
  function shape(id, u, v, seed) {
    const r = Math.hypot(u, v);
    switch (id) {
      case 'montanha': {
        const rr = r * (0.82 + 0.36 * fbm(u * 2.2 + 5, v * 2.2, seed));
        if (rr >= 1) return 0;
        return Math.pow(sm(1 - rr), 1.7) * (0.6 + 0.4 * ridged(u * 3, v * 3, seed + 3));
      }
      case 'vulcao': {
        const rr = r * (0.92 + 0.16 * fbm(u * 3, v * 3, seed));
        if (rr >= 1) return 0;
        let h = Math.pow(sm((1 - rr) / 0.86), 1.5); // cone até a borda da cratera (rr = 0,14)
        if (rr < 0.14) h = 1 - 0.38 * sm((0.14 - rr) / 0.12); // cratera no topo
        return h * (0.9 + 0.1 * fbm(u * 7, v * 7, seed + 9)); // sulcos de lava
      }
      case 'cratera': {
        if (r >= 1) return 0;
        const n = 0.9 + 0.2 * fbm(u * 4, v * 4, seed);
        const bowl = r < 0.7 ? -(1 - Math.pow(r / 0.7, 2.2)) : 0;
        const rim = 0.32 * Math.exp(-(((r - 0.72) / 0.1) ** 2));
        return (bowl + rim * n) * sm((1 - r) / 0.18);
      }
      case 'canion': {
        const au = Math.abs(u);
        if (au >= 1) return 0;
        const vm = v + 0.45 * Math.sin(u * 2.6 + (seed % 7)) + 0.5 * (fbm(u * 2, 0.5, seed) - 0.5); // serpenteia
        const a = Math.abs(vm);
        if (a >= 1) return 0;
        const t = 1 - sm((a - 0.18) / 0.62), q = t * 4, step = Math.floor(q) + sm((q % 1 - 0.65) / 0.35); // paredes em degraus
        return -(step / 4) * sm((1 - au) / 0.22);
      }
      case 'plato': {
        const rr = r * (0.88 + 0.28 * fbm(u * 3, v * 3, seed));
        if (rr >= 1) return 0;
        const top = sm((0.78 - rr) / 0.1);
        return top * (0.97 + 0.03 * fbm(u * 9, v * 9, seed + 5)) + 0.14 * sm((1 - rr) / 0.3) * (1 - top); // paredão + rampa de cascalho
      }
      case 'ilha': {
        const rr = r * (0.84 + 0.36 * fbm(u * 2.2, v * 2.2, seed));
        if (rr >= 1) return null;
        return { shape: Math.pow(sm((1 - rr) / 0.72), 0.9) * (0.75 + 0.25 * ridged(u * 2.5, v * 2.5, seed + 1)), w: sm((1 - rr) / 0.25) };
      }
    }
    return 0;
  }

  // ---------------- aplicar ----------------
  const frame = (p) => {
    const t = byId(S.stamp.type), R = S.stamp.size / 2 / Feat.mPerCell(), a = (S.stamp.rot * Math.PI) / 180;
    return { t, R, ca: Math.cos(a), sa: Math.sin(a), cx: p.x, cy: p.y };
  };
  function apply(p) {
    if (!S.H) return;
    const f = frame(p), { t, R, ca, sa, cx, cy } = f, W = S.W, arr = S.sculpt, Hh = S.stamp.height;
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(W - 1, Math.ceil(cy + R));
    if (x0 > x1 || y0 > y1) return;
    snapshot(['sculpt']);
    const seed = (Math.random() * 1e9) | 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = (dx * ca + dy * sa) / R, v = ((-dx * sa + dy * ca) / R) / t.aspect;
      const i = y * W + x;
      if (t.id === 'ilha') {
        const s = shape('ilha', u, v, seed);
        if (!s) continue;
        const tgt = Hh * s.shape - 20 * (1 - s.shape); // sobe do fundo até uma plataforma rasa e depois até o topo
        if (tgt > S.H[i]) arr[i] += (tgt - S.H[i]) * s.w;
      } else {
        const s = shape(t.id, u, v, seed);
        if (s) arr[i] += s * Hh;
      }
    }
    afterMaskChange('sculpt');
    toast(`${I18N.tr(t.name)} carimbado(a). Ctrl+Z desfaz; o resultado fica na camada Esculpir.`);
  }

  // ---------------- prévia do contorno ----------------
  let svg = null, last = null;
  function preview(p) {
    svg = svg || document.getElementById('stampSvg');
    if (p) last = p;
    if (!svg) return;
    if (S.tool !== 'stamp' || !last || S.mode !== '2d') { svg.innerHTML = ''; return; }
    const { t, R, ca, sa, cx, cy } = frame(last), s = S.view.s;
    const X = cx * s + S.view.tx, Y = cy * s + S.view.ty, rx = R * s, ry = R * t.aspect * s, deg = S.stamp.rot;
    // cânion: eixo tracejado mostra para onde ele corre
    const arrow = t.aspect < 1 ? `<line x1="${X - ca * rx}" y1="${Y - sa * rx}" x2="${X + ca * rx}" y2="${Y + sa * rx}" class="st-ln" stroke-dasharray="6 5"/>` : '';
    svg.innerHTML = `<ellipse cx="${X}" cy="${Y}" rx="${rx}" ry="${ry}" transform="rotate(${deg} ${X} ${Y})" class="st-sh"/>
      <ellipse cx="${X}" cy="${Y}" rx="${rx}" ry="${ry}" transform="rotate(${deg} ${X} ${Y})" class="st-ln"/>${arrow}
      <text x="${X + rx * 0.72 + 8}" y="${Y - ry * 0.72 - 6}" class="rl-text" style="paint-order:stroke;stroke:#000;stroke-width:3px">${I18N.tr(t.name)} · ${fmt(S.stamp.size, 0)} m</text>`;
  }

  // ---------------- barra de opções e teclado ----------------
  function syncOptions() {
    const t = byId(S.stamp.type);
    document.getElementById('stampType').value = t.id;
    document.getElementById('stampSize').value = S.stamp.size;
    document.getElementById('stampHeight').value = S.stamp.height;
    document.getElementById('stampRot').value = S.stamp.rot;
    document.getElementById('stampHLabel').textContent = I18N.tr(t.hLabel);
  }
  function bindOptions() {
    const sel = document.getElementById('stampType');
    sel.innerHTML = TYPES.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
    sel.onchange = () => { const t = byId(sel.value); S.stamp.type = t.id; S.stamp.size = t.size; S.stamp.height = t.height; syncOptions(); preview(); };
    const num = (id, key, min, max) => { const el = document.getElementById(id); el.onchange = () => { const v = +el.value; if (isFinite(v)) S.stamp[key] = clamp(v, min, max); syncOptions(); preview(); }; };
    num('stampSize', 'size', 20, 200000); num('stampHeight', 'height', 1, 9000); num('stampRot', 'rot', -360, 360);
  }
  const turn = (d) => { S.stamp.rot = ((S.stamp.rot + d + 540) % 360) - 180; syncOptions(); preview(); };
  const grow = (up) => { S.stamp.size = clamp(Math.round(S.stamp.size * (up ? 1.15 : 1 / 1.15)), 20, 200000); syncOptions(); preview(); };
  // [ ] tamanho · , . girar 15° (com a ferramenta Carimbo)
  function key(e) {
    if (S.tool !== 'stamp') return false;
    if (e.key === '[' || e.key === ']') { e.preventDefault(); grow(e.key === ']'); return true; }
    if (e.key === ',' || e.key === '.') { turn(e.key === '.' ? 15 : -15); return true; }
    return false;
  }

  return { TYPES, apply, preview, syncOptions, bindOptions, key, turn };
})();
