# FREEston Tale 17 — inventário e regras de combate

## Resultado e limites

Esta revisão corrige defeitos demonstráveis do inventário e substitui parte das fórmulas genéricas por tabelas recuperadas de fontes públicas. **Não é uma reprodução certificada do balanceamento atual do Zephira.** O mundo continua individual, com combate e inventário comum simulados no navegador. `publicLaunchReady:false` permanece.

A consulta pública de 23/10/2026 retornou HTTP 403 em pweb.world, /api/wiki, /api/wiki/skills e /api/wiki/drops. Veja `public-probe-17.json`. Não houve acesso autenticado ao jogo oficial nem recuperação da configuração privada de EXP, drops, habilidades ou eventos. Não foram contornadas restrições de acesso.

## Inventário verificado no cliente

- O método nativo `buildInventory` do cliente fixado define **12 colunas × 6 linhas**, para ambas as bolsas. O adaptador usava 6 × 9. As constantes globais 9 × 9 são do baú, não da bolsa; a conferência visual foi incluída no teste de regressão. Movimentos passam a validar o retângulo inteiro e sobreposições.
- `sortBag` passa a organizar a bolsa ativa, colocando retângulos maiores primeiro. A operação é atômica: uma tentativa que não consiga encaixar tudo preserva os itens anteriores. É uma implementação local; não se afirma o mesmo algoritmo de ordenação do oficial.
- `swapBag` e `swapSet` passam a trocar as duas bolsas e os conjuntos de arma/escudo, com confirmações `bagAck` e `swapAck` para encerrar a previsão nativa. As duas bolsas, conjuntos e página ativa são salvos e restaurados. A armadura e acessórios não mudam ao alternar armas.
- Posições antigas inválidas ou sobrepostas são recuperadas; overflow pode ir para a outra bolsa. Se exceder ambas, o carregamento interrompe com erro para preservar o save anterior, sem excluir silenciosamente itens.
- Equipar escudo guarda a arma de duas mãos quando houver espaço; garra ocupa a mão principal. Trocas sem espaço são revertidas. Desequipar por arrastar respeita x/y pedidos.
- Equipar traje não ativa mais automaticamente o modo de visualização. **T** mantém o comportamento nativo: alterna o traje e seu espaço sem substituir a armadura protetora. A preferência salva é mantida.
- Estoque comprado é sincronizado nas duas bolsas e nos dois conjuntos de armas, evitando duplicação ao alternar páginas. Poções compradas não se misturam com loot grátis. Repor o cinto a partir da outra bolsa passa a funcionar.

## Regras recuperadas

`scripts/import-gameplay-rules.py` baixa arquivos públicos fixados no commit `299c615ed9a13f9ac394c6d0ac32f19e126b308d` de `yweenzy/pristontale-1` e extrai tabelas sem executar código do cliente. URLs e SHA-256 estão em `data/skills.json.rules.sources`.

- 128 progressões identificadas por código da habilidade, com dez níveis de resistência e requisitos iniciais; 112 tabelas de mana para habilidades ativas.
- 46 tabelas de dano percentual; quando correspondentes ao golpe, substituem o multiplicador genérico por tier. Impacto: +20% no nível 1 e +55% no nível 10. Impacto Triplo usa sua tabela de dano e quantidade de golpes, distribuindo o total pelos eventos de animação.
- Durações encontradas na fonte são aplicadas aos buffs correspondentes. Slots de mouse respeitam a indicação da tabela clássica.
- O tempo de execução continua vindo do clipe específico do modelo nativo a 35 fps. As habilidades clássicas recuperadas deixam de receber um atraso genérico adicional por tier; sua animação limita a execução. **Recargas privadas adicionais do Zephira não foram confirmadas.**
- Precisão do golpe usa a tabela clássica de ataque versus defesa e diferença de níveis, limitada a 30–95%. Defesa deixa de ser subtraída diretamente do dano. Absorção de monstros usa percentual. Crítico clássico usa 170%, com chance ajustada por nível e limitada a 70%. Bloqueio do monstro passa a produzir Block sem dano.
- Quando o modelo do monstro está carregado, a cadência do ataque vem do clipe `attack`, a 35 fps; o dano é agendado no meio do clipe e cancelado se morrer, interromper o ataque, o jogador se afastar ou ficar protegido. **O meio do clipe é uma aproximação local do instante de impacto**, pois não há evento de hit validado para todos os monstros. Sem modelo, a cadência provisória é 1,8 s.

## O que ainda NÃO foi recuperado

- EXP oficial de cada monstro, tabela de evolução do Zephira e penalidades de diferença de nível.
- Lista e chance oficiais de cada drop, horários de boss, respawn oficial e tabelas completas de loot por mapa. `data/drops.json` continua identificada como balanceamento LOCAL; exclusivos 1%, poções 25%, equipamentos 5% não são taxas oficiais.
- As 48 habilidades das classes 9–11 não têm tabelas clássicas correspondentes nessa fonte. Continuam com regras locais, identificadas por `ruleSource:local-fallback`.
- Efeitos completos de passivas/buffs, fórmulas de cura/summons, dano elemental e resistências por habilidade, restrições de arma por skill, custos de aprendizado e domínio continuam parcialmente locais. Ter uma tabela no catálogo não significa que todo seu efeito já foi implementado.
- A fórmula de dano recebido, velocidade de movimento/aggro, bônus de status, viagens e travas de mapas ainda são locais. Não foram substituídos por números adivinhados como se fossem oficiais.
- O catálogo público já determina HP, nível, ataque, defesa, absorção, resistências e mapas dos monstros; os spawns usam as zonas e pesos públicos. Isso não fornece as configurações privadas acima.

O relatório `gameplay-17.json` enumera a cobertura por habilidade para permitir novas importações automáticas sem confundir fórmulas locais com regras confirmadas.

## Instalação

Feche a revisão anterior, extraia `freeston-tale-17.zip` em outra pasta e copie `.local-data`. Opcionalmente copie `.original-cache`. Execute `INICIAR.bat` ou `INICIAR_INTERNET.bat`. O novo Python precisa iniciar uma vez para servir os módulos adicionais. Configurações da loja e contas são preservadas.

## Validação executada

- 57 testes JavaScript e 51 testes Python passaram; ESLint dos módulos alterados e `git diff --check` sem erros.
- Chromium real: bolsa **12×6**, organização pelo botão nativo, escudo guardando arma de duas mãos, garra, conjuntos A/B com confirmação, bolsas A/B, coordenadas ao desequipar, reload e item inteiro dentro da tela. Este cenário passou também com os arquivos extraídos do ZIP final.
- Regressões de Staff/Teio, compra e aparência PTM do traje com T, ranking, painel desktop/celular, usuários/permissões, preços em jogo, estoque comprado e ativação de premiums passaram.
- Janela nativa S/mestre, loja original, premiums à direita, animação da skill a 35 fps e ausência de respawn para invocação GM passaram.
- Ataque real de Hopi: clipe de 1,142857 s, dano agendado após o início do ataque e duas retaliações contra o jogador verificadas. O impacto a meio do clipe continua uma aproximação documentada.
- ZIP íntegro, com módulos e auditoria novos, sem banco de contas em uso nem cache de assets.

Esses testes verificam esta implementação local; não constituem comparação autenticada com o servidor Zephira.
