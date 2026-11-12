# VelluM Priston Classic — publicação de ADM, /equipar, coroa e aura
Atualização: 12/11/2026

## Confirmado em execução
- Jogo clássico: https://acesso.gbtechnology.com.br/priston-classic/
- Servidor nativo novo compilado com MSBuild VS2022, ReleaseGL x86; servidor.exe instalado em C:\\inetpub\\priston\\[project]\\dist\\server\\server.exe, ouvindo na porta 10007.
- Cliente WebAssembly compilado com Emscripten e publicado em C:\\VelluM\\integration-priston\\game.wasm (6.073.502 bytes; SHA-256 começa em 39a406ded938).
- Priston clássico abre em aproximadamente 4,9 segundos no teste automatizado, renderiza e alcança status Running, usando o pacote de startup comprimido e cache.
- WebSocket HTTPS conectado em /priston-classic/ws.ashx?port=10007.
- Tela cheia real e layout 4:3 testados com Puppeteer.
- VelluM legado (/priston/ e /priston/jogar) retorna GET 200; seu servidor 19065 permaneceu ativo.
- Guacamole (/guacamole/) retorna GET 200.
- Servidor separado de testes em 10008 compilado e iniciado com sucesso, depois desligado para liberar recursos.

## Autorização ADM e comandos integrados ao executável
Fonte C++ disponível no arquivo `ops/priston-classic-live-20261112.patch`, com base no commit upstream `4eff7285cba97aa8fe41c36205f1e185a2169d0c`.
- `src/SrcServer/OnSever.cpp`: modo GM 4 somente para ID autenticado `ADM` (sem diferenciar maiúsculas/minúsculas); requisições de debug de outros IDs não concedem privilégios, inclusive o pacote de aging.
- `/equipar`: restrito a `ADM`, aplica nível nativo máximo `CHAR_LEVEL_MAX`, ajusta XP, envia protocolo de atualização de nível e utiliza `GmDeckOut` com aging +25 e seleção de melhores itens por classe.
- BossMode seleciona acessórios da família especial `sinOR2` (anéis de chefes) e permite itens especiais compatíveis; não significa entregar literalmente todos os drops de todos os chefes.
- Aliases em português: `/monstro`, `/meumonstro`, `/nivel`, `/ouro`, `/xp`, `/item`.
- `src/playmain.cpp`: coroa carregada a partir do modelo existente `weapons/Crown.smd`.
- `src/character.cpp`: renderização da coroa para o personagem de nome `ADM`, com aura pela função `sinEffect_Ratoo_Aura2`.
- O cliente WebAssembly recompilado contém essas alterações; o arquivo `admin.js` informa que a permissão GM é verificada no servidor e inclui `/equipar` na ajuda.
- O botão de atalhos locais do cliente **não** altera a autorização no servidor.

## Backups e reinstalação
- Backup anterior do cliente: `C:\\VelluM\\backups\\classic-adm-binaries-20261112-163707`.
- Backup anterior do servidor e dos dados de contas/personagens: `C:\\VelluM\\backups\\classic-live-swap-20261112-165415`.
- Instalador em `ops/integrate-priston-web.ps1` passa a copiar os artefatos recompilados de `[project]\\src\\web\\out`, atualizar o cache busting do JS e aplicar UI ADM, fullscreen e os pacotes compactados.
- Código-fonte alterado foi preservado também localmente em `C:\\inetpub\\priston\\[project]\\src`; copiar ou recompilar o EXE só depois de fazer backup.

## Limitações da validação
- **Não foi concluído um teste end-to-end de login ADM + envio de /equipar + salvamento de itens, nem confirmado visualmente o aspecto da coroa e da aura dentro de uma sessão autenticada.** Build e teste de porta/WebSocket não substituem isso.
- Na primeira validação automatizada de login, o foco do formulário estava incorreto; o preenchimento correto com Tab foi comprovado, mas o teste de login autenticado ainda não foi completado.
- O motor clássico continua sendo um projeto de testes, não se deve proclamar que todos os NPCs, mapas ou funções estão 100% livres de erros.

## Correção de autenticação GM — 12/11/2026, 17h54 (America/Sao_Paulo)
- Encontrado em DataServer: duas contas administrativas já existentes, `adm` (personagem ADM) e `admin` (personagem own).
- A compilação anterior verificava somente `ADM` em seis pontos de `OnSever.cpp`, deixando o personagem `own` com comandos bloqueados sob a conta `admin`.
- Corrigidas as seis verificações para aceitar exclusivamente os IDs autenticados `adm` ou `admin` (case-insensitive), sem usar nome de personagem como credencial.
- Executável recompilado com MSBuild ReleaseGL, compilação concluída; deploy efetuado pela tarefa agendada `PristonServer` com backup e reinicialização controlada.
- SHA256 do executável ativo e do compilado coincidem, prefixo `ea5ce60b4fa7fef4`. Porta 10007 aberta, WSS público conectado, VelluM antigo 19065 e Guacamole HTTP 200.
- Backup dessa atualização: `C:\\VelluM\\backups\\classic-admin-authfix-20261112-175424`.
- O arquivo `ops/priston-classic-live-20261112.patch` foi atualizado com a alteração C++ para reproduzir o build.
- **Pendente**: teste end-to-end de execução e persistência de `/equipar`, `/monstro` ou outros comandos após novo login do jogador em `admin` ou `adm`. Os logs coletados no momento da publicação continham somente comandos anteriores a ela.
- O log `LogDebug/Commands.log` mostra `smCharInfo.szName` (nome do personagem), não necessariamente o ID de conta; o valor GM exibido é registrado antes da chamada a `RecvCommand`. Portanto uma linha `own (GM 0)` por si só não prova que o comando foi recusado; conferir o efeito dentro do jogo.

## Atualização 12/11/2026 — tiers de skills e feedback GM

- A conta administrativa pode executar `/habilidades` (ou `/tiers`) para definir `ChangeJob=3`, equivalente a acesso às skills dos tiers 1–4, sem realizar as quests de evolução. **Não** concede Tier 5.
- `/equipar` agora concede esse mesmo estágio de tiers junto com nível máximo e equipamentos.
- O servidor mantém `smCharInfo.ChangeJob=3` para a sessão autenticada e envia o opcode novo `smTRANSCODE_GM_SETTIER=0x50326013`; o cliente WebAssembly correspondente atualiza `sinChar->ChangeJob` e o estado do jogador, e solicita gravação via `SaveGameData()`. É necessário **reentrar no jogo após o deploy** e testar no mestre de habilidades. A quantidade de pontos disponíveis corresponde ao nível adquirido, não concede automaticamente skills nível 10.
- `/monstro` e `/meumonstro` agora respondem no chat com a quantidade de invocações concluídas ou informam que o monstro não foi encontrado/que não há espaço; limite 20. Corrigida a quantidade: `/monstro hopi 10` agora tenta invocar exatamente 10 em vez de 11.
- Comando `/comandos` lista as opções oficialmente implementadas. Não anuncia `/mapa` ou `/field` como disponíveis, pois não são comandos existentes nesse servidor.
- A compilação do servidor MSBuild ReleaseGL terminou com exit 0. Instalado pela tarefa agendada `PristonServer` (porta 10007), backup `C:\\VelluM\\backups\\classic-admin-authfix-20261112-180637`.
- A compilação WebAssembly Emscripten terminou com exit 0, `game.wasm` 6074835 bytes, SHA256 prefixo `511428392586987a`; publicado pelo instalador `ops/integrate-priston-web.ps1`. Backup cliente em `C:\\VelluM\\backups\\classic-skill-client-20261112-180706`.
- Teste automatizado da página pública: status Running após ~5.8s, startup pack 1587 arquivos comprimidos, WebSocket WSS conectado, /priston/ (legado), /priston-classic/ e /guacamole/ GET 200.
- Reprodutibilidade: `ops/priston-classic-live-20261112.patch` atualizado com o source C++ das duas partes, `ops/priston-admin-help.js` com ajuda de comandos e skill tiers; cliente e servidor devem ser compilados juntos sempre que opcode for alterado.
- **Limitação**: testes de compilação/abertura não comprovam que a compra das skills e a persistência após relogin foram concluídas. Isso exige teste no mestre com uma sessão ADM autenticada, além de verificar o retorno do comando de monstros no jogo.

## Atualização visual 12/11/2026
- Novo addon `ops/priston-visual-quality.js`: modo padrão `Visual: HD` com contraste 1.075, saturação 1.105, brilho 1.015; botão discreto para voltar ao visual original `Visual: clássico`, persistido em localStorage.
- Implementação original com proporção nativa 4:3, mantendo o canvas interno 1024x768. Alterar a resolução lógica sem alterar hit testing pode causar erro de entrada, portanto não foi feito.
- `ptplatform/ptplatform.cpp` solicita buffer com 4 amostras MSAA; navegador WebGL2 no teste retornou `getContextAttributes().antialias=true`, `MAX_SAMPLES=4`, `SAMPLES=0` no framebuffer consultado. O navegador pode usar um caminho de antisserrilhamento diferente, e não se afirma que efetivamente usa MSAA 4x em todos os dispositivos.
- Build Emscripten release passou; website público instalou `game.wasm` 6,074,897 bytes e `game.js` com cache busting; instalador preserva addon nas próximas publicações.
- Puppeteer: tela 1440x900, render 1200x900, canvas lógico 1024x768, botão alternou filtro e persistiu após recarregar, jogo `Running` em ~5.2s.
- Backup: `C:\\VelluM\\backups\\classic-graphics-before-20261112-182135`.
- O patch de C++ foi atualizado no `ops/priston-classic-live-20261112.patch`.
- A nova aparência não altera os modelos e texturas originais e não é equivalente a remasterização, high resolution nativa ou o desenho de interface do VelluM antigo.

## Atualização integrada — 12/11/2026, 18h53
Implementado e publicado:
- HD como filtro CSS permanente: contraste 1.075, saturação 1.105, brilho 1.015. Removido o botão de alternância e a aplicação de antisserrilhamento WebGL instável, preservando o motor clássico de 1024x768.
- Canvas em largura/altura integrais `100vw / 100dvh`, validado em viewport 1600x900. **A imagem 4:3 fica esticada horizontalmente**, não é uma nova câmera 16:9 nem renderização widescreen nativa.
- Barra de Settings / Atalhos / Commands ocultada por CSS; botão de maximizar mantido. Salvamentos do navegador continuam no sistema, apenas a barra não aparece.
- Em `ops/priston-settings-ptbr.js`, `Module.ptOpts.lang=7` (PT_LANG_BRAZIL), inclusive em perfis com idioma antigo salvo; controle de idioma não permite troca. `ops/priston-progress-ptbr.js` traduziu indicadores de carregamento. **Não é 100% português em todo conteúdo**: imagens/textos estáticos originais e eventuais cadeias do cliente não foram totalmente traduzidos.
- `/equipar` em C++ seleciona código `OR205` para os dois anéis Valento, `OA130` Kelvezu Amulet e `OS107` Murky (não existe Dark Shelton no catálogo local), com `Spirit=64` e `Random_MaxMode=1`. Os outros equipamentos continuam priorizando os melhores itens compatíveis com classe/nível e envelhecimento +25.
- `/monstro` e `/meumonstro` executam com GM 4 também quando `AutoPlayServer` é falso (produção) e reconhecem os nomes sem diferença de maiúsculas/minúsculas; respondem com quantidade efetivamente invocada.
- `/ouro` entrega o valor (até um milhão por comando) ao personagem via `rsPutItem2` em vez de deixar ouro no chão para GM4.
- `/premium [pagina]` entrega até dez itens reais dos grupos `sinBI1/sinBI2` por chamada, para não perder centenas de itens por inventário lotado; `/premium` equivale a página 1, `/premium 2` página 2 etc. **Não entrega os 167 itens em uma execução**.
- `/salvar` solicita uma gravação pelo protocolo existente `smTRANSCODE_SAVECLIENT`; o cliente recebeu um `SetSaveSoon(3000)` adicional para repetir se havia gravação pendente. O sistema já tinha `SaveGameData` em fluxos de logout, agora com esta proteção adicional quando solicitada.
- Fonte C++ reproduzível em `ops/priston-classic-live-20261112.patch` (commit 0b72b14), scripts front-end e instalador também versionados no GitHub.
- Backup antes da substituição de executável: `C:\\VelluM\\backups\\classic-admin-authfix-20261112-185310`; backup cliente: `C:\\VelluM\\backups\\classic-fullwidth-client-20261112-185359`; backup UI antes da alteração: `C:\\VelluM\\backups\\classic-fullwidth-ptbr-20261112-184015`.
- Builds: servidor MSBuild ReleaseGL exit 0; cliente WebAssembly Emscripten exit 0; servidor clássico 10007 e VelluM antigo 19065 estão em execução. Frontend novo `game.wasm` 6076521 bytes. Instalador aplica querystring por hash em `fullscreen.css`, `settings.js`, `progress.js` e `game.js` para não reutilizar layout antigo.
Pendências que não devem ser declaradas concluídas:
- Emblemas visuais distintos dos tiers 2, 3 e 4 **não foram implementados**. O sistema de rank 1–4 já é liberado via `/habilidades` e `/equipar`.
- `/mapa` e `/field` ainda não foram implementados de forma segura. Permanecem os comandos nativos de teleporte, como `/near` e `/call`.
- Testar no jogo com login ADM: confirmação dos dois anéis OR205 e amuleto OA130 + Murky, quantidade e recepção de itens premium, ganhos de ouro e monstros invocados, salvamento após logout/login. Builds, HTTP e WebSocket **não validam esse ciclo de personagem**.
- Validar quantidade de pontos e compra de skills de tiers 1–4 no mestre.

## Auditoria de ponta a ponta — 12/11/2026, 19h33

### Auditoria executada
- Varredura do processador `RecvCommand`: 116 chamadas `rsCompString`, correspondendo a 111 strings ASCII distintas. Mantidos os comandos originais, incluindo gestão de contas, jogadores, eventos, castelo, monstros, itens, guildas e ferramentas de debug. **A presença no código não significa que todos os comandos foram testados nem que devem estar disponíveis a toda conta.**
- Adicionados aliases de GM por conta autenticada `adm`/`admin`: `/adm` consulta GM, `/mapa <número>` e `/field <número>` teleportam para mapas existentes e carregados, incluindo `/mapa ricarten` (3), `/mapa pillai` (21) e `/mapa nevisco` (9). Validação rejeita mapas inválidos/não carregados, sem enviar warp inseguro para campo ausente.
- Adicionados aliases preservando os comandos nativos: `/ir <personagem>` equivale a `/near`, `/trazer <personagem>` equivale a `/call`, `/invencivel` equivale a `/IDDQD`. `/monstro`, `/meumonstro`, `/nivel`, `/ouro`, `/item`, `/premium`, `/equipar`, `/habilidades` e `/salvar` já integrados.
- Indicadores 3D de tier 2, 3 e 4: cores bronze, prata e ouro no modelo nativo de coroa, sobre a cabeça de personagens cuja `ChangeJob` esteja em 1, 2 ou 3. Isso **não** reproduz artes de emblemas históricos independentes: utiliza o mesmo modelo com tintas diferentes. Tier 5 não está incluído. ADM mantém coroa/aura própria. Indicadores compilados em cliente WebAssembly e publicados.
- Salvamento: verificados `SaveGameData()`, opcode `smTRANSCODE_SAVECLIENT`, rotina de logout e tentativa adicional `SetSaveSoon(3000)` em comando de salvamento. Conta e personagem preservados. A salvaguarda não elimina bloqueios nativos intencionais quando `AdminCharDisable`, trade ou warehouse estão ativos.
- Equipamentos boss: `OR205` Valento Ring em 2 slots, `OA130` Kelvezu Amulet, `OS107` Murky com Spirit 64, `Random_MaxMode`; Dark Shelton não consta no catálogo local.
- `/premium` distribui items do catálogo real em páginas de 10, sem processar todos de uma só vez; o inventário pode não ter espaço e itens precisam ser confirmados no personagem.
- O cliente permaneceu com modo visual HD fixo por CSS, idioma do motor em PT-BR e canvas na largura total. Textos antigos de dentro do motor ainda não estão totalmente traduzidos.

### Verificações objetivas
- Criado `ops/audit-priston-classic.py`, auditoria somente leitura: 20 testes, **20 passaram** após implantar o cliente correspondente. Valida binário ativo vs compilado, WASM ativo vs compilado, portas 10007/19065, contas/personagens, backups, permissões de conta ADM, comandos, códigos dos itens, idioma, UI, cache e GET 200 do jogo/Guacamole/VelluM antigo.
- `server.exe` compilado MSBuild ReleaseGL x86 sem erros e publicado pela tarefa `PristonServer` com rollback; porta 10007 e WSS público em funcionamento.
- `game.wasm` compilado via Emscripten sem erros e publicado, 6.077.838 bytes, com fallback de rollback cliente. Navegador Puppeteer chegou ao estado `Running` em ~4,8 s no primeiro smoke e apresentou imagem 3D sem tela preta; canvas 1600x900 em viewport 1600x900; `Module.ptOpts.lang=7`.
- Backups: `C:\\VelluM\\backups\\classic-audit-accounts-20261112-1926` (12 arquivos de conta/personagens), `C:\\VelluM\\backups\\classic-admin-authfix-20261112-192638` (servidor anterior) e `C:\\VelluM\\backups\\classic-tier-client-before-20261112-193052` (cliente anterior).
- Código C++ atualizado: `ops/priston-classic-live-20261112.patch`; utilitários de implantação persistidos na branch `main` do GitHub.

### Lacunas — não afirmar conclusão sem evidência
- **Ainda não houve teste end-to-end autenticado em personagem** de execução dos comandos /mapa, /equipar, /premium, /salvar com logout/login, nem compras de habilidades após os tiers.
- As cores dos emblemas dos tiers foram codificadas e compiladas, mas a aparência de cada tier não foi examinada dentro de uma sessão com o personagem promovido.
- Nem todo texto embutido no executável original está traduzido; o visual horizontal preenche a tela, mas o render lógico original 1024x768 pode alongar a imagem.
- A verificação automatizada cobre infraestrutura e evidências estáticas, **não** comprova todos os 111 comandos nativos, todas as quests, mapas, NPCs ou estabilidade de 24h.
