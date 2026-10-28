# Auditoria de habilidades clássicas — VelluM

Escopo: 11 classes × 16 habilidades × 10 níveis = **1.760 progressões**, apenas **Tiers 1–4**.

## Cobertura e qualidade das evidências

- Tabelas públicas com correspondência exata: **151/176**.
- Correspondências de tradução ou versão ainda não validadas: **25**.
- Conjuntos de parâmetros corrigidos: **79** em **43** habilidades.
- Maturação por uso implementada como aproximação de comunidade, sem alegar paridade histórica exata.
- Duração de animação, intervalo entre golpes e cooldown medidos em segundos não são necessariamente fornecidos pelas fontes; tempo específico não foi inventado.
- Fórmulas mágicas que dependem do nível e atributos continuam calculadas dinamicamente pelo servidor.
- Valores anteriores podem ser restaurados pelo histórico Git. Overrides administrativos no SQLite permanecem preservados.

## Fontes públicas consultadas

- Fighter: https://pristonworld.com/EPT/Skill-Fighter.html (20 tabelas, inclusive Tier 5 excluída)
- Mechanician: https://pristonworld.com/EPT/Skill-Mechanician.html (20 tabelas, inclusive Tier 5 excluída)
- Archer: https://pristonworld.com/EPT/Skill-Archer.html (20 tabelas, inclusive Tier 5 excluída)
- Pikeman: https://pristonworld.com/EPT/Skill-Pikeman.html (20 tabelas, inclusive Tier 5 excluída)
- Atalanta: https://pristonworld.com/EPT/Skill-Atalanta.html (20 tabelas, inclusive Tier 5 excluída)
- Knight: https://pristonworld.com/EPT/Skill-Knight.html (20 tabelas, inclusive Tier 5 excluída)
- Magician: https://pristonworld.com/EPT/Skill-Magician.html (20 tabelas, inclusive Tier 5 excluída)
- Priestess: https://pristonworld.com/EPT/Skill-Priestess.html (20 tabelas, inclusive Tier 5 excluída)
- Assassin: https://pristonworld.com/EPT/Skill-Assassin.html (20 tabelas, inclusive Tier 5 excluída)
- Shaman: https://pristonworld.com/EPT/Skill-Shaman.html (20 tabelas, inclusive Tier 5 excluída)
- Martial Artist: https://pristonworld.com/EPT/Skill-MartialArtist.html (20 tabelas, inclusive Tier 5 excluída)

## Itens ainda sem correspondência segura

| Classe | Código | Nome histórico | Tabela pública sugerida |
|---|---|---|---|
| Fighter | SKILL_RAGE_OF_ZECRAM | Rage Of Zecram | Rage of Zechram |
| Mechanician | SKILL_PHYSICAL_ABSORB | Physical Absorb | Physical Absorption |
| Mechanician | SKILL_MECHANIC_WEAPON | Mechanic Weapon | Mechanic Weapon Mastery |
| Mechanician | SKILL_COMPULSION | Compulsion | Impulsion |
| Archer | SKILL_ELEMENTAL_SHOT | Elemental Shot | Elemental Shoot |
| Archer | SKILL_BOMB_SHOT | Bomb Shot | Bum Shot |
| Pikeman | SKILL_WEAPONE_DEFENCE_MASTERY | Weapon Defense Mastery | Weapon DEF Mastery |
| Pikeman | SKILL_VENOM_SPEAR | Venom Spear | Venom Sphere |
| Pikeman | SKILL_CHAIN_LANCE | Chain Lance | Chain Lancer |
| Atalanta | SKILL_VIGOR_SPEAR | Vigor Spear | Bigger Spear |
| Knight | SKILL_DIVINE_INHALATION | Divine Inhalation | Divine Shield |
| Magician | SKILL_WATORNADO | Water Tornado | Watornado |
| Magician | SKILL_DEAD_RAY | Dead Ray | Death Ray |
| Priestess | SKILL_SUMMON_MUSPELL | Summon Muspell | Summon Muspel |
| Assassin | SKILL_STINGGER | Stinger | Stingger |
| Martial Artist | SKILL_HYPER_STRAIGHT | Hyper Straight | Hard Training |
| Martial Artist | SKILL_RAGE_UP | Rage Up | Rage |
| Martial Artist | SKILL_PATRIOT | Patriot | Hard Training |
| Martial Artist | SKILL_RUSH_ELBOW | Rush Elbow | Elbow Rush |
| Martial Artist | SKILL_INSTANT_BULK_UP | Instant Bulk Up | Stamina Mastery |
| Martial Artist | SKILL_TYPHOON | Typhoon | Typhoon Kick |
| Martial Artist | SKILL_JUMPING_HEEL_KICK | Jumping Heel Kick | Typhoon Kick |
| Martial Artist | SKILL_COMBINATION | Combination | Stamina Mastery |
| Martial Artist | SKILL_STEELERS | Steelers | Nerves of Steel |
| Martial Artist | SKILL_BODY_CHECK | Body Check | Shoulder Charge |

## Dados completos por nível

O arquivo data/classic-skill-audit.csv contém 1.760 linhas, incluindo dano/base, quantidade de golpes, cooldown atual, duração, custo de MP/RES, efeitos/buffs, controle de monstros e campos numéricos publicados.

## Limites de comparação

As tabelas de PristonWorld são comunitárias e podem representar versões diferentes. Os relatos de delay indicam frequentemente apenas presença/ausência, sem duração mensurada. A maturação de habilidades foi descrita por jogadores com taxas aproximadas por tier; sua exatidão para todas as classes não está confirmada. Não extrapolar valores de Tier 5.

## Revisão de segurança de execução — 28/10/2026

### O que foi auditado no código atual

- Catálogo: **176 habilidades**, 11 classes, 16 habilidades por classe, 10 níveis por habilidade, exclusivamente Tiers 1–4.
- Matriz por nível: `data/classic-skill-audit.csv`, **1.760 registros**. Os campos `Cooldown VelluM (seg)` e `Duração (seg)` descrevem a configuração do projeto, **não medições históricas verificadas**.
- `data/classic-skill-reference.json` e `data/classic-skill-changes.json`: referências e mudanças anteriores; **151 correspondências de nome/tabela não equivalem a 151 cooldowns confirmados**.
- Cliente/combate: `skill-system.mjs`, `skill-runtime.mjs`, `skill-damage.mjs`, `skill-effects.mjs`, `skill-cooldowns.mjs`, `skill-maturity.mjs`, `skill-book.mjs`, `session.mjs`.
- Motor de execução: os dois sistemas de skills verificam nível, recursos, cooldown individual, bloqueio de animação e emitem golpes com timestamps. Os cooldowns salvos podem ser restaurados após nova sessão.
- Maturação: `skill-maturity.mjs` usa taxas **provisórias** por Tier; não considerar essas taxas historicamente confirmadas.

### Correção de combate verificável

Antes, o bloqueio de uma nova execução terminava no final de `timing.duration`, mesmo se `hitTimes` ainda contivesse golpes futuros. Isso podia permitir sobreposição de casts e golpes. Agora, ambos os motores utilizam `skill-action-timing.mjs`, com:

- `action_duration = max(animation_duration, último hit_timestamps)`;
- `cooldown_duration = 0` preserva ausência de recarga **adicional**, mas o bloqueio global continua até `action_duration`;
- cooldowns não nulos respeitam `max(cooldown configurado, action_duration)`;
- timestamps negativos, infinitos ou duração inválida são rejeitados.

Essa alteração **não atribui cooldown histórico novo a nenhuma skill**. Corrige a aplicação consistente dos tempos que já existem e evita hits sobrepostos após o fim visual da ação.

### Estado de confirmação — não confundir parâmetros com evidência

| Métrica | Quantidade | Critério |
|---|---:|---|
| Habilidades inventariadas | 176 | IDs e níveis presentes em `data/skills.json` |
| Progressões inventariadas | 1.760 | 10 níveis por habilidade |
| Correspondências públicas exatas de tabelas | 151 | Nomes/tabelas, não cooldowns |
| Correspondências pendentes de tradução/versão | 25 | Listadas acima |
| Cooldowns históricos individualmente confirmados nesta revisão | **0** | Nenhuma nova fonte temporal foi validada em condições reproduzíveis |
| Cooldowns numéricos individuais alterados nesta revisão | **0** | Não inventar tempos |
| Dano numérico individual alterado nesta revisão | **0** | Fórmulas originais requerem validação de versão |
| Motores de execução protegidos contra sobreposição pós-hit | **2** | `skill-system.mjs` e `skill-runtime.mjs` |

**Atenção:** valores históricos mencionados na solicitação (Mago, Xamã, Piercing Divino, Avalanche, Mestre das Sombras) são *hipóteses de pesquisa* até confirmar se “delay” significa intervalo entre inícios, recarga após animação ou janela adicional. Não substituir automaticamente as tabelas existentes por esses números.

### Pendências explícitas

1. Comparar a duração real de animação e os momentos de dano de cada habilidade com o cliente clássico da **mesma versão**.
2. Obter cooldown por nível de fonte histórica verificável para as 176 habilidades; os tempos comunitários isolados não fornecem 1.760 valores.
3. Validar progressões de hits/dano em todas as classes contra a fórmula e os arquivos originais, incluindo resistências e multiplicadores.
4. Verificar maturação histórica e seu impacto real sobre recarga/dano, antes de substituir a aproximação atual.
5. Realizar ensaio de combate real por classe/nível/arma contra monstros e jogadores, além dos testes automatizados de lógica.
6. Verificar o lado servidor e a persistência de cooldown durante troca de personagem e reinício; o motor local não constitui prova de autoridade completa do servidor.

### Fontes e graus de certeza

- Fonte primária de implementação: `data/skills.json`, `skill-system.mjs`, `skill-runtime.mjs`, `skill-damage.mjs`, `skill-action-timing.mjs` (**confirmado no código**).
- Guia oficial brasileiro: https://wiki.priston.com.br/index.php/Guia_Iniciante (**descrição e classificação das habilidades**, não tabela temporal completa).
- Fontes comunitárias já mapeadas neste documento (**parâmetros históricos candidatos; compatibilidade de versão ainda pendente**).
- Medições temporais comunitárias fornecidas no pedido (**não verificadas nesta revisão**).

O arquivo CSV já contém o inventário por habilidade/nível com fonte e grau de correspondência; **não tratar o campo “Confiança: exact” como prova de que o cooldown foi medido**.

## Revisão adicional: fontes de cooldown medidas e testes (28/10/2026)

A investigação encontrou duas medições comunitárias feitas por ChapeleiroLouco em janeiro de 2018 no fórum do Priston Tale Brasil:

- Mago: https://forum.priston.com.br/forum/guia-do-pristoniano/wiki/2275-skills-magos
- Xamã: https://forum.priston.com.br/forum/guia-do-pristoniano/guia-dos-morions/xam%C3%A3/2042-tutorial-completo-de-xam%C3%A3/page3

O relato define **delay bruto** como o intervalo medido a partir do início da skill. A espera adicional após a animação é `max(0, delay_bruto - duração_animação)`. A implementação aplica `max(delay_bruto, duração_animação, último_hit)` para permitir nova execução; o bloqueio até o último hit é uma proteção do motor, não um número histórico medido.

### Correções de cooldown com fonte

| Classe | Código | Antes | Novo (delay bruto) | Evidência | Cobertura por nível |
|---|---|---:|---:|---|---|
| Magician | SKILL_FLAME_WAVE | 8,5 s | **2,5 s** | Medição comunitária jan/2018 | O relato afirma todos os níveis |
| Shaman | SKILL_CURSE_LAZY | 10 s | **7,5 s** | Medição comunitária jan/2018 | Nível medido não especificado; extrapolação provisória |
| Shaman | SKILL_SOUL_MANACLE | 10 s | **17,5 s** | Medição comunitária jan/2018 | Nível medido não especificado; extrapolação provisória |
| Shaman | SKILL_CHASING_HUNT | 8 s | **5 s** | Medição comunitária jan/2018 | Nível medido não especificado; extrapolação provisória |
| Shaman | SKILL_JUDGEMENT | 1 s | **0,5 s** | Medição comunitária jan/2018 | Nível medido não especificado; extrapolação provisória |
| Shaman | SKILL_MOURNING_OF_PRAY | 4 s | **5 s** | Medição comunitária jan/2018 | Nível medido não especificado; extrapolação provisória |

Essas seis alterações estão em `skill-measured-cooldowns.mjs`, consumido pelos dois motores `skill-runtime.mjs` e `skill-system.mjs`. **Não são dados recuperados do cliente original**, e a equivalência com a versão clássica específica do VelluM ainda exige ensaios comparativos. O arquivo `data/classic-skill-audit.csv` permanece como **snapshot anterior**: seus campos de cooldown para esses seis códigos foram sobrescritos pelo módulo de medições na execução; o CSV não representa os seis valores atuais.

**Contagem:** 176 habilidades inventariadas; 6 habilidades com correção numérica de cooldown respaldada por medição comunitária; 1 dessas com abrangência de níveis declarada; 5 com extrapolação provisória; 170 sem novo cooldown validado nesta rodada. Nenhum valor de dano foi alterado. A correspondência com as tabelas públicas de dano/MP não deve ser confundida com confirmação dos tempos de recarga.

### Limitações de validação

Os testes automatizados por classe e nível verificam invocação, recursos, resultados e perfis, mas **não comprovam** a precisão de animações e dano quadro a quadro em 1.760 situações de jogo. Para validação histórica integral ainda são necessários: captura de vídeo com frame rate conhecido por nível e classe, comparação com cliente clássico da mesma versão, servidor autoritativo de combate, testes de equipamento e testes PvP. Não declarar os 176 cooldowns historicamente confirmados.
