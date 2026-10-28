import {buildSapphireWeapon,sapphireMaterials} from './sapphire-geometry.mjs';
export function createSapphireMesh(B,kind,hands=2){
 const data=buildSapphireWeapon(kind,hands),group=new B.Group();group.name=data.name;
 for(const part of data.parts){const geometry=new B.BufferGeometry();geometry.setAttribute('position',new B.Float32BufferAttribute(part.positions,3));geometry.setAttribute('normal',new B.Float32BufferAttribute(part.normals,3));geometry.computeBoundingSphere();
  const spec=sapphireMaterials[part.material],material=new B.MeshStandardMaterial({...spec,side:2});const mesh=new B.Mesh(geometry,material);mesh.userData.sapphire=true;group.add(mesh);
 }
 group.userData.sapphire=true;group.userData.meshInfo={kind,hands,triangles:data.triangles,bounds:data.bounds};return group;
}
export function disposeSapphire(group){group.traverse(n=>{if(n.isMesh){n.geometry?.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m?.dispose();}});group.removeFromParent();}
export function ensureSkinLights(B,scene){if(scene.userData.sapphireLights)return;scene.userData.sapphireLights=true;const ambient=new B.AmbientLight(0xc3dbff,1.4),sun=new B.DirectionalLight(0xffe3b1,3.1),rim=new B.DirectionalLight(0x32b8ff,2);sun.position.set(-60,80,100);rim.position.set(60,30,-60);scene.add(ambient,sun,rim);}
export function mountCustomSkins({B,game,own,peers,catalog,inventory}){
 const byId=new Map(catalog.map(s=>[s.id,s])),records=new Map();let frame,stopped=false;
 function valid(skin,base){return !!(skin?.customModel&&base&&base.slot===(skin.hands===2?'WEAPON_TWO':'WEAPON_ONE'));}
 function remove(root,record){for(const[n,material]of record.materials){const masks=Array.isArray(n.material)?n.material:[n.material];for(const mask of masks)if(mask!==material)mask?.dispose();n.material=material;}if(record.mesh)disposeSapphire(record.mesh);for(const pair of record.handModels??[])disposeSapphire(pair);for(const group of record.handGroups??[])group.removeFromParent();records.delete(root);}
 // The recovered character skeleton exposes real left/right hand bones.
 // Attaching to these animated bones avoids oversized, floating fists and
 // lets the Shaman carry a Phantom in each hand without a shield model.
 function updateHands(actor,record){
  const part=actor.parts?.[0];
  if(!part?.boneMatrix)return;
  for(const [index,group]of (record.handGroups??[]).entries()){
   const bone=index===0?15:25;
   const matrix=part.boneMatrix(bone,group.matrix.clone().identity());
   if(matrix)group.matrix.copy(matrix);
  }
 }
 function apply(actor,skin,live){if(!actor?.tools)return;for(const tool of actor.tools){if(tool.slot!=='weapon')continue;const root=tool.model?.object;if(!root)continue;live.add(root);let record=records.get(root);
  if(record&&record.id!==skin?.id){remove(root,record);record=null;}
  if(!skin){continue;}
  if(record){updateHands(actor,record);continue;}
  const materials=[];root.traverse(n=>{if(!n.isMesh)return;materials.push([n,n.material]);const hidden=m=>{const mask=m.clone();mask.visible=false;return mask;};n.material=Array.isArray(n.material)?n.material.map(hidden):hidden(n.material);});
  if(['phantom','vambrace','claw'].includes(skin.customModel)&&actor.object&&actor.parts?.[0]?.boneMatrix){
   const handGroups=[],handModels=[];
   for(const bone of [15,25]){
    const hand=new B.Group();hand.matrixAutoUpdate=false;actor.object.add(hand);
    const cosmetic=createSapphireMesh(B,skin.customModel,skin.hands);
    cosmetic.rotation.x=Math.PI/2;
    cosmetic.scale.setScalar((skin.customScale??.8)*(skin.customModel==='phantom'?.9:.5));
    cosmetic.position.y=-1.5;
    hand.add(cosmetic);handGroups.push(hand);handModels.push(cosmetic);
   }
   record={id:skin.id,mesh:null,materials,handGroups,handModels};
   records.set(root,record);updateHands(actor,record);
   continue;
  }
  const model=createSapphireMesh(B,skin.customModel,skin.hands);model.rotation.x=Math.PI/2;model.scale.setScalar((skin.customScale??.8)*2);
  // Fists use short, hand-sized attachments; the scythe's large multiplier
  // previously made the Martial Artist's gauntlets float around her arms.
  if(skin.customModel==='vambrace'||skin.customModel==='claw'){
    model.scale.multiplyScalar(.27);
    model.position.set(0,-1.5,0);
  }
  const mesh=new B.Group();mesh.matrixAutoUpdate=false;const bind=tool.model.boneMatrix?.(0,root.matrix.clone().identity());if(bind)mesh.matrix.copy(bind);mesh.add(model);root.add(mesh);records.set(root,{id:skin.id,mesh,materials});
 }}
 function tick(){if(stopped)return;const live=new Set(),skin=own()?.worn?.find(s=>s.customModel&&s.cat==='arma'),base=inventory()?.weapon;apply(game.player,valid(skin,base)?skin:null,live);
  const remote=new Map((peers?.()??[]).map(p=>[p.name,p]));for(const view of game.others?.views?.values?.()??[]){const p=remote.get(view.other?.name),s=byId.get(p?.customWeaponSkin);apply(view.char,s,live);}
  for(const[root,record]of records)if(!live.has(root))remove(root,record);
  const diagnostics={sapphireModels:String(records.size),sapphireNativeWeapons:String(game.player?.tools?.length??0),sapphireEquipped:skin?.id??'',sapphireCompatible:String(!!valid(skin,base))};for(const[key,value]of Object.entries(diagnostics))if(document.body.dataset[key]!==value)document.body.dataset[key]=value;
  frame=requestAnimationFrame(tick);
 }
 const dispose=()=>{stopped=true;cancelAnimationFrame(frame);for(const[root,r]of records)remove(root,r);};ensureSkinLights(B,game.scene);tick();if(typeof addEventListener==='function')addEventListener('pagehide',dispose,{once:true});return{dispose,active:()=>records.size};
}
export function openSapphirePreview(B,skin,host=null){
 const dialog=document.createElement('dialog');dialog.className='ft-dialog';dialog.style.cssText='width:min(650px,94vw);max-height:94vh;overflow:auto;padding:18px;background:#101c26;color:#eee';const h=document.createElement('h2'),p=document.createElement('p'),canvas=document.createElement('canvas'),close=document.createElement('button');h.textContent=skin.name;p.textContent='Arraste para girar. Use a roda do mouse para aproximar. Esta é a geometria 3D usada no jogo.';close.textContent='Fechar';dialog.append(h,p,canvas,close);
 if(host){const previous=host.querySelector('.skin-inline-preview');previous?.remove();dialog.classList.add('skin-inline-preview');dialog.style.cssText='display:block;position:static;width:100%;max-height:440px;overflow:auto;padding:12px;background:#101c26;color:#eee';host.append(dialog);}
 else {document.body.append(dialog);dialog.showModal();}
 const renderer=new B.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.setSize(Math.min(590,innerWidth-80),Math.max(210,Math.min(500,innerHeight-230)));canvas.style.cssText='max-width:100%;display:block;touch-action:none';const scene=new B.Scene(),camera=new B.PerspectiveCamera(38,canvas.width/canvas.height,.1,500);scene.background=new B.Color(0x101c26);ensureSkinLights(B,scene);const model=createSapphireMesh(B,skin.customModel,skin.hands),bounds=model.userData.meshInfo.bounds,height=bounds[1][1]-bounds[1][0],width=bounds[0][1]-bounds[0][0];model.position.set(-(bounds[0][1]+bounds[0][0])/2,-(bounds[1][1]+bounds[1][0])/2,0);const pivot=new B.Group();pivot.add(model);scene.add(pivot);let distance=Math.max(height,width)*1.7,drag=false,last=0,angle=.3,frame,stopped=false;
 canvas.onpointerdown=e=>{drag=true;last=e.clientX;canvas.setPointerCapture(e.pointerId);};canvas.onpointerup=()=>drag=false;canvas.onpointercancel=()=>drag=false;canvas.onpointermove=e=>{if(drag){angle+=(e.clientX-last)*.012;last=e.clientX;}};canvas.onwheel=e=>{e.preventDefault();distance=Math.min(height*4,Math.max(height*.65,distance+e.deltaY*.05));};
 function draw(){if(stopped)return;if(!drag)angle+=.004;pivot.rotation.y=angle;camera.position.set(0,height*.04,distance);camera.lookAt(0,0,0);renderer.render(scene,camera);frame=requestAnimationFrame(draw);}draw();
 const dispose=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(frame);disposeSapphire(model);renderer.dispose();renderer.forceContextLoss();dialog.remove();};close.onclick=()=>{if(host)dispose();else dialog.close();};dialog.addEventListener('close',dispose,{once:true});
 return{dialog,dispose};
}
