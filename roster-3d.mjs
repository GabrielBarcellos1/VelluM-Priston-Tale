// Read-only character selection preview using the original loaded Priston model.
// Runs inside an isolated /jogar?rosterPreview=1 frame, without joining the
// shared world, saving the character or handling combat controls.
export async function mountRosterCharacterPreview(B,game,hero){
  const stage=document.createElement('main');
  stage.id='roster-3d-stage';
  stage.style.cssText='position:fixed;inset:0;z-index:9999;overflow:hidden;background:radial-gradient(ellipse at 50% 38%,#233c3b 0%,#101e20 65%,#080e11 100%);cursor:grab;touch-action:pan-y';
  const canvas=document.createElement('canvas');
  canvas.id='roster-3d-canvas';canvas.style.cssText='width:100%;height:100%;display:block;touch-action:none';
  const caption=document.createElement('div');caption.style.cssText='position:absolute;bottom:8px;left:0;right:0;text-align:center;color:#e8c48a;font:12px Georgia,serif;text-shadow:0 2px 5px #000;pointer-events:none';
  caption.textContent='Arraste para girar o personagem';
  stage.append(canvas,caption);document.body.append(stage);
  const renderer=new B.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
  const camera=new B.PerspectiveCamera(34,1,.1,3000);
  // Use the ORIGINAL runtime scene and its animated player object. The native
  // actor relies on material/bone updates performed by the game renderer, and
  // cloning it into a separate scene makes the model invisible.
  const scene=game.scene;
  const model=game.player?.object;
  if(!model)throw Error('Modelo original do personagem indisponível.');
  const originalRotation=model.rotation.y;
  let angle=0,dragging=false,previous=0,stopped=false;
  const pointerDown=e=>{dragging=true;previous=e.clientX;stage.style.cursor='grabbing';canvas.setPointerCapture?.(e.pointerId);};
  const pointerMove=e=>{if(dragging){angle+=(e.clientX-previous)*.012;previous=e.clientX;}};
  const pointerUp=()=>{dragging=false;stage.style.cursor='grab';};
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);
  canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);
  const resize=()=>{const w=Math.max(150,stage.clientWidth),h=Math.max(180,stage.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  resize();window.addEventListener('resize',resize);
  // Priston actor geometry is in native client units, roughly 100-160 units tall.
  const actorPosition=model.position;
  camera.position.set(actorPosition.x,actorPosition.y+92,actorPosition.z+180);
  camera.lookAt(actorPosition.x,actorPosition.y+74,actorPosition.z);
  let frames=0;
  const tick=()=>{if(stopped)return;model.rotation.y=originalRotation+angle;renderer.render(scene,camera);frames++;
    if(frames===5){document.body.dataset.rosterPreviewReady='true';parent.postMessage({type:'vellum-roster-preview',job:hero.jobCode,ready:true},location.origin);}
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  addEventListener('pagehide',()=>{stopped=true;window.removeEventListener('resize',resize);model.rotation.y=originalRotation;renderer.dispose();},{once:true});
}
