/* VelluM Classic background asset pack installer. Runs off the render thread. */
'use strict';
const BASE = new URL('.', self.location.href);
const PACKS = ['ricarten', 'npc-core', 'forest'];
const dec = new TextDecoder();
const readU16 = (view,o) => view.getUint16(o,true);
const readU32 = (view,o) => view.getUint32(o,true);
async function unpack(name) {
  const response = await fetch('packs/'+name+'.ptpb.gz');
  if (!response.ok || !response.body) throw new Error(name+' HTTP '+response.status);
  const bytes = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const view = new DataView(bytes), values = new Uint8Array(bytes);
  if (dec.decode(values.subarray(0,4))!=='PTPB') throw new Error('Invalid asset pack '+name);
  const count=readU32(view,4), cache=await caches.open('pt-data-1');
  let cursor=8, installed=0, pending=[];
  for(let i=0;i<count;i++){
    if(cursor+2>bytes.byteLength)throw Error('Truncated path');
    let len=readU16(view,cursor);cursor+=2;
    let rel=dec.decode(values.subarray(cursor,cursor+len));cursor+=len;
    let hlen=readU16(view,cursor);cursor+=2;
    let hash=dec.decode(values.subarray(cursor,cursor+hlen));cursor+=hlen;
    let size=readU32(view,cursor);cursor+=4;
    if(cursor+size>bytes.byteLength)throw Error('Truncated asset '+rel);
    const url=new URL('data/'+rel.split('/').map(encodeURIComponent).join('/'),BASE).href;
    const old=await cache.match(url);
    if(!old || old.headers.get('X-PT-Version')!==hash){
      const body=values.slice(cursor,cursor+size);
      pending.push(cache.put(url,new Response(body,{headers:{'X-PT-Version':hash,'Content-Type':'application/octet-stream'}})).then(()=>{installed++}));
      if(pending.length>=8){await Promise.allSettled(pending);pending=[];}
    }
    cursor+=size;
  }
  if(pending.length)await Promise.allSettled(pending);
  postMessage({type:'done',name,installed,count});
}
self.onmessage=async e=>{
  if(e.data?.type!=='start'||self.started)return;
  self.started=true;
  if(typeof DecompressionStream==='undefined')return postMessage({type:'unsupported'});
  for(const name of PACKS){
    try{await unpack(name);}catch(err){postMessage({type:'error',name,error:String(err)})}
  }
  postMessage({type:'complete'});
};