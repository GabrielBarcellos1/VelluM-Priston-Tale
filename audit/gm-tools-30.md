# Ferramentas GM — versão 30

- `/gmkit`: entrega a Poção EXP GM BI998 e equipa a Sheltom GM OS199. Se havia uma Sheltom equipada, ela ocupa o lugar da GM na bolsa. Itens existentes não são duplicados. É preciso espaço para receber o kit; operações incompletas são revertidas.
- Sheltom equipada: defesa mínima de 1.000.000, HP protegido contra ataques e custos próprios de skills, sem consumo de MP e RES. Ao remover a Sheltom, o combate volta ao normal. Não aumenta dano, velocidade, nível de skill, nem libera tiers.
- `/gmexp on`: consome uma poção da bolsa e ativa o teste no personagem atual. Também funciona usando a poção pelo inventário. `/gmexp off` encerra o efeito.
- `/gmrota`: mostra estado da proteção, XP, mapas atuais e rota de referência. Efeito persistido em SQLite por personagem e geração; validade de 24 horas corridas para realizar o teste, sem bônus a partir do nível 120.
- Itens exclusivos das funções admin/gm; não fazem parte da loja premium nem dos drops. Contas comuns não recebem suas definições e não podem salvá-los em bolsas, equipamentos, cinto ou armazém.

## Calibração

`ops/calibrate-gm-training.mjs` gera 1.309 perfis: 119 transições para cada uma das 11 classes. Usa a curva normal de XP, atributos e skills legalmente distribuídos, equipamentos comuns +0 adequados ao nível, rotação de combate simulada, MP/RES livres e quatro segundos entre monstros. Define multiplicadores por classe/nível, selecionando mapas acessíveis e monstros comuns próximos do nível do personagem.

Meta: 3.600 segundos de caça ativa entre 1 e 120, aproximadamente 30,25 segundos por nível. Faixa 1–10: 4m32s; cada faixa de dez níveis posterior: aproximadamente 5m03s. Deslocamentos, compras de equipamento, alocação de pontos, quests, pausas, mortes sem a Sheltom e o desempenho real da rotação alteram o tempo. A duração não é uma garantia nem foi validada por uma sessão humana de uma hora. Ataques em área e equipamentos superiores podem acelerar a evolução.

O XP de teste não acumula premiums/eventos de XP. Só monstros comuns da rota recebem o multiplicador; bosses, invocações de GM e monstros de outros mapas continuam com o XP normal. Eventos de ouro e drops permanecem independentes. O limite impede que um abate acelerado ultrapasse o nível 120. A progressão normal de 300 horas e as quests de promoção continuam inalteradas.

## Verificação

Testes automatizados: proteção vinculada ao slot e à função; custo de MP/RES, Agonia e recarga/tier; rotas acessíveis nas 1.309 transições; tempo de referência próximo de uma hora em todas as classes; entrega e consumo atômicos; repetição de requisições; bolsa cheia; preservação da Sheltom anterior; expiração e geração de personagem; rejeição para jogadores comuns; limites de XP e rotas inválidas. Suite completa do cliente e servidor executada antes de publicar.

Validação pela interface em uma conta sintética e SQLite descartável, sem alterar personagens reais. O relatório de abate comum continua vindo do cliente; o jogo ainda não possui combate inteiramente autoritativo no servidor.
