# VelluM Classic Engine - laboratorio de integracao (12/11/2026)

Objetivo: testar o cliente e servidor C++/WebAssembly do projeto sungam3d/priston-tale-web como motor do VelluM, preservando o VelluM Python/JS original.

## Ambientes
- Legado: C:\VelluM\app, codigo C:\VelluM\repository, contas C:\VelluM\data\accounts.sqlite3, servico local 19065.
- Motor classico: C:\inetpub\priston, IIS Default Web Site porta 80, server.exe porta TCP 10007.
- Laboratorio independente: C:\VelluM\integration-priston, IIS VelluM Priston Lab vinculado a 127.0.0.1:8095.
- O diretorio data do laboratorio e um JUNCTION para C:\inetpub\priston\data (arquivos estaticos).
- O laboratorio usa o MESMO server.exe e DataServer do Priston Web original. Nao compartilha usuarios/personagens com o VelluM Python/SQLite.
- Backup SQLite consistente e dados do Priston: C:\VelluM\backups\integration-priston-20261112-125802.
- Instalacao recriavel: ops\integrate-priston-web.ps1.

## Testes executados
- IIS lab HTTP 200; WASM application/wasm HTTP 200; manifest e startup pack HTTP 200.
- WebSocket ws://127.0.0.1:8095/ws.ashx?port=10007: abertura e fechamento 1000.
- Puppeteer Chromium: startup pack 1587 arquivos, manifesto 26604 arquivos, contexto WebGL2 e status Running.
- Captura do cliente renderizando a abertura 3D em C:\VelluM\integration-priston-preview.png.
- HTTPS publico temporario via Quick Tunnel (nao garantido; nao destinado a producao).

## Limites e proximas fases
- Ainda nao houve teste completo de login, combate, multiplayer, progresso nem importacao dos personagens.
- A camada VelluM atual e uma identidade visual/atalho para a versao anterior, NAO uma integracao funcional do painel de GM, loja ou banco de dados.
- Para integracao de gameplay: primeiro testar regras do C++/server, depois portar funcionalidades pontuais de Python/JS ao C++ com testes regressivos, compilacao Visual Studio 2022 e Emscripten 6.0.12.
- Revisar seguranca do admin mode/GM_CHEATS antes de divulgacao publica. O tunel temporario deve ser usado apenas para teste.
- Nao substituir app/servicos VelluM; sem migracao destrutiva e sem desligar Guacamole.
## Otimizacao de carregamento (12/11/2026)
- URL fixa do laboratorio: https://acesso.gbtechnology.com.br/priston-classic/
- Rota Nginx segregada: /priston-classic/ -> IIS local porta 8095; /priston/ e /guacamole/ mantidos.
- Backup do Nginx antes da alteracao: C:\\VelluM\\backups\\nginx-before-priston-classic-20261112-132659.conf
- Restauracao/instalacao reproduzivel: ops/install-priston-classic-route.ps1 (valida antes de reload, rollback em falha).
- Service Worker otimizado: ops/priston-classic-sw.js (streaming imediato para o jogo com gravacao paralela em cache, sem aguardar o arquivo inteiro; 10 downloads paralelos em lote).
- Prewarm: ops/priston-prewarm.js (comeca apos startup; ate ~52 MiB de selecao de personagem e Ricarten em background, respeita Data Saver e conexoes lentas).
- Installer atualizado: ops/integrate-priston-web.ps1 preserva arquivos inalterados por SHA256 para nao invalidar o ETag do pacote inicial.
- Teste do novo endereco: HTTP 200 para pagina, scripts, dados; WSS /ws.ashx?port=10007 conectado; legado e Guacamole 200.
- Teste arquivo 12.517.988 bytes: primeira requisicao iniciou transferencia apos ~175 ms; segunda respondeu do cache apos ~4 ms (medicao no ambiente de teste; pode variar).
- Durante warmup, 255 dos 389 arquivos selecionados foram observados no Cache Storage em uma execucao; nao significa pre-cache completo ou garantido.
- O restante dos ~3,7 GB continua sendo carregado sob demanda. Primeiro acesso a areas novas depende da internet, dispositivos e espaco de armazenamento do navegador.
- Nao foi comprovado ainda o fluxo completo de login, combate, progressao e inventario em jogo. Nao declarar integracao completa.
- Endereco publico ainda e de teste; revisar *GM_CHEATS e permissoes de admin antes de divulgar.
