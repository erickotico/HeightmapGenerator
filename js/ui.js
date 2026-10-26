/* Forja de Mundos — layout estilo Adobe: barra de menus, barra de opções da ferramenta, caixa de ferramentas
   com grupos (flyouts) e doca de painéis reorganizável. Só cuida da interface: a lógica continua no app.js
   (S, setTool, setActive etc. são globais do app.js e só são usados depois que ele carrega). */
'use strict';

const UI = (() => {
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];

  // ---------------- ícones (traço, 24×24) ----------------
  const ICONS = {
    hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V13M17 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L4.2 15a1.6 1.6 0 0 1 2.6-1.8L8 15',
    brush: 'M18.4 3.6a2 2 0 0 1 2.8 2.8L12 15.6 8.4 12zM8.4 12C6 12 4.5 13.6 4.5 16c0 1.6-.8 2.6-2 3 1.4 1.2 3.3 2 5.3 2 3 0 4.7-2 4.7-4.3',
    eraser: 'M16 3l5 5-10.5 10.5H6L3 15.5zM9.5 9.5l5 5M6 21h14',
    smooth: 'M12 3c3.5 4.2 6 7.4 6 10.5a6 6 0 0 1-12 0C6 10.4 8.5 7.2 12 3zM9 14a3 3 0 0 0 3 3',
    bucket: 'M4 12l7-7 7 7-7 7zM4 12h14M19.5 15s1.8 2.2 1.8 3.4a1.8 1.8 0 0 1-3.6 0c0-1.2 1.8-3.4 1.8-3.4zM9 3l2 2',
    picker: 'M17 3l4 4-3 3-4-4zM14.5 8.5L5 18v3h3l9.5-9.5M13 7l4 4',
    raise: 'M2 21l6-9 4 5 3-4 7 8zM18 3v7M15.5 5.5L18 3l2.5 2.5',
    lower: 'M2 21l6-9 4 5 3-4 7 8zM18 3v7M15.5 7.5L18 10l2.5-2.5',
    level: 'M3 12h18M8 3v5M6 6l2 2 2-2M16 21v-5M14 18l2-2 2 2',
    river: 'M5 2c4 3-3 6 1 9.5S13 13 11 16.5 13 21 17 22M15 2c2 2.5-1 4 1.5 6',
    ruler: 'M3 16L16 3l5 5L8 21zM7 12l2 2M10 9l2 2M13 6l2 2',
    castle: 'M4 21V9h3v2h2V9h2v2h2V9h2v2h2V9h3v12zM10 21v-4a2 2 0 0 1 4 0v4',
    tree: 'M12 2l6 9h-3l4 6H5l4-6H6zM12 17v5',
    trees: 'M8 3l4.5 7h-2.5l3 5H3l3-5H3.5zM8 15v6M17 6l3.5 6h-2l2.5 4h-6M17 16v5',
    layers: 'M12 3l9 5-9 5-9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5',
    flag: 'M5 22V3M5 4h12l-2.5 4L17 12H5',
    road: 'M8 2L4 22M16 2l4 20M12 3v3M12 10v4M12 18v3',
    lake: 'M3 14c0-3.5 4-6 9-6s9 2.5 9 6-4 6-9 6-9-2.5-9-6zM7 14c1.5-1 3-1 4.5 0M12.5 16.5c1.5-1 3-1 4.5 0',
    stamp: 'M2 20h20M4 20l4-8 3 3 4-9 5 14M14 9l1.5 2',
    erode: 'M3 19c4-1 5-6 9-6s5 5 9 6M8 4v3M12 3v4M16 4v3M10 9l-.5 1.5M14 9l.5 1.5',
    biome: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 10h5l2 3-1.5 4M14 3.5l-1 4 3 2 4.5-1M14 21v-4l3-2h3.5'
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[n] || ICONS.brush}"/></svg>`;

  // ---------------- caixa de ferramentas ----------------
  // Cada grupo mostra o último item usado; o triângulo (◢), o botão direito ou segurar abre o grupo.
  const GROUPS = [
    { id: 'pan', items: [{ tool: 'pan', name: 'Mover o mapa', key: 'H', icon: 'hand' }] },
    { id: 'brush', items: [
      { tool: 'paint', name: 'Pintar', key: 'B', icon: 'brush' },
      { tool: 'erase', name: 'Apagar', key: 'E', icon: 'eraser' },
      { tool: 'smooth', name: 'Suavizar', key: 'S', icon: 'smooth' }] },
    { id: 'fill', items: [
      { tool: 'fill', name: 'Balde de tinta', key: 'G', icon: 'bucket' },
      { tool: 'pick', name: 'Conta-gotas', key: 'I', icon: 'picker' }] },
    { id: 'sculpt', items: [
      { tool: 'paint', layer: 'sculpt', name: 'Elevar (m)', icon: 'raise' },
      { tool: 'erase', layer: 'sculpt', name: 'Rebaixar (m)', icon: 'lower' },
      { tool: 'level', layer: 'sculpt', name: 'Nivelar (altura exata)', key: 'N', icon: 'level' },
      { tool: 'stamp', layer: 'sculpt', name: 'Carimbo de relevo', key: 'K', icon: 'stamp' },
      { tool: 'erodeb', layer: 'sculpt', name: 'Pincel de erosão', key: 'O', icon: 'erode' }] },
    { id: 'paths', items: [
      { tool: 'river', name: 'Rio (linha editável)', key: 'V', icon: 'river' },
      { tool: 'road', name: 'Estrada / trilha', key: 'T', icon: 'road' },
      { run: 'lakes', name: 'Lagos (pintar)', key: '7', icon: 'lake' }] },
    { id: 'ruler', items: [{ tool: 'ruler', name: 'Régua', key: 'R', icon: 'ruler' }] },
    { id: 'marker', items: [
      { tool: 'marker', kind: 'build', name: 'Marcador de construção', key: 'M', icon: 'castle' },
      { tool: 'marker', kind: 'env', name: 'Marcador de vegetação / ambiente', icon: 'tree' }] },
    { id: 'veg', kind: 'veg', name: 'Vegetação (áreas)', icon: 'trees' },
    { id: 'biome', kind: 'biome', name: 'Biomas', icon: 'biome' },
    '-',
    { id: 'layer', kind: 'layer', name: 'Camada ativa', icon: 'layers' },
    { id: 'regions', items: [{ run: 'regions', name: 'Regiões / Reinos', key: '9', icon: 'flag' }] }
  ];
  GROUPS.forEach((g) => { if (g !== '-') g.cur = 0; });
  const PAINT_TOOLS = ['paint', 'erase', 'smooth', 'fill', 'pick', 'level'];
  const lastMarkerType = { build: 'cidade', env: 'interesse' };

  // Qual grupo/item representa o estado atual (ferramenta + camada).
  function currentItem() {
    const t = S.tool;
    if (t === 'pan') return ['pan', 0];
    if (t === 'marker') return ['marker', S.markerKind === 'env' ? 1 : 0];
    if (S.active === 'veg' && (t === 'paint' || t === 'erase')) return ['veg', t === 'erase' ? VEG_TYPES.length : S.vegBrush - 1];
    if (S.active === 'biome' && (t === 'paint' || t === 'erase')) return ['biome', t === 'erase' ? BIOMES.length : S.biomeBrush - 1];
    if (t === 'stamp') return ['sculpt', 3];
    if (t === 'erodeb') return ['sculpt', 4];
    if (S.active === 'sculpt' && (t === 'paint' || t === 'erase' || t === 'level')) return ['sculpt', { paint: 0, erase: 1, level: 2 }[t]];
    if (t === 'paint' || t === 'erase' || t === 'smooth') return ['brush', { paint: 0, erase: 1, smooth: 2 }[t]];
    if (t === 'fill' || t === 'pick') return ['fill', t === 'fill' ? 0 : 1];
    if (t === 'river') return ['paths', 0];
    if (t === 'road') return ['paths', 1];
    if (t === 'ruler') return ['ruler', 0];
    return [null, 0];
  }
  const groupById = (id) => GROUPS.find((g) => g !== '-' && g.id === id);

  function activate(g, idx) {
    const it = g.items[idx];
    g.cur = idx;
    if (it.run === 'regions' || it.run === 'lakes') {
      setActive(it.run);
      if (!PAINT_TOOLS.includes(S.tool) || S.tool === 'level') setTool('paint');
      showPanel(it.run === 'lakes' ? 'paths' : 'regions');
    } else {
      if (it.layer === 'sculpt') { if (S.active !== 'sculpt') setActive('sculpt'); }
      else if ((g.id === 'brush' || g.id === 'fill') && S.active === 'sculpt' && it.tool !== 'pick') setActive(S.lastLayer || 'land');
      if (it.kind && it.kind !== S.markerKind) { S.markerKind = it.kind; S.markerType = lastMarkerType[it.kind]; }
      setTool(it.tool);
    }
    sync();
  }
  function chooseLayer(id) {
    setActive(id);
    if (!PAINT_TOOLS.includes(S.tool)) setTool('paint');
    sync();
  }

  let fly = null, flyFromHold = false;
  function closeFly() { if (fly) { fly.remove(); fly = null; } }
  function openFly(g, btn) {
    closeFly(); closeMenu();
    const el = document.createElement('div');
    el.className = 'flyout';
    if (g.kind === 'layer') {
      el.innerHTML = '<div class="fhead">Camada ativa (o que o pincel muda)</div>' + LAYERS.filter((L) => L.kind !== 'id').map((L, i) =>
        `<button class="fi" data-l="${L.id}"><span class="ck">${S.active === L.id ? '■' : ''}</span><span class="sw" style="background:rgb(${L.color.join(',')})"></span><span class="lbl">${L.name}</span><span class="key">${i + 1}</span></button>`).join('');
      el.querySelectorAll('.fi').forEach((b) => { b.onclick = () => { closeFly(); chooseLayer(b.dataset.l); }; });
    } else if (g.kind === 'veg') {
      const [cg, ci] = currentItem();
      el.innerHTML = '<div class="fhead">Pintar vegetação (vira máscara do PCG)</div>' + VEG_TYPES.map((v, i) =>
        `<button class="fi" data-v="${v.id}"><span class="ck">${cg === 'veg' && ci === i ? '■' : ''}</span><span class="vg">${vegGlyphSVG(v.id, 18)}</span><span class="lbl">${v.name}</span></button>`).join('') +
        `<button class="fi" data-v="0"><span class="ck">${cg === 'veg' && ci === VEG_TYPES.length ? '■' : ''}</span>${icon('eraser')}<span class="lbl">Apagar vegetação</span></button>`;
      el.querySelectorAll('.fi').forEach((b) => { b.onclick = () => { closeFly(); const v = +b.dataset.v; if (v) selectVeg(v, 'paint'); else selectVeg(S.vegBrush, 'erase'); }; });
    } else if (g.kind === 'biome') {
      const [cg, ci] = currentItem();
      el.innerHTML = '<div class="fhead">Pintar biomas (máscara do material do terreno)</div>' + BIOMES.map((b, i) =>
        `<button class="fi" data-b="${b.id}"><span class="ck">${cg === 'biome' && ci === i ? '■' : ''}</span><span class="sw" style="background:${b.color}"></span><span class="lbl">${b.name}</span><span class="key">${b.ch}</span></button>`).join('') +
        `<button class="fi" data-b="0"><span class="ck">${cg === 'biome' && ci === BIOMES.length ? '■' : ''}</span>${icon('eraser')}<span class="lbl">Apagar (volta para campo)</span></button>`;
      el.querySelectorAll('.fi').forEach((b) => { b.onclick = () => { closeFly(); const v = +b.dataset.b; if (v) selectBiome(v, 'paint'); else selectBiome(S.biomeBrush, 'erase'); }; });
    } else {
      const [cg, ci] = currentItem();
      el.innerHTML = g.items.map((it, i) =>
        `<button class="fi" data-i="${i}"><span class="ck">${cg === g.id && ci === i ? '■' : ''}</span>${icon(it.icon)}<span class="lbl">${it.name}</span><span class="key">${it.key || ''}</span></button>`).join('');
      el.querySelectorAll('.fi').forEach((b) => { b.onclick = () => { closeFly(); activate(g, +b.dataset.i); }; });
    }
    document.body.appendChild(el);
    const r = btn.getBoundingClientRect();
    el.style.left = r.right + 6 + 'px';
    el.style.top = Math.min(r.top, innerHeight - el.offsetHeight - 8) + 'px';
    fly = el;
  }

  function renderToolbox() {
    const host = q('#toolbox');
    host.innerHTML = '';
    for (const g of GROUPS) {
      if (g === '-') { const s = document.createElement('div'); s.className = 'tbx-sep'; host.appendChild(s); continue; }
      const b = document.createElement('button');
      b.className = 'tbx'; b.dataset.g = g.id;
      const multi = g.kind === 'layer' || g.kind === 'veg' || g.kind === 'biome' || g.items.length > 1;
      let hold = 0;
      b.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !multi) return;
        flyFromHold = false;
        hold = setTimeout(() => { flyFromHold = true; openFly(g, b); }, 380);
      });
      b.addEventListener('pointerup', () => clearTimeout(hold));
      b.addEventListener('pointerleave', () => clearTimeout(hold));
      b.onclick = (e) => {
        if (flyFromHold) { flyFromHold = false; return; }
        const r = b.getBoundingClientRect(), onTri = e.clientX > r.right - 11 && e.clientY > r.bottom - 11;
        if (g.kind === 'layer' || (multi && onTri)) openFly(g, b);
        else if (g.kind === 'veg') selectVeg(S.vegBrush, 'paint');
        else if (g.kind === 'biome') { selectBiome(S.biomeBrush, 'paint'); showPanel('biomes'); }
        else activate(g, g.cur);
      };
      b.oncontextmenu = (e) => { e.preventDefault(); if (multi) openFly(g, b); };
      host.appendChild(b);
    }
  }
  function syncToolbox() {
    const [cg, ci] = currentItem();
    if (cg && cg !== 'veg' && cg !== 'biome') groupById(cg).cur = ci;
    const lakePaint = S.active === 'lakes' && PAINT_TOOLS.includes(S.tool); // lagos é camada: o grupo mostra o lago enquanto se pinta nela
    if (lakePaint) groupById('paths').cur = 2;
    for (const b of qa('#toolbox .tbx')) {
      const g = groupById(b.dataset.g);
      if (g.kind === 'layer') {
        const L = layerDef(S.active), col = isIdLayer(S.active) ? '#888' : `rgb(${L.color.join(',')})`;
        b.innerHTML = icon('layers') + `<span class="swl" style="background:${col}"></span><span class="tri"></span>`;
        b.title = `Camada ativa: ${L.name} (1 a 8) — clique para trocar`;
        b.classList.toggle('active', false);
        continue;
      }
      if (g.kind === 'veg') {
        b.innerHTML = icon('trees') + `<span class="swl" style="background:${VEG_TYPES[S.vegBrush - 1].color}"></span><span class="tri"></span>`;
        b.title = `Vegetação (áreas): ${VEG_TYPES[S.vegBrush - 1].name} — botão direito, segurar ou triângulo mostra os tipos`;
        b.classList.toggle('active', cg === 'veg');
        continue;
      }
      if (g.kind === 'biome') {
        b.innerHTML = icon('biome') + `<span class="swl" style="background:${BIOMES[S.biomeBrush - 1].color}"></span><span class="tri"></span>`;
        b.title = `Biomas: ${BIOMES[S.biomeBrush - 1].name} — botão direito, segurar ou triângulo mostra os biomas`;
        b.classList.toggle('active', cg === 'biome');
        continue;
      }
      const it = g.items[g.cur], multi = g.items.length > 1;
      b.innerHTML = icon(it.icon) + (multi ? '<span class="tri"></span>' : '');
      b.title = `${it.name}${it.key ? ` (${it.key})` : ''}${multi ? ' — botão direito, segurar ou clicar no triângulo mostra o grupo' : ''}`;
      b.classList.toggle('active', g.id === 'regions' ? S.active === g.id : g.id === cg || (g.id === 'paths' && lakePaint));
    }
  }

  // ---------------- barra de opções ----------------
  function hintFor(t) {
    if (t === 'pick') return S.active === 'sculpt' ? 'Clique no mapa para pegar a altura (vai para o Nivelar).' : 'Clique na imagem-guia para escolher a cor (para Converter ou para o Balde).';
    if (t === 'ruler') return 'Arraste para medir distância, alturas, inclinação e tempo a pé. Esc apaga.';
    if (t === 'river') return S.riverA ? 'Agora clique no destino (mar, lago ou outro rio). Esc cancela.' : 'Clique na nascente e depois no destino: o rio segue os vales. Arraste os pontos · 2 cliques na linha = ponto novo · Alt+clique apaga ponto · Delete apaga o rio.';
    if (t === 'road') return S.roadDraft ? 'Clique no próximo ponto de passagem. Enter ou 2 cliques terminam · Esc termina/cancela.' : 'Clique nos pontos de passagem (cidades, pontes, passos): a rota segue o relevo. Arraste os pontos · Alt+clique apaga · Delete apaga a estrada.';
    if (t === 'stamp') return 'Clique para carimbar. [ ] tamanho · , . ou Shift+roda giram. Vai para a camada Esculpir (Ctrl+Z desfaz).';
    if (t === 'erodeb') return 'Pinte sobre as montanhas e solte: a chuva escava ravinas só ali. Força = quanta chuva.';
    if (t === 'pan') return 'Arraste para mover o mapa. Roda do mouse = zoom. F enquadra.';
    if (t === 'marker') return 'Clique para pôr; arraste para mover; Delete apaga o selecionado.';
    return '';
  }
  function syncOptions() {
    const t = S.tool, a = S.active, sculpt = a === 'sculpt', reg = isIdLayer(a);
    const stroke = ['paint', 'erase', 'smooth', 'level'].includes(t);
    const show = {
      size: stroke || t === 'erodeb',
      strength: (stroke && !reg) || t === 'erodeb',
      hardness: stroke,
      stamp: t === 'stamp',
      intensity: (t === 'paint' && !sculpt && !reg) || (t === 'fill' && !reg),
      sculptAmt: sculpt && (t === 'paint' || t === 'erase'),
      sculptTarget: t === 'level' || (t === 'pick' && sculpt),
      fill: t === 'fill',
      marker: t === 'marker',
      river: t === 'river',
      road: t === 'road',
      hint: !!hintFor(t)
    };
    for (const el of qa('#optbar [data-opt]')) el.hidden = !show[el.dataset.opt];
    q('#optHint').textContent = hintFor(t);
    const [cg, ci] = currentItem();
    if (cg === 'veg') q('#optTool').innerHTML = icon(t === 'erase' ? 'eraser' : 'trees') + `<span>${t === 'erase' ? 'Apagar vegetação' : 'Vegetação'}</span>`;
    else if (cg === 'biome') q('#optTool').innerHTML = icon(t === 'erase' ? 'eraser' : 'biome') + `<span>${t === 'erase' ? 'Apagar bioma' : 'Biomas'}</span>`;
    else { const it = cg ? groupById(cg).items[ci] : null; q('#optTool').innerHTML = it ? icon(it.icon) + `<span>${it.name}</span>` : ''; }
    const L = layerDef(a), veg = a === 'veg', bio = a === 'biome';
    q('#optLayer .dot').style.background = veg ? VEG_TYPES[S.vegBrush - 1].color : bio ? BIOMES[S.biomeBrush - 1].color : reg ? 'conic-gradient(#e6194b 0 25%, #3cb44b 0 50%, #4363d8 0 75%, #f58231 0)' : `rgb(${L.color.join(',')})`;
    q('#optLayer .nm').textContent = veg ? 'Vegetação · ' + VEG_TYPES[S.vegBrush - 1].name : bio ? 'Biomas · ' + BIOMES[S.biomeBrush - 1].name
      : reg ? 'Regiões / Reinos' + (S.regionDefs[S.regionBrush - 1] ? ' · ' + S.regionDefs[S.regionBrush - 1].name : '') : L.name;
    q('#optLayer').title = L.hint;
    // tipos de marcador da variante escolhida (construção ou vegetação/ambiente)
    if (t === 'marker') {
      const sel = q('#markerType'), list = MARKER_TYPES.filter((m) => m.cat === S.markerKind);
      if (!list.some((m) => m.id === S.markerType)) S.markerType = list[0].id;
      const html = list.map((m) => `<option value="${m.id}">${m.name}</option>`).join('');
      if (sel.dataset.kind !== S.markerKind) { sel.innerHTML = html; sel.dataset.kind = S.markerKind; }
      sel.value = S.markerType;
    }
    if (t === 'river' || t === 'road') Feat.syncOptions();
    if (t === 'stamp') Stamps.syncOptions();
  }
  function rememberMarkerType() { lastMarkerType[S.markerKind] = S.markerType; }

  // ---------------- menus ----------------
  const radio = (on) => () => on();
  function menuDefs() {
    return [
      { name: 'Arquivo', items: [
        { label: 'Novo mundo', act: () => newProject() },
        { label: 'Abrir projeto ou imagem…', act: () => q('#fileProject').click() },
        { label: 'Salvar projeto (.forja)', key: 'Ctrl+S', act: saveProjectFile },
        '-',
        { label: 'Carregar imagem-guia…', act: () => q('#fileGuide').click() },
        '-',
        { label: 'Limpar tudo…', act: clearAll }
      ] },
      { name: 'Editar', items: [
        { label: 'Desfazer', key: 'Ctrl+Z', act: () => undoRedo(S.undo, S.redo), disabled: () => !S.undo.length },
        { label: 'Refazer', key: 'Ctrl+Y', act: () => undoRedo(S.redo, S.undo), disabled: () => !S.redo.length },
        '-',
        { head: 'Camada ativa: ' + layerDef(S.active).name },
        { label: 'Limpar camada', act: clearLayer },
        { label: 'Preencher tudo', act: fillLayer },
        { label: 'Inverter', act: invertLayer, disabled: () => isIdLayer(S.active) }
      ] },
      { name: 'Gerar', items: [
        { head: 'Modelos de mundo (1 clique)' },
        ...PRESETS.map((p) => ({ label: p.name, act: () => { q('#presetSel').value = p.id; q('#presetSel').onchange(); applyPreset(); } })),
        '-',
        { label: 'Gerar terra / mar', act: autoLand },
        { label: 'Gerar montanhas e colinas', act: autoRelief },
        { label: 'Rios pintados → rios editáveis', act: () => { setTool('river'); Feat.convertPainted(); } },
        { label: 'Limpar manchinhas dos rios pintados', act: () => Feat.cleanSpecks() },
        { label: 'Estradas entre capital, cidades e castelos', act: () => { setTool('road'); Feat.autoNetwork(); } },
        { label: 'Marcar pontes e cachoeiras', act: () => autoBridgesFalls() },
        { label: 'Opções de geração…', act: () => showPanel('generate') },
        '-',
        { label: 'Aplicar erosão', act: runErosion }
      ] },
      { name: 'Exibir', items: [
        { label: 'Mapa 2D', check: () => S.mode === '2d', act: () => setMode('2d') },
        { label: 'Prévia 3D', check: () => S.mode === '3d', act: () => setMode('3d') },
        { label: 'Enquadrar o mapa', key: 'F', act: fitView },
        '-',
        { head: 'Visualizar' },
        ...[['relief', 'Relevo'], ['layers', 'Camadas de material'], ['slope', 'Inclinação'], ['gray', 'Heightmap (cinza)']].map(([v, l]) =>
          ({ label: l, check: () => S.display === v, act: () => { S.display = v; scheduleRecolor(); } })),
        '-',
        { head: 'Resolução de trabalho' },
        ...[[512, '512 (rápido)'], [1024, '1024'], [2048, '2048 (lento)']].map(([v, l]) =>
          ({ label: l, check: () => S.W === v, act: () => changeWorkRes(v) })),
        '-',
        { label: 'Mostrar vegetação (arvorezinhas)', check: () => S.showVeg, act: () => { const c = q('#vegShow'); c.checked = !c.checked; c.onchange({ target: c }); } },
        { label: 'Mostrar imagem-guia', check: () => S.guide.visible, disabled: () => !S.guide.img, act: () => { const c = q('#guideVisible'); c.checked = !c.checked; c.onchange({ target: c }); } }
      ] },
      { name: 'Exportar', items: [
        { label: 'Exportar pacote (.zip)', act: doExport },
        { label: 'Ver mapa do jogo', act: openMapPreview },
        { label: 'Opções de exportação…', act: () => showPanel('export') },
        '-',
        { label: 'Guia do Unreal', act: openGuide }
      ] },
      { name: 'Janela', items: [
        ...PANELS().map((p) => ({ label: p.title + (p.el.hidden ? ' (só aparece com heightmap base)' : ''), check: () => !L.closed[p.id] && !p.el.hidden, disabled: () => p.el.hidden, act: () => togglePanel(p.id) })),
        '-',
        { label: 'Restaurar layout padrão', act: resetLayout }
      ] },
      { name: 'Ajuda', items: [
        { label: 'Atalhos do teclado', act: showShortcuts },
        { label: 'Guia do Unreal', act: openGuide }
      ] }
    ];
  }
  let menuEl = null, menuOpen = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } qa('.mb-btn').forEach((b) => b.classList.remove('open')); menuOpen = null; }
  function openMenu(name, btn) {
    closeMenu(); closeFly();
    const def = menuDefs().find((m) => m.name === name);
    const el = document.createElement('div');
    el.className = 'menu';
    for (const it of def.items) {
      if (it === '-') { el.insertAdjacentHTML('beforeend', '<div class="msep"></div>'); continue; }
      if (it.head) { el.insertAdjacentHTML('beforeend', `<div class="mhead">${escapeHtml(it.head)}</div>`); continue; }
      const b = document.createElement('button');
      b.className = 'mi';
      b.disabled = !!(it.disabled && it.disabled());
      b.innerHTML = `<span class="ck">${it.check && it.check() ? '✓' : ''}</span><span class="lbl">${escapeHtml(it.label)}</span><span class="key">${it.key || ''}</span>`;
      b.onclick = () => { closeMenu(); it.act(); };
      el.appendChild(b);
    }
    document.body.appendChild(el);
    const r = btn.getBoundingClientRect();
    el.style.left = Math.min(r.left, innerWidth - el.offsetWidth - 6) + 'px';
    el.style.top = r.bottom + 2 + 'px';
    btn.classList.add('open');
    menuEl = el; menuOpen = name;
  }
  function renderMenubar() {
    const host = q('#menus');
    host.innerHTML = '';
    for (const m of menuDefs()) {
      const b = document.createElement('button');
      b.className = 'mb-btn'; b.textContent = m.name;
      b.onclick = () => (menuOpen === m.name ? closeMenu() : openMenu(m.name, b));
      b.onmouseenter = () => { if (menuOpen && menuOpen !== m.name) openMenu(m.name, b); };
      host.appendChild(b);
    }
  }
  function showShortcuts() {
    const rows = [
      ['H', 'Mover o mapa'], ['B / E / S', 'Pintar / Apagar / Suavizar'], ['G / I', 'Balde / Conta-gotas'], ['N', 'Nivelar (Esculpir)'],
      ['V', 'Rio (linha editável)'], ['T', 'Estrada / trilha'], ['R', 'Régua'], ['M', 'Marcador'], ['1 a 8', 'Camada ativa (Terra … Lagos, Esculpir)'], ['9', 'Regiões / Reinos'],
      ['Enter', 'Terminar a estrada'], ['Alt+clique', 'Apagar um ponto do rio ou da estrada'],
      ['[ e ]', 'Diminuir / aumentar o pincel'], ['Shift', 'Inverte Pintar ↔ Apagar enquanto segura'], ['Espaço', 'Segure e arraste para mover'],
      ['F', 'Enquadrar o mapa'], ['Delete', 'Apagar o marcador, rio ou estrada selecionado'], ['Esc', 'Apagar a régua / cancelar / fechar menus'],
      ['Ctrl+Z / Ctrl+Y', 'Desfazer / Refazer'], ['Ctrl+S', 'Salvar projeto']
    ];
    q('#modalBody').innerHTML = `<h2>Atalhos do teclado</h2><table class="kbd-table">${rows.map(([k, d]) => `<tr><td>${k}</td><td>${d}</td></tr>`).join('')}</table>
      <p class="hint">Ferramentas com triângulo no canto têm um grupo: clique no triângulo, use o botão direito ou segure o clique.</p>`;
    q('#modal').hidden = false;
  }

  // ---------------- doca de painéis ----------------
  const LAYOUT_KEY = 'forja.layout.v1';
  const DEFAULT_LAYOUT = {
    order: ['markers', 'paths', 'veg', 'biomes', 'regions', 'guide', 'base', 'generate', 'erosion', 'terrain', 'export'],
    collapsed: { biomes: true, guide: true, generate: true, erosion: true, terrain: true, export: true },
    closed: {}, floating: {}, dockW: 310
  };
  let L = structuredClone(DEFAULT_LAYOUT);
  const PANELS = () => qa('.dpanel').map((el) => ({ id: el.dataset.panel, title: el.dataset.title, el }));
  const panelEl = (id) => q(`.dpanel[data-panel="${id}"]`);
  function saveLayout() { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(L)); } catch (e) { /* só conveniência */ } }
  function loadLayout() {
    try { const s = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); if (s && s.order) L = { ...structuredClone(DEFAULT_LAYOUT), ...s }; } catch (e) { /* layout padrão */ }
  }

  function wrapPanels() {
    for (const el of qa('.dpanel')) {
      const body = document.createElement('div');
      body.className = 'dp-body';
      while (el.firstChild) body.appendChild(el.firstChild);
      const head = document.createElement('div');
      head.className = 'dp-head';
      head.innerHTML = `<span class="dp-arrow">▾</span><span class="dp-title">${escapeHtml(el.dataset.title)}</span>
        <button class="dp-float" title="Soltar como janela / devolver à doca">⇱</button><button class="dp-close" title="Fechar (volta pelo menu Janela)">✕</button>`;
      el.append(head, body);
      const id = el.dataset.panel;
      head.querySelector('.dp-close').onclick = () => togglePanel(id, false);
      head.querySelector('.dp-float').onclick = () => setFloating(id, !L.floating[id]);
      head.addEventListener('pointerdown', (e) => startPanelDrag(e, id));
      head.addEventListener('dblclick', (e) => { if (e.target.tagName !== 'BUTTON') toggleCollapse(id); });
    }
  }
  function applyLayout() {
    const dock = q('#dock'), ids = PANELS().map((p) => p.id);
    const order = [...L.order.filter((id) => ids.includes(id)), ...ids.filter((id) => !L.order.includes(id))];
    L.order = order;
    for (const id of order) {
      const el = panelEl(id), fl = L.floating[id];
      el.classList.toggle('collapsed', !!L.collapsed[id]);
      el.classList.toggle('closed', !!L.closed[id]);
      el.querySelector('.dp-arrow').textContent = L.collapsed[id] ? '▸' : '▾';
      el.querySelector('.dp-float').textContent = fl ? '⇲' : '⇱';
      if (fl) {
        if (el.parentElement !== document.body) document.body.appendChild(el);
        el.classList.add('floating');
        el.style.left = clampN(fl.x, 0, innerWidth - 120) + 'px';
        el.style.top = clampN(fl.y, 40, innerHeight - 40) + 'px';
      } else {
        el.classList.remove('floating'); el.style.left = el.style.top = '';
        dock.appendChild(el);
      }
    }
    dock.style.setProperty('--dock-w', L.dockW + 'px');
    updateDockEmpty();
  }
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  function updateDockEmpty() {
    const any = qa('#dock > .dpanel').some((el) => !el.classList.contains('closed') && !el.hidden);
    q('#dock').classList.toggle('empty', !any);
  }
  function toggleCollapse(id) { L.collapsed[id] = !L.collapsed[id]; applyLayout(); saveLayout(); }
  function togglePanel(id, open) {
    const want = open == null ? !!L.closed[id] : open;
    L.closed[id] = !want;
    if (want) L.collapsed[id] = false;
    applyLayout(); saveLayout();
  }
  function setFloating(id, on, x, y) {
    if (on) {
      // padrão: ao lado da doca, perto do topo (o painel pode estar lá embaixo na doca)
      const dr = q('#dock').getBoundingClientRect();
      L.floating[id] = { x: x ?? Math.max(60, dr.left - 330), y: y ?? 90 };
      L.collapsed[id] = false;
    } else delete L.floating[id];
    applyLayout(); saveLayout();
  }
  function showPanel(id) {
    L.closed[id] = false; L.collapsed[id] = false;
    applyLayout(); saveLayout();
    const el = panelEl(id);
    if (!el.classList.contains('floating')) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    el.animate([{ boxShadow: '0 0 0 2px #d9a441' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 900 });
  }
  function resetLayout() {
    L = structuredClone(DEFAULT_LAYOUT);
    applyLayout(); saveLayout();
  }

  // Arrastar o título: na doca reordena (solte fora da doca para virar janela); janela solta só move.
  function startPanelDrag(e, id) {
    if (e.button !== 0 || e.target.tagName === 'BUTTON') return;
    const el = panelEl(id), floating = !!L.floating[id];
    const sx = e.clientX, sy = e.clientY, r0 = el.getBoundingClientRect();
    let started = false, ph = null;
    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!started) { if (Math.hypot(dx, dy) < 5) return; started = true; if (!floating) { ph = document.createElement('div'); ph.className = 'dp-placeholder'; ph.style.height = Math.min(r0.height, 60) + 'px'; el.after(ph); el.classList.add('dragging'); } }
      if (floating) {
        el.style.left = clampN(r0.left + dx, 0, innerWidth - 120) + 'px';
        el.style.top = clampN(r0.top + dy, 36, innerHeight - 40) + 'px';
        return;
      }
      const dock = q('#dock'), dr = dock.getBoundingClientRect();
      if (ev.clientX < dr.left - 30) { ph.style.display = 'none'; return; }
      ph.style.display = '';
      const sibs = qa('#dock > .dpanel').filter((p) => p !== el && !p.classList.contains('closed') && !p.hidden);
      let before = null;
      for (const p of sibs) { const pr = p.getBoundingClientRect(); if (ev.clientY < pr.top + pr.height / 2) { before = p; break; } }
      if (before) dock.insertBefore(ph, before); else dock.appendChild(ph);
    };
    const up = (ev) => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      if (!started) return;
      if (floating) { L.floating[id] = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) }; saveLayout(); return; }
      el.classList.remove('dragging');
      const dr = q('#dock').getBoundingClientRect();
      if (ev.clientX < dr.left - 30) { ph.remove(); setFloating(id, true, ev.clientX - 40, ev.clientY - 14); return; }
      ph.replaceWith(el);
      L.order = qa('#dock > .dpanel').map((p) => p.dataset.panel).concat(L.order.filter((x) => L.floating[x]));
      saveLayout();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  }
  function bindDockResizer() {
    const h = q('#dockResizer');
    h.addEventListener('pointerdown', (e) => {
      const sx = e.clientX, w0 = L.dockW;
      h.classList.add('drag'); h.setPointerCapture(e.pointerId);
      const move = (ev) => { L.dockW = clampN(w0 - (ev.clientX - sx), 220, 560); q('#dock').style.setProperty('--dock-w', L.dockW + 'px'); };
      const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.classList.remove('drag'); saveLayout(); dispatchEvent(new Event('resize')); };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up);
    });
  }

  // ---------------- geral ----------------
  function sync() { syncToolbox(); syncOptions(); updateDockEmpty(); }
  function init() {
    loadLayout(); wrapPanels(); applyLayout(); bindDockResizer();
    renderMenubar(); renderToolbox();
    addEventListener('pointerdown', (e) => {
      if (menuEl && !menuEl.contains(e.target) && !e.target.classList.contains('mb-btn')) closeMenu();
      if (fly && !fly.contains(e.target) && !e.target.closest('.tbx')) closeFly();
    }, true);
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closeFly(); } });
    addEventListener('resize', () => { if (Object.keys(L.floating).length) applyLayout(); });
  }
  return { init, sync, showPanel, rememberMarkerType, icon };
})();
