import json,collections,re,statistics
from pathlib import Path
base=Path(__file__).resolve().parents[1];db=json.loads((base/'data/skills.json').read_text(encoding='utf8'));ref=json.loads((base/'data/classic-skill-reference.json').read_text(encoding='utf8'))
mismatches=[]
def val(s):
 a=re.fullmatch(r'\s*([-+]?[\d,.]+)\s*',str(s))
 return float(a.group(1).replace(',','')) if a else None
def match_column(columns,names):
 for i,k in enumerate(columns):
  if k.casefold().replace(' ','') in names:return i
 return None
for skill in db['skills']:
 data=ref['skills'].get(skill['code'])
 if not data:continue
 rule=db['rules']['skills'][skill['code']]
 for field,keys in [('mp',{'mpusage','mp'}),('stamina',{'staminausage','stm','stmusage'})]:
  pos=match_column(data['columns'],keys)
  if pos is None:continue
  rows=data['levels'];old=rule.get(field,[])
  srcvals=[val(row[pos]) for row in rows]
  if len(old)==10 and all(n is not None for n in srcvals):
   diff=[(i+1,a,b) for i,(a,b) in enumerate(zip(old,srcvals)) if abs(float(a)-b)>0.01]
   if diff:mismatches.append({'code':skill['code'],'class':skill['className'],'field':field,'changedLevels':len(diff),'example':diff[:3],'old':old,'source':srcvals,'ref':data['source']})
print('MATCHES',len(ref['skills']),'DIFFERING RECORDS',len(mismatches),'CLASSES',collections.Counter((d['class'],d['field']) for d in mismatches))
for x in mismatches[:40]:print(x['class'],x['code'],x['field'],x['changedLevels'],x['example'])
out={'referenceCount':len(ref['skills']),'count':len(mismatches),'mismatches':mismatches}
(base/'data/classic-skill-resource-differences.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf8')
