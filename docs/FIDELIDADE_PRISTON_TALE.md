# Matriz de fidelidade — VelluM Priston Tale

Estados permitidos: **Não investigado**, **Investigado**, **Implementação parcial**, **Implementado**, **Testado**, **Validado contra referência**. “Testado” significa teste local identificado; não implica igualdade com o original. Prioridades P0: dados/segurança impeditivos; P1: divergência perceptível/combate/estabilidade; P2: cobertura e visual; P3: refinamentos e documentação.

| Sistema | Original / referência disponível | VelluM atual | Diferença ou incerteza | Prioridade | Estado |
|---|---|---|---|---|---|
| Execução/publicação | Não determina o host independente | Python/SQLite, supervisor Windows acompanha main | Preservar infraestrutura; documentação tem caminhos históricos | P0 | Investigado |
| Dados e contas | Dados privados não são referência autorizada | SQLite, geração de personagem, sessões e auditoria | Autoridade de combate/inventário comum ainda depende do cliente | P0 | Implementação parcial |
| Login/logout/reconexão | Cliente público e UI; contas originais não usadas | Contas locais e UI própria | Teste visual e reconexão real pendentes | P1 | Investigado |
| Criação/seleção | Recursos fixados e layouts documentados | Retratos/cena 3D e seleção local | Histórico contém substituições e animação desativada deliberadamente | P1 | Implementação parcial |
| Classes | Tiers 1–4 de classes clássicas | Jobs 9/10/11 desativados por decisão do projeto | Não reativar; saves antigos devem permanecer intactos | P0 | Testado |
| Promoção | Clássico tem provas; VelluM tem decisão própria | Promoção simplificada pelo mestre | Diferença intencional, não reintroduzir provas removidas | P0 | Testado |
| Movimento/câmera | Motor do cliente fixado | Motor nativo + estabilidade/controles locais | Giro de borda desativado intencionalmente; comparação visual pendente | P1 | Implementação parcial |
| Colisões/mapas | Recursos públicos e grafo | Terreno nativo, travel e rollback locais | Workaround de fronteira Bamboo/Acácias pode reposicionar e bloquear retorno | P1 | Implementação parcial |
| Progressão automática de mapa | Personalização VelluM | Opt-out habilitado no histórico recente | Preservar escolha; não confundir com clássico | P1 | Testado |
| Spawn/respawn | Zonas públicas, regras privadas ausentes | População e sorteio locais | Frequência, posições, respawn e RNG não validados globalmente | P1 | Implementação parcial |
| IA dos monstros | Atributos e clipes públicos | IA/dano locais com relógio de animação para ataques | Combate de monstros é individual por navegador | P1 | Implementação parcial |
| Ataque comum | Clipes/eventos e tabelas públicas | Impacto/dano adaptados | Sincronização visual real e autoridade incompletas | P1 | Implementação parcial |
| Habilidades T1–T4/L1–10 | 176 definições; fontes de diferentes versões | Runtime por habilidade e fallback | Parâmetros parciais, relógios, cancelamentos e validação precisam auditoria | P1 | Implementação parcial |
| Cooldown | Tabelas clássicas + medições comunitárias | Perfis/overrides e persistência | Não equivale a 1.760 medições; sanitização unificada e testada; identidade histórica não comprovada | P1 | Testado |
| Hits/áreas/recursos | Clipes e geometrias públicas | Hits agendados por timeout, áreas e custos locais | Débito antes da validação corrigido e testado; relógio dos impactos ainda em investigação | P1 | Implementação parcial |
| Atributos/EXP/nível | Fórmulas clássicas e dados parciais | Curvas e perfil VelluM | Personalizações intencionais; fórmulas privadas não recuperadas | P1 | Implementação parcial |
| Inventário/equipamento | Slots e grade nativos | Duas bolsas, conjuntos e persistência parcial | Testes existentes não certificam todos os itens/visuais | P1 | Implementação parcial |
| Consumíveis/premiums | Intervalos públicos e catálogo local | Poções, buffs e loja próprios | Regras de economia e alguns efeitos são personalizados | P1 | Implementação parcial |
| Drop/ouro | Não há tabela oficial completa autorizada | Sorteio Python, abates relatados pelo cliente | Perfil próprio; não afirmar taxas oficiais | P1 | Implementação parcial |
| Lojas/NPCs | Listas públicas e janela nativa | Lojas comuns diretas, premium separado | Preservar a abertura direta recém-aprovada | P1 | Investigado |
| Mix/Force/Aging/skins | Interfaces e parte das fórmulas públicas | Serviços nativos + transações Python | Receitas de Aging locais e catálogo desativado por classe | P2 | Implementação parcial |
| Quests clássicas | Definições e fontes heterogêneas | Interpretador, endgame e promoções simplificadas | Não reintroduzir cadeias removidas; cobrir transações e persistência | P1 | Implementação parcial |
| Party/chat/interações | Comportamentos conhecidos, servidor privado ausente | Presença/chat compartilhados e suporte local | Combate/monstros/drops não são um MMO compartilhado | P1 | Implementação parcial |
| Modelos/texturas/armaduras | Arquivos públicos do cliente fixado | Motor nativo + skins locais | Proporções, equipamentos e variantes pedem inspeção visual | P2 | Implementação parcial |
| Efeitos/iluminação/morte | Motor e recursos públicos | Efeitos nativos com pacotes locais | Temporização e dados de entrada podem divergir mesmo com arte correta | P1 | Implementação parcial |
| HUD/minimapa/inventário/skills | UI nativa e versão específica | UI nativa com alterações locais/responsivas | Preservar mudanças intencionais, testar escalas e estados | P2 | Implementação parcial |
| Mobile/comandos | Motor e defaults existentes | Adaptações recentes de HUD/chat | Histórico indica mudanças deliberadas; testes de toque reais pendentes | P1 | Investigado |
| Eventos/dungeons/PvP | Sem autoridade privada completa | Sistemas locais parciais | Não declarar equivalência nem lançamento público completo | P2 | Implementação parcial |

Nenhum sistema recebeu nesta auditoria o estado “Validado contra referência”. A matriz será atualizada por evidência verificável, não por quantidade de commits.
