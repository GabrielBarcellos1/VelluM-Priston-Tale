# Passagens entre mapas
Data: 26/10/2026.

Problema: a sessao publicava apenas o terreno atual (gates vazio) e ignorava o pacote field. Sem os terrenos vizinhos, nao era possivel caminhar pelas divisas.

A sessao agora carrega os vizinhos cadastrados de cada mapa, nos dois sentidos, respeitando os niveis minimos. Ao cruzar uma divisa, aguarda operacoes de inventario, salva mapa/posicao/inventario no servidor e abre a sessao no destino. O recarregamento mantem NPCs, monstros, presenca, quests e regras associados ao mapa correto. A troca e automatica ao caminhar, com carregamento do destino. Falhas de save cancelam a passagem; transicoes duplicadas sao bloqueadas e combate fica suspenso durante a troca.

35 entradas/saidas de cavernas, calaboucos e outras areas usam coordenadas classicas do mesmo repositorio de referencia ja utilizado nas skills. A procedencia e o SHA-256 estao em data/map-links.json. Os nomes dos terrenos fazem a associacao: IDs numericos classicos diferem dos atuais. Coordenadas de origem e destino foram conferidas contra os retangulos dos terrenos atuais. Alturas sao resolvidas pelo piso de colisao atual; as alturas classicas nao coincidem em todos os mapas.

Escopo e limites: todas as ligacoes abertas presentes em map-fields.json compartilham o mecanismo corrigido. Bellatra continua no fluxo proprio de evento. Nao foram criadas conexoes arbitrarias para mapas especiais sem vizinhos. Quatro destinos classicos divergentes (Templo 2 -> ID classico 42, coordenadas fora da geometria atual) foram excluidos para impedir chegada invalida. Nao se afirma validacao manual de todos os mapas ou igualdade com a topologia privada do pweb.

Validacao:
- 119 testes Node aprovados, incluindo todas as adjacencias cadastradas nos dois sentidos, 35 portais, elevacoes convertidas, restricoes de nivel, morte, falha de save e duplicacao.
- 67 testes Python aprovados.
- Cliente 3D real, Edge headless/WebGL, conta de jogador e SQLite descartaveis em porta separada, dentro de /priston: Jardim -> Bamboo e Bamboo -> Jardim caminhando pelo terreno, sem comando GM; posicao gravada no servidor, inventario preservado.
- Mata das Acacias -> Caverna dos Cogumelos -> Mata das Acacias e Calabouco 1 -> 2 -> 1: gatilhos espaciais, carregamento e chegada nas coordenadas corretas; nenhum erro JavaScript.
- Nenhuma conta ou personagem real foi usado nos testes.

Atualizacao: exige o reinicio breve do backend pelo supervisor e recarregar clientes abertos. A primeira carga pode baixar terrenos vizinhos ainda ausentes do cache.
