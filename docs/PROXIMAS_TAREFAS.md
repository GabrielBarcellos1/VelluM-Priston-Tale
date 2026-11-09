# Fila contínua — VelluM

## P0 — preservar dados e decisões

- Trabalhar em `main` com lease da revisão esperada; não sobrescrever trabalho concorrente.
- Preservar `.local-data`, SQLite, seeds locais, geração de personagens, inventários e hospedagem.
- Manter desativados jobs 9/10/11 e Tier 5; manter promoção simplificada e evolução automática de mapa escolhidas pelo projeto.

## P1 — próxima tarefa exata

**Investigar e corrigir o ciclo de execução das habilidades.**

Arquivos: `session.mjs`, `skill-runtime.mjs`, `skill-system.mjs`, `skill-action-timing.mjs`, `native-rules.mjs`, testes de skills. Primeiro criar regressões para tempo inválido que consome recursos e impactos pendentes que sobrevivem a pausas, morte ou troca de contexto. Conferir o cliente público fixado por hash usando análise estática REA. Não trocar o bundle, não mudar cooldown/dano por suposição.

Na sequência:

1. Sanitizar cooldown restaurado no runtime com casos NaN/Infinity/expiração e preservar overrides intencionais.
2. Corrigir baseline: comerciante direto (commit `7e6202c`) e testes de skins/kits que ignoram `DISABLED_JOBS`.
3. Testar login, criação, combate, skill, equipamento, troca de personagem, logout/login e persistência numa base descartável.
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
