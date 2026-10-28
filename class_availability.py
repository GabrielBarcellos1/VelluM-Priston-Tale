"""Reversible suspension of three classes and their exclusive equipment."""
DISABLED_JOBS=frozenset((9,10,11))
DISABLED_FAMILIES=frozenset(('WD1','WN1','WV1'))
def active_job(job):
    return type(job) is int and job not in DISABLED_JOBS and 1<=job<=11
def active_item(item):
    if not isinstance(item,dict):return False
    return item.get('family',item.get('code','')[:3]) not in DISABLED_FAMILIES and item.get('spec') not in DISABLED_JOBS and item.get('code')!='CA300'

def active_product(product):
    return active_item(product.get('definition', product))
