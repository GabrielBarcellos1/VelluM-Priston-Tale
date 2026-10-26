# VelluM — roleta dos Bosses, versão 27

Cada Boss tem vida e participação compartilhadas no servidor. Ao morrer, gera de três a cinco rodadas, sorteadas separadamente a cada morte. Cada conta que acertou ao menos um golpe válido recebe um novo número inteiro entre **0 e 1000, inclusive**, em cada rodada. Quem tem o maior número ganha o item da rodada. Empates no maior número são desempatados aleatoriamente entre os empatados, no servidor. Uma pessoa pode ganhar mais de uma rodada.

Os números e os vencedores são definidos no servidor. A janela mostra uma animação de números e, em seguida, os resultados definitivos. As rodadas são reveladas a intervalos de cinco segundos. Pessoas que apenas estavam no mapa não recebem números. Golpes recebidos depois da morte não alteram a lista de participantes. A mesma conta não participa duas vezes usando classes ou abas diferentes.

## Itens e probabilidades

Cada rodada entrega um item. Por padrão, os itens comuns são equipamentos elegíveis da faixa do Boss; a lista pode ser modificada pelo administrador. O exclusivo do Boss tem chance inicial de **0,1% por morte** quando há um exclusivo cadastrado. Portanto, normalmente todas as rodadas usam itens comuns. Se o exclusivo sair, ocupa uma rodada aleatória, no máximo uma por morte. A chance não é multiplicada pelo número de rodadas.

Em **Painel → Drops → Roleta compartilhada dos Bosses**, escolha o Boss e ajuste:

- Itens comuns que podem aparecer e seus pesos relativos.
- Itens exclusivos que podem aparecer e seus pesos relativos.
- Porcentagem de entrar um exclusivo na roleta, de 0% a 100%.

Peso é a proporção de escolha dentro de uma lista; não é a porcentagem de sair um exclusivo. Alterações são aplicadas a mortes futuras. O editor verifica versão para evitar que uma edição sobrescreva outra sem aviso. As antigas chances de exclusivo do sistema de drops diretos deixam de controlar Bosses.

## Comandos administrativos

`/monstro Valento` invoca um Valento compartilhado neste mapa, usando a chance normal.

`/monstro Valento drop` ou **`/valento drop`** invoca um Valento compartilhado com o Anel do Valento (`OR205`) garantido em uma das rodadas, depois que ele for derrotado. O restante das rodadas continua aleatório. O comando não altera a configuração normal do Boss e não dá o item antes do combate. A opção de exclusivo garantido foi implementada especificamente para Valento; outros Bosses seguem as listas do painel.

Os comandos são verificados no servidor e exigem administrador. Invocações administrativas permitem até dez Bosses vivos no mapa. Bosses naturais são registrados nos seus mapas e reaparecem após quinze minutos, com registro ao visitar o mapa. Os pontos naturais desta versão usam zonas existentes do mapa; não pretendem reproduzir horários e coordenadas privados do servidor original.

## Entrega e persistência

O botão **Recompensas Boss** mostra os itens ganhos. A entrega modifica o inventário de forma transacional, com identificação única e proteção contra repetição. Se as duas bolsas estiverem cheias, o prêmio permanece pendente. Reabrir o jogo ou reiniciar o servidor não apaga prêmios pendentes. Eles pertencem ao personagem e à geração que participou do combate; excluir e recriar o personagem não transfere seus prêmios.

Resultados recentes ficam visíveis por três minutos no mapa; os prêmios pendentes permanecem disponíveis até a retirada. Há registros centrais de sorteio e entrega. Relatos de abate pelo caminho antigo de drops não podem gerar uma segunda recompensa de Boss.

## Validação e limites

122 testes automatizados: 84 JavaScript e 38 Python. Cobrem participação de duas contas, faixa 0–1000, três a cinco rodadas, maior número, empate, exclusivo garantido, chance 0% e 100%, vida compartilhada, golpes finais concorrentes, repetição de requisições, entrada após a morte, entrega apenas ao vencedor, bolsa cheia, reconexão, versão de configuração, autorização HTTP e bloqueio do drop antigo. Contas e compras de teste usam bancos descartáveis.

Vida, inscrições, sorteios e entrega dos Bosses ficam persistidos no servidor. O cálculo inicial do dano e a movimentação dos monstros ainda usam o motor local existente, com validação de personagem, mapa, distância e frequência no servidor. Esta implementação não transforma todo o combate do jogo em uma simulação autoritativa. A validação automatizada também não equivale a uma sessão visual completa com vários jogadores reais.
