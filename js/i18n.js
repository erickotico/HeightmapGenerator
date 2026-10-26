/* Forja de Mundos — idioma (PT / EN).
   O site é escrito em português; em inglês, um observador troca cada texto da página (menus, painéis, avisos,
   janelas) pela tradução do dicionário abaixo, inclusive o que o código monta depois. {s} = trecho variável
   (número, nome). O LEIA-ME do .zip passa por I18N.doc(). Nomes de pastas e campos dos arquivos exportados
   não mudam com o idioma: são o formato que as ferramentas da engine leem. */
'use strict';

const I18N_EN = {
  // ---------- camadas ----------
  'Terra / Mar': 'Land / Sea',
  'Pinte onde é terra. Apagar (ou Shift) cria mar, baías e lagos.': 'Paint where there is land. Erase (or Shift) makes sea, bays and lakes.',
  'Montanhas': 'Mountains',
  'Pinte as cordilheiras. A Intensidade controla a altura (1 = altura máxima de Montanhas).': 'Paint the mountain ranges. Intensity controls the height (1 = Mountains maximum height).',
  'Colinas': 'Hills',
  'Relevo ondulado de altura média.': 'Rolling terrain of medium height.',
  'Planaltos': 'Plateaus',
  'Áreas altas e planas com bordas íngremes (mesas).': 'High flat areas with steep edges (mesas).',
  'Aplainar': 'Flatten',
  'Deixa o terreno plano: cidades, castelos, campos de batalha.': 'Makes the ground flat: cities, castles, battlefields.',
  'Rios (pintura)': 'Rivers (painted)',
  'Pincel fino, da montanha até o mar. Cava o leito e abre um vale suave. Para rios editáveis use a ferramenta Rio (V).': 'Thin brush, from the mountain to the sea. Digs the bed and opens a gentle valley. For editable rivers use the River tool (V).',
  'Lagos': 'Lakes',
  'Pinte o formato do lago. A água fica plana na altura da margem mais baixa e o fundo é cavado (Ajustes → Profundidade dos lagos).': 'Paint the shape of the lake. The water is flat at the height of the lowest shore and the bottom is dug out (Terrain settings → Lake depth).',
  'Esculpir (m)': 'Sculpt (m)',
  'Ajuste fino em metros, somado por cima de tudo: Pintar = Elevar, Apagar = Rebaixar, Nivelar = altura exata. O Conta-gotas pega a altura do mapa.': 'Fine adjustment in meters, added on top of everything: Paint = Raise, Erase = Lower, Level = exact height. The Eyedropper picks the height from the map.',
  'Regiões / Reinos': 'Regions / Kingdoms',
  'Não muda o relevo. Vira máscara para o PCG (vegetação, spawns e masmorras por reino).': 'Does not change the terrain. Becomes a mask for PCG (vegetation, spawns and dungeons per kingdom).',
  'Vegetação': 'Vegetation',
  'Áreas de vegetação: cada ponto guarda um tipo (floresta, pinheiros, selva…). Não muda o relevo; vira máscara para o PCG espalhar as plantas.': 'Vegetation areas: each point stores one type (forest, pines, jungle…). Does not change the terrain; becomes a mask for PCG to scatter the plants.',
  'Biomas': 'Biomes',
  'Bioma de cada lugar (deserto, floresta, gelo, vulcânico; o resto é campo). Não muda o relevo: vira a máscara de biomas do material do terreno.': 'Biome of each place (desert, forest, ice, volcanic; the rest is grassland). Does not change the terrain: becomes the biome mask of the terrain material.',
  'Deserto': 'Desert', 'Floresta': 'Forest', 'Gelo / neve': 'Ice / snow', 'Vulcânico': 'Volcanic',
  // ---------- ajustes de terreno ----------
  'Costa e oceano': 'Coast and ocean',
  'Suavidade da costa': 'Coast smoothness', 'Arredonda o contorno que você pintou.': 'Rounds off the outline you painted.',
  'Recorte da costa': 'Coast roughness', 'Quanto o ruído recorta o litoral (baías, cabos, ilhotas).': 'How much noise breaks up the coastline (bays, capes, islets).',
  'Tamanho dos recortes': 'Size of the inlets', 'Tamanho típico das baías e cabos.': 'Typical size of bays and capes.',
  'Largura da transição': 'Transition width', 'Distância em que o fundo do mar sobe até a terra. Pequeno = costa íngreme.': 'Distance over which the sea floor rises to the land. Small = steep coast.',
  'Altura na costa': 'Height at the coast', 'Profundidade perto da costa': 'Depth near the coast', 'Profundidade do oceano': 'Ocean depth',
  'Oceano fundo demais gasta precisão do heightmap sem necessidade: ninguém vê o fundo.': 'A very deep ocean wastes heightmap precision for nothing: nobody sees the bottom.',
  'Planícies': 'Plains', 'Ondulação': 'Undulation', 'Tamanho das ondulações': 'Size of the undulations',
  'Subida para o interior': 'Rise inland', 'O interior do continente fica mais alto que a costa.': 'The interior of the continent is higher than the coast.',
  'Distância da subida': 'Rise distance', 'Altura das colinas': 'Hill height', 'Tamanho das colinas': 'Hill size',
  'Altura máxima': 'Maximum height', 'Altura com intensidade 1 no pincel de Montanhas.': 'Height with intensity 1 on the Mountains brush.',
  'Tamanho das cristas': 'Ridge size', 'Distância típica entre cristas e picos.': 'Typical distance between ridges and peaks.',
  'Suavidade da base': 'Base softness', 'Quanto a base da montanha se espalha além do que você pintou.': 'How far the mountain base spreads beyond what you painted.',
  'Altura do planalto': 'Plateau height', 'Rios e áreas planas': 'Rivers and flat areas',
  'Profundidade do leito': 'Riverbed depth', 'Largura do leito': 'Riverbed width', 'Largura do vale': 'Valley width',
  'Profundidade dos lagos': 'Lake depth', 'Quanto o fundo do lago fica abaixo da água, no meio. Perto da margem é raso.': 'How far the lake bottom is below the water in the middle. Near the shore it is shallow.',
  'Raio do aplainar': 'Flatten radius', 'Quanto maior, mais plano fica onde você pintou Aplainar.': 'The bigger, the flatter it gets where you painted Flatten.',
  'Aspecto natural': 'Natural look', 'Distorção': 'Distortion', 'Entorta os padrões de ruído para não parecerem artificiais.': 'Warps the noise patterns so they do not look artificial.',
  'Escala da distorção': 'Distortion scale', 'Rugosidade': 'Roughness',
  'Erosão (ajustes)': 'Erosion (settings)', 'Quantidade de chuva': 'Amount of rain', 'Gotas por pixel de terra. Mais = mais ravinas, mais demorado.': 'Drops per land pixel. More = more gullies, slower.',
  'Força de escavação': 'Digging strength', 'Depósito de sedimento': 'Sediment deposit', 'Evaporação': 'Evaporation',
  'Alta = gotas morrem cedo, ravinas curtas.': 'High = drops die early, short gullies.', 'Inércia da água': 'Water inertia', 'Alta = canais mais retos e longos.': 'High = straighter and longer channels.',
  'Vida da gota': 'Drop lifetime', 'Raio de escavação': 'Digging radius', 'Desmoronamento (passadas)': 'Collapse (passes)',
  'Erosão térmica: suaviza penhascos acima do ângulo de repouso.': 'Thermal erosion: smooths cliffs above the angle of repose.', 'Ângulo de repouso': 'Angle of repose',
  'Camadas de material': 'Material layers', 'Linha de neve': 'Snow line', 'Altura da areia': 'Sand height', 'Inclinação da rocha': 'Rock slope', 'Acima desse ângulo vira rocha.': 'Above this angle it becomes rock.',
  // ---------- avisos e textos do app ----------
  'Processando…': 'Processing…', 'Erro no motor de geração': 'Error in the generation engine', 'Erro: {s}': 'Error: {s}',
  'Apagar tudo do mapa (terra, relevo, rios, lagos, estradas, esculpir, regiões, vegetação, biomas, marcadores e heightmap base)? A imagem-guia e os ajustes ficam. Dá para desfazer com Ctrl+Z.': 'Erase everything on the map (land, terrain, rivers, lakes, roads, sculpt, regions, vegetation, biomes, markers and base heightmap)?\nThe guide image and the settings stay. Ctrl+Z undoes it.',
  'Mapa limpo. Ctrl+Z desfaz.': 'Map cleared. Ctrl+Z undoes it.', 'Altura alvo: {s} m': 'Target height: {s} m',
  'O Balde não funciona na camada Esculpir. Use Elevar, Rebaixar ou Nivelar.': 'The Bucket does not work on the Sculpt layer. Use Raise, Lower or Level.',
  'Carregue uma imagem-guia primeiro.': 'Load a guide image first.', 'cor escolhida': 'color picked',
  'altura {s} m': 'height {s} m', 'esculpir {s} m': 'sculpt {s} m', 'Erosão aplicada.': 'Erosion applied.',
  'Altitude {s} m a {s} m': 'Altitude {s} m to {s} m', 'terra {s}%': 'land {s}%', 'mundo {s} km': 'world {s} km',
  'Aplicada': 'Applied', 'Aplicada ✓': 'Applied ✓', ', mas os ajustes mudaram depois. Aplique de novo.': ', but the settings changed afterwards. Apply again.',
  'Ainda não aplicada (a exportação aplica se a opção estiver marcada).': 'Not applied yet (the export applies it if the option is checked).',
  'Pinte ou gere a terra primeiro.': 'Paint or generate the land first.', 'Cor': 'Color', 'Nome': 'Name', 'Excluir região': 'Delete region', 'Região {s}': 'Region {s}',
  'Máximo de 32 regiões.': 'Maximum of 32 regions.', 'Excluir "{s}"? A área pintada dela será apagada.': 'Delete "{s}"? Its painted area will be erased.',
  'Sorteia uma semente nova': 'Draws a new seed', 'Semente': 'Seed', 'Sortear': 'Random',
  'Mesma semente = mesmo terreno. Mudar a semente troca os detalhes; o que você pintou continua.': 'Same seed = same terrain. Changing the seed changes the details; what you painted stays.',
  'Restaurar padrões': 'Restore defaults', 'Voltar todos os ajustes de terreno para o padrão? (a pintura não muda)': 'Reset all terrain settings to default? (the painting does not change)',
  '{s} × {s} — {s}×{s} pedaços': '{s} × {s} — {s}×{s} tiles', '(precisa de World Partition)': '(needs World Partition)',
  'Esta versão não tem World Partition: mundos em pedaços não importam. Voltei para 8129.': 'This version has no World Partition: tiled worlds do not import. Switched back to 8129.',
  'Mundo:': 'World:', 'Landscape: {s}×{s} quads · {s}×{s} seções · {s}×{s} componentes': 'Landscape: {s}×{s} quads · {s}×{s} sections · {s}×{s} components',
  'Cada pixel de trabalho = {s} m': 'Each working pixel = {s} m', 'O branco precisa ficar acima do preto.': 'White must be above black.',
  'Imagem carregada. Pinte por cima ou use "Converter".': 'Image loaded. Paint over it or use "Convert".', 'Não consegui abrir essa imagem.': 'Could not open this image.',
  'use o conta-gotas no mapa': 'use the eyedropper on the map', 'Escolha a cor com o Conta-gotas (clique no mapa).': 'Pick the color with the Eyedropper (click on the map).',
  '{s}% do mapa marcado em "{s}".': '{s}% of the map marked in "{s}".', 'Projeto aberto.': 'Project opened.',
  'Formato não suportado. Use .forja, .png, .jpg ou .jpeg.': 'Unsupported format. Use .forja, .png, .jpg or .jpeg.', 'Não consegui ler essa imagem.': 'Could not read this image.',
  ', tons de cinza': ', grayscale', ', colorida': ', color',
  'Este parece um export da Forja: use a altitude mínima e máxima escritas no LEIA-ME_Unreal.txt dele.': 'This looks like a Forja export: use the minimum and maximum altitude written in its LEIA-ME_Unreal.txt.',
  'Altura em metros do pixel mais escuro e do mais claro. O que ficar abaixo de 0 m vira mar.': 'Height in meters of the darkest and the brightest pixel. Anything below 0 m becomes sea.',
  'Abrir imagem': 'Open image', 'Como usar esta imagem?': 'How to use this image?', 'Imagem-guia (desenho do mapa)': 'Guide image (map drawing)',
  'Fica por baixo do mapa para você pintar em cima, ou converter as cores em camadas. Ideal para um mapa desenhado à mão, no Paint ou foto do papel.': 'Stays under the map so you can paint over it, or convert the colors into layers. Ideal for a hand-drawn map, a Paint drawing or a photo of paper.',
  'Heightmap (relevo em tons de cinza)': 'Heightmap (terrain in grayscale)',
  'Preto = baixo, branco = alto. Ideal para heightmap de outro programa ou exportado daqui. PNG 16-bit mantém a precisão total; JPG e PNG 8-bit têm só 256 níveis e podem sair em degraus.': 'Black = low, white = high. Ideal for a heightmap from another program or exported from here. 16-bit PNG keeps full precision; JPG and 8-bit PNG have only 256 levels and may come out in steps.',
  'Preto (m)': 'Black (m)', 'Branco (m)': 'White (m)', 'Imagem-guia carregada. Pinte por cima ou use "Converter".': 'Guide image loaded. Paint over it or use "Convert".',
  'A altura do branco precisa ser maior que a do preto.': 'The white height must be greater than the black height.', 'Substituir o heightmap base atual?': 'Replace the current base heightmap?',
  'Lendo heightmap…': 'Reading heightmap…', 'não é quadrada: usei o quadrado central': 'not square: used the central square', 'é 8-bit: o relevo pode sair em degraus': 'it is 8-bit: the terrain may come out in steps',
  'Heightmap importado': 'Heightmap imported', 'Heightmap importado.': 'Heightmap imported.',
  'Remover o heightmap base? O relevo volta a ser gerado a partir da pintura (a costa fica igual).': 'Remove the base heightmap? The terrain goes back to being generated from the painting (the coast stays the same).',
  'Este arquivo não é um projeto da Forja de Mundos.': 'This file is not a Forja de Mundos project.', 'Projeto salvo. Guarde o arquivo .forja para continuar depois.': 'Project saved. Keep the .forja file to continue later.',
  'Salvo automaticamente às {s}': 'Saved automatically at {s}', 'Salvamento automático indisponível — use Salvar': 'Autosave unavailable — use Save',
  'Começar um mundo novo? O atual some (salve antes se quiser guardar).': 'Start a new world? The current one is lost (save it first if you want to keep it).',
  'Espere o terreno terminar de gerar.': 'Wait for the terrain to finish generating.', 'O mundo está todo no mar. Pinte ou gere terra primeiro.': 'The whole world is sea. Paint or generate land first.',
  'Mundo gigante: {s} pedaços de {s}×{s} (total {s}×{s}, {s} km). Pode levar vários minutos. No Unreal, só importa em nível com World Partition. Dica: use a resolução de trabalho 2048 para mais detalhe. Continuar?': 'Giant world: {s} tiles of {s}×{s} (total {s}×{s}, {s} km).\nIt may take several minutes. In Unreal it only imports in a World Partition level.\nTip: use working resolution 2048 for more detail.\nContinue?',
  '8129×8129 tem 66 milhões de pontos. A exportação pode levar alguns minutos e usar 1–2 GB de memória. Continuar?': '8129×8129 has 66 million points. The export may take a few minutes and use 1–2 GB of memory. Continue?',
  'Gravando máscaras de vegetação…': 'Writing vegetation masks…', 'Desenhando o mapa do jogo…': 'Drawing the game map…',
  'valores exatos do último export': 'exact values from the last export', 'estimado — o valor exato sai no LEIA-ME do .zip': 'estimated — the exact value is in the .zip README',
  'recomendado': 'recommended', 'componentes demais (custo de CPU)': 'too many components (CPU cost)', 'válido; 1×1 tem LOD menos granular': 'valid; 1×1 has coarser LOD', 'válido': 'valid',
  'só se o campo aparecer': 'only if the field appears', '(não confirmado nesta versão).': '(not confirmed in this version).', 'em nível com World Partition.': 'in a World Partition level.',
  'padrão': 'default', '{s} = um pedaço só, sempre carregado (só para mundos pequenos)': '{s} = a single piece, always loaded (only for small worlds)',
  'Region Size:': 'Region Size:', 'com o padrão, o Unreal divide o Landscape em pedaços (Streaming Proxies) que carregam perto do jogador, o certo para mundo aberto. Logo depois do Import os pedaços podem ficar': 'with the default, Unreal splits the Landscape into pieces (Streaming Proxies) that load near the player, which is right for an open world. Right after the Import the pieces may be',
  'descarregados': 'unloaded', 'e o terreno não aparece: abra': 'and the terrain does not show: open', ', selecione todas as células e clique em': ', select all cells and click', '. Depois salve tudo (': '. Then save everything (',
  'Nesta versão não existe o campo World Partition Region Size: o Landscape é criado inteiro e fica carregado.': 'This version has no World Partition Region Size field: the Landscape is created whole and stays loaded.',
  'O Unreal preenche sozinho': 'Unreal fills in by itself', 'O Unreal pode preencher sozinho outros valores válidos.': 'Unreal may fill in other valid values by itself.',
  'Mundo em {s}×{s} pedaços': 'World in {s}×{s} tiles', 'de {s}×{s}. O Unreal só aceita pedaços em nível com': 'of {s}×{s}. Unreal only accepts tiles in a level with',
  '(template Open World); num nível comum ele pede arquivo único. Deixe todos os pedaços na mesma pasta.': '(Open World template); in a regular level it asks for a single file. Keep all tiles in the same folder.',
  'o Unreal acha os outros {s} pedaços sozinho': 'Unreal finds the other {s} tiles by itself', 'PNG 16-bit em tons de cinza': '16-bit grayscale PNG',
  'o Unreal centraliza o terreno nesse ponto': 'Unreal centers the terrain on this point', ', selecione as células e': ', select the cells and',
  'ponha o Water Body Ocean ou um plano de água ali': 'place the Water Body Ocean or a water plane there', 'ponha um plano de água ali': 'place a water plane there',
  'Guia do Unreal — {s}': 'Unreal guide — {s}', 'Versão do Unreal': 'Unreal version', '1. Criar o Landscape': '1. Create the Landscape', '{s} → clique em': '{s} → click',
  '. Não use': '. Do not use', ': ele cria um terreno plano e ignora o arquivo.': ': it creates a flat terrain and ignores the file.', 'Escolha o': 'Choose the',
  '. {s} Funciona, mas troque para o recomendado (menos componentes = menos custo de CPU):': '. {s} It works, but switch to the recommended one (fewer components = less CPU cost):',
  'Campo': 'Field', 'Valor': 'Value', 'total {s}': 'total {s}', 'confira que bate': 'check that it matches', '2. Transform (mesmo painel)': '2. Transform (same panel)',
  'deixa o nível do mar em Z = 0': 'puts sea level at Z = 0', '{s} m entre vértices': '{s} m between vertices', 'faixa de {s} m a {s} m': 'range from {s} m to {s} m',
  'Depois clique no botão': 'Then click the', 'no fim do painel. Para achar o terreno: no Outliner selecione': 'button at the end of the panel. To find the terrain: in the Outliner select', 'e aperte': 'and press',
  '. O mundo tem {s} km, então afaste bastante a câmera. O terreno só é visível de cima; se a câmera estiver por baixo dele, não aparece nada.': '. The world is {s} km wide, so move the camera far away. The terrain is only visible from above; if the camera is below it, nothing shows.',
  'O Scale Z é obrigatório:': 'Scale Z is required:',
  'o PNG não guarda metros, só tons de cinza de 0 a 65535. Com o Scale Z padrão (100) o Unreal espreme o relevo inteiro em cerca de 512 m e ele fica achatado. A ferramenta calcula o Scale Z para caber exatamente do ponto mais fundo ao pico mais alto, com precisão de {s} cm, e o Location Z que combina com ele.': 'the PNG does not store meters, only gray levels from 0 to 65535. With the default Scale Z (100) Unreal squeezes the whole terrain into about 512 m and it comes out flattened. The tool computes the Scale Z to fit exactly from the deepest point to the highest peak, with {s} cm precision, and the matching Location Z.',
  'Não aparece nada?': 'Nothing shows?', 'Confira nesta ordem:': 'Check in this order:', 'O Outliner tem um ator': 'Does the Outliner have a', '? Se não tem, a importação não aconteceu: refaça e clique em': 'actor? If not, the import did not happen: redo it and click',
  'No menu': 'In the', 'da janela 3D (ícone de olho), a opção': 'menu of the 3D viewport (eye icon), the', 'precisa estar marcada (atalho': 'option must be checked (shortcut', ', fácil de apertar sem querer).': ', easy to press by accident).',
  'Nível vazio (Empty Level) não tem luz nem céu: o terreno fica preto no fundo preto. Teste com': 'An Empty Level has no light or sky: the terrain is black on a black background. Test with', '(modo Unlit) ou crie o nível pelo template': '(Unlit mode) or create the level from the template',
  'Pronto: com o terreno aparecendo, a importação acabou.': 'Done: once the terrain shows, the import is finished.', 'O resto desta página (material, água, mapa) é para quando for montar o mundo, não é obrigatório agora.': 'The rest of this page (material, water, map) is for when you build the world; it is not required now.',
  '3. O que isso gera': '3. What this produces', 'Mundo de': 'World of', '({s} km²), {s} vértices.': '({s} km²), {s} vertices.', 'Altitude de {s} m a {s} m; o mar fica em Z = 0 ({s}).': 'Altitude from {s} m to {s} m; the sea is at Z = 0 ({s}).',
  'Camadas de material: crie no material do Landscape as camadas': 'Material layers: create in the Landscape material the layers', 'Grama, Rocha, Areia, Neve': 'Grama, Rocha, Areia, Neve (Grass, Rock, Sand, Snow)',
  'e aponte cada uma para o PNG da pasta': 'and point each one to the PNG in the folder', '(na importação, ou depois em Paint → Target Layers).': '(at import, or later in Paint → Target Layers).',
  '4. Mapa do jogo e marcadores': '4. Game map and markers', 'Mapa (pasta': 'Map (folder',
  'é uma imagem para a interface, não passa pelo PCG. Importe como textura (Texture Group = UI, Compression = UserInterface2D, Mip Gen Settings = NoMipmaps) e use num Widget de mapa/minimapa. O mapa cobre o mundo inteiro, centro em X = 0 / Y = 0, topo da imagem = Y negativo. Posição de um ator na imagem (0 a 1):': 'is an image for the UI, it does not go through PCG. Import it as a texture (Texture Group = UI, Compression = UserInterface2D, Mip Gen Settings = NoMipmaps) and use it in a map/minimap Widget. The map covers the whole world, center at X = 0 / Y = 0, top of the image = negative Y. Position of an actor on the image (0 to 1):',
  'Marcadores (pasta': 'Markers (folder', 'CSV pronto para virar Data Table. Crie uma Structure com': 'CSV ready to become a Data Table. Create a Structure with',
  ', arraste o CSV para o Content Browser e escolha essa Structure. A Posicao já vem em cm no mesmo sistema do Landscape. Nas pontes e cachoeiras automáticas, a Rotacao aponta na direção da estrada / do rio e a Medida_m é o vão da ponte ou a altura da queda.': ', drag the CSV into the Content Browser and choose that Structure. Posicao already comes in cm in the same system as the Landscape. On automatic bridges and waterfalls, Rotacao points along the road / river and Medida_m is the bridge span or the drop height.',
  'Outras combinações válidas para {s} × {s}': 'Other valid combinations for {s} × {s}', 'Tamanho do mundo por resolução e metros por vértice': 'World size by resolution and meters per vertex', 'Resolução': 'Resolution',
  '★ = tamanhos listados pela Epic. 1 m é o padrão do Unreal. 2 m dá um mundo 4× maior em área com o mesmo custo; o detalhe fino passa a vir do material e da vegetação.': '★ = sizes listed by Epic. 1 m is the Unreal default. 2 m gives a world 4× larger in area at the same cost; fine detail then comes from the material and the vegetation.',
  'Como deixar um mapa grande leve': 'How to keep a big map light',
  'Distância: {s}': 'Distance: {s}', 'Altura: {s} m → {s} m ({s} m)': 'Height: {s} m → {s} m ({s} m)', 'Inclinação média: {s}% ({s}°)': 'Average slope: {s}% ({s}°)',
  'A pé (5 km/h): {s} min · a cavalo (15 km/h): {s} min': 'On foot (5 km/h): {s} min · on horseback (15 km/h): {s} min',
  // ---------- modelos de mundo ----------
  'Continente equilibrado': 'Balanced continent', 'Um continente com cordilheiras, colinas e planícies. Bom ponto de partida.': 'A continent with mountain ranges, hills and plains. A good starting point.',
  'Ilha tropical': 'Tropical island', 'Uma ilha com praias largas, morros e um pico vulcânico. Sem neve.': 'An island with wide beaches, hills and a volcanic peak. No snow.',
  'Arquipélago': 'Archipelago', 'Muitas ilhas de tamanhos variados. Ótimo para navegação.': 'Many islands of various sizes. Great for sailing.',
  'Terra de montanhas': 'Mountain land', 'Cordilheiras altas com neve, vales fundos. Mundo vertical e desafiador.': 'High snowy ranges, deep valleys. A vertical and challenging world.',
  'Planícies e colinas': 'Plains and hills', 'Campos abertos e colinas suaves. Bom para cavalos, cidades e batalhas.': 'Open fields and gentle hills. Good for horses, cities and battles.',
  'Costa de fiordes': 'Fjord coast', 'Litoral muito recortado, com montanhas caindo direto no mar.': 'A very jagged coastline, with mountains dropping straight into the sea.',
  'Supercontinente': 'Supercontinent', 'Terra até perto das bordas; mar só nas margens. Máximo de área jogável.': 'Land almost to the edges; sea only at the margins. Maximum playable area.',
  'Aplicar o modelo "{s}"? Terra, relevo pintado e ajustes de terreno serão trocados (regiões e imagem-guia ficam). Ctrl+Z desfaz a pintura; "Restaurar padrões" volta os ajustes.': 'Apply the "{s}" preset?\nLand, painted terrain and terrain settings will be replaced (regions and guide image stay).\nCtrl+Z undoes the painting; "Restore defaults" resets the settings.',
  'Modelo "{s}" aplicado. Troque a semente para ver outra variação.': 'Preset "{s}" applied. Change the seed to see another variation.',
  'Sair da caminhada (Esc)': 'Exit walk mode (Esc)', 'Chão a {s} m · {s} · WASD/setas mover · Shift correr (40 m/s) · arraste para olhar · Esc sai': 'Ground at {s} m · {s} · WASD/arrows move · Shift run (40 m/s) · drag to look · Esc exits',
  'parado': 'standing still', 'Andar pelo mapa (1,8 m)': 'Walk the map (1.8 m)',
  // ---------- marcadores ----------
  'Capital': 'Capital', 'Cidade': 'City', 'Vila': 'Village', 'Castelo / Fortaleza': 'Castle / Fortress', 'Porto': 'Port', 'Templo / Santuário': 'Temple / Shrine', 'Masmorra': 'Dungeon',
  'Caverna / Mina': 'Cave / Mine', 'Ruínas': 'Ruins', 'Ponto de interesse': 'Point of interest', 'Árvore ancestral': 'Ancient tree', 'Bosque sagrado': 'Sacred grove', 'Fonte / Nascente': 'Spring / Fountain',
  'Carimbo de relevo': 'Terrain stamp', 'Pincel de erosão': 'Erosion brush', 'Montanha': 'Mountain', 'Vulcão': 'Volcano', 'Cratera': 'Crater', 'Cânion': 'Canyon', 'Platô': 'Plateau', 'Ilha': 'Island',
  'Forma': 'Shape', 'Tamanho (m)': 'Size (m)', 'Altura (m)': 'Height (m)', 'Profundidade (m)': 'Depth (m)', 'Altura acima do mar (m)': 'Height above sea (m)', 'Giro (°)': 'Rotation (°)',
  'Diâmetro do carimbo ([ e ] mudam).': 'Stamp diameter ([ and ] change it).', 'Giro em graus (, e . ou Shift+roda do mouse).': 'Rotation in degrees (, and . or Shift+mouse wheel).',
  'Clique para carimbar. [ ] tamanho · , . ou Shift+roda giram. Vai para a camada Esculpir (Ctrl+Z desfaz).': 'Click to stamp. [ ] size · , . or Shift+wheel rotate. Goes to the Sculpt layer (Ctrl+Z undoes).',
  'Pinte sobre as montanhas e solte: a chuva escava ravinas só ali. Força = quanta chuva.': 'Paint over the mountains and release: rain carves gullies only there. Strength = how much rain.',
  '{s} carimbado(a). Ctrl+Z desfaz; o resultado fica na camada Esculpir.': '{s} stamped. Ctrl+Z undoes; the result stays in the Sculpt layer.',
  'Nada para erodir aí: pinte sobre terra (acima do mar).': 'Nothing to erode there: paint over land (above sea level).',
  'Ponte': 'Bridge', 'Pontes e cachoeiras automáticas: Rotacao = direção da estrada / do rio; Medida_m = vão da ponte ou altura da queda.': 'Automatic bridges and waterfalls: Rotacao = road / river direction; Medida_m = bridge span or drop height.', 'Ligar cidades': 'Connect cities', 'Pontes e cachoeiras': 'Bridges and waterfalls',
  'Liga capital, cidades e castelos com estradas que seguem o relevo (vilas ficam de fora). Depois marca pontes e cachoeiras.': 'Connects the capital, cities and castles with roads that follow the terrain (villages are left out). Then marks bridges and waterfalls.',
  'Marca uma ponte onde cada estrada cruza um rio e uma cachoeira onde o rio cai forte. Refazer troca só os marcadores automáticos.': 'Marks a bridge where each road crosses a river and a waterfall where the river drops sharply. Redoing replaces only the automatic markers.',
  'Estradas entre capital, cidades e castelos': 'Roads between capital, cities and castles', 'Marcar pontes e cachoeiras': 'Mark bridges and waterfalls',
  'Traçando estradas: {s} de {s}…': 'Routing roads: {s} of {s}…',
  'Ponha pelo menos dois marcadores de Capital, Cidade ou Castelo para ligar com estradas.': 'Place at least two Capital, City or Castle markers to connect with roads.',
  'Refazer a rede automática? As {s} estrada(s) automáticas atuais serão trocadas (as feitas à mão ficam). Ctrl+Z desfaz.': 'Redo the automatic network? The current {s} automatic road(s) will be replaced (hand-made ones stay). Ctrl+Z undoes.',
  '{s} estrada(s) ligando {s} lugares': '{s} road(s) connecting {s} places', '{s} ligação(ões) sem caminho por terra (mar ou lago no meio)': '{s} link(s) with no land path (sea or lake in between)',
  'Refazer pontes e cachoeiras? Os {s} marcadores automáticos atuais serão trocados (os seus ficam). Ctrl+Z desfaz.': 'Redo bridges and waterfalls? The current {s} automatic markers will be replaced (yours stay). Ctrl+Z undoes.',
  '{s} ponte(s) e {s} cachoeira(s) marcadas': '{s} bridge(s) and {s} waterfall(s) marked', 'São marcadores comuns: dá para mover, renomear ou apagar.': 'They are regular markers: you can move, rename or delete them.',
  'vão {s} m': 'span {s} m', 'queda {s} m': 'drop {s} m',
  'Nas pontes e cachoeiras automáticas, a Rotacao aponta na direção da estrada / do rio e a Medida_m é o vão da ponte ou a altura da queda.': 'On automatic bridges and waterfalls, Rotacao points along the road / river and Medida_m is the bridge span or the drop height.',
  'Cachoeira': 'Waterfall', 'Lago / Lagoa': 'Lake / Pond', 'Monólito / Pedra sagrada': 'Monolith / Sacred stone', 'Covil de criaturas': 'Creature lair',
  'Castelo': 'Castle', 'Templo': 'Temple', 'Caverna': 'Cave', 'Fonte': 'Spring', 'Lago': 'Lake', 'Monólito': 'Monolith', 'Covil de cr...': 'Creature lair',
  'Construções': 'Buildings', 'Vegetação / ambiente': 'Vegetation / environment', 'Nenhum marcador ainda.': 'No markers yet.', 'Tipo': 'Type', 'Construção': 'Building', 'Apagar marcador': 'Delete marker',
  // ---------- biomas / vegetação ----------
  '(canal {s})': '(channel {s})', 'Nenhuma área de floresta, selva, pinheiros, oásis ou cactos pintada na Vegetação.': 'No forest, jungle, pine, oasis or cactus area painted in Vegetation.',
  'Biomas preenchidos a partir da vegetação. Ctrl+Z desfaz.': 'Biomes filled from the vegetation. Ctrl+Z undoes it.',
  'Floresta (folhosas)': 'Forest (broadleaf)', 'Floresta de pinheiros': 'Pine forest', 'Selva tropical': 'Tropical jungle', 'Bosque esparso': 'Sparse woodland', 'Pântano': 'Swamp',
  'Campo florido': 'Flower meadow', 'Oásis / palmeiras': 'Oasis / palms', 'Cactos (deserto)': 'Cacti (desert)',
  'Desenhando o mapa…': 'Drawing the map…', 'Mapa do jogo': 'Game map', 'Mapa do jogo — {s}': 'Game map — {s}',
  'Prévia em 1024 px. A exportação gera esta versão ilustrada e uma versão limpa (sem textos) no tamanho escolhido ({s} px). Os nomes vêm das Regiões / Reinos e dos Marcadores.': 'Preview at 1024 px. The export produces this illustrated version and a clean version (no text) at the chosen size ({s} px). The names come from Regions / Kingdoms and Markers.',
  'Baixar só o mapa ({s} px)': 'Download only the map ({s} px)', 'Seu último trabalho foi restaurado.': 'Your last work was restored.',
  // ---------- caixa de ferramentas e opções ----------
  'Mover o mapa': 'Move the map', 'Pintar': 'Paint', 'Apagar': 'Erase', 'Suavizar': 'Smooth', 'Balde de tinta': 'Paint bucket', 'Conta-gotas': 'Eyedropper',
  'Elevar (m)': 'Raise (m)', 'Rebaixar (m)': 'Lower (m)', 'Nivelar (altura exata)': 'Level (exact height)', 'Rio (linha editável)': 'River (editable line)', 'Lagos (pintar)': 'Lakes (paint)',
  'Estrada / trilha': 'Road / trail', 'Régua': 'Ruler', 'Marcador de construção': 'Building marker', 'Marcador de vegetação / ambiente': 'Vegetation / environment marker', 'Vegetação (áreas)': 'Vegetation (areas)',
  'Camada ativa': 'Active layer', 'Camada ativa (o que o pincel muda)': 'Active layer (what the brush changes)', 'Pintar vegetação (vira máscara do PCG)': 'Paint vegetation (becomes a PCG mask)', 'Apagar vegetação': 'Erase vegetation',
  'Pintar biomas (máscara do material do terreno)': 'Paint biomes (terrain material mask)', 'Apagar (volta para campo)': 'Erase (back to grassland)',
  'Camada ativa: {s} (1 a 8) — clique para trocar': 'Active layer: {s} (1 to 8) — click to change',
  'Vegetação (áreas): {s} — botão direito, segurar ou triângulo mostra os tipos': 'Vegetation (areas): {s} — right click, hold or triangle shows the types',
  'Biomas: {s} — botão direito, segurar ou triângulo mostra os biomas': 'Biomes: {s} — right click, hold or triangle shows the biomes',
  '{s} — botão direito, segurar ou clicar no triângulo mostra o grupo': '{s} — right click, hold or click the triangle to show the group',
  'Clique no mapa para pegar a altura (vai para o Nivelar).': 'Click on the map to pick the height (goes to Level).', 'Clique na imagem-guia para escolher a cor (para Converter ou para o Balde).': 'Click on the guide image to pick the color (for Convert or the Bucket).',
  'Arraste para medir distância, alturas, inclinação e tempo a pé. Esc apaga.': 'Drag to measure distance, heights, slope and walking time. Esc clears.',
  'Agora clique no destino (mar, lago ou outro rio). Esc cancela.': 'Now click the destination (sea, lake or another river). Esc cancels.',
  'Clique na nascente e depois no destino: o rio segue os vales. Arraste os pontos · 2 cliques na linha = ponto novo · Alt+clique apaga ponto · Delete apaga o rio.': 'Click the source and then the destination: the river follows the valleys. Drag the points · double-click the line = new point · Alt+click deletes a point · Delete removes the river.',
  'Clique no próximo ponto de passagem. Enter ou 2 cliques terminam · Esc termina/cancela.': 'Click the next waypoint. Enter or double-click finishes · Esc finishes/cancels.',
  'Clique nos pontos de passagem (cidades, pontes, passos): a rota segue o relevo. Arraste os pontos · Alt+clique apaga · Delete apaga a estrada.': 'Click the waypoints (cities, bridges, passes): the route follows the terrain. Drag the points · Alt+click deletes · Delete removes the road.',
  'Arraste para mover o mapa. Roda do mouse = zoom. F enquadra.': 'Drag to move the map. Mouse wheel = zoom. F fits.', 'Clique para pôr; arraste para mover; Delete apaga o selecionado.': 'Click to place; drag to move; Delete removes the selected one.',
  'Apagar bioma': 'Erase biome', 'Vegetação · {s}': 'Vegetation · {s}', 'Biomas · {s}': 'Biomes · {s}', 'Regiões / Reinos · {s}': 'Regions / Kingdoms · {s}',
  // ---------- menus ----------
  'Arquivo': 'File', 'Novo mundo': 'New world', 'Abrir projeto ou imagem…': 'Open project or image…', 'Salvar projeto (.forja)': 'Save project (.forja)', 'Carregar imagem-guia…': 'Load guide image…', 'Limpar tudo…': 'Clear everything…',
  'Editar': 'Edit', 'Desfazer': 'Undo', 'Refazer': 'Redo', 'Camada ativa: {s}': 'Active layer: {s}', 'Limpar camada': 'Clear layer', 'Preencher tudo': 'Fill all', 'Inverter': 'Invert',
  'Gerar': 'Generate', 'Modelos de mundo (1 clique)': 'World presets (1 click)', 'Gerar terra / mar': 'Generate land / sea', 'Gerar montanhas e colinas': 'Generate mountains and hills',
  'Rios pintados → rios editáveis': 'Painted rivers → editable rivers', 'Limpar manchinhas dos rios pintados': 'Clean specks from painted rivers', 'Opções de geração…': 'Generation options…', 'Aplicar erosão': 'Apply erosion',
  'Exibir': 'View', 'Mapa 2D': '2D map', 'Prévia 3D': '3D preview', 'Enquadrar o mapa': 'Fit the map', 'Visualizar': 'Display', 'Relevo': 'Terrain', 'Inclinação': 'Slope', 'Heightmap (cinza)': 'Heightmap (gray)',
  'Resolução de trabalho': 'Working resolution', '512 (rápido)': '512 (fast)', '2048 (lento)': '2048 (slow)', 'Mostrar vegetação (arvorezinhas)': 'Show vegetation (little trees)', 'Mostrar imagem-guia': 'Show guide image',
  'Exportar': 'Export', 'Exportar pacote (.zip)': 'Export package (.zip)', 'Ver mapa do jogo': 'View game map', 'Opções de exportação…': 'Export options…', 'Guia do Unreal': 'Unreal guide',
  'Janela': 'Window', '{s} (só aparece com heightmap base)': '{s} (only shows with a base heightmap)', 'Restaurar layout padrão': 'Restore default layout', 'Ajuda': 'Help', 'Atalhos do teclado': 'Keyboard shortcuts',
  'Pintar / Apagar / Suavizar': 'Paint / Erase / Smooth', 'Balde / Conta-gotas': 'Bucket / Eyedropper', 'Nivelar (Esculpir)': 'Level (Sculpt)', 'Marcador': 'Marker',
  'Camada ativa (Terra … Lagos, Esculpir)': 'Active layer (Land … Lakes, Sculpt)', 'Terminar a estrada': 'Finish the road', 'Alt+clique': 'Alt+click', 'Apagar um ponto do rio ou da estrada': 'Delete a river or road point',
  'Diminuir / aumentar o pincel': 'Smaller / bigger brush', 'Inverte Pintar ↔ Apagar enquanto segura': 'Swaps Paint ↔ Erase while held', 'Espaço': 'Space', 'Segure e arraste para mover': 'Hold and drag to move',
  'Apagar o marcador, rio ou estrada selecionado': 'Delete the selected marker, river or road', 'Apagar a régua / cancelar / fechar menus': 'Clear the ruler / cancel / close menus', 'Desfazer / Refazer': 'Undo / Redo', 'Salvar projeto': 'Save project',
  'Ferramentas com triângulo no canto têm um grupo: clique no triângulo, use o botão direito ou segure o clique.': 'Tools with a triangle in the corner have a group: click the triangle, right click or hold the click.',
  'Soltar como janela / devolver à doca': 'Float as a window / return to the dock', 'Fechar (volta pelo menu Janela)': 'Close (comes back from the Window menu)',
  // ---------- unreal.js (versões, tamanhos, dicas) ----------
  'Não conferido no código (não há fonte do UE4 aqui). A conta de altura é a mesma documentada pela Epic desde o UE4.': 'Not checked in the code (no UE4 source here). The height math is the same documented by Epic since UE4.',
  'Deduzido do 5.2 (conferido no código).': 'Deduced from 5.2 (checked in the code).', 'Conferido no código-fonte do 5.2.': 'Checked in the 5.2 source code.',
  'Não conferido: o campo Region Size pode ou não existir nesta versão.': 'Not checked: the Region Size field may or may not exist in this version.',
  'Region Size confirmado por relato de usuário no 5.5.4; resto igual ao 5.6.': 'Region Size confirmed by a user report on 5.5.4; the rest is the same as 5.6.',
  'Conferido no código-fonte do 5.6.': 'Checked in the 5.6 source code.', 'Deduzido: 5.6 e 5.8 (conferidos) são iguais.': 'Deduced: 5.6 and 5.8 (checked) are the same.', 'Conferido no código-fonte do 5.8.': 'Checked in the 5.8 source code.',
  'Painel Modes → Landscape (ícone de montanha) → Manage → New Landscape': 'Modes panel → Landscape (mountain icon) → Manage → New Landscape', 'Seletor de modos (barra de cima) → Landscape → aba Manage → New': 'Mode selector (top bar) → Landscape → Manage tab → New',
  'Pequeno': 'Small', 'Cabe num nível comum.': 'Fits in a regular level.', 'World Partition é opcional.': 'World Partition is optional.', 'Grande': 'Large',
  'O UE4 não tem World Partition. Um Landscape deste tamanho funciona num nível só, mas fica todo carregado; para streaming use World Composition (mundo em tiles).': 'UE4 has no World Partition. A Landscape this size works in a single level, but stays fully loaded; for streaming use World Composition (tiled world).',
  'Enorme (escala MMO)': 'Huge (MMO scale)', 'No UE4 mundos deste tamanho pedem World Composition (vários Landscapes em tiles). Considere usar o UE5, que tem World Partition.': 'In UE4, worlds this size need World Composition (several tiled Landscapes). Consider UE5, which has World Partition.',
  'Use World Partition (crie o nível pelo template Open World) para o Unreal carregar o mundo em pedaços.': 'Use World Partition (create the level from the Open World template) so Unreal loads the world in pieces.',
  'World Partition obrigatório na prática. Planeje HLOD, streaming e conteúdo procedural (PCG) desde o começo.': 'World Partition is required in practice. Plan HLOD, streaming and procedural content (PCG) from the start.',
  'crie o nível pelo template Open World. O Unreal divide o Landscape em pedaços (Landscape Streaming Proxies) e só carrega o que está perto do jogador.': 'create the level from the Open World template. Unreal splits the Landscape into pieces (Landscape Streaming Proxies) and only loads what is near the player.',
  'no UE4, mundos grandes são divididos em vários níveis com um Landscape cada, carregados por distância.': 'in UE4, large worlds are split into several levels with one Landscape each, loaded by distance.',
  'Componentes': 'Components', 'cada componente tem custo de CPU (culling e draw calls). Até 32 × 32 = 1024 é o limite confortável; por isso as resoluções da lista.': 'each component has a CPU cost (culling and draw calls). Up to 32 × 32 = 1024 is the comfortable limit; hence the resolutions in the list.',
  'Metros por vértice': 'Meters per vertex', 'para ir além de ~8 km, prefira 2 m por vértice em vez de mais resolução.': 'to go beyond ~8 km, prefer 2 m per vertex instead of more resolution.',
  'poucas camadas pintadas por componente; cada camada extra num componente é mais textura amostrada. Em mapas grandes, Runtime Virtual Texture ajuda muito.': 'few painted layers per component; each extra layer in a component means more texture samples. On big maps, Runtime Virtual Texture helps a lot.',
  'Nanite no Landscape': 'Nanite on the Landscape', 'opção "Enable Nanite" nos detalhes do ator Landscape; reduz o custo da geometria distante.': '"Enable Nanite" option in the Landscape actor details; reduces the cost of distant geometry.',
  'existe a partir do 5.2 (conferido); nesta versão, procure "Enable Nanite" nos detalhes do Landscape — se não houver, ignore.': 'exists from 5.2 on (checked); in this version, look for "Enable Nanite" in the Landscape details — if it is not there, ignore it.',
  'Vegetação e objetos': 'Vegetation and objects', 'PCG ou Foliage com instâncias em vez de colocar à mão': 'PCG or Foliage with instances instead of placing by hand', '; HLOD do World Partition para o que está longe.': '; World Partition HLOD for what is far away.',
  'Blueprint (qualquer versão): Get Data Table Row Names → For Each → Get Data Table Row → Spawn Actor na Posicao e Rotacao (escolha a classe pelo Tipo).': 'Blueprint (any version): Get Data Table Row Names → For Each → Get Data Table Row → Spawn Actor at Posicao and Rotacao (pick the class by Tipo).',
  'd) PCG: nó "Load Data Table" (Output Type = Point). Em Attribute Mapping, ligue "Posicao" a "$Position".': 'd) PCG: "Load Data Table" node (Output Type = Point). In Attribute Mapping, map "Posicao" to "$Position".',
  'Cada marcador vira um ponto com os atributos Nome, Tipo e Regiao; filtre por Tipo e gere o que quiser.': 'Each marker becomes a point with the attributes Nome, Tipo and Regiao (name, type, region); filter by Tipo and spawn what you want.',
  'd) PCG: se a sua versão tiver o nó "Load Data Table", use Output Type = Point e ligue "Posicao" a "$Position"': 'd) PCG: if your version has the "Load Data Table" node, use Output Type = Point and map "Posicao" to "$Position"',
  'em Attribute Mapping (conferido no 5.6/5.8; não conferido nesta versão).': 'in Attribute Mapping (checked on 5.6/5.8; not checked in this version).', 'e) Se não tiver:': 'e) If it does not:',
  'PCG: nó "Load Data Table" (Output Type = Point). Em Attribute Mapping, ligue "Posicao" a "$Position".': 'PCG: "Load Data Table" node (Output Type = Point). In Attribute Mapping, map "Posicao" to "$Position".',
  'PCG: se a sua versão tiver o nó "Load Data Table", use Output Type = Point e ligue "Posicao" a "$Position"': 'PCG: if your version has the "Load Data Table" node, use Output Type = Point and map "Posicao" to "$Position"',
  'Ou {s}': 'Or {s}', 'd) {s}': 'd) {s}', 'e) Ou {s}': 'e) Or {s}', 'e) Se não tiver: {s}': 'e) If it does not: {s}',
  'PCG ou Foliage com instâncias em vez de colocar à mão; HLOD do World Partition para o que está longe.': 'PCG or Foliage with instances instead of placing by hand; World Partition HLOD for what is far away.',
  'PCG ou Foliage com instâncias em vez de colocar à mão.': 'PCG or Foliage with instances instead of placing by hand.',
  // ---------- rios e estradas ----------
  'Estrada': 'Road', 'Trilha': 'Trail', 'Rio': 'River', 'Traçando a rota…': 'Routing…', 'Nascente — clique no destino': 'Source — click the destination',
  'Não achei caminho por terra até esse ponto (mar ou lago no meio).': 'No land route to that point (sea or lake in the way).',
  'Nascente marcada. Agora clique no destino (mar, lago ou outro rio). Esc cancela.': 'Source marked. Now click the destination (sea, lake or another river). Esc cancels.',
  'Não achei um caminho entre esses dois pontos.': 'No path found between these two points.',
  'Rio traçado: {s} km. Arraste os pontos para ajustar; dois cliques na linha criam um ponto; Alt+clique apaga um ponto.': 'River traced: {s} km. Drag the points to adjust; double-click the line to add a point; Alt+click deletes a point.',
  'Rio traçado: {s} km. Arraste os pontos para ajustar; dois cliques na linha criam um ponto; Alt+clique apaga um ponto. Atenção: o caminho sobe {s} m (o leito cava o terreno ali).': 'River traced: {s} km. Drag the points to adjust; double-click the line to add a point; Alt+click deletes a point. Warning: the path climbs {s} m (the bed digs into the terrain there).',
  'Com só dois pontos, apague o rio inteiro (Delete).': 'With only two points, delete the whole river (Delete).', 'Com só dois pontos, apague o caminho inteiro (Delete).': 'With only two points, delete the whole road (Delete).',
  'Clique nos próximos pontos do caminho (cidades, pontes, passos de montanha). Enter ou dois cliques terminam; Esc cancela.': 'Click the next points of the route (cities, bridges, mountain passes). Enter or double-click finishes; Esc cancels.',
  '{s}: {s} km, contornando as subidas fortes. Arraste os pontos para mudar a rota; Alt+clique apaga um ponto.': '{s}: {s} km, going around the steep climbs. Drag the points to change the route; Alt+click deletes a point.',
  'Nenhum rio pintado com mais de {s} m para converter.': 'No painted river longer than {s} m to convert.',
  'Converter {s} rio(s) pintado(s) em rios editáveis? A camada Rios pintada fica vazia (as manchinhas somem junto). Ctrl+Z desfaz.': 'Convert {s} painted river(s) into editable rivers? The painted Rivers layer becomes empty (the specks go away too). Ctrl+Z undoes it.',
  '{s} rio(s) convertido(s). Agora dá para arrastar os pontos de cada um.': '{s} river(s) converted. Now you can drag the points of each one.',
  'Nenhuma manchinha: todos os pedaços da camada Rios têm mais de {s} m.': 'No specks: every piece of the Rivers layer is longer than {s} m.',
  '{s} manchinha(s) apagada(s) da camada Rios. Ctrl+Z desfaz.': '{s} speck(s) removed from the Rivers layer. Ctrl+Z undoes it.',
  'Rios': 'Rivers', 'Estradas e trilhas': 'Roads and trails', 'Nenhum rio ou estrada ainda. Use as ferramentas Rio (V) e Estrada (T).': 'No rivers or roads yet. Use the River (V) and Road (T) tools.',
  // ---------- index.html ----------
  'Valor que o pincel e o balde aplicam. Ex.: montanhas com intensidade 0,5 ficam com metade da altura máxima.': 'Value the brush and the bucket apply. E.g. mountains with intensity 0.5 get half the maximum height.',
  'Quanto cada pincelada de Elevar/Rebaixar sobe ou desce o terreno, no centro do pincel.': 'How much each Raise/Lower stroke moves the terrain up or down, at the brush center.',
  'Altura que o Nivelar aplica. O Conta-gotas pega a altura de um ponto do mapa.': 'Height that Level applies. The Eyedropper picks the height of a point on the map.',
  'Largura da água na nascente (o rio selecionado, ou o próximo que você criar).': 'Water width at the source (the selected river, or the next one you create).', 'Largura da água na foz.': 'Water width at the mouth.',
  'Transforma os rios pintados na camada Rios em rios editáveis (a pintura fica vazia).': 'Turns the rivers painted in the Rivers layer into editable rivers (the painting becomes empty).',
  'Apaga da camada Rios pintada os pedaços soltos menores que 150 m.': 'Removes loose pieces shorter than 150 m from the painted Rivers layer.',
  'Largura da via. O terreno é suavizado nessa largura, com um acostamento dos lados.': 'Road width. The terrain is smoothed over this width, with a shoulder on each side.',
  'Transparência da camada pintada por cima do mapa': 'Transparency of the painted layer over the map', 'Câmera a 1,8 m do chão, em escala real, para sentir o tamanho do mundo': 'Camera 1.8 m above the ground, at real scale, to feel the size of the world',
  'Arraste para mudar a largura dos painéis': 'Drag to change the panel width', 'Marcadores': 'Markers', 'Rios e estradas': 'Rivers and roads',
  'Floresta, pinheiros e selva viram Floresta; oásis e cactos viram Deserto.': 'Forest, pines and jungle become Forest; oasis and cacti become Desert.',
  'Imagem-guia (seu desenho)': 'Guide image (your drawing)', 'Heightmap base': 'Base heightmap', 'Altura em metros do pixel mais escuro (preto).': 'Height in meters of the darkest pixel (black).',
  'Altura em metros do pixel mais claro (branco).': 'Height in meters of the brightest pixel (white).', 'Geração automática': 'Automatic generation',
  'Mundo pronto em 1 clique: troca terra, relevo e ajustes de terreno. Regiões e imagem-guia ficam.': 'A ready world in 1 click: replaces land, terrain and terrain settings. Regions and guide image stay.',
  'Erosão': 'Erosion', 'Ajustes de terreno': 'Terrain settings', 'Exportar para o Unreal': 'Export to Unreal', 'As instruções do Guia e do LEIA-ME seguem o que existe nesta versão.': 'The Guide and README instructions follow what exists in this version.',
  'Distância entre vértices do Landscape. Vira o Scale X/Y no Unreal (1 m = 100).': 'Distance between Landscape vertices. Becomes Scale X/Y in Unreal (1 m = 100).',
  'Ruído fino somado na exportação, para a resolução final não ficar lisa demais.': 'Fine noise added at export, so the final resolution is not too smooth.',
  'O eixo de cada rio, da nascente para a foz, para a engine criar rios de água (no Unreal: Water Body River).': 'The center line of each river, from source to mouth, for the engine to create water rivers (in Unreal: Water Body River).',
  'Contorno e nível da água de cada lago (no Unreal: Water Body Lake).': 'Outline and water level of each lake (in Unreal: Water Body Lake).',
  'Traçado, largura e altura de cada estrada e trilha (para spline de estrada ou PCG).': 'Path, width and height of each road and trail (for a road spline or PCG).',
  'Máscara RGBA: R deserto, G floresta, B gelo/neve, A vulcânico.': 'RGBA mask: R desert, G forest, B ice/snow, A volcanic.', 'Fechar': 'Close', 'Forja de Mundos': 'World Forge',
  'Tamanho': 'Size', 'Tamanho do pincel: [ diminui · ] aumenta': 'Brush size: [ smaller · ] bigger', 'Força': 'Strength', 'Dureza': 'Hardness', 'Intensidade': 'Intensity', 'Metros por pincelada': 'Meters per stroke', 'Altura alvo (m)': 'Target height (m)', 'Tolerância': 'Tolerance',
  'Usar contornos da imagem-guia': 'Use guide image outlines', 'Nascente (m)': 'Source (m)', 'Foz (m)': 'Mouth (m)', 'Pintura → rios': 'Painting → rivers', 'Limpar manchinhas': 'Clean specks',
  'Estrada (rampa até 12%)': 'Road (slope up to 12%)', 'Trilha (rampa até 25%)': 'Trail (slope up to 25%)', 'Largura (m)': 'Width (m)', 'Máscara': 'Mask',
  'Esquerdo: usar ferramenta · Shift: apagar · Direito/meio ou Espaço: mover · Roda: zoom · F: enquadrar': 'Left: use tool · Shift: erase · Right/middle or Space: move · Wheel: zoom · F: fit',
  'Exagero vertical': 'Vertical exaggeration', 'Recentralizar': 'Recenter', 'Esquerdo: girar · Direito: mover · Roda: zoom': 'Left: rotate · Right: move · Wheel: zoom',
  'Seu navegador não suporta WebGL2. Use o Chrome ou o Edge atualizados.': 'Your browser does not support WebGL2. Use an up-to-date Chrome or Edge.', 'No mapa': 'On the map',
  'Escolha a miniatura acima e clique no mapa para pôr; arraste para mover; Delete apaga o selecionado. Vão para o mapa do jogo e para uma tabela com a posição exata no Unreal.': 'Pick a thumbnail above and click on the map to place it; drag to move; Delete removes the selected one. They go to the game map and to a table with the exact position in Unreal.',
  'Rio (V):': 'River (V):', 'clique na nascente e depois no destino; o rio segue os vales. Arraste os pontos para ajustar, dois cliques na linha criam um ponto, Alt+clique apaga um ponto, Delete apaga o rio.': 'click the source and then the destination; the river follows the valleys. Drag the points to adjust, double-click the line to add a point, Alt+click deletes a point, Delete removes the river.',
  'Estrada (T):': 'Road (T):', 'clique nos pontos de passagem; a rota contorna morros e faz zigue-zague nas subidas fortes. Enter ou dois cliques terminam.': 'click the waypoints; the route goes around hills and zigzags up steep climbs. Enter or double-click finishes.',
  'Lagos:': 'Lakes:', 'pinte a camada Lagos.': 'paint the Lakes layer.', 'Preencher pela vegetação': 'Fill from vegetation',
  'Clique num bioma e pinte (Apagar volta para campo). Não muda o relevo: na exportação vira uma máscara de biomas (R deserto, G floresta, B gelo, A vulcânico) para o material do terreno.': 'Click a biome and paint (Erase goes back to grassland). Does not change the terrain: at export it becomes a biome mask (R desert, G forest, B ice, A volcanic) for the terrain material.',
  'Mostrar as arvorezinhas no mapa': 'Show the little trees on the map',
  'Clique num tipo e pinte com o Pincel (Apagar tira a vegetação; o Balde preenche uma área). Cada ponto tem um tipo só. Não muda o relevo: na exportação vira uma máscara por tipo para o PCG espalhar as plantas exatamente onde você pintou.': 'Click a type and paint with the Brush (Erase removes vegetation; the Bucket fills an area). Each point has only one type. Does not change the terrain: at export it becomes one mask per type for PCG to scatter the plants exactly where you painted.',
  '+ Nova região': '+ New region', 'Não muda o relevo: só delimita espaço (vira máscara para o PCG). Escolha a região aqui e pinte com o botão': 'Does not change the terrain: only marks out space (becomes a PCG mask). Choose the region here and paint with the', 'Regiões': 'Regions',
  '(9) da barra de ferramentas.': '(9) button on the toolbar.', 'Carregar imagem': 'Load image', 'Remover': 'Remove', 'Ajuste': 'Fit', 'Caber inteira': 'Fit whole', 'Preencher (corta)': 'Fill (crops)', 'Esticar': 'Stretch',
  'Opacidade': 'Opacity', 'Mostrar': 'Show', 'Converter desenho em camada': 'Convert drawing into a layer', 'Detectar': 'Detect', 'Cor escolhida (conta-gotas)': 'Picked color (eyedropper)', 'Áreas escuras': 'Dark areas', 'Áreas claras': 'Bright areas',
  'Tolerância / limite': 'Tolerance / threshold', 'Inverter (marcar tudo que NÃO bate)': 'Invert (mark everything that does NOT match)', 'Substituir a camada (desmarcado = somar)': 'Replace the layer (unchecked = add)',
  'Dica: na camada Terra, escolha a cor do mar e marque Inverter — tudo que não é mar vira terra.': 'Tip: on the Land layer, pick the sea color and check Invert — everything that is not sea becomes land.', 'Converter para a camada ativa': 'Convert to the active layer',
  'Mapa feito à mão, no Paint ou foto do papel. Ele aparece por baixo do terreno para você pintar em cima, ou vira camada automaticamente.': 'A hand-made map, a Paint drawing or a photo of paper. It appears under the terrain so you can paint over it, or it becomes a layer automatically.',
  'Remover heightmap base': 'Remove base heightmap',
  'O relevo vem da imagem. Montanhas, Colinas, Planaltos, Aplainar e Rios somam por cima. A camada Terra / Mar não é usada enquanto houver um heightmap base. O mar fica abaixo de 0 m.': 'The terrain comes from the image. Mountains, Hills, Plateaus, Flatten and Rivers add on top. The Land / Sea layer is not used while there is a base heightmap. The sea is below 0 m.',
  'Modelo de mundo': 'World preset', 'Aplicar modelo': 'Apply preset', 'Ou gere por partes': 'Or generate in parts', 'Estilo': 'Style', 'Continente': 'Continent', 'Pangeia (borda aberta)': 'Pangaea (open edges)', 'Terra': 'Land',
  'Usa a semente atual. Depois é só pintar por cima.': 'Uses the current seed. Then just paint over it.', 'Simula chuva e desmoronamento: cria ravinas, vales e encostas naturais. Pintar de novo volta para a versão sem erosão.': 'Simulates rain and collapse: creates gullies, valleys and natural slopes. Painting again goes back to the version without erosion.',
  'Nome do mundo': 'World name', 'Resolução do heightmap': 'Heightmap resolution', '0,5 m (detalhe máximo)': '0.5 m (maximum detail)', '1 m (padrão do Unreal)': '1 m (Unreal default)', '4 m (mundo gigante, menos detalhe)': '4 m (giant world, less detail)',
  'Detalhe fino (m)': 'Fine detail (m)', 'Aplicar erosão antes (se ainda não aplicou)': 'Apply erosion first (if not applied yet)', 'Camadas de material (Grama, Rocha, Areia, Neve)': 'Material layers (Grass, Rock, Sand, Snow)',
  'Mapa de regiões + máscara por região': 'Region map + one mask per region', 'Máscaras de vegetação (uma por tipo, para o PCG)': 'Vegetation masks (one per type, for PCG)', 'Marcadores (tabela para Data Table / PCG)': 'Markers (table for Data Table / PCG)',
  'Traçado dos rios (para rios de água na engine)': 'River paths (for water rivers in the engine)', 'Lagos (contorno + nível da água)': 'Lakes (outline + water level)', 'Estradas e trilhas (traçado)': 'Roads and trails (paths)',
  'Máscara de biomas (para o material do terreno)': 'Biome mask (for the terrain material)', 'Mapa do jogo (imagem ilustrada + versão limpa)': 'Game map (illustrated image + clean version)', 'Tamanho do mapa': 'Map size', 'Também gerar .r16 (RAW)': 'Also generate .r16 (RAW)',
  'Mapa': 'Map', 'Mundo': 'World', 'Altitude': 'Altitude', 'Exportar pacote': 'Export package',
  // ---------- LEIA-ME (texto do .zip) ----------
  'FORJA DE MUNDOS — como importar no': 'WORLD FORGE — how to import into', 'Sobre esta versão:': 'About this version:', 'Tamanho:': 'Size:', 'm entre vértices)': 'm between vertices)',
  'Altitude: de {MIN} m a {MAX} m (nível do mar = 0 m). Precisão vertical: {STEP} cm.': 'Altitude: from {MIN} m to {MAX} m (sea level = 0 m). Vertical precision: {STEP} cm.',
  'MUNDO EM': 'WORLD IN', 'PEDAÇOS de': 'TILES of', '(total': '(total',
  'ATENÇÃO: o Unreal só aceita pedaços em nível com World Partition (template Open World).': 'WARNING: Unreal only accepts tiles in a World Partition level (Open World template).',
  'Num nível comum ele exige um arquivo único. Deixe todos os pedaços na mesma pasta.': 'In a regular level it requires a single file. Keep all tiles in the same folder.',
  '→ clique em "Import from File"': '→ click "Import from File"', '(NÃO use "Create New": ele cria um terreno plano e ignora o arquivo.)': '(Do NOT use "Create New": it creates a flat terrain and ignores the file.)',
  'Heightmap File → escolha': 'Heightmap File → choose', '(o Unreal encontra os outros': '(Unreal finds the other', 'pedaços sozinho)': 'tiles by itself)', 'O Unreal preenche sozinho:': 'Unreal fills in by itself:',
  'Funciona, mas troque para o recomendado (menos componentes = menos custo de CPU):': 'It works, but switch to the recommended one (fewer components = less CPU cost):',
  'Confira: Overall Resolution .': 'Check: Overall Resolution .', 'SÓ SE O CAMPO "World Partition Region Size" APARECER (nível com World Partition):': 'ONLY IF THE "World Partition Region Size" FIELD APPEARS (World Partition level):',
  'Em nível com World Partition (template Open World):': 'In a World Partition level (Open World template):', 'World Partition Region Size . deixe o padrão': 'World Partition Region Size . leave the default',
  'O Unreal divide o Landscape em pedaços (Streaming Proxies) que carregam perto do jogador.': 'Unreal splits the Landscape into pieces (Streaming Proxies) that load near the player.',
  'É o certo para mundo aberto. Logo depois do Import os pedaços podem ficar DESCARREGADOS': 'It is right for an open world. Right after the Import the pieces may be UNLOADED',
  'e o terreno "não aparece": abra Window → World Partition, selecione todas as células': 'and the terrain "does not show": open Window → World Partition, select all cells',
  'e clique em "Load Region from Selection". Depois salve tudo (File → Save All).': 'and click "Load Region from Selection". Then save everything (File → Save All).',
  '= um pedaço só, sempre carregado: só para mundos pequenos.)': '= a single piece, always loaded: only for small worlds.)', 'Transform (no mesmo painel)': 'Transform (in the same panel)',
  '(o Unreal centraliza o terreno nesse ponto)': '(Unreal centers the terrain on this point)', '(assim o nível do mar fica em Z = 0)': '(so sea level is at Z = 0)',
  'IMPORTANTE: o PNG não guarda metros, só tons de 0 a 65535. É o Scale Z que diz ao Unreal': 'IMPORTANT: the PNG does not store meters, only levels from 0 to 65535. Scale Z is what tells Unreal',
  'quanto vale o branco. Com o Scale Z padrão (100) o relevo fica achatado.': 'what white is worth. With the default Scale Z (100) the terrain comes out flattened.',
  'Clique no botão "Import" no fim do painel.': 'Click the "Import" button at the end of the panel.', 'Para achar o terreno: no Outliner selecione "Landscape" e aperte F.': 'To find the terrain: in the Outliner select "Landscape" and press F.',
  'O mundo tem': 'The world is', 'km: afaste bastante a câmera (o terreno é visto de cima;': 'km wide: move the camera far away (the terrain is seen from above;', 'se a câmera ficar por baixo dele, não aparece nada).': 'if the camera is below it, nothing shows).',
  'NÃO APARECE NADA? Confira nesta ordem:': 'NOTHING SHOWS? Check in this order:',
  '- Outliner tem um ator "Landscape"? Se não tem, a importação não aconteceu: refaça e clique em "Import".': '- Does the Outliner have a "Landscape" actor? If not, the import did not happen: redo it and click "Import".',
  '- Menu Show da janela 3D (ícone de olho): a opção "Landscape" precisa estar marcada (atalho Alt+L).': '- Show menu of the 3D viewport (eye icon): the "Landscape" option must be checked (shortcut Alt+L).',
  '- Nível vazio (Empty Level) não tem luz nem céu: o terreno fica preto no fundo preto.': '- An Empty Level has no light or sky: the terrain is black on a black background.',
  'Teste com Alt+3 (modo Unlit) ou crie o nível pelo template Open World.': 'Test with Alt+3 (Unlit mode) or create the level from the Open World template.',
  '- World Partition: Window → World Partition, selecione as células e "Load Region from Selection".': '- World Partition: Window → World Partition, select the cells and "Load Region from Selection".',
  'PRONTO: o terreno está importado. Os passos abaixo NÃO são obrigatórios agora': 'DONE: the terrain is imported. The steps below are NOT required now', '(material, máscaras, água, mapa). Faça quando for montar o mundo.': '(material, masks, water, map). Do them when you build the world.',
  'Camadas de material (pasta camadas/)': 'Material layers (folder camadas/)', 'Crie no material do Landscape as camadas Grama, Rocha, Areia e Neve (Weight-Blended).': 'Create in the Landscape material the layers Grama, Rocha, Areia and Neve (grass, rock, sand, snow; Weight-Blended).',
  'No painel de importação, depois de escolher o material, aponte cada camada para o PNG': 'In the import panel, after choosing the material, point each layer to the PNG', 'de mesmo nome': 'with the same name', '(o pedaço _x0_y0, ex.:': '(the _x0_y0 tile, e.g.:',
  '. Se preferir, importe depois em Landscape → Paint → Target Layers.': '. If you prefer, import later in Landscape → Paint → Target Layers.', 'Regiões (pasta regioes/) — se exportou': 'Regions (folder regioes/) — if exported',
  '.png = mapa colorido; um PNG preto/branco por região': '.png = color map; one black/white PNG per region', '(todos em pedaços).': '(all in tiles).', 'Use como textura de máscara': 'Use as a mask texture', 'no PCG': 'in PCG', 'nas suas ferramentas de vegetação': 'in your vegetation tools',
  '(vegetação, spawns, masmorras por reino).': '(vegetation, spawns, dungeons per kingdom).', 'Água': 'Water', 'O mar fica em Z = 0. Coloque um plano de água em Z = 0': 'The sea is at Z = 0. Place a water plane at Z = 0', 'ou um Water Body Ocean (plugin Water).': 'or a Water Body Ocean (Water plugin).',
  '(ou o plugin Water, se a sua versão tiver).': '(or the Water plugin, if your version has it).', 'Lagos pintados como "mar" também ficam no nível 0.': 'Lakes painted as "sea" are also at level 0.', 'Mapa do jogo (pasta mapa/)': 'Game map (folder mapa/)',
  '_mapa.png = mapa ilustrado (relevo, rios, reinos e marcadores com nome).': '_mapa.png = illustrated map (terrain, rivers, kingdoms and named markers).', '_mapa_limpo.png = só o terreno, sem textos (bom para minimapa).': '_mapa_limpo.png = terrain only, no text (good for a minimap).',
  'Importe como textura e, nos detalhes dela: Texture Group = UI, Compression = UserInterface2D,': 'Import it as a texture and, in its details: Texture Group = UI, Compression = UserInterface2D,',
  'Mip Gen Settings = NoMipmaps. Use num Widget (Image) da tela de mapa / minimapa.': 'Mip Gen Settings = NoMipmaps. Use it in a Widget (Image) of the map / minimap screen.',
  'O mapa cobre o mundo inteiro, com o centro em X = 0 / Y = 0. Topo da imagem = Y negativo.': 'The map covers the whole world, centered at X = 0 / Y = 0. Top of the image = negative Y.', 'Posição de um ator na imagem (0 a 1):': 'Position of an actor on the image (0 to 1):',
  '(X e Y em cm; multiplique U e V pelo tamanho do Image no Widget para posicionar o ícone.)': '(X and Y in cm; multiply U and V by the size of the Image in the Widget to place the icon.)', 'Vegetação (pasta vegetacao/) —': 'Vegetation (folder vegetacao/) —',
  '_vegetacao.png = mapa colorido (uma cor por tipo, legenda no _vegetacao.json).': '_vegetacao.png = color map (one color per type, legend in _vegetacao.json).', '_veg_NN_tipo.png = uma máscara por tipo: branco = tem aquela vegetação (bordas suaves).': '_veg_NN_tipo.png = one mask per type: white = that vegetation is there (soft edges).',
  'Cobrem o mundo inteiro (centro em X = 0 / Y = 0), igual ao mapa de regiões.': 'They cover the whole world (center at X = 0 / Y = 0), like the region map.', 'Importe como textura (Compression = Masks ou Grayscale, sRGB desligado) e use': 'Import as a texture (Compression = Masks or Grayscale, sRGB off) and use it',
  'no PCG: Get Texture Data': 'in PCG: Get Texture Data', 'na sua ferramenta de vegetação': 'in your vegetation tool', 'com a': 'with the',
  'mesma escala do Landscape; a máscara vira a densidade de pontos onde nascem as árvores daquele tipo.': 'same scale as the Landscape; the mask becomes the density of points where the trees of that type grow.',
  'Marcadores (pasta marcadores/) —': 'Markers (folder marcadores/) —', 'ponto(s)': 'point(s)', '_marcadores.csv: tabela para virar Data Table no Unreal.': '_marcadores.csv: table to become a Data Table in Unreal.',
  'a) Crie uma Structure (ex.: S_ForjaMarcador) com os campos, com estes nomes e tipos exatos:': 'a) Create a Structure (e.g. S_ForjaMarcador) with the fields, with these exact names and types:',
  'b) Arraste o CSV para o Content Browser → Data Table → Row Structure = S_ForjaMarcador.': 'b) Drag the CSV into the Content Browser → Data Table → Row Structure = S_ForjaMarcador.',
  'c) Posicao já está em cm, no mesmo sistema do Landscape (Z = altura do terreno no ponto).': 'c) Posicao is already in cm, in the same system as the Landscape (Z = terrain height at the point).',
  '_marcadores.json: os mesmos dados em JSON (para ferramentas próprias).': '_marcadores.json: the same data in JSON (for your own tools).', 'Rios (pasta rios/) —': 'Rivers (folder rios/) —', 'rio(s)': 'river(s)',
  '_rios.json: o eixo de cada rio (rios em linha e camada Rios pintada), da nascente para a foz, em cm (centro em X = 0 / Y = 0).': '_rios.json: the center line of each river (line rivers and the painted Rivers layer), from source to mouth, in cm (center at X = 0 / Y = 0).',
  'Cada ponto tem x, y, z (fundo do leito, estimado) e largura (cm). Rios pintados com menos de 150 m ficam de fora.': 'Each point has x, y, z (riverbed bottom, estimated) and largura (width, cm). Painted rivers shorter than 150 m are left out.',
  'Plugin Water: um Water Body River por rio, com estes pontos na spline e "Affects Landscape" desligado': 'Water plugin: one Water Body River per river, with these points on the spline and "Affects Landscape" off',
  '(o leito já está cavado no terreno). Ponha a água entre o fundo e as margens medidas no Landscape.': '(the bed is already dug into the terrain). Put the water between the bottom and the banks measured on the Landscape.',
  'Use os pontos como spline do seu sistema de água; o leito já está cavado no terreno.': 'Use the points as the spline of your water system; the bed is already dug into the terrain.', 'Lagos (pasta lagos/) —': 'Lakes (folder lagos/) —', 'lago(s)': 'lake(s)',
  '_lagos.json: contorno de cada lago (x, y em cm) e o nível da água (nivel, em cm). O fundo já está cavado.': '_lagos.json: outline of each lake (x, y in cm) and the water level (nivel, in cm). The bottom is already dug out.',
  'Plugin Water: um Water Body Lake por lago, com o contorno na spline (fechada) na altura do nível e "Affects Landscape" desligado.': 'Water plugin: one Water Body Lake per lake, with the outline on the (closed) spline at the level height and "Affects Landscape" off.',
  'Ponha um plano de água em cada lago, na altura do nível.': 'Put a water plane on each lake, at the level height.', 'Estradas e trilhas (pasta estradas/) —': 'Roads and trails (folder estradas/) —', 'caminho(s)': 'path(s)',
  '_estradas.json: traçado de cada estrada/trilha (x, y, z em cm), tipo e largura (cm).': '_estradas.json: path of each road/trail (x, y, z in cm), tipo (type) and largura (width, cm).',
  'O terreno já foi suavizado na largura da via, acompanhando o relevo (sem corte seco).': 'The terrain is already smoothed over the road width, following the relief (no hard cut).',
  'Use os pontos numa spline (Landscape Spline, Spline Mesh de estrada ou PCG) para pôr o calçamento e tirar a vegetação de cima.': 'Use the points on a spline (Landscape Spline, road Spline Mesh or PCG) to lay the paving and clear the vegetation from it.',
  'Use os pontos numa spline de estrada para pôr o calçamento.': 'Use the points on a road spline to lay the paving.', 'Biomas (pasta biomas/) —': 'Biomes (folder biomas/) —',
  '_biomas.png: máscara RGBA do mundo inteiro (centro em X = 0 / Y = 0): R = deserto, G = floresta,': '_biomas.png: RGBA mask of the whole world (center at X = 0 / Y = 0): R = desert, G = forest,',
  'B = gelo/neve, A = vulcânico; onde todos são 0 é campo. Bordas suaves.': 'B = ice/snow, A = volcanic; where all are 0 it is grassland. Soft edges.',
  'Importe como textura (Compression = Masks ou VectorDisplacementmap, sRGB desligado) e use no material do Landscape': 'Import as a texture (Compression = Masks or VectorDisplacementmap, sRGB off) and use it in the Landscape material',
  '(coordenadas do mundo divididas pelo tamanho do mundo) para trocar as texturas por bioma; também serve de máscara para o PCG.': '(world coordinates divided by the world size) to swap the textures per biome; it also works as a PCG mask.',
  'Tamanho do mundo:': 'World size:', 'de mesmo nome (o pedaço _x0_y0, ex.: {s})': 'with the same name (the _x0_y0 tile, e.g.: {s})', 'Tamanho do mundo: {s}': 'World size: {s}',
  'Se preferir, importe depois em Landscape → Paint → Target Layers.': 'If you prefer, import later in Landscape → Paint → Target Layers.',
  'Importe como textura (Compression = Masks ou Grayscale, sRGB desligado) e use {s} com a': 'Import as a texture (Compression = Masks or Grayscale, sRGB off) and use it {s} with the',
  'Heightmap File → escolha {s} (o Unreal encontra os outros {s} pedaços sozinho)': 'Heightmap File → choose {s} (Unreal finds the other {s} tiles by itself)',
  'Heightmap File → escolha {s}': 'Heightmap File → choose {s}',
  'Location Z .................. {s} (assim o nível do mar fica em Z = 0)': 'Location Z .................. {s} (so sea level is at Z = 0)',
  'Vegetação (pasta vegetacao/) — {s}': 'Vegetation (folder vegetacao/) — {s}', 'Biomas (pasta biomas/) — {s}': 'Biomes (folder biomas/) — {s}',
  'Rios (pasta rios/) — {s} rio(s)': 'Rivers (folder rios/) — {s} river(s)', 'Lagos (pasta lagos/) — {s} lago(s)': 'Lakes (folder lagos/) — {s} lake(s)',
  'Estradas e trilhas (pasta estradas/) — {s} caminho(s)': 'Roads and trails (folder estradas/) — {s} path(s)', 'Marcadores (pasta marcadores/) — {s} ponto(s)': 'Markers (folder marcadores/) — {s} point(s)', 'Desempenho:': 'Performance:', 'Gerado pela Forja de Mundos.': 'Generated by World Forge.'
};

const I18N = (() => {
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const exact = new Map(), patterns = [];
  for (const [pt, en] of Object.entries(I18N_EN)) {
    const k = norm(pt);
    if (k.includes('{s}')) {
      const parts = k.split('{s}').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      // o trecho variável não atravessa um " · " (senão "altura {s} m" engoliria "altura 25 m · vão 110 m")
      patterns.push({ re: new RegExp('^' + parts.join('((?:(?! · ).)+?)') + '$'), en, len: k.length });
    } else {
      exact.set(k, en);
      // a mesma frase sem o ponto final (quando vem emendada com outra)
      if (/[^.]\.$/.test(k) && !exact.has(k.slice(0, -1))) exact.set(k.slice(0, -1), en.replace(/\.$/, ''));
    }
  }
  patterns.sort((a, b) => b.len - a.len); // o padrão mais específico primeiro
  let lang = 'pt';
  const cache = new Map();

  function tr(text) {
    if (lang === 'pt' || !text) return text;
    const k = norm(text);
    if (!k || !/[A-Za-zÀ-ÿ]/.test(k)) return text;
    if (!cache.has(k)) cache.set(k, find(k, 0));
    const t = cache.get(k);
    return t == null ? text : keepSpaces(text, t); // sem tradução: devolve o texto como estava
  }
  // exato → padrão com trechos variáveis → sufixo curto entre parênteses "(m)" "(V)" → partes " · " →
  // frases separadas por ". " → pontuação no começo (", " ". " ": ")
  function find(k, depth) {
    if (exact.has(k)) return exact.get(k);
    for (const p of patterns) {
      const m = p.re.exec(k);
      if (!m) continue;
      let i = 1;
      return p.en.replace(/\{s\}/g, () => { const v = m[i++]; return depth < 2 ? find(v, depth + 1) ?? v : v; });
    }
    if (depth > 2) return null;
    if (/[^.]\.$/.test(k)) { const b = find(k.slice(0, -1), depth + 1); if (b != null) return b.replace(/\.?$/, '.'); } // frase + ponto final
    let m = /^(\d+\) |[a-e]\) )(.+)$/.exec(k); // passo numerado do LEIA-ME: "7) Água"
    if (m) { const b = find(m[2], depth + 1); if (b != null) return m[1] + b; }
    m = /^(.+?)( \([^()]{1,5}\))$/.exec(k);
    if (m) { const b = find(m[1], depth + 1); if (b != null) return b + m[2]; }
    for (const sep of [' · ', ' — ', '. ']) {
      if (!k.includes(sep)) continue;
      const parts = k.split(sep), tp = parts.map((p) => find(p, depth + 1));
      if (tp.some((t) => t != null)) return parts.map((p, j) => tp[j] ?? p).join(sep);
    }
    m = /^\((.+)\)$/.exec(k);
    if (m) { const b = find(m[1], depth + 1); if (b != null) return '(' + b + ')'; }
    m = /^([.,:;·—–-]+ ?)(.+)$/.exec(k);
    if (m) { const b = find(m[2], depth + 1); if (b != null) return m[1] + b; }
    return null;
  }
  const keepSpaces = (orig, t) => (orig.match(/^\s*/)[0] + t + orig.match(/\s*$/)[0]);

  // ---------- página: traduz texto e atributos, inclusive o que o código cria depois ----------
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT']);
  const skipEl = (el) => !el || SKIP.has(el.tagName) || (el.closest && el.closest('[data-noi18n], .mk-label'));
  function doText(n) {
    if (skipEl(n.parentElement)) return;
    const v = n.nodeValue;
    if (n.__en !== undefined && v === n.__en) return; // é a própria tradução que escrevemos
    n.__pt = v;
    const t = tr(v);
    n.__en = t;
    if (t !== v) n.nodeValue = t;
  }
  function doAttrs(el) {
    if (skipEl(el)) return;
    for (const a of ATTRS) {
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      const v = el.getAttribute(a), store = (el.__ptA = el.__ptA || {}), done = (el.__enA = el.__enA || {});
      if (done[a] !== undefined && v === done[a]) continue;
      store[a] = v;
      const t = tr(v);
      done[a] = t;
      if (t !== v) el.setAttribute(a, t);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  // volta tudo para o português guardado
  function restore(root) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = tw.currentNode; n; n = tw.nextNode()) {
      if (n.nodeType === 3) { if (n.__pt !== undefined && n.nodeValue === n.__en) n.nodeValue = n.__pt; n.__en = undefined; }
      else if (n.__ptA) { for (const a in n.__ptA) if (n.getAttribute(a) === n.__enA[a]) n.setAttribute(a, n.__ptA[a]); n.__ptA = n.__enA = null; }
    }
  }
  let obs = null;
  function observe() {
    if (obs) return;
    obs = new MutationObserver((list) => {
      if (lang === 'pt') return;
      for (const m of list) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doAttrs(m.target);
        else m.addedNodes.forEach(walk);
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  // janelas do navegador (confirm) também passam pela tradução
  const nativeConfirm = window.confirm.bind(window);
  window.confirm = (msg) => nativeConfirm(tr(String(msg)));

  function set(l, refresh) {
    lang = l === 'en' ? 'en' : 'pt';
    cache.clear();
    try { localStorage.setItem('forja.lang', lang); } catch (e) { /* só conveniência */ }
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    document.title = lang === 'en' ? 'World Forge' : 'Forja de Mundos';
    if (lang === 'en') { observe(); walk(document.body); } else restore(document.body);
    const b = document.getElementById('btnLang');
    if (b) b.innerHTML = `<span class="${lang === 'pt' ? 'on' : ''}">PT</span> | <span class="${lang === 'en' ? 'on' : ''}">EN</span>`;
    if (refresh) refresh();
  }
  function init(refresh) {
    let l = null;
    try { l = localStorage.getItem('forja.lang'); } catch (e) { /* sem localStorage */ }
    if (!l) l = /^pt/i.test(navigator.language || '') ? 'pt' : 'en';
    const b = document.getElementById('btnLang');
    if (b) b.onclick = () => set(lang === 'pt' ? 'en' : 'pt', refresh);
    set(l);
  }
  // documento de texto (LEIA-ME): linha inteira traduzida, ou pedaço por pedaço (o maior primeiro)
  const frags = Object.keys(I18N_EN).filter((k) => !k.includes('{s}') && k.length >= 6).sort((a, b) => b.length - a.length);
  function doc(text) {
    if (lang === 'pt') return text;
    return text.split('\n').map((line) => {
      const t = tr(line);
      if (t !== line) return t;
      let out = line;
      for (const f of frags) if (out.includes(f)) out = out.split(f).join(I18N_EN[f]);
      return out;
    }).join('\n');
  }
  return { tr, doc, init, set, get lang() { return lang; }, locale: () => (lang === 'en' ? 'en-US' : 'pt-BR') };
})();
