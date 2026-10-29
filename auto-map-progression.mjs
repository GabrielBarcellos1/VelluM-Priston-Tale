export function nextAutomaticMap(level,currentId,rules){
  const current=rules.maps?.find(map=>map.id===currentId);
  if(!current||!Number.isFinite(current.experienceMax)||level<=current.experienceMax)return null;
  const candidates=rules.maps.filter(map=>
    map.id!==currentId&&Number.isFinite(map.experienceMin)&&Number.isFinite(map.experienceMax)&&
    map.experienceMin<=level&&map.experienceMax>=level&&
    (map.minimum??1)<=level&&map.experienceMin>current.experienceMin
  );
  candidates.sort((a,b)=>a.experienceMin-b.experienceMin||a.id-b.id);
  return candidates[0]??null;
}
