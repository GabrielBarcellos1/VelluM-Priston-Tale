# Faixas de EXP e perfil de teste real
Data: 26/10/2026.

Pedido: testar o Cavaleiro real do nivel1 ao120, com recursos normais do jogo; permitir apenas ataque e EXP acelerados. Mapas concluidos deixam de dar EXP.

Faixas locais VelluM, nao tabela privada oficial:
- Jardim/Estrada dos Ventos 1-10; Bamboo/Vale Tranquilo11-15; Acacias/Floresta das Ilusoes16-20.
- Refugio21-25, Castelo26-30, Ruinen31-35, Terra Maldita36-40, Terra Esquecida41-45, Oasis46-50. Alternativas raciais e mapas de caverna constam em balance.json.
- Restante da jornada tem faixas explicitas ate150. Rotas alternativas sobrepostas sao permitidas. O ultimo abate para no inicio do nivel imediatamente seguinte ao teto do mapa; nenhum premio GM pula varias faixas.
- A regra vale para EXP de monstros (incluindo bonus de XP), preservando drops e objetivos de quests em mapas antigos. Recompensas de quests continuam nas suas regras existentes. O cliente avisa a faixa e sugere outro mapa ao ultrapassar o teto.

O campo gmGameplayTest, exclusivo em efeito para staff, remove os beneficios da Sheltom na defesa/HP/MP/RES e ignora premiums antigos somente nessa sessao de teste e nos sorteios de drops. Itens, tempos e compras premium da conta sao preservados. O ataque +50 e a PocaoEXP GM permanecem. Nenhum personagem foi resetado por esta alteracao de codigo.

O perfil GM foi recalibrado para as novas faixas e considera monstros realmente presentes em map-spawns.json. Conserva a meta simulada de3600s de caca ativa com equipamento e skills legais; tempo de quests, compras, caminhada e operacoes de interface nao integra essa simulacao. Isso nao substitui nem comprova a execucao real de1a120.

Referencias de gameplay consultadas:
- https://wiki.priston.com.br/index.php/Guia_Iniciante
- https://forum.priston.com.br/forum/guia-do-pristoniano/guia-dos-morions/cavaleiro/2749-an%C3%A1lise-de-build
A interface e o catalogo VelluM de tiers1-4 prevalecem sobre numeros de builds BPT posteriores ou de tier5.

Validacoes: 129 testes Node, limites de faixa/cap e perfil sem protecao; testes Python da politica e de supressao de bonus de drop antigos. A execucao real do Cavaleiro sera registrada separadamente.
