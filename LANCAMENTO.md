# FREEston Tale — revisão 23

Imagens do cliente Priston Tale Brasil enviado pelo usuário para todas as 176 skills de Tiers 1–4. Acrescenta 48 skills com arte de Assassina, Xamã e Lutador Marcial e suas variantes desabilitadas. Validação explícita impede Tier 5. Fórmulas de combate não foram alteradas sem evidência. Veja `audit/freeston-23.md`.

## Histórico da revisão 22

Corrige renascimento pelo diálogo nativo, atributos em lote com desfazer/confirmar, preparação dos ataques dos monstros, preços de venda/reparo, filtros e teto de EXP de missões e três fórmulas de dano. Veja `audit/freeston-22.md` para evidências e pendências.

## Histórico da revisão 21

A entrada agora mostra os personagens da conta, com nome, classe e nível. É possível selecionar, criar (um de cada classe) e excluir mediante nome e senha. O botão **Personagens** salva no servidor e volta à seleção. Os saves existentes são migrados; exclusão e recriação recebem identificadores diferentes, impedindo abas antigas de restaurar o personagem ou aplicar operações à nova criação.

Corrige a direção de monstros e NPCs, usa a fórmula pública de Presa/Drena com retorno imediato nas barras, corrige Força de Awell para peso e o crítico de Aging de martelos/cajados/adagas/punhos. Skills usam seus parâmetros de dano confirmados; Golpe da Vingança nível 10 não tem recarga adicional, mantendo a animação do golpe. Esta exceção é o perfil solicitado para FREEston, sem alegar recuperação da tabela privada do Zephira.

Para instalar, salve o progresso na versão anterior e feche o servidor. Extraia `freeston-tale-23.zip` em outra pasta, copie **`.local-data`** e opcionalmente **`.original-cache`**, e execute o iniciador. Requer reiniciar o Python uma vez e recarregar todas as abas. O save do servidor é preservado; caches antigos sem confirmação no servidor não são importados para um personagem recriado.

**Continua para testes fechados.** Presença/chat são compartilhados; combate comum ainda é individual no navegador. PvP compartilhado e as tabelas privadas de balanceamento não foram recuperados. Veja a [auditoria da revisão 21](audit/freeston-21.md).

## Histórico da revisão 20

O painel `/painel` ganha Aging, Drops, Histórico de drops, Logs e alertas e Loja de Skins. As probabilidades de Aging e os sorteios de drops passam a ser consultados e executados no Python, com alterações ativas sem reiniciar. Há filtros/monitoramento, registro da origem dos eventos e proteção contra repetição de operações.

O catálogo de skins reúne 415 modelos existentes de armas, escudos e armaduras/robes. O ADM publica os que quiser; jogadores compram com coins e equipam pelo botão **Skins** ou `/skins`, preservando atributos. As propriedades ficam no servidor. **A loja de skins começa sem ofertas publicadas.**

**Adequado para alfa fechada com pessoas de confiança; ainda não para abrir uma economia pública.** Combate, EXP e parte do inventário comum dependem do navegador. Abates são relatos do cliente, embora o sorteio seja do servidor. Logs e alertas não substituem um anticheat completo. Veja a [avaliação e cobertura](audit/freeston-20.md).

Para atualizar, feche a anterior, extraia `freeston-tale-20.zip`, copie `.local-data` e opcionalmente `.original-cache`, e execute o iniciador. Guarde um backup e recarregue os clientes. Esta atualização exige reiniciar o Python uma vez; as alterações posteriores pelo painel não exigem reinício.

## Histórico da revisão 19

Buffs de skills à esquerda, premiums à direita; efeitos próprios de velocidade, resistências, dano, defesa, absorção, bloqueio/esquiva e recursos. Corrige absorção dos bosses e ataques de resposta cancelados, preservando a recarga por habilidade. A aura usa textura, luz e partículas do cliente.

NPCs de Mix, Force, Aging e Nadia passam a operar pela interface nativa. **As receitas de materiais de Aging são próprias do FREEston**, identificadas na auditoria; pedras especiais sem regra validada são recusadas sem gasto.

Duas contas no mesmo iniciador e mapa conseguem se ver, mover e conversar. **Somente presença e chat são compartilhados: combate, monstros e drops ainda são individuais por navegador.** O balanceamento não foi validado como idêntico ao Zephira e o servidor ainda não está pronto para lançamento público. Veja [a auditoria da revisão 19](audit/freeston-19.md).

Para instalar, feche a anterior, extraia `freeston-tale-19.zip`, copie `.local-data` e opcionalmente `.original-cache`, e execute o iniciador. É necessário reiniciar o Python uma vez nesta atualização. O link externo continua disponível no botão **Link do jogo**, em `/painel` e no arquivo `LINK_DO_JOGO.txt`, usando `INICIAR_INTERNET.bat`.

## Histórico da revisão 18

Corrige a recarga zerada das habilidades na revisão 17. A barra e o bloqueio nativos passam a usar a recarga por skill e nível reconstruída do código clássico, junto da trava de animação. Meteoro volta a esperar 17,5 s e Onda de Fogo 8,5 s, com proficiência a 100%. A recarga ativa é preservada ao recarregar a página e também vale para ADM/GM.

A pesquisa enviada foi comparada com as 128 skills clássicas, em seus 1280 níveis; campos desconhecidos e intervalos de pets não foram usados como recarga de conjuração. Há divergências de build e arredondamento. **São regras clássicas: os tempos privados do servidor Zephira continuam sem confirmação.** Consulte [a comparação e os limites](audit/freeston-18.md).

Para atualizar, feche a anterior, extraia `freeston-tale-18.zip`, copie `.local-data` e opcionalmente `.original-cache`, e execute o iniciador. O módulo novo exige reiniciar o servidor uma vez.

## Histórico da revisão 17

Corrige a grade nativa 12×6, organização, duas bolsas, conjuntos de armas, troca entre arma de duas mãos e escudo, posição ao desequipar e sincronização das compras em ambas as bolsas. T alterna o traje; equipar o traje não troca automaticamente a visualização.

Importa progressão de custos/requisitos para 128 habilidades do cliente clássico público e 46 tabelas de dano percentual, com fontes e hashes. Corrige precisão, absorção e crítico a partir dessas fontes; monstros passam a usar a duração do clipe de ataque carregado. **Não há confirmação de igualdade com o balanceamento atual do Zephira: EXP/drops oficiais, 48 habilidades recentes e diversos efeitos continuam pendentes ou locais.** Veja [auditoria 17](audit/freeston-17.md).

**Atualizar:** feche a anterior, extraia `freeston-tale-17.zip`, copie `.local-data` e opcionalmente `.original-cache`; execute o iniciador. É necessário reiniciar uma vez pelos módulos novos. O painel `/painel` continua usando a conta ADM do jogo.

## Histórico da revisão 16

O painel administrativo em `/painel` usa o login ADM do jogo, com loja e usuários persistidos no mesmo SQLite do servidor. Permite cadastrar ofertas do catálogo, mudar preços, publicar/pausar/arquivar/restaurar, criar/editar/bloquear/excluir contas, atribuir papéis, redefinir senhas, encerrar sessões e conceder coins. Mostra personagens, sessões autenticadas e histórico das ações do painel, com interface responsiva.

O Item Shop nativo recebe mudanças em até 10 segundos nos clientes ativos e consulta o catálogo ao abrir. Estoque comprado permanece utilizável quando uma oferta é removida. Configurações feitas no painel não exigem reinício. O catálogo disponível adiciona equipamentos/consumíveis vinculados à conta aos premiums e trajes existentes, preservando loot comum separado.

Consulte o [guia do painel](PAINEL-ADMIN.md) e a [auditoria desta revisão](audit/freeston-16.md). **Instalação:** feche a anterior, extraia `freeston-tale-16.zip`, copie `.local-data` e, opcionalmente, `.original-cache`, e execute o iniciador. O backend mudou e exige instalar o ZIP completo uma vez. Contas, personagens, saldo e premiums são preservados.

Mundo compartilhado, autoridade completa sobre combate/inventário comum e BC multiplayer continuam pendentes; `publicLaunchReady:false` permanece.

## Histórico da revisão 15

A conta admin usa o nick VelluM. ADM/GM pertencem ao clã Staff, com coroa honorária permanente independente do dono competitivo de BC. A aura dourada de Staff é separada da aura dos primeiros colocados entre jogadores de cada classe. O servidor exclui Staff desse ranking.

A conta huss recebe Teio, mecânico 149, martelo de duas mãos +20 equipado, garra + escudo +20 na bolsa, amuleto Kelvezu e demais peças completas do catálogo disponível. A senha fornecida fica armazenada como hash; migrações preservam personagens e senhas existentes. A loja nativa adiciona 50 trajes permanentes, a 1000 coins cada; T alterna a exibição do traje equipado.

Detalhes, códigos, testes e limites estão na [auditoria da revisão 15](audit/freeston-15.md). A disputa multiplayer completa de BC continua pendente; a regra de coroa honorária não a implementa. Mundo individual e `publicLaunchReady:false` permanecem.

**Instalação:** feche a versão anterior, extraia `freeston-tale-15.zip`, copie `.local-data` e, opcionalmente, `.original-cache`, e execute o iniciador. Esta revisão altera Python e exige reiniciar uma vez.

## Histórico da revisão 14

A revisão 14 restaura as janelas nativas de habilidades e Item Shop, usa frames de animação do modelo a 35 fps para execução de skills, separa invencibilidade de ausência de atraso, corrige o posicionamento dos premiums e aplica especialização nativa aos itens. Monstros GM não renascem automaticamente. As taxas locais de drops exclusivos passam de 100% a 1%, restritas ao mapa do boss. Isso **não comprova taxas oficiais**, que não foram recuperadas.

Os 128 nomes das classes clássicas vêm da tabela brasileira pública; 48 nomes das outras três classes são traduções locais. Consulte [a auditoria desta revisão](audit/freeston-14.md) para evidências e limites.

**Instalação:** feche a revisão anterior, extraia `freeston-tale-14.zip` em outra pasta e copie `.local-data` e, opcionalmente, `.original-cache`. Esta revisão altera o backend e exige reiniciar uma vez. O link fica em `/painel` e `LINK_DO_JOGO.txt` ao usar `INICIAR_INTERNET.bat`.

## Histórico da revisão 13

## Imagens da revisão 13 — cobertura parcial

Foram recuperadas **128 artes clássicas** e 128 variantes bloqueadas para as classes 1–8. Os PNGs preservam os pixels e dimensões dos arquivos do cliente clássico público e são entregues localmente. O livro e o HUD passam a usá-los. A associação por código e os hashes estão na [auditoria das imagens](audit/skill-art-13.md).

**Faltam as 48 imagens de Assassin, Shaman e Martial Artist.** Essas classes continuam com ilustrações provisórias e o livro informa isso explicitamente. As artes clássicas foram obtidas de uma cópia pública comunitária, não de um pacote oficial autenticado. Sua igualdade com a revisão atual do pweb.world não foi comprovada; a CDN respondeu 403/Cloudflare 1010 aos caminhos consultados. Esta entrega não satisfaz integralmente o pedido de artes oficiais das 11 classes.

A revisão 13 altera o backend Python. Feche a versão anterior uma vez, extraia o ZIP completo em outra pasta e copie `.local-data` e, opcionalmente, `.original-cache`. A barra identifica a versão 13. O atualizador rejeita corretamente esse pacote em execução.

## Alterações da revisão 12

- Monstros: perseguição, retaliação depois de receber dano, alcance, animação de ataque, HP recebido no HUD, retorno à origem e respawn na origem. Cidades são seguras. Invencibilidade permite ver ataques sem perder HP; voo/invisibilidade/congelamento impedem agressão. A IA e suas distâncias são regras locais, não recuperadas do servidor oficial.
- Skills: as letras foram substituídas por ilustrações SVG próprias, com desenhos de armas, fogo, gelo, escudos e outros motivos. Os 176 SVGs são distintos e não dependem da CDN. **As artes oficiais individuais ainda não foram recuperadas.**
- Loja: 36 opções premium de 9 famílias, com nomes/códigos/durações e imagens extraídos do cliente público. Preços e balanceamento são locais. Compra e ativação são operações separadas; o estoque fica em **Meus premiums**, acessível por todas as classes da conta. Tempo ativo continua offline.
- Coins: `/coins 1000` concede à própria conta admin; `/coins bielbt 1000` concede ao ID de login informado. A conta precisa existir. Saldo, estoque, ativações e ledger ficam no SQLite, separados dos saves de personagem. Transações e chaves de operação impedem saldo negativo e duplicação por repetição da mesma requisição. Só o servidor concede coins e só aceita essa operação de administrador.
- Efeitos locais: EXP 10/30%, chance extra de drop, recuperação de HP/MP por dano, redução de custos de MP/resistência e 1000 HP adicionais. As duas Presas compartilham um grupo e não acumulam.
- Acesso: botão **Link do jogo** na barra admin abre o painel de cópia do endereço. Sem túnel ativo ele não inventa uma URL. `/loja`, F9 e Loja premium abrem a loja.

A [comparação atual](audit/freeston-12.md) contém inventário, diferenças por fluxo e todos os tipos públicos de serviço de NPC. Site/wiki/mapas oficiais responderam HTTP 403 nesta sessão; os recursos conhecidos de imagem premium da CDN carregaram. A auditoria não é uma sessão autenticada no jogo oficial e não comprova equivalência.

**Instalação da revisão 12:** ela altera arquivos Python e inclui dois módulos de servidor novos. Feche a revisão anterior, extraia o ZIP completo em outra pasta e copie `.local-data` e, opcionalmente, `.original-cache`. É necessário reiniciar uma vez; o atualizador em execução rejeita corretamente esse pacote antes de alterar arquivos. A versão 12 aparece na barra para distinguir a instalação antiga.

## Histórico da revisão 11

## Bugs reproduzidos e corrigidos

- O catálogo tinha 16 habilidades por classe, mas todas recebiam a mesma imagem genérica. A interface nativa também dependia de rank/tier para exibir partes do livro. O novo livro mostra os 16 cards da classe, inclusive bloqueados, com requisitos e ícones locais distintos. Os ícones são identificadores próprios, não artes oficiais recuperadas.
- Botão Habilidades, tecla S, `/habilidades` e mestre passam a abrir o mesmo livro. Aprender/evoluir, selecionar ataque e usar possuem mensagens de erro. Os modelos e a execução de combate continuam no motor do cliente.
- A seleção de habilidades usava uma chave nativa por nome do personagem; o mesmo usuário em várias classes podia reaproveitar a configuração. Ela agora é isolada por conta/classe e salva no personagem.
- Equipamentos validam espaço, classe e atributos. Arma de duas mãos guarda o escudo se houver espaço. Falhas preservam o inventário.
- Compras de vários equipamentos criam unidades separadas, com rollback se a bolsa lotar.
- O túnel só verificava o endereço quando recebia uma mensagem de conexão; uma falha inicial de DNS o deixava sem nova tentativa. A verificação agora ocorre em uma thread, repete após 5 segundos e mantém o painel informado.

## Divulgação e operação

`INICIAR_INTERNET.bat` abre o painel local em `http://127.0.0.1:19065/painel`. Após entrar como administrador, use **Copiar link**. A URL também é gravada em `LINK_DO_JOGO.txt`. O painel distingue endereço pendente, verificado e offline. O endereço pendente pode ser testado em outra rede, sem ser apresentado como verificado.

O túnel temporário mantém a URL enquanto estiver ligado. Um link permanente depende de um domínio/túnel nomeado configurado na conta Cloudflare do operador. `named-tunnel.example.yml` é somente um modelo. Depois de configurar o túnel e o DNS, defina `FREESTON_TUNNEL_CONFIG` como caminho do YAML e `FREESTON_PUBLIC_URL` como URL HTTPS; o mesmo iniciador passa a usar o túnel nomeado. Esta modalidade não foi validada ao vivo com credenciais de um provedor nesta sessão.

O painel também cria contas com papel jogador (nunca GM) e permite trocar a própria senha, encerrando as outras sessões dessa conta. As senhas são armazenadas como hashes PBKDF2. Banco, senhas, status de túnel e caches não entram no pacote.

## Atualização mantendo servidor e túnel ligados

Abra `ATUALIZAR.bat` e escolha o novo ZIP. O atualizador aplica somente interface/dados de jogo de pacotes compatíveis, guarda backup em `.updates` e preserva banco e configuração de contas. Ele rejeita caminhos inválidos e pacotes que alteram os arquivos centrais do servidor Python, antes de modificar a instalação.

Os navegadores consultam a revisão a cada 30 segundos ou ao voltar à aba. O aviso **Salvar e atualizar** aguarda a confirmação do salvamento e recarrega a página. O processo do servidor e o túnel continuam ligados, mantendo o endereço. **Isso não é troca do motor em memória sem recarga.** Alterações no backend exigem instalação completa/reinício. Para migrar da LAN 10 para esta revisão, feche a versão antiga uma vez, extraia o ZIP completo e copie `.local-data` e, opcionalmente, `.original-cache`.

## Validação

Testes Node cobrem progressão das 11 classes e regras de equipamento; testes Python cobrem autenticação, papéis, troca de senha, revisão de arquivos, atualização de ZIP e nova tentativa após falha DNS. O navegador real verificou 16 cards e 16 URLs de ícones por classe, nas 11 classes, compra de habilidades pelo jogador, seleção/restauração do ataque, notificações de atualização com progresso preservado, painel e criação de convite com papel jogador. A emulação móvel verificou movimentação por toque e fechamento do livro.

Scripts: `scripts/freeston-skills-smoke.mjs`, `scripts/freeston-update-smoke.mjs` e `scripts/mobile-classes-smoke.mjs`. Eles usam `PWEB_TEST_PASSWORD` e bancos temporários separados. Testes de túnel usam mocks; nenhum endereço externo ativo deste ambiente foi apresentado como validado.

## Bloqueios para lançamento público como MMO

A versão ainda é um ambiente de testes. `publicLaunchReady` permanece `false` na identificação do servidor.

| Área                                                    | Situação                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Mundo compartilhado e presença                          | Não implementado; cada navegador simula seu combate                                                           |
| Autoridade sobre combate/economia                       | Cliente ainda calcula regras; saves não equivalem a validação autoritativa                                    |
| Skills oficiais                                         | 176 referências no total, 16 por classe; fórmulas, custos e efeitos únicos privados continuam parciais/locais |
| Mix, aging por NPC, fabricação, correio, comércio, clãs | Pendentes ou incompletos conforme auditoria pública                                                           |
| Capacidade/confiabilidade                               | Sem teste de carga ou disponibilidade 24 horas                                                                |
| Dispositivos                                            | Testes em navegador e emulação; sem benchmark em aparelhos físicos                                            |
| URL permanente                                          | Requer hospedagem ou túnel nomeado do operador                                                                |

A criação de contas permite convidar pessoas para testar, mas não transforma a simulação em um servidor multiplayer pronto para lançamento. A auditoria anterior dos dados públicos permanece em `docs/audit/zephira.md`.
