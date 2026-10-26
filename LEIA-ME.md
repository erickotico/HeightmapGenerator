# Forja de Mundos

Gerador de heightmap para o Landscape do Unreal Engine 5. Roda no navegador, offline, sem instalar nada.

## Como abrir
Dê dois cliques em `index.html` (Chrome ou Edge atualizados).

## Tela (estilo Adobe)
- **Menus no topo**: Arquivo, Editar, Gerar, Exibir, Exportar, Janela, Ajuda.
- **Barra de opções** logo abaixo: mostra só as opções da ferramenta escolhida (tamanho, força, altura alvo, tipo de marcador…).
- **Ferramentas na vertical** à esquerda. Botões com triângulo no canto têm um grupo: clique no triângulo, use o botão direito ou segure o clique.
  - Camada ativa (Terra, Montanhas, Colinas, Planaltos, Aplainar, Rios pintados, Lagos, Esculpir) fica num grupo só; Regiões é um botão à parte.
  - **Rio** (V): clique na nascente e depois no destino; o rio segue os vales e vira uma **linha editável** (arraste os pontos, dois cliques na linha criam um ponto, Alt+clique apaga, Delete apaga o rio; largura na nascente e na foz na barra de opções). Rios pintados antigos viram linhas em **Gerar → Rios pintados → rios editáveis**; **Limpar manchinhas** apaga pedaços soltos da pintura.
  - Rio, Estrada e Lagos ficam num grupo só.
  - **Lagos**: pinte o formato. A água fica plana na altura da margem e o fundo é cavado em bacia (Ajustes → Profundidade dos lagos).
  - **Estrada / trilha** (T): clique nos pontos de passagem; a rota segue o relevo, contorna morros e faz zigue-zague nas subidas fortes (estrada até 12% de rampa, trilha até 25%). O terreno só é suavizado na largura da via, sem corte seco. A pista aparece pintada no mapa 2D e na Prévia 3D.
    - **Ligar cidades**: liga capital, cidades e castelos com estradas automáticas (vilas ficam de fora), aproveitando trechos em comum.
    - **Pontes e cachoeiras**: marca uma ponte onde a estrada cruza rio e uma cachoeira onde o rio cai forte (marcadores comuns, com direção e medida no export).
  - **Esculpir** tem também o **Carimbo de relevo** (K: montanha, vulcão, cratera, cânion, platô, ilha; [ ] tamanho, , . ou Shift+roda giram) e o **Pincel de erosão** (O: a chuva escava ravinas só onde você pintar). Tudo vai para a camada Esculpir, com desfazer.
  - **Biomas**: pinte deserto, floresta, gelo e vulcânico (o resto é campo). Vira a máscara de biomas do material do terreno. **Sugerir pelo clima…** pinta uma sugestão pela altitude, posição norte/sul e vento (sombra de chuva atrás das montanhas).
  - Marcador tem duas variantes: **Construção** (miniaturas: capital, cidade, vila, castelo, porto, templo, masmorra, caverna, ruínas) e **Vegetação / ambiente** (pino de ponto de interesse, árvore ancestral, fonte, cachoeira…).
  - **Vegetação (áreas)**: pinte floresta, pinheiros, selva, bosque, pântano, campo florido, oásis e cactos. Vira arvorezinhas no mapa e máscara para o PCG.
- **Painéis na doca** à direita: recolha (▾), arraste pelo título para reordenar, solte como janela (⇱ ou arrastando para fora da doca) e feche (✕). Painel fechado volta pelo menu **Janela**; lá também tem "Restaurar layout padrão". A largura da doca muda arrastando a borda.

## Fluxo
1. **Terra / Mar**: pinte o continente, gere um automático ou carregue um desenho seu como imagem-guia.
2. **Montanhas, Colinas, Planaltos, Rios, Aplainar**: pinte onde quer cada relevo. A Intensidade do pincel controla a força.
3. **Vegetação** e **Regiões / Reinos**: pinte as áreas. Isso não muda o relevo; vira máscara para o PCG.
4. **Marcadores**: cidades, castelos, masmorras, pontos de interesse.
5. **Rios, lagos e estradas**: ferramentas Rio (V), camada Lagos e Estrada (T).
6. **Gerar → Aplicar erosão** e confira na **Prévia 3D**.
7. **Exportar → Exportar pacote (.zip)**. O `LEIA-ME_Unreal.txt` dentro do ZIP traz os valores exatos para o Unreal (Section Size, Components, Scale, Location Z). Junto vão `rios/`, `lagos/`, `estradas/` (JSON com os traçados em cm) e `biomas/` (máscara RGBA).

**Atlas** (aba no topo): vários continentes num mundo só. Um tabuleiro de quadrados do mesmo tamanho; cada continente é um projeto normal, aberto no editor com **Editar**. Quadrado vazio = mar, e as bordas dos continentes descem sozinhas até o fundo. **Exportar atlas** junta tudo num terreno único (em pedaços para World Partition quando é grande) com mapa-múndi. **Salvar atlas** guarda todos num arquivo `.forjaatlas`.

**Minimapa:** em Exportar, "Minimapa em pedaços" gera o mapa limpo em 2×2, 4×4 ou 8×8 imagens de 1024 px que se encaixam (só Blueprint para usar; o LEIA-ME do ZIP explica).

**Idioma:** português ou inglês, no botão **PT | EN** no topo (o primeiro acesso segue o idioma do navegador). Os nomes de pastas e campos dos arquivos exportados não mudam com o idioma.

O trabalho é salvo automaticamente no navegador a cada 20 s. Use **Arquivo → Salvar** para guardar um arquivo `.forja`.

## Atalhos
H mover · B pintar · E apagar · S suavizar · G balde · I conta-gotas · N nivelar · K carimbo · O erosão · V rio · T estrada · R régua · M marcador ·
1–8 camada ativa (7 = Lagos) · 9 regiões · Enter termina a estrada · Alt+clique apaga um ponto · Esc cancela / apaga a régua / fecha menus · Delete apaga o marcador, rio ou estrada selecionado ·
[ ] tamanho do pincel · F enquadrar · Shift inverte pintar/apagar · botão direito ou Espaço+arrastar move o mapa ·
Ctrl+Z / Ctrl+Y · Ctrl+S salvar. (Menu Ajuda → Atalhos do teclado mostra a lista.)

## Arquivos
- `js/engine.js`: motor (ruído, erosão, exportação PNG 16-bit / ZIP), roda num Web Worker.
- `js/ui.js`: layout (menus, barra de opções, ferramentas em grupo, doca de painéis).
- `js/app.js`: pintura, marcadores, vegetação, biomas, projeto, exportação dos rios/lagos/estradas, mapa do jogo.
- `js/features.js`: rios em linha e estradas (dados, desenho e edição com o mouse).
- `js/rivers.js`: traçado dos rios pintados (máscara → linhas).
- `js/i18n.js`: idioma PT / EN (dicionário e tradução da página).
- `js/stamps.js`: carimbos de relevo.
- `js/atlas.js`: modo Atlas (vários continentes, exportação do mundo inteiro).
- `js/gl3d.js`: prévia 3D em WebGL2 (terreno, lagos, estradas e rios).
- `js/unreal.js`: cálculo de Section Size / Components / Z Scale e LEIA-ME do Unreal.
