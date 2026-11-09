import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function fixture() {
  const source=await readFile(new URL('../session.mjs',import.meta.url),'utf8');
  const start=source.indexOf('async function handle(message) {');
  const end=source.indexOf('conn.sendGame =',start);
  assert.ok(start>=0&&end>start,'exercise the real session message handler');
  const notices=[],messages=[],logs=[];let writes=0;
  const context={messages,clone:structuredClone,notice:message=>notices.push(message),save:()=>writes++,console:{info:(...values)=>logs.push(values)}};
  const handle=vm.runInNewContext(source.slice(start,end)+'\nhandle;',context);
  return {handle,notices,messages,logs,writes:()=>writes};
}

test('native GM NPC metadata polling does not spam chat or persist unchanged state',async()=>{
  const h=await fixture();
  for(let i=0;i<15;i++)await h.handle({t:'gmNpcInfo',npcId:21200});
  assert.deepEqual(h.notices,[]);
  assert.equal(h.writes(),0);
  assert.equal(h.messages.length,15,'retain diagnostic packet history');
});

test('unsupported user actions still report the missing service',async()=>{
  const h=await fixture();await h.handle({t:'unknownInteractiveService'});
  assert.equal(h.notices.length,1);
  assert.match(h.notices[0],/ainda não foi reconstruído/);
  assert.equal(h.logs.length,1);
});
