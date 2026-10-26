# FREEston Tale 19 — buffs, combate, NPCs e presença online

Auditoria da revisão de 23/10/2026. Cliente público fixado: SHA-256 `309822294b926934160b35d034a4b15e0985d539520a04dc2a684b06b9a155ac`. Esta revisão não recupera o servidor privado do Zephira nem comprova equivalência de balanceamento.

## Buffs e atributos

As skills temporárias usam o pacote nativo `skill:SKILL_...`, com ícone e tempo restante. Isso corrige tanto o encaminhamento para a bandeja esquerda quanto o reconhecimento pelos efeitos visuais do cliente. Os premiums continuam à direita; a bandeja esquerda fica abaixo da barra FREEston para não esconder os ícones. Buffs, elemento do Encantamento e recargas preservam apenas o tempo restante ao recarregar; cancelar um buff remove seu efeito.

O antigo bônus genérico de ataque/defesa para qualquer buff foi removido. `skill-effects.mjs` associa cada habilidade às tabelas nomeadas de `data/skills.json.rules.skills`: resistências de fogo/gelo/veneno e Zenith, velocidade, regeneração de mana, HP/MP/RES máximos, taxa de ataque, dano da arma, defesa, absorção, bloqueio, esquiva, crítico, escudo de mana e proteção/reflexão contra mortos-vivos. Agonia converte vida em mana imediatamente. Encantamento seleciona um elemento e adiciona seu dano; Lança de Gelo adiciona dano de gelo. Armas e escudos incompatíveis deixam de receber os bônus restritos, e Armadura Metálica exige armadura de mecânico.

O cálculo por arma usa Força no corpo a corpo, Agilidade à distância e Inteligência nas armas mágicas. Taxa de ataque, defesa e absorção usam fórmulas derivadas do inventário clássico público, com especialização, equipamento e efeitos separados. Maestrias acrescentam sua parcela do dano da arma; bônus da armadura e da taxa da arma não multiplicam indiscriminadamente todos os atributos. O `attackStep` publicado altera a velocidade dos ataques normais no motor nativo. A animação e a recarga própria das skills da revisão 18 continuam valendo.

**Limites:** HP/MP/RES básicos, regras das classes 9–11, caps e vários detalhes de buffs continuam sendo regras locais. A conversão de velocidade percentual para `attackStep` é uma adaptação local. O perfil elemental local cobre Golem de Gelo, Duende de Gelo, Gelo e Verme de Fogo; as resistências reduzem seus ataques do elemento correspondente. A wiki não publica o tipo de todos os ataques; os demais permanecem neutros. Lentidão, veneno periódico, pets, Vanish/primeiro golpe, compartilhamento de buffs em grupo, cura e efeitos situacionais não foram integralmente reconstruídos. Os percentuais/tabelas clássicos não comprovam a aplicação exata no Zephira atual.

## Dano e reação dos monstros

A absorção da wiki estava sendo usada como percentual. Valento tem absorção 99 e, por isso, quase todo o dano desaparecia. O perfil desta revisão usa absorção **plana**: um golpe de 3000, antes de resistências, perde 99, em vez de perder 99%. Resistências elementais são calculadas separadamente. Magia não usa os testes físicos de acerto/bloqueio/crítico; ataques físicos conservam a tabela clássica de precisão e crítico de 170%.

Defesa passa a participar da chance de evitar um golpe; absorção desconta dano recebido. Bloqueio e esquiva têm testes próprios. Escudo de mana consome MP para absorver parte do dano, Corpo Sagrado aumenta a parcela de absorção contra mortos-vivos, e reflexão/retaliação são separadas. Não há taxa de ataque pública para todos os monstros: `nível × 8` continua como aproximação identificada.

Um golpe recebido não troca mais a sequência/animação do monstro vivo para parado, o que cancelava o ataque de resposta já agendado. O intervalo continua vindo do clipe de ataque do modelo a 35 FPS. No navegador, o Valento causou dano enquanto recebia ataques repetidos.

## NPCs

Além de compra/venda/reparo, mestre de habilidades, baú, viagem e missões já suportadas, foram ligados os fluxos nativos de **Mix, Force Orb, Aging e limpeza pela Nadia**. São operações do adaptador local, com conferência de NPC/proximidade, materiais, ouro e espaço; falhas de validação não consomem itens. Falta de espaço na fabricação de Force Orbs desfaz a operação. Mix e limpeza preservam corretamente o resultado ao recarregar.

Mix e Force usam as receitas/efeitos do cliente fixado; a tarifa de Force vem da receita nativa. Aging usa elegibilidade, limite +20, probabilidades e incrementos do cliente, com tarifa `floor((aging+1) × preço/2)`. A função de aging recebe um **incremento**, não um nível absoluto; isso foi corrigido para evitar somar o aging total novamente.

**Materiais de Aging são um perfil próprio do FREEston**, pois `agingNeeds` era um campo fornecido pelo servidor e estava ausente de todos os itens locais. Para aging atual `a`, usa três sheltoms consecutivas a partir de `OS1(1+floor(a/4))`, com `1+floor((a mod 4)/2)` unidades de cada. A lista e o preço são publicados no item para a janela nativa. A procedência fica em `agingRecipeSource: freeston-local`; não são apresentados como receita oficial recuperada. Pedras especiais/proteções não validadas são recusadas antes de qualquer gasto. Maturação de aging e modificadores de evento não estão simulados integralmente.

Eventos, BC competitivo, fabricação/reconstrução por runas, leilão e diversos outros serviços continuam pendentes. Um NPC visível não significa que todos os seus sistemas estejam implementados.

## Aura

A aura de dois aros geométricos foi substituída pelo efeito `hMe` do cliente fixado: textura aditiva, coluna de luz e partículas douradas. Staff e primeiros colocados entre jogadores continuam com regras de classificação separadas. É um efeito reutilizado desse cliente; não há comprovação de que seja a mesma aura de ranking configurada no servidor privado atual.

## Duas contas no mesmo mundo

`online_world.py` mantém presença e chat autenticados no Python do anfitrião. Heartbeats identificam a conta pela sessão, validam mapa/classe/coordenadas e publicam nome, papel e equipamento com base no save dessa conta. Contas distintas no mesmo mapa recebem personagens pelo renderizador nativo, com movimento e chat. Invisibilidade da Staff oculta a presença. A saída remove o personagem; conexões abandonadas expiram após 12 segundos. A mesma conta não mantém dois clientes simultâneos. Há um limite local de 100 presenças, sem teste de carga para esse número.

**É presença compartilhada e chat, não combate multiplayer completo.** Monstros, HP de monstros, loot, inventário comum, EXP e combate ainda são simulados por navegador. Os saves comuns continuam confiando no cliente. Não há PvP, trocas/party/BC completos nem proteção adequada contra adulteração para lançar um MMO público. O estado declara `world: shared-presence`, `sharedCombat: false` e `publicLaunchReady: false`.

Na rede local ou no túnel, ambos devem usar o **mesmo endereço do mesmo iniciador** e o mesmo mapa. Instalações Python separadas não compartilham presença nem banco. Para o link externo, execute `INICIAR_INTERNET.bat`; copie pelo botão **Link do jogo**, pelo painel `/painel` ou por `LINK_DO_JOGO.txt`. O link temporário muda quando o túnel é reiniciado; uma URL fixa exige o túnel nomeado descrito no guia.

## Fontes e verificação

Além das seis fontes clássicas já registradas em `data/skills.json.rules.sources`, foram consultadas no commit `299c615ed9a13f9ac394c6d0ac32f19e126b308d` de `yweenzy/pristontale-1`:

- `src/sinbaram/sinInvenTory.cpp`, SHA-256 `5a5b9824e4df8e8aeffdbc013ed4aab389b3200bb44c39a403e13f5d146ca615`: fórmulas e distinção entre bônus planos, percentuais da arma e da armadura.
- `src/Language/Brazil/b_JobCode.h`, SHA-256 `6ac11226fba0368f5a4fd978000499f131eb2a933b5d45a8efaf89f34ae9141e`: arquétipos das oito classes clássicas. Classes posteriores têm aproximações locais.

Testes automatizados cobrem efeitos de atributos, resistências, regras de armas/escudos, dano contra absorção alta, recargas, persistência/cancelamento de buffs, transações de fabricação, rollback, autenticação, identidade, mapas, chat, presença expirada e sessão duplicada. Os testes Chromium `scripts/freeston-world-smoke.mjs`, `scripts/freeston-npc-smoke.mjs` e `scripts/freeston-cooldowns-smoke.mjs` usam o cliente nativo e bancos temporários separados. Não representam auditoria de carga nem validação de todos os mapas/serviços do jogo.

## Instalação

Feche a versão anterior, extraia `freeston-tale-19.zip` em outra pasta e copie `.local-data` para preservar contas/personagens. Pode copiar `.original-cache`. Execute `INICIAR.bat` ou `INICIAR_INTERNET.bat`. Como há código Python novo, é necessário esse reinício uma vez; o atualizador em execução rejeita o pacote antes de alterar arquivos. Não substitua sua pasta de dados por uma pasta vazia.

Resultado desta entrega: **82 testes Node + 56 testes Python aprovados (138)**, ESLint sem erros nos módulos alterados e `git diff --check` limpo. No Chromium: duas contas com modelos visíveis, movimento/chat, invisibilidade GM, aura, Force Orb produzida e utilizada com aumento real de dano/efeito, Machado Veloz com `attackStep` maior, buff persistido/cancelado, Mix persistido/limpo e Valento retaliando. As barras/recargas de Meteoro 17,5 s, Onda de Fogo 8,5 s e Terremoto nível 10 de 4 s passaram novamente, inclusive para GM. O ZIP foi extraído e o iniciador extraído executou a mesma suíte de presença/buffs/Force no navegador.
