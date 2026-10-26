# FREEston Tale — revisão 22

## Pesquisa e correções verificáveis

Consulta pública sem login registrada em public-22.json. Bundle SHA-256 permanece 309822294b926934160b35d034a4b15e0985d539520a04dc2a684b06b9a155ac. Inspeção estática dos contratos do cliente e comparação com o adaptador local encontraram:

- Diálogo nativo chooseRestart envia respawn (client-readable.js 118724), antes sem tratamento. Retorno ao campo/cidade recupera recursos e espera confirmação do save antes da navegação. Recuperação completa é perfil local; penalidades privadas de morte não foram recuperadas.
- addStat envia n=10 (129615); agora respeita quantidade e saldo. undoStat desfaz a última operação da janela, impedindo remover atributos necessários ao equipamento; statCommit encerra esse histórico. Histórico não persiste entre sessões.
- IA iniciava corrida durante a preparação do ataque, incrementava seq e invalidava o golpe pendente. Agora conserva o ataque até terminar a animação; alcance continua conferido no instante do dano. Pacotes de corrida mantêm seq durante a mesma animação. Cidades, invisibilidade, voo e morte continuam bloqueando ataques.
- Venda e reparo seguem as fórmulas públicas xOt/Bot (14451–14487) e Zy (134687). Venda depende da durabilidade, quantidade e marca foreignLoot. Reparo usa preço e fração danificada. Itens de missão, poções, GF101, noGold, premiums gerenciados e armas de missão não emprestadas são rejeitados. Compra/venda/reparo exigem vendedor próximo.
- Missões filtram jobs, race, minLevel, maxLevel e requisitos; atualização não fica limitada às primeiras 30. Objetivos de caça respeitam mapa e monstro; tutorial de poções exige uso pelo cinto. Recompensas respeitam expCapLevel dentro da curva de EXP local, evitando recompensa de tutorial escalada ao nível 149.
- Spark e Impulsion usam faixas próprias de dano elétrico; Spark soma nível/5. Flecha da Fúria usa dano base + nível/divisor. Fonte clássica Svr_Damge.cpp commit 299c615ed9a13f9ac394c6d0ac32f19e126b308d, linhas 4702–4736 e 5110–5116. Não são valores privados recuperados do Zephira.

## Validação

113 testes Node e 94 Python passaram. ESLint passou. Teste Chromium scripts/freeston-gameplay-smoke.mjs: atribuição em lote, desfazer, confirmar e renascer pelo método real do diálogo nativo, com save e recarga. O ZIP extraído também passou no fluxo de reparo/venda (375 de reparo, 1600 de venda para o equipamento de teste), renascimento e scripts/freeston-primary-smoke.mjs: Golpe da Vingança nível 10, recarga extra zero, animação 1,714 s e dois golpes confirmados contra Valento. Testes unitários incluem preços em diferentes durabilidades, restrições, objetivos por mapa, teto de EXP, fórmulas de skills e preparação do golpe dos monstros.

## Pendências reais

Esta revisão não conclui equivalência integral. Combate PvE continua simulado por navegador; presença/chat são compartilhados. Economia, combate compartilhado e anticheat não estão prontos para lançamento público. Mantido publicLaunchReady:false.

Objetivos de coleta especial, arenas, bosses pessoais, mecânicas e treinamentos de skills ainda precisam de contratos/regras próprios. Eles não são completados por eventos genéricos. Buyback, organização completa do baú, grupos, PvP e serviços avançados de NPC continuam pendentes. Taxas privadas de EXP/drop/skills, regras de classes novas e regras completas de morte não estão no cliente público; não foram inventadas como se fossem oficiais. Os snapshots recentes de NPCs/missões não foram substituídos sem migração, pois identificadores podem alterar saves existentes.
