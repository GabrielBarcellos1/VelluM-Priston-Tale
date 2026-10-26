# VelluM — economia por mapa e eventos (versão 28)

## Drops por mapa

Em **Painel → Drops → Economia por mapa**, escolha o mapa e marque “Usar regras próprias”. O sorteio é executado pelo backend quando o monstro comum é derrotado, com proteção contra repetição da mesma requisição.

- Ouro: chance por monstro, quantidade mínima e máxima, inclusive os limites.
- Equipamentos: grupos independentes por faixa de nível ou lista exata de códigos, cada um com sua chance. Um sucesso no grupo gera um item aleatório entre os elegíveis.
- Conjunto **80D clássico**: seleção explícita por códigos, separada dos demais equipamentos de nível 80. Inclui os 14 itens correspondentes disponíveis no catálogo atual: armas das classes clássicas e defesas. Por exemplo, Armadura Wyvern entra; Armadura do Dragão, categoria 80E, fica fora. O catálogo atual não contém o Orbital Cosmos; ele não foi inventado como um item com modelo inexistente.
- Poções: chance própria por monstro.
- Sheltoms: chance, primeira e última Sheltom permitidas, selecionadas pelo nome.
- Itens específicos: código, chance e quantidade, com restrições para evitar pilhas indevidas de equipamentos.
- Suspensão de drops e ouro dos monstros comuns; regras dos Bosses continuam na roleta própria.
- Cópia das regras para vários mapas, com verificação de versão e aplicação atômica.
- Estimativa de ouro por 1.000 abates, considerando eventos ativos, e consulta aos itens elegíveis de cada grupo.

O botão **“Preparar exemplo: Ilha Perdida, 80D a 20% e ouro até 100 a 30%”** preenche o editor. É preciso clicar em Salvar para aplicar. O exemplo usa ouro de 1 a 100 com chance de 30%, e uma tentativa de equipamento 80D com chance de 20% por monstro.

Nesse exemplo, antes de premiums e eventos, a média esperada é de 300 sorteios de ouro, **15.150 de ouro** e **200 equipamentos 80D por 1.000 monstros**. São médias estatísticas; cada sessão pode variar. Grupos diferentes são independentes, e os premiums de drop podem repetir tentativas nos grupos permitidos do mapa.

Nenhuma regra personalizada foi imposta automaticamente aos mapas. Enquanto “Usar regras próprias” estiver desmarcado, continua valendo o padrão global existente, incluindo suas regras de materiais e premiums. Desmarcar e salvar permite voltar a herdar esse padrão. Itens exclusivos de Boss não podem ser colocados nas listas de monstros comuns.

O comando `/drops` passa a consultar as regras do mapa atual, os multiplicadores ativos e a separação dos Bosses.

## Eventos

A nova aba **Eventos** permite nome, início, fim, pausa e seleção de mapas. Nenhum mapa selecionado significa evento global. Datas são preenchidas no horário do computador que abre o painel; são armazenadas como instantes absolutos no servidor. Eventos começam e terminam conforme o relógio, sem exigir reinício ou uma ação manual de encerramento.

| Evento | Controle |
|---|---|
| XP extra | Multiplicador de XP de monstros e Bosses; acumula com o premium de XP |
| Drop de equipamentos | Multiplicador das chances de equipamentos comuns, limitado a 100% |
| Ouro extra | Multiplicador da quantidade de ouro, sem alterar a chance de sorteio |
| Chuva de Sheltoms | Chance e intervalo de Sheltoms, escolhidas pelo nome |
| Moriph | Desconto no ouro do Aging, bônus de sucesso em pontos percentuais e distribuição opcional de Sheltoms até o limite escolhido |
| Aging sem ouro | Desconto de 100% no ouro do Aging; materiais da receita continuam obrigatórios |
| Exclusivos na roleta Boss | Multiplicador da chance de um exclusivo entrar na roleta, por morte |

Eventos sobrepostos do mesmo benefício usam o maior valor ativo. Não multiplicam seus efeitos entre si. Para a distribuição adicional de Sheltoms, prevalece a maior chance; empates priorizam o maior limite. O bônus de Aging transfere probabilidade de falhas para sucesso, conservando o total de 100% e a chance original de +2. As probabilidades e o preço mostrados no jogo refletem esses ajustes.

O desconto do Moriph se aplica onde o Aging é realizado. Se um evento de Moriph deve distribuir Sheltoms na Ilha Perdida e também dar desconto no NPC em Pillai, inclua ambos os mapas ou use escopo global.

Os sorteios de drops, preço/chances do Aging e chance de exclusivo de Boss consultam os eventos no servidor. O cliente atualiza o multiplicador de XP e a apresentação a cada cinco segundos. XP de recompensas de quests não recebe esse multiplicador. O cálculo de combate/XP continua usando o modelo local existente do jogo; esta mudança não transforma todo o combate em uma simulação autoritativa.

## Conferência dos premiums

Consulta realizada no catálogo efetivo da hospedagem: **96 produtos, contando trajes; nenhum produto de Aging, minério de proteção ou maturação de armas, armaduras e skills publicado**.

O catálogo de recursos possui Aging Stone, Copper Ore, Aging Masters A–F e Skill Masters 1–3, mas a presença de um nome ou ícone não constitui uma oferta funcional. Na versão atual do VelluM, os atributos de Aging são aplicados imediatamente e as skills aprendidas já têm proficiência em 100%. Por isso, não foram publicados maturadores consumíveis sem utilidade. Os itens de proteção também permanecem fora da loja: seus efeitos precisam de implementação própria antes da venda.

A maturação da arma emprestada da quest de classe é um sistema distinto e continua exigindo os objetivos da quest. Eventos de Moriph ajustam o processo de Aging; não pulam a promoção de classe.

Fontes de referência: [Armaduras — categorias 80D e 80E](https://wiki.priston.com.br/index.php/ARMADURAS) e [Guia Avançado — Aging e maturadores](https://wiki.priston.com.br/index.php/Guia_Avan%C3%A7ado). A definição das regras desta versão vem do código e do catálogo efetivamente usados pelo VelluM.

## Validação

136 testes automatizados: 86 JavaScript e 50 Python. Incluem seleção exclusiva do conjunto 80D, distribuição estatística de ouro a 30%, chances de 0% e 100%, limites de Sheltoms, Moriph com Aging sem ouro, preservação da soma das chances, mapas suspensos, isolamento de Bosses, restrição dos premiums ao grupo escolhido, cópia atômica, versões concorrentes, início/fim/pausa e escopo dos eventos, XP com premium, autorização HTTP e as verificações anteriores de combate, quests, inventário e roleta.

As verificações usam contas e bancos descartáveis. Não equivalem a testar visualmente todas as combinações do painel em uma sessão com jogadores reais. O painel registra alterações no histórico central de operações.
