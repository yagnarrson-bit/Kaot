# KAOT – Kill All Of Them

Jogo de sobrevivência zumbi em pixel art, visto de cima (3/4), feito num **único arquivo HTML** (canvas 2D + JavaScript puro, sem bibliotecas nem arquivos externos). Tem modo solo e multiplayer online.

- Dono do projeto: fala **português do Brasil**. Responda sempre em português, de forma direta e curta.
- O dono não é programador: explique em linguagem simples o que mudou e o que ele precisa fazer (por exemplo, subir o arquivo no GitHub).

## Arquivos

| Arquivo | O que é |
|---|---|
| `public/index.html` | O jogo inteiro (~2,4 MB). |
| `server.js` | Servidor Node (WebSocket `ws`). Entrega o jogo em `/` e repassa a "presença" dos jogadores de cada sala em `/ws`. `/health` responde ok. Máx. 8 por sala. |
| `package.json`, `render.yaml` | Deploy no Render (plano grátis). Build `npm install`, start `node server.js`. |
| `LEIA-ME.md` | Passo a passo de deploy para o dono. |
| `tools/` | Ferramentas de teste (Playwright + sala simulada). Ver "Como testar". |

Deploy: o repositório no GitHub (`yagnarrson-bit/Kaot`) está ligado ao Render com auto-deploy. Atualizar o jogo = trocar `public/index.html` e fazer commit. O mesmo HTML também é publicado como artefato no Claude (lá o multiplayer usa a capability `room` do Claude em vez do servidor).

## Cuidados com o index.html (IMPORTANTE)

- **Nunca leia o arquivo inteiro.** Duas linhas são gigantes:
  - `const SPR={...}` (~600 KB): sprites PNG em base64 (armas, itens, animais).
  - `const INTRO_B64="..."` (~1,5 MB): vídeo da intro Khronos (mp4 720p) em base64.
  Use `grep -n` para achar trechos e leia só faixas de linhas. Nunca reescreva o arquivo inteiro; faça edições pontuais.
- Tudo roda dentro de um `(()=>{ 'use strict'; ... })()` no último `<script>`.
- Depois de editar, valide a sintaxe: extraia o último `<script>` e rode `node --check`.
- Textos do jogo são em português.

## Mapa do código (seções marcadas com `// ===== nome =====`)

- **assets / armas redesenhadas**: `makeIcon`, `pxCanvas`, `wepIcon`, `buildWeapons()` desenham as armas em pixel art (contorno `#16121a`). A metralhadora usa um PNG embutido (`IMG.metralhadora`, DIM 202×70).
- **dados**: `ITEM`, `WEP` (armas: `melee`, `dmg`, `rate`, `mag`, `ammo`, `sc`, `two`…), `WORDER`, `BNAME`, `SHOP`, `CT` (tabelas de saque, incl. `MIL`, `MED`), `FK` (móveis), `LAY` (interiores), `ROOMSTYLE`, `ZT` (tipos de zumbi), `AT` (animais), `CARS`, `IW` (pesos).
- **mapa expandido**: `PLAZA`, `BASE`, `STATIONS`, `TOWERS`, `FIELDS`, `BARN`; `genExtra(addCar)` cria base militar, tendas (`tenda`, `tenda_cmd`, `tenda_med`), caixas (`CRATES`), objetos (`PROPS`: cerca, sacos de areia, torres de vigia, torre de rádio, chafariz, espantalhos, celeiro, feno); `drawGroundExtra`, `pushProps`, `drawProp`, `mapExtra`.
- **mundo**: `WW=9600, WH=7200`, `WALL=64`. `genWorld()` (ruas, prédios via `row()`, postes, carros, árvores, arbustos, bueiros). Usa `rnd()` com semente.
- **casas desenhadas**: imagens procedurais de casas e lojas (`HM`, `HOUSE_TYPES`, `SHOP_TYPES`).
- **entrada**: teclado/mouse/toque. Teclas: WASD, Shift correr, E interagir/pegar, F comer, H curar, R recarregar, C agachar, B barricada, Espaço pular, Q esquiva, G dirigir, Tab/I inventário, M mapa, Esc pausa.
- **dirigir**: carro com ângulo livre (`c.rot`, `c.ang`, `c.cx/cy`), `driveStep`, `carBlockedRot`, `parkCar`.
- **música** (`MUS`, Web Audio procedural) e **efeitos sonoros** (`sfxGun`, `sfxSwing`, `sfxMeleeHit`, `sfxZombie`, `sfxAnimal`, `sfxBreath`, `sfxTick`).
- **cutscenes** (`CUT`, `cutStart/cutEnd`): `cutArrive` (furgão no esgoto ao começar), `cutSewer` (túnel ao usar bueiro, renderizador `TN`), `cutBoss` (morte do mutante). Desenham no canvas `#cutCv` 320×180.
- **ações / update / desenho**: `attack`, `meleeHit`, `damageEnemy`, `hurtPlayer`, `update(dt)`, `updateZombies`, `updateAnimals`, `draw()`, `drawOutside`, `drawInside`, `drawNight`, `drawBossBar`.
- **carros**: `drawCarSide` (horizontal), `drawSedanV`/`drawVanV` (vertical), `drawCarRot` (girado), `carTopSprite`/`carTopLayers` (teto elevado no carro e na viatura).
- **personagens**: `drawRig` (jogador com esqueleto), `drawHuman` (NPC e zumbis, paletas `NP`: `z1 z2 z3 z4 zmil zgen`), `drawQuad`/`drawBird` (animais).
- **HUD / inventário**: `hud()`, `renderInv()` (botão LARGAR, clique direito larga).
- **itens no chão**: `GI`, `dropItem`, `pickItem`, `giSpawn`, `groundList`.
- **modo livre + multiplayer**: `NET`, `RP` (jogadores remotos), `netTick`, `readPeer`, `wsRoom()` (cliente do servidor próprio), `getRoom()`.
- **intro** (vídeo) e **fluxo** (`start`, `newGame`, `endGame`, `togglePause`, `toMenu`, `loop`).

## Sistemas e regras importantes

- **Determinismo do mundo (multiplayer)**: todos geram o mesmo mapa a partir de `GSEED`. `newGame()` roda `newGameCore` dentro de `withSeed(GSEED, …)` (troca `Math.random` por PRNG). Qualquer coisa nova no mundo deve usar `rnd()`/`R()` no `genWorld` ou `Math.random` dentro do `newGameCore`, nunca fora disso.
- **Zumbis**: `ZL` indexa todos (id global, `gen`). Mortes: `zDead`. Tipos: `z1`, `z2`, `z3`, `z4` (mutante, a cada 10 dias, sincronizado via `MUT`), `zmil` (militar: camuflado, colete, capacete; mais forte), `zgen` (General, mini chefe com quepe vermelho, só na base; ao morrer larga metralhadora, 3 caixas `amg` de 100 balas e um kit no chão).
- **Multiplayer (presença)**: cada jogador manda em `presence` `p` (posição/estado), `k` (mortes), `h` (golpes), `z` (posições dos zumbis se for dono da cena), `dr`/`pk` (itens largados/pegos), `g` (semente/modo/dificuldade/rank). O anfitrião (menor `rank` = quem entrou primeiro) manda `G` (estado vivo/morto de todos os zumbis, 1 caractere por zumbi), `D` (relógio do dia) e `M` (mutantes).
  - **Limites da sala do Claude**: cada string ≤ 1 KB e presença total ≤ 4 KB. Por isso o total de zumbis (`DIFF`: 320/480/720) precisa manter `G` < 1024 caracteres.
- **Dia e noite**: `DAY_LEN=150` s por dia; `GT` é o relógio (sincronizado). `nightK()`. À noite os zumbis enxergam mais e correm mais.
- **Desempenho**: não use `ctx.filter` (causava lag forte ao bater). Texturas grandes usam `createPattern`.
- **Modo livre**: começa só com taco, sem contagem, zumbis renascem (`freeRespawn`).

## Como testar (tools/)

- `npm i -D playwright` e `npx playwright install chromium` (uma vez).
- `tools/mock-room.js`: sala falsa via `BroadcastChannel` para testar o multiplayer com 2 abas. Injete com `context.addInitScript`.
- `tools/teste-exemplo.js`: abre o jogo, pula a intro, começa e tira um print. Sirva a pasta com `npx http-server public -p 8765` (ou `node server.js`).
- Para inspecionar o estado do jogo nos testes, injete temporariamente uma função `window.__k=()=>({...})` antes da linha `// ================= fluxo =================` numa **cópia** do HTML (não deixe isso no arquivo final).

## Histórico (o que já existe)

Multiplayer online (Claude `room` + servidor Render), modo livre, fôlego/estamina, pulo e esquiva, dia/noite com postes acesos, mutante a cada 10 dias, carros redesenhados e direção livre, armas redesenhadas, sons e música procedurais, intro em vídeo, menu preto/dourado, pausa (Esc / botão MENU no celular), cena de chegada pelo esgoto, cena do túnel, inventário que não pausa, mapa expandido (cidade com praça central e base militar, tendas militares e médicas, estações militares, torres de rádio, fazenda com trigo), zumbis militares, General, largar/pegar itens, metralhadora.

Limitações conhecidas: no multiplayer, saque de casas, animais e pets são locais de cada jogador; itens largados somem se quem largou sair da sala; dirigir e cutscenes de esgoto/chefe são só no solo.
