/* Forja de Mundos — Modo Atlas: vários continentes num mundo só.
   O atlas é um tabuleiro N×N de quadrados do mesmo tamanho (o tamanho de mundo de um continente). Cada continente
   é um projeto .forja normal guardado no seu quadrado; clicar abre no editor de sempre. Quadrado vazio = mar.
   Na exportação os continentes são juntados num terreno só (cada um no seu lugar, com as bordas descendo até o
   fundo do mar, então não há degrau entre eles) e esse terreno passa pela exportação normal, numa resolução total
   que o Unreal aceita, em pedaços para World Partition. Sai também o mapa-múndi com todos os continentes.
   Usa as globais do app.js (S, serializeProject, deserializeProject, renderGameMap…) só depois que ele carrega. */
'use strict';

const Atlas = (() => {
  const THUMB = 256, MAX_N = 6, EDGE = 0.04; // EDGE = faixa (fração do quadrado) em que a borda desce até o fundo
  let moving = null, busy = false;
  const A = () => S.atlas;
  const byId = (id) => A().cells.find((c) => c.id === id);
  const cellAt = (cx, cy) => A().cells.find((c) => c.cx === cx && c.cy === cy);
  const host = () => document.getElementById('atlasView');
  const km = (m) => fmt(m / 1000, 1) + ' km';

  async function persist() { try { await idbSet('atlas', A()); } catch (e) { /* sem IndexedDB: vale o arquivo .forjaatlas */ } }

  // Guarda o continente aberto no editor dentro do seu quadrado (projeto, miniatura e faixa de altura).
  async function storeActive() {
    const a = A();
    if (!a || a.activeId == null) return;
    const c = byId(a.activeId);
    if (!c) return;
    if (S.H) await flushCompose();
    c.blob = await serializeProject();
    c.name = S.ex.name; c.W = S.W;
    if (S.H && S.stats) { c.thumb = renderGameMap(THUMB, false).toDataURL('image/png'); c.mn = S.stats.min; c.mx = S.stats.max; }
    await persist();
  }
  // o salvamento automático do editor também atualiza o quadrado do continente aberto
  async function onAutosave(blob) {
    const a = A();
    if (!a || a.activeId == null) return;
    const c = byId(a.activeId);
    if (c) { c.blob = blob; c.name = S.ex.name; await persist(); }
  }
  async function restore() {
    try { const a = await idbGet('atlas'); if (a && a.cells) S.atlas = a; } catch (e) { /* segue sem atlas */ }
    crumb();
  }
  function crumb() {
    const el = document.getElementById('atlasCrumb');
    if (!el) return;
    const a = A();
    el.hidden = !a;
    if (a) el.textContent = `${I18N.tr('Atlas')}: ${a.name}${a.activeId != null && byId(a.activeId) ? ' › ' + S.ex.name : ''}`;
  }

  // ---------------- tela do atlas ----------------
  async function show() {
    if (A()) { busy = true; try { await storeActive(); } finally { busy = false; } }
    render();
  }
  function render() {
    const el = host();
    if (!el) return;
    crumb();
    const a = A();
    if (!a) {
      el.innerHTML = `<div class="at-intro"><h2>Modo Atlas</h2>
        <p>Junte vários continentes num mundo só. O atlas é um tabuleiro de quadrados do mesmo tamanho; cada continente é um projeto
          normal, editado aqui do jeito de sempre. Os quadrados vazios viram mar e as bordas de cada continente descem sozinhas até o fundo,
          então tudo se encaixa. Na exportação sai um terreno único em pedaços para o Unreal e um mapa-múndi com todos.</p>
        <p class="hint">O mundo aberto agora vira o primeiro continente, no meio de um tabuleiro 3 × 3. O tamanho de cada quadrado é o
          tamanho deste mundo (${km(worldM())}).</p>
        <div class="btnrow"><button id="atCreate" class="accent">Criar atlas com o mundo atual</button>
          <button id="atOpen">Abrir atlas (.forjaatlas)…</button></div></div>`;
      el.querySelector('#atCreate').onclick = create;
      el.querySelector('#atOpen').onclick = openFile;
      return;
    }
    const n = a.n, canShrink = n > 1 && !a.cells.some((c) => c.cx >= n - 1 || c.cy >= n - 1);
    el.innerHTML = `<div class="at-bar">
        <label>Nome <input type="text" id="atName" value="${escapeHtml(a.name)}"></label>
        <span class="at-size">Tabuleiro <button class="small" id="atMinus" ${canShrink ? '' : 'disabled'} title="Tira a última coluna e a última linha (precisam estar vazias)">−</button>
          <b>${n} × ${n}</b><button class="small" id="atPlus" ${n >= MAX_N ? 'disabled' : ''} title="Acrescenta uma coluna à direita e uma linha embaixo">+</button></span>
        <span class="hint">Quadrado ${km(a.cellM)} · mundo ${km(a.cellM * n)} × ${km(a.cellM * n)}</span>
        <label title="Altura do fundo do mar nos quadrados vazios e nas bordas dos continentes.">Fundo do mar (m) <input type="number" id="atFloor" class="num-s" value="${a.floor}" step="5" max="-1"></label>
        <span class="grow"></span>
        <button id="atSave" class="small">Salvar atlas</button><button id="atOpen2" class="small">Abrir atlas…</button>
        <button id="atExit" class="small" title="Desliga o atlas. O continente aberto continua no editor.">Sair do atlas</button>
        <button id="atExport" class="accent">Exportar atlas para o Unreal</button>
      </div>
      ${moving != null ? `<div class="at-hint">Clique num quadrado vazio para levar <b>${escapeHtml(byId(moving).name)}</b> · <a href="#" id="atCancelMove">cancelar</a></div>` : ''}
      <div class="at-grid" style="--n:${n}"></div>`;
    const grid = el.querySelector('.at-grid');
    for (let cy = 0; cy < n; cy++) for (let cx = 0; cx < n; cx++) {
      const c = cellAt(cx, cy), d = document.createElement('div');
      d.className = 'at-cell' + (c ? ' full' : '') + (c && c.id === a.activeId ? ' active' : '');
      if (c) {
        d.innerHTML = `${c.thumb ? `<img src="${c.thumb}" alt="">` : '<div class="at-empty">…</div>'}
          <div class="at-name">${escapeHtml(c.name)}${c.id === a.activeId ? ' <small>(aberto)</small>' : ''}</div>
          <div class="at-acts"><button class="small accent" data-a="open">Editar</button><button class="small" data-a="move">Mover</button>
            <button class="small" data-a="dl" title="Baixar só este continente (.forja)">.forja</button><button class="small" data-a="rm" title="Tirar do atlas">×</button></div>`;
        d.querySelectorAll('button').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); act(b.dataset.a, c); }; });
      } else {
        d.innerHTML = moving != null ? '<div class="at-empty">Levar para cá</div>'
          : `<div class="at-empty"><span>Mar</span><div class="at-acts"><button class="small" data-a="new">+ Novo continente</button><button class="small" data-a="imp">Importar .forja</button></div></div>`;
        d.querySelectorAll('button').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); b.dataset.a === 'new' ? newAt(cx, cy) : importAt(cx, cy); }; });
        if (moving != null) d.onclick = () => { const m = byId(moving); m.cx = cx; m.cy = cy; moving = null; persist(); render(); };
      }
      grid.appendChild(d);
    }
    el.querySelector('#atName').onchange = (e) => { a.name = e.target.value.trim() || a.name; persist(); crumb(); };
    el.querySelector('#atFloor').onchange = (e) => { const v = +e.target.value; if (isFinite(v) && v < 0) a.floor = v; persist(); render(); };
    el.querySelector('#atPlus').onclick = () => { a.n = Math.min(MAX_N, n + 1); persist(); render(); };
    el.querySelector('#atMinus').onclick = () => { if (canShrink) { a.n = n - 1; persist(); render(); } };
    el.querySelector('#atSave').onclick = saveFile;
    el.querySelector('#atOpen2').onclick = openFile;
    el.querySelector('#atExit').onclick = exit;
    el.querySelector('#atExport').onclick = exportAtlas;
    const cm = el.querySelector('#atCancelMove');
    if (cm) cm.onclick = (e) => { e.preventDefault(); moving = null; render(); };
  }

  // ---------------- ações ----------------
  function guard() { if (busy) { toast('Espere terminar o que está em andamento.'); return false; } return true; }
  async function create() {
    if (!S.H) return;
    S.atlas = { name: S.ex.name, n: 3, cellM: worldM(), res: S.ex.res, mpq: S.ex.mpq, floor: -Math.round(S.P.oceanDepth * 0.8), cells: [], activeId: null, seq: 0 };
    const id = ++S.atlas.seq;
    S.atlas.cells.push({ id, name: S.ex.name, cx: 1, cy: 1 });
    S.atlas.activeId = id;
    await storeActive();
    render();
    toast('Atlas criado. Clique em "+ Novo continente" num quadrado de mar, ou importe um .forja.');
  }
  // Mesmo tamanho de quadrado para todos: res e metros por vértice do atlas.
  function fitToAtlas() { S.ex.res = A().res; S.ex.mpq = A().mpq; buildExportPanel(); updateWorldSize(); }
  async function newAt(cx, cy) {
    if (!guard()) return;
    busy = true;
    try {
      await storeActive();
      const a = A(), id = ++a.seq;
      fitToAtlas();
      await newProject(false);
      S.ex.name = `${I18N.tr('Continente')} ${id}`;
      a.cells.push({ id, name: S.ex.name, cx, cy });
      a.activeId = id;
      await flushCompose();
      await storeActive();
      buildExportPanel();
    } catch (err) { showError(err); } finally { busy = false; }
    setMode('2d');
    toast(`${S.ex.name} criado no atlas. Edite à vontade; volte pela aba Atlas.`);
  }
  function importAt(cx, cy) {
    if (!guard()) return;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.forja';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      busy = true;
      const a = A(), prev = a.activeId;
      try {
        await storeActive();
        await deserializeProject(f);
        if (Math.abs(worldM() - a.cellM) > 1) {
          if (!confirm(`Este continente tem ${km(worldM())} e cada quadrado do atlas tem ${km(a.cellM)}.\nAjustar para o tamanho do atlas? (o desenho estica ou encolhe junto)`)) {
            if (prev != null) await deserializeProject(byId(prev).blob);
            return;
          }
          fitToAtlas();
          scheduleCompose(0);
        }
        const id = ++a.seq;
        a.cells.push({ id, name: S.ex.name, cx, cy });
        a.activeId = id;
        await flushCompose();
        await storeActive();
        toast(`${S.ex.name} entrou no atlas.`);
      } catch (err) { showError(err); } finally { busy = false; render(); }
    };
    inp.click();
  }
  async function openCell(c, goEdit = true) {
    busy = true;
    try {
      await storeActive();
      await deserializeProject(c.blob);
      A().activeId = c.id;
      await persist();
    } catch (err) { showError(err); } finally { busy = false; }
    if (goEdit) setMode('2d'); else render();
  }
  async function act(kind, c) {
    if (!guard()) return;
    const a = A();
    if (kind === 'open') { if (c.id === a.activeId) setMode('2d'); else await openCell(c); }
    else if (kind === 'move') { moving = c.id; render(); }
    else if (kind === 'dl') { if (c.id === a.activeId) await storeActive(); download(c.blob, fileSafe(c.name) + '.forja'); }
    else if (kind === 'rm') {
      if (a.cells.length === 1) { toast('O atlas precisa de pelo menos um continente. Para desligar, use "Sair do atlas".', true); return; }
      if (!confirm(`Tirar "${c.name}" do atlas? Baixe o .forja antes se quiser guardar. Isso não tem desfazer.`)) return;
      a.cells = a.cells.filter((x) => x !== c);
      if (c.id === a.activeId) { a.activeId = null; await openCell(a.cells[0], false); }
      await persist(); render();
    }
  }
  async function exit() {
    if (!confirm('Sair do atlas? O continente aberto continua no editor; os outros só ficam no arquivo do atlas (salve antes).')) return;
    S.atlas = null; moving = null;
    try { const db = await idbOpen(); await new Promise((res) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete('atlas'); tx.oncomplete = res; tx.onerror = res; }); db.close(); } catch (e) { /* ok */ }
    render();
  }

  // ---------------- arquivo .forjaatlas: "FATL" + tamanho do índice + índice JSON + projetos .forja em sequência ----------------
  async function saveFile() {
    if (!guard()) return;
    busy = true;
    try {
      await storeActive();
      const a = A(), blobs = [], cells = [];
      let off = 0;
      for (const c of a.cells) { const { blob, ...rest } = c; cells.push({ ...rest, offset: off, size: blob.size }); blobs.push(blob); off += blob.size; }
      const idx = new TextEncoder().encode(JSON.stringify({ format: 'forja-atlas', version: 1, ...a, cells }));
      const head = new Uint8Array(8);
      head.set([70, 65, 84, 76]); new DataView(head.buffer).setUint32(4, idx.length, true);
      download(new Blob([head, idx, ...blobs]), fileSafe(a.name) + '.forjaatlas');
      toast('Atlas salvo (.forjaatlas): todos os continentes num arquivo só.');
    } catch (err) { showError(err); } finally { busy = false; }
  }
  function openFile() {
    if (!guard()) return;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.forjaatlas';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      busy = true;
      try {
        const buf = new Uint8Array(await f.arrayBuffer());
        if (String.fromCharCode(...buf.subarray(0, 4)) !== 'FATL') throw new Error('Este arquivo não é um atlas da Forja de Mundos.');
        const len = new DataView(buf.buffer).getUint32(4, true), idx = JSON.parse(new TextDecoder().decode(buf.subarray(8, 8 + len)));
        const start = 8 + len;
        idx.cells = idx.cells.map(({ offset, size, ...c }) => ({ ...c, blob: new Blob([buf.subarray(start + offset, start + offset + size)]) }));
        delete idx.format; delete idx.version;
        S.atlas = idx;
        const open = byId(idx.activeId) || idx.cells[0];
        S.atlas.activeId = null;
        if (open) { await deserializeProject(open.blob); S.atlas.activeId = open.id; }
        await persist();
        toast(`Atlas "${idx.name}" aberto: ${idx.cells.length} continente(s).`);
      } catch (err) { showError(err); } finally { busy = false; render(); }
    };
    inp.click();
  }

  // ---------------- exportação ----------------
  // Resolução total válida (lista do UE) cujo espaçamento fica mais perto do metros-por-vértice dos continentes.
  function pickRes(totalM, mpq) {
    let best = null;
    for (const r of UE.RESOLUTIONS) {
      if (r.res < 1009) continue;
      const m = totalM / (r.res - 1), score = Math.abs(Math.log(m / mpq));
      if (!best || score < best.score) best = { res: r.res, mpq: m, score };
    }
    return best;
  }
  async function exportAtlas() {
    if (!guard()) return;
    const a = A();
    if (!a.cells.length) return;
    const n = a.n, totalM = n * a.cellM, pick = pickRes(totalM, a.mpq), res = pick.res, mpq = +pick.mpq.toFixed(4), tiles = UE.tilesFor(res);
    if (!confirm(`Exportar o atlas inteiro: ${n} × ${n} quadrados, ${km(totalM)} × ${km(totalM)}.\nTerreno único de ${res} × ${res} (${fmt(mpq, 2)} m entre vértices)${tiles > 1 ? `, em ${tiles * tiles} pedaços para World Partition` : ''}.\nCada continente é aberto e calculado de novo: pode levar alguns minutos. Continuar?`)) return;
    busy = true;
    const keep = a.activeId, base = fileSafe(a.name);
    try {
      await storeActive();
      // terreno de trabalho do atlas: cada quadrado com Wc pontos (limite de memória ~6000² no total)
      const Wc = Math.max(256, Math.min(Math.max(...a.cells.map((c) => c.W || 1024)), Math.floor(6144 / n)));
      const WG = n * Wc, G = new Float32Array(WG * WG).fill(a.floor);
      const mapPx = Math.max(256, Math.min(1024, Math.floor(4096 / n))), clean = document.createElement('canvas');
      clean.width = clean.height = mapPx * n;
      const cctx = clean.getContext('2d');
      cctx.fillStyle = 'rgb(' + MAPC.deep.join(',') + ')'; cctx.fillRect(0, 0, clean.width, clean.height);
      const labels = [];
      for (let k = 0; k < a.cells.length; k++) {
        const c = a.cells[k];
        setTask(`Atlas: calculando ${c.name} (${k + 1} de ${a.cells.length})…`, k / a.cells.length);
        await deserializeProject(c.blob);
        await flushCompose();
        if (S.ex.erode && !S.eroded) applyHeight(await call('erode', { P: S.P, mode: S.display }));
        const W = S.W, m = Math.max(4, Wc * EDGE), s = (W - 1) / (Wc - 1);
        for (let y = 0; y < Wc; y++) {
          const row = (c.cy * Wc + y) * WG + c.cx * Wc;
          for (let x = 0; x < Wc; x++) {
            const d = Math.min(x, y, Wc - 1 - x, Wc - 1 - y), t = smooth01(d / m);
            G[row + x] = a.floor + (bilinear(S.H, W, x * s, y * s) - a.floor) * t; // borda desce até o fundo do mar
          }
        }
        cctx.drawImage(renderGameMap(mapPx, false, { n: 1, tx: 0, ty: 0 }), c.cx * mapPx, c.cy * mapPx); // sem moldura: os quadrados se encostam
        labels.push({ name: c.name, x: (c.cx + 0.5) * mapPx, y: (c.cy + 0.5) * mapPx });
      }
      // mapa-múndi: versão limpa (minimapa) e com os nomes dos continentes
      const named = document.createElement('canvas');
      named.width = named.height = clean.width;
      const nctx = named.getContext('2d'), u = mapPx / 512;
      cctx.strokeStyle = 'rgb(' + MAPC.coast.join(',') + ')'; cctx.lineWidth = Math.max(2, 4 * mapPx / 1024); cctx.strokeRect(0, 0, clean.width, clean.height);
      nctx.drawImage(clean, 0, 0);
      nctx.font = `bold ${Math.round(26 * u)}px Georgia, "Times New Roman", serif`; nctx.textAlign = 'center'; nctx.textBaseline = 'middle';
      nctx.lineWidth = 5 * u; nctx.strokeStyle = 'rgba(240,230,200,.9)'; nctx.fillStyle = 'rgba(80,30,20,.9)';
      for (const l of labels) { nctx.strokeText(l.name.toUpperCase(), l.x, l.y); nctx.fillText(l.name.toUpperCase(), l.x, l.y); }
      // volta para o continente que estava aberto (o motor fica com ele)
      const back = byId(keep) || a.cells[0];
      await deserializeProject(back.blob);
      a.activeId = back.id;
      await flushCompose();
      const extraFiles = [
        { name: 'mapa/' + base + '_mapa_mundi.png', blob: await canvasBlob(named) },
        { name: 'mapa/' + base + '_mapa_mundi_limpo.png', blob: await canvasBlob(clean) },
        { name: base + '_atlas.json', blob: new Blob([JSON.stringify({ atlas: a.name, quadrados: n, tamanhoDoQuadrado_m: a.cellM, fundoDoMar_m: a.floor, unidade: 'cm',
          continentes: a.cells.map((c) => ({ nome: c.name, coluna: c.cx, linha: c.cy, centro_cm: [+(((c.cx + 0.5) / n - 0.5) * totalM * 100).toFixed(1), +(((c.cy + 0.5) / n - 0.5) * totalM * 100).toFixed(1)] })) }, null, 2)], { type: 'application/json' }) }
      ];
      const half = ((res - 1) / 2) * mpq * 100;
      const tpl = I18N.doc(UE.readmeTemplate({ name: a.name, base, res, mpq, combo: UE.best(res), ue: S.ex.ue, map: { half, sizeCm: half * 2 }, markers: 0, rivers: 0, lakes: 0, roads: 0, biomes: [], veg: [] }))
        .replace(base + '_mapa.png', base + '_mapa_mundi.png').replace(base + '_mapa_limpo.png', base + '_mapa_mundi_limpo.png');
      const r = await call('atlasExport', {
        G, WG, worldM: totalM, P: S.P, erode: false, res, detailAmp: S.ex.detail, detailWave: 40, r16: false, layers: S.ex.layers,
        regions: false, name: a.name, tiles, extraFiles, readmeTemplate: tpl,
        unreal: { version: UE.version(S.ex.ue).label, res, mpq, tiles, scaleXY: mpq * 100, ...UE.best(res) }
      });
      download(r.blob, base + '_atlas_unreal.zip');
      toast(`Atlas exportado: ${res} × ${res}${tiles > 1 ? `, ${tiles * tiles} pedaços` : ''}. Siga o LEIA-ME dentro do ZIP.`);
    } catch (err) { showError(err); } finally { busy = false; setTask('', null); await persist(); render(); }
  }

  return { show, render, restore, crumb, onAutosave, storeActive, get busy() { return busy; } };
})();
