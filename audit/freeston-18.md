# FREEston Tale 18 — recarga das habilidades e comparação da pesquisa

## Correção do defeito

A revisão 17 definia `cooldown=0` para todas as 128 habilidades importadas, incluindo habilidades ativas que precisam de recarga. A trava da animação continuava funcionando, mas não substitui o tempo de recarga. Isso também ocultava a barra nativa: o cliente fixado usa `skillInfo.cooldown` como denominador da barra e os pacotes `skillCooldown` para o tempo restante.

Esta revisão recupera `RequireMastery[0/1]` da tabela brasileira clássica e reproduz os arredondamentos da barra em `cSKILL::CheckSkillMastery`, executada por `MainSub` a 70 ticks/s. São 35 unidades de barra. Para cada skill e nível:

1. `M = clamp(base + incremento × nível − floor(proficiência / 100), 1, 70)`.
2. `incrementoBarra = floor(70 / M)`.
3. `ticksPorUnidade = max(1, floor(35 / incrementoBarra))`.
4. `recarga = 35 × ticksPorUnidade / 70` segundos.

A implementação mantém a política local já existente de skills treinadas a 100% (`proficiência=10000`). Não introduz uma simulação de treinamento de proficiência. A função aceita proficiência para testar a fórmula; a evolução dessa proficiência em jogo permanece pendente.

O bloqueio por animação e a recarga específica transcorrem em paralelo. O intervalo efetivo é o maior entre ambos. Outra skill pode ser usada quando a animação acabar, mesmo enquanto a primeira recarrega. ADM/GM continuam respeitando esse tempo; invencibilidade não ativa `noDelay`.

Os tempos e a barra são publicados no cliente nativo, com a recarga no tooltip. O tempo restante é sincronizado periodicamente e ao voltar à aba; a expiração limpa a barra mesmo se o relógio de renderização tiver atrasado por perda de FPS. Tentativas durante a espera são rejeitadas antes de cobrar MP/RES. O save armazena vencimento e duração das recargas ativas; ao recarregar a página, restaura apenas o tempo restante, sem recomeçar o contador inteiro.

## Comparação enviada pelo usuário

`reference-skills-18.json` preserva o JSON enviado, identificado como referência histórica não validada. `scripts/compare-skill-reference.py` cruza as 128 habilidades/1280 níveis por classe, tier e posição, mantendo nomes, valores originais e SHA-256 do arquivo. O resultado completo está em `skill-comparison-18.json`.

- Há **630** níveis sem atraso informado, **252** com atraso desconhecido e **398** com informação histórica não validada. `?`, `??` e campos ausentes permanecem desconhecidos; não viram zero.
- Foram comparados custos de MP/RES, nível requerido e bônus percentual de dano quando o rótulo é inequívoco: **3531 campos concordam e 239 divergem**. Por isso a pesquisa não foi tratada como um patch único e oficial.
- Exemplo de divergência: Mestre das Armas nível 5 tem 22% na pesquisa e 21% na fonte clássica fixada. Essa revisão não altera o dano por causa desse conflito.
- Expressões de dano com Min/Max/Int/LV, taxa de acerto, duração, buffs e número de hits permanecem na comparação para revisão; não foram convertidos em multiplicadores novos.

| Habilidade | Pesquisa enviada | Regra clássica reconstruída, 100% | Decisão |
| --- | --- | --- | --- |
| Impacto | 0 s nos primeiros níveis; depois desconhecido | 0,5 s no nível 1; 8,5 s no nível 10 | Usar regra recuperada + trava de animação |
| Terremoto | 1,66–4 s conforme nível | 1,5 / 2 / 2,5 / 2,5 / 2,5 / 3,5 / 3,5 / 3,5 / 4 / 4 s | Preservar diferença de arredondamento/build |
| Onda de Fogo | 8 s | 8,5 s | Usar arredondamento do código clássico |
| Meteoro | 17 s | 17,5 s | Restaurar recarga longa |
| Espada Dançante | 5–3 s | Recarga de conjuração: 17,5 s | 5–3 s é `Dancing_Sword_AttackDelay`, não recarga de conjuração |
| Invocar Anjo/Muspell | 7–4 s | Recarga própria calculada por `RequireMastery` | 7–4 s é `Summon_Muspell_Attack_Delay` |
| Falcão | 50–140 s no campo atraso | Campo não validado como recarga | Não importar esses números como espera de conjuração |

As skills com atraso histórico 0 s continuam tendo animação e a trava mínima reconstruída; não ficam instantâneas. A duração de um buff não vira sua recarga. Os intervalos dos pets foram classificados na comparação; esta revisão não completa a implementação de Espada Dançante/Muspell nem afirma que todos os pets já atacam como no original.

## O que foi possível comparar com o Zephira

Foi inspecionado o cliente público fixado que usamos: barra nativa, campo `cooldown`, pacotes de tempo restante e bloqueio de repetição. A configuração privada do servidor Zephira não foi recuperada. A nova tentativa de consulta pública retornou HTTP 403 para pweb.world e sua wiki. As páginas comunitárias citadas no arquivo também ficaram indisponíveis nesta execução; o material enviado foi comparado com o código clássico público, com URLs e hashes já registrados em `data/skills.json.rules.sources`.

**Os tempos acima são reconstruídos do Priston clássico e não constituem validação do balanceamento atual do Zephira.** As 48 habilidades das classes 9–11 continuam com recargas locais não nulas, identificadas como `local-fallback`; a pesquisa cobre somente oito classes. `publicLaunchReady:false` permanece.

## Atualização

Feche a versão anterior, extraia `freeston-tale-18.zip` em outra pasta, copie `.local-data` e, opcionalmente, `.original-cache`. Execute `INICIAR.bat` ou `INICIAR_INTERNET.bat`. A inclusão do módulo novo exige reiniciar o Python uma vez. Contas e habilidades já aprendidas são preservadas; as recargas zeradas antigas deixam de ser utilizadas.

## Validação executada

- 65 testes JavaScript e 51 testes Python passaram; ESLint dos módulos alterados e `git diff --check` sem erros.
- Testes cobrem recargas por skill e nível, os arredondamentos clássicos, tempo de pet separado, campos desconhecidos, bloqueio sem consumo de recursos, outra skill após a animação, ADM sem bypass e restauração do tempo restante com relógio de parede.
- Chromium real, usando o cliente nativo: Meteoro 17,5 s, Onda de Fogo 8,5 s e Terremoto nível 10 com 4 s; barra e tooltip publicados, tentativa de repetição rejeitada, outra skill utilizável, repetição liberada após expiração. O mesmo cenário passou a partir dos arquivos extraídos do ZIP.
- Pacote íntegro com o módulo e auditoria novos, sem banco de contas em uso nem cache.

Essas verificações são da implementação local. Não representam teste autenticado nem validação das recargas privadas do servidor Zephira.
