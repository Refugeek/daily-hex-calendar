import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const line=name=>source.split('\n').find(s=>s.startsWith(`function ${name}(`));

test('double-click removes a placed piece without selecting it for immediate replacement; tray double-click still rotates',()=>{
 let time=1000,rotations=0;
 const context=vm.createContext({selected:null,drag:null,won:false,paused:false,placements:[{q:1,r:2,rotation:0}],moves:0,hover:null,performance:{now:()=>time},save(){},render(){},say(){},pick(id){context.selected=id;},rotateSelected(){rotations++;}});
 vm.runInContext(`let lastTap={id:null,time:0};\n${line('returnSelected')}\n${line('pointerDown')}`,context);
 const event={button:0,clientX:10,clientY:20,pointerId:1,preventDefault(){},target:{closest:()=>({dataset:{piece:'0'}})}};
 context.event=event;
 vm.runInContext('pointerDown(event)',context);
 assert(context.placements[0]);
 context.drag=null;time+=100;
 vm.runInContext('pointerDown(event)',context);
 assert.equal(context.placements[0],null);
 assert.equal(context.selected,null);
 assert.equal(context.drag,null);
 assert.equal(context.moves,1);
 assert.equal(rotations,0);
 time+=1000;vm.runInContext('pointerDown(event)',context);
 context.drag=null;time+=100;vm.runInContext('pointerDown(event)',context);
 assert.equal(rotations,1);
 for(const state of ['won','paused']){
  context[state]=true;context.placements[0]={q:1,r:2,rotation:0};
  time+=1000;vm.runInContext('pointerDown(event)',context);time+=100;vm.runInContext('pointerDown(event)',context);
  assert(context.placements[0]);context[state]=false;
 }
});

test('saving a group updates an existing URL group without losing other parameters, fragment, or history state',()=>{
 for(const href of ['https://example.test/game?group=OLD&other=1#board','https://example.test/game?other=1#board']){
  const calls=[],elements={'player-input':{value:' Player '},'group-input':{value:' new_team '},'group-dialog':{close(){}},'group-form':{}};
  const state={existing:true},profileWrites=[];
  const context=vm.createContext({URL,window:{location:{href},history:{state,replaceState:(...args)=>calls.push(args)}},$:id=>elements[id],profile:null,store:{set:(...args)=>profileWrites.push(args)},updateDateLeaderboard(){},say(){},retryPending(){}});
  vm.runInContext(line('syncGroupUrl')+'\n'+source.split('\n').find(s=>s.startsWith("$('group-form').onsubmit=")),context);
  elements['group-form'].onsubmit({preventDefault(){}});
  assert.equal(context.profile.group,'NEW_TEAM');
  assert.equal(profileWrites[0][1].group,'NEW_TEAM');
  if(href.includes('group=')){
   assert.equal(calls.length,1);assert.equal(calls[0][0],state);
   const updated=new URL(calls[0][2]);assert.equal(updated.searchParams.get('group'),'NEW_TEAM');assert.equal(updated.searchParams.get('other'),'1');assert.equal(updated.hash,'#board');
  }else assert.equal(calls.length,0);
 }
});
