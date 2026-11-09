# Progresso Codex — VelluM

## Conferência pelo Desktop Commander — 09/11/2026

- Acesso em leitura à pasta de instalação indicada pelo proprietário no Windows conectado: 74 arquivos, 385.330.407 bytes; executável com versão de produto 1.2.0.0.
- SHA-256 do `resources/app.asar` instalado é idêntico ao anexo analisado com REA. Não há outro pacote de recursos do jogo na listagem; `resources` contém ASAR e elevador do instalador.
- Não foram executados o jogo/instalador, alterados arquivos ou inspecionados perfil/cookies. Resultado não comprova a execução do VelluM dentro do launcher. Detalhes acrescentados a `REA_DESKTOP.md`.

## Análise do ASAR enviado — 09/11/2026

- Arquivo recebido e inspecionado com REA, sem executar Electron. Cinco arquivos, três JS, hashes de integridade conferidos. Evidência `ev_a445d1289966a86c8b2a08f211fbae7e18e3052dcae65c8989512d47520a4583`.
- Identificado launcher 1.2.0; jogo e recursos carregam do site. Não há novas tabelas de drop, modelos ou animações neste pacote.
- Confirmados ponte desktop versão 3, guarda de fechamento, faixa AFK e endereço configurável por `PWEB_URL`. Registrado roteiro para uso privado com o VelluM, sem modificar/distribuir o aplicativo.
- Arquivos alterados neste conjunto: quatro documentos obrigatórios, `docs/REA_DESKTOP.md` e inventário sanitizado `docs/evidencias/desktop-asar.json`.
- Validação deste conjunto: REA/parse estático e integridade do ASAR; conferência JSON e diff. Não houve teste desktop, mudança de jogabilidade, nova execução da suíte ou publicação do aplicativo. Resultados anteriores de testes permanecem históricos, não uma validação deste launcher.

## Missão ativa

Reconstrução fiel do Priston Tale clássico no repositório VelluM, com REA e preservação das personalizações. Branch: `main`. Base auditada: `ec7e2e01e0773ab30b223b915a4328757b8efe28`.

## Ciclo 0 — auditoria inicial

- Confirmados acesso de escrita e arquitetura no repositório correto.
- Lidos histórico, execução Python/SQLite, supervisor e auditorias existentes.
- Confirmados jobs 9/10/11 desativados e ausência deliberada de Tier 5; promoção simplificada e auto-progressão de mapas preservadas.
- Executado baseline Node: 264 testes, 263 aprovados, 1 falha de expectativa obsoleta de menu de comerciante.
- Executado baseline Python: 182 testes, 1 falha (17 skins versus 14 publicadas) e 1 erro (kits de classes desativadas).
- Nenhuma alteração de jogabilidade, banco, seed, host ou produção neste ciclo.
- Criados os quatro documentos solicitados. A matriz cobre os sistemas relevantes e separa implementação de validação contra referência.

## Continuidade imediata

1. Finalizar investigação do relógio de animação do cliente fixado com REA.
2. Reproduzir e corrigir a validação de tempos antes de debitar MP/RES nos dois motores.
3. Comparar timeouts de impacto com o relógio nativo e corrigir cancelamentos sem modificar tabelas numéricas não verificadas.
4. Validar restauração de cooldown e estados por personagem.
5. Atualizar os testes obsoletos segundo as decisões reais do histórico, sem reativar sistemas removidos.

## Execução e publicação

Checks locais: `node --test tests/*.test.mjs`, `python -m unittest discover -s tests -p 'test_*.py'`, sintaxe Python/ESM e JSON. Teste visual exige executar `iniciar.py` em dados/cache de teste e navegador compatível; não usar contas de produção.

O supervisor documentado busca `main` periodicamente. Alterações só em ESM não exigem reiniciar o Python, mas abas abertas precisam recarregar. Não executar supervisor/túnel no ambiente de desenvolvimento. Não migrar para a hospedagem do protótipo anterior.

## Limites registrados

O ciclo 0 não incluiu navegador; a cobertura real posterior está registrada por ciclo abaixo. Testes locais não comprovam fidelidade visual ou tabelas privadas. Nenhuma credencial ou dado real deve ser acrescentado ao repositório público.

## Ciclo 1 — execução atômica e restauração de cooldown

- Regressões novas falharam antes da correção: temporização inválida consumia recursos; cooldown salvo com infinito era aceito e o tempo restante podia exceder o total original.
- `skill-action-timing.mjs`: recarga deve ser finita e não negativa; helper de restauração limita o tempo restante ao total salvo e recusa estado inválido.
- `skill-runtime.mjs` e `skill-system.mjs`: validação dos tempos antecede débito de MP/RES; ambos restauram cooldown com o mesmo limite. Os números configurados de cooldown/dano não foram alterados.
- Testes antigos de loja e política de classes foram corrigidos conforme as decisões do histórico. Nenhuma classe/skin foi reativada e o menu removido não voltou.
- Resultado: **267/267 testes Node** e **182/182 testes Python** passaram. Fixtures Python são descartáveis.
- O servidor foi iniciado em localhost:4188, com SQLite/cache separados e conta de teste aleatória. `/api/local/build` respondeu. Navegador e combate visual ainda pendentes.
- O endereço público documentado retornou HTTP 530 nesta tentativa de leitura; não houve intervenção na hospedagem.

## Próximo ciclo em execução

REA analisou estaticamente o cliente fixado e confirmou `eA.tick`: avanço de `time` em 1/70 s, e `onSkillFx`: travas/efeitos relativos ao tempo do jogo. Evidência `ev_eb98c6eef291ac837c0be4c71f7c0396ea97af271be55e475d2dcb682b3bfcca`. Investigar e testar o agendamento dos impactos nesse relógio, incluindo pausa, morte, troca de mapa/contexto e recarga persistida.

## Ciclo 2 — impactos sincronizados com a animação

- `skill-action-timing.mjs`: agenda de impactos baseada em `game.time`, instalada no tick nativo da sessão jogável. A prévia da seleção fica isolada. Cancelamento por morte, troca de personagem/mapa, substituição do jogo e recuo do relógio; erros de callback são registrados sem interromper os próximos ticks.
- `session.mjs`: substitui o timeout dos impactos pela agenda; limpa ações ao preparar viagem. Não altera números de dano, cooldown, classes ou progressão.
- Os dois motores separam trava da ação (relógio nativo) e recarga persistida (relógio existente). `cancelActions` preserva habilidades aprendidas, buffs e cooldowns. Referências antigas de monstros deixam de receber impactos/DOT depois de substituídas.
- Regressões novas reproduziram a trava liberada pelo relógio errado antes da correção. Total Node: **276/276 aprovados**; Python: **182/182 aprovados**. Sintaxe ESM, AST Python com leitura UTF-8 BOM e JSON conferidos.
- Teste Chromium real, conta e SQLite descartáveis, localhost:4188: login; criação do Cavaleiro AuditoriaCodex; seleção/entrada em Pillai; caminhada por mouse; aproximação do Mestre Raymon; aprendizado da habilidade 601; salvamento/recarregamento com habilidade preservada; progressão personalizada ao mapa 17; uso da habilidade no Cão Abelha.
- Observação do impacto: tempo do jogo 26,6857, HP 400; após 3 s reais, tempo 27,0286 e HP ainda 400; posteriormente tempo 30,5714 e HP 383. O renderizador de software avança lentamente. Isso verifica a integração local, não o valor oficial do dano.
- Sem `pageerror` ou conexão ao servidor original. Algumas requisições foram abortadas durante recarregamentos; não equivale a ausência global de falhas de rede. Capturas locais: `roster-before-clock.png`, `pillai-walking.png`, `skill-impact-native-clock.png` no diretório de pesquisa externo ao repositório.
- Observado durante aproximação de NPC: sondagem nativa `gmNpcInfo` cai no aviso genérico e polui o chat. Próxima correção independente: suprimir o aviso de sondagem sem simular resposta ou ativar ferramenta GM inexistente.
- Ainda pendentes: interação de equipamento, outro personagem, logout/login, toque mobile e comparação visual sistemática com referência.

## Ciclo 3 — sondagem de NPC sem avisos repetidos

- Defeito reproduzido no navegador durante aproximação de NPC: `gmNpcInfo`, consulta passiva do HUD Staff, chegava ao fallback de serviços ausentes e notificava o jogador repetidamente.
- Regressão do handler real confirmou 15 avisos antes da alteração. `session.mjs` agora encerra somente essa consulta sem notificação, resposta fictícia ou gravação de estado inalterado. Histórico diagnóstico de pacotes preservado; ações desconhecidas do usuário continuam notificadas.
- Resultado: **278/278 testes Node** aprovados; sintaxe de `session.mjs` e diff conferidos. Python permanece no resultado do ciclo 2 (182 aprovados; sem alteração Python neste ciclo).
- Chromium após recarregar: 15 consultas recebidas, nenhum aviso de serviço ausente, habilidade 601 nível 1 preservada. Isso não implementa um inspetor GM; seus metadados continuam indisponíveis.

- Equipamento testado via adaptador nativo: bolsa A estava sem espaço para a arma (aviso correto). Após `swapBag`, retirar e recolocar a Dagger WS201 funcionou, mantendo UID 101. Não foi um arraste de UI; a validação visual detalhada do equipamento continua pendente.
- Segundo personagem Mago nível 1 criado pela interface da seleção; entrada e alternância ainda em teste.

## Verificação de persistência após o ciclo 3

- Mago AuditoriaMago entrou em Pillai, nível 1, arma WM101 e nenhuma skill aprendida. Cavaleiro manteve estado separado.
- Retorno ao Cavaleiro pela seleção: nível 30, Dagger WS201 UID 101, bolsa 1 e Sword Blast nível 1 preservados.
- Logout pela interface exibiu o login. Novo login com a mesma conta mostrou os dois personagens; entrada no Cavaleiro preservou nível 30, ouro 99.900, UID da arma, bolsa e habilidade.
- Zero `pageerror` e nenhuma conexão ao servidor original durante o teste. Credenciais, cookies e SQLite não integram estes documentos/commits.
- O roteiro precisou corrigir o nome acessível da seta e aguardar a seleção estabilizar antes de entrar; falhas de espera do driver não foram atribuídas ao jogo.
- Evidência resumida: `docs/evidencias/persistencia-local.json`. Arraste de equipamento, toque mobile, reconexão por perda de rede e comparação visual de todos os personagens continuam pendentes.

## Investigação iniciada — passagem entre florestas

- REA executado novamente no artefato original fixado; 14 trechos focados, evidência `ev_67dfd39d686a70ccec4b572af143ea82a133aeb596d34085055920adefa17340`.
- Confirmada diferença: estabilizador nativo (seis observações ou 96 unidades, verificações a cada 0,5 s do jogo) versus retorno bloqueado em raio local de 2.200 unidades após reposicionamento no spawn.
- Nenhuma alteração de geometria/viagem nesta investigação. Falta reproduzir o comportamento da fronteira, coletar `currentStage`, posição/altura e candidatos antes/depois de atravessar e avaliar recuperação. Detalhes em `REA_AUDITORIA.md` e resumo em `docs/evidencias/transicao-mapas.json`.
