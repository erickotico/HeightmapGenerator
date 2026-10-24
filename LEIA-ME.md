# Forja de Mundos

Gerador de heightmap para o Landscape do Unreal Engine 5. Roda no navegador, offline, sem instalar nada.

## Como abrir
Dê dois cliques em `index.html` (Chrome ou Edge atualizados).

## Tela (estilo Adobe)
- **Menus no topo**: Arquivo, Editar, Gerar, Exibir, Exportar, Janela, Ajuda.
- **Barra de opções** logo abaixo: mostra só as opções da ferramenta escolhida (tamanho, força, altura alvo, tipo de marcador…).
- **Ferramentas na vertical** à esquerda. Botões com triângulo no canto têm um grupo: clique no triângulo, use o botão direito ou segure o clique.
  - Camada ativa (Terra, Montanhas, Colinas, Planaltos, Aplainar, Rios, Esculpir) fica num grupo só; Regiões é um botão à parte.
  - **Rio** (V): clique na nascente e depois no destino; o rio liga os dois pontos pelos vales. Clicando em mar, lago ou outro rio, ele termina na margem mais próxima daquele ponto.
  - Marcador tem duas variantes: **Construção** (miniaturas: capital, cidade, vila, castelo, porto, templo, masmorra, caverna, ruínas) e **Vegetação / ambiente** (pino de ponto de interesse, árvore ancestral, fonte, cachoeira…).
  - **Vegetação (áreas)**: pinte floresta, pinheiros, selva, bosque, pântano, campo florido, oásis e cactos. Vira arvorezinhas no mapa e máscara para o PCG.
- **Painéis na doca** à direita: recolha (▾), arraste pelo título para reordenar, solte como janela (⇱ ou arrastando para fora da doca) e feche (✕). Painel fechado volta pelo menu **Janela**; lá também tem "Restaurar layout padrão". A largura da doca muda arrastando a borda.

## Fluxo
1. **Terra / Mar**: pinte o continente, gere um automático ou carregue um desenho seu como imagem-guia.
2. **Montanhas, Colinas, Planaltos, Rios, Aplainar**: pinte onde quer cada relevo. A Intensidade do pincel controla a força.
3. **Vegetação** e **Regiões / Reinos**: pinte as áreas. Isso não muda o relevo; vira máscara para o PCG.
4. **Marcadores**: cidades, castelos, masmorras, pontos de interesse.
5. **Gerar → Aplicar erosão** e confira na **Prévia 3D**.
6. **Exportar → Exportar pacote (.zip)**. O `LEIA-ME_Unreal.txt` dentro do ZIP traz os valores exatos para o Unreal (Section Size, Components, Scale, Location Z).

O trabalho é salvo automaticamente no navegador a cada 20 s. Use **Arquivo → Salvar** para guardar um arquivo `.forja`.

## Atalhos
H mover · B pintar · E apagar · S suavizar · G balde · I conta-gotas · N nivelar · V rio (clique na nascente e no destino) · R régua · M marcador ·
1–7 camada ativa · 8 regiões · 9 vegetação · Esc apaga a régua / fecha menus · Delete apaga o marcador selecionado ·
[ ] tamanho do pincel · F enquadrar · Shift inverte pintar/apagar · botão direito ou Espaço+arrastar move o mapa ·
Ctrl+Z / Ctrl+Y · Ctrl+S salvar. (Menu Ajuda → Atalhos do teclado mostra a lista.)

## Arquivos
- `js/engine.js`: motor (ruído, erosão, exportação PNG 16-bit / ZIP), roda num Web Worker.
- `js/ui.js`: layout (menus, barra de opções, ferramentas em grupo, doca de painéis).
- `js/app.js`: pintura, marcadores, vegetação, projeto, mapa do jogo.
- `js/gl3d.js`: prévia 3D em WebGL2.
- `js/unreal.js`: cálculo de Section Size / Components / Z Scale e LEIA-ME do Unreal.
