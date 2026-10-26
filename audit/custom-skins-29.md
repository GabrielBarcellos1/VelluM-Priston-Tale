# Coleção Ceifador Safira — VelluM, versão 29

Coleção de modelos 3D originais inspirada na foto de foice fornecida pelo usuário. O acabamento é uma interpretação estilizada: aço azul, cristais facetados, filigrana dourada, caveira e ossos. A foto foi usada como referência visual para reconstrução; não fornece a geometria oculta ou as texturas de um arquivo 3D original.

## Conteúdo

17 variantes para 12 tipos de arma: foice, arco, martelo, machado, garra, espada, lança, varinha, cajado, adagas, fantasma e punhos. Famílias que aceitam equipamentos de uma e duas mãos têm ofertas separadas. O catálogo inclui os nomes, códigos de encaixe e preços.

Os arquivos `.glb` são modelos completos glTF 2.0, com geometria e materiais incorporados, que podem ser abertos em editores compatíveis, incluindo Blender. O comprimento segue o eixo +Y e a origem representa a empunhadura. O adaptador do VelluM ajusta a orientação e a escala ao equipar. Os modelos usam entre 1.736 e 7.372 triângulos por arma.

`Colecao-Safira.png` e `Foice-Safira.png` são visualizações dos próprios triângulos exportados. `Previa-no-Jogo.jpg` mostra a prévia WebGL real aberta na loja, dentro de um ambiente local de teste com conta sintética.

## Uso no jogo

Reabra o jogo e use **/skins**, ou o botão Skins. Busque “Ceifador Safira”. O botão **Ver modelo 3D** permite girar e aproximar o modelo. Comprar concede a skin permanentemente à conta; equipar exige arma da mesma família e número de mãos.

Preço inicial: **3.000 coins por foice** e **2.500 coins por outra variante**. Em **Painel ADM → Loja de Skins**, é possível alterar preço, nome, descrição e disponibilidade. Alterações administrativas existentes são preservadas nas atualizações. Coins são a moeda interna do servidor; nenhum pagamento real foi configurado.

## Integração

A camada cosmética acompanha os pontos de encaixe e animações da arma original, inclusive a posição nas costas nas cidades. As ferramentas de ambas as mãos são tratadas separadamente para armas duplas. O material original é restaurado ao remover o visual; malhas e materiais da skin são liberados ao trocar a arma ou encerrar a sessão.

Os modelos são gerados pelo cliente a partir do código da coleção. O arquivo original da arma continua servindo como ponto de encaixe; a geometria desenhada é substituída pela nova malha. Os GLBs são exportações editáveis dessa mesma geometria, não uma dependência de download durante o jogo. O servidor valida compra, propriedade, compatibilidade e a identificação cosmética enviada aos demais jogadores.

A skin não altera dano, defesa, alcance, velocidade, Aging, requisitos ou habilidades. O brilho azul e os detalhes dourados pertencem à aparência; não conferem bônus.

## Validação

161 testes automatizados: 106 JavaScript e 55 Python. Incluem as 17 geometrias, coordenadas finitas, normais unitárias, orçamento de triângulos, compatibilidade de família/mãos, compra, equipamento, remoção, preservação dos atributos, material original restaurado, liberação das malhas, propriedade do visual nos pacotes online e preservação das edições administrativas.

Validação visual feita em ambiente descartável com conta sintética: carregamento da loja, prévia 3D da foice, equipamento, remoção e reequipa­mento. O diagnóstico do cliente confirmou uma malha cosmética ativa sobre a ferramenta da arma e zero após remover. Os 17 GLBs tiveram assinatura e comprimento validados. Isso não equivale a testar todas as animações de todas as 11 classes ou uma sessão visual com dois jogadores reais.
