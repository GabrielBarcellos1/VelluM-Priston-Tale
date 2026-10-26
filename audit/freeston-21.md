# FREEston Tale — auditoria da revisão 21

## Entrada e personagens

Nova tela responsiva da marca FREEston, com login, seleção e ficha (nome/classe/nível/status), criação e exclusão. Mantém a arquitetura existente: no máximo um personagem de cada uma das 11 classes por conta. Não redefine os personagens antigos. Exclusão exige nome exato, senha e personagem fora do mundo; protege tentativas repetidas e registra operação sem senha. Coins, estoque de premiums e skins pertencem à conta e permanecem. Inventário, progresso e visual equipado daquele personagem são removidos; drops não recolhidos expiram.

O botão Personagens confirma o save no servidor e deixa a presença online antes de voltar. Operações econômicas pendentes impedem a saída até serem confirmadas. A troca de classe não cria mais personagens implicitamente. `/painel` mantém autenticação e permissões próprias.

Cada criação tem geração própria no SQLite. As requisições de save, presença, Aging, loot e skins enviam essa geração e conferem o personagem autenticado, inclusive sob o bloqueio de escrita e antes de retornar resultados repetidos. Aba antiga não pode escrever no novo personagem de mesma classe. Cache e atalhos são separados por geração. A migração prioriza saves confirmados no servidor; salve a instalação anterior antes de atualizar. O seed Teio não reaparece depois de excluído.

## Pesquisa pública e correções de jogabilidade

A consulta atual conseguiu acessar o bundle fixado e os endpoints públicos documentados usando requisição normal do navegador. O SHA-256 do JavaScript continua `309822294b926934160b35d034a4b15e0985d539520a04dc2a684b06b9a155ac`. As 200 definições públicas de monstros continuam iguais às já importadas; diferenças recentes de NPCs/quests não foram aplicadas às cegas. Registro: [public-probe-21.json](public-probe-21.json).

- **Orientação:** o protocolo recebe ângulo inteiro em 4096 unidades, não radianos. Corrigida perseguição, ataque e mudança de direção sem reiniciar o golpe. NPCs próximos usam a orientação de cena esperada pelo renderizador e viram para o jogador.
- **Skills:** os parâmetros próprios da habilidade chegam ao cálculo de dano: intervalos de magia, dano adicional, taxa de ataque e crítico. Magias com tabelas recuperadas usam dano de tabela, inteligência, nível e arma conforme fonte clássica identificada, substituindo o multiplicador físico genérico. Número de alvos/golpes usa tabelas confirmadas; efeitos visuais extras não são multiplicadores de dano. [Detalhes e limites](skill-rules-21.md).
- **Golpe da Vingança:** `SKILL_AVANGING_CRASH`, Lutador, nível 10 sem recarga adicional no perfil FREEston solicitado. A animação continua limitando a repetição. Nível 9 e habilidades como Meteoro mantêm suas recargas. Não é apresentado como tabela privada recuperada do Zephira.
- **Presa/Drena:** fórmula `TEt` do cliente público usa Força para HP e Inteligência para MP, com divisores distintos para Presa comum, superior e Drena. Recuperação usa dano efetivo, não cadáveres/misses, e as barras recebem atualização imediata. Pets/reflexão não geram drain do personagem nesta implementação. A agregação privada em ataques de área/múltiplos golpes não foi recuperada; a aplicação local é por alvo atingido.
- **MP/RES down:** redução pública preservada com custo inteiro; o painel nativo de skills é atualizado ao mudar os premiums.
- **Força de Awell:** aumenta 1000 de peso máximo, corrigindo o bônus incorreto de HP. Terceiro Olho passa do valor local 20 para o valor público 50 da chance de rolagem extra comum, sem ampliar exclusivos de boss. A migração preserva coins, estoques e personalizações administrativas.
- **Modo de equipamento GM:** mostra apenas premiums implementados e aplica seus efeitos; antes os ícones eram publicados sem que as funções de combate os consultassem. Não duplica ícones de premiums comprados. O perfil é exclusivo da Staff, não uma concessão de coins/produtos a jogadores.
- **Itens:** crítico adicional de Aging de martelos/cajados/fantasmas/adagas/punhos segue `VSt/Aj`, sem duplicar as famílias já alteradas por `GSt`. Restauração mantém atributos do item salvo e não os rebaixa ao mínimo do catálogo. Atributos de base ficam separados para remover Mix/Aging corretamente.

Evidência detalhada de premiums: [premium-rules-21.json](premium-rules-21.json).

## Limites reais

Não há tabela completa privada de balanceamento no JavaScript público. Parte dos custos, dano, cooldowns e decisões de combate chega em mensagens do servidor autenticado. A inspeção do cliente não dá acesso a esse código. As fórmulas clássicas são identificadas como tais; classes novas e valores sem tabela continuam com perfil próprio, não uma cópia validada do Zephira.

Presença/chat continuam compartilhados, mas o combate PvE é simulado individualmente no navegador. **PvP compartilhado, incluindo drenar mana de outro jogador real, não está implementado.** A recuperação foi verificada nos ataques PvE desta versão; não deve ser anunciada como combate entre jogadores pronto. O perfil continua `publicLaunchReady:false`, adequado a testes fechados, sem afirmar economia/anticheat ou lançamento público concluídos.

## Validação

**201 testes automatizados passaram: 107 Node e 94 Python.** ESLint dos módulos de jogo e scripts alterados passou. Os testes no Chromium com o cliente nativo cobrem: ciclo de criação/seleção/entrada/exclusão/recriação, gerações antigas, isolamento entre contas, migração Teio, compras/premiums, Aging, drops, inventário, recargas e orientação. Scripts reproduzíveis: `freeston-characters-smoke`, `freeston-primary-smoke`, `freeston-premium-smoke`, `freeston-facing-smoke`, `freeston-controls-smoke`, `freeston-inventory-smoke` e `freeston-cooldowns-smoke`, em `scripts/`. As compras e comandos usam bancos isolados de teste. O pacote exclui bancos de contas, senhas de testes e caches. Instale mantendo um backup de `.local-data`, reinicie o Python e recarregue as abas.
