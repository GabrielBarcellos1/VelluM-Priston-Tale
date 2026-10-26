# Travessia na mesma sessao
Data: 26/10/2026.

Correcao solicitada: a implementacao anterior trocava location.search a cada passagem. A travessia agora ativa o destino no cliente 3D existente; nao recria Game, personagem, conexao ou presenca. Nas divisas abertas o alvo de movimento e preservado. Cavernas usam o carregamento/teleporte nativo dentro da pagina.

O objeto de mapa e uma copia mutavel separada do catalogo. NPCs, populacao, drops, pets, quests, regras de cidade e eventos acompanham o destino. A presenca conserva clientId e descarta respostas antigas de heartbeat. Bosses suspendem a sincronizacao e confirmam os golpes pendentes antes da troca, depois atualizam seus spawns por mapa. Respostas de outra geracao de mapa e timers de monstros antigos nao contaminam o destino. A gravacao usa o mapa confirmado pelo adaptador, nao uma selecao provisoria do renderizador.

Testes:
- 125 testes Node e 67 Python aprovados.
- Edge/WebGL com conta e SQLite descartaveis, dentro de /priston: Jardim -> Bamboo -> Jardim -> Ricarten -> Jardim -> Bamboo -> Mata das Acacias -> Caverna dos Cogumelos -> Mata das Acacias.
- Oito travessias efetivamente verificadas: zero novas navegacoes de documento, zero chamadas de saida da presenca e um unico clientId; mesmas instancias Game, player, Session, online, stats e skills; inventario intacto, NPCs e monstros corretos por destino; posicao e mapa persistidos no servidor.
- Nas seis travessias abertas a pagina nao mostrou carregamento e o alvo de caminhada continuou ativo. Nas duas passagens de caverna houve carregamento nativo de terreno, sem relogin.
- Nenhum erro JavaScript na rodada final.

Os retestes reposicionaram somente a fixture descartavel. Uma primeira configuracao do teste colocou a fixture sobre o piso superior da ponte de Ricarten e bloqueou uma linha reta; o teste final retorna pelo piso da caminhada real sem reposicionar o personagem nesse trecho.

Clientes abertos devem recarregar uma vez para receber este codigo. Passagens posteriores nao recarregam a pagina.
