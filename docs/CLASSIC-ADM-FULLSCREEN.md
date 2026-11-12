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
