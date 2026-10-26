"""Apply compatible frontend ZIP updates while preserving the running backend/data."""
from pathlib import Path, PurePosixPath
from zipfile import ZipFile
import datetime
import tempfile
import uuid
import sys

ROOT=Path(__file__).resolve().parent
BACKEND=('gm_tools.py','data/gm-training.json','custom_skins.py','data/custom-skins.json','server_economy.py','boss_roulette.py','game_control.py','npc_services.py','data/premium.json','data/quests.json','data/loot-items.json','data/control-defaults.json','data/skills.json','data/balance.json','online_world.py','admin_service.py','iniciar.py','release_info.py','local_accounts.py','internet.py','premium_store.py','skill_icons.py')
DATA={'skills.json','skill-art.json','drops.json','wiki.json','quests.json','map-fields.json','map-npcs.json','map-spawns.json','premium.json','costumes.json','shop-items.json'}


def replace(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent,delete=False) as stream:
        stream.write(data);temporary=Path(stream.name)
    temporary.replace(path)


def apply_update(archive_path,root=ROOT):
    root=Path(root)
    with ZipFile(archive_path) as archive:
        entries=archive.infolist()
        if len(entries)>200 or sum(i.file_size for i in entries)>32*1024*1024:
            raise ValueError('Pacote excede o limite de atualizacao da interface.')
        names=set()
        for entry in entries:
            path=PurePosixPath(entry.filename)
            if path.is_absolute() or '..' in path.parts or '\\' in entry.filename or ':' in entry.filename or entry.filename in names:
                raise ValueError('Pacote contem caminhos invalidos ou duplicados.')
            names.add(entry.filename)
        for name in BACKEND:
            if name not in names or not (root/name).is_file() or archive.read(name)!=(root/name).read_bytes():
                raise ValueError('Esta versao altera o servidor Python. Feche o servidor e instale o ZIP completo. Nenhum arquivo foi alterado.')
        allowed={p.name for suffix in ('*.mjs','*.css','*.html') for p in root.glob(suffix)}
        allowed|={'data/'+name for name in DATA}
        changes={name:archive.read(name) for name in names if name in allowed and (not(root/name).exists() or archive.read(name)!=(root/name).read_bytes())}
    if not changes:return 0
    backup=root/'.updates'/(datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'-'+uuid.uuid4().hex[:6])
    previous={name:(root/name).read_bytes() if (root/name).is_file() else None for name in changes}
    try:
        for name,old in previous.items():
            if old is not None:replace(backup/name,old)
        for name,data in changes.items():replace(root/name,data)
    except Exception:
        for name,old in previous.items():
            if old is None:(root/name).unlink(missing_ok=True)
            else:replace(root/name,old)
        raise
    return len(changes)


def main():
    filename=sys.argv[1] if len(sys.argv)>1 else None
    if not filename:
        try:
            import tkinter
            from tkinter.filedialog import askopenfilename
            app=tkinter.Tk();app.withdraw()
            filename=askopenfilename(title='FREEston Tale - escolher atualizacao',filetypes=[('Pacote ZIP','*.zip')]);app.destroy()
        except Exception:filename=input('Cole o caminho do ZIP: ').strip().strip('"')
    if not filename:return
    count=apply_update(filename)
    print(f'FREEston Tale: {count} arquivos de interface atualizados. O tunel e o servidor continuam ligados.')
    print('No jogo, clique em Salvar e atualizar quando o aviso aparecer. Backup em .updates.')


if __name__=='__main__':
    try:main()
    except Exception as error:
        print('Atualizacao nao aplicada: '+str(error),file=sys.stderr);sys.exit(1)
