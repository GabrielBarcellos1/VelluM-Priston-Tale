/* VelluM mobile touch HUD, independent of native server and game assets. */
(function(){
  'use strict';
  var canvas=document.getElementById('canvas');
  if(!canvas)return;
  var mq=window.matchMedia('(pointer:coarse)');
  function enabled(){return mq.matches || navigator.maxTouchPoints>0;}
  if(!enabled())return;
  var css=document.createElement('style');
  css.textContent=[
   'html,body{overscroll-behavior:none}',
   '#canvas{touch-action:none!important}',
   '.vm-hud{position:fixed;inset:0;pointer-events:none;z-index:60;font:600 13px/1.1 system-ui;color:white}',
   '.vm-hud button,.vm-hud .vm-stick{pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}',
   '.vm-actions{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(3,52px);gap:9px}',
   '.vm-actions button,.vm-top button{border:1px solid rgba(255,227,152,.65);background:rgba(24,28,39,.78);color:#fff8df;border-radius:11px;min-height:49px;box-shadow:0 4px 12px #0008;font:600 12px system-ui}',
   '.vm-actions button:active,.vm-actions button.vm-active,.vm-top button:active{background:rgba(155,116,47,.93)}',
   '.vm-top{position:absolute;top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));display:flex;gap:6px}',
   '.vm-top button{min-height:37px;padding:5px 8px;font-size:12px}',
   '.vm-stick{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(32px,env(safe-area-inset-bottom));width:122px;height:122px;border:2px solid #e0c27a88;background:#18202a88;border-radius:50%;display:grid;place-items:center;box-sizing:border-box}',
   '.vm-stick-knob{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;border:2px solid #ebd09999;background:#847350aa;transform:translate(var(--dx,0px),var(--dy,0px));color:white;box-shadow:0 1px 12px #0008}',
   '.vm-rotate{position:absolute;left:50%;top:max(60px,env(safe-area-inset-top));transform:translateX(-50%);background:#172433df;border:1px solid #a58c53;border-radius:9px;padding:6px 10px;color:#fff6d4;pointer-events:none;white-space:nowrap;font:11px system-ui}',
   '@media(orientation:landscape){.vm-rotate{display:none}.vm-stick{width:112px;height:112px;bottom:15px}.vm-actions{bottom:12px}}',
   '.pt-set{z-index:120!important}.pt-set-box{max-height:94dvh;overflow:auto}',
   '@media(max-height:520px){.vm-actions{grid-template-columns:repeat(4,43px);gap:4px}.vm-actions button{min-height:38px;font-size:10px}.vm-top button{min-height:30px}.vm-stick{width:95px;height:95px}}'
  ].join('');
  document.head.appendChild(css);
  var hud=document.createElement('div');hud.className='vm-hud';hud.setAttribute('aria-label','Controles do jogo para celular');
  hud.innerHTML='<div class="vm-top"><button data-key="Escape">Menu</button><button data-key="i">Inventário</button><button data-key="s">Skills</button><button data-key="m">Mapa</button><button data-open-settings="true">Gráficos</button></div>'+
    '<div class="vm-stick" role="group" aria-label="Controle direcional"><div class="vm-stick-knob">Mover</div></div>'+
    '<div class="vm-actions"><button data-key="Shift" data-hold="true">Correr</button><button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button><button data-key="4">4</button><button data-key="Space">Ação</button><button data-mouse="right">Atacar</button></div>'+
    '<div class="vm-rotate">Gire o celular para jogar na horizontal</div>';
  document.body.appendChild(hud);
  function keyEvent(k,type){
    var keyCode=k==='Shift'?16:k==='Escape'?27:k==='Enter'?13:k==='Space'?32:k.toUpperCase().charCodeAt(0);
    if(typeof Module!=='undefined' && typeof Module._PtWeb_MobileKey==='function'){
      Module._PtWeb_MobileKey(keyCode,type==='keydown'?1:0);
      return;
    }
    // Compatibility with earlier WASM versions: events are only a fallback.
    var code={Shift:'ShiftLeft',Escape:'Escape',Enter:'Enter',Space:'Space'}[k] || (/^[1-4]$/.test(k)?'Digit'+k:'Key'+k.toUpperCase());
    canvas.dispatchEvent(new KeyboardEvent(type,{key:k==='Space'?' ':k,code:code,keyCode:keyCode,which:keyCode,bubbles:true,cancelable:true}));
  }
  hud.querySelector('[data-open-settings]').addEventListener('click',function(){document.getElementById('btnSettings')?.click();});
  hud.querySelectorAll('[data-key]').forEach(function(button){
    var down=false;
    function release(){if(!down)return;down=false;button.classList.remove('vm-active');keyEvent(button.dataset.key,'keyup')}
    button.addEventListener('pointerdown',function(e){e.preventDefault();if(down)return;down=true;button.classList.add('vm-active');try{button.setPointerCapture?.(e.pointerId);}catch(ignore){}keyEvent(button.dataset.key,'keydown')});
    button.addEventListener('pointerup',function(e){e.preventDefault();release()});
    button.addEventListener('pointercancel',release);
    button.addEventListener('lostpointercapture',release);
  });
  var stick=hud.querySelector('.vm-stick'),knob=hud.querySelector('.vm-stick-knob'),touchId=null,lastX=0,lastY=0;
  function simulatedMouse(type,x,y){
    var bounds=canvas.getBoundingClientRect();
    var px=Math.max(0,Math.min(canvas.width-1,Math.round(x*canvas.width)));
    var py=Math.max(0,Math.min(canvas.height-1,Math.round(y*canvas.height)));
    var phase=type==='mousedown'?1:type==='mouseup'?2:0;
    if(typeof Module!=='undefined' && typeof Module._PtWeb_MobileMouse==='function'){
      Module._PtWeb_MobileMouse(phase,px,py);
      return;
    }
    canvas.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:bounds.left+x*bounds.width,clientY:bounds.top+y*bounds.height,button:0,buttons:type==='mouseup'?0:1}));
  }
  var attack=hud.querySelector('[data-mouse="right"]');
  function attackAt(phase){
    var x=Math.round(canvas.width*.60),y=Math.round(canvas.height*.54);
    if(typeof Module!=='undefined'&&typeof Module._PtWeb_MobileMouse==='function'){
      Module._PtWeb_MobileMouse(phase,x,y);
    }
  }
  attack.addEventListener('pointerdown',function(e){e.preventDefault();try{attack.setPointerCapture?.(e.pointerId);}catch(ignore){}attackAt(3);});
  attack.addEventListener('pointerup',function(e){e.preventDefault();attackAt(4);});
  attack.addEventListener('pointercancel',function(){attackAt(4);});
  function update(e){
    var box=stick.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2;
    var dx=e.clientX-cx,dy=e.clientY-cy,r=box.width*.32;
    var norm=Math.max(1,Math.hypot(dx,dy)/r);
    dx/=norm;dy/=norm;
    knob.style.setProperty('--dx',Math.round(dx)+'px');knob.style.setProperty('--dy',Math.round(dy)+'px');
    lastX=.5+dx/r*.36;lastY=.5+dy/r*.36;
    simulatedMouse('mousemove',lastX,lastY);
  }
  stick.addEventListener('pointerdown',function(e){if(touchId!==null)return;e.preventDefault();touchId=e.pointerId;try{stick.setPointerCapture?.(e.pointerId);}catch(ignore){}update(e);simulatedMouse('mousedown',lastX,lastY)});
  stick.addEventListener('pointermove',function(e){if(e.pointerId!==touchId)return;e.preventDefault();update(e)});
  function stop(e){if(touchId===null||e.pointerId!==touchId)return;simulatedMouse('mouseup',lastX,lastY);touchId=null;knob.style.setProperty('--dx','0px');knob.style.setProperty('--dy','0px')}
  stick.addEventListener('pointerup',stop);stick.addEventListener('pointercancel',stop);
  window.VelluMMobileControls={available:true};
})();
