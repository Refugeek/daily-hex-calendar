// Trace hex borders on an exact integer lattice. Floating-point screen coordinates
// must never decide whether two corners are the same vertex (notably +0 / -0).
export function hexBoundaryLoops(cells){
 const corners=[[1,-1],[1,1],[0,2],[-1,1],[-1,-1],[0,-2]];
 const edges=new Map(),vertexKey=([x,y])=>`${x},${y}`;
 for(const[q,r]of cells){
  const vertices=corners.map(([x,y])=>[2*q+r+x,3*r+y]);
  for(let i=0;i<6;i++){
   const a=vertices[i],b=vertices[(i+1)%6],id=[vertexKey(a),vertexKey(b)].sort().join('|');
   if(edges.has(id))edges.delete(id);else edges.set(id,[a,b]);
  }
 }
 const outgoing=new Map([...edges.values()].map(([a,b])=>[vertexKey(a),[a,b]])),loops=[];
 while(outgoing.size){
  const [first]=outgoing.values(),start=vertexKey(first[0]),loop=[];let current=start;
  do{
   const edge=outgoing.get(current);
   if(!edge)throw new Error('Hex boundary is not closed.');
   loop.push(edge[0]);outgoing.delete(current);current=vertexKey(edge[1]);
  }while(current!==start);
  loops.push(loop);
 }
 return loops;
}
export function hexOutlinePath(cells,project){
 return hexBoundaryLoops(cells).map(loop=>loop.map(([x,y],i)=>{
  const point=project([(x-y/3)/2,y/3]);return `${i?'L':'M'}${point.join(',')}`;
 }).join('')+'Z').join('');
}
