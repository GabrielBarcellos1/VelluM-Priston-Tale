# FREEston Tale 23 — pacote Priston Tale Brasil fornecido pelo usuário

## Escopo e evidências

Análise estática de priston-analise.zip: 1.012 entradas, 18.619.875 bytes descompactados, dois executáveis, 42 Lua e 109 INI. Extração conferiu caminhos e limites; nenhum executável ou Lua foi executado. Relatórios: `priston-br-23.json` (hashes, mapeamento, comparação e arquivos excluídos) e `rea-priston-23.json` (operações REA e inventário de scripts).

REA 6.7.0 leu a tabela de exports do game.exe: PE32/x86, dez exports; evidência ev_5a9d861ceaf9354c3fddbbc7ce7166465695b1d0bfb2011a34b574b03eeb4d1e. Esses exports não são tabelas de skills e não provam comportamento em execução. `inspect-pe-resources` recusou ambos os executáveis porque a faixa declarada de recursos não está integralmente respaldada pelos bytes de uma seção. PsTale.exe é identificado por `file` como PECompact2. Não se conclui que o jogo esteja corrompido: empacotamento pode produzir layouts diferentes em memória.

A tentativa de análise nativa completa no REA retornou `provider_unavailable`: nenhum Ghidra/Hopper/IDA/Kuna configurado. Não há descompilação de funções de combate nesta revisão. Não foram recuperadas fórmulas novas de dano, custo, cooldown, NPC, drops ou EXP do cliente fornecido.

## Comparação e alterações aplicadas

- 254 das 256 variantes das oito classes clássicas têm RGB idêntico ao catálogo anterior. As duas variantes de Maximize diferem; agora usamos as do pacote enviado.
- Importadas as imagens das 48 habilidades de Assassina, Xamã e Lutador Marcial: 16 por classe. Total de 176 habilidades e 352 variantes normal/desabilitada, todas 49×46. Importação sem redesenho, com hashes dos arquivos, pixels RGB e PNG; cabeçalho BMP recuperado pelo mesmo formato já suportado. Marcial usa BMP 32 bits, que agora é decodificado preservando alfa e a transparência de cor preta do cliente.
- Mapeamento explícito por código/nome da habilidade. Tufão e Grito de Guerra do Marcial têm nomes/níveis de arquivo em ordem diferente do catálogo FREEston. São associados semanticamente; isso não estabelece que a progressão das duas versões seja idêntica. Ordem, tiers, regras e saves locais foram preservados.
- Os 88 botões restantes não foram importados. Nenhuma habilidade de Tier 5 é adicionada. Validador rejeita tier fora de 1–4 e índice fora de 0–3, inclusive catálogo com 16 entradas mas uma delas Tier 5. Cada classe continua com quatro skills por tier.
- Interface usa a procedência `priston-br-upload`; evita identificar as novas imagens como placeholders.

## Tempos de efeitos não são regras de combate

Exemplo: `SkillWarriorDestroyer1.lua` define malhas, cor, tamanho, fades, atrasos de 0,05/0,1 s e vida visual de 0,3/0,4 s. `SkillTripleImpactHit.ini` define sequência de imagens e Delay=4,4,4,25,25. São descrições de efeitos. Nenhum desses valores foi copiado como cooldown, duração da animação corporal ou momento do dano. A unidade/execução desses valores depende do consumidor no cliente.

## Validação e lacunas

114 testes Node e 94 Python passam, incluindo limite de tier e validação de CRC, pixels, dimensões e hashes de todas as 352 imagens. O teste Chromium scripts/freeston-client-art-smoke.mjs passou para Assassina, Xamã e Marcial no cliente nativo: 16 habilidades por classe, tiers válidos e decodificação 49×46 de todas as imagens selecionadas. Janela nativa do Marcial conferida visualmente. O mesmo teste passou nas três classes usando o ZIP extraído; os arquivos de arte/catálogo e módulos do pacote foram comparados byte a byte com os arquivos validados. ESLint passou. Importador reproduzível: scripts/import-priston-br-art.py, com identidade dos dois executáveis conferida antes da escrita.

Jogabilidade privada não foi replicada por esta análise. Para confirmar regras de skills, a melhor próxima entrada é o código/configurações do servidor citado pelo usuário. Para investigação dos movimentos corporais, faltam os arquivos INX/modelos referenciados de `char/tmABCD`; o pacote atual não inclui essa pasta. Presença compartilhada e PvE local mantêm os limites da revisão 22; publicLaunchReady permanece falso.
