# Auditoria REA — VelluM Priston Tale

## Escopo e base

VelluM é o projeto do proprietário nesta missão. Fonte principal: `GabrielBarcellos1/VelluM-Priston-Tale`, branch `main`, base `ec7e2e01e0773ab30b223b915a4328757b8efe28`. A auditoria anterior de outro protótipo não valida este repositório.

A implementação corrente é Python padrão + SQLite + módulos ESM. `iniciar.py` serve uma adaptação em memória de um cliente público fixado por SHA-256; `session.mjs` substitui as respostas do servidor por uma sessão independente. O motor padrão de habilidades é `createRuntimeSkillSystem` (`rules.runtimeVersion = 1`); o motor legado permanece como fallback.

## Fontes e graus de certeza

1. Código e histórico deste repositório: confirmam a implementação e decisões do VelluM, não o comportamento oficial.
2. Cliente fixado: `/_app/index-uQp4-Rtd.js`, hash esperado `309822294b926934160b35d034a4b15e0985d539520a04dc2a684b06b9a155ac`. A ponte é específica dessa versão; não substituir o bundle sem reconstruir e testar a integração.
3. `data/skills.json.rules.sources`, `CLASSIC_SKILLS_AUDIT.md` e `audit/`: tabelas clássicas e observações históricas. Compatibilidade de versão e termos de uso precisam ser respeitados. Tabela de outra versão não é confirmação do servidor privado.
4. Referências solicitadas: https://www.priston.com.br/ , https://wiki.priston.com.br/ e https://pristontalewiki.dpdns.org/ . Nova afirmação numérica exige URL, condição e evidência; não extrapolar valores não confirmados.
5. REA disponível no ambiente: CLI 6.8.0 em `/workspace/work/rea-runtime/node_modules/rea-agents/scripts/rea.mjs`. Deve analisar artefatos/trechos focados como texto estático; a auditoria comum do código aberto usa leitura normal, conforme a skill REA.

## Investigação inicial executada

- Lidos README, HOSPEDAGEM, histórico de `main`, auditoria clássica, motor de skills, temporização nativa, início da simulação, persistência, políticas de classe e supervisor.
- Fonte clássica do cliente é referência separada do perfil VelluM. As adaptações e avisos de procedência são preservados.
- Identificado `schedule: (callback, ms) => setTimeout(callback, ms)` para impactos de skills em `session.mjs`. O vínculo entre o relógio de animação e esses impactos requer comparação com o artefato original.
- Ambos os motores debitam recursos antes de validar completamente `skillActionTiming`; há risco de débito parcial se a temporização for inválida. Reproduzir com teste antes da correção.
- A restauração de cooldown do runtime aceita campos sem a mesma validação de finitude/limite do fallback. Investigar cenários reais de restauração e não inventar recargas.

## Baseline reproduzível (antes de alterar código)

- `node --test tests/*.test.mjs`: 264 testes, 263 aprovados e 1 falha. A falha exige o antigo menu de três opções no comerciante, removido intencionalmente no commit `7e6202c`; não restaurar essa interface para satisfazer um teste obsoleto.
- `python -m unittest discover -s tests -p 'test_*.py'`: 182 testes, 1 falha e 1 erro. A política atual desativa jobs 9, 10 e 11, mas dois testes ainda pressupõem todas as classes/17 skins publicadas.
- Os testes Python usaram fixtures temporárias com contas sintéticas; nenhuma conta de produção foi utilizada.
- Navegador, login e combate visual ainda não foram executados nesta missão. Não confundir esses resultados com validação visual do jogo.

## Restrições preservadas

Não habilitar jobs 9/10/11, Tier 5 ou desafios de promoção removidos. Não alterar seeds locais, banco real, supervisor, DNS ou hospedagem. Não introduzir Cloudflare ou Lovable. Sem contorno de autenticação, download de executáveis não autorizados ou publicação de credenciais.

## Evidências novas

A preencher por ciclo: operação REA, artefato/hash, membros selecionados, evidência canônica, resultado e limites. Uma análise pendente não recebe o estado “Validado contra referência”.
