import{readFile,writeFile}from'node:fs/promises';
const reportPath=process.argv[2];
const report=JSON.parse(await readFile(reportPath,'utf8')),path=new URL('../data/balance.json',import.meta.url),rules=JSON.parse(await readFile(path,'utf8'));
const mean=a=>a.reduce((n,v)=>n+v,0)/a.length;
const targets=new Map();
for(const b of rules.bands){const n=b.to-b.from,growth=b.from>=110?1.06:b.from>=100?1.13:1.08,weights=Array.from({length:n},(_,i)=>growth**i),sum=weights.reduce((a,v)=>a+v,0);weights.forEach((w,i)=>targets.set(b.from+i,b.hours*3600*w/sum));}
rules.experience=[0];rules.calibration.referenceRates=[];
for(let level=1;level<=150;level++){
 const row=report.levels.find(r=>r.level===level),rate=row?mean(row.classes.map(c=>c.cycleSeconds/c.xpPerKill)):null;
 const xp=level<120?Math.max(8,Math.round(targets.get(level)/rate)):Math.round((rules.experience.at(-1)-rules.experience.at(-2))*1.15);
 rules.experience.push(rules.experience.at(-1)+xp);
 if(level<120)rules.calibration.referenceRates.push({level,secondsPerXP:rate,targetSeconds:targets.get(level)});
}
rules.calibration.method='Full 119-level, 11-class mean solo rates; target active hours 12/40/300; no quests or paid XP';
for(const row of report.levels)for(const c of row.classes){const xp=rules.experience[row.level]-rules.experience[row.level-1],factor=xp/c.xpNeeded;c.soloHours*=factor;c.mixedHours*=factor;c.xpNeeded=xp;}
for(const b of report.bands){
 for(const c of b.classes){const rows=report.levels.filter(l=>l.level>=b.from&&l.level<b.to).map(l=>l.classes.find(r=>r.job===c.job));c.hours=rows.reduce((n,r)=>n+r.soloHours,0);c.mixedHours=rows.reduce((n,r)=>n+r.mixedHours,0);}
 b.meanHours=mean(b.classes.map(c=>c.hours));b.mixedMeanHours=mean(b.classes.map(c=>c.mixedHours));b.minHours=Math.min(...b.classes.map(c=>c.hours));b.maxHours=Math.max(...b.classes.map(c=>c.hours));
}
report.totals.soloMeanHours=report.bands.reduce((n,b)=>n+b.meanHours,0);report.totals.mixedMeanHours=report.bands.reduce((n,b)=>n+b.mixedMeanHours,0);
await writeFile(path,JSON.stringify(rules,null,2)+'\n');await writeFile(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify({total:report.totals.soloMeanHours,bands:report.bands.map(b=>({from:b.from,to:b.to,hours:b.meanHours,min:b.minHours,max:b.maxHours}))}));
