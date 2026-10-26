# FREEston Tale 20 — administração das regras e avaliação para testes

## Conclusão de jogabilidade

É adequado para **alfa fechada com poucos jogadores de confiança**, usando contas de teste, backup do banco e o mesmo iniciador/endereço. Não é adequado abrir uma economia competitiva ao público neste estado. Presença, movimento, chat, coins, loja e skins compartilham o servidor; **combate, monstros, EXP e parte do inventário comum ainda dependem da simulação do navegador**. `publicLaunchReady:false` continua correto.

Esta revisão não recupera o servidor privado do Zephira e não certifica igualdade de balanceamento. Não foi possível testar todos os mapas, modelos, missões e combinações das 176 skills. A cobertura abaixo distingue fluxos exercitados de sistemas pendentes.

## Novas áreas do painel

O painel permanece em `/painel`, no endereço do jogo, com a mesma conta ADM. Jogador e GM não podem consultar ou alterar configurações administrativas.

- **Aging:** tabela das 20 etapas, +0 até +19, com probabilidades de +1, +2, −1, −2, quebra e manutenção. Mostra sucesso (+1 + +2) e soma de cada linha. Cada etapa precisa somar 100%. Há preenchimento de +1 a 100% e restauração visual do padrão do cliente; preencher exige clicar em Salvar para aplicar.
- **Drops:** chances independentes para ouro, poções, equipamentos abaixo de 80, equipamentos 80+ e exclusivos de boss. Há multiplicador da quantidade de ouro e exceções por boss. Vazio na exceção usa a chance geral.
- **Histórico de drops:** conta/personagem, código, nível do item, quantidade, monstro, mapa, horário, origem e situação. Filtros por conta, vários códigos, nível mínimo/máximo, período e situação. A paginação usa 100 registros; o resumo por conta considera o filtro inteiro, não apenas a página.
- **Monitoramento:** intervalo de nível de item, lista opcional de códigos, janela de minutos e quantidade de registros que gera alerta. Nível e códigos são combinados. Um aviso não bloqueia automaticamente uma conta.
- **Logs e alertas:** acesso negado, falha de login, solicitação GM, requisição/save recusado, variações anormais de estado, volume de drops e relatos de erro. O seletor de área inclui Aging, relatos de fabricação e compras de skins. O histórico administrativo mostra quem mudou regras/preços, com antes/depois nas configurações.
- **Loja de Skins:** 415 entradas de modelos de armas, escudos e armaduras/robes do catálogo público do cliente. São modelos cosméticos existentes, não novas artes exclusivas. Todos começam fora da venda; o ADM escolhe os modelos, nome, descrição, preço em coins e publicação. Preços inteiros de 0 a 1 bilhão. Pausar não retira propriedade já comprada.

Contas e produtos do Item Shop continuam nas abas anteriores. Configurações e registros ficam no SQLite da mesma `.local-data`. O banco é migrado sem substituir contas/personagens. A exclusão de uma conta também limpa suas novas propriedades/requisições e expira drops antigos ainda não recolhidos, evitando herança se o ID for criado novamente.

## Efeito real no jogo

### Aging

O fluxo normal envia a operação ao Python autenticado. O servidor verifica classe, personagem salvo, NPC/mapa/proximidade, equipamento, materiais, ouro e versão do snapshot. Sorteia com `secrets.SystemRandom` usando **a tabela vigente do painel**, desconta materiais/ouro, salva o resultado e registra a operação numa transação SQLite. Repetição da mesma chave com os mesmos dados recupera o resultado; dados diferentes são recusados.

O cliente bloqueia alterações de inventário enquanto aguarda, aplica o resultado confirmado e preserva as propriedades já roladas dos demais itens. Falhas de transporte são repetidas com a mesma chave. Se não conseguir confirmar, impede sobrescrever o estado até recarregar do servidor. O save de jogador também recusa aumento de Aging fora da operação confirmada, UIDs duplicados e quantidades inválidas. Isso não torna o restante do inventário completamente autoritativo.

O tooltip nativo passa a usar a tabela publicada, atualizada em até 5 segundos. O sorteio usa a configuração mais recente no momento da operação, mesmo se a janela ainda estiver mostrando uma tabela anterior. A tabela inicial reproduz `Fg/USt`, sem pedras, do cliente fixado. **Materiais continuam usando o perfil próprio do FREEston da revisão 19.** Pedras especiais, maturação e modificadores de eventos não foram completados.

### Drops

O navegador comunica um abate e o Python faz os sorteios de ouro e itens, registra o resultado e devolve os códigos/quantidades. Os itens 80+ são escolhidos apenas entre equipamentos elegíveis pelo nível do monstro (janela de até 20 níveis), preço/dados válidos e categorias de loot comum. Exclusivos não entram no conjunto comum. Bosses usam a associação de item e mapa existentes; Terceiro Olho não aumenta o sorteio exclusivo.

Ouro tem base `nível do monstro × 3 × multiplicador`, arredondada para baixo, e é creditado diretamente. Equipamentos aparecem no chão. “Gerado” não significa “recebido”: o cliente confirma o recolhimento; o servidor só aceita a conta dona do registro e evita nova confirmação por outra chave. **O recolhimento é uma declaração do cliente, não uma prova independente de entrega num inventário autoritativo.** Drops no chão continuam locais e não são restaurados como um mundo persistente ao reconectar.

A chance de 100% só garante uma categoria se existe item elegível para aquele monstro/mapa. Cada categoria é independente; portanto, pode haver ouro, poção, equipamento e exclusivo no mesmo abate. As taxas são regras deste servidor, não taxas oficiais recuperadas.

Os históricos começam nesta revisão; não há dados retroativos de loot da revisão 19. Testes de ADM/GM recebem origem `staff-test`, aparecem quando filtrados, mas são excluídos dos alertas automáticos de volume. Relatos normais usam `client-kill/server-roll`, com `combatVerified:false`: **o servidor ainda não comprova que o combate/abate ocorreu**. Há limite de 600 relatos por minuto por conta, além da proteção contra repetição da mesma requisição; um cliente adulterado ainda consegue produzir relatos com chaves novas. Não é uma solução completa contra bots ou trapaça.

### Skins

O cliente tem suporte nativo a troca visual: pacotes `skins`, seleção por categoria e aplicação de `weaponLook`, `shieldLook` e corpo. A loja FREEston integra esse recurso a compras reais em coins e propriedade permanente no SQLite. Arma/escudo/armadura reais não são substituídos e seus atributos são preservados. O visual precisa ser compatível com família e mãos do equipamento. Compra é por conta; seleção é por classe. Propriedade e seleção não dependem do save arbitrário do navegador.

No jogo, abra **Skins** ou `/skins`; no painel, publique as ofertas desejadas. Compra e equipamento são passos separados. O visual persistido é enviado também aos outros jogadores no mesmo mapa. Não foram adicionadas asas, emotes, importação de modelos novos ou uma implementação completa da customização privada do servidor original. A presença de uma entrada no catálogo não significa que seus 415 modelos foram individualmente renderizados e aprovados; foram exercitados modelos selecionados.

## Logs, segurança e limites

Os registros distinguem `server`, `staff-test`, `client-report` e `heuristic`. Erros do navegador e relatos de Mix/Force/limpeza permanecem identificados como relatos. Mudanças de ouro/nível/EXP fora de um limite geram indício para revisão; isso pode ser recompensa, comando de Staff ou bug. **Não há banimento automático nem alegação de detecção universal de hacks.**

Falhas de login não registram senhas; alterações administrativas também não exibem senha/hash. A administração exige sessão ADM, checa origem nas mutações e usa versões para evitar sobrescrever edição concorrente. Compras têm preço, saldo e propriedade verificados no servidor. Ainda faltam autoridade integral sobre combate/inventário comum, validação completa de progressão e correlação contra abuso sofisticado. Faça backup da `.local-data` antes de testes e troque credenciais conhecidas de teste antes de divulgar um endereço amplo.

## Cobertura e pendências

| Área | Verificação desta revisão | Limite para abrir ao público |
| --- | --- | --- |
| Painel, contas e papéis | CRUD, coins, bloqueio, sessão revogada, jogador/GM negados; desktop e largura móvel | Sem auditoria externa de segurança |
| Aging | Configuração 0/100%, materiais/tarifa, transação, repetição e proteção de save | Pedras/maturação/eventos parciais |
| Drops | 0/100%, ouro, exclusivo no mapa correto, 80+, histórico e recolhimento | Abate e inventário comum ainda dependem do cliente |
| Monitor e logs | Filtros, volume, permissões, registros de erro/rejeição e separação de origem | Alertas são indícios; não um anticheat completo |
| Skins | Publicação, preço, compra, propriedade, compatibilidade, persistência e aparência nativa | Catálogo completo não foi renderizado modelo a modelo |
| Loja premium | Cadastro/preço/pausa em tempo real, compra e ativação de oferta já removida | Não há integração de pagamento real |
| Inventário | Grade 12×6, organização real, duas bolsas, garra/escudo, conjuntos e reload | Dados comuns ainda não têm autoridade integral no servidor |
| Skills | 176 entradas validadas em testes; recargas nativas reexecutadas | Classes recentes e vários efeitos/pets ainda aproximados/parciais |
| NPCs | Aging testado; loja/baú/viagem/skills e Mix/Force/Nadia mantêm os fluxos existentes | Eventos, fabricação/reconstrução completa e leilão pendentes |
| Online | Presença/chat; aparência cosmética compartilhada | Monstros/combate/loot, party/trocas/PvP/BC não são multiplayer completo |
| Mapas e progressão | Testes em mapas selecionados, incluindo cidade e mapa de boss | Sem cobertura de todos os mapas nem certificação de balanceamento |
| Capacidade | Clientes de teste simultâneos em bancos isolados | Não houve ensaio de carga; limite de 100 presenças não é capacidade certificada |

Os cenários de boss usam atributos preparados para provocar a morte e verificar o pipeline; isso não mede tempo real de progressão nem equilíbrio do combate. Os testes de navegador estão em `scripts/freeston-controls-smoke.mjs`, além das regressões de painel, inventário e recargas. Use banco temporário novo ao executar a suíte de controles, pois ela muda regras, publica/comprar uma skin e gera loot de teste.

## Instalação e teste com convidados

Feche o iniciador antigo. Extraia `freeston-tale-20.zip` em outra pasta; copie `.local-data` e, opcionalmente, `.original-cache`. Guarde a pasta anterior como backup. Inicie `INICIAR.bat` ou `INICIAR_INTERNET.bat` e recarregue os navegadores dos jogadores. Esta revisão altera Python e exige esse reinício; alterações posteriores das regras/preços no painel não exigem reiniciar.

Abra o endereço do jogo com `/painel`, confira Aging/Drops e publique as skins desejadas. Crie contas de teste na aba Usuários. Convide inicialmente poucas pessoas de confiança, usando o mesmo endereço e mapa para se verem. Anote classe, mapa, ação e horário de cada problema para cruzar com os logs. Use o botão Link do jogo, `/painel` ou `LINK_DO_JOGO.txt` para copiar o endereço externo gerado pelo iniciador de Internet.

## Resultado da validação

- **82 testes Node + 74 testes Python aprovados (156)**. Cobrem regras, validação/autorização, transações e repetição, nível/mapa de loot, filtros/monitor, propriedade de skins, limpeza ao excluir conta, relógio de save e limites de relatos. ESLint passou nos módulos JavaScript alterados e scripts novos; `git diff --check` limpo.
- `freeston-controls-smoke.mjs` passou contra o **ZIP extraído**, em banco novo: painel ADM e dois clientes, Aging 0/100%, falha simulada de resposta sem cobrança duplicada, skin de arma comprada/equipada/persistida e enviada ao outro jogador, morte de boss com drops 0/100%, ouro, item 80+, filtro de histórico, recolhimento e permissões/logs. As abas foram verificadas também em largura de 390 pixels.
- `freeston-skins-smoke.mjs` aprovou `/skins`, compra e aplicação de armadura/robe pelo motor, fechamento completo do diálogo e persistência. Ataque mínimo/máximo, defesa e o código da armadura real permaneceram exatamente iguais antes/depois.
- Regressões de painel antigo, compra/pausa/ativação de premium, usuários/papéis/coins, inventário 12×6 e recargas nativas passaram novamente. O teste de recarga verificou Meteoro 17,5 s, Onda de Fogo 8,5 s e Terremoto nível 10 de 4 s.
- O histórico diferencia registros expirados de recolhidos. A página mais recente pode atualizar a cada 10 segundos; há opção de desligar a atualização automática, que pausa durante edição de filtros/leitura de detalhes e navegação para páginas antigas.

Nenhuma dessas verificações é certificação de segurança, auditoria autenticada do jogo oficial, teste de todos os recursos do catálogo ou ensaio de carga. As pendências da tabela continuam válidas antes de uma abertura pública.
