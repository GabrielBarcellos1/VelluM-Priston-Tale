# Priston Classic: fullscreen e ADM (12/11/2026)

## Estado publicado
- URL: https://acesso.gbtechnology.com.br/priston-classic/
- Interface de jogo ocupa toda a altura do navegador, centralizada na proporção nativa 4:3, sem barras de rolagem. A barra de ações fica discreta na parte inferior.
- Botão discreto no canto superior direito ativa/desativa fullscreen real com `requestFullscreen()` (Esc para sair).
- CSS/JS em `ops/priston-fullscreen.css` e `ops/priston-fullscreen.js`, instalados por `ops/integrate-priston-web.ps1`.
- Testes automatizados: 1440x900 produziu canvas 1200x900, jogo Running, botão ativou document.fullscreenElement.
- O VelluM anterior `/priston/` e o Guacamole não foram modificados.

## ADM: alteracoes preparadas no código-fonte, NÃO ATIVAS no executável
A conta de servidor que existe atualmente tem ID `adm` (equivalente a `ADM`, sem diferenciar maiúsculas/minúsculas), e há personagem `ADM`.

Foram aplicados no código-fonte local do Priston Tale Web, com backups timestamped:
1. `ops/patch-classic-adm-auth-and-equip.py`: no servidor C++, reconhecimento de ID autenticado ADM para AdminMode 4 e recusa de nível administrativo concedido por um botão de debug do navegador a outras contas; comando `/equipar` com nível máximo `CHAR_LEVEL_MAX`, protocolo de ajuste de nível e equipamento.
2. `ops/patch-classic-boss-gear.py`: modifica `GmDeckOut` apenas quando usado pelo `/equipar`, para envelhecimento +25, escolher as últimas armas/armaduras equipáveis disponíveis e família `sinOR2` de anéis especiais, incluindo itens de boss quando registrados e compatíveis. Não representa garantia de todos os boss drops específicos do Priston original.
3. `ops/patch-classic-adm-crown-aura.py`: usa a coroa 3D clássica `PatCrown` e aura `sinEffect_Ratoo_Aura2` no personagem de nome `ADM`. Coroa/aura visuais dependem de assets e recompilação do cliente.
4. Aliases previamente preparados em `ops/patch-classic-gm-aliases.py`: `/monstro`, `/meumonstro`, `/nivel`, `/ouro`, `/xp`, `/item`.

Os patches locais foram aplicados em:
- `C:\inetpub\priston\[project]\src\SrcServer\OnSever.cpp`
- `C:\inetpub\priston\[project]\src\character.cpp`

**O executável `server.exe` e o cliente `game.wasm` foram mantidos intactos**. Não foi encontrado toolchain Visual Studio/MSBuild nem Emscripten no host. Os comandos em português, o auto-GM, `/equipar`, a coroa e a aura **ainda não funcionam na versão hospedada**; requerem uma compilação Windows e WebAssembly e testes de conta/GM, itens, savedata, animação e multiplayer.

Segurança: a configuração atual de testes `*GM_CHEATS` e o controle de AdminMode por navegador **não constituem autorização confiável por conta** até o novo binário de servidor ser testado e publicado. Não divulgar o servidor como produção multiusuário com GM restrito antes disso. Não substituir o `server.exe` por binário improvisado. A opção de ADM deve ser autorizada pelo ID autenticado no servidor, nunca por localStorage ou querystring.

## Alternativa já suportada pelo servidor atual
Com o GM legitimamente ativado, `/MakeMeLevel 200` e `/DeckMeOut! 25` existem no binário atual; o segundo equipa os melhores itens padrão que satisfazem requisitos de nível e classe, mas não garante todos os itens especiais dos chefes. Não alterar dados binários de personagens externamente.
