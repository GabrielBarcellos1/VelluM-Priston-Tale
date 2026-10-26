"""Publish this installation through a temporary HTTPS Cloudflare tunnel."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit
import hashlib
import json
import platform
import re
import subprocess
import sys
import time
import os
import threading
import webbrowser
import release_info

ROOT = Path(__file__).resolve().parent
VERSION = '2026.10.3'
WINDOWS_SHA = '76b2805253d0d6ffacb092a7acfbee99e7af6917835c0c5410e23f3ef5052da2'
PORT = 19065


def tunnel_binary():
    if sys.platform != 'win32' or platform.machine().lower() not in ('amd64', 'x86_64'):
        raise RuntimeError('Este iniciador de Internet suporta Windows 64 bits. Use um tunel HTTPS para a porta 19065 no seu sistema.')
    target = ROOT / '.tools' / 'cloudflared.exe'
    if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == WINDOWS_SHA:
        return target
    print('Baixando Cloudflare Tunnel oficial (versao e SHA-256 verificados)...', flush=True)
    url = f'https://github.com/cloudflare/cloudflared/releases/download/{VERSION}/cloudflared-windows-amd64.exe'
    with urlopen(Request(url, headers={'User-Agent': 'FREEstonTale/'+str(release_info.VERSION)}), timeout=60) as response:
        data = response.read(64 * 1024 * 1024 + 1)
    if len(data) > 64 * 1024 * 1024 or hashlib.sha256(data).hexdigest() != WINDOWS_SHA:
        raise RuntimeError('O download nao corresponde ao SHA-256 esperado. Nada foi executado.')
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix('.download')
    temporary.write_bytes(data)
    temporary.replace(target)
    return target


def check_server():
    try:
        with urlopen(f'http://127.0.0.1:{PORT}/api/local/build', timeout=2) as response:
            data=json.load(response)
            return data.get('name')==release_info.BRAND and data.get('version')==release_info.VERSION and data.get('installation')==release_info.installation_id()
    except Exception:
        return False


def stop(process):
    if process and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def tunnel_command(binary):
    config=os.environ.get('FREESTON_TUNNEL_CONFIG')
    address=os.environ.get('FREESTON_PUBLIC_URL')
    if bool(config)!=bool(address):raise RuntimeError('Configure FREESTON_TUNNEL_CONFIG e FREESTON_PUBLIC_URL juntos.')
    if config:
        if not Path(config).is_file():raise RuntimeError('Arquivo de configuracao do tunel nomeado nao encontrado.')
        parsed=urlsplit(address)
        if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password or parsed.path not in ('','/') or parsed.query or parsed.fragment:
            raise RuntimeError('FREESTON_PUBLIC_URL deve ser um endereco HTTPS sem caminhos ou credenciais.')
        return [str(binary),'tunnel','--config',config,'--protocol','http2','--no-autoupdate','run'],address.rstrip('/')
    return [str(binary),'tunnel','--url',f'http://127.0.0.1:{PORT}','--protocol','http2','--no-autoupdate'],None


def verify_public_url(address):
    with urlopen(address + '/api/local/build',timeout=15) as response:
        data=json.load(response)
        return data.get('name')==release_info.BRAND and data.get('version')==release_info.VERSION and data.get('installation')==release_info.installation_id()


class LinkMonitor:
    def __init__(self,address):
        self.address=address
        self.stop_event=threading.Event()
        self.thread=threading.Thread(target=self.run,daemon=True)

    def start(self):
        self.thread.start()

    def run(self):
        verified_before=False
        while not self.stop_event.is_set():
            verified=False;error=None
            try:
                verified=verify_public_url(self.address)
                if not verified:error='O endereco ainda nao respondeu com esta versao do jogo.'
            except Exception as failure:
                error=str(failure)
            if self.stop_event.is_set():break
            release_info.write_link({'url':self.address,'verified':verified,'status':'online' if verified else 'verifying','error':error})
            if verified and not verified_before:
                print('\nLINK DO FREEston Tale VERIFICADO: '+self.address,flush=True)
            elif not verified and not verified_before:
                print('DNS/link ainda em verificacao. Nova tentativa automatica em 5 segundos. O endereco ja esta no painel.',flush=True)
            verified_before=verified
            self.stop_event.wait(20 if verified else 5)

    def stop(self):
        self.stop_event.set()
        if self.thread.is_alive():self.thread.join(timeout=1)


def main():
    server = tunnel = monitor = None
    address=None
    try:
        binary=tunnel_binary()
        if not check_server():
            server=subprocess.Popen([sys.executable,str(ROOT/'iniciar.py'),'--host','0.0.0.0','--port',str(PORT),'--no-browser'],cwd=ROOT)
            for _ in range(240):
                if server.poll() is not None:
                    raise RuntimeError('O servidor nao iniciou. Feche a versao antiga na porta 19065.')
                if check_server():break
                time.sleep(.5)
            else:raise RuntimeError('O servidor ainda nao esta disponivel. Confira os recursos.')
        print('FREEston Tale - acesso externo. Painel: http://127.0.0.1:'+str(PORT)+'/painel',flush=True)
        print('Mantenha esta janela aberta. Atualizacoes de interface nao exigem fechar o tunel.',flush=True)
        release_info.write_link({'status':'connecting','url':None,'verified':False})
        webbrowser.open(f'http://127.0.0.1:{PORT}/painel')
        command,named_address=tunnel_command(binary)
        tunnel=subprocess.Popen(command,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,errors='replace')
        if named_address:
            address=named_address
            release_info.write_link({'url':address,'status':'verifying','verified':False})
            (ROOT/'LINK_DO_JOGO.txt').write_text(address+'\nValido enquanto o tunel estiver ligado.\n',encoding='utf-8')
            print('ENDERECO CONFIGURADO DO FREEston Tale: '+address,flush=True)
            monitor=LinkMonitor(address);monitor.start()
        for line in tunnel.stdout:
            print(line.rstrip(),flush=True)
            match=re.search(r'https://[a-z0-9-]+\.trycloudflare\.com',line)
            if match and match.group(0)!=address:
                if monitor:monitor.stop()
                address=match.group(0)
                (ROOT/'LINK_DO_JOGO.txt').write_text(address+'\nValido enquanto o tunel estiver ligado.\n',encoding='utf-8')
                release_info.write_link({'url':address,'status':'verifying','verified':False})
                print('\nENDERECO DO FREEston Tale: '+address,flush=True)
                print('Copie no painel ou abra LINK_DO_JOGO.txt. Verificacao DNS em segundo plano.',flush=True)
                monitor=LinkMonitor(address);monitor.start()
        raise RuntimeError('O tunel encerrou. Confira as mensagens acima; o link deixa de funcionar ao encerrar.')
    finally:
        if monitor:monitor.stop()
        release_info.write_link({'status':'offline','url':address,'verified':False})
        stop(tunnel);stop(server)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nAcesso externo encerrado.')
    except Exception as error:
        print('Erro ao publicar: ' + str(error), file=sys.stderr)
        sys.exit(1)
