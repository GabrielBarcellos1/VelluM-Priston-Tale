# Fila contínua — VelluM

## P0 — preservar dados e decisões

- Trabalhar em `main` com lease da revisão esperada; não sobrescrever trabalho concorrente.
- Preservar `.local-data`, SQLite, seeds locais, geração de personagens, inventários e hospedagem.
- Manter desativados jobs 9/10/11 e Tier 5; manter promoção simplificada e evolução automática de mapa escolhidas pelo projeto.

## P1 — próxima tarefa exata

**Completar o teste real de equipamento, troca de personagem e logout/login.**

Usar exclusivamente SQLite/cache descartáveis. Confirmar retirar/recolocar arma e persistência do UID; criar um segundo personagem ativo; voltar ao primeiro; sair e entrar na conta. Registrar ações realmente executadas, diferenças encontradas e próximos passos. A sondagem `gmNpcInfo` já foi corrigida e testada no ciclo 3.

Na sequência:

1. Ciclos 1–3 corrigiram validação atômica, restauração de cooldown, agenda no relógio nativo e spam de NPC. Preservar overrides e os 278 testes Node aprovados.
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
