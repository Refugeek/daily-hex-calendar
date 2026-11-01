import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {eligible,scoreKey} from '../leaderboard.js';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const functionLine=name=>source.split('\n').find(line=>line.startsWith(`function ${name}(`));
function setup(extra={}){
 const data=new Map(),elements=new Map();
 const store={get:(key,f=null)=>data.has(key)?data.get(key):f,set:(key,value)=>{data.set(key,structuredClone(value));return true;}};
 const $=id=>{if(!elements.has(id))elements.set(id,{open:false,textContent:'',showModal(){this.open=true;}});return elements.get(id);};
 const context=vm.createContext({store,$,eligible,scoreKey,localDate:()=> '2026-11-01',date:'2026-10-31',started:null,elapsedBase:123000,paused:false,won:true,save(){},say(){},confirmAction:(title,copy,action)=>action(),...extra});
 return {context,store,$};
}

test('Today starts an official attempt after yesterday or past-date practice, but preserves an attempt already started today',()=>{
 const {context,store}=setup();const games=[];
 context.newGame=(date,practice)=>games.push({date,practice});
 vm.runInContext(functionLine('changeDate'),context);
 vm.runInContext("changeDate('2026-11-01')",context);
 assert.deepEqual(games.pop(),{date:'2026-11-01',practice:false});
 context.date='2022-04-28';context.won=false;context.started=100;
 vm.runInContext("changeDate('2026-11-01')",context);
 assert.deepEqual(games.pop(),{date:'2026-11-01',practice:false});
 context.date='2026-11-01';
 vm.runInContext("changeDate('2022-04-28')",context);
 assert.equal(store.get('hex.started.2026-11-01'),true);
 context.date='2022-04-28';
 vm.runInContext("changeDate('2026-11-01')",context);
 assert.deepEqual(games.pop(),{date:'2026-11-01',practice:true});
});

test('starting the timer remembers today across navigation and reloads',()=>{
 const {context,store}=setup({date:'2026-11-01',won:false,performance:{now:()=>100}});
 vm.runInContext(functionLine('timerStart'),context);
 vm.runInContext('timerStart()',context);
 assert.equal(store.get('hex.started.2026-11-01'),true);
 assert.equal(context.started,100);
});

test('first completion is locked before a failed POST, and retry preserves its score and refreshes open rankings',async()=>{
 let fail=true,loads=0;const submissions=[];
 const {context,store,$}=setup({date:'2026-11-01',storageAvailable:true,practice:false,selected:null,hover:null,labels:['SUN','NOV','1'],moves:12,clientId:'client',profile:{player:'Player',group:'TEAM'},config:{mode:'rest'},elapsed:()=>123456,render(){},formatTime:String,updateMode(){},updateDateLeaderboard(){},loadRankings:()=>loads++,leaderboardDate:'2026-11-01',withLock:async(name,action)=>action(),api:{async submit(record){submissions.push(structuredClone(record));if(fail)throw new Error('Offline');}}});
 vm.runInContext(source.slice(source.indexOf('async function victory('),source.indexOf('let leaderboardRequest=')),context);
 await vm.runInContext('victory()',context);
 assert.equal(store.get(scoreKey('2026-11-01')),true);
 assert.equal(store.get('hex.result.2026-11-01').score,123456);
 assert.equal(store.get('hex.result.2026-11-01').submitted,false);
 fail=false;$('leaderboard-dialog').open=true;
 await vm.runInContext('retryPending()',context);
 assert.equal(store.get('hex.result.2026-11-01').submitted,true);
 assert.deepEqual(submissions.map(record=>record.score),[123456,123456]);
 assert(loads>0);
 context.practice=true;context.elapsed=()=>1000;
 await vm.runInContext('victory()',context);
 assert.equal(store.get('hex.result.2026-11-01').score,123456);
 assert.equal(submissions.length,2);
});
