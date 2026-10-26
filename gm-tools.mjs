export const GM_SHELTOM='OS199',GM_POTION='BI998';
export function gmProtection(staff,equip){return !!staff&&equip?.sheltom?.code===GM_SHELTOM;}
export function protectGm(stats,enabled){if(!enabled)return stats;stats.hp=stats.hpMax;stats.mp=stats.mpMax;stats.sp=stats.spMax;stats.defense=Math.max(1000000,stats.defense??0);return stats;}
export function gmTrainingActive(staff,training,level,now=Date.now()/1000){return !!staff&&level<120&&Number(training?.expires)>now;}
