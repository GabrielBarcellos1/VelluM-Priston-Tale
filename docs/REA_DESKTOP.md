# Cliente desktop enviado — investigação com REA

## Resultado

O `app.asar` enviado pelo proprietário contém o launcher Electron Zephira World **1.2.0**. O jogo é carregado de `https://pweb.world/` por `BrowserWindow.loadURL(SITE)`. O pacote não contém o motor do jogo, modelos, mapas, animações, tabelas de monstros, itens, drops ou regras do servidor.

A versão 1.2.0 identifica o launcher; o jogo remoto pode mudar independentemente dela. Este arquivo não substitui o bundle fixado por SHA do VelluM e não comprova qual versão do jogo estava em execução no computador do usuário.

## Procedência e método

- Entrada: `app.asar`, 117.268 bytes, SHA-256 `fdffc8870195703ea4ea2bf7b8afc4b1231eb72df0c7da3e2e6597e6c48332a4`.
- REA 6.8.0, `analyze-javascript-application`, formato ASAR, análise estática. Evidência: `ev_a445d1289966a86c8b2a08f211fbae7e18e3052dcae65c8989512d47520a4583`.
- Três arquivos JavaScript analisados, sem falhas de parse. Cabeçalho ASAR, limites dos cinco arquivos e seus hashes de integridade conferidos.
- Nenhum bootstrap, Electron, conexão ao jogo ou fluxo de login executado nesta análise.
- Inventário sanitizado: [evidencias/desktop-asar.json](evidencias/desktop-asar.json). Evidência completa e extração permanecem fora do repositório.
- Metadados do pacote: `private: true`, licença `UNLICENSED`. Código, ícone e ASAR enviados não foram incorporados ao VelluM ou redistribuídos.

## Conteúdo

| Arquivo | Bytes | Função observada |
|---|---:|---|
| `main.js` | 8.268 | Janela, carregamento remoto, navegação, permissões, fechamento |
| `preload.js` | 1.876 | Ponte `pwebDesktop`, versão 3, chamadas IPC |
| `taskbar.js` | 8.008 | Faixa compacta, bandeja e interação do mouse |
| `package.json` | 320 | Nome, versão e entrada do aplicativo |
| `build/icon.png` | 97.496 | Ícone do launcher |

## Comportamentos úteis à fidelidade

| Sistema | Evidência observada | Aplicação no VelluM | Estado |
|---|---|---|---|
| Entrada desktop | Uma instância, janela maximizada; tamanho base 1280×800, mínimo 800×600 | Dimensões para futura comparação desktop; não equivalem a layout mobile | Investigado |
| Comandos | Comentários explicam F1–F8 para skills e proteção F5/Ctrl+R delegada ao jogo remoto; handler explícito F11 alterna fullscreen | Verificar comandos na sessão local; comentários não bastam como teste das skills | Investigado |
| Fechamento | Ponte `setCloseGuard`, confirmação Sim/Não, padrão Não | Verificar persistência e confirmação ao sair do mundo quando houver execução desktop | Investigado |
| AFK compacto | Faixa 560×100, margem 8, `window.open` com nome `pweb-taskbar`; janela principal escondida | A faixa reutiliza a mesma sessão, não representa segundo login | Investigado |
| Mouse da faixa | `setClickThrough` e `setHover` controlam atravessar cliques | Exige Electron; não simular suporte nativo no navegador | Investigado |
| Segundo plano | `backgroundThrottling: false` na janela e faixa | Contexto útil ao relógio do jogo; não altera a evidência já obtida do tick nativo | Investigado |
| Login e preferências | Perfil Electron mantido em pasta própria do aplicativo | Não solicitar ou publicar cookies, localStorage ou perfil do usuário | Investigado |
| Offline | Página local de falha de carregamento com Tentar de novo | Não comprova reconexão de personagem durante uma sessão interrompida | Investigado |

As proteções de F5/Ctrl+R são descritas pelo launcher como responsabilidade do cliente web. O código do shell não implementa nem contém as regras das habilidades correspondentes.

## Uso do launcher instalado em um teste do VelluM

`main.js` lê a variável de ambiente **`PWEB_URL`** antes de usar o endereço padrão. Essa opção permite um teste privado com o launcher instalado apontando ao próprio servidor VelluM, sem modificar ou copiar o pacote original.

Roteiro ainda **não executado** neste ambiente Linux sem a instalação Electron do usuário:

1. Fechar o aplicativo Zephira World: a trava de instância única faria uma segunda abertura apenas focar a primeira.
2. Iniciar o VelluM em dados descartáveis e confirmar a URL local no navegador. Usar a porta que o servidor efetivamente imprimir e o prefixo `/priston/`, quando aplicável.
3. Em PowerShell, configurar `PWEB_URL` apenas no processo atual e iniciar o executável instalado. Exemplo para uma fixture já disponível na porta 4188:

```powershell
$previousVellumUrl = $env:PWEB_URL
try {
    $env:PWEB_URL = 'http://127.0.0.1:4188/priston/'
    Start-Process -FilePath (Join-Path $env:LOCALAPPDATA 'Programs\pweb-desktop\Zephira World.exe')
} finally {
    $env:PWEB_URL = $previousVellumUrl
}
```

O exemplo pressupõe esse nome/local do executável e servidor já iniciado; não configura servidor ou hospedagem. A variável é herdada no início do processo, sem alterar a configuração permanente do Windows. A integração da ponte com o VelluM ainda exige teste; não afirmar que AFK, fechamento ou fullscreen estão validados por este roteiro.

## Próximas verificações

- Comparar comandos F1–F8, F5, Ctrl+R e F11 no navegador e, quando disponível, no launcher com a URL do VelluM.
- Comparar guarda de fechamento entre login, seleção e mundo com conta descartável.
- Testar se a ponte nativa é reconhecida e se a faixa AFK preserva uma única sessão.
- Continuar a investigação do cliente web/mapas já em andamento. Este ASAR não fornece novas taxas de drop, atributos, modelos ou recursos gráficos do jogo.
