// Authentic character selection preview: reuses the original game's own
// WebGL canvas, renderer, animated mesh and equipment. Running a second
// renderer with a cloned actor produces a blank model with native skinning.
export async function mountRosterCharacterPreview(B, game, hero) {
  const model=game.player?.object;
  if(!model)throw Error('Modelo original do personagem indisponível.');
  // Keep world preview read-only; session preview mode never registers presence
  // or writes game state. Only the camera orbit is interactive.
  const ui=document.querySelector('#ui');
  if(ui)ui.style.display='none';
  const rosterLink=document.querySelector('#vellum-roster-link');
  if(rosterLink)rosterLink.style.display='none';
  const canvas=document.querySelector('#gl');
  if(!canvas)throw Error('Canvas 3D original indisponível.');
  canvas.style.cssText='width:100%;height:100%;display:block';
  const stage=document.createElement('div');
  stage.id='roster-3d-stage';
  stage.style.cssText='position:fixed;inset:0;z-index:9999;cursor:grab;touch-action:none;background:transparent';
  const caption=document.createElement('div');
  caption.style.cssText='position:absolute;bottom:8px;left:0;right:0;text-align:center;color:#f0d59e;font:12px Georgia,serif;text-shadow:0 2px 7px #000;pointer-events:none';
  caption.textContent='Arraste para girar o personagem';
  stage.append(caption);
  document.body.append(stage);
  let angle=Math.PI,pressed=false,lastX=0,ended=false,frames=0;
  // Native skeleton motions: stand breathes in place; walk advances the legs.
  // Only accept commands from our own embedding window and never persist state.
  const actor=game.player;
  const nativeMotion=(motion)=>{
    if(!actor || typeof actor.play!=='function')return false;
    if(motion!=='stand' && motion!=='walk')return false;
    if(typeof actor.hasMotion==='function' && !actor.hasMotion(motion))return false;
    actor.play(motion);
    return true;
  };
  const onRosterMotion=(event)=>{
    if(event.origin!==location.origin || event.source!==parent)return;
    if(event.data?.type!=='vellum-roster-motion')return;
    nativeMotion(event.data.motion);
  };
  window.addEventListener('message',onRosterMotion);
  nativeMotion('stand');
  const originalCamera={camDist:game.camDist,camPitch:game.camPitch,camYaw:game.camYaw};
  // These controls are consumed by the native renderer on each game frame.
  // A close, nearly level front-facing perspective presents the real character
  // rather than the overhead gameplay view.
  const updateCamera=()=>{
    game.camDist=165;
    game.camPitch=.12;
    game.camYaw=angle;
  };
  const down=e=>{pressed=true;lastX=e.clientX;stage.style.cursor='grabbing';stage.setPointerCapture?.(e.pointerId);};
  const move=e=>{if(pressed){angle+=(e.clientX-lastX)*.012;lastX=e.clientX;updateCamera();}};
  const up=()=>{pressed=false;stage.style.cursor='grab';};
  stage.addEventListener('pointerdown',down);
  stage.addEventListener('pointermove',move);
  stage.addEventListener('pointerup',up);
  stage.addEventListener('pointercancel',up);
  // Stop original gameplay pointer/keyboard events while the model is shown.
  for(const type of ['click','dblclick','wheel','contextmenu','mousedown','mouseup','pointerdown','pointerup','pointermove'])
    stage.addEventListener(type,e=>{e.preventDefault();e.stopPropagation();});
  const blockKeyboard=e=>{e.preventDefault();e.stopImmediatePropagation();};
  window.addEventListener('keydown',blockKeyboard,true);
  const tick=()=>{
    if(ended)return;
    updateCamera();
    frames++;
    if(frames===12){
      document.body.dataset.rosterPreviewReady='true';
      parent.postMessage({type:'vellum-roster-preview',job:hero.jobCode,ready:true},location.origin);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  addEventListener('pagehide',()=>{
    ended=true;
    window.removeEventListener('keydown',blockKeyboard,true);
    window.removeEventListener('message',onRosterMotion);
    Object.assign(game,originalCamera);
  },{once:true});
}
