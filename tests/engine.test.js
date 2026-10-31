import {solve} from '../tools/solver.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD,PIECES,turn,orientations,targets,isWin,canPlace,roundAxial,localDate} from '../engine.js';
import {createLeaderboard,eligible,scoreKey,topTen} from '../leaderboard.js';
test('50 unique board cells; 12 connected tiles cover 47 cells',()=>{
 assert.equal(BOARD.length,50);assert.equal(new Set(BOARD.map(c=>c.label)).size,50);assert.equal(new Set(BOARD.map(c=>`${c.q},${c.r}`)).size,50);assert.equal(PIECES.length,12);assert.equal(PIECES.reduce((n,p)=>n+p.cells.length,0),47);
 for(const {cells}of PIECES){const seen=new Set([0]);let changed=true;while(changed){changed=false;cells.forEach(([q,r],i)=>{if(seen.has(i))return;if([...seen].some(j=>{const dq=q-cells[j][0],dr=r-cells[j][1];return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr))===1;})){seen.add(i);changed=true;}});}assert.equal(seen.size,cells.length);}
});
test('six rotations return original; only rotations in playable orientations',()=>{for(const p of PIECES){assert.deepEqual(turn(p.cells,6),p.cells);assert(orientations(p.cells).length<=6);for(const orientation of orientations(p.cells))assert(Array.from({length:6},(_,i)=>JSON.stringify(turn(p.cells,i))).includes(JSON.stringify(orientation)));}});
test('date labels, leap day, and local calendar',()=>{assert.deepEqual(targets('2026-10-30'),['FRI','OCT','30']);assert.deepEqual(targets('2024-02-29'),['THU','FEB','29']);assert.equal(localDate(new Date(2026,9,30,23,59)),'2026-10-30');});
test('axial rounding includes negative coordinates',()=>{assert.deepEqual(roundAxial(1.1,1.1),[1,1]);assert.deepEqual(roundAxial(-2.12,3.09),[-2,3]);});
test('exact-cover solutions; overlap, target and boundary rejection',()=>{for(const date of ['2026-10-30','2024-02-29','2026-01-01','2026-12-31','2000-01-01','1999-08-17']){const labels=targets(date),result=solve(labels);assert(result.placements,`No solution: ${date}`);assert(isWin(result.placements,labels));const p=result.placements.map(v=>({...v}));p[0]={q:100,r:100,rotation:0};assert(!isWin(p,labels));p[0]=null;assert(!isWin(p,labels));const target=BOARD.find(c=>labels.includes(c.label));assert(!canPlace(0,{q:target.q,r:target.r,rotation:0},PIECES.map(()=>null),labels));assert(!canPlace(0,{...result.placements[1]},result.placements,labels));}});
test('official eligibility requires current date and first non-practice completion',()=>{assert(eligible('2026-10-30','2026-10-30',false,false));assert(!eligible('2026-10-29','2026-10-30',false,false));assert(!eligible('2026-10-30','2026-10-30',true,false));assert(!eligible('2026-10-30','2026-10-30',false,true));assert.equal(scoreKey('2026-10-30'),'hasCompletedToday_2026-10-30');});
const memory=()=>{const m=new Map();return {get:(k,f)=>m.get(k)??f,set:(k,v)=>{m.set(k,v);return true;}};};
const score=(id,n,group='TEAM',date='2026-10-30')=>({submission_id:id,player_name:id,score:n,date,metadata:{group,moves:12}});
test('mock submits once, isolates group/date, sorts ascending and caps top ten',async()=>{const storage=memory(),api=createLeaderboard({mode:'mock'},storage);for(let i=0;i<14;i++)await api.submit(score(String(i),1400-i));await api.submit(score('0',1));await api.submit(score('elsewhere',0,'OTHER'));await api.submit(score('yesterday',0,'TEAM','2026-10-29'));const rows=await api.list('TEAM','2026-10-30');assert.equal(rows.length,10);assert.equal(rows[0].score,1387);assert.equal(storage.get('hex.mockScores').length,16);assert.equal(topTen([{...score('bad',1),score:'1'}],'TEAM','2026-10-30').length,0);});
test('REST encodes group, sends idempotent payload and propagates failures',async()=>{const calls=[];const api=createLeaderboard({mode:'rest',readUrl:'https://example.test/scores?group={group}&date={date}',submitUrl:'https://example.test/scores'},memory(),async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({scores:[score('a',100)]})};});await api.list('A B','2026-10-30');assert(calls[0].url.includes('group=A%20B'));await api.submit(score('a',100));assert.equal(calls[1].options.headers['Idempotency-Key'],'a');assert.deepEqual(JSON.parse(calls[1].options.body),score('a',100));const fail=createLeaderboard({mode:'rest',submitUrl:'https://example.test/scores'},memory(),async()=>({ok:false,status:503}));await assert.rejects(()=>fail.submit(score('a',100)),/503/);});

test('photo grid has the MON/TUE stagger and compact straight-frame footprint',()=>{
 const byLabel=Object.fromEntries(BOARD.map(c=>[c.label,c]));
 assert.equal(byLabel.MON.q,byLabel.TUE.q);
 assert.equal(byLabel.WED.q,byLabel.THU.q);
 assert.equal(byLabel.THU.q,byLabel.FRI.q);
 const distance=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
 for(const [a,b]of [['MON','TUE'],['TUE','WED'],['MON','1'],['TUE','1'],['TUE','8'],['JUN','DEC'],['14','21']])assert.equal(distance(byLabel[a],byLabel[b]),1,`${a}/${b} must be neighbors in photo`);
});
test('photo inventory preserves repeated silhouettes and the two opposite hooks',()=>{
 assert.deepEqual(PIECES.map(p=>p.cells.length),[5,3,4,5,3,4,4,4,3,4,4,4]);
 const canon=shape=>orientations(shape).map(s=>{const a=[...s].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);return JSON.stringify(a.map(([q,r])=>[q-a[0][0],r-a[0][1]]));}).sort()[0];
 for(const[a,b]of[[4,8],[5,11],[6,7]])assert.equal(canon(PIECES[a].cells),canon(PIECES[b].cells));
 assert.notEqual(canon(PIECES[9].cells),canon(PIECES[10].cells));
 assert.equal(canon(PIECES[9].cells.map(([q,r])=>[r,q])),canon(PIECES[10].cells));
});
test('the photo/no-flip conflict is reported as impossible, not a search timeout',()=>{
 const result=solve(['TUE','FEB','1']);assert.equal(result.placements,null);assert.equal(result.status,'unsolvable');
 const capped=solve(['FRI','OCT','30'],0);assert.equal(capped.status,'limit');
});
