# Hospedagem VelluM

Instalacao ativa: C:\VelluM, no DESKTOP-UFGKQ0O.
Tarefa Windows: VelluM-Hosting, inicio no boot e verificacao a cada minuto, com bloqueio de instancias duplicadas e execucao independente de login.
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

Endereco oficial: https://acesso.gbtechnology.com.br/priston/ . O Nginx ja usado pelo Guacamole encaminha apenas /priston/ para host.docker.internal:19065; /guacamole/ conserva sua configuracao e suas conexoes. O tunel permanente do dominio permanece no servico Cloudflared existente. Nao e necessario criar outro dominio ou alterar DNS.

O backend tambem funciona na raiz e no prefixo /priston. Login, cookies, APIs, modulos, imagens e redirecionamentos respeitam o prefixo; cookies do jogo usam Path=/priston/. A instalacao e o banco SQLite sao os mesmos.

C:\VelluM\data\public-origin.json define {"url":"https://acesso.gbtechnology.com.br/priston"}. O supervisor verifica esse endereco e o apresenta em public-link.json, hosting-status.json e LINK_DO_JOGO.txt. O Quick Tunnel separado continua como alternativa temporaria, registrada em backupUrl; seu endereco pode mudar. O endereco oficial independe dele.

O script ops/install-priston-route.ps1 faz backup do proxy e do supervisor, valida nginx -t, aplica reload gradual e verifica o jogo e o Guacamole. Depois instala o supervisor atualizado e reinicia somente VelluM-Hosting. Backups ficam em C:\VelluM\backups\priston-route-DATA-HORA. Alterar ops/host.py no repositorio exige copiar a versao validada para C:\VelluM\ops\host.py e reiniciar a tarefa; o supervisor nao substitui seu proprio processo automaticamente.

O servidor depende do computador de hospedagem, Docker, internet e energia; nao depende do computador usado para acessar o Guacamole.

## Operacao no PowerShell como administrador

Consultar: Get-ScheduledTask -TaskName VelluM-Hosting
Parar: Disable-ScheduledTask -TaskName VelluM-Hosting; Stop-ScheduledTask -TaskName VelluM-Hosting
Iniciar: Enable-ScheduledTask -TaskName VelluM-Hosting; Start-ScheduledTask -TaskName VelluM-Hosting
Link: Get-Content C:\VelluM\LINK_DO_JOGO.txt
Estado: Get-Content C:\VelluM\data\hosting-status.json
Logs: Get-Content C:\VelluM\logs\host.log -Tail 40

Nao execute outro INICIAR.bat enquanto esta hospedagem estiver ativa. Para parar manualmente, confirme tambem que os filhos Python/cloudflared do supervisor terminaram; nao encerre o servico Cloudflared do Guacamole.

O supervisor nao pode atualizar a si mesmo em execucao. Este mecanismo cobre a aplicacao, nao uma garantia de atualizacao sem interrupcao de qualquer backend. Nao inclua segredos em commits: este repositorio e publico.


