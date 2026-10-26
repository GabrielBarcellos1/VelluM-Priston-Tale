# VelluM — análise de progressão, combate e auditoria da versão 25

O perfil foi calibrado para aproximadamente **300 horas de jogo ativo até o nível 120**, conforme solicitado: 12 horas até o 80, 40 horas acumuladas até o 100 e mais 260 horas entre 100 e 120. São metas de um modelo matemático, não medições de jogadores reais.

Foram avaliadas 1.320 combinações de classe/nível, 2.200 confrontos entre builds e as 200 definições de monstros e 847 confrontos PvP ordenados em sete níveis. O inventário por AST lista 948 funções e callbacks em 46 arquivos. Inventariar funções não significa que cada caminho de interface foi executado ou que existe cobertura comportamental de 100%.

## Tempo de evolução

| Faixa | Média calibrada da faixa | Tempo acumulado | Variação entre as 11 builds, na faixa |
|---|---:|---:|---:|
| 1–10 | 15 min | 0,3 h | 0,2–0,3 h |
| 10–20 | 30 min | 0,8 h | 0,4–0,6 h |
| 20–30 | 45 min | 1,5 h | 0,6–1,0 h |
| 30–40 | 1,0 h | 2,5 h | 0,7–1,3 h |
| 40–50 | 1,5 h | 4,0 h | 1,2–1,9 h |
| 50–60 | 2,0 h | 6,0 h | 1,6–2,6 h |
| 60–70 | 2,5 h | 8,5 h | 2,1–3,1 h |
| 70–80 | 3,5 h | 12,0 h | 2,9–4,1 h |
| 80–90 | 10,0 h | 22,0 h | 9,3–11,1 h |
| 90–100 | 18,0 h | 40,0 h | 16,0–22,1 h |
| 100–110 | 80,0 h | 120,0 h | 71,2–90,6 h |
| 110–120 | 180,0 h | 300,0 h | 170,5–191,8 h |

O começo ensina o jogo e libera habilidades rapidamente. Entre 80 e 100 há preparação de equipamentos e domínio da classe. Depois do 100, a evolução passa a ser um objetivo longo de end game. A versão mantém compatibilidade com personagens até 150; a avaliação detalhada solicitada termina no 120 e a curva posterior é uma extrapolação.

As durações consideram caça solo, equipamento comum +0 com atributos médios, sem premium pago, sem bônus de missão, quatro segundos de deslocamento por abate e 20% de tempo adicional para interrupções. Poções de MP/RES são usadas pelo simulador no máximo uma vez a cada oito segundos, com a recuperação mínima real do item. A compra e aquisição do conjunto completo de equipamentos não são simuladas. Jogadores com equipamento atrasado, erros de rotação ou mortes levam mais tempo; missões, experiência premium, controle e ataques em área podem reduzir o tempo. Não se deve anunciar 300 horas como uma garantia.

## Combate contra monstros

A curva antiga exigia aproximadamente 25 abates de monstros do mesmo nível por evolução em quase todas as etapas. Isso não criava um end game deliberado; o tempo variava principalmente pela resistência irregular dos monstros e pela diferença de eficiência entre classes.

Agora cada nível tem uma exigência explícita de EXP. Abater monstros muito abaixo do personagem recebe menos experiência, evitando que caçar alvos inofensivos seja o caminho mais eficiente. Objetos sem ataque não geram EXP nem drops comuns. Chefes recebem durabilidade própria e recompensa de EXP maior; o renascimento local de um chefe morto passa de 35 segundos para 15 minutos.

A vida dos monstros foi ajustada por nível, mantendo variações entre espécies. O dano das classes contra monstros recebeu multiplicadores próprios, interpolados entre níveis, preservando margem para funções de suporte e defesa. A defesa também reduz parte do dano que passa pelas verificações de acerto, bloqueio e absorção. Isso evita depender exclusivamente de esquiva ou de uma absorção fixa.

No nível 120, contra monstros normais próximos desse nível:

| Classe | Tempo para matar antes | Tempo para matar agora | Sobrevivência parada, sem cura | DPS de referência agora |
|---|---:|---:|---:|---:|
| Lutador | 93 s | 18,3 s | 29,8 s | 964 |
| Mecânico | 106 s | 21,2 s | 29,6 s | 832 |
| Arqueira | 85 s | 19,2 s | 32,6 s | 920 |
| Pike | 176 s | 18,3 s | 47,2 s | 964 |
| Atalanta | 121 s | 20,3 s | 59,5 s | 876 |
| Cavaleiro | 109 s | 20,5 s | 29,9 s | 858 |
| Mago | 201 s | 21,2 s | 26,8 s | 832 |
| Sacerdotisa | 126 s | 22,9 s | 38,5 s | 771 |
| Assassina | 70 s | 18,1 s | 31,6 s | 964 |
| Xamã | 197 s | 21,5 s | 43,3 s | 823 |
| Guerreira | 92 s | 19,0 s | 36,9 s | 929 |

O tempo para matar usa a mediana das espécies avaliadas. A sobrevivência é uma referência conservadora sem poções de HP, cura ativa, drenagem, consumo do escudo de mana, controle ou movimentação. Ela não é uma probabilidade de vencer. A simulação mantém buffs ativos e usa uma distribuição legal de atributos e pontos de habilidade, priorizando dano; uma build de tanque ou suporte pode ter resultados diferentes.

Foi corrigido também o escalonamento das magias avançadas com o poder efetivo do personagem: antes, algumas rotações de Mago e Xamã favoreciam o ataque básico gratuito. O bônus acrescentado a uma magia de múltiplos projéteis é distribuído entre seus acertos, para não multiplicar repetidamente o mesmo ganho da arma.

## PvP: avaliação disponível e limite atual

**O jogo ainda não implementa combate PvP compartilhado.** Os coeficientes de PvE não foram aplicados silenciosamente a jogadores. A proposta de regras de duelo permanece identificada como 'simulation-only', com 'enabled=false'.

Os 847 pares correspondem a 11 atacantes × 11 defensores nos níveis 20, 40, 60, 80, 100, 110 e 120. A proposta usa redução de dano, limite para dano concentrado e proteção defensiva. A tabela abaixo é uma comparação matemática sem cura ativa, poções, interrupções, movimentação, latência ou decisões humanas; não são taxas de vitória nem duelos jogados.

| Classe, nível 120 | Tempo médio para derrubar o adversário sem cura | Tempo médio até ser derrubada sem cura |
|---|---:|---:|
| Lutador | 45,0 s | 43,1 s |
| Mecânico | 51,1 s | 41,6 s |
| Arqueira | 42,8 s | 34,8 s |
| Pike | 57,0 s | 42,9 s |
| Atalanta | 54,9 s | 48,7 s |
| Cavaleiro | 51,7 s | 42,3 s |
| Mago | 31,2 s | 38,8 s |
| Sacerdotisa | 30,4 s | 48,2 s |
| Assassina | 42,6 s | 41,8 s |
| Xamã | 30,9 s | 54,2 s |
| Guerreira | 51,0 s | 52,0 s |

Esses números ajudam a localizar extremos, mas não bastam para aprovar o PvP. Para fazê-lo funcionar de verdade é necessário implementar alvos de jogador, dano e estado de vida validados no servidor, regras de consentimento/arena e testes de duas sessões. Depois disso, cura, controle, resistência, invocações e equipamentos precisam ser medidos em confrontos reais. Essa infraestrutura não foi substituída por uma simulação apresentada como recurso pronto.

## Economia e equipamentos

As regras ativas da hospedagem foram consultadas sem modificar o banco: ouro em 100% dos abates válidos, multiplicador 1, equipamentos em 5%, poções em 25% e exclusivos de boss em 1%, sem exceções por boss.

O custo anterior dos consumíveis podia tornar a caça deficitária antes do nível 80. Os preços locais das poções comuns foram reduzidos, e o catálogo servido ao cliente agora usa os mesmos preços locais. Por exemplo: Mana Mística passa de 1.000 para 200 de ouro; HP e RES Místicas passam de 300 para 100. Poções não podem ser revendidas por ouro, preservando essa regra existente.

A chance total de poções continua em 25%; quando há uma poção, a seleção passa a ser 45% HP, 35% MP e 20% RES. Há um intervalo de dois segundos por tipo de recurso para impedir consumo repetido imediato. O modelo usa um intervalo mais conservador de oito segundos para MP/RES.

Estimativa com venda de todos os equipamentos comuns obtidos:

| Nível de referência | Ouro bruto/h, incluindo venda estimada | Consumíveis/h | Saldo/h antes de reparos, treinamento e Aging |
|---|---:|---:|---:|
| 20 | 23.100 | 13.835 | 9.265 |
| 40 | 61.328 | 27.599 | 33.729 |
| 60 | 89.558 | 29.858 | 59.700 |
| 80 | 584.914 | 112.867 | 472.047 |
| 100 | 1.322.985 | 108.747 | 1.214.238 |
| 110 | 2.370.735 | 108.062 | 2.262.673 |
| 120 | 2.494.046 | 94.151 | 2.399.894 |

São valores esperados de uma distribuição aleatória. Eles não garantem um item específico nem consideram o tempo para visitar comerciantes, o custo total de reparar/evoluir o equipamento ou drops de boss. A referência de combate supõe um conjunto comum adequado ao nível; esse conjunto não foi concedido automaticamente aos personagens.

## Missões e fluxo de jogo

Foram auditadas as 305 definições de missões. Antes, apenas 82 tinham todos os tipos de objetivo reconhecidos pelo adaptador. Agora 251 têm contratos de progresso reconhecidos, incluindo objetivos de nível, aprendizado, manutenção de buffs, uso de skills, acertos, abates marcados e ações básicas do tutorial.

Compra, venda, equipamento, coleta do chão, distribuição de atributos e movimentação de itens no armazém passam a registrar os eventos correspondentes. Progresso de nível e skill já aprendida é derivado do estado real, sem obrigar o jogador a refazer a ação. Isso não é uma validação visual de todos os textos e NPCs dessas missões.

Continuam pendentes 54 definições com dependências como arena, chefes pessoais, coleta especial, grupo, amizade ou outros serviços ainda ausentes. A lista exata está no JSON da análise. Não foram marcadas como concluídas artificialmente. O agendamento completo e compartilhado de bosses também exige implementação própria; os dados de horário existentes não são prova de um sistema de encontros completo.

## Bugs corrigidos e auditoria de cenários

- Pilhas acima de 999 unidades podiam perder quantidade ao recarregar; restauração e operações agora usam o limite consistente de 9.999. Compras e fusões que excedem esse limite falham sem descontar ouro ou remover itens.
- Recuperação de bolsas agora é atômica: se o inventário não couber, as duas bolsas originais permanecem intactas. Dimensões inválidas não entram em buscas de espaço sem limite.
- Movimentação e ouro do armazém verificam proximidade do NPC. Missões recebidas/entregues por NPC também verificam distância.
- A troca para o segundo conjunto não ignora requisitos de equipamento. Reparar tudo inclui as duas bolsas e os dois conjuntos.
- O processamento assíncrono verifica novamente operações econômicas pendentes antes de executar uma ação já enfileirada.
- A validação de UID, quantidade e Aging no servidor agora inclui cinto e armazém, além de bolsas e equipamentos. Itens já evoluídos no armazém continuam podendo ser salvos; elevar Aging fora do serviço é rejeitado.
- Armas da Guerreira foram incluídas na elegibilidade de Aging do servidor.
- O atualizador ZIP trata skills e balanceamento como dependências do servidor, evitando atualizar dados que o processo ainda mantém em memória. Os testes verificam rejeição de caminhos inválidos, preservação de dados privados e reversão após falha de gravação.

Foram executados **59 testes Node e 18 testes Python**. Entre os cenários: inventário cheio, saldo insuficiente/inalterado, compra e venda, equipamento, poção repetida, recuperação de bolsas, 300 arranjos aleatórios de inventário, rollback de fabricação, skills em todos os níveis, reset, chat/suporte, login/logout, permissões, CSRF, acesso a arquivos privados, requisições repetidas, concorrência de transações, saves antigos e personagem excluído/recriado.

Os testes de servidor usam SQLite temporário e contas sintéticas, sem modificar contas reais. Na hospedagem foram verificados apenas agregados de integridade de UID: quatro personagens examinados e nenhuma duplicação entre os recipientes avaliados. A auditoria não comprova cobertura de todos os ramos ou ausência de bugs visuais.

## Preservação de progresso e operação

A atualização converte a experiência salva para a nova curva, preservando nível, atributos, pontos e a fração de progresso dentro do nível, com arredondamento de no máximo um ponto de EXP. A migração é idempotente. Skills, itens e ouro não são resetados.

O host continuará usando o Git para atualização automática e backup antes das mudanças de backend. Após a publicação, o jogador precisa usar “Salvar e atualizar” ou recarregar a página para receber o código novo. A mudança de backend pode exigir uma reinicialização curta do processo do jogo; não exige desligar a máquina.

## Limites que permanecem relevantes

O PvE ainda é simulado no cliente e os abates relatados não são verificados como combate autoritativo pelo servidor. As proteções de transação e inventário melhoraram a integridade, mas não constituem um sistema antitrapaça completo. Arenas, PvP real, grupos formais e todos os contratos especiais de missão continuam sendo etapas de implementação. Também é necessário testar o cliente 3D com jogadores reais, incluindo todas as animações, dispositivos lentos, movimentação e falhas de rede.

A análise completa, os pares de PvP, os confrontos com cada monstro e as hipóteses estão em 'Analise-Jogabilidade-VelluM.json'. O catálogo de funções está em 'Inventario-Funcoes-VelluM.json'. Os valores são um balanceamento próprio do VelluM; não foram apresentados como uma exportação exata do pweb.
