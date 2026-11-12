# VelluM: migracao controlada das regras classicas

## Objetivo

Preservar o cliente web Python/JavaScript do VelluM (carregamento leve) e incorporar dados verificaveis de Priston Tale Web, sem importar seu motor WebAssembly ou os 3,7 GB de assets.

## Versao 2: experiencia e progressao

- Fonte: sungam3d/priston-tale-web / [project]/src/LevelTable.h
- Valores cumulativos da tabela classica nos niveis 1 a 151. Limite jogavel no VelluM continua 150.
- A tabela anterior do VelluM fica em previousExperience para migracao reversivel por restauracao do backup, nao para alterar o servidor classico.
- Migracao dos personagens com progressionVersion=1: mantem nivel, pontos e percentual dentro do nivel (novo EXP = nova base + fração do intervalo novo).
- Personagens sem versao continuam usando o conversor do prototipo anterior.
- O XP dado por morte e proporcional ao intervalo do nivel na curva anterior; preserva aproximadamente a quantidade de mortes necessaria para evoluir, enquanto os numeros exibidos sao classicos.
- O XP recebido em quests como percentual tambem utiliza a curva classica.
- Back-end permite EXP ate Number.MAX_SAFE_INTEGER; ouro e demais atributos continuam com limites antigos.
- A deteccao de saltos de EXP usa percentual do intervalo, ignorando a conversao unica de versao 1 para 2.

## Itens e kits por classe

- Fonte: [project]/src/SrcServer/AutoDropItem.h (rsPresentItem_LevelType_2).
- 24 codigos de armas originais, oito classes. Disponivel em data/classic-kit-weapons.json.
- level_rewards.py prioriza arma classica no kit 10/20/30/40/50/60/70 somente se o item existe, respeita requisitos e nao fica muito inferior ao melhor item permitido.
- Mecanico pode receber garra da familia WC1; martelo WH1 continua elegivel.
- Nao ha novos equipamentos sinteticos: usa os codigos e atributos ja presentes em data/loot-items.json, catalogo do cliente publico.
- Classes 9 a 11 continuam indisponiveis para kits, conforme a configuracao atual do VelluM.

## Monstros, jogabilidade e limites

- A lista de monstros, distribuicao de mapas, atributos, habilidades e drops existentes continua no VelluM, sem substituir por dados nao identificados.
- XP por monstro e recompensa de quest passam a usar a curva classica.
- HP, ataque e regras locais de combate permanecem no motor existente; nao foi comprovada equivalencia ao executavel C++.
- Nao reativa tiers 5, nem quests de evolucao que foram removidas do jogo VelluM.

## Protecao e testes

- Backup SQLite consistente e catalogos originais em C:\VelluM\backups\classic-rules-before-20261112-135027
- Todos os 28 personagens auditados tinham progressionVersion=1; migracao automatica no proximo acesso.
- Testes JavaScript: 279 casos aprovados em copia de staging.
- Testes Python: class gifts, kit equipavel e backend com EXP alto aprovados.
- Validar login real, salvamento e combate no navegador apos publicar; testes de unidade nao provam jogabilidade.
- Nao expor a conta de GM nem modificar os servicos Guacamole/Priston Classic Lab.