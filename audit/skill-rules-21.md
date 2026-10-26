# Habilidades — revisão 21

## Evidência e limites

O cliente público fixado do pweb.world (`index-uQp4-Rtd.js`, SHA-256 `309822294b926934160b35d034a4b15e0985d539520a04dc2a684b06b9a155ac`) foi examinado novamente. As funções `Pw`, `Hq`, `playSkill` e `onSkillFx` comprovam a seleção de movimentos, eventos de animação e reprodução do campo `dur` enviado pelo servidor. `skillInfo` e `skillCooldown` mostram os valores recebidos; o código público não contém a tabela privada de dano/recarga.

Os endpoints de wiki presentes no código são `/api/wiki` e `/api/wiki/quests`; não foi encontrado endpoint público de skills no bundle. A nova consulta feita nesta revisão está registrada em `public-probe-21.json`: a wiki de monstros não fornece fórmulas privadas de habilidades.

A lista `Hwe` de auto-caça sugere uma rotação por classe, mas não identifica uma única habilidade principal universal. Por exemplo, Lutador lista buffs, Golpe Giratório, Destroyer e Golpe da Vingança nessa ordem. Não usamos essa ordem como prova de uma recarga zero para todas as classes.

As fórmulas numéricas implementadas abaixo são da fonte clássica pública já fixada na revisão 17, **não valores privados recuperados do Zephira**:

- Repositório `yweenzy/pristontale-1`, commit `299c615ed9a13f9ac394c6d0ac32f19e126b308d`.
- [`src/Server/Svr_Damge.cpp`](https://github.com/yweenzy/pristontale-1/blob/299c615ed9a13f9ac394c6d0ac32f19e126b308d/src/Server/Svr_Damge.cpp): cálculo de ataques, magia, cura, número de alvos e áreas. O SHA-256 dessa fonte permanece no catálogo `skills.json.rules.sources`.
- [`src/sinbaram/sinSkill_Info.cpp`](https://github.com/yweenzy/pristontale-1/blob/299c615ed9a13f9ac394c6d0ac32f19e126b308d/src/sinbaram/sinSkill_Info.cpp): tabelas nos dez níveis.

## Golpe da Vingança

O nome corresponde a **`SKILL_AVANGING_CRASH`, id 110, Lutador**. Não é `SKILL_VENGEANCE`, id 516, da Atalanta.

Conforme solicitado pelo administrador do FREEston, o nível 10 recebe **zero recarga adicional**, identificado como `freeston-primary-attack` e perfil local em `rules.freestonProfile`. A trava de animação continua: repetir antes de a animação terminar é recusado sem cobrar MP/RES. Níveis 1–9 preservam a regra clássica anterior. Recargas antigas salvas para essa habilidade no nível 10 são descartadas ao entrar, e outras habilidades mantêm suas recargas.

O ataque no nível 10 aplica o bônus clássico de **95% de dano** (1,95× o ataque físico) e **50% de taxa de ataque**. A correção da taxa agora interfere no acerto real, em vez de ficar apenas no catálogo.

## Dano próprio por habilidade

A implementação anterior transformava toda magia num multiplicador genérico do ataque físico, apesar de as tabelas Min/Max estarem importadas. Isso também dava valores genéricos no tooltip e tornava a arma e os atributos incorretos para várias conjurações.

O novo `skill-damage.mjs` calcula os treze ataques abaixo com a tabela, nível, inteligência/espírito (`spi`) e contribuição da arma, conforme cada caso clássico. Cada divisão usa truncamento inteiro, como a fonte. Ataques mágicos não recebem crítico físico nem dano extra de Encantar Arma por engano.

| Habilidade | Base e complementos clássicos |
| --- | --- |
| Bola de Fogo, nível | Tabela + nível/2 + SPI/6 no mínimo e SPI/4 no máximo |
| Watornado, Terremoto e Onda de Fogo | Tabela + nível/2 + SPI/6 e SPI/3 |
| Raio da Morte | Tabela + arma + nível/2 + SPI/4 e SPI/2 |
| Meteoro | Tabela + nível/3 + arma/3 + SPI/6 e SPI/3 |
| Fire Bolt e Holy Bolt | Tabela + arma/3 + SPI/8 e SPI/6 |
| Multi Spark | Tabela + arma/3 + SPI/8 e SPI/6; multiplicidade da tabela `M_Spark_Num` |
| Raios Divinos, Bola de Vigor e Espinhos Glaciais | Tabela + nível/2 + SPI/6 e SPI/3 |
| Raios Contínuos | Tabela + nível/3 + arma/3 + SPI/6 e SPI/3 |

Spirit Elemental agora aumenta a parcela base das magias do Mago conforme a tabela clássica. A base de Meteoro estava vazia por uma diferença no nome do `switch` do importador; suas dez faixas de dano e áreas foram recuperadas explicitamente, e o importador foi corrigido para preservá-las.

Ataques físicos passam os bônus próprios de taxa e crítico ao cálculo final. Perfect Aim usa adição de dano + nível/divisor; Split Javelin agrega a quantidade de lanças e não recebe crítico, conforme a fonte. Triple Impact, Avalanche, Shadow Master e Divine Piercing usam suas contagens de golpes nos níveis respectivos.

**Quantidade de partículas não é quantidade de golpes.** Campos visuais `n`, quadros ou eventos extras de animação não multiplicam o dano arbitrariamente. O padrão é um golpe; múltiplos só são habilitados pelas contagens de tabelas identificadas. Isso evita transformar uma chuva de efeitos em dano inventado. A contagem de alvos de Chain Lightning não vira multiplicador contra um único alvo.

Cura e Grande Cura também usam suas faixas clássicas, arma/3 e SPI/8 ou SPI/6. A aplicação local ainda cura o próprio personagem; isso não completa cura em grupo ou PvP compartilhado.

## Área e seleção de alvos

O sistema anterior confundia o tipo visual (`sky`, `beam`, `shot`) com ataque contra apenas um alvo. Meteoro, Bola de Fogo, Watornado e os raios atingiam um monstro mesmo sendo habilidades de área.

Agora a seleção usa as tabelas de raio. Meteoro/Bola de Fogo/Watornado atingem monstros vivos próximos ao alvo principal; habilidades centradas no personagem usam o raio da tabela. Raios Contínuos percorrem os alvos próximos respeitando distância por salto e limite por nível. Raios Divinos respeitam sua quantidade por nível; **seu raio continua sendo o alcance local de 500 unidades**, porque não há uma tabela independente de raio na fonte consultada. Essa exceção está explícita no código.

Aliados/invocações com dono e monstros mortos não entram na seleção. Os pacotes visuais recebem os alvos e tempos de impacto escolhidos, e o cálculo de dano considera o alcance de toda a área/cadeia, não apenas a distância do alvo inicial. A flag de área é repassada aos efeitos premium.

## Validação e pendências

Os testes cobrem fórmulas Min/Max, SPI/nível/arma, Spirit Elemental, tabela de Meteoro, crítico e taxa, contagens de golpes/alvos, cadeia, cura, não multiplicação por FX, recarga zero do ataque principal e bloqueio durante a animação. A suíte de recargas anteriores continua passando, incluindo Meteoro 17,5 s.

As classes 9–11 e habilidades sem fórmula recuperada continuam identificadas como `freeston-fallback`. Pets, dano especial por tipo de monstro, proficiência progressiva, PvP e combate autoritativo compartilhado ainda exigem implementação/validação. Não afirmamos que o balanceamento ficou idêntico ao servidor privado, nem alteramos `publicLaunchReady:false`.

Teste adicional em Chromium com o cliente nativo e banco isolado: Lutador 150 equipado, Golpe da Vingança nível 10, animação de **1,714285714 s** e impacto em **0,571428571 s**. Tentativa durante a animação foi recusada; após o término, a segunda conjuração foi aceita com `cooldownLeft=0`. Sob rolagem determinística do teste, o Valento passou de **40250 → 37202 → 34154 HP** (3048 por golpe). O teste não altera a aleatoriedade do jogo distribuído nem considera esses números um parâmetro oficial de balanceamento. Script: `scripts/freeston-primary-smoke.mjs`.
