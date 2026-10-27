import json,re,urllib.request,html,unicodedata,difflib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
names={'Fighter':'Fighter','Mechanician':'Mechanician','Archer':'Archer','Pikeman':'Pikeman','Atalanta':'Atalanta','Knight':'Knight','Magician':'Magician','Priestess':'Priestess','Assassin':'Assassin','Shaman':'Shaman','Martial Artist':'MartialArtist'}
head=re.compile(r'<div class="skill" id="([^"]+)">',re.I)
level=re.compile(r'<table class="skill-levels">(.*?)</table>',re.I|re.S)
tr=re.compile(r'<tr[^>]*>(.*?)</tr>',re.I|re.S)
td=re.compile(r'<(?:td|th)[^>]*>(.*?)</(?:td|th)>',re.I|re.S)
tag=re.compile(r'<[^>]+>',re.S)
def clean(s):return html.unescape(tag.sub('',s)).strip().replace('\xa0',' ')
def normalize(x):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',x.casefold()).encode('ascii','ignore').decode())
def read_table(source):
 markers=list(head.finditer(source));result=[]
 for i,m in enumerate(markers):
  chunk=source[m.start():markers[i+1].start()] if i+1<len(markers) else source[m.start():]
  title=re.search(r'<h3[^>]*>(.*?)</h3>',chunk,re.I|re.S);table=level.search(chunk)
  if not title or not table:continue
  rows=[[clean(c) for c in td.findall(row)] for row in tr.findall(table.group(1))]
  if len(rows)<11 or any(not r or r[0]!=str(j) for j,r in enumerate(rows[1:11],1)):continue
  result.append({'name':clean(title.group(1)),'columns':rows[0][1:],'levels':[r[1:] for r in rows[1:11]]})
 return result
catalog=json.loads((ROOT/'data/skills.json').read_text(encoding='utf8'))
out={'sources':{},'skills':{},'unmatched':[]}
for name,slug in names.items():
 url='https://pristonworld.com/EPT/Skill-'+slug+'.html'
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  tables=read_table(urllib.request.urlopen(req,timeout=16).read().decode('utf8'))
 except Exception as error:
  print('ERROR',name,str(error),flush=True);out['sources'][name]={'url':url,'error':str(error)};continue
 print('FETCHED',name,len(tables),flush=True)
 out['sources'][name]={'url':url,'skills':len(tables)}
 for s in (s for s in catalog['skills'] if s['className']==name):
  source=s.get('nameOriginal') or s['name'];direct=[t for t in tables if normalize(t['name'])==normalize(source)]
  if len(direct)==1:
   t=direct[0];out['skills'][s['code']]={'name':s['name'],'class':name,'tier':s['tier'],'source':url,'sourceName':t['name'],'confidence':'exact','columns':t['columns'],'levels':t['levels']}
  else:
   nearest=sorted([(round(difflib.SequenceMatcher(None,normalize(source),normalize(t['name'])).ratio(),3),t['name']) for t in tables],reverse=True)[:3]
   out['unmatched'].append({'code':s['code'],'name':source,'class':name,'suggestions':nearest})
path=ROOT/'data/classic-skill-reference.json'
path.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print('SUMMARY',len(out['skills']),'missing',len(out['unmatched']))
for x in out['unmatched']:print('MISSING',x['class'],x['code'],x['name'],x['suggestions'])
