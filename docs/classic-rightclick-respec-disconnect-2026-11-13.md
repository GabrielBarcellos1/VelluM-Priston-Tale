# VelluM Classic — correção de DC e atalhos de atributos/inventário (13/11/2026)

## Cliente web publicado

Build WASM SHA-256 com prefixo `ed0022c61c0a`.

- Clique direito no **nome do atributo** ou no botão **+** de Força, Inteligência/Espírito, Talento, Agilidade/Destreza e Vitalidade/Saúde: calcula o maior requisito dentre itens de equipamento **já vestidos**, aplica somente o que falta limitado pelos pontos disponíveis, preserva a autenticação do personagem e recalcula equipamentos e dano em uma operação (evita centenas de envios por pontos individuais).
- Clique direito em equipamento existente no inventário: equipa **apenas quando há slot compatível livre**, respeitando requisitos, restrições de uso, slots de anéis e ocupação das duas mãos. Não modifica, descarta nem substitui equipamentos quando todos os slots compatíveis estão ocupados. Consumíveis mantêm o comportamento original.
- Aumento da tolerância web `RECONNECT_LIMIT_TIME` de 7 para 25 segundos, sem alterar a compilação nativa.
- Não alterados: dados de personagens, tabela de habilidades, validação de integridade, servidor Classic, Guacamole, VelluM legado.

**Backup do cliente publicado:** `C:\VelluM\backups\quickstats-equip-release-20261113-215545`. Arquivo de patch: `classic-web/patches/quick-stats-equip-reconnect.patch`.

### Testes concluídos

Build Emscripten compilou com sucesso. Smoke test local e público em desktop (1280×720) e emulação mobile (960×540): estado `Running`, quadros processados, exportações GM e SDL presentes, sem erros JavaScript. **Não realizado:** teste real de vestir/trocar equipamento e distribuir atributos com personagem autenticado; exige sessão de jogo.

## Diagnóstico do DC

Arquivo `dist/server/LogFile/11-13.log`: registros anteriores de `Character SkillPoint Error` e `Client Warning [Skill Forgery - 2]`, além de quedas por `Too many packets (270)` e `Too many packets (338)` (o segundo às 21:34:19). A rotina `SrcServer/OnSever.cpp` detectada em torno da linha 21653 desconecta ativamente a sessão (`DisconnectUser`) se `dwPacketAttackCount>251` em 5 segundos. Assim, o excesso de pacotes **é causa confirmada daqueles DCs específicos**, mas ainda não está provado qual operação gerou o pico. Os alertas de skill point não justificam desativar verificações de segurança.

## Correção do servidor: compilada, NÃO aplicada em produção

- Executável com limite de **450 pacotes por janela de 5s** foi compilado sem erro e salvo em `C:\VelluM\investigation\server-rate-limit-stage\server.packet-450.exe`; hash SHA-256 prefixo `8122e57e3deefef7`.
- A proteção de 5 segundos continua ativa; apenas o limite é ajustado para cobrir o pico legítimo observado de 338.
- Patch: `classic-server/patches/packet-rate-limit-legitimate-burst.patch`.
- O servidor Classic em execução **ainda utiliza limite 251**. Trocar o executável requer parar/reiniciar o Classic na porta 10007. **Não foi reiniciado**, preservando a disponibilidade, o Guacamole e o VelluM antigo. Não afirmar que o rate limiter em produção foi corrigido.

## Pendências

1. Implantar o executável Classic compilado durante janela autorizada de manutenção, salvando e validando rollback antes de retornar os jogadores. Verificar se todos os serviços na porta 10007 e a tarefa PristonServer voltam.
2. Teste real dos atalhos com vários equipamentos e itens ocupando slots; atualmente o clique direito **não substitui** peças existentes, para evitar riscos de duplicação/perda.
3. Teste real de redistribuição de skills, captura do timestamp da ação, número de pacotes, saldos de pontos e tentativa de reconexão.
4. Se o servidor registrar um erro real de SkillPoint após o reset, reparar a rotina de cálculo/validação legítima de pontos, sem desativar as validações.
