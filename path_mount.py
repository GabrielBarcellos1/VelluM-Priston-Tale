"""Serve the existing client under /priston without changing its root installation."""
import json,re
PREFIX='/priston'
# Match actual root URLs, never the generic '/' separator used by the native client.
ROOT_URL=re.compile(r'''(?P<before>["'`(=\s])/(?P<path>(?:(?:assets|_app|api)/|(?:personagens|jogar|painel)(?=[?\#/'"`\s<>)\]}]|$)|[a-zA-Z0-9_-]+\.(?:mjs|css|html)(?=[?\#'"`\s<>)\]}]|$)))''')
ROOT_NAV=re.compile(r'''(location\.(?:assign|replace)\(\s*)(["'])/\2''')
ROOT_EXIT=re.compile(r'''(logoutAccount\s*\?\s*)(["'])/\2''')
ROOT_HREF=re.compile(r'''(\bhref\s*=\s*)(["'])/\2''')

def strip_mount(target):
    path,sep,query=target.partition('?')
    if path==PREFIX or path.startswith(PREFIX+'/'):
        return PREFIX,(path[len(PREFIX):] or '/')+(sep+query if sep else '')
    return '',target

def rewrite(data,content_type,prefix):
    if not prefix:return data
    if content_type.startswith(('text/html','text/css','text/javascript','application/javascript')):
        text=data.decode('utf-8')
        text=ROOT_URL.sub(lambda m:m['before']+prefix+'/'+m['path'],text)
        text=ROOT_NAV.sub(lambda m:m[1]+m[2]+prefix+'/'+m[2],text)
        text=ROOT_EXIT.sub(lambda m:m[1]+m[2]+prefix+'/'+m[2],text)
        if content_type.startswith('text/html'):text=ROOT_HREF.sub(lambda m:m[1]+m[2]+prefix+'/'+m[2],text)
        return text.encode('utf-8')
    if content_type.startswith('application/json'):
        # Only asset URL values, never gameplay state strings or numeric values.
        def visit(value):
            if isinstance(value,str) and value.startswith(('/assets/','/_app/')):return prefix+value
            if isinstance(value,list):return [visit(v) for v in value]
            if isinstance(value,dict):return {k:visit(v) for k,v in value.items()}
            return value
        return json.dumps(visit(json.loads(data)),ensure_ascii=False).encode('utf-8')
    return data

def header(name,value,prefix):
    if not prefix:return value
    if name.lower()=='location' and value.startswith('/') and not value.startswith('//') and not value.startswith(prefix+'/'):return prefix+value
    if name.lower()=='set-cookie':return re.sub(r'(?i)(;\s*Path=)/(?=;|$)',lambda m:m[1]+prefix+'/',value)
    return value

