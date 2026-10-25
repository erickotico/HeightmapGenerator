/* Forja de Mundos — cálculos e instruções do Landscape do Unreal Engine, por versão.
   Resolução por lado = Number of Components × Sections Per Component × Section Size (quads) + 1. */
'use strict';

const UE = {
  SECTION_SIZES: [7, 15, 31, 63, 127, 255],
  // Resoluções com uma combinação "limpa" (2×2 seções, até 32×32 componentes).
  // ★ = as que a documentação da Epic lista como recomendadas.
  RESOLUTIONS: [
    { res: 505, star: true }, { res: 1009, star: true }, { res: 1017 }, { res: 2017, star: true },
    { res: 2033 }, { res: 4033, star: true }, { res: 4065 }, { res: 8129, star: true },
    // Mundos gigantes: exportados em 3×3 pedaços "_x{col}_y{lin}". O Unreal monta os pedaços lado a lado SEM
    // borda compartilhada (total = 3 × pedaço) e só aceita pedaços em nível com World Partition
    // (UseSingleFileImport = !IsGridBased(), igual no código do 5.2, 5.6 e 5.8). Totais escolhidos para
    // fechar exato com 127 quads e 2×2 seções.
    { res: 10161, tiles: 3 }, { res: 12447, tiles: 3 }, { res: 16257, tiles: 3 }
  ],
  tilesFor(res) { const r = this.RESOLUTIONS.find((x) => x.res === res); return (r && r.tiles) || 1; },

  // O que muda de uma versão para outra no import do Landscape.
  // region: campo "World Partition Region Size" ('no' | 'maybe' | 'yes'); nanite: Nanite no Landscape.
  // pcgTable: nó "Load Data Table" do PCG (lê os marcadores como pontos). Conferido: existe no 5.6 e 5.8,
  // não existe no 5.2 (só o antigo "Data Table Row To Param Data"); 5.3–5.5 não conferidos.
  // A conta de altura (Scale Z / 128), o PNG 16-bit, os Section Sizes e o preenchimento automático
  // são iguais no código do 5.2, 5.6 e 5.8.
  VERSIONS: [
    { id: '4', pcgTable: 'no', label: 'UE 4.x (4.26 / 4.27)', engine: 4, wp: false, region: 'no', nanite: 'no', src: 'Não conferido no código (não há fonte do UE4 aqui). A conta de altura é a mesma documentada pela Epic desde o UE4.' },
    { id: '5.0', pcgTable: 'no', label: 'UE 5.0', engine: 5, wp: true, region: 'no', nanite: 'maybe', src: 'Deduzido do 5.2 (conferido no código).' },
    { id: '5.1', pcgTable: 'no', label: 'UE 5.1', engine: 5, wp: true, region: 'no', nanite: 'maybe', src: 'Deduzido do 5.2 (conferido no código).' },
    { id: '5.2', pcgTable: 'no', label: 'UE 5.2', engine: 5, wp: true, region: 'no', nanite: 'yes', src: 'Conferido no código-fonte do 5.2.' },
    { id: '5.3', pcgTable: 'maybe', label: 'UE 5.3', engine: 5, wp: true, region: 'maybe', nanite: 'yes', src: 'Não conferido: o campo Region Size pode ou não existir nesta versão.' },
    { id: '5.4', pcgTable: 'maybe', label: 'UE 5.4', engine: 5, wp: true, region: 'maybe', nanite: 'yes', src: 'Não conferido: o campo Region Size pode ou não existir nesta versão.' },
    { id: '5.5', pcgTable: 'maybe', label: 'UE 5.5', engine: 5, wp: true, region: 'yes', nanite: 'yes', src: 'Region Size confirmado por relato de usuário no 5.5.4; resto igual ao 5.6.' },
    { id: '5.6', pcgTable: 'yes', label: 'UE 5.6', engine: 5, wp: true, region: 'yes', nanite: 'yes', src: 'Conferido no código-fonte do 5.6.' },
    { id: '5.7', pcgTable: 'yes', label: 'UE 5.7', engine: 5, wp: true, region: 'yes', nanite: 'yes', src: 'Deduzido: 5.6 e 5.8 (conferidos) são iguais.' },
    { id: '5.8', pcgTable: 'yes', label: 'UE 5.8', engine: 5, wp: true, region: 'yes', nanite: 'yes', src: 'Conferido no código-fonte do 5.8.' }
  ],
  DEFAULT_VERSION: '5.8',
  version(id) { return this.VERSIONS.find((v) => v.id === id) || this.VERSIONS.find((v) => v.id === this.DEFAULT_VERSION); },

  combos(res) {
    const quads = res - 1, out = [];
    for (const s of [2, 1]) for (const q of this.SECTION_SIZES) {
      const comp = q * s;
      if (quads % comp === 0) out.push({ sectionQuads: q, sectionsPerComp: s, comps: quads / comp, compQuads: comp });
    }
    return out;
  },

  // Preferência: 2×2 seções, até 32×32 componentes, o menor número de componentes possível.
  best(res) {
    const c = this.combos(res);
    const score = (k) => (k.comps <= 32 ? 0 : 1000) + (k.sectionsPerComp === 2 ? 0 : 100) + k.comps;
    return c.sort((a, b) => score(a) - score(b))[0] || null;
  },

  // O que o Unreal preenche sozinho ao escolher o arquivo (ChooseBestComponentSizeForImport, igual no 5.2–5.8):
  // maior Section Size primeiro, 1×1 antes de 2×2, até 256 componentes por lado.
  unrealAuto(res) {
    const q = res - 1;
    for (let i = this.SECTION_SIZES.length - 1; i >= 0; i--) for (const s of [1, 2]) {
      const ss = this.SECTION_SIZES[i];
      if (q % (ss * s) === 0 && q / (ss * s) <= 256) return { sectionQuads: ss, sectionsPerComp: s, comps: q / (ss * s) };
    }
    return null;
  },

  // World Partition Region Size (4..64): menor que o Number of Components = Landscape em pedaços
  // (Streaming Proxies), o recomendado para mundo aberto; logo após o Import eles ficam descarregados
  // até carregar a região. Este valor (>= componentes) é a alternativa de um pedaço só.
  regionSize(comps) { return Math.min(64, Math.max(4, comps)); },

  zValues(mn, mx) {
    const zScale = ((mx - mn) * 12800) / 65535;
    return { zScale, locZ: mn * 100 + 256 * zScale, stepCm: ((mx - mn) / 65535) * 100 };
  },

  worldKm(res, mpq) { return ((res - 1) * mpq) / 1000; },

  modePath(v) {
    return v.engine === 4
      ? 'Painel Modes → Landscape (ícone de montanha) → Manage → New Landscape'
      : 'Seletor de modos (barra de cima) → Landscape → aba Manage → New';
  },

  sizeTier(km, v) {
    if (km <= 2.1) return { name: 'Pequeno', text: 'Cabe num nível comum.' + (v.wp ? ' World Partition é opcional.' : '') };
    if (!v.wp) {
      return km <= 8.2
        ? { name: 'Grande', text: 'O UE4 não tem World Partition. Um Landscape deste tamanho funciona num nível só, mas fica todo carregado; para streaming use World Composition (mundo em tiles).' }
        : { name: 'Enorme (escala MMO)', text: 'No UE4 mundos deste tamanho pedem World Composition (vários Landscapes em tiles). Considere usar o UE5, que tem World Partition.' };
    }
    if (km <= 8.2) return { name: 'Grande', text: 'Use World Partition (crie o nível pelo template Open World) para o Unreal carregar o mundo em pedaços.' };
    return { name: 'Enorme (escala MMO)', text: 'World Partition obrigatório na prática. Planeje HLOD, streaming e conteúdo procedural (PCG) desde o começo.' };
  },

  // Passo da Region Size: null quando a versão não tem o campo.
  regionStep(v, comps) {
    if (v.region === 'no') return null;
    return { value: this.regionSize(comps), conditional: v.region === 'maybe' };
  },

  perfTips(v) {
    const t = [];
    if (v.wp) t.push(['World Partition', 'crie o nível pelo template Open World. O Unreal divide o Landscape em pedaços (Landscape Streaming Proxies) e só carrega o que está perto do jogador.']);
    else t.push(['World Composition', 'no UE4, mundos grandes são divididos em vários níveis com um Landscape cada, carregados por distância.']);
    t.push(['Componentes', 'cada componente tem custo de CPU (culling e draw calls). Até 32 × 32 = 1024 é o limite confortável; por isso as resoluções da lista.']);
    t.push(['Metros por vértice', 'para ir além de ~8 km, prefira 2 m por vértice em vez de mais resolução.']);
    t.push(['Material', 'poucas camadas pintadas por componente; cada camada extra num componente é mais textura amostrada. Em mapas grandes, Runtime Virtual Texture ajuda muito.']);
    if (v.nanite === 'yes') t.push(['Nanite no Landscape', 'opção "Enable Nanite" nos detalhes do ator Landscape; reduz o custo da geometria distante.']);
    else if (v.nanite === 'maybe') t.push(['Nanite no Landscape', 'existe a partir do 5.2 (conferido); nesta versão, procure "Enable Nanite" nos detalhes do Landscape — se não houver, ignore.']);
    t.push(['Vegetação e objetos', 'PCG ou Foliage com instâncias em vez de colocar à mão' + (v.wp ? '; HLOD do World Partition para o que está longe.' : '.')]);
    return t;
  },

  // Como usar a Data Table de marcadores, conforme o que a versão tem.
  markerUsage(v) {
    const bp = 'Blueprint (qualquer versão): Get Data Table Row Names → For Each → Get Data Table Row → Spawn Actor na Posicao e Rotacao (escolha a classe pelo Tipo).';
    if (v.pcgTable === 'yes') {
      return ['d) PCG: nó "Load Data Table" (Output Type = Point). Em Attribute Mapping, ligue "Posicao" a "$Position".',
        '   Cada marcador vira um ponto com os atributos Nome, Tipo e Regiao; filtre por Tipo e gere o que quiser.',
        'e) Ou ' + bp];
    }
    if (v.pcgTable === 'maybe') {
      return ['d) PCG: se a sua versão tiver o nó "Load Data Table", use Output Type = Point e ligue "Posicao" a "$Position"',
        '   em Attribute Mapping (conferido no 5.6/5.8; não conferido nesta versão).',
        'e) Se não tiver: ' + bp];
    }
    return ['d) ' + bp];
  },

  fmt(n, d = 0) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); },

  // Texto do LEIA-ME. {ZSCALE}, {LOCZ}, {MIN}, {MAX}, {STEP} são preenchidos pelo motor com os valores exatos.
  readmeTemplate(o) {
    const v = this.version(o.ue), b = o.combo, km = this.worldKm(o.res, o.mpq), auto = this.unrealAuto(o.res);
    const tier = this.sizeTier(km, v), reg = this.regionStep(v, b.comps);
    const n = this.tilesFor(o.res), sfx = n > 1 ? '_x0_y0' : '';
    let stepNo = 0;
    const step = (s) => `${++stepNo}) ${s}`;
    const lines = [
      'FORJA DE MUNDOS — como importar no ' + v.label,
      'Sobre esta versão: ' + v.src,
      '==================================================================================',
      '',
      'Mundo: ' + o.name,
      'Tamanho: ' + this.fmt(km, 2) + ' km × ' + this.fmt(km, 2) + ' km (' + o.mpq + ' m entre vértices)',
      'Altitude: de {MIN} m a {MAX} m (nível do mar = 0 m). Precisão vertical: {STEP} cm.',
      ...(n > 1 ? [
        '',
        'MUNDO EM ' + n + '×' + n + ' PEDAÇOS de ' + o.res / n + ' × ' + o.res / n + ' (total ' + o.res + ' × ' + o.res + ').',
        'ATENÇÃO: o Unreal só aceita pedaços em nível com World Partition (template Open World).',
        'Num nível comum ele exige um arquivo único. Deixe todos os pedaços na mesma pasta.'
      ] : []),
      '',
      step(this.modePath(v) + ' → clique em "Import from File"'),
      '   (NÃO use "Create New": ele cria um terreno plano e ignora o arquivo.)',
      '',
      step('Heightmap File → escolha ' + o.base + '_heightmap' + sfx + '.png' + (n > 1 ? '  (o Unreal encontra os outros ' + (n * n - 1) + ' pedaços sozinho)' : '')),
      v.engine === 5
        ? '   O Unreal preenche sozinho: ' + auto.sectionQuads + 'x' + auto.sectionQuads + ' Quads, ' + auto.sectionsPerComp + 'x' + auto.sectionsPerComp + ', ' + auto.comps + ' x ' + auto.comps + ' componentes.'
        : '   O Unreal pode preencher sozinho outros valores válidos.',
      '   Funciona, mas troque para o recomendado (menos componentes = menos custo de CPU):',
      '   Section Size ................ ' + b.sectionQuads + 'x' + b.sectionQuads + ' Quads',
      '   Sections Per Component ...... ' + b.sectionsPerComp + 'x' + b.sectionsPerComp + ' Sections',
      '   Number of Components ........ ' + b.comps + ' x ' + b.comps + '  (total ' + b.comps * b.comps + ')',
      '   Confira: Overall Resolution . ' + o.res + ' x ' + o.res,
      ''
    ];
    if (reg) {
      lines.push(
        step(reg.conditional ? 'SÓ SE O CAMPO "World Partition Region Size" APARECER (nível com World Partition):' : 'Em nível com World Partition (template Open World):'),
        '   World Partition Region Size . deixe o padrão',
        '   O Unreal divide o Landscape em pedaços (Streaming Proxies) que carregam perto do jogador.',
        '   É o certo para mundo aberto. Logo depois do Import os pedaços podem ficar DESCARREGADOS',
        '   e o terreno "não aparece": abra Window → World Partition, selecione todas as células',
        '   e clique em "Load Region from Selection". Depois salve tudo (File → Save All).',
        '   (Valor ' + reg.value + ' = um pedaço só, sempre carregado: só para mundos pequenos.)',
        ''
      );
    }
    lines.push(
      step('Transform (no mesmo painel)'),
      '   Location X / Y .............. 0 / 0' + (v.engine === 5 ? '   (o Unreal centraliza o terreno nesse ponto)' : ''),
      '   Location Z .................. {LOCZ}   (assim o nível do mar fica em Z = 0)',
      '   Scale X ..................... ' + o.mpq * 100,
      '   Scale Y ..................... ' + o.mpq * 100,
      '   Scale Z ..................... {ZSCALE}',
      '   IMPORTANTE: o PNG não guarda metros, só tons de 0 a 65535. É o Scale Z que diz ao Unreal',
      '   quanto vale o branco. Com o Scale Z padrão (100) o relevo fica achatado.',
      '',
      step('Clique no botão "Import" no fim do painel.'),
      '   Para achar o terreno: no Outliner selecione "Landscape" e aperte F.',
      '   O mundo tem ' + this.fmt(km, 1) + ' km: afaste bastante a câmera (o terreno é visto de cima;',
      '   se a câmera ficar por baixo dele, não aparece nada).',
      '',
      '   NÃO APARECE NADA? Confira nesta ordem:',
      '   - Outliner tem um ator "Landscape"? Se não tem, a importação não aconteceu: refaça e clique em "Import".',
      '   - Menu Show da janela 3D (ícone de olho): a opção "Landscape" precisa estar marcada (atalho Alt+L).',
      '   - Nível vazio (Empty Level) não tem luz nem céu: o terreno fica preto no fundo preto.',
      '     Teste com Alt+3 (modo Unlit) ou crie o nível pelo template Open World.',
      '   - World Partition: Window → World Partition, selecione as células e "Load Region from Selection".',
      '',
      '==================================================================================',
      'PRONTO: o terreno está importado. Os passos abaixo NÃO são obrigatórios agora',
      '(material, máscaras, água, mapa). Faça quando for montar o mundo.',
      '==================================================================================',
      '',
      step('Camadas de material (pasta camadas/)'),
      '   Crie no material do Landscape as camadas Grama, Rocha, Areia e Neve (Weight-Blended).',
      '   No painel de importação, depois de escolher o material, aponte cada camada para o PNG',
      '   de mesmo nome' + (n > 1 ? ' (o pedaço _x0_y0, ex.: ' + o.base + '_Grama_x0_y0.png)' : '') + '. Se preferir, importe depois em Landscape → Paint → Target Layers.',
      '',
      step('Regiões (pasta regioes/) — se exportou'),
      '   ' + o.base + '_regioes' + sfx + '.png = mapa colorido; um PNG preto/branco por região' + (n > 1 ? ' (todos em pedaços).' : '.'),
      '   Use como textura de máscara ' + (v.engine === 5 ? 'no PCG' : 'nas suas ferramentas de vegetação') + ' (vegetação, spawns, masmorras por reino).',
      '',
      step('Água'),
      '   O mar fica em Z = 0. Coloque um plano de água em Z = 0' + (v.engine === 5 ? ' ou um Water Body Ocean (plugin Water).' : ' (ou o plugin Water, se a sua versão tiver).'),
      '   Lagos pintados como "mar" também ficam no nível 0.',
      '',
      ...(o.map ? [
        step('Mapa do jogo (pasta mapa/)'),
        '   ' + o.base + '_mapa.png = mapa ilustrado (relevo, rios, reinos e marcadores com nome).',
        '   ' + o.base + '_mapa_limpo.png = só o terreno, sem textos (bom para minimapa).',
        '   Importe como textura e, nos detalhes dela: Texture Group = UI, Compression = UserInterface2D,',
        '   Mip Gen Settings = NoMipmaps. Use num Widget (Image) da tela de mapa / minimapa.',
        '   O mapa cobre o mundo inteiro, com o centro em X = 0 / Y = 0. Topo da imagem = Y negativo.',
        '   Posição de um ator na imagem (0 a 1):',
        '      U = (X + ' + this.fmt(o.map.half, 0).replace(/\./g, '') + ') / ' + this.fmt(o.map.sizeCm, 0).replace(/\./g, ''),
        '      V = (Y + ' + this.fmt(o.map.half, 0).replace(/\./g, '') + ') / ' + this.fmt(o.map.sizeCm, 0).replace(/\./g, ''),
        '   (X e Y em cm; multiplique U e V pelo tamanho do Image no Widget para posicionar o ícone.)',
        ''
      ] : []),
      ...(o.veg && o.veg.length ? [
        step('Vegetação (pasta vegetacao/) — ' + o.veg.join(', ')),
        '   ' + o.base + '_vegetacao.png = mapa colorido (uma cor por tipo, legenda no _vegetacao.json).',
        '   ' + o.base + '_veg_NN_tipo.png = uma máscara por tipo: branco = tem aquela vegetação (bordas suaves).',
        '   Cobrem o mundo inteiro (centro em X = 0 / Y = 0), igual ao mapa de regiões.',
        '   Importe como textura (Compression = Masks ou Grayscale, sRGB desligado) e use ' + (v.engine === 5 ? 'no PCG: Get Texture Data' : 'na sua ferramenta de vegetação') + ' com a',
        '   mesma escala do Landscape; a máscara vira a densidade de pontos onde nascem as árvores daquele tipo.',
        ''
      ] : []),
      ...(o.markers ? [
        step('Marcadores (pasta marcadores/) — ' + o.markers + ' ponto(s)'),
        '   ' + o.base + '_marcadores.csv: tabela para virar Data Table no Unreal.',
        '   a) Crie uma Structure (ex.: S_ForjaMarcador) com os campos, com estes nomes e tipos exatos:',
        '        Nome (String) · Tipo (String) · Regiao (String) · Posicao (Vector) · Rotacao (Rotator) · Medida_m (Float)',
        '   b) Arraste o CSV para o Content Browser → Data Table → Row Structure = S_ForjaMarcador.',
        '   c) Posicao já está em cm, no mesmo sistema do Landscape (Z = altura do terreno no ponto).',
        '      Pontes e cachoeiras automáticas: Rotacao = direção da estrada / do rio; Medida_m = vão da ponte ou altura da queda.',
        ...this.markerUsage(v).map((l) => '   ' + l),
        '   ' + o.base + '_marcadores.json: os mesmos dados em JSON (para ferramentas próprias).',
        ''
      ] : []),
      ...(o.rivers ? [
        step('Rios (pasta rios/) — ' + o.rivers + ' rio(s)'),
        '   ' + o.base + '_rios.json: o eixo de cada rio (rios em linha e camada Rios pintada), da nascente para a foz, em cm (centro em X = 0 / Y = 0).',
        '   Cada ponto tem x, y, z (fundo do leito, estimado) e largura (cm). Rios pintados com menos de 150 m ficam de fora.',
        ...(v.engine === 5 ? [
          '   Plugin Water: um Water Body River por rio, com estes pontos na spline e "Affects Landscape" desligado',
          '   (o leito já está cavado no terreno). Ponha a água entre o fundo e as margens medidas no Landscape.'
        ] : ['   Use os pontos como spline do seu sistema de água; o leito já está cavado no terreno.']),
        ''
      ] : []),
      ...(o.lakes ? [
        step('Lagos (pasta lagos/) — ' + o.lakes + ' lago(s)'),
        '   ' + o.base + '_lagos.json: contorno de cada lago (x, y em cm) e o nível da água (nivel, em cm). O fundo já está cavado.',
        v.engine === 5
          ? '   Plugin Water: um Water Body Lake por lago, com o contorno na spline (fechada) na altura do nível e "Affects Landscape" desligado.'
          : '   Ponha um plano de água em cada lago, na altura do nível.',
        ''
      ] : []),
      ...(o.roads ? [
        step('Estradas e trilhas (pasta estradas/) — ' + o.roads + ' caminho(s)'),
        '   ' + o.base + '_estradas.json: traçado de cada estrada/trilha (x, y, z em cm), tipo e largura (cm).',
        '   O terreno já foi suavizado na largura da via, acompanhando o relevo (sem corte seco).',
        v.engine === 5
          ? '   Use os pontos numa spline (Landscape Spline, Spline Mesh de estrada ou PCG) para pôr o calçamento e tirar a vegetação de cima.'
          : '   Use os pontos numa spline de estrada para pôr o calçamento.',
        ''
      ] : []),
      ...(o.biomes && o.biomes.length ? [
        step('Biomas (pasta biomas/) — ' + o.biomes.join(', ')),
        '   ' + o.base + '_biomas.png: máscara RGBA do mundo inteiro (centro em X = 0 / Y = 0): R = deserto, G = floresta,',
        '   B = gelo/neve, A = vulcânico; onde todos são 0 é campo. Bordas suaves.',
        '   Importe como textura (Compression = Masks ou VectorDisplacementmap, sRGB desligado) e use no material do Landscape',
        '   (coordenadas do mundo divididas pelo tamanho do mundo) para trocar as texturas por bioma; também serve de máscara para o PCG.',
        ''
      ] : []),
      'Tamanho do mundo: ' + tier.name + ' — ' + tier.text,
      '',
      'Desempenho:',
      ...this.perfTips(v).map(([k, d]) => '   - ' + k + ': ' + d),
      '',
      'Gerado pela Forja de Mundos.'
    );
    return lines.join('\n');
  }
};
