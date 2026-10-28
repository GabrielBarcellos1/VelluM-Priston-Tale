// Original procedural meshes inspired by the supplied scythe photograph.
// Coordinates: weapon length along +Y, hand at the origin. No game statistics.
export const sapphireMaterials=[
 {name:'Obsidiana azul',color:0x0b4157,metalness:.7,roughness:.26},
 {name:'Aço safira',color:0x1277ad,metalness:.8,roughness:.22},
 {name:'Filigrana dourada',color:0xe9b65d,metalness:.82,roughness:.25},
 {name:'Osso antigo',color:0xcec5a9,metalness:.12,roughness:.48},
 {name:'Cavidades',color:0x071013,metalness:.1,roughness:.75},
 {name:'Cristal safira',color:0x13bfff,metalness:.4,roughness:.13,emissive:0x075584},
 {name:'Prata afiada',color:0x9ecad7,metalness:.9,roughness:.19},
];
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,n)=>a.map(v=>v*n),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));
export function buildSapphireWeapon(kind='scythe',hands=2){
 const parts=sapphireMaterials.map((m,material)=>({material,positions:[],normals:[]}));
 function tri(m,a,b,c){const n=unit(cross(sub(b,a),sub(c,a)));if(Math.hypot(...cross(sub(b,a),sub(c,a)))<1e-7)return;parts[m].positions.push(...a,...b,...c);parts[m].normals.push(...n,...n,...n);}
 const quad=(m,a,b,c,d)=>{tri(m,a,b,c);tri(m,a,c,d);};
 function rod(a,b,r,m=2,sides=8,r2=r){const dir=unit(sub(b,a)),u=unit(cross(dir,Math.abs(dir[1])<.9?[0,1,0]:[1,0,0])),v=cross(dir,u);for(let i=0;i<sides;i++){const p=t=>add(mul(u,Math.cos(t)),mul(v,Math.sin(t))),x=p(i/sides*Math.PI*2),y=p((i+1)/sides*Math.PI*2);quad(m,add(a,mul(x,r)),add(a,mul(y,r)),add(b,mul(y,r2)),add(b,mul(x,r2)));tri(m,a,add(a,mul(y,r)),add(a,mul(x,r)));tri(m,b,add(b,mul(x,r2)),add(b,mul(y,r2)));}}
 function curve(points,r=.15,m=2){for(let i=1;i<points.length;i++)rod(points[i-1],points[i],r,m,5);}
 function sphere(center,scale,m=3,segments=12,rings=8){const p=(i,j)=>add(center,[Math.sin(Math.PI*j/rings)*Math.cos(2*Math.PI*i/segments)*scale[0],Math.cos(Math.PI*j/rings)*scale[1],Math.sin(Math.PI*j/rings)*Math.sin(2*Math.PI*i/segments)*scale[2]]);for(let j=0;j<rings;j++)for(let i=0;i<segments;i++)quad(m,p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1));}
 function crystal(c,w,h,d=w){const ring=Array.from({length:6},(_,i)=>add(c,[Math.cos(i*Math.PI/3)*w,0,Math.sin(i*Math.PI/3)*d]));for(let i=0;i<6;i++){tri(5,ring[i],ring[(i+1)%6],add(c,[0,h*.7,0]));tri(1,ring[(i+1)%6],ring[i],add(c,[0,-h*.3,0]));}}
 function ribbon(outer,inner,thickness=.65){for(let i=1;i<outer.length;i++){const a=outer[i-1],b=outer[i],c=inner[i],d=inner[i-1],left=a.map((v,j)=>v*.25+d[j]*.75),right=b.map((v,j)=>v*.25+c[j]*.75);for(const z of [-thickness,thickness]){quad(0,[...a,z],[...b,z],[...right,z],[...left,z]);quad(1,[...left,z],[...right,z],[...c,z],[...d,z]);}quad(1,[...a,thickness],[...b,thickness],[...b,-thickness],[...a,-thickness]);quad(6,[...c,thickness],[...d,thickness],[...d,-thickness],[...c,-thickness]);}curve(outer.map(p=>[...p,thickness+.05]),.22,2);}
 function polygon(points,depth=.65,m=1){const center=mul(points.reduce((a,p)=>add(a,[...p,0]),[0,0,0]),1/points.length);for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];tri(m,[center[0],center[1],depth],[...a,depth],[...b,depth]);tri(m,[center[0],center[1],-depth],[...b,-depth],[...a,-depth]);quad(6,[...a,depth],[...a,-depth],[...b,-depth],[...b,depth]);}curve([...points,points[0]].map(p=>[...p,depth+.06]),.13,2);}
 function scroll(x,y,r=1,z=.85,mirror=1){const p=Array.from({length:17},(_,i)=>{const t=i/16*2.6*Math.PI,a=r*(1-i/19);return[x+mirror*Math.cos(t)*a,y+Math.sin(t)*a,z];});curve(p,.13,2);}
 function skull(x,y,s=1){sphere([x,y,1.3*s],[2.35*s,2.7*s,1.75*s],3);sphere([x,y-1.6*s,2.15*s],[1.65*s,1.05*s,.85*s],3,10,6);for(const side of [-1,1])sphere([x+side*.95*s,y+.25*s,2.77*s],[.79*s,.93*s,.28*s],4,10,6);polygon([[x-.4*s,y-.65*s],[x+.4*s,y-.65*s],[x,y+.1*s]],.3,4);
  for(let i=0;i<6;i++)rod([x+(i-2.5)*.43*s,y-1.8*s,3*s],[x+(i-2.5)*.43*s,y-2.4*s,3*s],.18*s,3,5);
  curve(Array.from({length:13},(_,i)=>[x+Math.cos(i/12*Math.PI)*1.8*s,y-2.25*s-Math.sin(i/12*Math.PI)*.6*s,2.1*s]),.2*s,3);
 }
 function shaft(bottom,top,r=.58){rod([0,bottom,0],[0,top,0],r,0,10);for(let y=bottom+2;y<top;y+=5){rod([0,y,0],[0,y+.6,0],r+.16,2,10);}for(let y=-5;y<=3;y+=1.1)rod([0,y,0],[0,y+.55,0],r+.12,3,8);}
 function pommel(y){crystal([0,y,0],1.5,4);for(const z of [-.8,.8])scroll(0,y-1,1.8,z);}
 function crescent(x,y,scale=1,mirror=1){const outer=[],inner=[];for(let i=0;i<=24;i++){const t=i/24;outer.push([x+mirror*(2+30*t)*scale,y+(7*Math.sin(t*Math.PI)-26*t*t)*scale]);inner.push([x+mirror*(2+30*t)*scale,y+(-4+4*Math.sin(t*Math.PI)-22*t*t)*scale]);}ribbon(outer,inner,.65*scale);for(let i=0;i<6;i++){const j=2+i*3,p=outer[j];scroll(p[0],p[1]-1.3*scale,1.25*scale,.8*scale,mirror);}}
 const long=hands===2;
 if(kind==='scythe'){
  shaft(-23,30);pommel(-24);crescent(0,31);skull(0,28,1.18);rod([0,29,0],[-2,33,0],.8,2);crystal([-2,33,0],3.2,8);crystal([5,34,0],1.5,5);
  for(let y=9;y<=23;y+=3.8){sphere([0,y,0],[.9,.6,.8],3,8,5);curve([[0,y,0],[-2,y+.5,.1],[-5,y+3,.2],[-8,y+6,0]],.27,3);}
  for(const y of [-16,-10]){crystal([0,y,0],1.9,4.5);rod([0,y-1,0],[0,y-.4,0],2,2,10);}scroll(1,32,3,1.2);
 }else if(kind==='axe'){
  shaft(long?-18:-11,long?27:20,.7);pommel(long?-19:-12);
  const y=long?26:20;skull(0,y,1.05);crystal([0,y+6,0],2.2,6);
  for(const side of long?[-1,1]:[1]){
   // Swept double-crescent axe heads with exposed silver cutting edges.
   const outer=[],inner=[];for(let i=0;i<=24;i++){const t=i/24*Math.PI;
    outer.push([side*(3+Math.sin(t)*15),y+10*Math.cos(t)]);
    inner.push([side*(2+Math.sin(t)*6),y+7*Math.cos(t)]);
   }
   ribbon(outer,inner,.8);
   for(let j=0;j<3;j++){
    const py=y+(j-1)*5;
    polygon([[side*3,py-1],[side*7,py+2],[side*10,py],[side*6,py-2]],1,0);
    crystal([side*5,py,1.1],.8,2,.4);
   }
   curve([[side*2,y+6,1],[side*8,y+8,1],[side*15,y+4,1]],.28,2);
   curve([[side*2,y-5,1],[side*8,y-7,1],[side*15,y-4,1]],.28,2);
   scroll(side*7,y,2,1.3,side);
  }
  for(const y0 of [-8,1,9])crystal([0,y0,0],1.1,3,.65);
 }else if(kind==='hammer'){
  shaft(long?-19:-12,long?26:20,.88);const y=long?27:21;
  // Faceted gothic hammer head, not one solid grey block.
  polygon([[-12,y-3],[-13,y+2],[-8,y+6],[8,y+6],[13,y+2],[12,y-3],[7,y-5],[-7,y-5]],2.6,0);
  polygon([[-8,y-2],[-9,y+2],[-5,y+4],[5,y+4],[9,y+2],[8,y-2]],3.05,1);
  for(const side of [-1,1]){
   polygon([[side*8,y-5],[side*14,y-4],[side*16,y+2],[side*13,y+6],[side*8,y+5]],2.7,6);
   curve([[side*9,y-4,3],[side*15,y+1,3],[side*9,y+5,3]],.28,2);
   crystal([side*11,y,3.3],1.3,5,.4);
   for(const dy of [-3,3])sphere([side*11,y+dy,2.9],[.55,.55,.5],2,8,5);
  }
  skull(0,y,1.05);crystal([0,y+8,0],2,5);scroll(-5,y,2,3.5);scroll(5,y,2,3.5);
  pommel(long?-20:-13);
 }else if(kind==='bow'){
  shaft(-3,3,.75);for(const side of [-1,1]){const outer=[],inner=[];for(let i=0;i<=20;i++){const t=i/20;outer.push([Math.sin(t*Math.PI)*8,side*(2+26*t)]);inner.push([Math.sin(t*Math.PI)*6,side*(2+26*t)]);}ribbon(outer,inner,.65);crystal([0,side*27,0],1.8,6);scroll(6,side*15,1.8,1);}
  rod([0,-29,0],[0,29,0],.075,5,5);skull(1,0,.72);
 }else if(kind==='sword'||kind==='dagger'||kind==='javelin'){
  // Classic Priston silhouette: long, narrow, double-edged blade, not a giant
  // rectangular turquoise paddle. Every family has a metal spine, split
  // sapphire inlay, distinct teeth/serrations and a skeletal crossguard.
  const spear=kind==='javelin',dagger=kind==='dagger';
  const bottom=spear?-20:dagger?-9:-14,guard=spear?15:dagger?1:4;
  const top=spear?44:dagger?21:long?42:33;
  const gripTop=guard-.7;
  shaft(bottom,gripTop,dagger?.42:.58);
  for(let y=bottom+2;y<gripTop-1;y+=3.1){
   rod([-.53,y,0],[.53,y+.7,0],.11,2,6);
   rod([.53,y,0],[-.53,y+.7,0],.11,2,6);
  }
  const len=top-guard;
  if(spear){
   // Slender spearhead and two swept-back claws.
   polygon([[0,top],[-1.8,top-7],[-2.5,guard+4],[-.85,guard+.6],[.85,guard+.6],[2.5,guard+4],[1.8,top-7]],.55,1);
   polygon([[0,top-2],[-.62,top-8],[-.95,guard+5],[0,guard+2],[.95,guard+5],[.62,top-8]],.64,0);
   for(const side of [-1,1]){
    const pts=[[side*.8,guard+1],[side*5.8,guard+8],[side*6.8,guard+13],[side*4.4,guard+11],[side*3.2,guard+5]];
    polygon(pts,.5,0);
    curve([[side*.8,guard,1],[side*5.8,guard+8,1],[side*6.8,guard+13,1]],.26,2);
   }
  }else{
   const w=dagger?2.3:long?4.2:3.5;
   // Tapered steel edge with carved shoulders and a needle-sharp point.
   polygon([[0,top],[-w*.56,top-5],[-w*.96,top-12],[-w,guard+len*.38],[-w*.72,guard+4],[-w*.32,guard+1],[w*.32,guard+1],[w*.72,guard+4],[w,guard+len*.38],[w*.96,top-12],[w*.56,top-5]],dagger?.42:.54,6);
   polygon([[0,top-1],[-w*.36,top-7],[-w*.52,top-13],[-w*.49,guard+len*.37],[-w*.32,guard+5],[0,guard+2],[w*.32,guard+5],[w*.49,guard+len*.37],[w*.52,top-13],[w*.36,top-7]],.67,0);
   // Narrow sapphire channel leaves both sharpened silver edges visible.
   polygon([[0,top-6],[-w*.15,top-10],[-w*.22,guard+len*.4],[0,guard+7],[w*.22,guard+len*.4],[w*.15,top-10]],.75,1);
   for(const side of [-1,1]){
    for(let j=0;j<4;j++){
     const y=guard+8+j*(len-16)/4;
     curve([[0,y+.5,.85],[side*w*.17,y+1.9,.87],[side*w*.3,y+3,.77]],.11,2);
    }
    // Curved bone wings protect the hand and frame the skull.
    curve([[side*.9,guard+.2,0],[side*3,guard+1,0],[side*(dagger?5.8:8.5),guard+4,0],[side*(dagger?7:10),guard+7,0]],.55,2);
    rod([side*(dagger?5.8:8.5),guard+4,0],[side*(dagger?7:10),guard+7,0],.7,3,7,.12);
    sphere([side*(dagger?5.8:8.5),guard+4,0],[.7,.7,.7],5,8,6);
   }
  }
  skull(0,guard+(spear?2:.65),dagger?.47:.66);
  crystal([0,guard+5,1.05],dagger?.6:.95,dagger?2.2:3.3,.28);
  sphere([0,guard-1,0],[1.3,1.6,.85],2,10,6);
  pommel(bottom-1);
 }else if(kind==='claw'||kind==='vambrace'){
  const arm=kind==='vambrace';polygon([[-3,-5],[-4,2],[-2,7],[2,7],[4,2],[3,-5]],1.8,0);skull(0,1,.9);for(const x of [-3,0,3]){curve([[x,4,0],[x*1.2,9,0],[x*1.4,15,0]],.65,2);polygon([[x*1.4-.7,10],[x*1.4,arm?20:18],[x*1.4+.7,10]],.45,1);crystal([x,5,1],.9,3);}scroll(0,-3,2,2);
 }else if(kind==='wand'||kind==='staff'){
  const staff=kind==='staff';shaft(staff?-19:-8,staff?29:16,.6);const y=staff?29:16;skull(0,y-1,staff?1:.7);crystal([0,y+5,0],staff?3:2.2,staff?11:7);
  for(const side of [-1,1]){curve([[0,y-2,0],[side*5,y+1,0],[side*5,y+7,0],[side*2,y+10,0]],.4,2);scroll(side*4,y+1,1.7,1,side);}pommel(staff?-20:-9);
 }else if(kind==='phantom'){
  shaft(-7,8,.7);skull(0,7,1.2);for(const side of [-1,1]){crescent(side*2,9,.45,side);crystal([side*5,15,0],1.6,6);}crystal([0,17,0],2.1,9);pommel(-8);
 }else throw Error('Família de skin desconhecida: '+kind);
 const output=parts.filter(p=>p.positions.length);const all=output.flatMap(p=>p.positions),bounds=[0,1,2].map(a=>[Math.min(...all.filter((_,i)=>i%3===a)),Math.max(...all.filter((_,i)=>i%3===a))]);
 return {name:'Ceifador Safira — '+kind,kind,hands,parts:output,materials:sapphireMaterials,bounds,triangles:output.reduce((n,p)=>n+p.positions.length/9,0)};
}
