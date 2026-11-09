# Progresso Codex — VelluM

## Missão ativa

Reconstrução fiel do Priston Tale clássico no repositório VelluM, com REA e preservação das personalizações. Branch: `main`. Base auditada: `ec7e2e01e0773ab30b223b915a4328757b8efe28`.

## Ciclo 0 — auditoria inicial

- Confirmados acesso de escrita e arquitetura no repositório correto.
- Lidos histórico, execução Python/SQLite, supervisor e auditorias existentes.
- Confirmados jobs 9/10/11 desativados e ausência deliberada de Tier 5; promoção simplificada e auto-progressão de mapas preservadas.
- Executado baseline Node: 264 testes, 263 aprovados, 1 falha de expectativa obsoleta de menu de comerciante.
- Executado baseline Python: 182 testes, 1 falha (17 skins versus 14 publicadas) e 1 erro (kits de classes desativadas).
- Nenhuma alteração de jogabilidade, banco, seed, host ou produção neste ciclo.
- Criados os quatro documentos solicitados. A matriz cobre os sistemas relevantes e separa implementação de validação contra referência.

## Continuidade imediata

1. Finalizar investigação do relógio de animação do cliente fixado com REA.
2. Reproduzir e corrigir a validação de tempos antes de debitar MP/RES nos dois motores.
3. Comparar timeouts de impacto com o relógio nativo e corrigir cancelamentos sem modificar tabelas numéricas não verificadas.
4. Validar restauração de cooldown e estados por personagem.
5. Atualizar os testes obsoletos segundo as decisões reais do histórico, sem reativar sistemas removidos.

## Execução e publicação

Checks locais: `node --test tests/*.test.mjs`, `python -m unittest discover -s tests -p 'test_*.py'`, sintaxe Python/ESM e JSON. Teste visual exige executar `iniciar.py` em dados/cache de teste e navegador compatível; não usar contas de produção.

O supervisor documentado busca `main` periodicamente. Alterações só em ESM não exigem reiniciar o Python, mas abas abertas precisam recarregar. Não executar supervisor/túnel no ambiente de desenvolvimento. Não migrar para a hospedagem do protótipo anterior.

## Limites registrados

Não houve login/jogo em navegador nesta missão até este registro. Baseline de testes não comprova fidelidade visual ou tabelas privadas. Nenhuma credencial ou dado real deve ser acrescentado ao repositório público.
