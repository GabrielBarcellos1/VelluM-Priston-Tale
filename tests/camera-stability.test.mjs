import test from 'node:test';
import assert from 'node:assert/strict';
import {mountStableCamera} from '../character-facing.mjs';
function fixture(mode=1){
 const win=new EventTarget(),doc=new EventTarget();doc.hidden=false;
 const game={cameraMode:mode,autoCamera:true,camYaw:1.2,camDist:800,caTarDist:0,caMovAngle:0,mouseIn:true,edgeRot:{ds:512,spent:false},target:{x:100},
  keys:new Set(),rpgHeld:new Set(),sideKeys:new Set(),mouseHeld:new Set(),
  setCameraMode(value){this.cameraMode=value;this.autoCamera=true;},
  mouseCamera(){if(this.mouseIn&&!this.edgeRot.spent)this.camYaw+=.1;if(this.cameraMode===1&&this.autoCamera&&this.target)this.camYaw+=.1;
   if(this.caMovAngle){this.camYaw+=this.caMovAngle;this.caMovAngle=0;}if(this.caTarDist)this.camDist=this.caTarDist;return 'native';}};
 const original=game.mouseCamera,dispose=mountStableCamera(game,win,doc);return{game,win,doc,dispose,original};
}
test('idle edge hovering never rotates the initial view across many frames',()=>{
 const {game}=fixture();assert.equal(game.cameraMode,0);const yaw=game.camYaw;
 for(let frame=0;frame<600;frame++){game.edgeRot.spent=false;assert.equal(game.mouseCamera(),'native');}
 assert.equal(game.camYaw,yaw);assert.equal(game.mouseIn,true);assert.equal(game.edgeRot.ds,0);
});
test('manual rotation, zoom and fixed camera choice remain available',()=>{
 const {game}=fixture(2);assert.equal(game.cameraMode,2);game.camYaw=2.5;game.caMovAngle=.3;game.caTarDist=600;game.mouseCamera();
 assert.equal(game.camYaw,2.8);assert.equal(game.camDist,600);assert.deepEqual(game.target,{x:100});
});
test('losing focus clears held camera and movement input instead of spinning on return',()=>{
 const {game,win}=fixture();game.keys.add('ArrowLeft');game.rpgHeld.add('turnLeft');game.sideKeys.add('ArrowLeft');game.mouseHeld.add('Mouse4');
 Object.assign(game,{rotating:{x:1},rpgLook:{btn:2},rpgButtons:2,caMovAngle:10,holding:true,attackHeld:true,rmbHeld:true,rmbTrace:true});
 win.dispatchEvent(new Event('blur'));
 for(const key of ['keys','rpgHeld','sideKeys','mouseHeld'])assert.equal(game[key].size,0);
 for(const key of ['rotating','rpgLook'])assert.equal(game[key],null);
 for(const key of ['holding','attackHeld','rmbHeld','rmbTrace'])assert.equal(game[key],false);
 assert.equal(game.rpgButtons,0);assert.equal(game.caMovAngle,0);
});
test('mouse release outside the canvas stops dragging without clearing held keyboard controls',()=>{
 const {game,win}=fixture();game.keys.add('ArrowLeft');game.rotating={x:1};game.rpgLook={btn:2};
 const held=new Event('mouseup');Object.defineProperty(held,'buttons',{value:2});win.dispatchEvent(held);assert.ok(game.rotating);
 const released=new Event('mouseup');Object.defineProperty(released,'buttons',{value:0});win.dispatchEvent(released);
 assert.equal(game.rotating,null);assert.equal(game.rpgLook,null);assert.ok(game.keys.has('ArrowLeft'));
});
test('hidden tabs cancel input, visible tabs preserve it, and disposal removes hooks',()=>{
 const {game,win,doc,dispose,original}=fixture();game.keys.add('ArrowLeft');doc.dispatchEvent(new Event('visibilitychange'));assert.equal(game.keys.size,1);
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(game.keys.size,0);
 dispose();assert.equal(game.mouseCamera,original);game.keys.add('ArrowLeft');win.dispatchEvent(new Event('blur'));assert.equal(game.keys.size,1);
});
test('camera wrapper restores pointer state if native camera update throws',()=>{
 const win=new EventTarget(),doc=new EventTarget(),game={cameraMode:0,mouseIn:true,mouseCamera(){throw Error('native');}};
 mountStableCamera(game,win,doc);assert.throws(()=>game.mouseCamera(),/native/);assert.equal(game.mouseIn,true);
});
