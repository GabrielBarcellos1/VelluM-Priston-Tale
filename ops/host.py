"""VelluM Windows host: supervised game/tunnel, Git deployment, SQLite backup."""
from pathlib import Path
import ast
import datetime
import json
import logging
from logging.handlers import RotatingFileHandler
import os
import re
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

BASE = Path(__file__).resolve().parents[1]
APP = BASE / 'app'
REPO = BASE / 'repository'
STATE = BASE / 'data'
LOGS = BASE / 'logs'
GIT = r'C:\Program Files\Git\cmd\git.exe'
TUNNEL = r'C:\Program Files (x86)\cloudflared\cloudflared.exe'
REPO_URL = 'https://github.com/GabrielBarcellos1/VelluM-Priston-Tale.git'
FLAGS = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
ENV = dict(os.environ, PWEB_DATA_DIR=str(STATE), PWEB_CACHE_DIR=str(BASE / 'cache'),
           PYTHONUNBUFFERED='1', PYTHONUTF8='1', GIT_TERMINAL_PROMPT='0', GCM_INTERACTIVE='never')
for folder in (STATE, LOGS, BASE / 'backups'):
    folder.mkdir(parents=True, exist_ok=True)
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s',
                    handlers=[RotatingFileHandler(LOGS / 'host.log', maxBytes=2_000_000,
                                                  backupCount=4, encoding='utf-8')])
log = logging.getLogger('vellum')


def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
        stream.write(data)
        temp = Path(stream.name)
    temp.replace(path)


def status_file(name, data):
    atomic(STATE / name, json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8'))


def build(url='http://127.0.0.1:19065'):
    with urllib.request.urlopen(url + '/api/local/build', timeout=8) as response:
        return json.load(response)


def git(*args):
    result = subprocess.run([GIT, '-c', 'safe.directory=' + str(REPO), '-C', str(REPO), *args],
                            capture_output=True, env=ENV, creationflags=FLAGS, timeout=90)
    if result.returncode:
        raise RuntimeError('Git ' + args[0] + ' failed: ' + result.stderr.decode(errors='replace')[-600:])
    return result.stdout


def allowed(name):
    path = Path(name)
    if path.is_absolute() or '..' in path.parts or '\\' in name or ':' in name:
        return False
    if any(part.startswith('.') for part in path.parts):
        return False
    if name in ('data/accounts.seed.json', 'data/characters.seed.json'):
        return False
    return (len(path.parts) == 1 and path.suffix in ('.py', '.mjs', '.css', '.html', '.md', '.txt', '.json', '.bat', '.yml')
            and name != 'LINK_DO_JOGO.txt') or (len(path.parts) == 2 and path.parts[0] == 'data' and path.suffix == '.json')


def backup():
    source = STATE / 'accounts.sqlite3'
    if not source.exists():
        return
    filename = BASE / 'backups' / ('accounts-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f') + '.sqlite3')
    with sqlite3.connect(str(source), timeout=20) as src, sqlite3.connect(str(filename)) as dest:
        src.backup(dest)
    log.info('SQLite backup: %s', filename.name)


class Host:
    def __init__(self):
        self.game = None
        self.tunnel = None
        self.url = None
        self.last_backup = 0
        self.deployed = None
        self.failure = None
        self.backend_failures = 0
        self.next_git = 0
        self.next_tunnel = 0
        self.next_game = 0
        self.update_status = {}
        self.failed_revision = None
        try:
            old = json.loads((STATE / 'deployment.json').read_text(encoding='utf-8'))
            self.deployed = old.get('commit')
            self.failed_revision = old.get('failedCommit')
        except (OSError, ValueError):
            pass

    def start_game(self):
        output = open(LOGS / 'game.log', 'ab', buffering=0)
        try:
            self.game = subprocess.Popen([sys.executable, '-u', str(APP / 'iniciar.py'), '--host',
                                          '127.0.0.1', '--port', '19065', '--no-browser'],
                                         cwd=APP, env=ENV, stdout=output, stderr=subprocess.STDOUT,
                                         creationflags=FLAGS)
        finally:
            output.close()
        self.next_game = time.monotonic() + 15
        log.info('Game started, PID %s', self.game.pid)

    def stop_game(self):
        if self.game and self.game.poll() is None:
            self.game.terminate()
            try:
                self.game.wait(timeout=15)
            except subprocess.TimeoutExpired:
                self.game.kill()
                self.game.wait(timeout=5)
        self.game = None

    def restart_game(self):
        self.stop_game()
        self.start_game()
        for _ in range(30):
            time.sleep(1)
            try:
                if build().get('name'):
                    return
            except Exception:
                pass
            if self.game.poll() is not None:
                break
        raise RuntimeError('Game failed its post-deploy health check')

    def tunnel_output(self, process):
        with open(LOGS / 'tunnel.log', 'a', encoding='utf-8') as output:
            for line in process.stdout:
                output.write(line)
                output.flush()
                match = re.search(r'https://[a-z0-9-]+\.trycloudflare\.com', line)
                if match and process is self.tunnel:
                    self.url = match.group(0)
                    atomic(BASE / 'LINK_DO_JOGO.txt', (self.url + '\n').encode())
                    log.info('Public URL: %s', self.url)

    def start_tunnel(self):
        self.url = None
        self.tunnel = subprocess.Popen([TUNNEL, 'tunnel', '--url', 'http://127.0.0.1:19065',
                                        '--protocol', 'http2', '--no-autoupdate'], cwd=BASE, env=ENV,
                                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                       text=True, encoding='utf-8', errors='replace', creationflags=FLAGS)
        threading.Thread(target=self.tunnel_output, args=(self.tunnel,), daemon=True).start()
        self.next_tunnel = time.monotonic() + 30
        log.info('Separate game tunnel started, PID %s', self.tunnel.pid)

    def deploy(self):
        if not (REPO / '.git').is_dir():
            result = subprocess.run([GIT, 'clone', '--branch', 'main', '--single-branch', REPO_URL, str(REPO)],
                                    capture_output=True, env=ENV, creationflags=FLAGS, timeout=90)
            if result.returncode:
                raise RuntimeError('Git repository not ready: ' + result.stderr.decode(errors='replace')[-400:])
        git('fetch', '--quiet', 'origin', 'main')
        target = git('rev-parse', 'origin/main').decode().strip()
        if target == self.deployed or target == self.failed_revision:
            return
        dirty = git('status', '--porcelain').decode().strip()
        if dirty:
            raise RuntimeError('Deployment repository has local edits; refusing to overwrite them')
        git('merge-base', '--is-ancestor', 'HEAD', target)
        names = git('ls-tree', '-r', '--name-only', target).decode().splitlines()
        manifest = {name: git('show', target + ':' + name) for name in names if allowed(name)}
        if 'iniciar.py' not in manifest:
            raise RuntimeError('Repository has no complete application yet')
        if sum(map(len, manifest.values())) > 32 * 1024 * 1024:
            raise RuntimeError('Deployment exceeds 32 MB source limit')
        for name, content in manifest.items():
            if name.endswith('.py'):
                ast.parse(content.decode('utf-8-sig'), filename=name)
            elif name.endswith('.json'):
                json.loads(content.decode('utf-8-sig'))
        changes = {name: content for name, content in manifest.items()
                   if not (APP / name).is_file() or (APP / name).read_bytes() != content}
        previous_manifest = []
        try:
            previous_manifest = json.loads((STATE / 'managed-files.json').read_text())
        except (OSError, ValueError):
            pass
        removed = [name for name in previous_manifest if name not in manifest and allowed(name)]
        changed_names = list(changes) + removed
        restart = any(name.endswith(('.py', '.json')) for name in changed_names)
        previous = {name: (APP / name).read_bytes() if (APP / name).is_file() else None
                    for name in changed_names}
        if restart:
            backup()
        try:
            # Stop before replacing backend modules, so requests cannot import a mixed release.
            if restart:
                self.stop_game()
            for name, content in changes.items():
                atomic(APP / name, content)
            for name in removed:
                (APP / name).unlink(missing_ok=True)
            if restart:
                self.restart_game()
        except Exception:
            self.stop_game()
            for name, content in previous.items():
                if content is None:
                    (APP / name).unlink(missing_ok=True)
                else:
                    atomic(APP / name, content)
            self.failed_revision = target
            status_file('deployment.json', {'commit': self.deployed, 'failedCommit': target,
                                           'status': 'rolled-back', 'updatedAt': time.time()})
            self.start_game()
            raise
        git('merge', '--ff-only', '--quiet', target)
        self.deployed = target
        self.failed_revision = None
        status_file('managed-files.json', list(manifest))
        self.update_status = {'commit': target, 'status': 'current', 'filesChanged': len(changed_names),
                              'backendRestarted': restart, 'updatedAt': time.time()}
        status_file('deployment.json', self.update_status)
        log.info('Deployed %s, files %s, backend restart %s', target[:12], len(changed_names), restart)

    def run(self):
        self.start_game()
        self.start_tunnel()
        while True:
            now = time.monotonic()
            if self.game.poll() is not None and now >= self.next_game:
                log.error('Game exited: %s; restarting', self.game.returncode)
                self.start_game()
            if self.tunnel.poll() is not None and now >= self.next_tunnel:
                log.error('Game tunnel exited; restarting')
                self.start_tunnel()
            healthy = False
            try:
                info = build()
                healthy = bool(info.get('name'))
            except Exception:
                pass
            self.backend_failures = 0 if healthy else self.backend_failures + 1
            if self.backend_failures >= 6:
                log.warning('Game health check repeatedly failed; restarting')
                self.stop_game()
                self.start_game()
                self.backend_failures = 0
            if now >= self.next_git:
                try:
                    self.deploy()
                    self.failure = None
                except Exception as error:
                    self.failure = str(error)
                    log.error('Deployment: %s', error)
                self.next_git = time.monotonic() + 60
            if now - self.last_backup >= 86400:
                try:
                    backup()
                    self.last_backup = now
                except Exception as error:
                    log.error('Backup: %s', error)
            public_ok = False
            if self.url and healthy:
                try:
                    public = build(self.url)
                    public_ok = public.get('installation') == info.get('installation')
                except Exception:
                    pass
            status_file('public-link.json', {'url': self.url, 'verified': public_ok,
                                            'status': 'online' if public_ok else 'verifying',
                                            'updatedAt': time.time()})
            status_file('hosting-status.json', {'gameHealthy': healthy, 'gamePid': self.game.pid,
                        'tunnelPid': self.tunnel.pid, 'publicUrl': self.url, 'publicVerified': public_ok,
                        'commit': self.deployed, 'updateError': self.failure, 'updatedAt': time.time()})
            time.sleep(10)


if __name__ == '__main__':
    # The lock is released by Windows even after a crash or forced task termination.
    import msvcrt
    singleton = open(BASE / '.host.lock', 'a+b')
    singleton.seek(0, 2)
    if singleton.tell() == 0:
        singleton.write(b'0')
        singleton.flush()
    singleton.seek(0)
    try:
        msvcrt.locking(singleton.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError:
        raise SystemExit('VelluM supervisor already running')
    # Reclaim only this application's orphaned children after a supervisor crash.
    cleanup = r'''Get-CimInstance Win32_Process | Where-Object {
        ($_.Name -eq 'python.exe' -and $_.CommandLine -like '*C:\VelluM\app\iniciar.py*') -or
        ($_.Name -eq 'cloudflared.exe' -and $_.CommandLine -match '--url\s+http://127\.0\.0\.1:19065(?:\s|$)')
    } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }'''
    subprocess.run([r'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe',
                    '-NoProfile', '-NonInteractive', '-Command', cleanup],
                   capture_output=True, creationflags=FLAGS, timeout=30)
    host = Host()
    try:
        host.run()
    finally:
        host.stop_game()
        if host.tunnel and host.tunnel.poll() is None:
            host.tunnel.terminate()

