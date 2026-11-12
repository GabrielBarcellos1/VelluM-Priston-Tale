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