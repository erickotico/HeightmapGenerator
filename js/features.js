/* Forja de Mundos — rios em linha e estradas: dados, desenho por cima do mapa e edição com o mouse.
   Rio = linha com pontos de controle (curva suave entre eles), largura na nascente e na foz.
   Estrada = pontos de passagem; entre dois pontos a rota é traçada pelo motor seguindo o relevo.
   Posições guardadas normalizadas (u, v de 0 a 1), como os marcadores: não mudam com a resolução.
   Usa as globais do app.js (S, call, snapshot…) só depois que ele carrega. */
'use strict';

const Feat = (() => {
  const HIT_PT = 8, HIT_LINE = 7; // px de tela
  const g2s = (x, y) => ({ x: (x + 0.5) * S.view.s + S.view.tx, y: (y + 0.5) * S.view.s + S.view.ty });
  const uv2g = (p) => ({ x: p.u * (S.W - 1), y: p.v * (S.W - 1) });
  const g2uv = (x, y) => ({ u: clamp(x / (S.W - 1), 0, 1), v: clamp(y / (S.W - 1), 0, 1) });
  const mPerCell = () => worldM() / (S.W - 1);

  // ---------------- geometria ----------------
  // Catmull-Rom uniforme pelos pontos (grade); devolve pontos a cada ~step células.
  function curve(pts, step = 0.5) {
    if (pts.length < 2) return pts.map((p) => ({ ...p }));
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push({
          x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        });
      }
    }
    out.push({ ...pts[pts.length - 1] });
    return out;
  }
  function polyLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return l; }
  // Douglas-Peucker: poucos pontos de controle a partir de um caminho em pixels
  function simplify(pts, eps) {
    if (pts.length < 3) return pts.slice();
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const st = [[0, pts.length - 1]];
    while (st.length) {
      const [a, b] = st.pop(), A = pts[a], B = pts[b], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
      let md = 0, mi = -1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i].x - A.x) * dy - (pts[i].y - A.y) * dx) / L; if (d > md) { md = d; mi = i; } }
      if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  // caminho do motor (inteiros x,y) → pontos suaves (média móvel), pontas no lugar
  function smoothPath(path, r = 3) {
    const n = path.length / 2, pts = [];
    for (let i = 0; i < n; i++) {
      if (i === 0 || i === n - 1) { pts.push({ x: path[2 * i], y: path[2 * i + 1] }); continue; }
      let sx = 0, sy = 0, c = 0;
      for (let k = Math.max(0, i - r); k <= Math.min(n - 1, i + r); k++) { sx += path[2 * k]; sy += path[2 * k + 1]; c++; }
      pts.push({ x: sx / c, y: sy / c });
    }
    return pts;
  }
  function distSeg(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    const t = l2 ? clamp(((px - a.x) * dx + (py - a.y) * dy) / l2, 0, 1) : 0;
    return Math.hypot(px - a.x - dx * t, py - a.y - dy * t);
  }

  // ---------------- rios ----------------
  const riverGrid = (r) => r.pts.map(uv2g);
  // pontos da curva com a largura (m) em cada um: cresce da nascente até a foz pelo comprimento
  function riverSamples(r, step = 0.5) {
    const c = curve(riverGrid(r), step), L = polyLen(c) || 1;
    let acc = 0;
    return c.map((p, i) => { if (i) acc += Math.hypot(p.x - c[i - 1].x, p.y - c[i - 1].y); return { x: p.x, y: p.y, w: r.w0 + (r.w1 - r.w0) * (acc / L) }; });
  }
  // máscara (0..1) dos rios em linha: o motor cava o leito igual à pintura da camada Rios
  function riverRaster() {
    const W = S.W, out = new Float32Array(W * W), cm = mPerCell();
    if (!S.vrivers.length) return out;
    for (const r of S.vrivers) {
      for (const p of riverSamples(r)) {
        const rad = Math.max(0.5, p.w / 2 / cm), R = rad + 1.5;
        const x0 = Math.max(0, Math.floor(p.x - R)), x1 = Math.min(W - 1, Math.ceil(p.x + R));
        const y0 = Math.max(0, Math.floor(p.y - R)), y1 = Math.min(W - 1, Math.ceil(p.y + R));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const v = 1 - smooth01((Math.hypot(x - p.x, y - p.y) - rad) / 1.5), i = y * W + x;
          if (v > out[i]) out[i] = v;
        }
      }
    }
    return out;
  }
  // caminho de pixels → rio editável (pontos de controle a cada ~20 células no máximo)
  function riverFromPath(gridPts, w0, w1) {
    let ctrl = simplify(gridPts, 1.2);
    const dense = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      const a = ctrl[i], b = ctrl[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 20));
      for (let k = 0; k < n; k++) dense.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
    dense.push(ctrl[ctrl.length - 1]);
    ctrl = dense;
    const id = ++S.featSeq;
    return { id, name: 'Rio ' + (S.vrivers.length + 1), pts: ctrl.map((p) => g2uv(p.x, p.y)), w0, w1 };
  }
  function riverLengthM(r) { return polyLen(curve(riverGrid(r), 1)) * mPerCell(); }

  // ---------------- estradas ----------------
  const ROAD_KINDS = { estrada: { name: 'Estrada', width: 6, grade: 0.12, color: '#d9b77e' }, trilha: { name: 'Trilha', width: 2.5, grade: 0.25, color: '#b98d56' } };
  const roadGrid = (r) => r.segs.flatMap((s, k) => (k ? s.slice(1) : s)).map(uv2g);
  function roadLengthM(r) { return polyLen(roadGrid(r)) * mPerCell(); }
  // trecho do motor → pontos suaves e enxutos (normalizados)
  function segFromPath(path) {
    const pts = simplify(smoothPath(path, 2), 0.35);
    return pts.map((p) => g2uv(p.x, p.y));
  }
  async function routeSeg(a, b, kind) {
    const ga = uv2g(a), gb = uv2g(b);
    const r = await call('roadRoute', {
      ax: Math.round(ga.x), ay: Math.round(ga.y), bx: Math.round(gb.x), by: Math.round(gb.y),
      maxGrade: ROAD_KINDS[kind].grade, lakes: S.masks.lakes, rivers: combinedRivers()
    });
    return r.path ? segFromPath(r.path) : null;
  }
  // para o motor: cada estrada vira uma lista de pontos na grade
  function roadsForEngine() {
    return S.roads.filter((r) => r.segs.length).map((r) => {
      const g = roadGrid(r), pts = new Float32Array(g.length * 2);
      g.forEach((p, i) => { pts[2 * i] = p.x; pts[2 * i + 1] = p.y; });
      return { pts, width: r.width, kind: r.kind };
    });
  }
  function combinedRivers() {
    const a = Float32Array.from(S.masks.rivers), v = riverRaster();
    for (let i = 0; i < a.length; i++) if (v[i] > a[i]) a[i] = v[i];
    return a;
  }

  // ---------------- desenho (SVG por cima do mapa) ----------------
  let svg = null;
  const pathD = (pts) => pts.map((p, i) => { const s = g2s(p.x, p.y); return (i ? 'L' : 'M') + s.x.toFixed(1) + ' ' + s.y.toFixed(1); }).join('');
  function render() {
    svg = svg || document.getElementById('featSvg');
    if (!svg) return;
    if (S.mode !== '2d') { svg.innerHTML = ''; return; }
    const sc = S.view.s / mPerCell(), parts = [];
    const showRiverPts = S.tool === 'river', showRoadPts = S.tool === 'road', sel = S.featSel;
    for (const r of S.roads) {
      const k = ROAD_KINDS[r.kind] || ROAD_KINDS.estrada, g = roadGrid(r), w = Math.max(2, r.width * sc);
      const isSel = sel && sel.kind === 'road' && sel.id === r.id;
      if (g.length > 1) {
        const d = pathD(g);
        parts.push(`<path d="${d}" fill="none" stroke="rgba(40,25,10,.7)" stroke-width="${w + 2}" stroke-linecap="round" stroke-linejoin="round"/>`);
        parts.push(`<path d="${d}" fill="none" stroke="${isSel ? '#ffd36b' : k.color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${r.kind === 'trilha' ? ` stroke-dasharray="${Math.max(3, w * 1.6)} ${Math.max(2, w)}"` : ''}/>`);
      }
      if (showRoadPts) r.anchors.forEach((a) => { const p = g2s(uv2g(a).x, uv2g(a).y); parts.push(`<circle class="ft-pt${isSel ? ' sel' : ''}" cx="${p.x}" cy="${p.y}" r="${isSel ? 5.5 : 4.5}" fill="#d9b77e"/>`); });
    }
    for (const r of S.vrivers) {
      const smp = riverSamples(r, 1), isSel = sel && sel.kind === 'river' && sel.id === r.id;
      // largura variável: trechos com a largura média de cada pedaço
      const step = Math.max(1, Math.floor(smp.length / 24));
      for (let i = 0; i < smp.length - 1; i += step) {
        const seg = smp.slice(i, Math.min(smp.length, i + step + 1));
        const w = Math.max(2, seg.reduce((s, p) => s + p.w, 0) / seg.length * sc);
        parts.push(`<path d="${pathD(seg)}" fill="none" stroke="${isSel ? '#7fd3ff' : '#3a86e8'}" stroke-opacity=".9" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);
      }
      if (showRiverPts) r.pts.forEach((u, i) => { const g = uv2g(u), p = g2s(g.x, g.y); parts.push(`<circle class="ft-pt${isSel ? ' sel' : ''}" cx="${p.x}" cy="${p.y}" r="${i === 0 ? 6 : isSel ? 5 : 4}" fill="${i === 0 ? '#9fe0ff' : '#3a86e8'}"/>`); });
    }
    // rio ou estrada sendo desenhado
    if (S.riverA) { const p = g2s(S.riverA.x, S.riverA.y); parts.push(`<circle cx="${p.x}" cy="${p.y}" r="7" fill="#3278ff" stroke="#fff" stroke-width="2"/><text class="rl-text" x="${p.x + 12}" y="${p.y + 4}" style="paint-order:stroke;stroke:#000;stroke-width:3px">Nascente — clique no destino</text>`); }
    if (S.roadDraft && S.roadDraft.anchors.length && lastMouse) {
      const a = uv2g(S.roadDraft.anchors[S.roadDraft.anchors.length - 1]), p = g2s(a.x, a.y);
      parts.push(`<line x1="${p.x}" y1="${p.y}" x2="${lastMouse.x}" y2="${lastMouse.y}" stroke="#ffd36b" stroke-width="1.5" stroke-dasharray="5 4"/>`);
    }
    svg.innerHTML = parts.join('');
  }
  let lastMouse = null;

  // ---------------- acertar com o mouse ----------------
  function hitPoint(sx, sy, kind) {
    const list = kind === 'river' ? S.vrivers : S.roads;
    for (let k = list.length - 1; k >= 0; k--) {
      const f = list[k], pts = kind === 'river' ? f.pts : f.anchors;
      for (let i = 0; i < pts.length; i++) { const g = uv2g(pts[i]), p = g2s(g.x, g.y); if (Math.hypot(sx - p.x, sy - p.y) <= HIT_PT) return { f, i }; }
    }
    return null;
  }
  function hitLine(sx, sy, kind) {
    const list = kind === 'river' ? S.vrivers : S.roads;
    let best = null;
    for (const f of list) {
      const g = kind === 'river' ? curve(riverGrid(f), 1) : roadGrid(f);
      const w = kind === 'river' ? Math.max(f.w0, f.w1) : f.width, tol = Math.max(HIT_LINE, (w / mPerCell()) * S.view.s / 2 + 3);
      for (let i = 0; i < g.length - 1; i++) {
        const a = g2s(g[i].x, g[i].y), b = g2s(g[i + 1].x, g[i + 1].y), d = distSeg(sx, sy, a, b);
        if (d <= tol && (!best || d < best.d)) best = { f, i, d };
      }
    }
    return best;
  }
  // índice do segmento de controle mais perto (para inserir um ponto novo no rio)
  function nearestCtrlSeg(r, gx, gy) {
    const g = riverGrid(r);
    let bi = 0, bd = Infinity;
    for (let i = 0; i < g.length - 1; i++) { const d = distSeg(gx, gy, g[i], g[i + 1]); if (d < bd) { bd = d; bi = i; } }
    return bi;
  }

  // ---------------- edição ----------------
  let drag = null;
  function select(kind, id) { S.featSel = id == null ? null : { kind, id }; UI.sync(); buildList(); render(); }
  function selected() {
    const s = S.featSel;
    if (!s) return null;
    return (s.kind === 'river' ? S.vrivers : S.roads).find((f) => f.id === s.id) || null;
  }
  function changed(terrain = true) { markDirty(); render(); buildList(); if (terrain) scheduleCompose(0); }

  // pointerdown na ferramenta Rio ou Estrada
  function down(p, e) {
    const r = vp.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    const kind = S.tool === 'road' ? 'road' : 'river';
    if (kind === 'road' && S.roadDraft) {
      // dois cliques terminam (se a rota do 1º clique ainda estiver sendo traçada, termina quando ela chegar)
      if (e.detail >= 2) { if (S.roadDraft.busy) S.roadDraft.finishPending = true; else finishDraft(); return; }
      addDraftAnchor(p);
      return;
    }
    const hp = hitPoint(sx, sy, kind);
    if (hp) {
      if (e.altKey) { deletePoint(kind, hp.f, hp.i); return; }
      select(kind, hp.f.id);
      drag = { kind, f: hp.f, i: hp.i, pre: structuredClone(kind === 'river' ? S.vrivers : S.roads), moved: false };
      return;
    }
    const hl = hitLine(sx, sy, kind);
    if (hl) {
      if (e.detail >= 2 && kind === 'river') { insertRiverPoint(hl.f, p); return; }
      select(kind, hl.f.id);
      return;
    }
    select(null, null);
    if (kind === 'river') riverClick(p);
    else startDraft(p);
  }
  function move(p, e) {
    const r = vp.getBoundingClientRect();
    lastMouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (S.roadDraft) render();
    if (!drag) return;
    if (!drag.moved) { S.undo.push({ [drag.kind === 'river' ? 'vrivers' : 'roads']: drag.pre }); S.redo.length = 0; drag.moved = true; }
    const uv = g2uv(p.x - 0.5, p.y - 0.5);
    if (drag.kind === 'river') drag.f.pts[drag.i] = uv; else drag.f.anchors[drag.i] = uv;
    markDirty(); render();
  }
  async function up() {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    if (d.kind === 'river') { changed(); return; }
    // estrada: refaz as duas rotas que tocam o ponto arrastado
    const f = d.f;
    try {
      await flushCompose();
      for (const si of [d.i - 1, d.i]) {
        if (si < 0 || si >= f.anchors.length - 1) continue;
        const seg = await routeSeg(f.anchors[si], f.anchors[si + 1], f.kind);
        if (seg) f.segs[si] = seg; else toast('Não achei caminho por terra até esse ponto (mar ou lago no meio).', true);
      }
    } catch (err) { showError(err); }
    changed();
  }

  // rio: 1º clique = nascente, 2º = destino; o motor liga os dois pelos vales
  function riverClick(p) {
    const W = S.W, x = Math.floor(p.x), y = Math.floor(p.y);
    if (x < 0 || y < 0 || x >= W || y >= W || !S.H) return;
    if (!S.riverA) { S.riverA = { x, y }; render(); UI.sync(); toast('Nascente marcada. Agora clique no destino (mar, lago ou outro rio). Esc cancela.'); return; }
    const a = S.riverA;
    S.riverA = null; render(); UI.sync();
    if (a.x === x && a.y === y) return;
    linkRiver(a, { x, y });
  }
  async function linkRiver(a, b) {
    try {
      await flushCompose();
      const r = await call('riverLink', { ax: a.x, ay: a.y, bx: b.x, by: b.y, rivers: combinedRivers() });
      if (!r.path) { toast('Não achei um caminho entre esses dois pontos.'); return; }
      snapshot(['vrivers']);
      const riv = riverFromPath(smoothPath(r.path, 3), S.riverDef.w0, S.riverDef.w1);
      S.vrivers.push(riv);
      select('river', riv.id);
      changed();
      toast(`Rio traçado: ${fmt(riverLengthM(riv) / 1000, 1)} km. Arraste os pontos para ajustar; dois cliques na linha criam um ponto; Alt+clique apaga um ponto.` +
        (r.climb > 5 ? ` Atenção: o caminho sobe ${fmt(r.climb, 0)} m (o leito cava o terreno ali).` : ''), r.climb > 5);
    } catch (err) { showError(err); }
  }
  function insertRiverPoint(r, p) {
    snapshot(['vrivers']);
    const gx = p.x - 0.5, gy = p.y - 0.5, i = nearestCtrlSeg(r, gx, gy);
    r.pts.splice(i + 1, 0, g2uv(gx, gy));
    select('river', r.id); changed();
  }
  function deletePoint(kind, f, i) {
    const pts = kind === 'river' ? f.pts : f.anchors;
    if (pts.length <= 2) { toast('Com só dois pontos, apague o ' + (kind === 'river' ? 'rio' : 'caminho') + ' inteiro (Delete).'); return; }
    snapshot([kind === 'river' ? 'vrivers' : 'roads']);
    const last = pts.length - 1;
    pts.splice(i, 1);
    if (kind === 'road') {
      // trecho i liga o ponto i ao i+1. Ponta: some um trecho. Meio: os dois vizinhos viram uma rota nova.
      if (i === 0) f.segs.splice(0, 1);
      else if (i === last) f.segs.splice(i - 1, 1);
      else {
        const k = i - 1;
        f.segs.splice(k, 2, [f.anchors[k], f.anchors[k + 1]]);
        flushCompose().then(() => routeSeg(f.anchors[k], f.anchors[k + 1], f.kind)).then((seg) => { if (seg) f.segs[k] = seg; changed(); }).catch(showError);
      }
    }
    select(kind, f.id); changed();
  }
  function deleteSelected() {
    const s = S.featSel, f = selected();
    if (!f) return false;
    snapshot([s.kind === 'river' ? 'vrivers' : 'roads']);
    if (s.kind === 'river') S.vrivers = S.vrivers.filter((x) => x !== f); else S.roads = S.roads.filter((x) => x !== f);
    select(null, null); changed();
    return true;
  }

  // estrada: cada clique é um ponto de passagem; Enter, dois cliques ou Esc terminam
  function startDraft(p) {
    if (!S.H) return;
    S.roadDraft = { anchors: [g2uv(p.x - 0.5, p.y - 0.5)], segs: [], busy: false };
    UI.sync(); render();
    toast('Clique nos próximos pontos do caminho (cidades, pontes, passos de montanha). Enter ou dois cliques terminam; Esc cancela.');
  }
  async function addDraftAnchor(p, finish) {
    const d = S.roadDraft;
    if (!d || d.busy) return;
    const uv = g2uv(p.x - 0.5, p.y - 0.5), last = d.anchors[d.anchors.length - 1], lg = uv2g(last), ng = uv2g(uv);
    if (Math.hypot(lg.x - ng.x, lg.y - ng.y) < 2) { if (finish !== false) finishDraft(); return; }
    d.busy = true;
    try {
      await flushCompose();
      const seg = await routeSeg(last, uv, S.roadDef.kind);
      if (!seg) { toast('Não achei caminho por terra até esse ponto (mar ou lago no meio).', true); return; }
      d.anchors.push(uv); d.segs.push(seg);
      render();
    } catch (err) { showError(err); } finally { d.busy = false; }
    if (d.finishPending && S.roadDraft === d) finishDraft();
  }
  function finishDraft() {
    const d = S.roadDraft;
    S.roadDraft = null;
    if (d && d.segs.length) {
      snapshot(['roads']);
      const k = ROAD_KINDS[S.roadDef.kind], id = ++S.featSeq;
      const road = { id, name: `${k.name} ${S.roads.filter((r) => r.kind === S.roadDef.kind).length + 1}`, kind: S.roadDef.kind, width: S.roadDef.width, anchors: d.anchors, segs: d.segs };
      S.roads.push(road);
      select('road', id); changed();
      toast(`${road.name}: ${fmt(roadLengthM(road) / 1000, 2)} km, contornando as subidas fortes. Arraste os pontos para mudar a rota; Alt+clique apaga um ponto.`);
    } else { UI.sync(); render(); }
  }
  function cancel() {
    if (S.roadDraft) { if (S.roadDraft.segs.length) finishDraft(); else { S.roadDraft = null; UI.sync(); render(); } return true; }
    if (S.riverA) { S.riverA = null; UI.sync(); render(); return true; }
    return false;
  }

  // ---------------- pintura antiga → rios em linha / limpar manchinhas ----------------
  function convertPainted() {
    if (!S.H) return;
    const g = mPerCell(), lines = Rivers.extract(S.masks.rivers, S.H, S.W, { minLen: RIVER_MIN_M / g, step: 1, bridge: Math.max(1, RIVER_BRIDGE_M / g) });
    if (!lines.length) { toast('Nenhum rio pintado com mais de ' + RIVER_MIN_M + ' m para converter.'); return; }
    if (!confirm(`Converter ${lines.length} rio(s) pintado(s) em rios editáveis? A camada Rios pintada fica vazia (as manchinhas somem junto). Ctrl+Z desfaz.`)) return;
    snapshot(['vrivers', 'rivers']);
    for (const ln of lines) {
      const w = (k) => Math.max(2, 2 * ln.pts[k].r * g);
      S.vrivers.push(riverFromPath(ln.pts, w(0), w(ln.pts.length - 1)));
    }
    S.masks.rivers.fill(0);
    drawOverlay(); changed();
    toast(`${lines.length} rio(s) convertido(s). Agora dá para arrastar os pontos de cada um.`);
  }
  // apaga da camada Rios pintada os pedaços soltos menores que o comprimento mínimo de rio
  function cleanSpecks() {
    const W = S.W, N = W * W, m = S.masks.rivers, lab = new Int32Array(N).fill(-1), minPx = RIVER_MIN_M / mPerCell();
    let removed = 0;
    const kill = [];
    for (let s0 = 0; s0 < N; s0++) {
      if (m[s0] <= 0.25 || lab[s0] >= 0) continue;
      const cells = [s0]; lab[s0] = s0;
      let x0 = W, x1 = 0, y0 = W, y1 = 0;
      for (let k = 0; k < cells.length; k++) {
        const c = cells[k], x = c % W, y = (c / W) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue;
          const n = ny * W + nx;
          if (m[n] > 0.25 && lab[n] < 0) { lab[n] = s0; cells.push(n); }
        }
      }
      if (Math.hypot(x1 - x0, y1 - y0) < minPx) { kill.push(cells); removed++; }
    }
    if (!removed) { toast('Nenhuma manchinha: todos os pedaços da camada Rios têm mais de ' + RIVER_MIN_M + ' m.'); return; }
    snapshot(['rivers']);
    // apaga também a borda suave em volta de cada pedaço
    for (const cells of kill) for (const c of cells) {
      const x = c % W, y = (c / W) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < W) m[ny * W + nx] = 0; }
    }
    afterMaskChange('rivers');
    toast(`${removed} manchinha(s) apagada(s) da camada Rios. Ctrl+Z desfaz.`);
  }

  // ---------------- painel (lista) ----------------
  function buildList() {
    const el = document.getElementById('featList');
    if (!el) return;
    const sel = S.featSel;
    const row = (kind, f, ico, info) => `<div class="ft-row${sel && sel.kind === kind && sel.id === f.id ? ' active' : ''}" data-k="${kind}" data-id="${f.id}">
      <span class="ft-ico">${ico}</span><input type="text" value="${escapeHtml(f.name)}" title="Nome"><span class="ft-info">${info}</span><button title="Apagar">×</button></div>`;
    const rv = S.vrivers.map((r) => row('river', r, '〰', `${fmt(riverLengthM(r) / 1000, 2)} km · ${fmt(r.w0, 0)}→${fmt(r.w1, 0)} m`));
    const rd = S.roads.map((r) => row('road', r, r.kind === 'trilha' ? '┄' : '━', `${(ROAD_KINDS[r.kind] || ROAD_KINDS.estrada).name} · ${fmt(roadLengthM(r) / 1000, 2)} km · ${fmt(r.width, 1)} m`));
    el.innerHTML = (rv.length ? '<h4>Rios</h4>' + rv.join('') : '') + (rd.length ? '<h4>Estradas e trilhas</h4>' + rd.join('') : '') ||
      '<p class="hint">Nenhum rio ou estrada ainda. Use as ferramentas Rio (V) e Estrada (T).</p>';
    el.querySelectorAll('.ft-row').forEach((r) => {
      const kind = r.dataset.k, f = (kind === 'river' ? S.vrivers : S.roads).find((x) => x.id === +r.dataset.id);
      r.onclick = (e) => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return; setTool(kind); select(kind, f.id); };
      r.querySelector('input').onchange = (e) => { snapshot([kind === 'river' ? 'vrivers' : 'roads']); f.name = e.target.value.trim() || f.name; changed(false); };
      r.querySelector('button').onclick = () => { select(kind, f.id); deleteSelected(); };
    });
  }

  // ---------------- opções da ferramenta (barra de opções) ----------------
  function syncOptions() {
    const f = selected(), s = S.featSel;
    const rw0 = document.getElementById('riverW0'), rw1 = document.getElementById('riverW1');
    if (rw0) {
      const r = s && s.kind === 'river' ? f : null;
      rw0.value = r ? r.w0 : S.riverDef.w0; rw1.value = r ? r.w1 : S.riverDef.w1;
    }
    const rk = document.getElementById('roadKind'), rwd = document.getElementById('roadWidth');
    if (rk) {
      const r = s && s.kind === 'road' ? f : null;
      rk.value = r ? r.kind : S.roadDef.kind; rwd.value = r ? r.width : S.roadDef.width;
    }
  }
  function bindOptions() {
    const num = (id, fn) => { const el = document.getElementById(id); el.onchange = () => { const v = +el.value; if (isFinite(v) && v > 0) fn(v); else syncOptions(); }; };
    num('riverW0', (v) => { const f = selected(); if (f && S.featSel.kind === 'river') { snapshot(['vrivers']); f.w0 = v; changed(); } else S.riverDef.w0 = v; });
    num('riverW1', (v) => { const f = selected(); if (f && S.featSel.kind === 'river') { snapshot(['vrivers']); f.w1 = v; changed(); } else S.riverDef.w1 = v; });
    num('roadWidth', (v) => { const f = selected(); if (f && S.featSel.kind === 'road') { snapshot(['roads']); f.width = v; changed(); } else S.roadDef.width = v; });
    document.getElementById('roadKind').onchange = async (e) => {
      const kind = e.target.value, f = selected();
      S.roadDef.kind = kind; S.roadDef.width = ROAD_KINDS[kind].width;
      if (f && S.featSel.kind === 'road') {
        // trocar o tipo muda a rampa máxima: a rota é refeita
        snapshot(['roads']);
        f.kind = kind; f.width = ROAD_KINDS[kind].width;
        try { await flushCompose(); for (let i = 0; i < f.anchors.length - 1; i++) { const seg = await routeSeg(f.anchors[i], f.anchors[i + 1], kind); if (seg) f.segs[i] = seg; } } catch (err) { showError(err); }
        changed();
      }
      syncOptions();
    };
    document.getElementById('btnRiverConvert').onclick = convertPainted;
    document.getElementById('btnRiverClean').onclick = cleanSpecks;
  }

  // ---------------- teclado ----------------
  function key(e) {
    if (e.key === 'Enter' && S.roadDraft) { finishDraft(); return true; }
    if (e.key === 'Escape') return cancel();
    if ((e.key === 'Delete' || e.key === 'Backspace') && (S.tool === 'river' || S.tool === 'road') && S.featSel) { e.preventDefault(); return deleteSelected(); }
    return false;
  }

  // ---------------- arquivo ----------------
  function serialize() { return { vrivers: S.vrivers, roads: S.roads, featSeq: S.featSeq }; }
  function load(h) {
    S.vrivers = Array.isArray(h.vrivers) ? h.vrivers : [];
    S.roads = Array.isArray(h.roads) ? h.roads : [];
    S.featSeq = h.featSeq || S.vrivers.length + S.roads.length;
    S.featSel = null; S.riverA = null; S.roadDraft = null;
    buildList(); render();
  }

  return {
    ROAD_KINDS, curve, riverSamples, riverRaster, riverGrid, roadGrid, roadsForEngine, combinedRivers, riverLengthM, roadLengthM, mPerCell,
    render, down, move, up, key, cancel, select, selected, buildList, syncOptions, bindOptions, serialize, load, deleteSelected, finishDraft,
    convertPainted, cleanSpecks
  };
})();
