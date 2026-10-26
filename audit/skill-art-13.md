# FREEston Tale 13 — recuperação das imagens de skills

**Resultado parcial: 128 artes clássicas recuperadas, das 176 skills. Faltam as 48 de Assassin, Shaman e Martial Artist. Não há confirmação de equivalência byte a byte com a revisão atual do pweb.world.**

## Origem comprovável

Os arquivos foram recuperados do cliente clássico público em [yweenzy/pristontale-1, revisão 299c615](https://github.com/yweenzy/pristontale-1/tree/299c615ed9a13f9ac394c6d0ac32f19e126b308d/bin/Client/image/Sinimage/skill). Trata-se de uma cópia pública comunitária do cliente clássico, não de um pacote autenticado do servidor Zephira atual.

A associação não foi inferida por aparência nem pela posição dos arquivos: `src/sinbaram/sinSkill.cpp` relaciona cada código `SKILL_*` ao nome do bitmap. Todos os 128 códigos das classes 1–8 estão presentes nessa tabela e correspondem ao catálogo local. Foram importados os arquivos coloridos e as variantes bloqueadas originais, totalizando 256 PNGs.

O formato do cliente altera apenas os primeiros 14 bytes do cabeçalho BMP. O importador restaura esse cabeçalho e codifica PNG **sem alterar, redimensionar ou redesenhar os pixels**. São preservadas as dimensões 49×46 e restaurada a transparência original da cor-chave preta. O manifesto [classic-skill-art.json](classic-skill-art.json) registra o caminho de origem, hash SHA-256 do BMP, do PNG e dos pixels RGB de cada variante.

Uma amostra comum, `Skill_Normal.bmp`, foi convertida e comparada com o PNG da CDN já capturado: os pixels RGBA são idênticos, incluindo a transparência preta. O [registro da amostra](skill-art-baseline-sample.json) valida a conversão; não comprova igualdade dos outros 128 arquivos com o pweb.world atual.

| ID | Classe | Artes clássicas | Situação |
|---|---|---:|---|
| 1 | Fighter | 16 | Recuperadas pelo código da skill |
| 2 | Mechanician | 16 | Recuperadas pelo código da skill |
| 3 | Archer | 16 | Recuperadas pelo código da skill |
| 4 | Pikeman | 16 | Recuperadas pelo código da skill |
| 5 | Atalanta | 16 | Recuperadas pelo código da skill |
| 6 | Knight | 16 | Recuperadas pelo código da skill |
| 7 | Magician | 16 | Recuperadas pelo código da skill |
| 8 | Priestess | 16 | Recuperadas pelo código da skill |
| 9 | Assassin | 0 | 16 ainda não recuperadas |
| 10 | Shaman | 0 | 16 ainda não recuperadas |
| 11 | Martial Artist | 0 | 16 ainda não recuperadas |

## Diferença visível no jogo

O livro das oito classes cobertas mostra as artes clássicas em PNG e informa essa procedência. O HUD nativo também recebe os PNGs correspondentes e pode solicitar a variante bloqueada pelo sufixo `_`.

Nas três classes não cobertas, o cabeçalho informa explicitamente que a arte oficial ainda não foi recuperada e que as ilustrações FREEston são provisórias. Elas não são identificadas como oficiais nem substituídas por artes de outra classe.

Todas as imagens recuperadas estão incluídas em `data/skill-art.json`; o servidor as entrega localmente. Depois de instalar, essas imagens não precisam da CDN original para carregar.

## Busca no oficial e limites

Nesta investigação, a página inicial pública de `https://pweb.world/` respondeu 200 e apontou para `/_app/index-BON4j44C.js`. O bundle atual, os endpoints de dados consultados e os caminhos de imagens clássicas consultados na CDN responderam 403. A resposta da CDN informou Cloudflare `error code: 1010`. Não se contornou essa proteção.

A comparação permaneceu limitada ao cliente público anteriormente capturado e às fontes públicas alternativas. Os repositórios consultados não forneceram as artes das três classes novas. Para completar as 176 e comprovar correspondência com o oficial atual, faltam os respectivos arquivos e a tabela que os associa às skills, obtidos de um cliente/pacote autorizado. A disponibilidade de oito classes clássicas não prova que as onze estejam resolvidas.

## Reprodução e validação

```sh
python scripts/import-classic-skill-art.py CAMINHO_DO_REPOSITORIO_CLASSICO
python -m unittest discover -s original-local/tests -q
node --test tests/*.test.mjs
# Navegador real, com senha fornecida pelo ambiente:
node scripts/freeston-skills-smoke.mjs http://127.0.0.1:19065
```

O importador exige a revisão fixa acima e grava hashes de origem. Os testes verificam os 256 PNGs, dimensões, CRCs, pixels RGB, a associação ao job e a ausência de uma atribuição falsa nas três classes pendentes. As rotas normal/bloqueada são verificadas sem acesso à CDN. O teste de navegador percorre os livros das 11 classes e diferencia artes clássicas de ilustrações provisórias.

A revisão 13 altera Python: feche a versão anterior, extraia o ZIP completo e copie `.local-data` e, opcionalmente, `.original-cache`. O número 13 aparece na barra. O atualizador em execução rejeita esse pacote porque exige reiniciar o backend; os dados da conta não devem ser substituídos.
