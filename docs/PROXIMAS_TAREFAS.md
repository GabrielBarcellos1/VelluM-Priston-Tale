# Fila contínua — VelluM

## P0 — preservar dados e decisões

- Trabalhar em `main` com lease da revisão esperada; não sobrescrever trabalho concorrente.
- Preservar `.local-data`, SQLite, seeds locais, geração de personagens, inventários e hospedagem.
- Manter desativados jobs 9/10/11 e Tier 5; manter promoção simplificada e evolução automática de mapa escolhidas pelo projeto.

## P1 — próxima tarefa exata

**Auditar a transição Bamboo/Acácias e o bloqueio de retorno local.**

Arquivos: `map-travel.mjs`, `session.mjs`, testes de viagem e estabilização. Investigar `forestSeamArrival` e o bloqueio de 2.200 unidades. Comparar membros nativos de viagem/colisão do cliente fixado por SHA com REA antes de alterar a geometria ou a recuperação local. Reproduzir a fronteira com conta/base descartáveis, auto-mapa desativado só nessa fixture. Preservar rollback e dados. Se não houver evidência suficiente, registrar incerteza e avançar para outra divergência verificável.

REA já executado para essa etapa: `ev_67dfd39d686a70ccec4b572af143ea82a133aeb596d34085055920adefa17340`. Próxima ação exata: abrir os mapas 0/1 na fixture, registrar posição/altura, `currentStage` e a saída de `stagePicker` durante a travessia. O nativo usa seis observações ou 96 unidades; isso não autoriza remover o workaround sem reprodução.

Na sequência:

1. Ciclos 1–3 corrigiram validação atômica, restauração de cooldown, agenda no relógio nativo e spam de NPC. Preservar overrides e os 278 testes Node aprovados.
2. Login, criação, caminhada, NPC, aprendizado/recarga da página e impacto de skill executados em Chromium descartável; não confundir com comparação de dano oficial.
3. Equipamento, troca Cavaleiro/Mago/Cavaleiro, logout e novo login executados em base descartável. Testar depois arraste visual, reconexão por perda de rede e toque mobile. Python: 182 aprovados no ciclo 2; sem alteração Python posterior.
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
