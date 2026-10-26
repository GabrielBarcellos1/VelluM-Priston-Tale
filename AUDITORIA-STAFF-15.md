# FREEston Tale 15 — Staff, Teio e trajes

## Identidade, clã e distinções

O ID de login `admin` continua o mesmo; o nome do personagem passa a **VelluM**, incluindo os personagens já salvos da conta. O servidor força esse nome ao salvar. Uma migração preserva os demais atributos e progresso.

O SQLite passa a registrar o clã **Staff**, reservado às contas com papel `admin` ou `gm`. A associação é reconciliada pelo servidor em cada conexão com o banco; entrar, sair ou enviar outro nome de clã pelo save não altera essa regra. Rebaixar uma conta para jogador remove sua associação Staff na próxima reconciliação. Não foi adicionada uma conta GM nem um comando público para promover papéis.

O cliente usa a coroa BC nativa (`weapons/crown`) para Staff. A regra visual dá rank de coroa 1 aos membros Staff **sem substituir o dono competitivo de BC**. Um vencedor de outro clã conserva sua coroa e seu registro. A aura dourada sob os pés é um efeito próprio da distribuição, renderizado em Three.js, e possui duas classificações independentes: Staff por papel da conta; jogador por primeiro lugar da classe. O ranking de jogadores exclui ADM/GM, compara nível, EXP e ID como desempate estável. Clã/ranking/aura são atualizados a cada 20 segundos, sem novo login. O efeito não concede atributos.

A simulação ainda não implementa a disputa multiplayer completa de BC. A coroa honorária foi testada ao lado de um vencedor de BC simulado; isto não é evidência de uma disputa real entre clãs nesta distribuição.

## Conta preparada

A conta `huss` recebe somente o papel **player**, com a senha fornecida pelo usuário armazenada como PBKDF2. Sua classe padrão é mecânico (2). Na primeira inicialização desta revisão, a migração cria o personagem **Teio**, nível **149**, sem substituir um personagem já existente nessa conta/classe nem redefinir senhas alteradas.

| Espaço                     | Item                                               |
| -------------------------- | -------------------------------------------------- |
| Arma equipada              | Martelo Verus `WH131`, duas mãos, +20              |
| Alternativa na bolsa       | Garra Verus `WC129` +20 e Escudo Flame `DS127` +20 |
| Armadura                   | Deadly Armor `DA129` +20                           |
| Botas / luvas / braceletes | Verus `DB128`, `DG128`, `OA228`, +20               |
| Amuleto                    | Kelvezu `OA130`                                    |
| Anéis                      | Dois Anéis do Valento `OR205`                      |
| Sheltom                    | `OS117`                                            |

As peças usam os melhores valores disponíveis no catálogo público recuperado e especialização de mecânico quando há regra. Aging máximo é **+20**, apenas nas famílias aceitas pelo cliente; amuleto, anéis e sheltom não recebem aging artificial. Tiers sem requisitos/atributos publicados e itens temporários não substituem peças completas apenas por terem um código maior. As 16 skills da classe ficam no nível máximo local. O personagem tem atributos preparados para vestir essas peças; não se trata de um build ou balanceamento oficial comprovado.

Arma de duas mãos e escudo não ficam ativos ao mesmo tempo. Botão direito na garra guarda o martelo; depois, botão direito no escudo o equipa. Voltar ao martelo guarda o escudo se houver espaço na bolsa.

## Trajes no Item Shop nativo

O catálogo público tem 134 entradas com slot `COSTUME`. Foram adicionados os **50 códigos CA300–CA349**, pois possuem associação explícita de modelo PTM no cliente congelado. Os nomes, ícones e modelos permanecem os do cliente; a categoria aparece como **Trajes** ao lado de **Premiums**.

Preço local: **1000 coins** por traje, permanente para a conta, uma aquisição por código. A compra debita no SQLite com chave idempotente e inclui o item na bolsa. O botão direito equipa no slot de traje, preservando a armadura. O cliente fornece os atributos do item; não foi afirmado que estes trajes são exclusivamente cosméticos. **T** alterna sua exibição; a opção nativa “Sempre mostrar o traje” também é persistida. A posse é conferida no estoque do servidor ao restaurar/equipar. Equipado ou na bolsa, não duplica na atualização da carteira. Não é vendido a NPC nem transferido ao baú.

A compra e o carregamento do modelo `char/tmabcd/ptm/mechanic-m-a` do traje Mechanic foram verificados no navegador. A existência do mapeamento dos demais 49 modelos não equivale a um teste visual individual em todas as 11 classes. O primeiro carregamento continua dependendo dos arquivos estáticos públicos e da Internet.

## Verificação e instalação

- 43 testes Python: autenticação, persistência, migrações, Staff, ranking, transações e demais regras anteriores.
- 44 testes Node: equipamento de traje em slot próprio, categoria nativa e regras anteriores.
- `scripts/freeston-staff-smoke.mjs`: VelluM/Staff, coroa ao lado do vencedor de BC, exclusão Staff do ranking, Teio 149, troca real de martelo para garra + escudo, compra/vestimenta/PTM/T/restauração do traje, transferência da aura para outro jogador que ultrapassa o Teio.
- Os testes de navegador usam um banco temporário; contas de desafio, compras e alterações de equipamento de teste não entram no ZIP. A configuração inicial do Teio mantém o martelo equipado e a garra/escudo na bolsa.

Instale `freeston-tale-15.zip` completo: feche a versão anterior, extraia em outra pasta, copie `.local-data` e, opcionalmente, `.original-cache`, e execute o iniciador. O backend alterou; o atualizador de interface recusa corretamente a troca em execução. O login `huss` e o personagem inicial são criados ao iniciar a nova revisão. As limitações de mundo individual/combate no navegador continuam; `publicLaunchReady:false` é mantido.
