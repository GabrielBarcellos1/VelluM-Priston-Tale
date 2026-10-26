// Presentation mirrors the server's redistribution of Aging failure probability.
export function agingEventChances(original,bonus=0){
 const row={...original};let left=Math.min(Math.max(0,Number(bonus)||0),100-row.plus1-row.plus2);
 for(const key of ['destroy','minus2','minus1','kept']){const moved=Math.min(left,row[key]);row[key]-=moved;row.plus1+=moved;left-=moved;}
 return {...row,success:row.plus1+row.plus2,fail:100-row.plus1-row.plus2};
}
export function eventExperience(base,effects){return Math.floor(base*Math.max(1,Math.min(10,effects?.xp??1)));}
