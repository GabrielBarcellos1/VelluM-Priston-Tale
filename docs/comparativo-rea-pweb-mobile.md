# Referência de desempenho e mobile: Zephira World × VelluM Classic

Data: 13/11/2026. Escopo: observação passiva da página pública https://pweb.world/ (sem autenticação, sem extrair nem reutilizar recursos proprietários) e do VelluM Classic autorizado.

## Ferramentas e evidências

- [REA](https://github.com/morluto/rea), CLI `rea-agents` 6.9.0, `list-browser-targets` e `analyze-web-bundle`.
- CDP no Edge isolado, alvo público `https://pweb.world/`.
- Evidência detalhada gravada apenas na máquina de desenvolvimento em `C:\VelluM\investigation\rea-pweb-result.json` (não publicar bundles de terceiros).
- REA observou 2 scripts, incluindo um bundle principal de aproximadamente 7,6 MB e outro de 106 KB. **A análise estática foi parcial**: o script principal atingiu o limite de 15s; não é evidência de mecanismos internos completos.
- Auditoria passiva complementar com Puppeteer em desktop e viewport mobile, sem login.

## Observações verificadas

| Característica | pweb.world (página pública) | VelluM Classic antes das mudanças |
| --- | --- | --- |
| Renderização | Canvas WebGL; framebuffer 1024×576 exibido em 1366×768 no desktop observado | WebGL 2; framebuffer 1024×768 e escala CSS |
| Mobile | Canvas 292×633 exibido em 390×844 no teste; viewport-fit=cover | Canvas de base fixa; HUD touch ausente |
| Recursos | URLs `/assets/...`, diversas texturas PNG, transferência incremental por recursos | `data_manifest.txt`, `data_startup.pack`, assets legados BMP/TGA |
| Cache | JS e CSS com nomes hash e Cache-Control `public,max-age=31536000,immutable`; imagens com TTL de 86400s | SW de cache por hash com manifestos e boot pack |
| Web app | Webmanifest observado | Sem controles touch especializados |
| Diagnóstico GPU | Alerta público sobre aceleração por hardware desativada no teste mobile emulado | Configurações de qualidade/sombra existentes |

Observação: o alerta de GPU no teste emulado não demonstra que os aparelhos reais tenham aceleração desativada; é um efeito possível da emulação headless. Tempo medido no login público não corresponde a tempo de entrar na partida.

## Melhorias implementadas

- `classic-web/mobile-controls.js` (publicado no cliente web): controles touch de movimento, corrida, inventário, mapa, skills e ação; botão Gráficos para abrir configurações próprias do jogo.
- Desktop permanece sem HUD touch.
- Testes emulado mobile 390×844 e desktop 1280×720 passaram: jogo no estado Running, controles visíveis apenas no mobile, evento de teclado enviado uma única vez, configurações de sombras e qualidade acessíveis.
- Servidor do jogo 10007 não foi reiniciado.

## Otimização preparada, ainda não lançada

- Teste de pack sem `StartImage/Opening/*`: de 84.462.955 bytes brutos (44.667.958 gzip) para 49.390.959 bytes brutos (23.219.641 gzip).
- Teste separado usando headers COOP/COEP para SharedArrayBuffer: jogo alcançou Running. Entretanto, requisições adicionais para 13 arquivos grandes da abertura foram detectadas.
- **Não publicar esse pack sem teste de login e seleção de personagem**, pois o ganho pode ser anulado por downloads individuais durante a abertura.

## Próximos itens técnicos

1. Medir o percurso completo até aparecer o mapa, em PC novo e celular real: tempo de transferência, tempo de compilação WASM, tempo de seleção do personagem e quedas WebSocket.
2. Adaptar projeção/canvas e interface interna do motor para framebuffer dinâmico no mobile; CSS esticado sozinho não basta. Testar controles touch na partida real, inclusive mouse/teclado SDL.
3. Produzir versões otimizadas **dos nossos próprios** ícones e texturas, com pipeline compatível com a decodificação BMP/TGA do motor. Não substituir extensões sem alterar decodificador.
4. Ajustar sombras por capacidade gráfica (4K no desktop; níveis ajustáveis no celular), sem perder opção HD.
5. Criar cenários de benchmark: FPS médio/p95, consumo de memória, número de draw calls e tempo de map load; priorizar estabilidade da conexão.
6. Usar assets e código com licenças próprias ou autorizadas; não copiar código nem mídia protegida do pweb.world.

## Limitações

A interface pública não demonstra o comportamento autenticado do pweb.world, nem sua implementação nativa de gameplay mobile. As propostas que dependem disso são hipóteses a validar, não conclusões confirmadas.
