import {solve} from '../tools/solver.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD,PIECES,turn,targets,occupied} from '../engine.js';
import {hexBoundaryLoops,hexOutlinePath} from '../geometry.js';
const signedArea=loop=>loop.reduce((sum,[x,y],i)=>{const[a,b]=loop[(i+1)%loop.length];return sum+x*b-a*y;},0)/2;
const edgeSteps=new Set(['0,2','-1,1','-1,-1','0,-2','1,-1','1,1']);
function assertCoverage(cells){
 const loops=hexBoundaryLoops(cells);
 assert.equal(loops.reduce((sum,loop)=>sum+signedArea(loop),0),6*cells.length,'Boundary must fill the entire tile, without missing triangles');
 for(const loop of loops)for(let i=0;i<loop.length;i++){
  const a=loop[i],b=loop[(i+1)%loop.length];assert(edgeSteps.has(`${b[0]-a[0]},${b[1]-a[1]}`),'Every edge, including closure, must follow a hex side');
 }
 return loops;
}
test('all tile rotations and board positions have closed full-area outlines',()=>{
 for(const piece of PIECES)for(let rotation=0;rotation<6;rotation++)for(const c of BOARD){
  assertCoverage(turn(piece.cells,rotation).map(([q,r])=>[q+c.q,r+c.r]));
 }
 const solution=solve(targets('2026-10-30')).placements;
 solution.forEach((p,i)=>{
  const cells=occupied(PIECES[i],p);assertCoverage(cells);
  // The screenshot regression includes corners exactly on the horizontal zero line.
  const project=([q,r])=>[28*Math.sqrt(3)*(q+r/2)-28*Math.sqrt(3)*2.5,42*r-126];
  const path=hexOutlinePath(cells,project);
  assert(!/NaN|undefined/.test(path));assert.equal((path.match(/M/g)||[]).length,1);assert.equal((path.match(/Z/g)||[]).length,1);
 });
});
test('outline winding preserves holes instead of closing diagonally through a shape',()=>{
 const ring=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
 const loops=assertCoverage(ring);assert.equal(loops.length,2);assert(loops.some(loop=>signedArea(loop)<0));
});
