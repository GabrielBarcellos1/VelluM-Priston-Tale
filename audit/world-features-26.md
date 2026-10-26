# VelluM — quests, NPCs e Kit Up (versão 26)

## Promoções de classe

O catálogo atual tem quatro tiers, com promoções nos níveis 20, 40 e 60, nas 11 classes. O Mestre Verkan atende os Tempskrons e Raymon atende os Morions. É preciso aprender pelo menos um nível de cada habilidade dos tiers anteriores. O nível sozinho não libera as habilidades dos tiers seguintes.

- Nível 20: partes dos Wolverines para Tempskrons; ramo de Mel Real ou Óleo Místico, conversas e mistura para Morions.
- Nível 40: três Vamps, arma emprestada equipada e três etapas ordenadas de maturação, diferentes para combate corpo a corpo, distância e magia. A promoção concede +15 HP; arma e anel de recompensa duram cinco dias.
- Nível 60: duas caçadas de 50 monstros, cada uma com 70 minutos; Amuleto Real; duelo pessoal contra o Mestre; entrega ao Mestre.

Cada promoção muda a insígnia geométrica acima da cabeça e libera o próximo tier. A insígnia é uma adaptação visual local; não reproduz exatamente os modelos do servidor original. Não foi inventado um quinto tier sem habilidades correspondentes.

Fontes oficiais consultadas: [guia das quests](https://wiki.priston.com.br/index.php/Guia_das_Quests), [primeiro desafio](https://wiki.priston.com.br/index.php/Quest_do_Level_20_-_1%C2%B0_Desafio_de_Classe), [segundo desafio](https://wiki.priston.com.br/index.php/Quest_do_Level_40_-_2%C2%B0_Desafio_de_Classe), [terceiro desafio](https://wiki.priston.com.br/index.php/Quest_do_Level_60_-_3%C2%B0_Desafio_de_Classe), [guia de promoção internacional](https://pt1.subagames.com/guide.aspx/changejob).

Adaptações explícitas: os alvos de quests aceitas ficam disponíveis sem depender de um relógio noturno compartilhado. O duelo permite nova tentativa sem recolher outro amuleto. As coletas exclusivas são contadores persistentes da missão. Valores privados não disponíveis do combate contra o Mestre usam o balanceamento VelluM.

## Quests comuns e NPCs

As 273 definições que não são promoções passam a ser recebidas automaticamente quando seus requisitos são cumpridos. Não há NPC de aceitação ou entrega. O aviso permite receber a recompensa; o Guia (Q) também permite concluir. Objetivos que pedem uma conversa ou ação continuam exigindo essa ação. Não há concessão automática de recompensa.

Coletas de poções exigem poções comuns reais, consumidas na conclusão. Arenas pessoais exigem as ondas e o chefe; possuem prazo de cinco minutos. Chefes pessoais possuem dez minutos. Esses encontros não concedem XP ou drops normais.

Todos os registros de NPCs dos mapas são preservados e podem ser abordados. NPCs apenas de ambientação recebem diálogo. Serviços antes sem execução local agora incluem caridade, distribuidor, ranking, clãs, fundição, fabricação e Bellatra. Os demais serviços existentes continuam disponíveis.

Os serviços novos são implementações VelluM: caridade dá 20 poções de HP, MP e RES a cada 24 horas; fundição usa três sheltoms iguais; fabricação usa equipamento comum e três sheltoms, com preço mostrado antes da ação. Clãs possuem criação, entrada e saída; Bellatra é um desafio pessoal de 12 inimigos em dez minutos, com recompensa única por tentativa e intervalo de dez minutos. Não equivale à competição clássica completa entre clãs.

Há objetivos sociais e mecânicas herdadas no catálogo que dependem dos respectivos sistemas. Esta versão não implementa PvP competitivo, troca entre jogadores, loja pessoal ou sistema de amigos completo, e não marca esses objetivos como concluídos por ações sem relação.

## Loja e Kit Up

Fênix de sete dias adicionada por 4.000 coins. Forças Mirage físicas e mágicas também têm ofertas individuais de 500 coins.

**Kit Up de sete dias: 24.000 coins**, frente a 32.000 coins pelos componentes separados (25% de desconto).

| Componente | Efeito/duração |
|---|---|
| XP Up superior | +100% de XP, 168 horas |
| Drena | Recuperação de mana, 168 horas |
| Presa superior | Recuperação de HP, 168 horas |
| Redutora de RES | Redução de 30%, 168 horas |
| Redutora de mana | Redução de 30%, 168 horas |
| Fênix | Visual e chance adicional de drop comum, 168 horas |
| Olho Mágico | Chance adicional de drop, 168 horas |
| Força Mirage | Dez unidades; versão mágica para Mago, Sacerdotisa e Xamã |

Os sete efeitos começam juntos ao usar o kit e o prazo continua offline. Reativação prolonga a duração; um efeito inferior não substitui um superior ativo. As dez Forças são consumíveis: mantêm a duração e os requisitos de nível próprios do jogo. Uma Força já ativa impede consumir outra e desperdiçar a unidade.

Preços em moeda interna de teste; nenhum pagamento real foi criado. Produtos e efeitos pertencem à conta, conforme o modelo já existente da loja.

## Validação

106 testes automatizados locais: 81 JavaScript e 25 Python. Incluem as três promoções em cada uma das 11 classes, bloqueio de tier, maturação com arma correta, prazo persistente e nova tentativa, notificação sem entrega automática, ondas/chefe, recuperação de arma, compras repetidas, sete efeitos de 604.800 segundos, forças por classe, rollback, bolsas cheias, caridade, fundição e Bellatra com recompensa única.

Testes de compra e contas usam SQLite descartável e personagens sintéticos. A validação automatizada não substitui testar as animações, os diálogos e o posicionamento de cada NPC em jogo. A versão anterior já tinha testes de combate, progressão, inventário e serviços; todos continuam incluídos.
