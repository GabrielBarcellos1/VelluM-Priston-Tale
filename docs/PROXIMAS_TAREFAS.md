# Fila contínua — VelluM

## P0 — preservar dados e decisões

- Trabalhar em `main` com lease da revisão esperada; não sobrescrever trabalho concorrente.
- Preservar `.local-data`, SQLite, seeds locais, geração de personagens, inventários e hospedagem.
- Manter desativados jobs 9/10/11 e Tier 5; manter promoção simplificada e evolução automática de mapa escolhidas pelo projeto.

## P1 — próxima tarefa exata

**Corrigir avisos repetidos da sondagem nativa de NPC `gmNpcInfo`.**

Reprodução: aproximar-se de um NPC com conta de teste Staff; o cliente consulta metadados e o handler genérico gera avisos repetidos. Criar regressão do handler, tratar a consulta passiva sem inventar resposta/funcionalidade GM e confirmar no navegador. Arquivo principal: `session.mjs`.

Na sequência:

1. Ciclos 1 e 2 corrigiram validação atômica, restauração de cooldown e agenda no relógio nativo. Preservar overrides e os 276 testes Node aprovados.
2. Login, criação, caminhada, NPC, aprendizado/recarga da página e impacto de skill executados em Chromium descartável; não confundir com comparação de dano oficial.
3. Completar equipamento, troca de personagem, logout/login e persistência numa base descartável; repetir Python e registrar resultado.
4. Auditar o workaround Bamboo/Acácias: reposicionamento e bloqueio de retorno de 2.200 unidades; comparar com colisão/estabilização nativas antes de alterar.

## P2

- Auditar HUD e arte da seleção contra a versão de referência, preservando personalizações aprovadas.
- Revisar áreas/limites e cancelamento de multigolpes por classe, Tiers 1–4, níveis 1–10.
- Completar matrizes de parâmetros com fonte e grau de certeza, separando alternativas locais.
- Cobrir reconexão/persistência e efeitos de grupo sem afirmar autoridade MMO inexistente.

## P3

- Consolidar instruções de execução (há caminhos históricos `original-local/` no README).
- Documentar diferenças de versão/licença dos artefatos e melhorar comandos reprodutíveis de auditoria.

Ao bloquear uma tarefa, registrar motivo, evidência e dependência necessária; avançar para tarefa independente. Não publicar mudança funcional sem checks apropriados.
