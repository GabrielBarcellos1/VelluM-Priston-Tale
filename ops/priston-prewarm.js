// Idle/background installation of compressed map and NPC packs.
// Does not block rendering or login; only downloads once per browser profile.
(function(){
  'use strict';
  if(!('Worker' in window)||!('caches' in window)||!('DecompressionStream' in window))return;
  const conn=navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if(conn && (conn.saveData||/(^|-)2g/.test(conn.effectiveType||'')))return;
  let started=false;
  function prepare(){
    if(started)return;started=true;
    const worker=new Worker('prewarm-worker.js');
    worker.onmessage=e=>{
      const d=e.data||{};
      if(d.type==='skipped')console.info('[VelluM Classic] Pack reused:',d.name);
      if(d.type==='done')console.info('[VelluM Classic] Pack',d.name,':',d.installed,'/',d.count,'assets stored');
      if(d.type==='error')console.warn('[VelluM Classic] Pack',d.name,d.error);
      if(d.type==='complete'){console.info('[VelluM Classic] Background packs finished');worker.terminate();}
    };
    worker.onerror=e=>{console.warn('[VelluM Classic] Prefetch error',e.message);worker.terminate();};
    worker.postMessage({type:'start'});
  }
  const watcher=setInterval(()=>{
    if(document.getElementById('status')?.textContent?.trim()!=='Running')return;
    clearInterval(watcher);
    setTimeout(prepare,4000);
  },1000);
  setTimeout(()=>clearInterval(watcher),180000);
})();