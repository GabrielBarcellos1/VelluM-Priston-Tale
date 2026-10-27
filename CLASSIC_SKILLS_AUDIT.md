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
