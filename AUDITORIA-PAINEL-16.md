# FREEston Tale 16 — painel vinculado ao servidor

## Entrega

Painel responsivo em `/painel`, usando autenticação e sessão do jogo, exclusivo para papel `admin`. As páginas são servidas pelo próprio iniciador Python; não há banco ou login externo. O menu do jogo continua apontando ao mesmo painel.

| Área               | Comportamento                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visão geral        | Contas, contas Staff, sessões autenticadas, bloqueios e produtos publicados                                                                        |
| Loja               | Adicionar itens conhecidos, editar nome/descrição/preço, publicar/pausar, arquivar/restaurar; busca e filtros                                      |
| Usuários           | Criar jogador/GM/ADM, editar papel, redefinir senha, bloquear/desbloquear, encerrar sessões, conceder coins e excluir conta com confirmação por ID |
| Inspeção de contas | Personagens salvos, classe, nível, ouro, saldo e quantidade de sessões válidas                                                                     |
| Histórico          | Últimas 200 ações do painel, administrador e alvo; nenhum valor de senha ou hash                                                                   |
| Operação           | Mesmo painel de link/túnel e versão, troca da própria senha, interface adaptada para celular                                                       |

O catálogo inicial mantém os 36 premiums e 50 trajes da revisão 15. Há uma biblioteca de 728 definições adicionais de equipamentos/consumíveis do catálogo público congelado, em `data/shop-items.json`. Esses itens não entram automaticamente na venda. O operador escolhe código conhecido, nome e preço local; tipos de efeito e atributos não podem ser inventados pelo formulário.

## Persistência e integração

`shop_products` mantém os produtos e suas revisões no SQLite. Pausas e remoções não são revertidas pela inicialização. O Item Shop nativo usa a tabela em toda consulta/compra; carteiras de jogos ativos atualizam a cada 10 segundos e ao voltar à aba. O bundle/revisão dos arquivos não muda quando uma configuração no banco muda, evitando pedir recarga aos jogadores.

Estoque e efeitos já adquiridos usam o catálogo completo, inclusive ofertas arquivadas, e permanecem utilizáveis. Compras conferem preço atual e total confirmado; uma confirmação antiga não pode cobrar um preço novo silenciosamente. Operações usam transação SQLite e chaves idempotentes. Trajes/equipamentos permanentes são vinculados à conta, uma aquisição por código. Consumíveis comprados têm estoque separado do loot comum, inclusive no cinto; consumir no cliente debita o estoque no servidor.

Os novos equipamentos comprados usam a definição original do código, o slot e os requisitos do cliente. A sincronização não transforma itens comuns no mesmo código em mercadoria comprada nem remove o loot comum. Itens permanentes equipados não são duplicados para a bolsa a cada atualização. Esses fluxos foram testados; a simulação ainda não é um inventário inteiramente autoritativo contra um cliente modificado.

## Acesso e contas

Todos os endpoints `/api/local/admin/*` verificam papel ADM no servidor. Sessões usam os cookies existentes, HttpOnly/SameSite, com Secure quando o iniciador recebe HTTPS pelo proxy. Os novos POSTs mantêm a verificação de origem; jogador e GM recebem 403. Senhas continuam PBKDF2; listas e logs não retornam hashes.

Bloqueio, alteração de papel e redefinição de senha revogam sessões. Usuário bloqueado não consegue entrar novamente e fica fora do ranking de jogadores. Excluir remove dados de personagem/estoque/sessões e deixa um registro de exclusão, impedindo que seeds restaurem a conta. O histórico administrativo permanece. O operador não pode bloquear/rebaixar/remover a própria conta; pelo menos um ADM ativo é preservado. A liderança da Staff acompanha o ADM ativo principal quando outro administrador gerencia a conta original.

Preço e edição de usuário/produto têm validação de tipos/limites. Revisões impedem uma aba antiga de sobrescrever silenciosamente mudanças de outra aba. O painel usa texto DOM para conteúdo de usuários e produtos. Os IDs de operação não dependem de `crypto.randomUUID`, garantindo uso pela rede local em HTTP; copiar link tem alternativa manual quando clipboard não está disponível.

## Verificação

- Suíte Python: autorização HTTP/CSRF, permissões, ciclo de conta e revogação, proteção do ADM, exclusão de seeds sem ressurgimento, Staff/ranking, catálogo persistente, preços concorrentes, estoque arquivado, consumíveis e regras anteriores.
- Suíte Node: sincronização de estoque versus loot normal, itens equipados sem duplicação, consumíveis no cinto, além das regras anteriores de skills, combate e equipamento.
- `scripts/freeston-admin-smoke.mjs`: login real do ADM em `/painel`, criação de conta, concessão de coins, criação e edição de ofertas, preço visto no Item Shop nativo, pausa recebida sem recarga, ativação de premium comprado antes da pausa, compra/consumo de poção sem tocar nas gratuitas, compra/equipamento/restauração de arma sem duplicação, bloqueio/desbloqueio/promoção GM/exclusão, Staff e painel negado ao jogador/GM. Verificação de layout móvel com 390 px e captura em Chromium.
- O teste do painel também remove `crypto.randomUUID` do navegador, simulando sua ausência em HTTP de rede local.

Os bancos usados nos testes são temporários e não entram na distribuição. Atualizar exige instalar o ZIP completo uma vez, preservando `.local-data`; o atualizador de interface rejeita o backend incompatível antes de alterar arquivos. Mudanças de catálogo e usuários feitas no painel passam a valer sem reiniciar o servidor. `publicLaunchReady:false` permanece.
