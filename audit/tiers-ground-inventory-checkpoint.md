# Checkpoint: tiers, chão e inventário

Promoção automática por nível: tiers 2/3/4 em 20/40/60 para todas as classes, com insígnia visual; desafios antigos de promoção deixam de ser exigidos. Demais quests preservadas.

Inventário: organização por busca limitada, preservando um arranjo válido como fallback; entrada de itens pode usar ambas as bolsas. Fixture cobre um arranjo que o algoritmo anterior considerava sem espaço.

Itens no chão: drop/pickup persistentes e atômicos, quantidade parcial, reserva de 15 segundos e expiração de 15 minutos, idempotência e revisão de inventário contra saves antigos. Itens vinculados permanecem protegidos.

Validação: 159 testes Node e 113 testes Python passaram em cópia isolada, com SQLite descartável. Visual: coroa e livro Paladino no nível 20; gesto de largar e separação 5→3+2 confirmados. A visibilidade/recolha do item no cliente 3D ainda precisa de investigação; não considerar o fluxo visual concluído.

Checkpoint em branch separada; sem atualização da produção. Nenhum banco, credencial, cache ou script temporário de fixture integra o commit.
