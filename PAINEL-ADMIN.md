# Painel administrativo do FREEston Tale

O painel fica no **mesmo servidor e endereço do jogo**, no caminho **`/painel`**.

- No computador que inicia o jogo: `http://localhost:19065/painel`.
- Na rede de casa: `http://IP-DO-COMPUTADOR:19065/painel`.
- Na Internet: acrescente `/painel` ao link exibido no painel do túnel ou em `LINK_DO_JOGO.txt`.

Entre com a conta ADM do jogo. O ID padrão continua **admin**, com o nick VelluM e a senha já cadastrada. Não existe uma segunda senha para o painel. Jogadores e GMs não têm acesso administrativo ao painel.

## Loja do jogo

Na aba **Loja do jogo**, procure por nome ou código e filtre categoria e situação.

- **Adicionar produto:** escolha um item do catálogo, defina nome, preço em coins, descrição e publique. O catálogo disponível contém os premiums e trajes já suportados, além de equipamentos e poções com dados completos recuperados.
- **Editar:** altere nome, descrição, preço ou disponibilidade. O preço aceita inteiros de 0 a 1 bilhão de coins.
- **Pausar:** tira a oferta da loja até você publicar novamente.
- **Remover:** arquiva a oferta. Use o filtro **Removidos** para restaurar.

A loja do NPC Item Shop, `/loja`, F9 e o botão de loja do jogo usam esse mesmo catálogo. Clientes ativos recebem mudanças em até 10 segundos; abrir a loja ou voltar à aba consulta o servidor. **Não é preciso reiniciar o jogo nem o servidor para alterar produtos ou preços.** Se um preço mudar durante uma confirmação de compra, o servidor recusa a confirmação antiga e pede para conferir novamente.

Quem já comprou um item pode continuar a usá-lo mesmo depois da oferta sair da venda. Compras são vinculadas à conta. Trajes e equipamentos permanentes podem ser adquiridos uma vez por código; poções podem ser compradas em quantidade, até 99 por operação. Botão direito veste equipamentos e trajes ou usa consumíveis. Poções compradas ficam separadas das poções comuns, inclusive no cinto. Itens de loja não são vendidos a NPCs nem transferidos ao baú. Com a bolsa cheia, a compra fica no estoque da conta e aparece depois que houver espaço e a carteira atualizar.

Novos tipos de efeito, códigos inventados ou mecânicas sem implementação não podem ser criados por esse formulário. O catálogo mantém as regras de uso e os modelos do cliente existente.

## Usuários

A aba **Usuários** permite buscar ID ou personagem e filtrar jogadores, GMs e ADMs.

- **Criar usuário:** escolha ID, senha e papel. Uma conta nova começa sem personagens salvos.
- **Editar:** mude o papel, redefina a senha ou bloqueie/desbloqueie o acesso. Deixe a senha em branco para mantê-la. O ID de login é fixo depois da criação.
- **Coins:** conceda saldo à conta; o valor é compartilhado pelas classes e aparece no jogo automaticamente.
- **Desconectar:** encerra todas as sessões válidas da conta.
- **Remover:** exclui conta, personagens, saldo e estoque. É necessário digitar o ID para confirmar. A exclusão não pode ser desfeita e contas iniciais removidas não reaparecem ao reiniciar.

Bloquear, redefinir senha ou trocar papel encerra as sessões existentes. ADM e GM entram automaticamente na Staff; o ranking de jogadores exclui contas da Staff e contas bloqueadas. O painel informa personagens, níveis, ouro, coins e número de sessões autenticadas. Esse número **não é um contador de jogadores presentes no mapa**.

Você não pode bloquear, remover ou retirar o papel ADM da sua própria conta. O servidor também preserva ao menos um administrador ativo. Somente outra conta ADM pode administrar o acesso de um ADM diferente.

## Histórico e acesso

**Histórico de ações** mostra as últimas 200 operações feitas pelo painel, com administrador, alvo, horário e alterações principais. Senhas e hashes não são exibidos. Compras e operações de saldo também conservam o ledger de coins do servidor.

Em **Acesso e servidor**, copie o link do jogo, consulte a versão e altere a senha da própria conta. O link externo depende do túnel do computador anfitrião continuar ligado.

## Instalar a revisão 20

Feche a versão anterior, extraia `freeston-tale-20.zip` em outra pasta, copie **`.local-data`** e, opcionalmente, `.original-cache`, e execute o iniciador. O banco é migrado automaticamente, preservando contas, personagens, coins e premiums. Esta instalação altera Python e exige um reinício; as configurações posteriores feitas no painel não exigem reinício. Preserve uma cópia da pasta anterior como backup.

Presença/chat são compartilhados; combate, autoridade completa sobre o inventário comum e BC competitivo permanecem pendentes. A revisão mantém `publicLaunchReady:false` e recomenda alfa fechada.


## Aging

Confira as 20 etapas e edite as chances de +1, +2, −1, −2, quebra e manutenção. **Sucesso = +1 + +2; cada linha deve somar 100%.** Os botões de preencher/padrão só alteram o formulário; clique em Salvar para aplicar. O próximo sorteio usa as regras salvas no servidor; o tooltip do jogo atualiza em até 5 segundos. Materiais são do perfil FREEston; pedras especiais ainda não são suportadas.

## Drops e histórico

Controle chance de ouro, quantidade de ouro, poções, equipamentos abaixo de 80, equipamentos 80+ e exclusivo de boss. Exceção por boss vazia usa a chance geral. As categorias são independentes e respeitam elegibilidade de mapa/nível.

Em Histórico de drops, filtre ID, códigos separados por vírgula (por exemplo `OR205, OA130`), nível do item, período e situação. `GOLD` filtra ouro. Nível mínimo 80 exclui ouro/itens abaixo de 80. A situação distingue gerado no chão e recolhido/recebido. A confirmação de recolhimento vem do cliente. A paginação mostra 100 eventos por vez; o resumo por conta usa todo o filtro. A página recente atualiza automaticamente a cada 10 segundos, com opção de desativar. Registros expirados não são marcados como recolhidos.

Configure o monitor com níveis, códigos opcionais, intervalo de minutos e limite de registros. Testes de Staff não entram nesse alerta. Atingir o limite apenas registra indício para revisão nos Logs; não bane ninguém.

## Logs e alertas

Selecione Segurança, Aging, Skins/compras ou Relatos de abate, além dos filtros de conta, período, gravidade, ação e origem. `Servidor`, `Teste de Staff`, `Relato do navegador` e `Indício para revisão` têm significados diferentes. Relatos de abate não são validação independente de combate; Mix/Force/limpeza continuam como relatos do navegador.

Aumentos de Aging fora da operação confirmada, UIDs duplicados e quantidades inválidas são recusados no save de jogador. Saltos de ouro, nível e EXP geram indícios; outras alterações no inventário comum ainda dependem do cliente. Estes controles não são uma proteção completa contra trapaça. Os registros começam na revisão 20, sem reconstrução retroativa de drops antigos.

## Loja de Skins

Busque nome/código, filtre categoria e clique em Gerenciar. Defina nome, descrição, preço inteiro de 0 a 1 bilhão de coins e marque Publicar. As 415 entradas são modelos existentes; começam pausadas para você escolher. Pausar mantém a propriedade de quem já comprou.

No jogo, use o botão Skins ou `/skins`. Compre e depois equipe. Skins precisam de equipamento compatível e mudam apenas aparência. Propriedade é por conta, seleção por classe; os outros jogadores recebem o visual. Novas artes/modelos enviados por upload, asas e emotes não foram implementados.

A [auditoria da revisão 20](audit/freeston-20.md) detalha testes, procedência e limites antes de convidar usuários reais.
