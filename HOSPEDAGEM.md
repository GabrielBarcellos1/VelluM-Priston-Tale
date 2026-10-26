# Hospedagem VelluM

Instalacao ativa: C:\VelluM, no DESKTOP-UFGKQ0O.
Tarefa Windows: VelluM-Hosting, inicio no boot e execucao independente de login.
Python fixado: Python 3.13 em C:\Users\Usuario\AppData\Local\Programs\Python\Python313\python.exe.

## Pastas no servidor

- app: arquivos em execucao.
- repository: copia Git usada para buscar a branch main a cada 60 segundos.
- data: banco SQLite, estado da hospedagem e link publico.
- cache: recursos do cliente.
- backups: copias SQLite consistentes diarias e antes de atualizacoes do backend.
- logs: host.log, game.log e tunnel.log.
- ops/host.py: supervisor instalado separadamente; alteracoes nesse arquivo exigem atualizar o supervisor instalado.
- LINK_DO_JOGO.txt: endereco externo atual.

## Atualizacoes

Publique commits na branch main deste repositorio. O supervisor busca mudancas em ate aproximadamente um minuto, valida sintaxe Python e JSON e copia os arquivos permitidos para app.

HTML, CSS e JavaScript sao publicados sem reiniciar o Python. Clientes que ja estao abertos precisam usar Salvar e atualizar/recarregar para executar os novos scripts. Isso nao substitui em memoria o JavaScript de uma sessao aberta.

Alteracoes em Python e JSON reiniciam automaticamente o processo do jogo. O tunel continua ativo; pode haver uma breve indisponibilidade e o estado ainda nao salvo pelo cliente pode ser perdido. Metodos de configuracao do painel ja previstos pelo jogo podem aplicar mudancas sem esse reinicio.

Uma falha no teste de saude apos publicar o backend restaura os arquivos anteriores. Isso nao desfaz automaticamente migracoes de banco: ha um backup antes da publicacao. A revisao rejeitada fica bloqueada ate novo commit ou intervencao do operador.

Arquivos locais de contas/personagens nao sao publicados nem substituidos. O banco e o cache ficam fora da pasta versionada. A instalacao atual preserva os arquivos seed existentes localmente. Para instalacao limpa em outra maquina, copie os exemplos vazios para accounts.seed.json e characters.seed.json e prepare a conta administrativa localmente.

## Endereco publico

O jogo usa um Quick Tunnel separado do tunel do Guacamole. O endereco trycloudflare.com e temporario e pode mudar apos reinicio/falha do tunel. O servidor nao garante funcionamento com falta de energia, internet ou PC desligado. Para endereco fixo, configure um dominio e tunel permanente.

## Operacao no PowerShell como administrador

Consultar: Get-ScheduledTask -TaskName VelluM-Hosting
Parar: Stop-ScheduledTask -TaskName VelluM-Hosting
Iniciar: Start-ScheduledTask -TaskName VelluM-Hosting
Link: Get-Content C:\VelluM\LINK_DO_JOGO.txt
Estado: Get-Content C:\VelluM\data\hosting-status.json
Logs: Get-Content C:\VelluM\logs\host.log -Tail 40

Nao execute outro INICIAR.bat enquanto esta hospedagem estiver ativa. Para parar manualmente, confirme tambem que os filhos Python/cloudflared do supervisor terminaram; nao encerre o servico Cloudflared do Guacamole.

O supervisor nao pode atualizar a si mesmo em execucao. Este mecanismo cobre a aplicacao, nao uma garantia de atualizacao sem interrupcao de qualquer backend. Nao inclua segredos em commits: este repositorio e publico.
