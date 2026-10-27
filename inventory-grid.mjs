// Pinned native HUD buildInventory: both bags use cols:12, rows:6, cell:22.
export const BAG_COLUMNS = 12;
export const BAG_ROWS = 6;
export function canPlace(bag, item, x, y, ignore = null) {
  if (
    ![x, y, item.w, item.h].every(Number.isInteger) ||
    item.w < 1 ||
    item.h < 1 ||
    x < 0 ||
    y < 0 ||
    x + item.w > BAG_COLUMNS ||
    y + item.h > BAG_ROWS
  )
    return false;
  return !bag.some(
    (p) =>
      p !== ignore &&
      x < p.x + p.item.w &&
      x + item.w > p.x &&
      y < p.y + p.item.h &&
      y + item.h > p.y,
  );
}
export function firstSpace(bag, item) {
  if(!item||![item.w,item.h].every(Number.isInteger)||item.w<1||item.h<1||item.w>BAG_COLUMNS||item.h>BAG_ROWS)return null;
  for (let y = 0; y <= BAG_ROWS - item.h; y++)
    for (let x = 0; x <= BAG_COLUMNS - item.w; x++) if (canPlace(bag, item, x, y)) return { x, y };
  return null;
}
export function organizeBag(bag) {
  if(!Array.isArray(bag)||bag.some(p=>!p?.item||![p.item.w,p.item.h].every(Number.isInteger)||p.item.w<1||p.item.h<1||p.item.w>BAG_COLUMNS||p.item.h>BAG_ROWS))return null;
  const area=bag.reduce((n,p)=>n+p.item.w*p.item.h,0);
  if(area>BAG_COLUMNS*BAG_ROWS)return null;
  const sorted=[...bag].sort((a,b)=>b.item.w*b.item.h-a.item.w*a.item.h||b.item.h-a.item.h||b.item.w-a.item.w||String(a.item.code).localeCompare(String(b.item.code))||(a.item.uid??0)-(b.item.uid??0));
  if(!sorted.length)return [];
  // Search the lowest possible occupied height, with identical-shape symmetry pruning.
  // Bound work so a crowded bag cannot freeze the client; keep a valid old layout as fallback.
  for(let height=Math.max(...sorted.map(p=>p.item.h),Math.ceil(area/BAG_COLUMNS));height<=BAG_ROWS;height++){
    const rows=Array(height).fill(0),placed=[],failed=new Set();let budget=80000;
    const search=index=>{
      if(index===sorted.length)return true;
      if(--budget<0)return false;
      const {w,h}=sorted[index].item,previous=sorted[index-1]?.item;
      const lower=previous?.w===w&&previous?.h===h?placed[index-1].y*BAG_COLUMNS+placed[index-1].x+1:0;
      const key=index+':'+lower+':'+rows.join(',');if(failed.has(key))return false;
      for(let y=0;y<=height-h;y++)for(let x=0;x<=BAG_COLUMNS-w;x++){
        if(y*BAG_COLUMNS+x<lower)continue;
        const mask=((1<<w)-1)<<x;let free=true;
        for(let j=0;j<h;j++)if(rows[y+j]&mask){free=false;break;}
        if(!free)continue;
        for(let j=0;j<h;j++)rows[y+j]|=mask;
        placed[index]={x,y,item:sorted[index].item};
        if(search(index+1))return true;
        for(let j=0;j<h;j++)rows[y+j]^=mask;
        if(budget<0)return false;
      }
      failed.add(key);return false;
    };
    if(search(0))return placed;
  }
  const valid=[];
  for(const p of bag){if(!canPlace(valid,p.item,p.x,p.y))return null;valid.push({...p});}
  return valid;
}
export function repairBags(inv) {
  const target=inv;
  inv={...inv,bag:[...(inv.bag??[])],bagB:[...(inv.bagB??[])]};
  const overflow = [];
  for (const key of ["bag", "bagB"]) {
    const placed = [],
      pending = [];
    for (const p of inv[key] ?? []) {
      if (canPlace(placed, p.item, p.x, p.y)) placed.push(p);
      else pending.push(p);
    }
    for (const p of pending) {
      const position = firstSpace(placed, p.item);
      if (position) placed.push({ ...position, item: p.item });
      else overflow.push(p);
    }
    inv[key] = placed;
  }
  for (const p of overflow) {
    const key = firstSpace(inv.bag, p.item) ? "bag" : "bagB";
    const position = firstSpace(inv[key], p.item);
    if (!position)
      throw Error(
        "Inventário salvo excede duas bolsas; recuperação interrompida para preservar seus itens.",
      );
    inv[key].push({ ...position, item: p.item });
  }
  target.bag=inv.bag;target.bagB=inv.bagB;
}
export function swapWeaponSet(inv) {
  const spare = {};
  for (const slot of ["weapon", "shield"]) {
    if (inv.equip[slot]) spare[slot] = inv.equip[slot];
    if (inv.equipB?.[slot]) inv.equip[slot] = inv.equipB[slot];
    else delete inv.equip[slot];
  }
  inv.equipB = spare;
  inv.set = inv.set === "B" ? "A" : "B";
}
