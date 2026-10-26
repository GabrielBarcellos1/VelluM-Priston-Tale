# Skills do VelluM — versão 24

Foram implementados perfis explícitos para as 176 habilidades das 11 classes, nos níveis 1 a 10. A definição de cada habilidade controla custos, recarga, duração, alcance, área, quantidade de alvos, dano, acertos, efeitos e invocações. O tooltip e a execução consultam a mesma definição. Os níveis já aprendidos são preservados; basta atualizar a página, sem redistribuir e comprar tudo novamente.

## Origem dos números

A investigação do https://pweb.world/ não forneceu uma tabela completa do servidor. Foram mantidas as observações verificadas de nível 1/2 do Lutador: Mestre das Armas, resistência ao fogo, Raiva, Impacto, Impacto Triplo, Brutal Swing e Rugido. A observação disponível de Fúria de Zecram cobre apenas o primeiro nível. As geometrias públicas de ataques em linha também foram aproveitadas.

As 128 habilidades com tabelas clássicas continuam usando essas tabelas onde interpretadas. As lacunas, inclusive as 48 habilidades de Assassina, Xamã e Marcial, recebem progressões próprias do VelluM, conforme autorizado. Também são próprias as extrapolações dos níveis não observados no pweb, as regras de suporte entre jogadores e a adaptação das fórmulas ao combate local. Não são números oficiais recuperados do pweb. A política e a origem estão registradas em `data/skills.json`, e o gerador em `ops/build-skill-runtime.mjs` permite reproduzir o catálogo.

## Comportamentos ligados ao jogo

- Ataques: dano por nível, múltiplos acertos, precisão, crítico, área circular, corredor ou cadeia, custo de HP de Raiva e veneno periódico.
- Buffs e passivas: modificam os atributos usados pelo combate, incluindo velocidade, dano da arma, poder mágico, HP/MP/RES máximos, resistências e regeneração.
- Controle: atordoamento interrompe golpes pendentes, lentidão reduz movimento e enfraquecimento reduz o dano do monstro. Chefes recebem controle reduzido.
- Invocações: usam dano, intervalo e duração do perfil; reaparecem após carregar um buff salvo. Falcão e Falcão Dourado compartilham a invocação. Cancelar o buff encerra a invocação no próximo ciclo.
- Agonia converte HP em MP; Sugar Alma recupera o dano efetivamente causado; Encantamento Sagrado converte mortos-vivos comuns temporariamente; Extinção aplica a regra específica a mortos-vivos.
- Cura, buffs de grupo e ressurreição têm distribuição autenticada entre personagens próximos. O servidor consulta a classe e os níveis aprendidos, valida proximidade e recarga e entrega o efeito ao destinatário.
- Reset pela Event Girl continua devolvendo pontos e preservando inventário e progresso. Callbacks pendentes são invalidados no reset.

## Limites e decisões de balanceamento

O mundo ainda não possui grupos formais: buffs de grupo afetam aliados próximos, no mesmo mapa, até 500 unidades ou dentro da área específica menor. Ressurreição escolhe um aliado morto próximo, recupera 35% a 80% de HP conforme o nível e recarrega a página do destinatário para reconstruir o personagem vivo. Esses comportamentos são decisões do VelluM.

O combate PvE continua simulado no cliente; presença, chat e suporte entre aliados são compartilhados. Esta atualização não implementa PvP ou monstros compartilhados no servidor. O catálogo público de monstros não classifica demônios: bônus condicionados a esse tipo precisam dessa classificação para serem aplicados. Os efeitos visuais continuam usando o cliente original fixado; invocações sem modelo 3D conhecido usam o efeito nativo e execução lógica, sem inventar um modelo.

Há teste de execução de todas as skills em todos os níveis, mas isso não equivale a uma sessão visual com cada habilidade nem comprova equilíbrio competitivo. Ajustes futuros podem ser feitos nas tabelas centrais, sem recriar a implementação de cada personagem.

## Verificação

39 testes Node e 4 testes Python, incluindo execução das habilidades de todas as classes nos dez níveis, dano pelo handler real da sessão, velocidade, expiração/restauração, cancelamento de veneno, área/linha/cadeia, efeitos de controle, cura/ressurreição entre clientes isolados e reset pela Event Girl. Os testes Python substituem o acesso a contas; não leem nem alteram o banco real.

```
node --test tests/skills-progression.test.mjs tests/redistribution-speed.test.mjs tests/skill-runtime.test.mjs
python -X utf8 tests/test_online_skills.py
node ops/build-skill-runtime.mjs
node ops/audit-skills.mjs matriz.json
```

A matriz exportada registra 1.760 estados, 176 perfis explícitos e zero habilidades de ataque usando a antiga potência genérica de fallback.
