# Investigação das progressões de skills — 25/10/2026

## Resultado e limites

O catálogo contém 176 skills em 11 classes, com dez níveis por skill. A auditoria avalia os 1.760 estados usando os atributos de referência explicitados no JSON gerado. Isso verifica o comportamento da implementação local; não valida o balanceamento contra o servidor pweb.

Há 128 tabelas oriundas do cliente clássico público e 48 skills sem essas tabelas específicas: Assassina, Xamã e Marcial. A avaliação identifica 42 habilidades de ataque que ainda entram na fórmula de potência genérica local, incluindo habilidades com tabelas incompletamente interpretadas nas classes clássicas. Estes números não significam 128 skills equivalentes ao pweb: os valores clássicos também podem diferir do servidor de referência.

## Evidência do site de referência

- Página consultada: https://pweb.world/.
- JavaScript atual observado no HTML: /_app/index-B8YUJmR7.js, 7.131.416 bytes, SHA-256 f9489d6c6c47152598787a7418bc470ce392a63997785512efdb8933e9650fb1.
- O pacote local utiliza outro cliente fixado, /_app/index-uQp4-Rtd.js, SHA-256 309822294b926934160b35d034a4b15e0985d539520a04dc2a684b06b9a155ac. Ele não foi substituído: a ponte da cópia depende dessa versão.
- O cliente recebe informações de habilidades e dados adicionais em mensagens do servidor e as reúne para a interface. Os valores de dano e recarga recebidos não constituem uma tabela pública completa presente no JavaScript.
- O /api/wiki público foi consultado e não apresentou uma exportação de balanceamento de skills.
- A análise sintática do cliente atual percorreu 2.101.855 nós. Foram encontradas 41 matrizes numéricas de dez entradas, incluindo parâmetros de geometria de ataques, e um registro com 33 geometrias de área/linha. Essas geometrias não são uma exportação de dano, custos e recargas das 176 skills.
- Foram observadas as oito primeiras skills do Lutador na interface, com valores de nível atual e próximo nível quando disponíveis. Não foram consumidos pontos de skill nem criados/excluídos personagens. A seleção de ataque foi restaurada ao ícone que estava selecionado.

Exemplos observados: Raiva mostra bônus de 3%/6% nos níveis 1/2, enquanto a tabela clássica local contém 13%/16%. Impacto Triplo mostra 7%/10%, contra 35%/40% na tabela local. Mestre das Armas mostra 6%/10%, coincidindo com os dois primeiros valores da tabela clássica. Isso impede aplicar uma redução global ou uma única progressão linear como solução comprovada para todas as skills.

## Uso de REA e outras fontes

Foi consultado https://github.com/morluto/rea e executado REA CLI 6.7.0. A análise integral do JavaScript de 7 MB atingiu o limite de 90 segundos e reteve observações parciais. Uma análise direcionada aos dois módulos locais de skills concluiu sem falhas de parsing: 4.867 nós, 19 achados; evidência ev_6af11992b24a2b945fbed90d0581e453cf8848f9cf1c15bbb504839052842b3c. A análise completa por Acorn complementou o inventário do cliente atual. Nenhum desses resultados contém o código do servidor privado de referência.

Foram examinadas as fontes clássicas já referenciadas no catálogo, em yweenzy/pristontale-1, revisão 299c615ed9a13f9ac394c6d0ac32f19e126b308d, e fontes públicas de outros servidores. Seus valores não foram tratados como balanceamento do pweb. A fonte clássica sinSkill.cpp identifica Ravind_Speed como quantidade de acertos na descrição da skill.

## Correções no motor local

- A comparação entre nível atual e próximo nível de passivas e buffs passa a usar os efeitos efetivos avaliados em ambos os níveis.
- A descrição de dano passa a usar o mesmo perfil do combate: faixas de dano de magias, adições fixas, bônus percentual, quantidade de acertos, taxa de ataque e modificadores de crítico. Foi removida a linha genérica de potência que podia divergir do cálculo utilizado.
- Raiva passa a utilizar os 2/3/4 acertos definidos na tabela existente, conforme o nível, em vez de executar sempre um acerto. Tabelas explícitas hitCount são aceitas pelo avaliador de ataques para outras classes.
- Não foram extrapolados níveis 3–10 a partir de dois valores observados no site. As tabelas numéricas de balanceamento existentes foram preservadas. Os exemplos observados ficam separados das regras em execução.

## Verificação reproduzível

node --test tests/skills-progression.test.mjs

Quinze testes passam, abrangendo as onze classes em dez níveis e regressões específicas de próximos efeitos, quantidade real de acertos, tabelas explícitas de múltiplos golpes, dano fixo e faixas de dano de magia. Verificações computacionais não substituem uma comparação de cada skill com o servidor de referência.

Para exportar a matriz local:

node ops/audit-skills.mjs matriz.json

## O que falta para equivalência completa

Uma fonte completa dos valores do servidor de referência por skill e nível: exportação/configurações do próprio servidor, documentação de seu balanceamento ou observações suficientes de níveis e classes acessíveis pela interface. O cliente público e a conta observada, com apenas um Lutador nível 27, não forneceram as 1.760 combinações. Uma fonte de outro servidor pode fundamentar um perfil Priston próprio, mas exige decisão explícita sobre qual balanceamento adotar e não demonstra equivalência com pweb.

