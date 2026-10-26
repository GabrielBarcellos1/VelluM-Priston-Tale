# FREEston Tale 12 — comparação com o cliente público

Auditoria em 2026-10-23T10:21:43.143Z. Cliente público SHA-256: `309822294b926934160b35d034a4b15e0985d539520a04dc2a684b06b9a155ac`.

**Resultado: não é idêntico ao jogo oficial e não está pronto para lançamento como MMO.** A comparação cobre o cliente público capturado, inventário de dados e fluxos locais. As consultas GET atuais ao site/wiki/mapas responderam HTTP 403 neste ambiente; não houve acesso autenticado ao jogo original nem ao backend privado. O registro está em [public-probe-12.json](public-probe-12.json). Não se inferiram regras privadas a partir da presença de um botão.

## Inventário e comparação de ponta a ponta

11 classes, 176 referências de skills, 200 monstros, 137 NPCs, 305 missões, 48 campos, 38 estágios de spawn e 28 entradas de agenda de boss são contagens de catálogo. Não significam que todos esses conteúdos foram testados em jogo. O catálogo premium público possui 18 famílias; a loja local oferece 9 famílias/36 opções. Códigos e durações são comparados automaticamente com [premium-public-client.json](premium-public-client.json).

| Área | Situação | Evidência e diferença |
|---|---|---|
| Conta e login | Local | Autenticação própria; senhas PBKDF2; sessões e papéis no SQLite; nenhuma autenticação enviada ao oficial. |
| Marca | Local | FREEston Tale no login, painel, barra e rótulos visíveis. Avisos/licenças do código e recursos públicos permanecem preservados. |
| Classes e seleção | Parcial | 11 classes e associação de 16 referências visuais por classe do cliente público. Personagens locais separados por conta/classe; não equivalência de progressão privada. |
| Arte das skills | Diferente | 176 ilustrações FREEston sem letras, renderizadas localmente. As 176 artes oficiais individuais não foram localizadas; metadados locais não contêm seus caminhos. |
| Aprendizado e combate por skills | Parcial | Livro, requisitos, pontos, mestre, seleção, MP, resistência e recarga funcionam. IDs, fórmulas, balanceamento, restrições por arma, mastery e quests de rank não foram recuperados integralmente. |
| Modelos, mapas e controles | Parcial | Motor WebGL e recursos públicos preservados. Catálogo tem 48 campos/46 descrições de mapas; não foram percorridos todos em navegador. |
| Monstros | Local | 200 definições públicas; perseguição, retaliação, alcance, ataque, retorno e morte locais. Cidade segura e modos GM. Movimento simples sobre terreno; não há pathfinding de servidor ou IA de boss recuperada. |
| Dano, morte e renascimento | Parcial | HP e animação do cliente recebem ataques; morte e retorno à cidade. Balanceamento e penalidades privadas não equivalentes. |
| Drops e bosses | Parcial | Spawns e regras locais; loot coletável. Tabelas oficiais de probabilidade, IA de cada boss e agendas completas não foram validadas. |
| Itens, equipamentos, loja normal | Local | Inventário, compra/venda, classe, atributos, espaço, duas mãos, reparo e poções. Fórmulas de itens/mix/aging ainda parciais. |
| Coins | Local | Saldo por conta protegido no servidor, ledger, transações SQLite e requisições idempotentes; concessão somente admin, para conta existente. Sem compra com dinheiro real. |
| Premiums | Parcial | 36 opções de 9 famílias disponíveis. Nomes, códigos, durações e arte premium públicos; preços/efeitos locais. Estoque e duração offline no servidor; compra não ativa automaticamente. 9 famílias públicas restantes, pets e cosméticos completos não foram implementados. |
| Missões | Parcial | 305 entradas de catálogo. Interpretador local de objetivos/recompensas; não comprova conclusão de todas as missões. |
| Armazém e viagem | Local | Três páginas, ouro e deslocamentos locais. Regras completas de asas e custos privados não recuperados. |
| GM e ajuda | Local | Comandos por chat, permissão de conta no servidor, ajuda com fechamento completo, invocar/criar/equipar, coins e modos GM. |
| Multiplayer e economia de combate | Ausente | Cada navegador simula seu mundo. Combate, drops e saves ainda são controlados pelo cliente; coins são protegidos, mas isso não torna o restante da economia autoritativo. |
| Social e serviços especiais | Ausente/parcial | Trade, clãs, correio, leilão, Bellatra, crafting, mix/aging por NPC e eventos dependem de implementação adicional. |
| Link externo | Operador | INICIAR_INTERNET.bat cria túnel; Link do jogo/painel copia o endereço. URL temporária exige PC/túnel ligados; domínio fixo depende da configuração do operador. Nenhuma URL pública deste ambiente foi validada. |
| Atualização | Parcial | ZIP compatível atualiza interface preservando dados/processo/túnel; jogador salva e recarrega. Revisão 12 altera Python: instalação completa e um reinício são obrigatórios. |
| Celular e lançamento | Parcial | Controles por toque e layout adaptável, verificados em emulação. Sem teste de carga, benchmark em aparelhos físicos, serviço 24h ou condição de lançamento MMO. |

## Serviços de NPC

| Serviço | NPCs | Situação |
|---|---|---|
| aging | 1 | Pendente: serviço privado não reconstruído |
| bellatra | 3 | Pendente: serviço privado não reconstruído |
| charity | 2 | Pendente: serviço privado não reconstruído |
| clan | 2 | Pendente: serviço privado não reconstruído |
| event | 2 | Pendente: serviço privado não reconstruído |
| force | 3 | Pendente: serviço privado não reconstruído |
| itemshop | 2 | Loja FREEston com coins por conta, 36 opções e ativação persistente; não é a loja oficial completa |
| levelRanking | 2 | Pendente: serviço privado não reconstruído |
| manufacture | 1 | Pendente: serviço privado não reconstruído |
| mix | 1 | Pendente: serviço privado não reconstruído |
| mixreset | 2 | Pendente: serviço privado não reconstruído |
| post | 2 | Pendente: serviço privado não reconstruído |
| quest | 6 | Parcial: interpretador de missões local |
| shop | 25 | Implementado com estoque público e economia local |
| skill | 2 | Parcial: catálogo por classe e fórmulas locais |
| smelting | 1 | Pendente: serviço privado não reconstruído |
| teleport | 7 | Implementado com custo local |
| warehouse | 7 | Implementado com três páginas locais |
| wing | 1 | Teleporte local; regras completas de asas pendentes |

## Reprodução das verificações

- `node scripts/audit-freeston.mjs CAMINHO_DO_CLIENTE` verifica hash, inventário premium, nomes, códigos e durações; não comprova comportamento privado.
- `python -m unittest discover -s original-local/tests -q`: autenticação/HTTP, permissões, SQLite, expiração, compra/ativação, idempotência, concorrência sem saldo negativo, updater e SVGs sem letras.
- `node --test tests/*.test.mjs`: classes, aprendizagem, custos, equipamento, perseguição, cooldown, leash e restrições de cidade/GM.
- `scripts/freeston-premium-combat-smoke.mjs`: Chromium real, concessão por chat a outro ID, negação ao player, imagens premium, compra/ativação/saldo após recarga, perseguição, HP recebido no HUD e invencibilidade.
- `scripts/freeston-skills-smoke.mjs`: livro e imagens nas 11 classes, aprendizado, seleção e restauração. `scripts/mobile-classes-smoke.mjs`: emulação de toque.

Os testes usam bancos separados; `PWEB_TEST_PASSWORD` é fornecida pelo ambiente e não aparece no script. Consultas e testes de túnel não produzem uma URL pública fictícia.

## O que impede afirmar equivalência

Faltam as artes oficiais individuais das skills, tabelas privadas de combate/skills/drops, progressão completa, IA específica de bosses, serviços especiais e autoridade de um mundo multiplayer compartilhado. Os testes locais não removem essas diferenças. Um projeto de equivalência completa exige obter esses dados legitimamente e implementar/testar tais sistemas; trocar somente a marca não resolve essas lacunas.
