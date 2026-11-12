# Priston Tale clássico — auditoria de preparação para beta público
**Atualização:** 12/11/2026 — Brasil

## Decisão de lançamento
**Ainda NÃO aprovado para divulgação ampla.** A infraestrutura passou nos 32 testes automatizados, mas um lançamento público exige testes autenticados de gameplay, capacidade e recuperação de dados que ainda não foram concluídos.

## Alterações implementadas e publicadas nesta rodada
1. **Autenticação protegida.** O servidor manteve `*OFFLINE_PASSWORDS` ativo (já havia sido configurado anteriormente) e substituiu o armazenamento de novos logins por PBKDF2-HMAC-SHA256, 150.000 iterações, salt aleatório por conta. Contas antigas são verificadas com seu hash anterior e migradas após um login correto, sem redefinição de senha. Contas `adm` e `admin` não podem ser registradas novamente se seus registros faltarem. Foram validados 15 casos em teste C++ isolado, incluindo criação e migração.
2. **Cheats de testes desativados.** Removidos os flags ativos `*GM_CHEATS` e `*ADMIN_COMMAND` da configuração do servidor público. Os comandos de GM continuam autorizados pelo ID de login autenticado. O valor antigo do segredo administrativo não foi copiado para o repositório.
3. **Limite inicial de 30 contas**, em vez das 10 anteriores. Isso é apenas ajuste de configuração, NÃO prova suporte a 30 jogadores simultâneos.
4. **Servidor recompilado, testado em homologação separada e publicado.** Build Windows x86 ReleaseGL passou; servidor de teste iniciou na porta 10008, sem interferir no principal. Versão de produção reiniciada pela tarefa `PristonServer` e confirmou porta 10007. O servidor VelluM antigo na porta 19065 não foi alterado.
5. **Backups automáticos a cada seis horas** pela tarefa Windows `PristonClassicDataBackup`, executada sob SYSTEM, retenção de 56 cópias (14 dias), manifesto SHA-256 por arquivo e verificação de que o original não mudou durante a cópia. Execução real da tarefa terminou com código 0 e 13 arquivos conferidos. **Esses backups estão no mesmo computador** e não substituem recuperação de desastre externa.
6. **Auditoria ampliada de 20 para 32 verificações** (`ops/audit-priston-classic.py`), todos os 32 itens aprovados nesta rodada: binários, portas, HTML, permissões, recursos, autenticação, segredos desativados, bridge do WebSocket, dados e cópia automática.

## Backups e reversão
- Configuração + base completa antes da segurança: `C:\VelluM\backups\classic-public-safety-20261112-195707`
- Binário antes da substituição da autenticação: `C:\VelluM\backups\classic-admin-authfix-20261112-200759`
- Snapshots recorrentes: `C:\VelluM\backups\scheduled-classic-YYYYMMDD-HHMMSS`
- Nunca restaurar um snapshot de personagem por cima da base ativa sem conferir consistência e usuários conectados.

## Código e ferramentas reproduzíveis
- `ops/priston-classic-live-20261112.patch`: alterações acumuladas sobre fontes originais Priston.
- `ops/patch-classic-password-pbkdf2.py`: correção de autenticação nas fontes.
- `ops/create-priston-auth-harness.py`: testes unitários C++ para autenticador (15/15 aprovados).
- `ops/prepare-classic-public-config.py`: protege a configuração, com backup prévio.
- `ops/scheduled-classic-backup.py`: rotina de snapshot.
- `ops/audit-priston-classic.py`: auditoria de 32 itens somente leitura.

## Portões ainda abertos: NÃO declarar 100% pronto
| Requisito | Estado / motivo |
| --- | --- |
| Login/cadastro real no cliente 3D | **Pendente:** tentativa automatizada no ambiente de testes foi inconclusiva; teste unitário não substitui registro/login real |
| Logout/login: nível, inventário, quests, itens boss e skills persistentes | **Pendente:** precisa de personagem isolado e verificação antes/depois, incluindo queda de conexão |
| Progressão nível 1 ao máximo sem GM | **Pendente:** quests, tiers, mestres, NPC, recompensas, transição de mapas, equipamentos |
| Combate, bosses, drops e economia | **Pendente:** testes com monstros reais, multiplayer e verificação de abuso de pacotes |
| Capacidade de 30 jogadores e reconexão | **Pendente:** teste de carga com tráfego autenticado e medição de CPU, RAM, memória de IIS, WebSocket e disco |
| Recuperação após falha do PC | **Pendente:** executar simulação de restauração em ambiente isolado e configurar cópia fora do mesmo computador |
| Segurança em produção | **Parcial:** contas protegidas; requer testes adversariais controlados contra duplicação de itens, teleport ilegal, rate limit, senha fraca, manipulação do cliente e indisponibilidade |
| Tradução integral PT-BR e apresentação widescreen nativa | **Pendente:** configurado PT-BR, mas há textos antigos e o jogo 4:3 está esticado horizontalmente |
| Monitoramento/observabilidade | **Parcial:** logs e tarefa Windows existem; falta alerta externo proativo, métricas de uptime, erros de login e retenção de logs |
| Hospedagem 24h | **Pendente:** serviço ainda depende do computador local e do túnel, sem HA/VPS dedicado |
| Direitos de distribuição do jogo e dos recursos originais | **Verificar antes de divulgação pública**, sem inferir autorização pelo acesso ao repositório |

## Critérios mínimos para o anúncio público
1. 2 contas de jogador e 1 de ADM autenticam e conseguem sair/voltar preservando o personagem.
2. Ao menos uma progressão do zero por classe habilitada, incluindo tiers 1–4 e NPCs/quests essenciais.
3. Combate, compras, loot, trade e inventário passam em testes de integridade e duplicação.
4. Carga e reinicialização da máquina validadas, incluindo backup e recuperação em outra máquina/disco.
5. Monitoramento, documentação de suporte e segurança mínima do serviço colocados em operação.

**Nota:** os 32/32 verificam a infraestrutura/configuração e não são 32 casos reais de gameplay. Não usar esse placar como alegação de jogo completo ou seguro para promoção massiva.

## Proteção adicional do gateway (12/11/2026, 20h19)
- Aplicado limite de 64 sessões WebSocket ativas por aplicação IIS, com `Interlocked.Increment/Decrement` e limpeza em `finally`.
- Proteção homologada no handler da página local e aplicada ao site público, também persistida no código original `src/web/site/ws.ashx` dentro do patch reproduzível.
- Teste público após alteração: 8/8 conexões WebSocket de diagnóstico abertas com sucesso; página HTTP 200; Priston clássico 10007 e VelluM antigo 19065 ativos.
- O limite de 64 **não** corresponde a 64 jogadores suportados e não elimina abuso distribuído; falta controle de taxa por usuário autenticado e teste de carga real.
- Script de aplicação: `ops/patch-classic-ws-quotas.py`. Backup do handler público: `C:\\VelluM\\integration-priston\\ws.ashx.before-quota-20261112-201905.bak`.
- Os testes unitários de senha cobriram 15/15 casos e a versão live passou no checklist automatizado. A tentativa de testar um registro no cliente 3D da homologação foi inconclusiva; **não considerar login/registro/persistência end-to-end aprovados**.
