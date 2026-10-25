/* Forja de Mundos — traçado dos rios para a engine.
   A camada Rios é uma máscara pintada; aqui ela vira linhas (o eixo de cada rio), para a engine criar
   rios de água de verdade (no Unreal: Water Body River por spline). Passos: afina a máscara até 1 ponto de
   largura (Zhang-Suen), quebra o esqueleto em trechos entre pontas e encontros, apara os galhinhos que o
   afinamento cria, emenda os trechos que seguem na mesma direção num encontro (o rio principal continua,
   o afluente termina nele), descarta trechos curtos (manchas de pintura) e anéis (contorno de lago),
   orienta cada rio da nascente (mais alta) para a foz e corta o que entra no mar.
   Tudo em coordenadas da grade de trabalho (0..W-1); quem chama converte para cm. */
'use strict';

const Rivers = {
  /**
   * @param {Float32Array} mask camada Rios (0..1), W×W
   * @param {Float32Array} H alturas em metros, W×W (mar < 0)
   * @param {number} W lado da grade
   * @param {{minLen:number, step:number, bridge:number}} opt em células: minLen = comprimento mínimo,
   *   step = espaço entre pontos, bridge = falha da pintura que ainda conta como o mesmo rio
   * @returns {{pts:{x:number,y:number,r:number}[], mouth:boolean}[]} r = meia largura da pintura, em células
   */
  extract(mask, H, W, opt) {
    const N = W * W, B = new Uint8Array(N);
    // mesmo limiar em que o terreno já cava o leito (pintura fraca também abre canal)
    for (let i = 0; i < N; i++) B[i] = mask[i] > 0.25 ? 1 : 0;
    // a borda do mapa fica fora (o afinamento olha os 8 vizinhos)
    for (let k = 0; k < W; k++) B[k] = B[N - W + k] = B[k * W] = B[k * W + W - 1] = 0;
    const D = this.distance(B, W);
    const S = this.thin(this.dilate(B, W, opt.bridge || 0), W);
    const graph = this.trace(S, W);
    this.pruneSpurs(graph, Math.max(3, opt.minLen * 0.25));
    const chains = this.chains(graph);
    const out = [];
    for (let c of chains) {
      if (this.length(c) < opt.minLen) continue;
      const hAt = (p) => H[p.y * W + p.x];
      const avg = (a) => a.reduce((s, p) => s + hAt(p), 0) / a.length;
      const k = Math.min(8, c.length >> 2 || 1);
      if (avg(c.slice(0, k)) < avg(c.slice(-k))) c = c.slice().reverse();
      // foz no mar: segue só até um pouco depois de entrar na água
      let mouth = false, cut = c.length;
      for (let i = 1; i < c.length; i++) if (hAt(c[i]) < 0) { mouth = true; cut = Math.min(c.length, i + 3); break; }
      c = c.slice(0, cut);
      if (this.length(c) < opt.minLen) continue;
      const line = this.smooth(c, 3);
      if (this.length(line) < opt.minLen) continue;
      const pts = this.resample(line, opt.step).map((p) => {
        const i = Math.round(p.y) * W + Math.round(p.x);
        return { x: p.x, y: p.y, r: Math.max(0.5, D[i] || 0.5) };
      });
      // largura suave ao longo do rio (a pintura varia de ponto a ponto)
      const r = pts.map((p, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - 2); j <= Math.min(pts.length - 1, i + 2); j++) { s += pts[j].r; n++; } return s / n; });
      pts.forEach((p, i) => { p.r = r[i]; });
      if (pts.length >= 2) out.push({ pts, mouth });
    }
    return out;
  },

  // distância (chanfro 3-4) de cada ponto pintado até o ponto não pintado mais perto, em células
  distance(B, W) {
    const N = W * W, D = new Float32Array(N), INF = 1e9;
    for (let i = 0; i < N; i++) D[i] = B[i] ? INF : 0;
    for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!D[i]) continue;
      D[i] = Math.min(D[i], D[i - 1] + 3, D[i - W] + 3, D[i - W - 1] + 4, D[i - W + 1] + 4);
    }
    for (let y = W - 2; y > 0; y--) for (let x = W - 2; x > 0; x--) {
      const i = y * W + x;
      if (!D[i]) continue;
      D[i] = Math.min(D[i], D[i + 1] + 3, D[i + W] + 3, D[i + W + 1] + 4, D[i + W - 1] + 4);
    }
    for (let i = 0; i < N; i++) D[i] /= 3;
    return D;
  },

  // engorda a pintura em r células (disco): falhas menores que 2r se fecham antes do afinamento
  dilate(B, W, r) {
    if (r <= 0) return B;
    const out = new Uint8Array(B.length), R = Math.ceil(r);
    for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!B[y * W + x]) continue;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const nx = x + dx, ny = y + dy;
        if (dx * dx + dy * dy <= r * r && nx > 0 && ny > 0 && nx < W - 1 && ny < W - 1) out[ny * W + nx] = 1;
      }
    }
    return out;
  },

  // afinamento Zhang-Suen: o desenho vira uma linha de 1 ponto de largura no meio da pintura
  thin(B, W) {
    const S = B.slice(), del = [];
    const nb = (i) => [S[i - W], S[i - W + 1], S[i + 1], S[i + W + 1], S[i + W], S[i + W - 1], S[i - 1], S[i - W - 1]];
    for (let changed = true; changed;) {
      changed = false;
      for (let pass = 0; pass < 2; pass++) {
        del.length = 0;
        for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          if (!S[i]) continue;
          const p = nb(i);
          let b = 0, a = 0;
          for (let k = 0; k < 8; k++) { b += p[k]; if (!p[k] && p[(k + 1) & 7]) a++; }
          if (b < 2 || b > 6 || a !== 1) continue;
          if (pass === 0 ? (p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) : (p[0] * p[2] * p[6] || p[0] * p[4] * p[6])) continue;
          del.push(i);
        }
        for (const i of del) S[i] = 0;
        if (del.length) changed = true;
      }
    }
    return S;
  },

  // esqueleto → grafo: nós = pontas e encontros (pontos de encontro vizinhos viram um nó só);
  // arestas = trechos entre dois nós, como lista de pontos
  trace(S, W) {
    const N = W * W, OFF = [-W, -W + 1, 1, W + 1, W, W - 1, -1, -W - 1];
    const deg = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (S[i]) for (const o of OFF) if (S[i + o]) deg[i]++;
    const node = new Int32Array(N).fill(-1), nodes = [];
    for (let i = 0; i < N; i++) {
      if (!S[i] || deg[i] === 2 || node[i] >= 0) continue;
      const id = nodes.length, st = [i], px = [];
      node[i] = id;
      while (st.length) { // junta pontos de encontro encostados
        const c = st.pop(); px.push(c);
        if (deg[c] < 3) continue;
        for (const o of OFF) { const n = c + o; if (S[n] && deg[n] >= 3 && node[n] < 0) { node[n] = id; st.push(n); } }
      }
      let sx = 0, sy = 0;
      for (const c of px) { sx += c % W; sy += (c / W) | 0; }
      nodes.push({ id, x: sx / px.length, y: sy / px.length, px, edges: [] });
    }
    const seen = new Uint8Array(N), edges = [];
    const P = (i) => ({ x: i % W, y: (i / W) | 0 });
    for (const nd of nodes) for (const start of nd.px) for (const o of OFF) {
      let cur = start + o;
      if (!S[cur] || node[cur] === nd.id || seen[cur]) continue;
      const pts = [P(start)];
      let prev = start, end = -1;
      for (;;) {
        if (node[cur] >= 0) { end = node[cur]; pts.push(P(cur)); break; }
        seen[cur] = 1; pts.push(P(cur));
        let next = -1;
        for (const o2 of OFF) { const n = cur + o2; if (n !== prev && S[n] && !seen[n] && (node[n] < 0 || node[n] !== nd.id || pts.length > 2)) { next = n; if (node[n] >= 0) break; } }
        if (next < 0) break;
        prev = cur; cur = next;
      }
      if (end < 0) continue;
      // trecho que volta ao mesmo nó com poucos pontos = laço do afinamento, não é rio
      if (end === nd.id && pts.length < 6) continue;
      const e = { id: edges.length, a: nd.id, b: end, pts, dead: false };
      edges.push(e); nd.edges.push(e); if (end !== nd.id) nodes[end].edges.push(e);
    }
    // anéis sem nenhum nó (contorno de lago) ficam fora: seen não marcado, ninguém começa neles
    return { nodes, edges };
  },

  // tira galhinhos curtos (ponta solta ligada a um encontro), que o afinamento cria nas curvas e bordas
  pruneSpurs(g, maxLen) {
    for (let again = true; again;) {
      again = false;
      for (const e of g.edges) {
        if (e.dead || e.a === e.b) continue;
        const da = this.alive(g.nodes[e.a]), db = this.alive(g.nodes[e.b]);
        const spur = (da === 1 && db >= 3) || (db === 1 && da >= 3);
        if (spur && this.length(e.pts) < maxLen) { e.dead = true; again = true; }
      }
    }
  },
  alive(n) { return n.edges.filter((e) => !e.dead).length; },

  // emenda os trechos em rios: em cada encontro, os dois trechos mais alinhados seguem juntos
  // (o rio principal), os outros terminam ali (afluentes, com a ponta no encontro)
  chains(g) {
    const link = new Map(); // `${edgeId}:${nodeId}` → aresta que continua por aquele nó
    const dirFrom = (e, nid) => {
      const p = e.a === nid ? e.pts : e.pts.slice().reverse(), k = Math.min(p.length - 1, 6);
      const dx = p[k].x - p[0].x, dy = p[k].y - p[0].y, l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    };
    for (const n of g.nodes) {
      const es = n.edges.filter((e) => !e.dead && e.a !== e.b);
      if (es.length < 2) continue;
      const pairs = [];
      for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
        const a = dirFrom(es[i], n.id), b = dirFrom(es[j], n.id);
        pairs.push({ i, j, dot: a.x * b.x + a.y * b.y });
      }
      pairs.sort((p, q) => p.dot - q.dot);
      const used = new Set();
      for (const p of pairs) {
        if (p.dot > -0.3 && es.length > 2) break; // num encontro de 3+, só emenda o que segue reto
        if (used.has(p.i) || used.has(p.j)) continue;
        used.add(p.i); used.add(p.j);
        link.set(es[p.i].id + ':' + n.id, es[p.j]); link.set(es[p.j].id + ':' + n.id, es[p.i]);
      }
    }
    // percorre (aresta, nó de entrada): sai pelo outro nó e segue pela aresta emendada ali
    const other = (e, nid) => (e.a === nid ? e.b : e.a);
    const oriented = (e, enter) => (e.a === enter ? e.pts : e.pts.slice().reverse());
    const done = new Set(), out = [];
    for (const e0 of g.edges) {
      if (e0.dead || done.has(e0.id) || e0.a === e0.b) continue;
      // volta até o começo da corrente (ou até dar a volta, se ela fechar em anel)
      let e = e0, enter = e0.a;
      for (let guard = 0; guard <= g.edges.length; guard++) {
        const prev = link.get(e.id + ':' + enter);
        if (!prev || prev === e0) break;
        enter = other(prev, enter); e = prev;
      }
      let pts = [], cur = e, guard = 0;
      while (cur && !done.has(cur.id) && guard++ <= g.edges.length) {
        done.add(cur.id);
        const seg = oriented(cur, enter);
        pts = pts.length ? pts.concat(seg.slice(1)) : seg.slice();
        const exit = cur.a === enter ? cur.b : cur.a;
        const nxt = link.get(cur.id + ':' + exit);
        enter = exit; cur = nxt;
      }
      if (pts.length >= 2) out.push(pts);
    }
    return out;
  },

  length(pts) {
    let l = 0;
    for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return l;
  },

  // média móvel: tira a escadinha dos pixels (as pontas ficam no lugar)
  smooth(pts, r) {
    return pts.map((p, i) => {
      if (i === 0 || i === pts.length - 1) return { x: p.x, y: p.y };
      let sx = 0, sy = 0, n = 0;
      for (let k = Math.max(0, i - r); k <= Math.min(pts.length - 1, i + r); k++) { sx += pts[k].x; sy += pts[k].y; n++; }
      return { x: sx / n, y: sy / n };
    });
  },

  // pontos a cada "step" células ao longo da linha (sempre com a primeira e a última ponta)
  resample(pts, step) {
    const total = this.length(pts), n = Math.max(1, Math.round(total / step)), out = [{ ...pts[0] }];
    let seg = 0, segStart = 0;
    for (let k = 1; k < n; k++) {
      const t = (k * total) / n;
      while (seg < pts.length - 2) {
        const l = Math.hypot(pts[seg + 1].x - pts[seg].x, pts[seg + 1].y - pts[seg].y);
        if (segStart + l >= t) break;
        segStart += l; seg++;
      }
      const a = pts[seg], b = pts[seg + 1], l = Math.hypot(b.x - a.x, b.y - a.y) || 1, f = Math.min(1, (t - segStart) / l);
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    }
    out.push({ ...pts[pts.length - 1] });
    return out;
  }
};
