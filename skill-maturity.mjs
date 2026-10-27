// Provisional classic-inspired skill training: progress by successful activations/hits,
// not by wall-clock time. Sources agree that maturation is usage-based, but the exact
// rates vary across server eras. Never retroactively demote already learned skills.
export const MASTERY_MAX=10000;
export const HITS_PER_PERCENT=Object.freeze({1:5,2:7,3:10,4:12});
export function initialMastery(saved,code,learned,passive=false){
 if(!learned)return 0;
 if(passive)return MASTERY_MAX;
 const n=saved?.[code];
 return Number.isFinite(n)?Math.max(0,Math.min(MASTERY_MAX,Math.floor(n))):MASTERY_MAX;
}
export function trainingGain(tier,hits=1){
 const perPercent=HITS_PER_PERCENT[tier]??12;
 return Math.max(0,Math.ceil(Math.max(0,Math.min(100,hits))*100/perPercent));
}
export function afterSkillUse(mastery,tier,hits=1){
 return Math.min(MASTERY_MAX,Math.max(0,mastery)+trainingGain(tier,hits));
}
export function hitsRemaining(mastery,tier){
 const h=HITS_PER_PERCENT[tier]??12;
 return Math.ceil(Math.max(0,MASTERY_MAX-mastery)*h/100);
}
