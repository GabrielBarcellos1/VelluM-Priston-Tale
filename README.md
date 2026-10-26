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

Importa progressão de custos/requisitos para 128 habilidades do cliente clássico público e 46 tabelas de dano percentual, com fontes e hashes. Corrige precisão, absorção e crítico a partir dessas fontes; monstros passam a usar a duração do clipe de ataque carregado. **Não há confirmação de igualdade com o balanceamento atual do Zephira: EXP/drops oficiais, 48 habilidades recentes e diversos efeitos continuam pendentes ou locais.** Veja [auditoria 17](../docs/audit/freeston-17.md).

**Atualizar:** feche a anterior, extraia `freeston-tale-17.zip`, copie `.local-data` e opcionalmente `.original-cache`; execute o iniciador. É necessário reiniciar uma vez pelos módulos novos. O painel `/painel` continua usando a conta ADM do jogo.

## Histórico da revisão 16

O painel em **/painel** usa o login ADM do jogo e gerencia loja e usuários no mesmo servidor: publicar/pausar/remover/restaurar ofertas, mudar preços, criar/editar/bloquear/excluir contas, atribuir papéis, conceder coins e encerrar sessões. Inclui histórico administrativo e versão para celular. Clientes ativos recebem o catálogo em até 10 segundos, sem reinício. Consulte `PAINEL-ADMIN.md` no ZIP para instruções.

VelluM é o nick da conta admin. ADM e GM pertencem ao clã Staff, com coroa honorária permanente e aura dourada; o top de cada classe entre jogadores recebe uma aura separada, sem Staff disputar esse ranking. A conta huss inicia no Teio, mecânico 149, com martelo +20 equipado, garra/escudo +20 na bolsa e amuleto Kelvezu. A loja nativa ganha a categoria Trajes com 50 modelos; preço local 1000 coins, permanentes. Botão direito equipa; T alterna o visual. Consulte AUDITORIA-STAFF-15.md no ZIP.

Veja `LEIA-ME.txt` para instalar, `/painel` para copiar o link e criar jogadores, e `ATUALIZAR.bat` para aplicar atualizações compatíveis de interface. A tecla S, o mestre e /habilidades abrem a janela nativa. /loja e F9 abrem o Item Shop nativo; compras entram na bolsa e são ativadas com botão direito. Premiums ficam na barra nativa da direita. A cadência das skills usa frames do modelo a 35 fps, sem modo GM sem atraso. Consulte AUDITORIA-AJUSTES-14.md para as regras locais e os limites.

A revisão de lançamento está em `docs/FREESTON-RELEASE.md` no repositório e `LANCAMENTO.md` no ZIP. A versão continua de testes, sem mundo multiplayer compartilhado/autoridade de combate. As seções abaixo registram as versões anteriores e a procedência pública do cliente; não são afirmação de lançamento completo.

# FREEston Tale — documentação e histórico

Esta é a reconstrução baseada no cliente público de **Zephira World / pweb.world**. Substitui o protótipo visual simplificado como caminho principal de execução. O protótipo React anterior continua no histórico e no código do projeto; `npm run dev` ainda o executa.

Para executar o cliente original:

```sh
cd original-local
python3 iniciar.py
```

No Windows, execute `INICIAR.bat` ou `py iniciar.py`. Requer Python 3.10+ e WebGL. Não requer Node, Bun ou conta no serviço original. O navegador abre automaticamente. O primeiro carregamento de cada mapa/classe baixa recursos estáticos públicos e requer Internet; depois os arquivos são reutilizados de `.original-cache/`.

## O que foi reconstruído e validado

- Cliente principal e CSS originais, conferidos por SHA-256 antes da adaptação em memória.
- Login em contas locais, usando a classe de conexão e o motor do cliente original, sem conectar aos servidores de contas originais.
- Cenário real de Ricarten, Jardim da Liberdade, personagem Knight, NPCs, minimapa, equipamentos e interface originais.
- Dados públicos de 46 mapas na wiki, 200 monstros e 137 NPCs. O seletor também inclui entradas adicionais do catálogo público de campos. Esses números representam o inventário de dados, **não** a quantidade de mapas individualmente testados.
- No Jardim da Liberdade, 150 entidades foram instanciadas nas zonas públicas de spawn, com os modelos, nomes, níveis e vida publicados na wiki.
- O motor original executou aproximação, animação e golpes contra um Cogumelo Fantasma; o adaptador recebeu os ataques, retornou dano, morte, ouro e EXP e restaurou o progresso após recarregar.
- Suporte local a poções, itens, equipamento, compra/venda em lojas com estoque público, eventos de missões e salvamento por classe. Nem todos esses fluxos estão validados integralmente; consulte os testes e os limites abaixo.

## Separação entre cliente e servidor

`iniciar.py` baixa somente arquivos de `https://pweb.world/_app/` e `https://cdn.pweb.world/assets/`. O código principal fica congelado na versão com hash `309822294b926934160b35d034a4b15e0985d539520a04dc2a684b06b9a155ac`. A adaptação substitui apenas sua chamada final de inicialização pelo carregamento de `session.mjs`, que fornece dados locais às APIs do cliente. Nenhum código de servidor foi obtido.

O cache principal não é versionado. O JavaScript proprietário original não é incluído como código-fonte deste repositório: é obtido diretamente do serviço público pelo iniciador. Os avisos originais permanecem no arquivo baixado. Os metadados de wiki, mapa e missões em `data/` foram obtidos por GET nos endpoints públicos. `drops.json` é configuração local; `accounts.seed.json` contém a inicialização das contas locais.

O navegador recebe uma política `connect-src 'self'`; a lista de servidores é limitada à máquina local. Nenhum POST de login, pagamento ou ação de conta é encaminhado. Telemetria é descartada localmente. TLS e hashes não são desabilitados; nenhuma CA é instalada. Uma alteração no bundle público exige nova inspeção e atualização explícita da adaptação.

`session.mjs` é a simulação local reconstruída, não o servidor original: o estado ativo fica no navegador, com cache no `localStorage` por usuário e persistência autenticada no SQLite do anfitrião. Usa os atributos públicos dos monstros e os itens disponíveis, mas as fórmulas locais de dano, EXP, ouro, renascimento e progressão não foram comprovadas equivalentes às privadas. Algumas regras das missões públicas são interpretadas parcialmente.

**Não é uma cópia integral do MMO.** Habilidades, multiplayer, comércio entre jogadores, clãs, economia/pagamentos, eventos e muitos serviços de NPCs ainda dependem de uma reconstrução adicional. Recursos sem implementação não devem ser considerados funcionais apenas porque seu botão original aparece. Serviços que permanecem sem suporte são indicados na sessão.

## Investigar e testar

```sh
python3 -m unittest discover -s original-local/tests -v
python3 original-local/iniciar.py --port 4181 --no-browser
# Em outro terminal, neste ambiente com REA/Chromium:
node scripts/original-client-smoke.mjs
```

O teste do navegador usa o cliente real, seu terreno, controles, quadros de inventário/status, pipeline de combate e salvamento. Os recursos baixados podem ser reutilizados de outra pasta com `PWEB_CACHE_DIR`. Essa variável serve somente para configuração do cache e não contém credenciais.

Os arquivos de investigação desta sessão, incluindo a inspeção estática de tabelas de texto e as capturas, ficam em `/workspace/pweb-reconstruction/analysis`. O bundle legível é material de análise e **não** é executado como substituto do original.

## Administrador local

Abra o chat original com **Enter**, digite um comando com **/** e envie com **Enter**. Os comandos GM ficam no chat; o botão Link do jogo abre o painel de operação. É necessário entrar na conta local de administrador. Digite `/ajuda` para consultar os comandos. A administração pelo chat preserva o cliente original e administra a simulação local.

| Comando                            | Efeito                                                       |
| ---------------------------------- | ------------------------------------------------------------ |
| `/nivel 75`                        | Define nível entre 1 e 150                                   |
| `/ouro 1000000`                    | Define o total de ouro (até 1 bilhão)                        |
| `/atributo str 300`                | Define str, spi, tal, dex ou health (1..999)                 |
| `/curar`                           | Restaura HP, MP e SP de personagem vivo                      |
| `/deus on` / `/deus off`           | Liga/desliga invencibilidade                                 |
| `/congelar on` / `/congelar off`   | Suspende/retoma ataques dos monstros                         |
| `/itens potion`                    | Pesquisa até 80 itens por nome ou código                     |
| `/item PL101 20`                   | Adiciona item à bolsa (quantidade 1..99, exige espaço)       |
| `/mapas` / `/mapas jardim`         | Lista/pesquisa IDs dos mapas                                 |
| `/mapa 2`                          | Carrega o mapa indicado                                      |
| `/classes` / `/classe 6`           | Lista ou muda classe; cada classe tem seu próprio save       |
| `/monstros` / `/monstros cogumelo` | Lista/pesquisa índices de monstros                           |
| `/invocar 0 2`                     | Invoca duas unidades do índice indicado, perto do personagem |
| `/limpar`                          | Remove monstros do cenário sem EXP ou ouro                   |
| `/renascer`                        | Restaura os monstros da sessão                               |
| `/salvar`                          | Salva o personagem no navegador                              |

Nível, atributos, ouro e inventário persistem por classe. Invencibilidade, congelamento e invocações duram apenas na sessão atual. Monstros mortos em combate antes de `limpar` ainda podem ter seus temporizadores de renascimento ativos. O adaptador não implementa serviços privados, habilidades ou multiplayer ausentes do adaptador.

Teste de integração: com o servidor na porta 4181, `node scripts/local-admin-smoke.mjs`. Confere os comandos pelo chat original, respostas, erros, ausência de painel, limites, itens, invocação/remoção/renascimento e persistência após recarregar.

### `/equipar`: conjunto endgame local

O comando define nível 150 e atributos 999, equipa automaticamente a arma da família da classe, armadura/robe, botas, luvas, bracelete, amuleto, dois anéis e sheltom. Equipamentos de uma mão recebem escudo; armas de duas mãos não recebem escudo. Escolhe os maiores requisitos de nível dentre os itens com atributos definidos no catálogo público, com desempate por dano/defesa. Isso inclui armas Verus e armadura/robe Deadly na versão fixada; não presume que códigos sem atributos sejam equipamentos mais recentes e utilizáveis.

As peças são perfeitas e recebem **aging +20**, limite do cliente, nas famílias compatíveis. Anéis, amuleto e sheltom não recebem aging inventado. A seleção premium usa a variante mais forte disponível por categoria (11 categorias no cliente), incluindo a maior variante de EXP e um único tipo de ajudante/cabeção, evitando variantes incompatíveis simultâneas. Os buffs ficam ativos localmente por um ano renovado a cada abertura. Seus ícones usam o cliente original; o adaptador aplica bônus locais de +1000 HP e +30% dano. Nem todos os demais efeitos privados dos premiums foram reconstruídos. Não há cobrança, conta ou ativação em outro servidor.

O conjunto e o estado premium persistem por classe. A bolsa não é esvaziada; o conjunto anteriormente equipado fica em uma cópia no localStorage sob a chave da classe com sufixo `-before-equipar`. O combate local agora calcula defesa, absorção, precisão, crítico e bloqueio com o equipamento; suas fórmulas continuam sendo aproximações locais.

Validação: `node scripts/endgame-smoke.mjs` com o servidor na porta 4182: envio real pelo chat, Fighter e Priestess, slots compatíveis, aging, buffs, inventário original e persistência após recarregar.

### Anéis de boss no `/equipar`

Os dois slots agora recebem **Valento Ring (`OR205`) perfeito**, substituindo os Verus. Entre os anéis de boss com atributos definidos no catálogo fixado, Valento supera Fury (`OR232`), Babel (`OR231`) e os anteriores em defesa, absorção e precisão. Códigos sem atributos, como alguns anéis de evento, não permitem concluir que sejam melhores.

Cada Valento perfeito tem defesa 39, absorção 2,9, precisão 56, HP +46, MP +46 e SP +38, além dos valores de regeneração do cliente. O par aplica defesa 78, absorção 5,8, precisão 112, HP +92, MP +92 e SP +76. Os máximos vêm das tabelas originais de acessórios; não há aging inventado nos anéis. O cálculo local dos recursos agora considera os bônus HP/MP/SP dos equipamentos. A regeneração individual dos itens permanece dependente das regras locais existentes.

### Administração por nome, mobilidade e diagnóstico (GM 7)

| Comando                                            | Uso                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| `/monstro Valento`                                 | Invoca o monstro perto do personagem, com modelo e HP do catálogo original |
| `/criar Anel do Valento`                           | Cria o Valento Ring na bolsa                                               |
| `/criar Verus Axe`                                 | Cria um item pelo nome do catálogo                                         |
| `/criar OR205 2`                                   | Cria duas unidades pelo código; também aceita quantidade após o nome       |
| `/voar` ou `/voar on`                              | Ativa voo local; clique para mover                                         |
| `/voar 300`                                        | Define altura de 300 unidades acima do terreno                             |
| `/subir 50` / `/descer 50`                         | Ajusta altura em voo                                                       |
| `/voar off`                                        | Pousa em terreno válido                                                    |
| `/invisivel` ou `/invisivel on` / `/invisivel off` | Alterna/define invisibilidade e impede agressão local                      |
| `/tp Ricarten`                                     | Teleporta ao mapa pelo nome ou ID; no mesmo mapa, volta ao ponto inicial   |
| `/tp -1047 -16973`                                 | Teleporta para X Z dentro do mapa, validando o terreno                     |
| `/teleportar` / `/teletransportar`                 | Sinônimos de `/tp`                                                         |
| `/pos`                                             | Mostra mapa e coordenadas atuais                                           |
| `/velocidade 4`                                    | Velocidade de GM; segure Shift ao andar no chão                            |
| `/gm`                                              | Mostra estado dos modos administrativos                                    |
| `/diagnostico`                                     | Mostra transporte local e erros recentes                                   |
| `/reconectar`                                      | Salva e recarrega a sessão local                                           |

Nomes ignoram acentos e maiúsculas; categorias como anel, armadura e botas têm equivalentes em inglês. Os nomes completos do catálogo e os códigos funcionam para todos os itens cadastrados. Traduções de categorias não constituem tradução integral dos 2217 nomes. Nomes duplicados/ambíguos mostram opções; use o código indicado. A bolsa tem espaço finito: criação de múltiplos equipamentos é atômica e, se não couberem, é cancelada. Criar consumíveis premium ou itens de missão não implementa automaticamente seu uso em serviços ausentes.

Os monstros invocados são combatíveis; use `/deus on` antes de criar um boss se quiser evitar morrer. Voo e invisibilidade não concedem invencibilidade fora de seus respectivos modos. `/limpar` libera os monstros invocados; seus timers antigos não podem remover um novo monstro. Os demais modos administrativos duram na sessão atual.

**Correção de “Reconectando...”**: a classe original executa `checkAlive` na volta à aba, envia PING e, sem PONG de WebSocket, zera o socket e tenta reconectar. O adaptador não usa WebSocket remoto; agora reconhece essa verificação localmente, preservando a sessão. O teste reproduz a perda na classe original isolada e confirma estabilidade na sessão adaptada, inclusive ao alternar abas. Isso não garante recuperação de fechamento do terminal ou falhas da GPU. Erros JavaScript e perda de WebGL ficam registrados, com salvamento ao perder o contexto gráfico; `/diagnostico` exibe os últimos registros. O servidor também repete downloads públicos transientes e impede dois iniciadores de compartilhar a mesma porta no Windows.

Testes: `node --test tests/admin-names.test.mjs`; `python3 -m unittest discover -s original-local/tests -v`; com o servidor na porta 4186, `node scripts/admin-experience-smoke.mjs`. O teste do navegador verifica chat real, invocação/ataque do Valento original, itens por nome e código, voo/pouso, invisibilidade, teleporte, velocidade e verificação de conexão/alternância de abas.

## LAN 8 — contas, NPCs e drops

O servidor escuta `0.0.0.0:19065` por padrão. O BAT imprime os endereços IPv4 disponíveis. No outro aparelho da mesma rede, abra `http://IP-DO-ANFITRIAO:19065`; permita o Python no firewall de redes privadas quando o Windows perguntar. Não há publicação na Internet nem configuração de roteador.

Contas iniciais: `admin` com papel administrador e `bielbt` com papel jogador, usando a senha escolhida pelo solicitante. `data/accounts.seed.json` contém somente salt e hash PBKDF2, sem senha em texto. A inicialização cria o SQLite `.local-data/accounts.sqlite3`; preserve essa pasta nas atualizações. O logout invalida a sessão, cookies são HttpOnly/SameSite e requisições de outra origem são recusadas. O progresso é separado por usuário/classe, incluindo baú. O admin pode migrar o save antigo do navegador na primeira entrada.

O player recebe nível inicial normal, não tem seletor administrativo de mapas e não executa os comandos de GM. A autenticação e o endpoint de autorização validam o papel no servidor. O combate ainda é simulado no navegador; não há proteção completa contra adulteração do cliente e as instâncias não são um mundo multiplayer compartilhado.

NPCs operacionais: lojas (estoque público), compra/venda, reparo local, armazém (itens e ouro), teleporte (100 de ouro por viagem, regra local) e diálogos de missões interpretadas com o NPC correspondente. **Não estão concluídos**: todas as habilidades, todos os serviços de aging/mix/fabricação, correio, eventos, clãs e comércio multiplayer. Não basta tornar um botão visível para considerar o serviço implementado.

`data/drops.json` é uma configuração de teste, não uma tabela oficial recuperada. Os endpoints públicos de wiki, campos e spawns não fornecem as probabilidades privadas nem todas as listas de drop. Os itens comuns são escolhidos pelo nível e apenas no mapa publicado para o monstro; bosses configurados têm sua associação de item em uma lista explícita. O modelo de drop original aparece no chão e o motor executa aproximação/coleta; bolsa cheia preserva o item no chão. `/drops` mostra a procedência e as regras. Edite o JSON e reinicie para ajustar o balanceamento.

Teste principal: `PWEB_TEST_PASSWORD` definida no ambiente e `node scripts/lan-accounts-smoke.mjs http://127.0.0.1:4191`. A senha não deve ser adicionada ao script. A suíte cobre login admin/player, negativas de GM, boss/drop/coleta, baú, contas separadas, recarga e logout. Testes Python cobrem sessões, autenticação, separação de saves, origens, hashes, downloads e limites; testes Node cobrem busca por nome e seleção de drops.

## LAN 9 — habilidades e ajuda

`/ajuda` (ou `/Help`) abre um diálogo responsivo com busca, categorias, descrição e exemplos. Cada ação aparece uma vez; nomes compatíveis ficam no mesmo cartão. O botão “Preencher chat” apenas prepara o exemplo. X e Esc removem o diálogo do DOM, liberando a tela. Jogadores veem somente consultas e ações permitidas. O seletor GM de mapas foi retirado da barra: use `/tp`.

`/habilidades` ou o botão Habilidades abre o livro nativo. Aprenda com **Mestre Verkan em Ricarten** ou **Mestre Raymon em Pillai**: clique na habilidade no livro enquanto estiver com o mestre. O aprendizado cobra ouro, ponto e nível e exige a habilidade anterior. Depois feche a conversa, selecione uma habilidade ativa no livro e use os controles nativos fora da cidade. Habilidades aprendidas ficam salvas por conta e classe. O `/equipar` maximiza as habilidades da classe para testes administrativos.

O registro público do cliente contém **176 códigos de habilidade, 16 por classe**, com os tipos de efeito. `data/skills.json` registra a origem e o hash do cliente. O endpoint oficial de wiki retornou HTTP 403 durante esta revisão; a análise usou a cópia pública previamente obtida e validada. Nomes/códigos e efeitos visuais são referências do cliente; IDs locais, níveis, preços, pontos, custos, recarga, alcance, dano e bônus são reconstruções locais. Os ícones do livro são genéricos do cliente. Há implementação de ataque dirigido/em área, cura própria, passivas, buffs, atraso de ataque inimigo e quatro modelos de invocação (golem, wolverin, elemental e bloody knight). Efeitos únicos de todas as habilidades, cura de terceiros e ressurreição entre jogadores não foram reconstruídos; não equivalem às regras privadas oficiais.

A ajuda embutida do cliente cita `/Field`, `/Move`, `/SetLevel`, `/Heal`, `/Speed`, `/Gold`, `/Coin`, `/Time`, `/Item`, `/AddItem` e `/Help`. Esta versão reconhece os aliases que possuem ação local correspondente. `/Coin` e `/Time` não foram implementados porque suas regras privadas não foram recuperadas. `/AddItem CÓDIGO [classe 1–11] [aging 0–20]` suporta a forma avançada, enquanto `/criar Nome [quantidade]` é a opção principal.

A bolsa agora aceita reposicionamento com limites/colisões e as poções podem ser colocadas, trocadas e removidas do cinto; bolsa cheia preserva o item. O mundo continua individual por navegador, com contas e salvamento compartilhados no anfitrião. Mix, fabricação, aging por NPC, correio, clãs, comércio entre jogadores e eventos completos continuam pendentes.

Validação: `node --test tests/*.test.mjs`, `python -m unittest discover -s original-local/tests -v`, `npm run lint`. Teste do cliente original: `PWEB_TEST_PASSWORD` no ambiente e `node scripts/skills-help-smoke.mjs http://127.0.0.1:4194`, usando um banco temporário novo. O teste verifica fechamento completo da ajuda, filtros por papel, aprendizado pelo livro nativo, cobrança e persistência.

O teste `scripts/skill-combat-smoke.mjs` verifica execução de habilidade pelo motor original, dano real, transferências de poções no cinto, compatibilidade `/AddItem` com aging persistido e fechamento da ajuda em viewport móvel. O pacote extraído também foi testado pelo IP LAN com `scripts/lan-accounts-smoke.mjs`.

Salvamento LAN 9: escritas normais são agrupadas em uma fila e priorizadas para não acumular requisições durante downloads. Cada snapshot recebe `savedAt`; o navegador restaura seu cache quando ele é mais recente que o servidor, e o SQLite recusa uma gravação atrasada mais antiga. O teste de ajuda/habilidades também retém POSTs de salvamento para comprovar a restauração após recarga durante uma sincronização pendente. A sincronização de relógio dos aparelhos é relevante para comparar snapshots entre dispositivos; as instâncias de combate continuam individuais.

O salvamento enviado pelo cliente inclui a conta de origem; o servidor rejeita uma requisição de página antiga quando o cookie já pertence a outra conta. Isso evita misturar personagens ao trocar de login durante uma gravação pendente.

## LAN 10 — auditoria pública, classes e celular

A nova revisão registrou respostas HTTP 200 de cinco endpoints públicos (wiki, missões, campos, NPCs e spawns). O relatório `docs/audit/zephira.md` e os JSONs de evidência ficam no repositório; o ZIP inclui `AUDITORIA.md`, `AUDITORIA.json` e `FONTES-PUBLICAS.json`. O script `node scripts/audit-zephira.mjs CAMINHO_DO_CLIENTE CAMINHO_DA_ANALISE_DECODIFICADA` reproduz a comparação estática. Ele verifica o hash do cliente original e a identidade das chaves do registro decodificado. A árvore sintática é apenas analisada, sem executar os decodificadores. O relatório documenta também os serviços não implementados.

As classes Fighter, Mechanician, Archer, Pikeman, Atalanta, Knight, Magician, Priestess, Assassin, Shaman e Martial Artist têm 16 habilidades próprias cada. O catálogo identifica classe e tipo visual de origem; o carregamento rejeita catálogo inconsistente. `/habilidades liberar` é exclusivo do admin e maximiza a classe atual. Os testes cobrem as 11 classes, isolamento, persistência e os caminhos locais de execução. Isso não equivale a validar as regras privadas de cada skill no servidor oficial. O adaptador agora também verifica morte, cidade, bloqueio do mundo e movimento aéreo antes de aceitar um cast, conforme o cliente público.

A barra da conta é recolhida em telas pequenas e toque, com botões de 44 px e margens para recortes de tela. Nos aparelhos de toque, o preset gráfico é potato, a escala de renderização 0.7 e o pixel ratio máximo 1. As ações Bolsa, Status e Habilidades usam o roteamento móvel nativo quando disponível. Não substituímos os controles originais por eventos de mouse artificiais. O aviso original de aceleração gráfica e a orientação de tela permanecem disponíveis.

**Internet no Windows 64 bits:** abra `INICIAR_INTERNET.bat`. O programa baixa a versão 2026.10.3 do executável oficial Cloudflare Tunnel, verifica SHA-256 e só executa o binário esperado. Usa a mesma pasta `.local-data`, inicia/reutiliza a LAN 10 na porta 19065 e imprime um link HTTPS após consultar a identificação do servidor pelo endereço externo. A URL é temporária; fechar o túnel ou desligar o PC encerra o acesso. O programa encerra somente processos que ele próprio iniciou. Túnel nomeado ou hospedagem são necessários para URL permanente.

Nesta infraestrutura, Cloudflare Tunnel, localtunnel e localhost.run foram bloqueados pela rede com HTTP 403; não foi possível publicar ou validar um link externo ativo. Os testes automatizados do iniciador verificam checksum, rejeição de falha e verificação do link antes de anunciar sucesso, mas não substituem uma conexão real a partir de outra rede.

Testes: `node --test tests/*.test.mjs`, `python -m unittest discover -s original-local/tests -v`, `npm run lint`; teste móvel com `PWEB_TEST_PASSWORD` e `node scripts/mobile-classes-smoke.mjs http://127.0.0.1:4200`. A emulação usa toque real via CDP; não é medição de desempenho em hardware móvel físico.

## Revisão 12

`/loja` ou F9 abre a loja premium. `/coins 1000` e `/coins bielbt 1000` são exclusivos do administrador. O ID é o login. Coins, estoque e tempo ativo ficam no SQLite, separados dos saves de personagem. Os monstros passam a perseguir e contra-atacar fora das cidades. As imagens das skills são ilustrações FREEston; as artes oficiais não foram recuperadas. Veja a auditoria atual em `../docs/audit/freeston-12.md`.

## Imagens da revisão 13

128 artes clássicas + variantes bloqueadas foram recuperadas para as classes 1–8, com associação por código e PNG sem alteração dos pixels. As 48 de Assassin, Shaman e Martial Artist ainda faltam. O livro informa quais são provisórias. Não há comprovação de equivalência com o pweb.world atual. Veja `AUDITORIA-IMAGENS-13.md` no ZIP e `docs/audit/skill-art-13.md` no repositório.
