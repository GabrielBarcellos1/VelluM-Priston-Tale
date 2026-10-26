# Auditoria do cliente público Zephira

Gerado em 2026-10-23T01:17:00.540Z. Cliente SHA-256: 309822294b926934160b35d034a4b15e0985d539520a04dc2a684b06b9a155ac.

Escopo: código público estático, metadados públicos e adaptador local. Sem acesso ao backend privado ou auditoria autenticada do jogo oficial. A contagem confirma associação visual por classe; não comprova regras privadas de combate.

## Classes e habilidades

| ID  | Classe         | Quantidade | Habilidades                                                                                                                                                                                                                          |
| --- | -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Fighter        | 16         | Melee Mastery, Fire Attribute, Raving, Impact, Triple Impact, Brutal Swing, Roar, Rage Of Zecram, Concentration, Avenging Crash, Swift Axe, Bone Crash, Destroyer, Berserker, Cyclone Strike, Boost Health                           |
| 2   | Mechanician    | 16         | Extreme Shield, Mechanic Bomb, Poison Attribute, Physical Absorb, Great Smash, Maximize, Automation, Spark, Metal Armor, Grand Smash, Mechanic Weapon, Spark Shield, Impulsion, Compulsion, Magnetic Sphere, Metal Golem             |
| 3   | Archer         | 16         | Scout Hawk, Shooting Mastery, Wind Arrow, Perfect Aim, Dion's Eye, Falcon, Arrow Of Rage, Avalanche, Elemental Shot, Golden Falcon, Bomb Shot, Perforation, Recall Wolverine, Evasion Mastery, Phoenix Shot, Force Of Nature         |
| 4   | Pikeman        | 16         | Pike Wind, Ice Attribute, Critical Hit, Jumping Crash, Ground Pike, Tornado, Weapon Defense Mastery, Expansion, Venom Spear, Vanish, Critical Mastery, Chain Lance, Assassin Eye, Charging Strike, Vague, Shadow Master              |
| 5   | Atalanta       | 16         | Shield Strike, Farina, Throwing Mastery, Vigor Spear, Windy, Twist Javelin, Soul Sucker, Fire Javelin, Split Javelin, Triumph Of Valhalla, Lightning Javelin, Storm Javelin, Hall Of Valhalla, X Rage, Frost Javelin, Vengeance      |
| 6   | Knight         | 16         | Sword Blast, Holy Body, Physical Training, Double Crash, Holy Valor, Brandish, Piercing, Drastic Spirit, Sword Mastery, Divine Inhalation, Holy Incantation, Grand Cross, Sword Of Justice, Godly Shield, God Bless, Divine Piercing |
| 7   | Magician       | 16         | Agony, Fire Bolt, Zenith, Fire Ball, Mental Mastery, Water Tornado, Enchant Weapon, Dead Ray, Energy Shield, Diastrophism, Spirit Elemental, Dancing Sword, Fire Elemental, Flame Wave, Distortion, Meteorite                        |
| 8   | Priestess      | 16         | Healing, Holy Bolt, Multispark, Holy Mind, Meditation, Divine Lightning, Holy Reflection, Grand Healing, Vigor Ball, Resurrection, Extinction, Virtual Life, Glacial Spike, Regeneration Field, Chain Lightning, Summon Muspell      |
| 9   | Assassin       | 16         | Stinger, Running Hit, Dual Sword Mastery, Wisp, Venom Throne, Alas, Soul Shock, Attack Mastery, Sore Sword, Beat Up, Inpes, Blind, Frost Wind, Fatal Mastery, Polluted, Pasting Shadow                                               |
| 10  | Shaman         | 16         | Dark Bolt, Dark Wave, Curse Lazy, Inner Peace, Spiritual Flare, Soul Manacle, Chasing Hunt, Advent Migal, Rain Maker, Land Of Ghost, Haunt, Scratch, Recall Bloody Knight, Judgement, Advent Midranda, Mourning Of Pray              |
| 11  | Martial Artist | 16         | Low Kick, Strength Mastery, Double Backspin Blow, Hyper Straight, Rage Up, Patriot, Rush Elbow, Stamina Mastery, Instant Bulk Up, Tiger Cannon, Typhoon, Jumping Heel Kick, Combination, Steelers, Body Check, War Cry               |

## Mapas, missões, monstros e serviços

Catálogo local capturado em 2026-10-22T19:52:42.268094+00:00: 48 campos, 46 mapas descritos na wiki, 200 monstros, 137 NPCs, 305 missões, 38 estágios de spawn e 28 entradas de agenda de boss. Contagens são inventário de dados; não significam que todos os mapas ou missões foram testados. Hashes de consultas públicas recentes estão em public-sources.json.

| Serviço      | NPCs | Situação local                                      |
| ------------ | ---- | --------------------------------------------------- |
| aging        | 1    | Pendente: serviço privado não reconstruído          |
| bellatra     | 3    | Pendente: serviço privado não reconstruído          |
| charity      | 2    | Pendente: serviço privado não reconstruído          |
| clan         | 2    | Pendente: serviço privado não reconstruído          |
| event        | 2    | Pendente: serviço privado não reconstruído          |
| force        | 3    | Pendente: serviço privado não reconstruído          |
| itemshop     | 2    | Pendente: serviço privado não reconstruído          |
| levelRanking | 2    | Pendente: serviço privado não reconstruído          |
| manufacture  | 1    | Pendente: serviço privado não reconstruído          |
| mix          | 1    | Pendente: serviço privado não reconstruído          |
| mixreset     | 2    | Pendente: serviço privado não reconstruído          |
| post         | 2    | Pendente: serviço privado não reconstruído          |
| quest        | 6    | Parcial: interpretador de missões local             |
| shop         | 25   | Implementado com estoque público e economia local   |
| skill        | 2    | Parcial: catálogo por classe e fórmulas locais      |
| smelting     | 1    | Pendente: serviço privado não reconstruído          |
| teleport     | 7    | Implementado com custo local                        |
| warehouse    | 7    | Implementado com três páginas locais                |
| wing         | 1    | Teleporte local; regras completas de asas pendentes |

## Evidência e limites

Regras verificáveis no cliente: Class numeric IDs; 16 visual skill entries per class; Dead/locked/air/village casting restrictions; MP/stamina and cooldown checks; Class-specific learned skill selection; Learning via master with points, level and predecessor checks.

Não recuperado: Server skill IDs and full catalogs; Exact damage/healing/buff formulas; Weapon restrictions per skill; Mana/stamina/cooldown tables per level; Rank quests and full mastery rules; Official loot probabilities and complete boss pools; Party/PvP/social/shared-world authority. Custos, IDs e fórmulas atuais são locais, não oficiais.

Ainda pendente: Shared multiplayer world; Player trade and clans; NPC aging/mix/manufacture; Mail/auctions/events; Player-targeted resurrection and party healing. Portanto esta implementação não é idêntica ao servidor oficial.

Acesso externo: Cloudflare API and alternative tunnel domains returned network policy HTTP 403 in this environment; no verified live URL.

O arquivo zephira.json contém detalhes reproduzíveis. As respostas públicas recentes e seus hashes ficam em public-sources.json.
