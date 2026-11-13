# VelluM Classic — motor gráfico WebGL e suporte mobile (13/11/2026)

## Estado publicado

- **Cliente WebAssembly:** SHA-256 prefixo `75988d219d6a`, publicado no site Classic por atualização dos arquivos `game.js` e `game.wasm`.
- **Backup para rollback:** `C:\VelluM\backups\native-graphics-release-20261113-203623`.
- **Renderização nativa adaptada na inicialização:** desktop de 1366×768 → 1280×720; mobile horizontal 844×390 → 960×540; mobile vertical 390×844 → 800×600. Canvas e superfície OpenGL são criados nas resoluções reais; não é apenas o CSS.
- **Modo de proporção:** `classic-web/aspect-ratio.js` calcula a proporção a partir das dimensões reais do framebuffer e permite alternar preencher/proporcional em tempo de execução.
- **Controle por toque:** `classic-web/mobile-controls.js` agora usa os exports `_PtWeb_MobileKey` e `_PtWeb_MobileMouse`, que inserem eventos na fila SDL do motor. Inclui joystick, corrida, ataque, habilidades, inventário, mapa e acesso às configurações de gráficos.
- **Qualidade adaptativa:** desktop mantém sombras 4096; dispositivos touch recebem qualidade 1024/2048 conforme hardware e distância de visão adaptada, preservando qualidade máxima das texturas.
- **Texturas:** filtragem anisotrópica habilitada apenas quando `EXT_texture_filter_anisotropic` está disponível. Limite 4× desktop, 2× mobile; fallback 1× sem extensão. Melhora potencial de nitidez oblíqua, não substitui assets por texturas HD.
- **Catálogo GM:** ícones convertidos para PNG e carregamento lazy permanecem independentes da atualização do renderizador.

## Arquivos versionados

- `classic-web/patches/native-resolution-touch-anisotropy.patch`: mudanças propostas para `Winmain.cpp`, `ptplatform.cpp` e `ptgfx_surface.cpp`. O patch Winmain é incremental sobre a versão com os ajustes de GM/Shift existentes no cliente Classic.
- `classic-web/mobile-controls.js`
- `classic-web/aspect-ratio.js`
- `classic-web/settings.js`
- `classic-web/fullscreen.css`
- `classic-web/premium-picker.js`
- `classic-web/scripts/convert-catalog-icons.ps1`

## Evidências e limites dos testes

| Teste | Resultado |
|---|---|
| Compilação Emscripten (212 arquivos) | Aprovada |
| Inicialização WebGL 2 local | Aprovada em desktop e mobile emulados |
| Inicialização no endereço público | Aprovada em desktop e mobile |
| Frames após conclusão da inicialização pública | Observados após alguns segundos |
| Eventos SDL gerados por controles touch | 8 eventos recebidos no teste público com corrida/ataque/joystick |
| Proporção nativa | Erro inferior a 0,3% nas três orientações |
| Extensão anisotrópica | Presente no navegador testado, máximo reportado 16, limites aplicados em código |
| OpenGL/WebGL | Sem erro no teste automatizado |
| Porta Classic 10007 e VelluM antigo 19065 | Continuaram acessíveis; servidores nativos não foram reiniciados |

**Não validados automaticamente:** autenticação real de jogador, seleção de personagem, percurso no mapa, combate, habilidade, câmera, FPS em celular físico, recuperação de desconexão e telemetria de partidas. Esses testes dependem de uma sessão de jogador e aparelhos reais. Não afirmar aprovação desses itens.

**Resolução dinâmica:** a seleção do framebuffer é feita na inicialização. Mudanças de orientação após o jogo iniciar usam o CSS responsivo; não há reconstrução automática de render targets sem reinicialização.

## Carregamento inicial: decisão baseada em benchmark

- Pack atual: **84.462.955 bytes brutos / 44.667.958 bytes gzip**, 1.587 arquivos.
- Pack sem `StartImage/Opening`: **23.219.641 bytes gzip**, mas o jogo buscou **53 arquivos da abertura logo de início**, chegando aos **161 arquivos removidos** após observação mais longa. Não publicado.
- Gzip nível 9 com os arquivos originais: **44.409.718 bytes**, ganho de somente **258.240 bytes (0,58%)**. Também não publicado.
- Conclusão: manter pack original evita regressões por solicitações individuais; otimização substancial exige pipeline de inicialização por fases, com pré-carregamento coordenado e autenticação/mudança de mapa testadas ponta a ponta.

## Cuidados operacionais

Não reiniciar Docker, Guacamole, servidor nativo Classic 10007 ou VelluM antigo 19065 para essas mudanças web. Ao atualizar o WASM, mudar o hash de `game.js?v=...` e `ENGINE_CACHE` no service worker para evitar cache de binário antigo. Sempre fazer backup do HTML, JS, WASM e SW antes de publicar, e confirmar que o jogo chega a `Running` e que os controles atingem a fila SDL.

## Pendências reais

1. Testes com conta de jogador e celular físico, incluindo movimentação real, ataque, câmera e 15–30 minutos de estabilidade da sessão.
2. Refatoração do carregador em pacotes faseados com estratégia de cache e validação de autenticação/seleção/mapa, para reduzir latência sem multiplicar requests.
3. Pipeline de assets originais de alta resolução/licenciados e modernização dos shaders além de filtragem anisotrópica (a engine atual usa o combiner de D3D6).
4. Recriação segura do framebuffer em mudança de orientação sem perder a sessão, se os testes de GUI permitirem.
5. Benchmark quantitativo de FPS, uso de memória/GPU e imagem lado a lado em dispositivos reais.
