"""VelluM map XP ranges; normal and staff training share the same limits."""
import json, math
from functools import lru_cache
from pathlib import Path

@lru_cache(maxsize=1)
def rules():
    return json.loads((Path(__file__).parent/'data/balance.json').read_text(encoding='utf-8'))

def experience_allowed(level, field):
    config=next((m for m in rules()['maps'] if m['id']==field),{})
    return config.get('experienceMin',1)<=level<=config.get('experienceMax',rules()['maxLevel'])

def cap_experience(amount, stats, field):
    if not experience_allowed(stats.get('level',1),field):
        return 0
    data=rules()
    config=next((m for m in data['maps'] if m['id']==field),{})
    maximum=config.get('experienceMax',data['maxLevel'])
    limit=data['experience'][maximum] if maximum<data['maxLevel'] else 2**53-1
    return max(0,min(math.floor(amount),limit-stats.get('exp',0)))
