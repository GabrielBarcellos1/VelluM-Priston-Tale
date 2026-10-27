export function nextUpMap(level, currentId, rules, allowed) {
  const current=rules.maps?.find(m=>m.id===currentId);
  if(!current || current.experienceMax===undefined || allowed(level,currentId,rules)) return null;
  const options=rules.maps.filter(m=>m.id!==currentId && m.experienceMin!==undefined && m.minimum<=level && allowed(level,m.id,rules));
  const forward=options.filter(m=>m.experienceMin>current.experienceMin);
  const pool=forward.length?forward:options;
  pool.sort((a,b)=>b.experienceMin-a.experienceMin || a.id-b.id);
  return {current, next:pool[0]??null};
}
export function showUpMapNotice(info,doc=document) {
  let box=doc.getElementById('vellum-next-up-map');
  if(!info?.next){box?.remove();return;}
  if(!box){
    box=doc.createElement('aside');
    box.id='vellum-next-up-map';
    box.setAttribute('role','status');
    box.setAttribute('aria-live','polite');
    box.className='vellum-next-up-map';
    const title=doc.createElement('strong');
    title.className='vellum-next-up-title';
    title.textContent='Hora de mudar de mapa!';
    const detail=doc.createElement('span');
    detail.className='vellum-next-up-detail';
    box.append(title,detail);
    doc.body.append(box);
  }
  box.querySelector('.vellum-next-up-detail').textContent=
    'Seu mapa não rende mais EXP. Próximo mapa para UP: '+info.next.name+
    ' (nível '+info.next.experienceMin+'–'+info.next.experienceMax+').';
}
