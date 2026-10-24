/* Forja de Mundos — interface: pintura das máscaras, painéis, projeto, exportação e guia do Unreal. */
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth01 = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const fmt = (n, d = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Igual ao fileSafe do motor: os nomes do LEIA-ME precisam bater com os arquivos do ZIP.
const fileSafe = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Regiao';

// ================= definições =================
const LAYERS = [
  { id: 'land', name: 'Terra / Mar', color: [96, 180, 96], hint: 'Pinte onde é terra. Apagar (ou Shift) cria mar, baías e lagos.' },
  { id: 'mountains', name: 'Montanhas', color: [214, 120, 64], hint: 'Pinte as cordilheiras. A Intensidade controla a altura (1 = altura máxima de Montanhas).' },
  { id: 'hills', name: 'Colinas', color: [226, 196, 70], hint: 'Relevo ondulado de altura média.' },
  { id: 'plateau', name: 'Planaltos', color: [176, 96, 214], hint: 'Áreas altas e planas com bordas íngremes (mesas).' },
  { id: 'flatten', name: 'Aplainar', color: [70, 205, 225], hint: 'Deixa o terreno plano: cidades, castelos, campos de batalha.' },
  { id: 'rivers', name: 'Rios', color: [50, 120, 255], hint: 'Pincel fino, da montanha até o mar. Cava o leito e abre um vale suave.' },
  { id: 'sculpt', name: 'Esculpir (m)', kind: 'meters', color: [230, 90, 70], hint: 'Ajuste fino em metros, somado por cima de tudo: Pintar = Elevar, Apagar = Rebaixar, Nivelar = altura exata. O Conta-gotas pega a altura do mapa.' },
  { id: 'regions', name: 'Regiões / Reinos', kind: 'id', hint: 'Não muda o relevo. Vira máscara para o PCG (vegetação, spawns e masmorras por reino).' },
  { id: 'veg', name: 'Vegetação', kind: 'id', color: [63, 125, 53], hint: 'Áreas de vegetação: cada ponto guarda um tipo (floresta, pinheiros, selva…). Não muda o relevo; vira máscara para o PCG espalhar as plantas.' }
];
const FLOAT_LAYERS = LAYERS.filter((l) => !l.kind).map((l) => l.id); // máscaras 0..1
const layerDef = (id) => LAYERS.find((l) => l.id === id);
// camadas de "id por pixel" (não mudam o relevo): regiões e vegetação
const isIdLayer = (id) => id === 'regions' || id === 'veg';
const idBrush = () => (S.active === 'veg' ? S.vegBrush : S.regionBrush);
const REGION_COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000'];

const PARAM_GROUPS = [
  { title: 'Costa e oceano', open: true, items: [
    { k: 'coastSmooth', label: 'Suavidade da costa', def: 150, min: 0, max: 1000, step: 10, unit: 'm', tip: 'Arredonda o contorno que você pintou.' },
    { k: 'coastRough', label: 'Recorte da costa', def: 0.22, min: 0, max: 0.6, step: 0.01, tip: 'Quanto o ruído recorta o litoral (baías, cabos, ilhotas).' },
    { k: 'coastScale', label: 'Tamanho dos recortes', def: 1200, min: 200, max: 6000, step: 50, unit: 'm', tip: 'Tamanho típico das baías e cabos.' },
    { k: 'beachWidth', label: 'Largura da transição', def: 90, min: 10, max: 600, step: 10, unit: 'm', tip: 'Distância em que o fundo do mar sobe até a terra. Pequeno = costa íngreme.' },
    { k: 'coastHeight', label: 'Altura na costa', def: 2, min: 0, max: 30, step: 0.5, unit: 'm' },
    { k: 'shelfDepth', label: 'Profundidade perto da costa', def: 18, min: 0, max: 100, step: 1, unit: 'm' },
    { k: 'oceanDepth', label: 'Profundidade do oceano', def: 140, min: 10, max: 1000, step: 5, unit: 'm', tip: 'Oceano fundo demais gasta precisão do heightmap sem necessidade: ninguém vê o fundo.' }
  ] },
  { title: 'Planícies', items: [
    { k: 'plainsAmp', label: 'Ondulação', def: 30, min: 0, max: 200, step: 1, unit: 'm' },
    { k: 'plainsScale', label: 'Tamanho das ondulações', def: 2500, min: 300, max: 8000, step: 50, unit: 'm' },
    { k: 'inlandRise', label: 'Subida para o interior', def: 60, min: 0, max: 500, step: 5, unit: 'm', tip: 'O interior do continente fica mais alto que a costa.' },
    { k: 'inlandDist', label: 'Distância da subida', def: 1800, min: 200, max: 6000, step: 50, unit: 'm' }
  ] },
  { title: 'Colinas', items: [
    { k: 'hillsAmp', label: 'Altura das colinas', def: 180, min: 0, max: 800, step: 5, unit: 'm' },
    { k: 'hillsScale', label: 'Tamanho das colinas', def: 800, min: 100, max: 4000, step: 25, unit: 'm' }
  ] },
  { title: 'Montanhas', items: [
    { k: 'mtnHeight', label: 'Altura máxima', def: 1400, min: 100, max: 4000, step: 10, unit: 'm', tip: 'Altura com intensidade 1 no pincel de Montanhas.' },
    { k: 'mtnScale', label: 'Tamanho das cristas', def: 3500, min: 500, max: 10000, step: 50, unit: 'm', tip: 'Distância típica entre cristas e picos.' },
    { k: 'mtnSoft', label: 'Suavidade da base', def: 300, min: 0, max: 1500, step: 10, unit: 'm', tip: 'Quanto a base da montanha se espalha além do que você pintou.' }
  ] },
  { title: 'Planaltos', items: [
    { k: 'plateauHeight', label: 'Altura do planalto', def: 220, min: 0, max: 1500, step: 5, unit: 'm' }
  ] },
  { title: 'Rios e áreas planas', items: [
    { k: 'riverDepth', label: 'Profundidade do leito', def: 6, min: 0, max: 40, step: 0.5, unit: 'm' },
    { k: 'riverWidth', label: 'Largura do leito', def: 20, min: 5, max: 200, step: 1, unit: 'm' },
    { k: 'valleyWidth', label: 'Largura do vale', def: 250, min: 20, max: 1500, step: 10, unit: 'm' },
    { k: 'flattenRadius', label: 'Raio do aplainar', def: 300, min: 20, max: 2000, step: 10, unit: 'm', tip: 'Quanto maior, mais plano fica onde você pintou Aplainar.' }
  ] },
  { title: 'Aspecto natural', items: [
    { k: 'warpAmp', label: 'Distorção', def: 500, min: 0, max: 2000, step: 10, unit: 'm', tip: 'Entorta os padrões de ruído para não parecerem artificiais.' },
    { k: 'warpScale', label: 'Escala da distorção', def: 4000, min: 500, max: 15000, step: 100, unit: 'm' },
    { k: 'detailAmp', label: 'Rugosidade', def: 3, min: 0, max: 30, step: 0.5, unit: 'm' }
  ] },
  { title: 'Erosão (ajustes)', kind: 'erosion', items: [
    { k: 'erDensity', label: 'Quantidade de chuva', def: 0.6, min: 0.05, max: 3, step: 0.05, tip: 'Gotas por pixel de terra. Mais = mais ravinas, mais demorado.' },
    { k: 'erStrength', label: 'Força de escavação', def: 0.3, min: 0.05, max: 1, step: 0.01 },
    { k: 'erDeposit', label: 'Depósito de sedimento', def: 0.3, min: 0.05, max: 1, step: 0.01 },
    { k: 'erEvaporation', label: 'Evaporação', def: 0.015, min: 0.001, max: 0.1, step: 0.001, tip: 'Alta = gotas morrem cedo, ravinas curtas.' },
    { k: 'erInertia', label: 'Inércia da água', def: 0.05, min: 0, max: 0.5, step: 0.01, tip: 'Alta = canais mais retos e longos.' },
    { k: 'erLifetime', label: 'Vida da gota', def: 35, min: 5, max: 80, step: 1 },
    { k: 'erRadius', label: 'Raio de escavação', def: 3, min: 1, max: 6, step: 1, unit: 'px' },
    { k: 'thIters', label: 'Desmoronamento (passadas)', def: 12, min: 0, max: 60, step: 1, tip: 'Erosão térmica: suaviza penhascos acima do ângulo de repouso.' },
    { k: 'thTalus', label: 'Ângulo de repouso', def: 40, min: 20, max: 60, step: 1, unit: '°' }
  ] },
  { title: 'Camadas de material', kind: 'material', items: [
    { k: 'snowLine', label: 'Linha de neve', def: 1100, min: 100, max: 4000, step: 10, unit: 'm' },
    { k: 'beachHeight', label: 'Altura da areia', def: 3, min: 0, max: 20, step: 0.5, unit: 'm' },
    { k: 'rockSlope', label: 'Inclinação da rocha', def: 38, min: 15, max: 70, step: 1, unit: '°', tip: 'Acima desse ângulo vira rocha.' }
  ] }
];
const DEFAULT_P = { seed: 1337 };
for (const g of PARAM_GROUPS) for (const it of g.items) DEFAULT_P[it.k] = it.def;

// ================= estado =================
const S = {
  W: 1024,
  masks: {}, regions: null,
  base: null, baseInfo: null, // heightmap importado (0..1) e sua faixa em metros
  sculpt: null, sculptAmt: 20, sculptTarget: 100, // Esculpir: deslocamento em metros
  ruler: null, riverA: null, // riverA: nascente marcada, esperando o clique do destino
  markers: [], markerSel: null, markerSeq: 0, markerType: 'cidade', markerKind: 'build', // build = construção · env = vegetação/ambiente
  regionDefs: [], regionBrush: 1,
  veg: null, vegBrush: 1, showVeg: true, // vegetação: 0 = nada, 1..8 = VEG_TYPES
  active: 'land', lastLayer: 'land', tool: 'paint', // lastLayer: volta para ela ao sair do Esculpir pelo Pincel
  brush: { size: 60, strength: 0.35, hardness: 0.4, intensity: 1 },
  fillTol: 25, overlayAlpha: 0.55,
  P: { ...DEFAULT_P },
  ex: { name: 'MeuMundo', ue: UE.DEFAULT_VERSION, res: 4033, mpq: 2, detail: 1.2, erode: true, layers: true, regions: true, veg: true, r16: false, markers: true, map: true, mapSize: 2048 },
  guide: { dataURL: null, img: null, fit: 'contain', opacity: 0.5, visible: true, pixels: null, pick: null },
  H: null, stats: null, eroded: false, erosionStale: false,
  display: 'relief', view: { s: 1, tx: 0, ty: 0 }, mode: '2d',
  undo: [], redo: [], dirty: false, changedSinceExport: true, lastExport: null
};
const worldM = () => (S.ex.res - 1) * S.ex.mpq;
const cellM = () => worldM() / S.W;
// 'base' (heightmap importado) também entra no desfazer; pode ser null.
const getArr = (id) => (id === 'regions' ? S.regions : id === 'veg' ? S.veg : id === 'base' ? S.base : id === 'sculpt' ? S.sculpt : id === 'markers' ? S.markers : S.masks[id]);
const setArr = (id, a) => {
  if (id === 'regions') S.regions = a;
  else if (id === 'veg') { S.veg = a; scheduleVegDraw(); }
  else if (id === 'base') { S.base = a; updateBasePanel(); }
  else if (id === 'sculpt') S.sculpt = a;
  else if (id === 'markers') { S.markers = a; renderMarkers(); buildMarkerList(); }
  else S.masks[id] = a;
};

function emptyMasks(W) {
  const m = {};
  for (const id of FLOAT_LAYERS) m[id] = new Float32Array(W * W);
  return m;
}

// ================= worker =================
const worker = new Worker(URL.createObjectURL(new Blob(['(' + ForjaEngine.toString() + ')()'], { type: 'text/javascript' })));
let reqId = 0;
const pending = new Map();
let busyCount = 0;
function call(type, payload) {
  return new Promise((res, rej) => {
    const id = ++reqId;
    pending.set(id, { res, rej });
    busyCount++; setTask('Processando…', null);
    worker.postMessage({ type, id, ...payload });
  });
}
worker.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'progress') { setTask(m.label, m.value); return; }
  const p = pending.get(m.id);
  if (!p) return;
  pending.delete(m.id);
  busyCount = Math.max(0, busyCount - 1);
  if (!busyCount) setTask('', null);
  if (m.type === 'error') p.rej(new Error(m.message)); else p.res(m);
};
worker.onerror = (e) => showError(new Error(e.message || 'Erro no motor de geração'));

// ================= feedback visual =================
function setTask(label, value) {
  $('#stTask').textContent = busyCount ? label : '';
  const bar = $('#progress');
  bar.classList.toggle('on', !!busyCount);
  $('#progressBar').style.width = value == null ? '15%' : Math.round(value * 100) + '%';
}
let toastTimer = 0;
function toast(msg, isError) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false; t.classList.toggle('error', !!isError);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 7000 : 3500);
}
function showError(err) { console.error(err); toast('Erro: ' + err.message, true); }
function markDirty() { S.dirty = true; S.changedSinceExport = true; }

// ================= canvases e visão 2D =================
const vp = $('#viewport'), stage = $('#stage');
const cvT = $('#cvTerrain'), cvG = $('#cvGuide'), cvO = $('#cvOverlay');
const tctx = cvT.getContext('2d'), gctx = cvG.getContext('2d', { willReadFrequently: true }), octx = cvO.getContext('2d');
const cursorEl = $('#brushCursor');

function setupCanvases() {
  for (const c of [cvT, cvG, cvO]) { c.width = c.height = S.W; c.style.width = c.style.height = S.W + 'px'; }
  tctx.fillStyle = '#1b3a5c'; tctx.fillRect(0, 0, S.W, S.W);
  scheduleVegDraw();
}

function applyView() {
  const v = S.view;
  stage.style.transform = `translate(${v.tx}px, ${v.ty}px) scale(${v.s})`;
  const pix = v.s >= 1.5 ? 'pixelated' : 'auto';
  for (const c of [cvT, cvG, cvO]) c.style.imageRendering = pix;
  updateCursorSize(); renderRuler(); renderMarkers(); renderRiverPick(); updateScaleBar();
}
function fitView() {
  const r = vp.getBoundingClientRect();
  if (!r.width) return;
  const s = (Math.min(r.width, r.height) / S.W) * 0.94;
  S.view = { s, tx: (r.width - S.W * s) / 2, ty: (r.height - S.W * s) / 2 };
  applyView();
}
function toMap(e) {
  const r = vp.getBoundingClientRect();
  return { x: (e.clientX - r.left - S.view.tx) / S.view.s, y: (e.clientY - r.top - S.view.ty) / S.view.s };
}

function drawOverlay(x0 = 0, y0 = 0, x1 = S.W - 1, y1 = S.W - 1) {
  const W = S.W;
  x0 = clamp(x0, 0, W - 1); y0 = clamp(y0, 0, W - 1); x1 = clamp(x1, 0, W - 1); y1 = clamp(y1, 0, W - 1);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w <= 0 || h <= 0) return;
  const img = octx.createImageData(w, h), d = img.data;
  const a = S.overlayAlpha * 255;
  if (isIdLayer(S.active)) {
    const cols = S.active === 'veg' ? VEG_TYPES.map((v) => hexToRgb(v.color)) : S.regionDefs.map((r) => hexToRgb(r.color));
    const arr = getArr(S.active);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const id = arr[(y + y0) * W + x + x0];
      const c = id && cols[id - 1];
      if (!c) continue;
      const o = (y * w + x) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a;
    }
  } else if (S.active === 'sculpt') {
    const m = S.sculpt;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = m[(y + y0) * W + x + x0];
      if (Math.abs(v) < 0.05) continue;
      const o = (y * w + x) * 4;
      if (v > 0) { d[o] = 235; d[o + 1] = 85; d[o + 2] = 60; } else { d[o] = 60; d[o + 1] = 130; d[o + 2] = 240; }
      d[o + 3] = Math.min(1, Math.abs(v) / 40) * a;
    }
  } else if (S.active === 'land') {
    // Terra cobre metade do mapa: preenchimento fraco + contorno forte, para o relevo continuar visível.
    const m = S.masks.land, c = layerDef('land').color;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const gx = x + x0, gy = y + y0, i = gy * W + gx, v = m[i];
      if (v <= 0.003) continue;
      const o = (y * w + x) * 4;
      const edge = v > 0.5 && ((gx > 0 && m[i - 1] <= 0.5) || (gx < W - 1 && m[i + 1] <= 0.5) || (gy > 0 && m[i - W] <= 0.5) || (gy < W - 1 && m[i + W] <= 0.5));
      d[o] = edge ? 255 : c[0]; d[o + 1] = edge ? 255 : c[1]; d[o + 2] = edge ? 255 : c[2];
      d[o + 3] = edge ? Math.min(255, a * 1.6) : v * a * 0.3;
    }
  } else {
    const m = S.masks[S.active], c = layerDef(S.active).color;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = m[(y + y0) * W + x + x0];
      if (v <= 0.003) continue;
      const o = (y * w + x) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = v * a;
    }
  }
  octx.putImageData(img, x0, y0);
}

let dirtyRect = null, overlayRaf = 0;
function extendDirty(x0, y0, x1, y1) {
  if (!dirtyRect) dirtyRect = { x0, y0, x1, y1 };
  else { dirtyRect.x0 = Math.min(dirtyRect.x0, x0); dirtyRect.y0 = Math.min(dirtyRect.y0, y0); dirtyRect.x1 = Math.max(dirtyRect.x1, x1); dirtyRect.y1 = Math.max(dirtyRect.y1, y1); }
  if (!overlayRaf) overlayRaf = requestAnimationFrame(flushOverlay);
}
function flushOverlay() {
  overlayRaf = 0;
  if (!dirtyRect) return;
  const r = dirtyRect; dirtyRect = null;
  drawOverlay(r.x0, r.y0, r.x1, r.y1);
}

// ================= pintura =================
let stroke = null, pan = null, spaceDown = false, lastPointer = null;

function effectiveTool(shift) {
  if (!shift) return S.tool;
  if (S.tool === 'paint') return 'erase';
  if (S.tool === 'erase') return 'paint';
  return S.tool;
}

function snapshot(ids) {
  const e = {};
  for (const id of ids) { const a = getArr(id); e[id] = id === 'markers' ? structuredClone(a) : a ? a.slice() : null; }
  S.undo.push(e);
  if (S.undo.length > 30) S.undo.shift();
  S.redo.length = 0;
}
function undoRedo(from, to) {
  const e = from.pop();
  if (!e) return;
  const back = {};
  let terrain = false;
  for (const id in e) { back[id] = getArr(id); setArr(id, e[id]); if (!isIdLayer(id) && id !== 'markers') terrain = true; }
  to.push(back);
  drawOverlay(); markDirty();
  if (terrain) scheduleCompose(0);
}

// Apaga o mapa inteiro de uma vez (todas as camadas, regiões e heightmap base), com desfazer.
// Mantém imagem-guia, nomes/cores das regiões e ajustes — para recomeçar do zero total existe o "Novo".
function clearAll() {
  if (!confirm('Apagar tudo do mapa (terra, relevo, rios, esculpir, regiões, vegetação, marcadores e heightmap base)?\nA imagem-guia e os ajustes ficam. Dá para desfazer com Ctrl+Z.')) return;
  snapshot([...FLOAT_LAYERS, 'sculpt', 'regions', 'veg', 'base', 'markers']);
  for (const id of FLOAT_LAYERS) S.masks[id].fill(0);
  S.sculpt.fill(0);
  S.regions.fill(0);
  S.veg.fill(0); scheduleVegDraw();
  S.markers = []; S.markerSel = null; renderMarkers(); buildMarkerList();
  S.base = null;
  updateBasePanel(); drawOverlay(); markDirty(); scheduleCompose(0);
  toast('Mapa limpo. Ctrl+Z desfaz.');
}

function afterMaskChange(id) {
  drawOverlay(); markDirty();
  if (id === 'veg') { scheduleVegDraw(); buildVegList(); }
  else if (!isIdLayer(id)) scheduleCompose(0);
}

function dab(cx, cy, tool) {
  const W = S.W, r = Math.max(0.5, S.brush.size / 2);
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(W - 1, Math.ceil(cy + r));
  if (x0 > x1 || y0 > y1) return;
  const hard = S.brush.hardness, st = S.brush.strength;
  const isId = isIdLayer(S.active), isM = S.active === 'sculpt', arr = getArr(S.active), idv = idBrush();
  const target = tool === 'erase' ? 0 : S.brush.intensity;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (d >= 1) continue;
      const fall = d <= hard ? 1 : 1 - smooth01((d - hard) / (1 - hard));
      const i = y * W + x;
      if (isId) { if (fall > 0.5 && tool !== 'smooth') arr[i] = tool === 'erase' ? 0 : idv; continue; }
      const a = st * fall;
      if (isM && tool !== 'smooth') {
        if (tool === 'level') {
          // deslocamento que leva o terreno (sem o Esculpir do começo do traço) até a altura alvo
          if (stroke && stroke.base0 && S.H) arr[i] += (S.sculptTarget - S.H[i] + stroke.base0[i] - arr[i]) * a;
        } else arr[i] += (tool === 'erase' ? -1 : 1) * S.sculptAmt * a;
        continue;
      }
      if (tool === 'smooth') {
        let s = 0, n = 0;
        for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
          const yy = y + j, xx = x + k;
          if (yy >= 0 && yy < W && xx >= 0 && xx < W) { s += arr[yy * W + xx]; n++; }
        }
        arr[i] += (s / n - arr[i]) * a;
      } else {
        arr[i] += (target - arr[i]) * a;
      }
    }
  }
  extendDirty(x0, y0, x1, y1);
}

function startTool(p, shift) {
  const tool = effectiveTool(shift);
  const x = Math.floor(p.x), y = Math.floor(p.y);
  const inside = x >= 0 && y >= 0 && x < S.W && y < S.W;
  if (tool === 'pick') {
    if (!inside) return;
    if (S.active === 'sculpt') { const h = heightAtMap(p.x, p.y); if (h != null) { S.sculptTarget = Math.round(h); $('#sculptTarget').value = S.sculptTarget; toast(`Altura alvo: ${fmt(S.sculptTarget)} m`); } }
    else pickGuideColor(x, y);
    return;
  }
  if (tool === 'ruler') { S.ruler = { a: p, b: p, drag: true }; renderRuler(); return; }
  if (tool === 'river') { riverClick(p); return; }
  if (tool === 'fill') {
    if (!inside) return;
    if (S.active === 'sculpt') { toast('O Balde não funciona na camada Esculpir. Use Elevar, Rebaixar ou Nivelar.'); return; }
    snapshot([S.active]);
    bucketFill(x, y, shift);
    afterMaskChange(S.active);
    return;
  }
  snapshot([S.active]);
  stroke = { last: p, tool, base0: S.active === 'sculpt' ? S.undo[S.undo.length - 1].sculpt : null };
  dab(p.x, p.y, tool);
}
function strokeTo(p) {
  const l = stroke.last, d = Math.hypot(p.x - l.x, p.y - l.y);
  const step = Math.max(1, S.brush.size * 0.15), n = Math.ceil(d / step);
  for (let k = 1; k <= n; k++) dab(l.x + ((p.x - l.x) * k) / n, l.y + ((p.y - l.y) * k) / n, stroke.tool);
  stroke.last = p;
}
function endStroke() {
  stroke = null;
  flushOverlay(); markDirty();
  if (S.active === 'veg') { scheduleVegDraw(); buildVegList(); }
  else if (!isIdLayer(S.active)) scheduleCompose(0);
}

// Balde: preenche a área contínua parecida com o ponto clicado (na imagem-guia ou na própria camada).
function bucketFill(sx, sy, inv) {
  const W = S.W, N = W * W, arr = getArr(S.active), isId = isIdLayer(S.active);
  const useGuide = $('#fillGuide').checked && S.guide.pixels;
  const tol = S.fillTol;
  let same;
  if (useGuide) {
    const g = S.guide.pixels, o0 = (sy * W + sx) * 4;
    const r0 = g[o0], g0 = g[o0 + 1], b0 = g[o0 + 2], t2 = (tol * 4.42) ** 2;
    same = (i) => { const o = i * 4, dr = g[o] - r0, dg = g[o + 1] - g0, db = g[o + 2] - b0; return dr * dr + dg * dg + db * db <= t2; };
  } else {
    const v0 = arr[sy * W + sx], t = isId ? 0 : tol / 100;
    same = (i) => Math.abs(arr[i] - v0) <= t;
  }
  const seen = new Uint8Array(N);
  const stack = [sx, sy];
  while (stack.length) {
    const py = stack.pop(), px = stack.pop(), row = py * W;
    if (seen[row + px] || !same(row + px)) continue;
    let xl = px, xr = px;
    while (xl > 0 && !seen[row + xl - 1] && same(row + xl - 1)) xl--;
    while (xr < W - 1 && !seen[row + xr + 1] && same(row + xr + 1)) xr++;
    for (let x = xl; x <= xr; x++) seen[row + x] = 1;
    for (const ny of [py - 1, py + 1]) {
      if (ny < 0 || ny >= W) continue;
      const r2 = ny * W;
      let inSpan = false;
      for (let x = xl; x <= xr; x++) {
        const ok = !seen[r2 + x] && same(r2 + x);
        if (ok && !inSpan) { stack.push(x, ny); inSpan = true; } else if (!ok) inSpan = false;
      }
    }
  }
  // Cresce 2 px para cobrir a linha do contorno do desenho.
  if (useGuide) {
    for (let pass = 0; pass < 2; pass++) {
      const grow = [];
      for (let i = 0; i < N; i++) {
        if (seen[i]) continue;
        const x = i % W;
        if ((x > 0 && seen[i - 1] === 1) || (x < W - 1 && seen[i + 1] === 1) || (i >= W && seen[i - W] === 1) || (i < N - W && seen[i + W] === 1)) grow.push(i);
      }
      for (const i of grow) seen[i] = 1;
    }
  }
  const val = isId ? (inv ? 0 : idBrush()) : (inv ? 0 : S.brush.intensity);
  for (let i = 0; i < N; i++) if (seen[i]) arr[i] = val;
}

function pickGuideColor(x, y) {
  if (!S.guide.pixels) { toast('Carregue uma imagem-guia primeiro.'); return; }
  const o = (y * S.W + x) * 4, g = S.guide.pixels;
  S.guide.pick = [g[o], g[o + 1], g[o + 2]];
  $('#pickSwatch').style.background = `rgb(${g[o]},${g[o + 1]},${g[o + 2]})`;
  $('#pickHint').textContent = 'cor escolhida';
  $('#convMode').value = 'color';
}

// ================= cursor e leitura =================
function updateCursorSize() {
  const t = S.tool;
  const cross = (t === 'pick' || t === 'fill' || t === 'ruler' || t === 'river' || t === 'marker') && !spaceDown;
  cursorEl.classList.toggle('cross', cross);
  if (!cross) { const d = S.brush.size * S.view.s; cursorEl.style.width = cursorEl.style.height = d + 'px'; }
  else { cursorEl.style.width = cursorEl.style.height = ''; }
}
function updateCursor(e) {
  const r = vp.getBoundingClientRect();
  cursorEl.style.left = e.clientX - r.left + 'px';
  cursorEl.style.top = e.clientY - r.top + 'px';
  cursorEl.style.display = pan || S.tool === 'pan' ? 'none' : 'block';
}
function updateReadout(p) {
  const x = Math.floor(p.x), y = Math.floor(p.y);
  if (x < 0 || y < 0 || x >= S.W || y >= S.W) { $('#stCursor').textContent = '—'; return; }
  const c = cellM();
  let t = `X ${fmt((x * c) / 1000, 2)} km · Y ${fmt((y * c) / 1000, 2)} km`;
  if (S.H && S.H.length === S.W * S.W) t += ` · altura ${fmt(S.H[y * S.W + x], 1)} m`;
  if (S.active === 'sculpt' && S.sculpt[y * S.W + x]) t += ` · esculpir ${S.sculpt[y * S.W + x] > 0 ? '+' : ''}${fmt(S.sculpt[y * S.W + x], 1)} m`;
  if (S.active === 'regions' && S.regions[y * S.W + x]) { const d = S.regionDefs[S.regions[y * S.W + x] - 1]; if (d) t += ` · ${d.name}`; }
  if (S.veg[y * S.W + x]) { const v = VEG_TYPES[S.veg[y * S.W + x] - 1]; if (v) t += ` · ${v.name}`; }
  $('#stCursor').textContent = t;
}

vp.addEventListener('contextmenu', (e) => e.preventDefault());
vp.addEventListener('pointerdown', (e) => {
  vp.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2 || spaceDown || (e.button === 0 && S.tool === 'pan')) {
    pan = { x: e.clientX, y: e.clientY, tx: S.view.tx, ty: S.view.ty };
    cursorEl.style.display = 'none';
    return;
  }
  if (e.button === 0) { if (S.tool === 'marker') markerDown(toMap(e), e); else startTool(toMap(e), e.shiftKey); }
});
vp.addEventListener('pointermove', (e) => {
  lastPointer = e;
  updateCursor(e);
  if (pan) {
    S.view.tx = pan.tx + e.clientX - pan.x; S.view.ty = pan.ty + e.clientY - pan.y;
    applyView();
    return;
  }
  const p = toMap(e);
  if (stroke) strokeTo(p);
  if (S.ruler && S.ruler.drag) { S.ruler.b = p; renderRuler(); }
  if (markerDrag) markerMove(p);
  updateReadout(p);
});
vp.addEventListener('pointerup', () => {
  if (pan) { pan = null; cursorEl.style.display = S.tool === 'pan' ? 'none' : 'block'; }
  if (stroke) endStroke();
  if (S.ruler) S.ruler.drag = false;
  if (markerDrag) markerUp();
});
vp.addEventListener('pointerleave', () => { if (!stroke && !pan) cursorEl.style.display = 'none'; });
vp.addEventListener('pointerenter', () => { cursorEl.style.display = S.tool === 'pan' ? 'none' : 'block'; });
vp.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = vp.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const v = S.view, ns = clamp(v.s * Math.exp(-e.deltaY * 0.0015), 0.05, 40);
  v.tx = mx - ((mx - v.tx) * ns) / v.s; v.ty = my - ((my - v.ty) * ns) / v.s; v.s = ns;
  applyView();
}, { passive: false });
new ResizeObserver(() => { if (S.mode === '2d' && !S._fitted) { fitView(); S._fitted = true; } }).observe(vp);

// ================= geração (worker) =================
let composeTimer = 0, composeQueued = false, composing = null, composeAgain = false;
function scheduleCompose(delay = 150) {
  clearTimeout(composeTimer);
  composeQueued = true;
  composeTimer = setTimeout(() => { composeQueued = false; runCompose(); }, delay);
}
// Garante que o relevo está atualizado antes de erodir/exportar.
async function flushCompose() {
  if (composeQueued) { clearTimeout(composeTimer); composeQueued = false; runCompose(); }
  while (composing) await composing;
}
function runCompose() {
  if (composing) { composeAgain = true; return composing; }
  composing = composeLoop();
  return composing;
}
async function composeLoop() {
  try {
    do {
      composeAgain = false;
      const base = S.base ? { data: S.base, min: S.baseInfo.min, max: S.baseInfo.max } : null;
      const r = await call('compose', { W: S.W, worldM: worldM(), P: S.P, masks: { ...S.masks, sculpt: S.sculpt }, base, mode: S.display });
      applyHeight(r);
    } while (composeAgain);
  } catch (err) { showError(err); } finally { composing = null; }
}
let recolorTimer = 0;
function scheduleRecolor() {
  clearTimeout(recolorTimer);
  recolorTimer = setTimeout(async () => {
    if (!S.H) return;
    try { applyHeight(await call('recolor', { P: S.P, mode: S.display })); } catch (err) { showError(err); }
  }, 120);
}
async function runErosion() {
  if (!S.H) return;
  const btn = $('#btnErode'); btn.disabled = true;
  try {
    await flushCompose();
    applyHeight(await call('erode', { P: S.P, mode: S.display }));
    S.erosionStale = false; updateErosionInfo();
    toast('Erosão aplicada.');
  } catch (err) { showError(err); } finally { btn.disabled = false; }
}

let view3dDirty = true;
function applyHeight(r) {
  if (r.W !== S.W) return; // resultado antigo de outra resolução
  S.H = r.H; S.stats = r.stats; S.eroded = r.eroded;
  tctx.putImageData(new ImageData(r.rgba, r.W, r.W), 0, 0);
  updateStats(); updateErosionInfo(); renderRuler();
  if (S.markers.length && !markerDrag) buildMarkerList(); // altura de cada marcador muda com o relevo
  scheduleVegDraw(); // a costa pode ter mudado (sem arvorezinhas no mar)
  view3dDirty = true;
  if (S.mode === '3d') update3D();
}

function updateStats() {
  const s = S.stats;
  if (!s) return;
  $('#stStats').textContent = `Altitude ${fmt(s.min, 0)} m a ${fmt(s.max, 0)} m · terra ${fmt(s.landPct, 0)}% · mundo ${fmt(worldM() / 1000, 2)} km`;
}
function updateErosionInfo() {
  const el = $('#erosionState');
  if (S.eroded && S.erosionStale) el.innerHTML = '<b>Aplicada</b>, mas os ajustes mudaram depois. Aplique de novo.';
  else if (S.eroded) el.innerHTML = '<b>Aplicada</b> ✓';
  else el.textContent = 'Ainda não aplicada (a exportação aplica se a opção estiver marcada).';
}

async function autoLand() {
  snapshot(['land']);
  try {
    const r = await call('autoLand', { W: S.W, P: S.P, style: $('#autoStyle').value, coverage: +$('#autoCoverage').value });
    S.masks.land = r.mask;
    afterMaskChange('land');
  } catch (err) { S.undo.pop(); showError(err); }
}
async function autoRelief() {
  if (!S.masks.land.some((v) => v > 0.5)) { toast('Pinte ou gere a terra primeiro.'); return; }
  snapshot(['mountains', 'hills']);
  try {
    const r = await call('autoRelief', { W: S.W, P: S.P, land: S.masks.land });
    S.masks.mountains = r.mountains; S.masks.hills = r.hills;
    afterMaskChange('mountains');
  } catch (err) { S.undo.pop(); showError(err); }
}

// ================= painéis =================
// A escolha da camada fica na caixa de ferramentas (js/ui.js): grupo "Camada ativa" + botão Regiões.
function setActive(id) {
  S.active = id;
  if (id !== 'sculpt') S.lastLayer = id;
  if (id !== 'sculpt' && S.tool === 'level') setTool('paint');
  buildRegionList(); buildVegList();
  UI.sync();
  drawOverlay();
}
function clearLayer() { snapshot([S.active]); getArr(S.active).fill(0); afterMaskChange(S.active); }
function fillLayer() { snapshot([S.active]); getArr(S.active).fill(isIdLayer(S.active) ? idBrush() : S.active === 'sculpt' ? S.sculptAmt : S.brush.intensity); afterMaskChange(S.active); }
function invertLayer() {
  if (isIdLayer(S.active)) return;
  snapshot([S.active]);
  const a = getArr(S.active), neg = S.active === 'sculpt';
  for (let i = 0; i < a.length; i++) a[i] = neg ? -a[i] : 1 - a[i];
  afterMaskChange(S.active);
}

function buildRegionList() {
  const el = $('#regionList');
  el.innerHTML = '';
  S.regionDefs.forEach((r, idx) => {
    const id = idx + 1;
    const row = document.createElement('div');
    row.className = 'region' + (S.regionBrush === id ? ' active' : '');
    row.innerHTML = `<input type="color" value="${r.color}" title="Cor"><input type="text" value="${escapeHtml(r.name)}" title="Nome"><button title="Excluir região">×</button>`;
    const [col, name] = row.querySelectorAll('input');
    row.onclick = (e) => {
      if (e.target.tagName === 'BUTTON') return;
      S.regionBrush = id;
      // escolher uma região já prepara o pincel para pintá-la
      if (S.active !== 'regions') { setActive('regions'); if (!['paint', 'erase', 'smooth', 'fill'].includes(S.tool)) setTool('paint'); return; }
      $$('.region').forEach((x) => x.classList.remove('active')); row.classList.add('active'); UI.sync();
    };
    col.oninput = () => { r.color = col.value; drawOverlay(); markDirty(); };
    name.onchange = () => { r.name = name.value.trim() || `Região ${id}`; markDirty(); };
    row.querySelector('button').onclick = () => deleteRegion(id);
    el.appendChild(row);
  });
}
function addRegion() {
  if (S.regionDefs.length >= 32) { toast('Máximo de 32 regiões.'); return; }
  const n = S.regionDefs.length;
  S.regionDefs.push({ name: `Região ${n + 1}`, color: REGION_COLORS[n % REGION_COLORS.length] });
  S.regionBrush = n + 1;
  buildRegionList(); markDirty();
}
function deleteRegion(id) {
  const used = S.regions.some((v) => v === id);
  if (used && !confirm(`Excluir "${S.regionDefs[id - 1].name}"? A área pintada dela será apagada.`)) return;
  snapshot(['regions']);
  const a = S.regions;
  for (let i = 0; i < a.length; i++) { if (a[i] === id) a[i] = 0; else if (a[i] > id) a[i]--; }
  S.regionDefs.splice(id - 1, 1);
  S.regionBrush = clamp(S.regionBrush, 1, Math.max(1, S.regionDefs.length));
  S.undo.length = 0; // os ids mudaram; desfazer não faria mais sentido
  buildRegionList(); drawOverlay(); markDirty();
}

function bindRange(id, get, set, show) {
  const inp = $('#' + id), out = $('#' + id + 'Out');
  const upd = () => { if (out) out.textContent = show ? show(get()) : get(); };
  inp.value = get();
  inp.addEventListener('input', () => { set(+inp.value); upd(); });
  upd();
  return upd;
}

let paramInputs = [];
function buildParams() {
  const host = $('#paramGroups');
  host.innerHTML = '';
  paramInputs = [];
  const sec = document.createElement('section');
  sec.innerHTML = `<div class="seed-row"><span style="color:var(--muted)">Semente</span><input type="number" id="pSeed" min="0" max="999999"><button id="btnSeed" class="small" title="Sorteia uma semente nova">Sortear</button></div>
    <p class="hint">Mesma semente = mesmo terreno. Mudar a semente troca os detalhes; o que você pintou continua.</p>
    <div class="btnrow"><button id="btnResetParams" class="small">Restaurar padrões</button></div>`;
  host.appendChild(sec);
  for (const g of PARAM_GROUPS) {
    const det = document.createElement('details');
    det.className = 'group';
    if (g.open) det.open = true;
    det.innerHTML = `<summary>${g.title}</summary>`;
    for (const it of g.items) {
      const wrap = document.createElement('div');
      wrap.className = 'param';
      wrap.innerHTML = `<label><span>${it.label}${it.unit ? ' (' + it.unit + ')' : ''}</span>${it.tip ? `<span class="tip" title="${escapeHtml(it.tip)}">?</span>` : ''}</label>
        <input type="range" min="${it.min}" max="${it.max}" step="${it.step}"><input type="number" min="${it.min}" step="${it.step}">`;
      const [rng, num] = wrap.querySelectorAll('input');
      const on = (v) => {
        v = +v;
        if (!isFinite(v)) return;
        S.P[it.k] = v; rng.value = v; num.value = v;
        paramChanged(g.kind || 'terrain');
      };
      rng.oninput = () => on(rng.value);
      num.onchange = () => on(num.value);
      paramInputs.push({ k: it.k, rng, num });
      det.appendChild(wrap);
    }
    host.appendChild(det);
  }
  $('#pSeed').onchange = () => { S.P.seed = clamp(Math.round(+$('#pSeed').value || 0), 0, 999999); $('#pSeed').value = S.P.seed; paramChanged('terrain'); };
  $('#btnSeed').onclick = () => { S.P.seed = Math.floor(Math.random() * 999999); $('#pSeed').value = S.P.seed; paramChanged('terrain'); };
  $('#btnResetParams').onclick = () => {
    if (!confirm('Voltar todos os ajustes de terreno para o padrão? (a pintura não muda)')) return;
    const seed = S.P.seed;
    S.P = { ...DEFAULT_P, seed };
    refreshParamInputs(); paramChanged('terrain');
  };
  refreshParamInputs();
}
function refreshParamInputs() {
  for (const p of paramInputs) { p.rng.value = S.P[p.k]; p.num.value = S.P[p.k]; }
  $('#pSeed').value = S.P.seed;
}
function paramChanged(kind) {
  markDirty();
  if (kind === 'terrain') scheduleCompose(250);
  else if (kind === 'erosion') { if (S.eroded) { S.erosionStale = true; updateErosionInfo(); } }
  else { scheduleRecolor(); sync3DParams(); }
}

function buildExportPanel() {
  const sel = $('#exRes');
  sel.innerHTML = '';
  for (const r of UE.RESOLUTIONS) {
    const o = document.createElement('option');
    o.value = r.res;
    o.textContent = r.tiles ? `${r.res} × ${r.res} — ${r.tiles}×${r.tiles} pedaços` : `${r.res} × ${r.res}${r.star ? ' ★' : ''}`;
    if (r.tiles && !UE.version(S.ex.ue).wp) { o.disabled = true; o.textContent += ' (precisa de World Partition)'; }
    sel.appendChild(o);
  }
  if (UE.tilesFor(S.ex.res) > 1 && !UE.version(S.ex.ue).wp) { S.ex.res = 8129; toast('Esta versão não tem World Partition: mundos em pedaços não importam. Voltei para 8129.'); }
  sel.value = S.ex.res;
  $('#exUe').innerHTML = versionOptions(UE.version(S.ex.ue).id);
  $('#exMpq').value = String(S.ex.mpq);
  $('#exName').value = S.ex.name;
  $('#exErode').checked = S.ex.erode; $('#exLayers').checked = S.ex.layers; $('#exRegions').checked = S.ex.regions; $('#exR16').checked = S.ex.r16;
  $('#exMarkers').checked = S.ex.markers; $('#exVeg').checked = S.ex.veg !== false; $('#exMap').checked = S.ex.map; $('#exMapSize').value = String(S.ex.mapSize);
  updateWorldSize();
}
function updateWorldSize() {
  const km = UE.worldKm(S.ex.res, S.ex.mpq), tier = UE.sizeTier(km, UE.version(S.ex.ue)), b = UE.best(S.ex.res);
  $('#worldSize').innerHTML = `Mundo: <b>${fmt(km, 2)} km × ${fmt(km, 2)} km</b> (${tier.name})<br>` +
    `Landscape: ${b.sectionQuads}×${b.sectionQuads} quads · ${b.sectionsPerComp}×${b.sectionsPerComp} seções · ${b.comps}×${b.comps} componentes<br>` +
    `Cada pixel de trabalho = ${fmt(cellM(), 1)} m`;
  updateBrushOut(); updateScaleBar();
}

let updateBrushOut = () => {}, updateCoverageOut = () => {};
function bindControls() {
  updateBrushOut = bindRange('brushSize', () => S.brush.size, (v) => { S.brush.size = v; updateCursorSize(); }, (v) => `${v}px · ${fmt(v * cellM(), 0)} m`);
  bindRange('brushStrength', () => S.brush.strength, (v) => { S.brush.strength = v; }, (v) => fmt(v, 2));
  bindRange('brushHardness', () => S.brush.hardness, (v) => { S.brush.hardness = v; }, (v) => fmt(v, 2));
  bindRange('brushIntensity', () => S.brush.intensity, (v) => { S.brush.intensity = v; }, (v) => fmt(v, 2));
  bindRange('fillTol', () => S.fillTol, (v) => { S.fillTol = v; });
  updateCoverageOut = bindRange('autoCoverage', () => +$('#autoCoverage').value, () => {}, (v) => fmt(v * 100, 0) + '%');
  bindRange('convTol', () => +$('#convTol').value, () => {});
  bindRange('exDetail', () => S.ex.detail, (v) => { S.ex.detail = v; markDirty(); }, (v) => fmt(v, 1) + ' m');
  bindRange('exag3d', () => t3d.exag, (v) => { t3d.exag = v; t3d.draw(); }, (v) => fmt(v, 1) + '×');
  $('#overlayAlpha').value = S.overlayAlpha;
  $('#overlayAlpha').oninput = (e) => { S.overlayAlpha = +e.target.value; drawOverlay(); };

  $('#btnAddRegion').onclick = addRegion;
  $('#btnAutoLand').onclick = autoLand;
  $('#btnAutoRelief').onclick = autoRelief;
  $('#btnPreset').onclick = applyPreset;
  bindRange('sculptAmt', () => S.sculptAmt, (v) => { S.sculptAmt = v; }, (v) => fmt(v) + ' m');
  $('#sculptTarget').value = S.sculptTarget;
  $('#sculptTarget').onchange = (e) => { S.sculptTarget = +e.target.value || 0; };
  $('#btnWalk').onclick = toggleWalk;
  // as opções do tipo de marcador são montadas pelo ui.js conforme a variante (construção / vegetação-ambiente)
  $('#markerType').onchange = (e) => { S.markerType = e.target.value; UI.rememberMarkerType(); buildMarkerPalette(); };
  $('#btnMapPreview').onclick = openMapPreview;
  $('#exMapSize').onchange = (e) => { S.ex.mapSize = +e.target.value; markDirty(); };
  $('#btnErode').onclick = runErosion;

  $('#btnGuideLoad').onclick = () => $('#fileGuide').click();
  $('#fileGuide').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) loadGuideFile(f); };
  $('#btnGuideRemove').onclick = () => { clearGuide(); markDirty(); };
  $('#guideFit').onchange = (e) => { S.guide.fit = e.target.value; renderGuide(); markDirty(); };
  $('#guideOpacity').oninput = (e) => { S.guide.opacity = +e.target.value; cvG.style.opacity = S.guide.opacity; };
  $('#guideVisible').onchange = (e) => { S.guide.visible = e.target.checked; cvG.style.display = S.guide.visible && S.guide.img ? '' : 'none'; };
  $('#btnConvert').onclick = convertGuide;

  $('#exUe').onchange = (e) => setUeVersion(e.target.value);
  $('#exRes').onchange = (e) => { S.ex.res = +e.target.value; updateWorldSize(); updateStats(); markDirty(); scheduleCompose(0); };
  $('#exMpq').onchange = (e) => { S.ex.mpq = +e.target.value; updateWorldSize(); updateStats(); markDirty(); scheduleCompose(0); };
  $('#exName').onchange = (e) => { S.ex.name = e.target.value.trim() || 'MeuMundo'; e.target.value = S.ex.name; markDirty(); };
  for (const [id, key] of [['exErode', 'erode'], ['exLayers', 'layers'], ['exRegions', 'regions'], ['exVeg', 'veg'], ['exR16', 'r16'], ['exMarkers', 'markers'], ['exMap', 'map']]) $('#' + id).onchange = (e) => { S.ex[key] = e.target.checked; };
  $('#vegShow').onchange = (e) => { S.showVeg = e.target.checked; scheduleVegDraw(); };
  $('#btnExport').onclick = doExport;
  $('#btnGuide').onclick = openGuide;
  $('#modalClose').onclick = () => { $('#modal').hidden = true; };
  $('#modal').onclick = (e) => { if (e.target.id === 'modal') $('#modal').hidden = true; };

  // Novo / Abrir / Salvar / Desfazer / resolução / visualização ficam nos menus (js/ui.js)
  $$('.tabs button').forEach((b) => { b.onclick = () => setMode(b.dataset.view); });
  $('#btnCam3d').onclick = () => t3d.resetCamera();
  $('#fileProject').onchange = (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (f) openFile(f);
  };
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) openFile(f); });
  $('#btnBaseRemove').onclick = removeBase;
  for (const [id, key] of [['baseMin', 'min'], ['baseMax', 'max']]) {
    $('#' + id).onchange = (e) => {
      const v = +e.target.value, i = S.baseInfo;
      const next = { ...i, [key]: v };
      if (!isFinite(v) || !(next.max > next.min)) { e.target.value = i[key]; toast('O branco precisa ficar acima do preto.', true); return; }
      S.baseInfo = next; markDirty(); scheduleCompose(0);
    };
  }
}

function setTool(t) {
  if (t === 'level' && S.active !== 'sculpt') setActive('sculpt');
  if (t === 'river' && S.active !== 'rivers') setActive('rivers');
  if (t !== 'ruler' && S.ruler) { S.ruler = null; renderRuler(); }
  if (t !== 'river' && S.riverA) { S.riverA = null; renderRiverPick(); }
  S.tool = t;
  vp.classList.toggle('pan-tool', t === 'pan');
  UI.sync();
  buildMarkerPalette();
  updateCursorSize();
}

function setMode(m) {
  S.mode = m;
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === m));
  $('#viewport').hidden = m !== '2d';
  $('#view3d').hidden = m !== '3d';
  if (m === '3d') update3D(); else fitViewIfNeeded();
}
function fitViewIfNeeded() { if (!S.view.s || S.view.s === 1) fitView(); }

// ================= resolução de trabalho =================
function resampleF(src, A, B) {
  const out = new Float32Array(B * B), k = (A - 1) / Math.max(1, B - 1);
  for (let y = 0; y < B; y++) {
    const v = y * k, y0 = Math.floor(v), y1 = Math.min(A - 1, y0 + 1), fy = v - y0;
    for (let x = 0; x < B; x++) {
      const u = x * k, x0 = Math.floor(u), x1 = Math.min(A - 1, x0 + 1), fx = u - x0;
      const a = src[y0 * A + x0], b = src[y0 * A + x1], c = src[y1 * A + x0], d = src[y1 * A + x1];
      out[y * B + x] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    }
  }
  return out;
}
function resampleN(src, A, B) {
  const out = new Uint8Array(B * B);
  for (let y = 0; y < B; y++) {
    const sy = Math.min(A - 1, Math.floor(((y + 0.5) * A) / B));
    for (let x = 0; x < B; x++) out[y * B + x] = src[sy * A + Math.min(A - 1, Math.floor(((x + 0.5) * A) / B))];
  }
  return out;
}
function changeWorkRes(B) {
  const A = S.W;
  if (A === B) return;
  for (const id of FLOAT_LAYERS) S.masks[id] = resampleF(S.masks[id], A, B);
  S.regions = resampleN(S.regions, A, B);
  S.veg = resampleN(S.veg, A, B);
  if (S.base) S.base = resampleF(S.base, A, B);
  S.sculpt = resampleF(S.sculpt, A, B);
  S.ruler = null;
  S.brush.size = clamp(Math.round((S.brush.size * B) / A), 2, 400);
  $('#brushSize').value = S.brush.size;
  S.W = B; S.H = null; S.undo = []; S.redo = [];
  setupCanvases(); renderGuide(); drawOverlay(); fitView(); updateWorldSize(); markDirty();
  scheduleCompose(0);
}

// ================= imagem-guia =================
function loadGuideFile(file) {
  const fr = new FileReader();
  fr.onload = () => setGuide(fr.result, {}).then(() => { markDirty(); toast('Imagem carregada. Pinte por cima ou use "Converter".'); });
  fr.readAsDataURL(file);
}
function setGuide(dataURL, opts) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => { S.guide.dataURL = dataURL; S.guide.img = img; Object.assign(S.guide, opts || {}); renderGuide(); updateGuideUI(); res(); };
    img.onerror = () => { toast('Não consegui abrir essa imagem.', true); res(); };
    img.src = dataURL;
  });
}
function clearGuide() {
  Object.assign(S.guide, { dataURL: null, img: null, pixels: null, pick: null });
  renderGuide(); updateGuideUI();
}
function renderGuide() {
  const W = S.W, img = S.guide.img;
  cvG.width = cvG.height = W;
  if (!img) { S.guide.pixels = null; cvG.style.display = 'none'; return; }
  // Fundo = cor do canto da imagem (normalmente papel ou mar), para "Caber inteira" não deixar buraco.
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = 1;
  const t = tmp.getContext('2d'); t.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
  const c = t.getImageData(0, 0, 1, 1).data;
  gctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
  gctx.fillRect(0, 0, W, W);
  gctx.imageSmoothingQuality = 'high';
  const iw = img.naturalWidth, ih = img.naturalHeight, fit = S.guide.fit;
  if (fit === 'stretch') gctx.drawImage(img, 0, 0, W, W);
  else {
    const s = fit === 'cover' ? Math.max(W / iw, W / ih) : Math.min(W / iw, W / ih);
    const dw = iw * s, dh = ih * s;
    gctx.drawImage(img, (W - dw) / 2, (W - dh) / 2, dw, dh);
  }
  S.guide.pixels = gctx.getImageData(0, 0, W, W).data;
  cvG.style.display = S.guide.visible ? '' : 'none';
  cvG.style.opacity = S.guide.opacity;
}
function updateGuideUI() {
  const has = !!S.guide.img;
  $('#guideOpts').hidden = !has;
  $('#btnGuideRemove').disabled = !has;
  $('#guideFit').value = S.guide.fit;
  $('#guideOpacity').value = S.guide.opacity;
  $('#guideVisible').checked = S.guide.visible;
  const p = S.guide.pick;
  $('#pickSwatch').style.background = p ? `rgb(${p.join(',')})` : 'transparent';
  $('#pickHint').textContent = p ? 'cor escolhida' : 'use o conta-gotas no mapa';
}
function convertGuide() {
  if (!S.guide.pixels) { toast('Carregue uma imagem-guia primeiro.'); return; }
  const mode = $('#convMode').value, tol = +$('#convTol').value;
  if (mode === 'color' && !S.guide.pick) { toast('Escolha a cor com o Conta-gotas (clique no mapa).'); setTool('pick'); return; }
  snapshot([S.active]);
  const arr = getArr(S.active), isId = isIdLayer(S.active);
  if (S.active === 'regions' && !S.regionDefs.length) addRegion();
  const val = isId ? idBrush() : S.brush.intensity, replace = $('#convReplace').checked, invert = $('#convInvert').checked;
  const g = S.guide.pixels, N = S.W * S.W;
  const [pr, pg, pb] = S.guide.pick || [0, 0, 0];
  const t2 = (tol * 4.42) ** 2, thr = tol / 100;
  let count = 0;
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    let match;
    if (mode === 'color') { const dr = g[o] - pr, dg = g[o + 1] - pg, db = g[o + 2] - pb; match = dr * dr + dg * dg + db * db <= t2; }
    else { const lum = (0.299 * g[o] + 0.587 * g[o + 1] + 0.114 * g[o + 2]) / 255; match = mode === 'dark' ? lum <= thr : lum >= 1 - thr; }
    if (invert) match = !match;
    if (match) { arr[i] = val; count++; } else if (replace) arr[i] = 0;
  }
  afterMaskChange(S.active);
  toast(`${fmt((count / N) * 100, 1)}% do mapa marcado em "${layerDef(S.active).name}".`);
}

// ================= abrir imagens (.png / .jpg / .jpeg) =================
async function openFile(f) {
  const name = f.name.toLowerCase();
  try {
    if (name.endsWith('.forja')) { await deserializeProject(f); toast('Projeto aberto.'); return; }
    if (/\.(png|jpe?g)$/.test(name) || /^image\/(png|jpeg)$/.test(f.type)) { await openImageDialog(f); return; }
    toast('Formato não suportado. Use .forja, .png, .jpg ou .jpeg.', true);
  } catch (err) { showError(err); }
}

function pngInfo(b) {
  if (b[0] !== 137 || b[1] !== 80 || b[2] !== 78 || b[3] !== 71) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { w: dv.getUint32(16), h: dv.getUint32(20), bits: b[24], colorType: b[25] };
}

async function openImageDialog(file) {
  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const info = pngInfo(head);
  const url = URL.createObjectURL(file);
  const dims = info || await new Promise((res) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight, bits: 8 }); im.onerror = () => res(null); im.src = url; });
  if (!dims) { URL.revokeObjectURL(url); toast('Não consegui ler essa imagem.', true); return; }
  const gray = info ? (info.colorType === 0 || info.colorType === 4) : false;
  const looksHeight = gray || /height|altura|_hm/i.test(file.name);
  const bitsTxt = info ? `${info.bits}-bit${gray ? ', tons de cinza' : ', colorida'}` : 'JPEG 8-bit';
  const fromForja = /_heightmap\.png$/i.test(file.name);
  $('#modalBody').innerHTML = `
    <h2>Abrir imagem</h2>
    <p>${escapeHtml(file.name)} — ${dims.w} × ${dims.h} px (${bitsTxt})</p>
    <img src="${url}" class="dlg-thumb" alt="">
    <h3>Como usar esta imagem?</h3>
    <div class="choice">
      <button id="imgAsGuide" class="wide${looksHeight ? '' : ' accent'}">Imagem-guia (desenho do mapa)</button>
      <p class="hint">Fica por baixo do mapa para você pintar em cima, ou converter as cores em camadas. Ideal para um mapa desenhado à mão, no Paint ou foto do papel.</p>
    </div>
    <div class="choice">
      <button id="imgAsHeight" class="wide${looksHeight ? ' accent' : ''}">Heightmap (relevo em tons de cinza)</button>
      <p class="hint">Preto = baixo, branco = alto. Ideal para heightmap de outro programa ou exportado daqui. PNG 16-bit mantém a precisão total; JPG e PNG 8-bit têm só 256 níveis e podem sair em degraus.</p>
      <label class="row">Preto (m) <input type="number" id="impMin" value="-50" step="1"></label>
      <label class="row">Branco (m) <input type="number" id="impMax" value="1000" step="1"></label>
      <p class="hint">${fromForja ? 'Este parece um export da Forja: use a altitude mínima e máxima escritas no LEIA-ME_Unreal.txt dele.' : 'Altura em metros do pixel mais escuro e do mais claro. O que ficar abaixo de 0 m vira mar.'}</p>
    </div>`;
  $('#modal').hidden = false;
  const close = () => { $('#modal').hidden = true; URL.revokeObjectURL(url); };
  $('#imgAsGuide').onclick = () => {
    close();
    const fr = new FileReader();
    fr.onload = () => setGuide(fr.result, {}).then(() => { markDirty(); toast('Imagem-guia carregada. Pinte por cima ou use "Converter".'); });
    fr.readAsDataURL(file);
  };
  $('#imgAsHeight').onclick = async () => {
    const min = +$('#impMin').value, max = +$('#impMax').value;
    if (!(max > min)) { toast('A altura do branco precisa ser maior que a do preto.', true); return; }
    close();
    try { await importHeightmap(file, min, max); } catch (err) { showError(err); }
  };
}

// Decodificador de PNG próprio: o canvas do navegador reduz PNG 16-bit para 8-bit.
async function decodePNG(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let p = 8, w = 0, h = 0, bd = 0, ct = 0, il = 0;
  const idat = [];
  while (p + 8 <= b.length) {
    const len = dv.getUint32(p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
    if (type === 'IHDR') { w = dv.getUint32(p + 8); h = dv.getUint32(p + 12); bd = b[p + 16]; ct = b[p + 17]; il = b[p + 20]; }
    else if (type === 'IDAT') idat.push(b.subarray(p + 8, p + 8 + len));
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  if (!ch || il !== 0 || (bd !== 8 && bd !== 16)) return null; // paleta, entrelaçado etc.: usa o navegador
  const raw = new Uint8Array(await new Response(new Blob(idat).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const bpp = (ch * bd) / 8, rb = w * bpp;
  const out = new Float32Array(w * h);
  let prev = new Uint8Array(rb), cur = new Uint8Array(rb);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (rb + 1)], src = raw.subarray(y * (rb + 1) + 1, (y + 1) * (rb + 1));
    for (let i = 0; i < rb; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, up = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let x = src[i];
      if (f === 1) x += a;
      else if (f === 2) x += up;
      else if (f === 3) x += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); x += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      cur[i] = x & 255;
    }
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const o = x * bpp;
      if (bd === 16) {
        out[row + x] = ch >= 3
          ? (0.299 * ((cur[o] << 8) | cur[o + 1]) + 0.587 * ((cur[o + 2] << 8) | cur[o + 3]) + 0.114 * ((cur[o + 4] << 8) | cur[o + 5])) / 65535
          : ((cur[o] << 8) | cur[o + 1]) / 65535;
      } else {
        out[row + x] = ch >= 3 ? (0.299 * cur[o] + 0.587 * cur[o + 1] + 0.114 * cur[o + 2]) / 255 : cur[o] / 255;
      }
    }
    const t = prev; prev = cur; cur = t;
  }
  return { w, h, data: out, bits: bd };
}

async function decodeHeightImage(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let img = null;
  if (pngInfo(buf)) { try { img = await decodePNG(buf); } catch (err) { console.warn('PNG próprio falhou, usando o navegador:', err); } }
  if (!img) {
    const bmp = await createImageBitmap(file);
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, v = new Float32Array(c.width * c.height);
    for (let i = 0; i < v.length; i++) v[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
    img = { w: c.width, h: c.height, data: v, bits: 8 };
  }
  return img;
}

// Pega o quadrado central e leva para W×W (média por bloco ao reduzir, bilinear ao ampliar).
function imageToSquare(img, W) {
  const side = Math.min(img.w, img.h), ox = (img.w - side) >> 1, oy = (img.h - side) >> 1;
  const out = new Float32Array(W * W), k = side / W, src = img.data;
  if (k >= 2) {
    for (let y = 0; y < W; y++) {
      const y0 = oy + Math.floor(y * k), y1 = oy + Math.floor((y + 1) * k);
      for (let x = 0; x < W; x++) {
        const x0 = ox + Math.floor(x * k), x1 = ox + Math.floor((x + 1) * k);
        let s = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) s += src[yy * img.w + xx];
        out[y * W + x] = s / ((y1 - y0) * (x1 - x0));
      }
    }
  } else {
    const kk = (side - 1) / Math.max(1, W - 1);
    for (let y = 0; y < W; y++) {
      const v = y * kk, y0 = Math.floor(v), y1 = Math.min(side - 1, y0 + 1), fy = v - y0;
      for (let x = 0; x < W; x++) {
        const u = x * kk, x0 = Math.floor(u), x1 = Math.min(side - 1, x0 + 1), fx = u - x0;
        const r0 = (oy + y0) * img.w + ox, r1 = (oy + y1) * img.w + ox;
        out[y * W + x] = (src[r0 + x0] * (1 - fx) + src[r0 + x1] * fx) * (1 - fy) + (src[r1 + x0] * (1 - fx) + src[r1 + x1] * fx) * fy;
      }
    }
  }
  return out;
}

async function importHeightmap(file, min, max) {
  if (S.base && !confirm('Substituir o heightmap base atual?')) return;
  busyCount++; setTask('Lendo heightmap…', null);
  let img;
  try { img = await decodeHeightImage(file); } finally { busyCount--; setTask('', null); }
  S.base = imageToSquare(img, S.W);
  S.baseInfo = { name: file.name, min, max, bits: img.bits, srcW: img.w, srcH: img.h };
  // O heightmap já traz o relevo: as camadas de relevo pintadas antes somariam em dobro, então começam vazias
  // (Ctrl+Z traz de volta). Terra/Mar acompanha o heightmap: se remover a base depois, a costa continua igual.
  snapshot([...FLOAT_LAYERS, 'sculpt']);
  for (const id of ['mountains', 'hills', 'plateau', 'flatten', 'rivers']) S.masks[id].fill(0);
  S.sculpt.fill(0);
  const span = max - min, land = S.masks.land;
  for (let i = 0; i < land.length; i++) land[i] = min + S.base[i] * span > 0 ? 1 : 0;
  if (img.w === img.h && UE.RESOLUTIONS.some((r) => r.res === img.w)) { S.ex.res = img.w; buildExportPanel(); }
  updateBasePanel(); drawOverlay(); markDirty(); scheduleCompose(0);
  const notes = [];
  if (img.w !== img.h) notes.push('não é quadrada: usei o quadrado central');
  if (img.bits === 8) notes.push('é 8-bit: o relevo pode sair em degraus');
  toast('Heightmap importado' + (notes.length ? ' — ' + notes.join('; ') + '.' : '.'), notes.length > 0);
}

function updateBasePanel() {
  const has = !!S.base;
  $('#basePanel').hidden = !has;
  if (!has) return;
  const i = S.baseInfo;
  $('#baseName').innerHTML = `<b>${escapeHtml(i.name)}</b><br>${i.srcW} × ${i.srcH} px, ${i.bits}-bit`;
  $('#baseMin').value = i.min; $('#baseMax').value = i.max;
}
function removeBase() {
  if (!confirm('Remover o heightmap base? O relevo volta a ser gerado a partir da pintura (a costa fica igual).')) return;
  S.base = null;
  updateBasePanel(); markDirty(); scheduleCompose(0);
}

// ================= projeto: salvar / abrir / automático =================
async function serializeProject() {
  const header = {
    format: 'forja-mundos', version: 5, W: S.W, base: S.base ? S.baseInfo : null, sculpt: true, veg: true, markers: S.markers, markerSeq: S.markerSeq, P: S.P, ex: S.ex, regionDefs: S.regionDefs, layers: FLOAT_LAYERS,
    guide: S.guide.dataURL ? { dataURL: S.guide.dataURL, fit: S.guide.fit, opacity: S.guide.opacity, visible: S.guide.visible } : null,
    savedAt: new Date().toISOString()
  };
  const hb = new TextEncoder().encode(JSON.stringify(header));
  const N = S.W * S.W;
  const body = new Uint8Array(4 + hb.length + N * (FLOAT_LAYERS.length + 1) + (S.base ? N * 2 : 0) + N * 4 + N);
  new DataView(body.buffer).setUint32(0, hb.length, true);
  body.set(hb, 4);
  let off = 4 + hb.length;
  for (const id of FLOAT_LAYERS) {
    const a = S.masks[id];
    for (let i = 0; i < N; i++) body[off + i] = Math.round(clamp(a[i], 0, 1) * 255);
    off += N;
  }
  body.set(S.regions, off);
  off += N;
  if (S.base) {
    const u = new Uint16Array(N);
    for (let i = 0; i < N; i++) u[i] = Math.round(clamp(S.base[i], 0, 1) * 65535);
    body.set(new Uint8Array(u.buffer), off);
    off += N * 2;
  }
  body.set(new Uint8Array(S.sculpt.buffer, S.sculpt.byteOffset, N * 4), off);
  off += N * 4;
  body.set(S.veg, off); // v5: vegetação (1 byte por ponto)
  return new Response(new Blob([body]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
}
async function deserializeProject(blob) {
  const buf = new Uint8Array(await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  const hl = new DataView(buf.buffer).getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(buf.subarray(4, 4 + hl)));
  if (header.format !== 'forja-mundos') throw new Error('Este arquivo não é um projeto da Forja de Mundos.');
  const W = header.W, N = W * W;
  let off = 4 + hl;
  const masks = emptyMasks(W);
  for (const id of header.layers) {
    if (masks[id]) { const a = masks[id]; for (let i = 0; i < N; i++) a[i] = buf[off + i] / 255; }
    off += N;
  }
  S.W = W; S.masks = masks; S.regions = buf.slice(off, off + N);
  off += N;
  S.base = null; S.baseInfo = null;
  if (header.base) {
    const u = new Uint16Array(buf.slice(off, off + N * 2).buffer);
    S.base = new Float32Array(N);
    for (let i = 0; i < N; i++) S.base[i] = u[i] / 65535;
    S.baseInfo = header.base;
    off += N * 2;
  }
  S.sculpt = header.sculpt ? new Float32Array(buf.slice(off, off + N * 4).buffer) : new Float32Array(N);
  if (header.sculpt) off += N * 4;
  S.veg = header.veg ? buf.slice(off, off + N) : new Uint8Array(N);
  S.P = { ...DEFAULT_P, ...header.P };
  S.ex = { ...S.ex, ...header.ex };
  S.regionDefs = header.regionDefs || [];
  S.markers = header.markers || []; S.markerSeq = header.markerSeq || S.markers.length; S.markerSel = null;
  S.regionBrush = 1; S.undo = []; S.redo = []; S.H = null; S.lastExport = null;
  setupCanvases();
  if (header.guide) await setGuide(header.guide.dataURL, { fit: header.guide.fit, opacity: header.guide.opacity, visible: header.guide.visible });
  else clearGuide();
  refreshParamInputs(); buildExportPanel(); setActive(S.active); updateBasePanel(); fitView(); buildMarkerList(); renderMarkers(); buildVegList(); scheduleVegDraw();
  S.dirty = false;
  scheduleCompose(0);
}
async function saveProjectFile() {
  try {
    const blob = await serializeProject();
    download(blob, fileSafe(S.ex.name) + '.forja');
    toast('Projeto salvo. Guarde o arquivo .forja para continuar depois.');
  } catch (err) { showError(err); }
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

// Salvamento automático no navegador (IndexedDB). Se falhar, a ferramenta segue funcionando.
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('forja-mundos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbSet(k, v) {
  const db = await idbOpen();
  await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  db.close();
}
async function idbGet(k) {
  const db = await idbOpen();
  const v = await new Promise((res, rej) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  db.close();
  return v;
}
let autosaving = false;
async function autosave() {
  if (!S.dirty || autosaving) return;
  autosaving = true; S.dirty = false;
  try {
    await idbSet('autosave', await serializeProject());
    $('#stSave').textContent = 'Salvo automaticamente às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch (err) {
    $('#stSave').textContent = 'Salvamento automático indisponível — use Salvar';
  } finally { autosaving = false; }
}

async function newProject(ask = true) {
  if (ask && !confirm('Começar um mundo novo? O atual some (salve antes se quiser guardar).')) return;
  S.masks = emptyMasks(S.W);
  S.regions = new Uint8Array(S.W * S.W);
  S.sculpt = new Float32Array(S.W * S.W);
  S.veg = new Uint8Array(S.W * S.W); scheduleVegDraw(); buildVegList();
  S.ruler = null;
  S.markers = []; S.markerSel = null; S.markerSeq = 0; renderMarkers(); buildMarkerList();
  S.regionDefs = [1, 2, 3, 4].map((n) => ({ name: `Região ${n}`, color: REGION_COLORS[n - 1] }));
  S.regionBrush = 1; S.undo = []; S.redo = []; S.lastExport = null;
  S.base = null; S.baseInfo = null; updateBasePanel();
  clearGuide();
  setupCanvases(); setActive('land'); drawOverlay();
  await autoLand();
  await autoRelief();
  S.undo = [];
}

// ================= exportação =================
async function doExport() {
  if (!S.H) { toast('Espere o terreno terminar de gerar.'); return; }
  if (!S.masks.land.some((v) => v > 0.5)) { toast('O mundo está todo no mar. Pinte ou gere terra primeiro.'); return; }
  const res = S.ex.res, mpq = S.ex.mpq, combo = UE.best(res), base = fileSafe(S.ex.name);
  const tiles = UE.tilesFor(res);
  if (tiles > 1 && !confirm(`Mundo gigante: ${tiles * tiles} pedaços de ${res / tiles}×${res / tiles} (total ${res}×${res}, ${fmt(UE.worldKm(res, mpq), 1)} km).\nPode levar vários minutos. No Unreal, só importa em nível com World Partition.\nDica: use a resolução de trabalho 2048 para mais detalhe.\nContinuar?`)) return;
  if (tiles === 1 && res >= 8129 && !confirm('8129×8129 tem 66 milhões de pontos. A exportação pode levar alguns minutos e usar 1–2 GB de memória. Continuar?')) return;
  const btn = $('#btnExport'); btn.disabled = true;
  try {
    await flushCompose();
    if (S.ex.erode && !S.eroded) applyHeight(await call('erode', { P: S.P, mode: S.display }));
    const extraFiles = [];
    const withMarkers = S.ex.markers && S.markers.length > 0;
    if (withMarkers) {
      extraFiles.push({ name: 'marcadores/' + base + '_marcadores.csv', blob: new Blob(['\ufeff' + markersCSV()], { type: 'text/csv' }) });
      extraFiles.push({ name: 'marcadores/' + base + '_marcadores.json', blob: new Blob([markersJSON()], { type: 'application/json' }) });
    }
    let vegNames = [];
    if (S.ex.veg !== false) {
      busyCount++; setTask('Gravando máscaras de vegetação…', null);
      try { const vf = await vegExportFiles(base); extraFiles.push(...vf); vegNames = VEG_TYPES.filter((v) => S.veg.some((x) => x === v.id)).map((v) => v.name); } finally { busyCount--; setTask('', null); }
    }
    if (S.ex.map) {
      busyCount++; setTask('Desenhando o mapa do jogo…', null);
      await new Promise((r) => setTimeout(r, 30));
      try {
        extraFiles.push({ name: 'mapa/' + base + '_mapa.png', blob: await canvasBlob(renderGameMap(S.ex.mapSize, true)) });
        extraFiles.push({ name: 'mapa/' + base + '_mapa_limpo.png', blob: await canvasBlob(renderGameMap(S.ex.mapSize, false)) });
      } finally { busyCount--; setTask('', null); }
    }
    const half = ((res - 1) / 2) * mpq * 100;
    const tpl = UE.readmeTemplate({ name: S.ex.name, base, res, mpq, combo, ue: S.ex.ue, map: S.ex.map ? { half, sizeCm: half * 2 } : null, markers: withMarkers ? S.markers.length : 0, veg: vegNames });
    const r = await call('export', {
      P: S.P, erode: S.ex.erode, res, worldM: worldM(), detailAmp: S.ex.detail, detailWave: 40,
      r16: S.ex.r16, layers: S.ex.layers, regions: S.ex.regions, regionMasks: S.ex.regions,
      regionIds: S.regions, regionDefs: S.regionDefs, name: S.ex.name, tiles, extraFiles,
      unreal: { version: UE.version(S.ex.ue).label, res, mpq, tiles, scaleXY: mpq * 100, ...combo }, readmeTemplate: tpl
    });
    download(r.blob, base + '_unreal.zip');
    S.lastExport = { res, mpq, combo, mn: r.mn, mx: r.mx, zScale: r.zScale, locZ: r.locZ, stepCm: r.stepCm };
    S.changedSinceExport = false;
    openGuide();
  } catch (err) { showError(err); } finally { btn.disabled = false; }
}

// ================= guia do Unreal =================
function versionOptions(sel) {
  return UE.VERSIONS.map((v) => `<option value="${v.id}"${v.id === sel ? ' selected' : ''}>${v.label}</option>`).join('');
}
function setUeVersion(id) {
  S.ex.ue = UE.version(id).id;
  $('#exUe').value = S.ex.ue;
  try { localStorage.setItem('forja.ue', S.ex.ue); } catch (e) { /* só conveniência */ }
  buildExportPanel(); markDirty();
}

function openGuide() {
  const v = UE.version(S.ex.ue);
  const res = S.ex.res, mpq = S.ex.mpq, b = UE.best(res), auto = UE.unrealAuto(res), km = UE.worldKm(res, mpq), tier = UE.sizeTier(km, v);
  const reg = UE.regionStep(v, b.comps);
  const le = S.lastExport;
  const exact = le && le.res === res && le.mpq === mpq && !S.changedSinceExport;
  let mn, mx, z;
  if (exact) { mn = le.mn; mx = le.mx; z = { zScale: le.zScale, locZ: le.locZ, stepCm: le.stepCm }; }
  else if (S.stats) { mn = Math.floor(S.stats.min - S.ex.detail); mx = Math.ceil(S.stats.max + S.ex.detail); z = UE.zValues(mn, mx); }
  else { mn = -100; mx = 1000; z = UE.zValues(mn, mx); }
  const badge = exact ? '<span class="badge ok">valores exatos do último export</span>' : '<span class="badge warn">estimado — o valor exato sai no LEIA-ME do .zip</span>';
  const base = fileSafe(S.ex.name), tiles = UE.tilesFor(res), sfx = tiles > 1 ? '_x0_y0' : '';
  const others = UE.combos(res).map((c) => {
    const isBest = c.sectionQuads === b.sectionQuads && c.sectionsPerComp === b.sectionsPerComp;
    const note = isBest ? 'recomendado' : c.comps > 32 ? 'componentes demais (custo de CPU)' : c.sectionsPerComp === 1 ? 'válido; 1×1 tem LOD menos granular' : 'válido';
    return `<tr class="${isBest ? 'best' : ''}"><td class="v">${c.sectionQuads}x${c.sectionQuads}</td><td class="v">${c.sectionsPerComp}x${c.sectionsPerComp}</td><td class="v">${c.comps} x ${c.comps}</td><td>${fmt(c.comps * c.comps)}</td><td>${note}</td></tr>`;
  }).join('');
  const sizes = UE.RESOLUTIONS.map((r) => `<tr class="${r.res === res ? 'best' : ''}"><td class="v">${r.res}${r.star ? ' ★' : ''}</td>${[0.5, 1, 2, 4].map((m) => `<td${r.res === res && m === mpq ? ' class="v"' : ''}>${fmt(UE.worldKm(r.res, m), 1)} km</td>`).join('')}</tr>`).join('');
  const regionRow = reg
    ? `<tr><td>World Partition Region Size</td><td class="v">padrão</td><td>${reg.conditional ? '<b>só se o campo aparecer</b> (não confirmado nesta versão). ' : 'em nível com World Partition. '}${reg.value} = um pedaço só, sempre carregado (só para mundos pequenos)</td></tr>`
    : '';
  const regionHint = reg
    ? '<p class="hint"><b>Region Size:</b> com o padrão, o Unreal divide o Landscape em pedaços (Streaming Proxies) que carregam perto do jogador, o certo para mundo aberto. Logo depois do Import os pedaços podem ficar <b>descarregados</b> e o terreno não aparece: abra <i>Window → World Partition</i>, selecione todas as células e clique em <b>Load Region from Selection</b>. Depois salve tudo (<b>File → Save All</b>).</p>'
    : (v.wp ? '<p class="hint">Nesta versão não existe o campo World Partition Region Size: o Landscape é criado inteiro e fica carregado.</p>' : '');
  const autoTxt = v.engine === 5
    ? `O Unreal preenche sozinho <span class="v">${auto.sectionQuads}x${auto.sectionQuads} · ${auto.sectionsPerComp}x${auto.sectionsPerComp} · ${auto.comps} x ${auto.comps}</span>.`
    : 'O Unreal pode preencher sozinho outros valores válidos.';

  $('#modalBody').innerHTML = `
    <h2>Guia do Unreal — ${escapeHtml(S.ex.name)}</h2>
    <div class="guide-head">
      <label>Versão do Unreal <select id="guideUe">${versionOptions(v.id)}</select></label>
      ${badge}
    </div>
    <p class="hint">${escapeHtml(v.src)}</p>
    ${tiles > 1 ? `<p class="warn-box"><b>Mundo em ${tiles}×${tiles} pedaços</b> de ${res / tiles}×${res / tiles}. O Unreal só aceita pedaços em nível com <b>World Partition</b> (template Open World); num nível comum ele pede arquivo único. Deixe todos os pedaços na mesma pasta.</p>` : ''}

    <h3>1. Criar o Landscape</h3>
    <p>${escapeHtml(UE.modePath(v))} → clique em <b>Import from File</b>.
      Não use <i>Create New</i>: ele cria um terreno plano e ignora o arquivo.</p>
    <p>Escolha o <b>Heightmap File</b>. ${autoTxt} Funciona, mas troque para o recomendado (menos componentes = menos custo de CPU):</p>
    <table class="ue-table">
      <tr><th>Campo</th><th>Valor</th><th></th></tr>
      <tr><td>Heightmap File</td><td class="v">${base}_heightmap${sfx}.png</td><td>${tiles > 1 ? `o Unreal acha os outros ${tiles * tiles - 1} pedaços sozinho` : 'PNG 16-bit em tons de cinza'}</td></tr>
      <tr><td>Section Size</td><td class="v">${b.sectionQuads}x${b.sectionQuads} Quads</td><td></td></tr>
      <tr><td>Sections Per Component</td><td class="v">${b.sectionsPerComp}x${b.sectionsPerComp} Sections</td><td></td></tr>
      <tr><td>Number of Components</td><td class="v">${b.comps} x ${b.comps}</td><td>total ${fmt(b.comps * b.comps)}</td></tr>
      <tr><td>Overall Resolution</td><td class="v">${res} x ${res}</td><td>confira que bate</td></tr>
      ${regionRow}
    </table>
    ${regionHint}

    <h3>2. Transform (mesmo painel)</h3>
    <table class="ue-table">
      <tr><td>Location X / Y</td><td class="v">0 / 0</td><td>${v.engine === 5 ? 'o Unreal centraliza o terreno nesse ponto' : ''}</td></tr>
      <tr><td>Location Z</td><td class="v">${z.locZ.toFixed(2)}</td><td>deixa o nível do mar em Z = 0</td></tr>
      <tr><td>Scale X</td><td class="v">${mpq * 100}</td><td>${mpq} m entre vértices</td></tr>
      <tr><td>Scale Y</td><td class="v">${mpq * 100}</td><td></td></tr>
      <tr><td>Scale Z</td><td class="v">${z.zScale.toFixed(4)}</td><td>faixa de ${fmt(mn)} m a ${fmt(mx)} m</td></tr>
    </table>
    <p>Depois clique no botão <b>Import</b> no fim do painel. Para achar o terreno: no Outliner selecione <b>Landscape</b> e aperte <b>F</b>.
      O mundo tem ${fmt(km, 1)} km, então afaste bastante a câmera. O terreno só é visível de cima; se a câmera estiver por baixo dele, não aparece nada.</p>
    <p class="hint"><b>O Scale Z é obrigatório:</b> o PNG não guarda metros, só tons de cinza de 0 a 65535. Com o Scale Z padrão (100) o Unreal espreme o relevo inteiro em cerca de 512 m e ele fica achatado.
      A ferramenta calcula o Scale Z para caber exatamente do ponto mais fundo ao pico mais alto, com precisão de ${z.stepCm.toFixed(2)} cm, e o Location Z que combina com ele.</p>
    <div class="warn-box"><b>Não aparece nada?</b> Confira nesta ordem:
      <ul>
        <li>O Outliner tem um ator <b>Landscape</b>? Se não tem, a importação não aconteceu: refaça e clique em <b>Import</b>.</li>
        <li>No menu <b>Show</b> da janela 3D (ícone de olho), a opção <b>Landscape</b> precisa estar marcada (atalho <b>Alt+L</b>, fácil de apertar sem querer).</li>
        <li>Nível vazio (Empty Level) não tem luz nem céu: o terreno fica preto no fundo preto. Teste com <b>Alt+3</b> (modo Unlit) ou crie o nível pelo template <b>Open World</b>.</li>
        ${v.wp ? '<li>World Partition: <b>Window → World Partition</b>, selecione as células e <b>Load Region from Selection</b>.</li>' : ''}
      </ul>
      <b>Pronto: com o terreno aparecendo, a importação acabou.</b> O resto desta página (material, água, mapa) é para quando for montar o mundo, não é obrigatório agora.</div>

    <h3>3. O que isso gera</h3>
    <ul>
      <li>Mundo de <b>${fmt(km, 2)} km × ${fmt(km, 2)} km</b> (${fmt(km * km, 1)} km²), ${fmt(res * res)} vértices.</li>
      <li>Altitude de ${fmt(mn)} m a ${fmt(mx)} m; o mar fica em Z = 0 (${v.engine === 5 ? 'ponha o Water Body Ocean ou um plano de água ali' : 'ponha um plano de água ali'}).</li>
      <li><b>${tier.name}:</b> ${tier.text}</li>
      <li>Camadas de material: crie no material do Landscape as camadas <b>Grama, Rocha, Areia, Neve</b> e aponte cada uma para o PNG da pasta <code>camadas/</code> (na importação, ou depois em Paint → Target Layers).</li>
    </ul>

    <h3>4. Mapa do jogo e marcadores</h3>
    <p><b>Mapa (pasta <code>mapa/</code>):</b> é uma imagem para a interface, não passa pelo PCG. Importe como textura (Texture Group = UI, Compression = UserInterface2D, Mip Gen Settings = NoMipmaps) e use num Widget de mapa/minimapa.
      O mapa cobre o mundo inteiro, centro em X = 0 / Y = 0, topo da imagem = Y negativo. Posição de um ator na imagem (0 a 1):</p>
    <p class="v">U = (X + ${fmt(((res - 1) / 2) * mpq * 100).replace(/\./g, '')}) / ${fmt((res - 1) * mpq * 100).replace(/\./g, '')} &nbsp;&nbsp; V = (Y + ${fmt(((res - 1) / 2) * mpq * 100).replace(/\./g, '')}) / ${fmt((res - 1) * mpq * 100).replace(/\./g, '')}</p>
    <p><b>Marcadores (pasta <code>marcadores/</code>):</b> CSV pronto para virar Data Table. Crie uma Structure com <span class="v">Nome (String) · Tipo (String) · Regiao (String) · Posicao (Vector)</span>, arraste o CSV para o Content Browser e escolha essa Structure. A Posicao já vem em cm no mesmo sistema do Landscape.</p>
    <ul>${UE.markerUsage(v).map((l) => `<li>${escapeHtml(l.replace(/^[a-e]\) /, ''))}</li>`).join('')}</ul>

    <h3>Outras combinações válidas para ${res} × ${res}</h3>
    <table class="ue-table"><tr><th>Section Size</th><th>Sections/Comp.</th><th>Components</th><th>Total</th><th></th></tr>${others}</table>

    <h3>Tamanho do mundo por resolução e metros por vértice</h3>
    <table class="ue-table"><tr><th>Resolução</th><th>0,5 m</th><th>1 m</th><th>2 m</th><th>4 m</th></tr>${sizes}</table>
    <p class="hint">★ = tamanhos listados pela Epic. 1 m é o padrão do Unreal. 2 m dá um mundo 4× maior em área com o mesmo custo; o detalhe fino passa a vir do material e da vegetação.</p>

    <h3>Como deixar um mapa grande leve</h3>
    <ul>${UE.perfTips(v).map(([k, d]) => `<li><b>${k}</b>: ${d}</li>`).join('')}</ul>`;
  $('#guideUe').onchange = (e) => { setUeVersion(e.target.value); openGuide(); };
  $('#modal').hidden = false;
}

// ================= 3D =================
const t3d = new Terrain3D($('#cv3d'));
if (!t3d.ok) $('#no3d').hidden = false;
function sync3DParams() {
  t3d.params = { snow: S.P.snowLine, beach: S.P.beachHeight, rock: S.P.rockSlope, deep: S.P.oceanDepth };
  t3d.draw();
}
function update3D() {
  if (!t3d.ok || !S.H) return;
  sync3DParams();
  if (view3dDirty) { t3d.setHeights(S.H, S.W, worldM()); view3dDirty = false; }
  t3d.draw();
}

// ================= régua e barra de escala =================
const rulerSvg = $('#rulerSvg');
function mapToScreen(p) { return { x: p.x * S.view.s + S.view.tx, y: p.y * S.view.s + S.view.ty }; }
function heightAtMap(x, y) {
  if (!S.H || S.H.length !== S.W * S.W) return null;
  const W = S.W, gx = clamp(x, 0, W - 1.001), gy = clamp(y, 0, W - 1.001), x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, i = y0 * W + x0;
  const x1 = Math.min(W - 1, x0 + 1) - x0, y1 = (Math.min(W - 1, y0 + 1) - y0) * W;
  return (S.H[i] * (1 - fx) + S.H[i + x1] * fx) * (1 - fy) + (S.H[i + y1] * (1 - fx) + S.H[i + y1 + x1] * fx) * fy;
}
function renderRuler() {
  const r = S.ruler;
  // SVG não tem a propriedade .hidden (só elementos HTML): mexe no atributo direto
  if (!r || S.mode !== '2d') { rulerSvg.setAttribute('hidden', ''); return; }
  rulerSvg.removeAttribute('hidden');
  const a = mapToScreen(r.a), b = mapToScreen(r.b);
  const c = cellM(), distM = Math.hypot(r.b.x - r.a.x, r.b.y - r.a.y) * c;
  const ha = heightAtMap(r.a.x, r.a.y), hb = heightAtMap(r.b.x, r.b.y);
  // perfil de altura ao longo da linha
  const NS = 64, prof = [];
  for (let k = 0; k <= NS; k++) { const t = k / NS; prof.push(heightAtMap(r.a.x + (r.b.x - r.a.x) * t, r.a.y + (r.b.y - r.a.y) * t) ?? 0); }
  const pmin = Math.min(0, ...prof), pmax = Math.max(1, ...prof);
  const dh = ha != null && hb != null ? hb - ha : null;
  const lines = [
    `Distância: ${distM >= 1000 ? fmt(distM / 1000, 2) + ' km' : fmt(distM, 0) + ' m'}`,
    ha != null ? `Altura: ${fmt(ha, 0)} m → ${fmt(hb, 0)} m (${dh >= 0 ? '+' : ''}${fmt(dh, 0)} m)` : '',
    dh != null && distM > 0 ? `Inclinação média: ${fmt((dh / distM) * 100, 1)}% (${fmt((Math.atan(Math.abs(dh) / distM) * 180) / Math.PI, 1)}°)` : '',
    `A pé (5 km/h): ${fmt(distM / 1000 / 5 * 60, 0)} min · a cavalo (15 km/h): ${fmt(distM / 1000 / 15 * 60, 0)} min`
  ].filter(Boolean);
  const bw = 290, bh = 18 * lines.length + 62;
  const vr = vp.getBoundingClientRect();
  // caixa ao lado do ponto final, para não cobrir a linha
  let bx = b.x + (b.x >= a.x ? 14 : -bw - 14), by = b.y + (b.y >= a.y ? 14 : -bh - 14);
  bx = clamp(bx, 4, vr.width - bw - 4); by = clamp(by, 4, vr.height - bh - 4);
  const px0 = bx + 10, pw = bw - 20, py0 = by + 18 * lines.length + 12, ph = 40;
  const pts = prof.map((h, k) => `${(px0 + (k / NS) * pw).toFixed(1)},${(py0 + ph - ((h - pmin) / (pmax - pmin)) * ph).toFixed(1)}`).join(' ');
  const seaY = py0 + ph - ((0 - pmin) / (pmax - pmin)) * ph;
  rulerSvg.innerHTML = `
    <line class="rl-shadow" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>
    <line class="rl-line" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>
    <circle class="rl-dot" cx="${a.x}" cy="${a.y}" r="4"/><circle class="rl-dot" cx="${b.x}" cy="${b.y}" r="4"/>
    <rect class="rl-box" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6"/>
    ${lines.map((t, k) => `<text class="rl-text" x="${bx + 10}" y="${by + 18 + k * 18}">${escapeHtml(t)}</text>`).join('')}
    ${pmin < 0 ? `<line class="rl-sea" x1="${px0}" y1="${seaY}" x2="${px0 + pw}" y2="${seaY}"/>` : ''}
    <polyline class="rl-prof" points="${pts}"/>`;
}

const NICE = [1, 2, 5];
function updateScaleBar() {
  const mpp = cellM() / S.view.s; // metros por pixel de tela
  let best = null;
  for (let e = 0; e < 7 && !best; e++) for (const m of NICE) { const v = m * 10 ** e; if (v / mpp >= 70) { best = v; break; } }
  if (!best) best = 1e6;
  $('#scaleBarLine').style.width = best / mpp + 'px';
  $('#scaleBarText').textContent = best >= 1000 ? fmt(best / 1000) + ' km' : fmt(best) + ' m';
}

// ================= rio entre dois pontos =================
// 1º clique = nascente, 2º clique = destino (mar, lago, outro rio…). O motor liga os dois pelos vales.
function riverClick(p) {
  const W = S.W, x = Math.floor(p.x), y = Math.floor(p.y);
  if (x < 0 || y < 0 || x >= W || y >= W || !S.H) return;
  if (!S.riverA) { S.riverA = { x, y }; renderRiverPick(); UI.sync(); toast('Nascente marcada. Agora clique no destino (mar, lago ou outro rio). Esc cancela.'); return; }
  const a = S.riverA;
  S.riverA = null; renderRiverPick(); UI.sync();
  if (a.x === x && a.y === y) return;
  linkRiver(a, { x, y });
}
async function linkRiver(a, b) {
  try {
    await flushCompose();
    const r = await call('riverLink', { ax: a.x, ay: a.y, bx: b.x, by: b.y, rivers: S.masks.rivers });
    if (!r.path) { toast('Não achei um caminho entre esses dois pontos.'); return; }
    snapshot(['rivers']);
    const km = paintRiverPath(r.path);
    afterMaskChange('rivers');
    toast(`Rio traçado: ${fmt(km, 1)} km.` + (r.climb > 5 ? ` Atenção: o caminho sobe ${fmt(r.climb, 0)} m no total (o leito cava o terreno ali). Para um rio natural, ponha a nascente no ponto mais alto.` : ''), r.climb > 5);
  } catch (err) { showError(err); }
}
const riverSvg = $('#riverSvg');
function renderRiverPick() {
  const a = S.riverA;
  if (!a || S.mode !== '2d') { riverSvg.setAttribute('hidden', ''); return; }
  riverSvg.removeAttribute('hidden');
  const p = mapToScreen({ x: a.x + 0.5, y: a.y + 0.5 });
  riverSvg.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="7" fill="#3278ff" stroke="#fff" stroke-width="2"/><text class="rl-text" x="${p.x + 12}" y="${p.y + 4}" style="paint-order:stroke;stroke:#000;stroke-width:3px">Nascente — clique no destino</text>`;
}
// Suaviza o caminho (pixels em escada) e pinta na camada Rios, mais fino na nascente e largo na foz.
function paintRiverPath(path) {
  const n = path.length / 2, pts = [];
  for (let i = 0; i < n; i++) {
    let sx = 0, sy = 0, c = 0;
    for (let k = Math.max(0, i - 3); k <= Math.min(n - 1, i + 3); k++) { sx += path[k * 2]; sy += path[k * 2 + 1]; c++; }
    pts.push({ x: sx / c + 0.5, y: sy / c + 0.5 });
  }
  const saved = { active: S.active, b: { ...S.brush } };
  S.active = 'rivers';
  Object.assign(S.brush, { strength: 1, hardness: 0.6, intensity: 1 });
  const w1 = Math.max(2, saved.b.size), w0 = Math.max(1.5, w1 * 0.35);
  let lenPx = 0, acc = Infinity;
  for (let i = 0; i < n; i++) {
    if (i) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); lenPx += d; acc += d; }
    S.brush.size = w0 + ((w1 - w0) * i) / Math.max(1, n - 1);
    if (acc >= Math.max(1, S.brush.size * 0.2) || i === n - 1) { dab(pts[i].x, pts[i].y, 'paint'); acc = 0; }
  }
  S.active = saved.active; Object.assign(S.brush, saved.b);
  flushOverlay();
  return (lenPx * cellM()) / 1000;
}

// ================= modelos de mundo =================
// relief: intensidade das montanhas/colinas automáticas (1 = padrão). P: ajustes que mudam do padrão.
const PRESETS = [
  { id: 'balanced', name: 'Continente equilibrado', style: 'continent', coverage: 0.45, relief: { mtn: 1, hills: 1 }, P: {}, hint: 'Um continente com cordilheiras, colinas e planícies. Bom ponto de partida.' },
  { id: 'tropical', name: 'Ilha tropical', style: 'continent', coverage: 0.22, relief: { mtn: 0.6, hills: 1 }, P: { mtnHeight: 900, snowLine: 3000, beachWidth: 160, beachHeight: 5, oceanDepth: 90, shelfDepth: 10, coastRough: 0.15 }, hint: 'Uma ilha com praias largas, morros e um pico vulcânico. Sem neve.' },
  { id: 'archipelago', name: 'Arquipélago', style: 'islands', coverage: 0.3, relief: { mtn: 0.7, hills: 1 }, P: { mtnHeight: 700, hillsAmp: 120, snowLine: 2500, coastRough: 0.3 }, hint: 'Muitas ilhas de tamanhos variados. Ótimo para navegação.' },
  { id: 'mountains', name: 'Terra de montanhas', style: 'continent', coverage: 0.6, relief: { mtn: 1.8, hills: 1.4 }, P: { mtnHeight: 2400, mtnScale: 3000, hillsAmp: 320, snowLine: 1500, inlandRise: 150 }, hint: 'Cordilheiras altas com neve, vales fundos. Mundo vertical e desafiador.' },
  { id: 'plains', name: 'Planícies e colinas', style: 'continent', coverage: 0.6, relief: { mtn: 0.4, hills: 1.6 }, P: { mtnHeight: 700, hillsAmp: 140, plainsAmp: 45, snowLine: 3000 }, hint: 'Campos abertos e colinas suaves. Bom para cavalos, cidades e batalhas.' },
  { id: 'fjords', name: 'Costa de fiordes', style: 'continent', coverage: 0.5, relief: { mtn: 1.4, hills: 1 }, P: { coastRough: 0.5, coastScale: 500, beachWidth: 40, shelfDepth: 40, mtnHeight: 1600, snowLine: 1100 }, hint: 'Litoral muito recortado, com montanhas caindo direto no mar.' },
  { id: 'pangea', name: 'Supercontinente', style: 'pangea', coverage: 0.7, relief: { mtn: 1.2, hills: 1 }, P: { inlandRise: 120 }, hint: 'Terra até perto das bordas; mar só nas margens. Máximo de área jogável.' }
];
function buildPresets() {
  $('#presetSel').innerHTML = PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  const upd = () => { $('#presetHint').textContent = PRESETS.find((p) => p.id === $('#presetSel').value).hint; };
  $('#presetSel').onchange = upd;
  upd();
}
async function applyPreset() {
  const pr = PRESETS.find((p) => p.id === $('#presetSel').value);
  if (!confirm(`Aplicar o modelo "${pr.name}"?\nTerra, relevo pintado e ajustes de terreno serão trocados (regiões e imagem-guia ficam).\nCtrl+Z desfaz a pintura; "Restaurar padrões" volta os ajustes.`)) return;
  snapshot([...FLOAT_LAYERS, 'sculpt', 'base']);
  S.P = { ...DEFAULT_P, seed: S.P.seed, ...pr.P };
  refreshParamInputs(); sync3DParams();
  for (const id of FLOAT_LAYERS) S.masks[id].fill(0);
  S.sculpt.fill(0); S.base = null; updateBasePanel();
  $('#autoStyle').value = pr.style; $('#autoCoverage').value = pr.coverage; updateCoverageOut();
  try {
    const a = await call('autoLand', { W: S.W, P: S.P, style: pr.style, coverage: pr.coverage });
    S.masks.land = a.mask;
    const r = await call('autoRelief', { W: S.W, P: S.P, land: S.masks.land, amount: pr.relief });
    S.masks.mountains = r.mountains; S.masks.hills = r.hills;
    drawOverlay(); markDirty(); scheduleCompose(0);
    toast(`Modelo "${pr.name}" aplicado. Troque a semente para ver outra variação.`);
  } catch (err) { showError(err); }
}

// ================= modo caminhada (3D) =================
function toggleWalk() {
  if (t3d.walk) { t3d.exitWalk(); return; }
  if (!t3d.ok || !S.H) return;
  $('#btnWalk').textContent = 'Sair da caminhada (Esc)';
  $('#walkHud').hidden = false;
  $('#exag3d').disabled = true;
  t3d.enterWalk(
    (i) => {
      $('#walkHud').textContent = `Chão a ${fmt(i.ground, 0)} m · ${i.speed ? fmt(i.speed, 0) + ' m/s' : 'parado'} · WASD/setas mover · Shift correr (40 m/s) · arraste para olhar · Esc sai`;
    },
    () => { $('#btnWalk').textContent = 'Andar pelo mapa (1,8 m)'; $('#walkHud').hidden = true; $('#exag3d').disabled = false; }
  );
}

// ================= marcadores =================
// Posição guardada normalizada (u, v de 0 a 1): não muda se a resolução de trabalho ou do heightmap mudar.
// Tipos genéricos de mapa de RPG (o site serve para qualquer projeto, não só o Empire of Rebirth).
// Os ids antigos continuam valendo para projetos salvos; tipo desconhecido vira "Ponto de interesse".
// ---- miniaturas: cada ícone é uma lista de formas numa caixa de 32×32. O ponto do marcador fica em (16, ay):
// construções "pisam" no chão (ay = 28), o pino aponta com a ponta (ay = 30). Mesmo desenho no editor (SVG)
// e no mapa do jogo exportado (Canvas/Path2D).
const IC = { stone: '#cfc8b8', stone2: '#a9a294', wall: '#e3dccb', roof: '#b5523b', roof2: '#a8743f', blue: '#4f6fa8', wood: '#9a6b3e',
  dark: '#2b2018', gold: '#e0b23a', green: '#5a9a45', green2: '#3b6e31', water: '#4a8cc4', foam: '#e8f4fb', red: '#d64541', line: '#2a1d10' };
const R_ = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
const ROOF = (x, y, w, h) => `M${x} ${y + h}L${x + w / 2} ${y}L${x + w} ${y + h}z`;
const ARCH = (x, y, w, h) => `M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}z`;
function CREN(x, y, w, h, n) { // retângulo com ameias (n dentes) no topo
  const sw = w / (2 * n - 1);
  let d = `M${x} ${y + h}V${y}`;
  for (let k = 0; k < 2 * n - 1; k++) d += k % 2 ? `h${sw}v-2` : `h${sw}` + (k < 2 * n - 2 ? 'v2' : '');
  return d + `V${y + h}z`;
}
const PINE = (x, y, s) => `M${x} ${y}l${4 * s} ${8 * s}h${-2 * s}l${3 * s} ${6 * s}H${x - 5 * s}l${3 * s} ${-6 * s}h${-2 * s}z`;
// [d, preenchimento] = forma com contorno; [d, cor, 'line', largura] = só traço
const MARKER_ICONS = {
  capital: [[CREN(3, 10, 6, 18, 2), IC.stone], [CREN(23, 10, 6, 18, 2), IC.stone], [CREN(8, 15, 16, 13, 3), IC.wall], [CREN(12, 6, 8, 22, 2), IC.stone],
    [R_(12, 11, 8, 1.6), IC.gold], [ARCH(14, 20, 4, 8), IC.dark], ['M16 6V0.5', IC.line, 'line', 1.2], ['M16.4 0.6l5 1.7-5 1.7z', IC.gold]],
  cidade: [[R_(5, 11, 7, 7), IC.wall], [ROOF(4, 7, 9, 4), IC.roof], [R_(19, 10, 8, 8), IC.wall], [ROOF(18, 6, 10, 4), IC.roof],
    [R_(13, 7, 5, 11), IC.stone], [ROOF(12.5, 2.5, 6, 4.5), IC.blue], [CREN(2, 17, 28, 11, 6), IC.stone], [ARCH(14, 21, 4, 7), IC.dark]],
  vila: [[R_(3, 17, 11, 11), IC.wall], [ROOF(1.5, 10.5, 14, 6.5), IC.roof], [R_(7.5, 22, 2.6, 6), IC.dark],
    [R_(17, 19, 12, 9), IC.wall], [ROOF(15.5, 13.5, 15, 5.5), IC.roof2], [R_(21, 22, 2.2, 2.2), IC.dark], [R_(25, 22, 2.2, 2.2), IC.dark]],
  castelo: [[CREN(3, 8, 7, 20, 2), IC.stone2], [CREN(22, 8, 7, 20, 2), IC.stone2], [CREN(9, 14, 14, 14, 3), IC.stone], [ARCH(13.5, 19, 5, 9), IC.dark],
    [R_(5.5, 13, 2, 3), IC.dark], [R_(24.5, 13, 2, 3), IC.dark], ['M6.5 8V1.5', IC.line, 'line', 1.2], ['M6.9 1.6l5 1.6-5 1.6z', IC.red]],
  porto: [[R_(3, 20, 14, 2.5), IC.wood], [R_(5, 22.5, 1.6, 5), IC.wood], [R_(13, 22.5, 1.6, 5), IC.wood], ['M17 20h12l-2.5 4.5h-7z', IC.wood],
    ['M23 20V6', IC.line, 'line', 1.2], ['M23.6 7l5 10h-5z', '#efe7d4'], ['M1 28c2.5-1.6 5-1.6 7.5 0s5 1.6 7.5 0 5-1.6 7.5 0 5 1.6 7.5 0', IC.water, 'line', 1.8]],
  santuario: [[ROOF(4, 5, 24, 7), IC.stone], [R_(5, 12, 22, 2.2), IC.stone], [R_(7, 14.2, 2.6, 10.8), IC.wall], [R_(12.2, 14.2, 2.6, 10.8), IC.wall],
    [R_(17.2, 14.2, 2.6, 10.8), IC.wall], [R_(22.4, 14.2, 2.6, 10.8), IC.wall], [R_(3.5, 25, 25, 3), IC.stone], [R_(15, 7.5, 2, 2), IC.gold]],
  masmorra: [['M1.5 28c1-9 6.5-16 14.5-16s13.5 7 14.5 16z', '#8a8276'], [ARCH(9.5, 14, 13, 14), '#5a544b'], [ARCH(12, 17, 8, 11), '#140f0b'],
    [R_(13.6, 21, 1.6, 1.6), IC.red], [R_(16.8, 21, 1.6, 1.6), IC.red]],
  caverna: [['M1.5 28c1-8 5-15 12-17 4-1 9.5 2 12.5 7 2 3 3 6 4 10z', '#9a8a72'], ['M9 28c0-5 2.5-8.5 6-8.5s6 3.5 6 8.5z', '#1e1812'],
    [R_(8.3, 19, 1.6, 9), IC.wood], [R_(20.3, 19, 1.6, 9), IC.wood], [R_(8.3, 18.2, 13.6, 1.8), IC.wood],
    ['M21 4l7 7', IC.wood, 'line', 2], ['M19.5 7.5c3-4.5 7.5-4.5 10.5-.5', '#6b6b6b', 'line', 2]],
  ruinas: [[R_(3, 25, 26, 3), IC.stone], ['M5 25V13l1.3-1.6 1.2 1.4 1-2.2V25z', IC.wall], [R_(12.2, 8.5, 5.6, 1.8), IC.wall], [R_(12.8, 10.3, 4.4, 14.7), IC.wall],
    ['M21.5 25v-7l1.5-1.2 1.1 1.5 1.6-1.1V25z', IC.wall], [R_(8.8, 22.6, 2.6, 2.4), IC.stone2], [R_(25.6, 22.2, 3, 2.8), IC.stone2]],
  interesse: [['M16 30c-1-5-9-10-9-17a9 9 0 0 1 18 0c0 7-8 12-9 17z', IC.red], ['M16 9.3a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4z', '#fff']],
  arvore: [['M13.8 28c1.2-4 1.2-8 .2-12h3.8c-1 4-1 8 .4 12z', IC.wood], ['M16 2.5a7 7 0 0 1 6.6 4.6A6.2 6.2 0 0 1 24 19.5H8a6.2 6.2 0 0 1 1.4-12.4A7 7 0 0 1 16 2.5z', IC.green2],
    ['M12 11a2 2 0 1 1 .1 0M20 9a1.6 1.6 0 1 1 .1 0M17 15a1.6 1.6 0 1 1 .1 0', IC.gold, 'line', 1.6]],
  bosque: [[PINE(8, 6, 1), IC.green2], [R_(7.2, 20, 1.6, 4), IC.wood], [PINE(24, 6, 1), IC.green2], [R_(23.2, 20, 1.6, 4), IC.wood],
    [PINE(16, 2, 1.15), IC.green], [R_(15.1, 18, 1.8, 4), IC.wood], [R_(13.5, 23, 5, 5), IC.stone], [R_(15.2, 24.5, 1.6, 1.6), IC.gold]],
  fonte: [['M4.5 21h23l-2.2 7H6.7z', IC.stone], ['M5.5 21c3-2.4 18-2.4 21 0', IC.water, 'line', 2], ['M16 21V9', IC.water, 'line', 2],
    ['M16 9.5c-3 0-5 3-5.5 7.5M16 9.5c3 0 5 3 5.5 7.5', IC.water, 'line', 1.5]],
  cachoeira: [['M2 28V8l6-3h16l6 3v20h-6V12H8v16z', '#8f8577'], [R_(9, 8, 14, 17), IC.water], ['M12 9v14M16 9v15M20 9v14', '#bfe0f5', 'line', 1.1],
    ['M6 26.5c2-2 4-2 6-1s4 1 6 0 4-1 6 1', IC.foam, 'line', 1.8]],
  lago: [['M2.5 20c0-5 6-8 13.5-8s13.5 3 13.5 8-6 8-13.5 8-13.5-3-13.5-8z', IC.water], ['M9 19c2-1 4-1 6 0M17 23c2-1 4-1 6 0', '#bfe0f5', 'line', 1.2],
    ['M5 14V8M7 14V6.5M26 14V9', IC.green2, 'line', 1.6]],
  monolito: [['M12 28V9l4-5.5 4 5.5v19z', '#9d978c'], ['M4.5 28v-8l2.6-2.2 2.6 2.2v8z', '#aaa497'], ['M22.3 28v-9l2.6-2.2 2.6 2.2v9z', '#aaa497'],
    ['M15 12l2 3-2 3 2 3', '#5dade2', 'line', 1.4]],
  covil: [['M2.5 28c1-7 6-12.5 13.5-12.5S28.5 21 29.5 28z', '#6e5a48'], ['M10.5 28c0-4.2 2.3-6.5 5.5-6.5s5.5 2.3 5.5 6.5z', '#120d09'],
    [R_(13.4, 23.6, 1.4, 1.4), IC.gold], [R_(17.2, 23.6, 1.4, 1.4), IC.gold], ['M21 4l-3.5 5M25 4l-3.5 5M29 4l-3.5 5', '#c0392b', 'line', 1.6]]
};
// cat: build = marcador de construção · env = marcador de vegetação / ambiente (ponto de interesse vira pino)
const MARKER_TYPES = [
  { id: 'capital', cat: 'build', name: 'Capital', color: '#ffd700' },
  { id: 'cidade', cat: 'build', name: 'Cidade', color: '#f2c14e' },
  { id: 'vila', cat: 'build', name: 'Vila', color: '#e8d9a8' },
  { id: 'castelo', cat: 'build', name: 'Castelo / Fortaleza', color: '#c0c6d0' },
  { id: 'porto', cat: 'build', name: 'Porto', color: '#3f8fd6' },
  { id: 'santuario', cat: 'build', name: 'Templo / Santuário', color: '#5dade2' },
  { id: 'masmorra', cat: 'build', name: 'Masmorra', color: '#d64541' },
  { id: 'caverna', cat: 'build', name: 'Caverna / Mina', color: '#8d6e4f' },
  { id: 'ruinas', cat: 'build', name: 'Ruínas', color: '#9a9a9a' },
  { id: 'interesse', cat: 'env', name: 'Ponto de interesse', color: '#d64541', ay: 30 },
  { id: 'arvore', cat: 'env', name: 'Árvore ancestral', color: '#3b6e31' },
  { id: 'bosque', cat: 'env', name: 'Bosque sagrado', color: '#5a9a45' },
  { id: 'fonte', cat: 'env', name: 'Fonte / Nascente', color: '#4a8cc4' },
  { id: 'cachoeira', cat: 'env', name: 'Cachoeira', color: '#4a8cc4' },
  { id: 'lago', cat: 'env', name: 'Lago / Lagoa', color: '#4a8cc4' },
  { id: 'monolito', cat: 'env', name: 'Monólito / Pedra sagrada', color: '#9d978c' },
  { id: 'covil', cat: 'env', name: 'Covil de criaturas', color: '#6e5a48' }
];
const markerTypeDef = (id) => MARKER_TYPES.find((t) => t.id === id) || MARKER_TYPES.find((t) => t.id === 'interesse');
const markerAnchor = (t) => t.ay || 28;
// SVG do ícone com o ponto do marcador em (x, y) e tamanho px (lado da caixa de 32).
function markerIconSVG(type, x, y, px) {
  const t = markerTypeDef(type), s = px / 32, sw = 1.1;
  const parts = (MARKER_ICONS[t.id] || MARKER_ICONS.interesse).map(([d, c, kind, w]) => kind === 'line'
    ? `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`
    : `<path d="${d}" fill="${c}" stroke="${IC.line}" stroke-width="${sw}" stroke-linejoin="round"/>`).join('');
  return `<g transform="translate(${(x - 16 * s).toFixed(2)} ${(y - markerAnchor(t) * s).toFixed(2)}) scale(${s.toFixed(4)})">${parts}</g>`;
}
function drawMarkerIcon(ctx, type, x, y, px) {
  const t = markerTypeDef(type), s = px / 32;
  ctx.save();
  ctx.translate(x - 16 * s, y - markerAnchor(t) * s); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [d, c, kind, w] of MARKER_ICONS[t.id] || MARKER_ICONS.interesse) {
    const p = new Path2D(d);
    if (kind === 'line') { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke(p); }
    else { ctx.fillStyle = c; ctx.fill(p); ctx.strokeStyle = IC.line; ctx.lineWidth = 1.1; ctx.stroke(p); }
  }
  ctx.restore();
}
const MK_PX = 30; // tamanho do ícone na tela do editor
const markerSvg = $('#markerSvg');
function markerScreen(m) { return { x: (m.u * (S.W - 1) + 0.5) * S.view.s + S.view.tx, y: (m.v * (S.W - 1) + 0.5) * S.view.s + S.view.ty }; }
function renderMarkers() {
  if (S.mode !== '2d') return;
  markerSvg.innerHTML = S.markers.map((m) => {
    const p = markerScreen(m), t = markerTypeDef(m.type), sel = m.id === S.markerSel, top = p.y - markerAnchor(t) * (MK_PX / 32);
    return `${sel ? `<rect class="mk-sel" x="${p.x - MK_PX / 2 - 3}" y="${top - 3}" width="${MK_PX + 6}" height="${p.y - top + 6}" rx="5"/>` : ''}` +
      `<ellipse cx="${p.x}" cy="${p.y}" rx="${t.ay ? 3 : 11}" ry="${t.ay ? 1.5 : 3}" fill="rgba(0,0,0,.35)"/>${markerIconSVG(m.type, p.x, p.y, MK_PX)}` +
      `<text class="mk-label" x="${p.x + MK_PX / 2 + 3}" y="${top + 12}">${escapeHtml(m.name)}</text>`;
  }).join('');
}
function hitMarker(sx, sy) {
  for (let i = S.markers.length - 1; i >= 0; i--) {
    const m = S.markers[i], p = markerScreen(m), top = p.y - markerAnchor(markerTypeDef(m.type)) * (MK_PX / 32);
    if (Math.abs(sx - p.x) <= MK_PX / 2 + 2 && sy >= top - 2 && sy <= p.y + 4) return m;
  }
  return null;
}
function markerRegion(m) {
  const W = S.W, id = S.regions[Math.round(m.v * (W - 1)) * W + Math.round(m.u * (W - 1))];
  return id && S.regionDefs[id - 1] ? S.regionDefs[id - 1].name : '';
}
// Posição no Unreal, em cm: o Landscape fica centralizado em X = 0 / Y = 0 e o nível do mar em Z = 0.
function markerWorld(m) {
  const R = S.ex.res, cm = S.ex.mpq * 100, W = S.W;
  const h = heightAtMap(m.u * (W - 1), m.v * (W - 1)) ?? 0;
  return { x: (m.u - 0.5) * (R - 1) * cm, y: (m.v - 0.5) * (R - 1) * cm, z: h * 100, h };
}

let markerDrag = null;
function markerDown(p, e) {
  const r = vp.getBoundingClientRect(), hit = hitMarker(e.clientX - r.left, e.clientY - r.top);
  const W = S.W, u = clamp((p.x - 0.5) / (W - 1), 0, 1), v = clamp((p.y - 0.5) / (W - 1), 0, 1);
  if (hit) {
    S.markerSel = hit.id;
    markerDrag = { id: hit.id, pre: structuredClone(S.markers), moved: false };
  } else {
    snapshot(['markers']);
    const t = markerTypeDef(S.markerType), id = ++S.markerSeq;
    const count = S.markers.filter((m) => m.type === t.id).length + 1;
    S.markers.push({ id, name: `${t.name} ${count}`, type: t.id, u, v });
    S.markerSel = id;
    markerDrag = { id, moved: true };
    markDirty();
  }
  renderMarkers(); buildMarkerList();
}
function markerMove(p) {
  const m = S.markers.find((k) => k.id === markerDrag.id);
  if (!m) return;
  if (!markerDrag.moved) { S.undo.push({ markers: markerDrag.pre }); S.redo.length = 0; markerDrag.moved = true; }
  m.u = clamp((p.x - 0.5) / (S.W - 1), 0, 1); m.v = clamp((p.y - 0.5) / (S.W - 1), 0, 1);
  markDirty(); renderMarkers();
}
function markerUp() { markerDrag = null; buildMarkerList(); }
function deleteMarker(id) {
  snapshot(['markers']);
  S.markers = S.markers.filter((m) => m.id !== id);
  if (S.markerSel === id) S.markerSel = null;
  markDirty(); renderMarkers(); buildMarkerList();
}
// Paleta de miniaturas: escolhe o tipo ANTES de clicar no mapa (e já liga a ferramenta Marcador).
function buildMarkerPalette() {
  const el = $('#markerPalette');
  const active = S.tool === 'marker';
  const tile = (t) => `<button class="mk-tile${active && S.markerType === t.id ? ' active' : ''}" data-t="${t.id}" title="${escapeHtml(t.name)}"><svg viewBox="0 0 32 32">${markerIconSVG(t.id, 16, t.ay ? 31 : 30, 30)}</svg><span>${escapeHtml(t.name.split(' / ')[0])}</span></button>`;
  el.innerHTML = `<div class="mk-pal-h">Construções</div><div class="mk-pal">${MARKER_TYPES.filter((t) => t.cat === 'build').map(tile).join('')}</div>
    <div class="mk-pal-h">Vegetação / ambiente</div><div class="mk-pal">${MARKER_TYPES.filter((t) => t.cat === 'env').map(tile).join('')}</div>`;
  el.querySelectorAll('.mk-tile').forEach((b) => {
    b.onclick = () => {
      const t = markerTypeDef(b.dataset.t);
      S.markerKind = t.cat; S.markerType = t.id; UI.rememberMarkerType();
      setTool('marker');
    };
  });
}
function buildMarkerList() {
  const el = $('#markerList');
  el.innerHTML = '';
  if (!S.markers.length) { el.innerHTML = '<p class="hint">Nenhum marcador ainda.</p>'; return; }
  for (const m of S.markers) {
    const t = markerTypeDef(m.type), row = document.createElement('div');
    row.className = 'marker-row' + (m.id === S.markerSel ? ' active' : '');
    const reg = markerRegion(m), w = markerWorld(m);
    const opts = (cat) => MARKER_TYPES.filter((k) => k.cat === cat).map((k) => `<option value="${k.id}"${k.id === m.type ? ' selected' : ''}>${k.name}</option>`).join('');
    row.innerHTML = `<svg class="mk-ico" viewBox="0 0 22 22">${markerIconSVG(m.type, 11, t.ay ? 21.5 : 20, 20)}</svg><input type="text" value="${escapeHtml(m.name)}" title="Nome">
      <select title="Tipo"><optgroup label="Construção">${opts('build')}</optgroup><optgroup label="Vegetação / ambiente">${opts('env')}</optgroup></select>
      <button title="Apagar marcador">×</button>
      <span class="mk-reg">${reg ? escapeHtml(reg) + ' · ' : ''}altura ${fmt(w.h, 0)} m</span>`;
    const [name] = row.querySelectorAll('input'), sel = row.querySelector('select');
    row.onclick = (e) => { if (['INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return; S.markerSel = m.id; renderMarkers(); buildMarkerList(); };
    name.onchange = () => { snapshot(['markers']); m.name = name.value.trim() || t.name; markDirty(); renderMarkers(); };
    sel.onchange = () => { snapshot(['markers']); m.type = sel.value; markDirty(); renderMarkers(); buildMarkerList(); };
    row.querySelector('button').onclick = () => deleteMarker(m.id);
    el.appendChild(row);
  }
}
const csvq = (s) => '"' + String(s).replace(/"/g, '""') + '"';
// CSV no formato de importação de Data Table do Unreal: 1ª coluna = nome da linha; Vector = (X=..,Y=..,Z=..).
function markersCSV() {
  const lines = ['---,Nome,Tipo,Regiao,Posicao'];
  for (const m of S.markers) {
    const w = markerWorld(m);
    lines.push([fileSafe(m.name) + '_' + m.id, csvq(m.name), csvq(markerTypeDef(m.type).name), csvq(markerRegion(m)),
      csvq(`(X=${w.x.toFixed(1)},Y=${w.y.toFixed(1)},Z=${w.z.toFixed(1)})`)].join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
function markersJSON() {
  return JSON.stringify({
    mundo: S.ex.name, unidade: 'cm', centroDoMundo: [0, 0], nivelDoMar: 0,
    marcadores: S.markers.map((m) => { const w = markerWorld(m); return { nome: m.name, tipo: markerTypeDef(m.type).name, regiao: markerRegion(m), x: +w.x.toFixed(1), y: +w.y.toFixed(1), z: +w.z.toFixed(1), altura_m: +w.h.toFixed(2), u: +m.u.toFixed(5), v: +m.v.toFixed(5) }; })
  }, null, 2);
}

// ================= vegetação (áreas) =================
// Camada de id por ponto (como as regiões): 0 = nada, 1..8 = tipo. No mapa vira arvorezinhas espalhadas
// (estilo mapa de fantasia); na exportação vira uma máscara por tipo para o PCG.
// Glifos numa caixa 16×16 com a base em (8, 15). [d, cor] = forma com contorno; [d, cor, 'line', largura] = traço.
const CIR = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const TR = (c = '#7a5432') => ['M7.2 15v-3.6h1.6V15z', c];
// 3 variações por tipo (o mapa sorteia uma para cada arvorezinha)
const VEG_TYPES = [
  { id: 1, key: 'floresta', name: 'Floresta (folhosas)', color: '#3f7d35', step: 1, size: 1, variants: [
    [TR(), ['M8 2.5a5 5 0 0 1 4.6 7A3.6 3.6 0 0 1 11 12H5a3.6 3.6 0 0 1-1.6-2.5A5 5 0 0 1 8 2.5z', '#3f7d35']],
    [TR(), ['M8 1.5c2.8 0 4.2 2.6 4.2 5.6S10.6 12 8 12 3.8 10.1 3.8 7.1 5.2 1.5 8 1.5z', '#4e8f3f']],
    [TR(), ['M3.5 11.5a3.3 3.3 0 0 1 .6-6.4 4.2 4.2 0 0 1 7.8 0 3.3 3.3 0 0 1 .6 6.4z', '#356b2d']]] },
  { id: 2, key: 'pinheiros', name: 'Floresta de pinheiros', color: '#2d5e3a', step: 0.9, size: 1.05, variants: [
    [['M7.3 12.5h1.4V15H7.3z', '#6b4a2c'], ['M8 1l3.6 6.5h-1.8l2.7 5H3.5l2.7-5H4.4z', '#2d5e3a']],
    [['M7.4 13.5h1.2V15H7.4z', '#6b4a2c'], ['M8 .5l2.6 5h-1.3l2 4.5h-1.2l1.8 3.5H4.1l1.8-3.5H4.7l2-4.5H5.4z', '#2a5636']],
    [['M7.3 12h1.4v3H7.3z', '#6b4a2c'], ['M8 4l4.5 8H3.5z', '#34694a']]] },
  { id: 3, key: 'selva', name: 'Selva tropical', color: '#1f7a4a', step: 0.8, size: 1.1, variants: [
    [TR('#6b4a2c'), ['M4 11.5a4 4 0 0 1 .8-7.6 4.6 4.6 0 0 1 7.4 1.2A3.9 3.9 0 0 1 12.4 11.5z', '#1f7a4a'], ['M6 7.5c1-.8 2.2-.9 3.2-.3', '#7cc28e', 'line', 0.8]],
    [['M7.4 15V7.5h1.2V15z', '#6b4a2c'], ['M1.8 8.5C3 4 13 4 14.2 8.5z', '#1c7044'], ['M4.5 7c1.5-1.3 3.5-1.5 5-.8', '#7cc28e', 'line', 0.8]],
    [TR('#6b4a2c'), [CIR(8, 7.6, 4.6), '#237f55'], ['M5.8 6.5c.8-1.2 2-1.6 3.2-1.2', '#7cc28e', 'line', 0.8]]] },
  { id: 4, key: 'bosque', name: 'Bosque esparso', color: '#7aa957', step: 1.7, size: 0.85, skip: 0.35, variants: [
    [['M7.4 11h1.2v4H7.4z', '#7a5432'], [CIR(8, 8, 3.4), '#7aa957']],
    [['M7.5 11.5h1v3.5h-1z', '#7a5432'], ['M8 5.2c1.8 0 2.6 1.6 2.6 3.4S9.8 11.8 8 11.8 5.4 10.4 5.4 8.6 6.2 5.2 8 5.2z', '#8bb766']],
    [['M3.5 15a2.6 2.6 0 0 1 1.4-4.6 3 3 0 0 1 5.6-.6A2.6 2.6 0 0 1 12.5 15z', '#6f9c4f']]] },
  { id: 5, key: 'pantano', name: 'Pântano', color: '#5f7f45', step: 1.3, size: 1, variants: [
    [['M2.5 14.6h11', '#6d9db4', 'line', 1.4], ['M5 14V8M7 14V6M9.5 14V7.5M11.5 14V9', '#4f6f3a', 'line', 1.1], ['M6.6 5.8h.9v2.4h-.9zM9.1 7.3h.9v2.4h-.9z', '#7a5a3a']],
    [['M2.5 14.6h11', '#6d9db4', 'line', 1.4], ['M6 14V7M10 14V8.5M8 14c0-2 1-3.5 2.5-4.5', '#4f6f3a', 'line', 1.1], ['M5.5 6.4h1v2.6h-1zM9.5 7.9h1v2.6h-1z', '#7a5a3a']],
    [['M2.5 14.6h11', '#6d9db4', 'line', 1.4], ['M8 14V8M8 8L5.5 5M8 9.5L10.5 7M8 14c-1-1-2-1-3 0M8 14c1-1 2-1 3 0', '#6b5a44', 'line', 1.1], [CIR(5.3, 4.7, 1.1), '#5f7f45'], [CIR(10.7, 6.7, 1.1), '#5f7f45']]] },
  { id: 6, key: 'campo_florido', name: 'Campo florido', color: '#d98bb5', step: 1.15, size: 0.9, variants: [
    [['M4 12v2.8M9 10v4.8M12.3 13v2', '#5a9a45', 'line', 0.9], [CIR(4, 11.6, 1.5), '#e76fa0'], [CIR(9, 9.6, 1.5), '#f2d14e'], [CIR(12.3, 12.6, 1.3), '#f4f4f4']],
    [['M5 13v2M7.5 11v4M11 12v3', '#5a9a45', 'line', 0.9], [CIR(5, 12.6, 1.4), '#f2d14e'], [CIR(7.5, 10.6, 1.5), '#f4f4f4'], [CIR(11, 11.6, 1.4), '#e76fa0']],
    [['M6 12.5v2.5M10 11.5v3.5', '#5a9a45', 'line', 0.9], [CIR(6, 12, 1.6), '#b07ad9'], [CIR(10, 11, 1.6), '#e76fa0'], [CIR(3.5, 14, 1), '#f2d14e'], [CIR(12.5, 14, 1), '#f4f4f4']]] },
  { id: 7, key: 'oasis', name: 'Oásis / palmeiras', color: '#4c9a3a', step: 1.5, size: 1.15, variants: [
    [['M8 15c0-4 .5-7 1.5-9', '#8a6a3e', 'line', 1.5], ['M9.5 6c-2-1.5-4.5-1.5-6 0M9.5 6c1.5-2 4-2.5 5.5-1.5M9.5 6c-.5-2 .5-3.5 2-4.5M9.5 6c2 0 3.5 1.2 4 3M9.5 6c-2 .2-3.5 1.5-4 3.2', '#3f8a3a', 'line', 1.5]],
    [['M8 15c0-4-.5-7-1.5-9', '#8a6a3e', 'line', 1.5], ['M6.5 6c2-1.5 4.5-1.5 6 0M6.5 6C5 4 2.5 3.5 1 4.5M6.5 6c.5-2-.5-3.5-2-4.5M6.5 6c-2 0-3.5 1.2-4 3M6.5 6c2 .2 3.5 1.5 4 3.2', '#3f8a3a', 'line', 1.5]],
    [['M5.5 15c0-3 .3-5 1-6.5M10.5 15c0-3.5-.3-6-1.2-8', '#8a6a3e', 'line', 1.3], ['M6.5 8.5c-1.5-1-3.2-1-4.3 0M6.5 8.5c1-1.5 2.8-1.8 4-1M6.5 8.5c-.3-1.5.4-2.6 1.4-3.3M9.3 7c1.5-1 3.2-1 4.3 0M9.3 7c-1-1.5-2.8-1.8-4-1M9.3 7c.3-1.5-.4-2.6-1.4-3.3M9.3 7c1.5.2 2.6 1.1 3 2.4', '#3f8a3a', 'line', 1.3]]] },
  { id: 8, key: 'cactos', name: 'Cactos (deserto)', color: '#7aa04a', step: 1.8, size: 0.95, variants: [
    [['M7 15V4.5a1 1 0 0 1 2 0V15z', '#6c9a4a'], ['M7 10H5.2a1 1 0 0 1-1-1V7a.8.8 0 0 1 1.6 0v1.4H7', '#6c9a4a'], ['M9 9h1.4V6.5a.8.8 0 0 1 1.6 0V9a1 1 0 0 1-1 1H9', '#6c9a4a']],
    [['M4.5 15c-.5-4 1-7.5 3.5-7.5s4 3.5 3.5 7.5z', '#6c9a4a'], ['M8 8v7M6.2 9.2v5.8M9.8 9.2v5.8', '#4f7a35', 'line', 0.6], [CIR(8, 7.4, 1), '#e76fa0']],
    [['M8 15c-1.6 0-2.2-1.6-2.2-3.2S6.4 8.6 8 8.6s2.2 1.6 2.2 3.2S9.6 15 8 15z', '#7aa04a'], ['M5.4 10.2c-1.2-.2-1.8-1.4-1.6-2.6s1.2-2 2.4-1.8 1.8 1.4 1.6 2.6-1.2 2-2.4 1.8z', '#7aa04a'], ['M10.8 9.8c-1.2.2-2.2-.6-2.4-1.8s.4-2.4 1.6-2.6 2.2.6 2.4 1.8-.4 2.4-1.6 2.6z', '#7aa04a']]] }
];
const vegPaths = VEG_TYPES.map((v) => v.variants.map((g) => g.map(([d, c, kind, w]) => ({ p: new Path2D(d), c, line: kind === 'line', w }))));
function vegGlyphSVG(id, px, variant = 0) {
  const v = VEG_TYPES[id - 1];
  return `<svg viewBox="0 0 16 16" width="${px}" height="${px}">${v.variants[variant].map(([d, c, kind, w]) => kind === 'line'
    ? `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`
    : `<path d="${d}" fill="${c}" stroke="#1d2a14" stroke-width=".6" stroke-linejoin="round"/>`).join('')}</svg>`;
}
const hash01 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
// Espalha os glifos numa grade com sorteio fixo (mesma posição sempre). outSize = lado do desenho em px;
// isLand(ix) opcional para não desenhar no mar.
function drawVegGlyphs(ctx, outSize, isLand) {
  const W = S.W, k = W / outSize, base = outSize / 110;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const v of VEG_TYPES) {
    const step = base * v.step, px = base * 1.55 * v.size, variants = vegPaths[v.id - 1];
    const n = Math.ceil(outSize / step);
    for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) {
      const jx = hash01(gx + v.id * 31, gy), jy = hash01(gy + v.id * 17, gx + 7);
      if (v.skip && hash01(gx * 3 + 1, gy * 5 + v.id) < v.skip) continue;
      const x = (gx + 0.15 + jx * 0.7) * step, y = (gy + 0.15 + jy * 0.7) * step;
      const ix = Math.min(W - 1, (y * k) | 0) * W + Math.min(W - 1, (x * k) | 0);
      if (S.veg[ix] !== v.id || (isLand && !isLand(ix))) continue;
      // variação de desenho e de tamanho (±15%) sorteadas por posição
      const paths = variants[(hash01(gx * 7 + 3, gy * 11 + v.id) * variants.length) | 0];
      const sc = (px * (0.85 + 0.3 * hash01(gy * 13 + 5, gx * 3 + v.id))) / 16;
      ctx.setTransform(sc, 0, 0, sc, x - 8 * sc, y - 15 * sc);
      for (const s of paths) {
        if (s.line) { ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.stroke(s.p); }
        else { ctx.fillStyle = s.c; ctx.fill(s.p); ctx.strokeStyle = '#1d2a14'; ctx.lineWidth = 0.6; ctx.stroke(s.p); }
      }
    }
  }
  ctx.restore();
}
const cvV = $('#cvVeg'), vctx = cvV.getContext('2d');
let vegRaf = 0;
function scheduleVegDraw() { if (!vegRaf) vegRaf = requestAnimationFrame(() => { vegRaf = 0; drawVegLayer(); }); }
function drawVegLayer() {
  const scale = S.W <= 1024 ? 2 : 1, size = S.W * scale; // dobro da resolução: glifos nítidos com zoom
  if (cvV.width !== size) { cvV.width = cvV.height = size; }
  cvV.style.width = cvV.style.height = S.W + 'px';
  vctx.clearRect(0, 0, size, size);
  if (!S.showVeg || !S.veg || !S.veg.some((v) => v)) return;
  const H = S.H && S.H.length === S.W * S.W ? S.H : null;
  drawVegGlyphs(vctx, size, H ? (ix) => H[ix] >= 0 : null);
}
function vegCoverage() {
  const c = new Array(VEG_TYPES.length + 1).fill(0);
  for (let i = 0; i < S.veg.length; i++) c[S.veg[i]]++;
  return c;
}
function buildVegList() {
  const el = $('#vegList');
  if (!el || !S.veg) return;
  const cov = vegCoverage(), N = S.veg.length;
  el.innerHTML = VEG_TYPES.map((v) => `<div class="veg-row${S.active === 'veg' && S.vegBrush === v.id ? ' active' : ''}" data-v="${v.id}">${vegGlyphSVG(v.id, 22)}<span class="nm">${v.name}</span><span class="pc">${cov[v.id] ? fmt((cov[v.id] / N) * 100, 1) + '%' : '—'}</span></div>`).join('');
  el.querySelectorAll('.veg-row').forEach((r) => { r.onclick = () => selectVeg(+r.dataset.v); });
}
function selectVeg(id, tool = 'paint') {
  S.vegBrush = id;
  if (S.active !== 'veg') setActive('veg');
  if (!['paint', 'erase', 'fill', 'smooth'].includes(S.tool) || S.tool !== tool) setTool(tool);
  buildVegList(); UI.sync();
}
// Exportação: mapa colorido + uma máscara por tipo (bordas suaves) + legenda, em resolução de textura.
async function vegExportFiles(base) {
  const used = VEG_TYPES.filter((v) => S.veg.some((x) => x === v.id));
  if (!used.length) return [];
  const W = S.W, out = Math.min(2048, Math.max(1024, W * 2)), files = [];
  const src = document.createElement('canvas'); src.width = src.height = W;
  const sctx = src.getContext('2d');
  const big = document.createElement('canvas'); big.width = big.height = out;
  const bctx = big.getContext('2d');
  bctx.imageSmoothingEnabled = true; bctx.imageSmoothingQuality = 'high';
  // mapa colorido (sem suavizar: cada cor = um tipo)
  const img = sctx.createImageData(W, W), d = img.data, rgb = VEG_TYPES.map((v) => hexToRgb(v.color));
  for (let i = 0; i < S.veg.length; i++) { const c = S.veg[i] && rgb[S.veg[i] - 1]; if (c) { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; } d[i * 4 + 3] = 255; }
  sctx.putImageData(img, 0, 0);
  bctx.imageSmoothingEnabled = false; bctx.drawImage(src, 0, 0, out, out); bctx.imageSmoothingEnabled = true;
  files.push({ name: 'vegetacao/' + base + '_vegetacao.png', blob: await canvasBlob(big) });
  // máscaras: branco = tipo presente; borda suavizada (blur) para o PCG ir rareando nas bordas
  const blur = Math.max(1, Math.round(out / 512));
  for (const v of used) {
    for (let i = 0; i < S.veg.length; i++) { const on = S.veg[i] === v.id ? 255 : 0; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = on; d[i * 4 + 3] = 255; }
    sctx.putImageData(img, 0, 0);
    bctx.filter = `blur(${blur}px)`; bctx.fillStyle = '#000'; bctx.fillRect(0, 0, out, out); bctx.drawImage(src, 0, 0, out, out); bctx.filter = 'none';
    files.push({ name: `vegetacao/${base}_veg_${String(v.id).padStart(2, '0')}_${fileSafe(v.key)}.png`, blob: await canvasBlob(big) });
  }
  const legend = { mundo: S.ex.name, resolucao: out, cobreOMundoInteiro: true, centro: [0, 0], tipos: used.map((v) => ({ id: v.id, chave: v.key, nome: v.name, cor: v.color, arquivo: `${base}_veg_${String(v.id).padStart(2, '0')}_${fileSafe(v.key)}.png` })) };
  files.push({ name: 'vegetacao/' + base + '_vegetacao.json', blob: new Blob([JSON.stringify(legend, null, 2)], { type: 'application/json' }) });
  return files;
}

// ================= mapa do jogo (ilustrado) =================
function bilinear(A, W, x, y) {
  const gx = clamp(x, 0, W - 1.001), gy = clamp(y, 0, W - 1.001), x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, i = y0 * W + x0;
  return (A[i] * (1 - fx) + A[i + 1] * fx) * (1 - fy) + (A[i + W] * (1 - fx) + A[i + W + 1] * fx) * fy;
}
const MAPC = { low: [233, 222, 186], mid: [214, 196, 150], high: [172, 152, 116], snow: [246, 244, 238], shallow: [178, 206, 206], deep: [100, 138, 156], coast: [88, 66, 40], river: [72, 114, 156], border: [140, 40, 40] };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function renderGameMap(size, labeled) {
  const W = S.W, P = S.P, c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
  const k = (W - 1) / (size - 1), hs = new Float32Array(size * size), rv = new Float32Array(size * size), rid = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    hs[i] = bilinear(S.H, W, x * k, y * k);
    rv[i] = bilinear(S.masks.rivers, W, x * k, y * k);
    rid[i] = S.regions[Math.round(y * k) * W + Math.round(x * k)];
  }
  const mpp = worldM() / (size - 1), zf = 2.5, snow = Math.max(P.snowLine, 50);
  let lx = -1, ly = -1, lz = 1.4; { const l = Math.hypot(lx, ly, lz); lx /= l; ly /= l; lz /= l; }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x, h = hs[i];
      const xl = x > 0 ? i - 1 : i, xr = x < size - 1 ? i + 1 : i, yu = y > 0 ? i - size : i, yd = y < size - 1 ? i + size : i;
      let nx = (-(hs[xr] - hs[xl]) / (2 * mpp)) * zf, ny = (-(hs[yd] - hs[yu]) / (2 * mpp)) * zf;
      const nl = Math.hypot(nx, ny, 1);
      const shade = 0.7 + 0.45 * Math.max(0, (nx * lx + ny * ly + lz) / nl);
      let col;
      const land = h >= 0;
      if (!land) col = mix3(MAPC.shallow, MAPC.deep, smooth01(-h / Math.max(1, P.oceanDepth)));
      else {
        const t = h / snow;
        col = t < 0.35 ? mix3(MAPC.low, MAPC.mid, t / 0.35) : mix3(MAPC.mid, MAPC.high, Math.min(1, (t - 0.35) / 0.5));
        col = mix3(col, MAPC.snow, smooth01((h - snow * 0.95) / (snow * 0.1)));
        col = col.map((v) => v * shade);
        if (rv[i] > 0.3) col = mix3(col, MAPC.river, smooth01((rv[i] - 0.3) / 0.25));
      }
      // linha da costa e fronteiras pontilhadas entre reinos
      if (land !== (hs[xr] >= 0) || land !== (hs[yd] >= 0)) col = MAPC.coast;
      // fronteira só entre dois reinos diferentes (terra sem reino ou mar não conta)
      else if (land && rid[i] && ((rid[xr] && rid[xr] !== rid[i] && hs[xr] >= 0) || (rid[yd] && rid[yd] !== rid[i] && hs[yd] >= 0)) && ((x + y) >> 1) % 2 === 0) col = MAPC.border;
      const o = i * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const u = size / 1024, serif = 'Georgia, "Times New Roman", serif';
  // vegetação pintada vira arvorezinhas (também no minimapa limpo: não é texto)
  if (S.veg && S.veg.some((v) => v)) drawVegGlyphs(ctx, size, (ix) => S.H[ix] >= 0);
  if (labeled) {
    // nomes dos reinos no centro de cada região
    const sum = new Map();
    for (let i = 0; i < rid.length; i += 3) { const id = rid[i]; if (!id || hs[i] < 0) continue; const s = sum.get(id) || [0, 0, 0]; s[0] += i % size; s[1] += (i / size) | 0; s[2]++; sum.set(id, s); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [id, s] of sum) {
      const def = S.regionDefs[id - 1];
      if (!def || s[2] < 50) continue;
      ctx.font = `bold ${Math.round(22 * u)}px ${serif}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(4 * u)}px`;
      ctx.lineWidth = 4 * u; ctx.strokeStyle = 'rgba(240,230,200,.85)'; ctx.fillStyle = 'rgba(110,30,30,.85)';
      const t = def.name.toUpperCase(), cx = s[0] / s[2], cy = s[1] / s[2];
      ctx.strokeText(t, cx, cy); ctx.fillText(t, cx, cy);
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    // marcadores
    ctx.textAlign = 'left';
    for (const m of S.markers) {
      const t = markerTypeDef(m.type), x = m.u * (size - 1), y = m.v * (size - 1), px = (m.type === 'capital' ? 38 : 30) * u;
      drawMarkerIcon(ctx, m.type, x, y, px);
      const ly = y - (markerAnchor(t) * px) / 32 + 11 * u;
      ctx.font = `${m.type === 'capital' ? 'bold ' : ''}${Math.round(14 * u)}px ${serif}`; ctx.lineWidth = 3 * u; ctx.strokeStyle = 'rgba(240,230,200,.9)'; ctx.fillStyle = '#2a1d10';
      ctx.strokeText(m.name, x + px / 2 + 3 * u, ly); ctx.fillText(m.name, x + px / 2 + 3 * u, ly);
    }
    // título
    ctx.font = `bold ${Math.round(30 * u)}px ${serif}`; ctx.textBaseline = 'top';
    const tw = ctx.measureText(S.ex.name).width;
    ctx.fillStyle = 'rgba(240,230,200,.9)'; ctx.fillRect(20 * u, 20 * u, tw + 32 * u, 50 * u);
    ctx.strokeStyle = MAPC.coast; ctx.lineWidth = 2 * u; ctx.strokeRect(20 * u, 20 * u, tw + 32 * u, 50 * u);
    ctx.fillStyle = '#2a1d10'; ctx.fillText(S.ex.name, 36 * u, 30 * u);
    // escala
    const mppx = worldM() / size;
    let best = 1;
    for (const v of [100, 200, 500, 1000, 2000, 5000, 10000, 20000]) if (v / mppx <= size * 0.18) best = v;
    const bw = best / mppx, bx = 24 * u, by = size - 40 * u;
    ctx.fillStyle = 'rgba(240,230,200,.9)'; ctx.fillRect(bx - 8 * u, by - 22 * u, bw + 16 * u, 34 * u);
    ctx.fillStyle = '#2a1d10'; ctx.fillRect(bx, by, bw, 4 * u); ctx.fillRect(bx, by - 6 * u, 2 * u, 10 * u); ctx.fillRect(bx + bw - 2 * u, by - 6 * u, 2 * u, 10 * u);
    ctx.font = `${Math.round(13 * u)}px ${serif}`; ctx.textBaseline = 'bottom';
    ctx.fillText(best >= 1000 ? best / 1000 + ' km' : best + ' m', bx, by - 3 * u);
    // rosa dos ventos simples (topo da imagem = norte)
    const cx = size - 50 * u, cy = 60 * u, R = 22 * u;
    ctx.fillStyle = '#2a1d10';
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx + R * 0.35, cy); ctx.lineTo(cx, cy + R); ctx.lineTo(cx - R * 0.35, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = MAPC.border; ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx + R * 0.35, cy); ctx.lineTo(cx - R * 0.35, cy); ctx.closePath(); ctx.fill();
    ctx.font = `bold ${Math.round(16 * u)}px ${serif}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#2a1d10';
    ctx.fillText('N', cx, cy - R - 2 * u);
  }
  ctx.strokeStyle = MAPC.coast; ctx.lineWidth = Math.max(2, 4 * u); ctx.strokeRect(0, 0, size, size);
  return c;
}
const canvasBlob = (cv) => new Promise((res) => cv.toBlob(res, 'image/png'));
async function openMapPreview() {
  if (!S.H) return;
  busyCount++; setTask('Desenhando o mapa…', null);
  await new Promise((r) => setTimeout(r, 30));
  let url;
  try { url = renderGameMap(1024, true).toDataURL('image/png'); } finally { busyCount--; setTask('', null); }
  $('#modalBody').innerHTML = `<h2>Mapa do jogo — ${escapeHtml(S.ex.name)}</h2>
    <p class="hint">Prévia em 1024 px. A exportação gera esta versão ilustrada e uma versão limpa (sem textos) no tamanho escolhido (${S.ex.mapSize} px).
      Os nomes vêm das Regiões / Reinos e dos Marcadores.</p>
    <img class="map-preview" src="${url}" alt="Mapa do jogo">
    <div class="btnrow"><button id="btnMapDl" class="accent">Baixar só o mapa (${S.ex.mapSize} px)</button></div>`;
  $('#modal').hidden = false;
  $('#btnMapDl').onclick = async () => {
    busyCount++; setTask('Desenhando o mapa…', null);
    await new Promise((r) => setTimeout(r, 30));
    try { download(await canvasBlob(renderGameMap(S.ex.mapSize, true)), fileSafe(S.ex.name) + '_mapa.png'); } finally { busyCount--; setTask('', null); }
  };
}

// ================= teclado =================
window.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  if (t3d.walk) return; // WASD é da caminhada
  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undoRedo(S.undo, S.redo); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); undoRedo(S.redo, S.undo); }
    else if (k === 's') { e.preventDefault(); saveProjectFile(); }
    return;
  }
  if (e.key === ' ') { spaceDown = true; e.preventDefault(); updateCursorSize(); return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= LAYERS.length) { setActive(LAYERS[n - 1].id); return; }
  if (e.key === 'Escape' && S.ruler) { S.ruler = null; renderRuler(); return; }
  if (e.key === 'Escape' && S.riverA) { S.riverA = null; renderRiverPick(); UI.sync(); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && S.markerSel != null) { e.preventDefault(); deleteMarker(S.markerSel); return; }
  const tools = { h: 'pan', b: 'paint', e: 'erase', s: 'smooth', g: 'fill', i: 'pick', n: 'level', v: 'river', r: 'ruler', m: 'marker' };
  const k = e.key.toLowerCase();
  // o Balde não funciona no Esculpir: volta para a última camada comum
  if (tools[k]) { if (k === 'g' && S.active === 'sculpt') setActive(S.lastLayer || 'land'); setTool(tools[k]); return; }
  if (k === 'f') { fitView(); return; }
  if (e.key === '[' || e.key === ']') {
    S.brush.size = clamp(Math.round(S.brush.size * (e.key === ']' ? 1.15 : 1 / 1.15)), 2, 400);
    $('#brushSize').value = S.brush.size; updateBrushOut(); updateCursorSize();
  }
});
window.addEventListener('keyup', (e) => { if (e.key === ' ') { spaceDown = false; updateCursorSize(); } });

// ================= início =================
(async function init() {
  S.masks = emptyMasks(S.W);
  S.regions = new Uint8Array(S.W * S.W);
  S.sculpt = new Float32Array(S.W * S.W);
  S.veg = new Uint8Array(S.W * S.W);
  setupCanvases();
  UI.init();
  buildPresets();
  try { const ue = localStorage.getItem('forja.ue'); if (ue) S.ex.ue = UE.version(ue).id; } catch (e) { /* sem localStorage: fica o padrão */ }
  buildParams(); buildExportPanel(); bindControls(); setActive('land'); setTool('paint'); updateGuideUI(); updateErosionInfo();
  fitView();
  let restored = false;
  try {
    const saved = await idbGet('autosave');
    if (saved) { await deserializeProject(saved); restored = true; toast('Seu último trabalho foi restaurado.'); }
  } catch (err) { console.warn('Autosave não restaurado:', err); }
  if (!restored) { await newProject(false); S.dirty = false; }
  setInterval(autosave, 20000);
  window.addEventListener('beforeunload', () => { if (S.dirty) autosave(); });
})();
