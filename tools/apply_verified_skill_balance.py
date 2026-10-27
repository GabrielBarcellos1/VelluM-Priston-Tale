"""Apply only exact-name per-level reference MP/stamina, and recovered-client Fighter damage tables."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'data/skills.json'
catalog=json.loads(path.read_text(encoding='utf8'))
refs=json.loads((ROOT/'data/classic-skill-reference.json').read_text(encoding='utf8'))
changes=[]
for skill in catalog['skills']:
 code=skill['code']
 ref=refs['skills'].get(code)
 if not ref or ref['confidence']!='exact':continue
 rule=catalog['rules']['skills'][code]
 for field,labels in [('mp',{'mpusage','mp'}),('stamina',{'staminausage','stmusage','stm'})]:
  index=next((i for i,k in enumerate(ref['columns']) if re.sub(r'[^a-z]','',k.lower()) in labels),None)
  if index is None:continue
  raw=[row[index] for row in ref['levels']]
  if any(not re.fullmatch(r'\d+',str(n)) for n in raw):continue
  numbers=[int(n) for n in raw]
  if len(numbers)!=10 or field not in rule or len(rule[field])!=10:continue
  if rule[field]!=numbers:
   changes.append({'code':code,'class':skill['className'],'field':field,'before':rule[field],'after':numbers,'source':ref['source']})
   rule[field]=numbers
   if rule.get('runtime') and field in rule['runtime']:rule['runtime'][field]=numbers.copy()
# Existing recovered-code damagePercent is already correct; runtime combat was not using it for five Fighter attacks.
for code in ['SKILL_RAVING','SKILL_IMPACT','SKILL_TRIPLE_IMPACT','SKILL_BRUTAL_SWING','SKILL_RAGE_OF_ZECRAM']:
 rule=catalog['rules']['skills'][code]
 table=rule['damagePercent']
 if len(table)!=10 or not all(entry.get('model')=='weapon' for entry in rule['runtime']['attacks']):
  raise ValueError('Unsafe Fighter damage mapping '+code)
 before=[entry.get('percent') for entry in rule['runtime']['attacks']]
 if before!=table:
  for entry,pct in zip(rule['runtime']['attacks'],table):entry['percent']=pct
  changes.append({'code':code,'class':'Fighter','field':'damagePercent','before':before,'after':table,'source':'Classic Brazilian client tables already preserved in rules.skills[code].damagePercent'})
path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(ROOT/'data/classic-skill-changes.json').write_text(json.dumps({'changes':changes,'count':len(changes),'revisedSkills':len(set(x['code'] for x in changes))},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('APPLIED',len(changes),'SKILLS',len(set(x['code'] for x in changes)))
for x in changes[:12]:print(x['class'],x['code'],x['field'],x['before'][:3],'=>',x['after'][:3])
