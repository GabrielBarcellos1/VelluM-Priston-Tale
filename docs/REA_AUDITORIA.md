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
- No baseline, navegador, login e combate visual ainda não haviam sido executados. A cobertura posterior está registrada nos ciclos abaixo; não confundir esses resultados com validação de fidelidade do jogo.

## Restrições preservadas

Não habilitar jobs 9/10/11, Tier 5 ou desafios de promoção removidos. Não alterar seeds locais, banco real, supervisor, DNS ou hospedagem. Não introduzir Cloudflare ou Lovable. Sem contorno de autenticação, download de executáveis não autorizados ou publicação de credenciais.

## Evidências novas

A preencher por ciclo: operação REA, artefato/hash, membros selecionados, evidência canônica, resultado e limites. Uma análise pendente não recebe o estado “Validado contra referência”.

### Evidência focada do relógio de combate

- Artefato público baixado e SHA-256 conferido com o pin, sem executar o bootstrap durante a análise.
- REA 6.8.0, operação `analyze-javascript-application`, dez arquivos selecionados de membros/constantes do cliente.
- Evidência canônica: `ev_eb98c6eef291ac837c0be4c71f7c0396ea97af271be55e475d2dcb682b3bfcca`.
- `eA.tick` incrementa o relógio do jogo em `Yd = 1/70`; `eA.onSkillFx` relaciona animação/travas à duração e ao relógio do jogo. `frameStep` limita vários avanços visuais a 0,1 s.
- Essa evidência fundamenta investigar a agenda de impactos. Não revela dano privado nem valida todas as skills. O relógio e seus consumidores ainda requerem teste de integração.
- Correção do ciclo 1 validada por testes locais: nenhuma alteração numérica das tabelas, apenas atomicidade e validação do estado restaurado.

### Aplicação e limites — ciclo 2

- A agenda de impactos agora acompanha o tick nativo, não `setTimeout`. A trava da ação também usa esse relógio; cooldown salvo mantém sua semântica anterior.
- Inspeção adicional de `va0.hiddenStep` mostrou que o cliente também executa ticks no caminho de página oculta. Não foi inventada uma regra de cancelamento por `document.hidden`.
- Sete testes da agenda cobrem ordenação, uma única execução, troca de contexto, morte durante callback, cleanup do wrapper, montagem apenas no jogo e isolamento de erros. Dois testes dos motores cobrem relógios separados e cancelamento sem perda de estado.
- Integração real observada em Chromium com a habilidade 601, Cavaleiro, alvo Cão Abelha no mapa 17. Login, criação, caminhada e aprendizado também executados. Evidência resumida em `docs/evidencias/combate-integracao-local.json`.
- Não foi verificado o dano numérico contra um servidor clássico nem o conjunto de animações/habilidades. O resultado é **Testado** para a integração local do relógio, sem certificação geral de fidelidade.

### Correção de integração do HUD Staff — ciclo 3

Consulta nativa `gmNpcInfo` observada em execução ao aproximar NPC. O adaptador não oferece os metadados desse serviço; a correção elimina apenas os avisos de sondagem e gravações inúteis. Regressão com o handler real e navegador confirmaram 15 consultas sem avisos. Não classificar o serviço GM como implementado nem atribuir ao REA uma recuperação de metadados privados.

### Investigação seguinte — transição de mapas

- Mesmo cliente público fixado; extraídos estaticamente 11 membros de `eA` sobre mapas/warp, mais `al0`, `ol0` e constantes `il0=96`, `nl0=6`. REA analisou 14 arquivos focados, sem bootstrap.
- Evidência canônica: `ev_67dfd39d686a70ccec4b572af143ea82a133aeb596d34085055920adefa17340`; bundle completo externo `map-travel-evidence-v2.json`.
- `checkField` verifica terrenos a cada 0,5 s do jogo, dentro dos bounds, usando diferença entre altura do chão e personagem. A decisão passa pelo estabilizador `stagePicker.next`, depois emite pacote `field`.
- O estabilizador mantém candidato, posição e contagem; confirma após seis observações do candidato ou deslocamento de 96 unidades desde sua seleção. Em empate de altura, `ol0` prefere o estágio atual.
- O VelluM adiciona reposicionamento no spawn Bamboo/Acácias e bloqueia o retorno enquanto estiver a menos de 2.200 unidades da chegada. É um desvio local confirmado, não regra clássica recuperada.
- Não removido nesta etapa: a fronteira ainda exige reprodução real, comparação de alturas/estágios e verificação de rollback. Constantes do cliente não provam que o adaptador pode dispensar o workaround sem causar bounce.
